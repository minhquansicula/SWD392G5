package com.backend.module.auth;

import com.backend.module.auth.api.dto.CreateUserRequest;
import com.backend.module.auth.api.dto.PasswordStatus;
import com.backend.module.auth.api.dto.UpdateUserRequest;
import com.backend.module.auth.core.EmailNormalizer;
import com.backend.module.auth.core.controller.AdminUserController;
import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.enums.PasswordMailStatus;
import com.backend.module.auth.core.enums.Role;
import com.backend.module.auth.core.repository.UserRepository;
import com.backend.module.auth.core.service.AdminUserServiceImpl;
import com.backend.module.auth.core.service.PasswordLinkMail;
import com.backend.module.auth.core.service.PasswordLinkService;
import com.backend.shared.exception.AppException;
import com.backend.shared.exception.GlobalExceptionHandler;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import tools.jackson.databind.json.JsonMapper;

import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real MVC, service, Validator and TransactionTemplate; repository/transaction manager are mocks. */
@ExtendWith(MockitoExtension.class)
class AdminEmailFlowTest {
    private static final ValidatorFactory FACTORY = Validation.buildDefaultValidatorFactory();

    @Mock UserRepository users;
    @Mock PasswordEncoder passwords;
    @Mock PlatformTransactionManager transactions;
    @Mock PlatformTransactionManager linkTransactions;

    private final List<PasswordLinkMail> mailed = new ArrayList<>();
    private final Set<UUID> undeliverable = new HashSet<>();

    private final JsonMapper json = JsonMapper.builder().build();
    private AdminUserServiceImpl service;
    private MockMvc mvc;

    @AfterAll
    static void closeFactory() {
        FACTORY.close();
    }

    @BeforeEach
    void setup() {
        PasswordLinkService links = new PasswordLinkService(users, passwords, mails -> {
            mailed.addAll(mails);
            Set<UUID> failed = new HashSet<>();
            for (PasswordLinkMail mail : mails) {
                if (undeliverable.contains(mail.userId())) failed.add(mail.userId());
            }
            return failed;
        }, linkTransactions, 72, "http://localhost:5173/", Runnable::run);
        service = new AdminUserServiceImpl(users, passwords, FACTORY.getValidator(), transactions, links);
        mvc = MockMvcBuilders.standaloneSetup(new AdminUserController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    void httpCreateValidatesCanonicalAfterDtoAndPreservesLiteralRaw() throws Exception {
        successfulWrites();
        CreateUserRequest request = request("new", " \tA.B+Tag@EXAMPLE.COM\r\n ");
        request.setRole("LECTURER");
        postCreate(request).andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.username").value("new"))
                .andExpect(jsonPath("$.data.email").value(request.getEmail()));
        assertEquals(" \tA.B+Tag@EXAMPLE.COM\r\n ", request.getEmail());
        verify(users).saveAndFlush(argThat(user -> request.getEmail().equals(user.getEmail())
                && "a.b+tag@example.com".equals(user.getEmailNormalized())
                && user.getRole() == Role.LECTURER));
    }

    @Test
    void httpCreateRequiresEmailForEveryRoleAndRejectsRawNul() throws Exception {
        for (String role : List.of("ADMIN", "LECTURER", "STUDENT")) {
            for (String raw : Arrays.asList(null, "", " \t\r\n ", "invalid",
                    "\0a@example.com", "a@example.com\0", "a\0@example.com")) {
                CreateUserRequest request = request("new", raw);
                request.setRole(role);
                postCreate(request).andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
                assertEquals(raw, request.getEmail());
            }
        }
        postCreate(Map.of("username", "new", "password", "password123",
                "fullName", "New", "role", "STUDENT")).andExpect(status().isBadRequest());
        verifyNoInteractions(users, passwords);
    }

    @Test
    void raw255IsStoredButRaw256IsRejectedWithoutTruncation() throws Exception {
        successfulWrites();
        String raw255 = " ".repeat(242) + "a@example.com";
        assertEquals(255, raw255.codePointCount(0, raw255.length()));
        postCreate(request("new", raw255)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.email").value(raw255));
        verify(users).saveAndFlush(argThat(user -> raw255.equals(user.getEmail())
                && "a@example.com".equals(user.getEmailNormalized())));
        clearInvocations(users, passwords);
        String raw256 = " " + raw255;
        CreateUserRequest rejected = request("other", raw256);
        postCreate(rejected).andExpect(status().isBadRequest());
        assertEquals(raw256, rejected.getEmail());
        verifyNoInteractions(users, passwords);
    }

    @Test
    void canonical255UsesRealValidatorAndCanonical256IsRejected() throws Exception {
        String canonical255 = "a@" + "a".repeat(63) + "." + "b".repeat(63)
                + "." + "c".repeat(63) + "." + "d".repeat(57) + ".com";
        assertEquals(255, canonical255.codePointCount(0, canonical255.length()));
        assertTrue(FACTORY.getValidator().validateValue(User.class, "emailNormalized", canonical255).isEmpty());
        successfulWrites();
        postCreate(request("new", canonical255)).andExpect(status().isCreated());
        verify(users).saveAndFlush(argThat(user -> canonical255.equals(user.getEmail())
                && canonical255.equals(user.getEmailNormalized())));
        clearInvocations(users, passwords);
        String canonical256 = "b" + canonical255;
        assertEquals(256, canonical256.codePointCount(0, canonical256.length()));
        postCreate(request("other", canonical256)).andExpect(status().isBadRequest());
        verifyNoInteractions(users, passwords);
    }

    @Test
    void canonicalExpansionIsCheckedSeparatelyFromRawLength() {
        String raw = "x@" + "\u0130".repeat(63) + "." + "a".repeat(63)
                + "." + "b".repeat(63) + ".com";
        String canonical = EmailNormalizer.normalize(raw);
        assertTrue(raw.codePointCount(0, raw.length()) <= 255);
        assertTrue(canonical.codePointCount(0, canonical.length()) > 255);
        CreateUserRequest request = request("new", raw);
        assertThrows(AppException.class, () -> service.createUser(request));
        assertEquals(raw, request.getEmail());
        verifyNoInteractions(users, passwords);
    }

    @Test
    void rawEntityValidationDoesNotUseUtf16SizeOrRawEmailFormat() {
        User user = User.builder().email("\uD83D\uDE00".repeat(255)).build();
        assertEquals(255, user.getEmail().codePointCount(0, user.getEmail().length()));
        assertEquals(510, user.getEmail().length());
        assertTrue(FACTORY.getValidator().validateProperty(user, "email").isEmpty());
    }

    @Test
    void legacyNullUntouchedAndNullUpdatesDoNotBackfillAndInvalidUpdateIsImmutable() throws Exception {
        UUID id = UUID.randomUUID();
        User legacy = User.builder().id(id).username("legacy").passwordHash("hash")
                .fullName("Old").role(Role.STUDENT).build();
        when(users.findById(id)).thenReturn(Optional.of(legacy));
        when(users.saveAndFlush(any(User.class))).thenReturn(legacy);
        putUpdate(id, Map.of("fullName", "Updated")).andExpect(status().isOk());
        assertNull(legacy.getEmail());
        assertNull(legacy.getEmailNormalized());
        legacy.setEmail(" Old@EXAMPLE.COM ");
        Map<String, Object> explicitNull = new HashMap<>();
        explicitNull.put("email", null);
        explicitNull.put("role", "LECTURER");
        putUpdate(id, explicitNull).andExpect(status().isOk());
        assertEquals(" Old@EXAMPLE.COM ", legacy.getEmail());
        assertNull(legacy.getEmailNormalized());
        clearInvocations(users);
        for (String raw : List.of("", " ", "invalid", "\0new@example.com", " ".repeat(256) + "new@example.com")) {
            putUpdate(id, Map.of("fullName", "Must not change", "role", "ADMIN", "studentCode", "NEW", "email", raw))
                    .andExpect(status().isBadRequest());
            assertEquals("Updated", legacy.getFullName());
            assertEquals(Role.LECTURER, legacy.getRole());
            assertNull(legacy.getStudentCode());
            assertEquals(" Old@EXAMPLE.COM ", legacy.getEmail());
            assertNull(legacy.getEmailNormalized());
        }
        verifyNoInteractions(users);
        UpdateUserRequest valid = UpdateUserRequest.builder().email(" New+Tag@EXAMPLE.COM ").build();
        assertEquals(" New+Tag@EXAMPLE.COM ", service.updateUser(id, valid).getEmail());
        assertEquals(" New+Tag@EXAMPLE.COM ", valid.getEmail());
        assertEquals("new+tag@example.com", legacy.getEmailNormalized());
    }

    @Test
    void httpBatchValidInvalidValidCommitsTheValidRowsAndNeverTouchesTheInvalidOne() throws Exception {
        rowTransactions();
        successfulWrites();
        CreateUserRequest invalid = request("invalid", "invalid@example.com");
        invalid.setRole("UNKNOWN");
        postBatch(List.of(request("first", " First@EXAMPLE.COM "), invalid, request("last", "last@example.com")))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.created").value(2))
                .andExpect(jsonPath("$.data.skipped").value(1))
                .andExpect(jsonPath("$.data.rows[0].user.username").value("first"))
                .andExpect(jsonPath("$.data.rows[1].status").value("SKIPPED"))
                .andExpect(jsonPath("$.data.rows[1].reason").value("INVALID_DATA"))
                .andExpect(jsonPath("$.data.rows[2].user.username").value("last"));
        var order = inOrder(users, transactions);
        order.verify(users).saveAndFlush(argThat(user -> "first".equals(user.getUsername())));
        order.verify(transactions).commit(any(TransactionStatus.class));
        order.verify(users).existsByUsername("last");
        order.verify(users).saveAndFlush(argThat(user -> "last".equals(user.getUsername())));
        order.verify(transactions).commit(any(TransactionStatus.class));
        // The invalid row is rejected before any transaction or query.
        verify(transactions, times(2)).getTransaction(any(TransactionDefinition.class));
        verify(transactions, times(2)).commit(any(TransactionStatus.class));
        verify(transactions, never()).rollback(any(TransactionStatus.class));
        verify(users, never()).existsByUsername("invalid");
    }

    @Test
    void allThreeBusinessUniqueConstraintsAreSkippedOutsideCompletedRowTransaction() throws Exception {
        Map<String, String> reasons = Map.of("users_username_key", "USERNAME_EXISTS",
                "users_student_code_key", "STUDENT_CODE_EXISTS", "users_email_normalized_key", "EMAIL_EXISTS");
        for (String name : reasons.keySet()) {
            reset(users, passwords, transactions);
            rowTransactions();
            stubPasswordEncoding();
            doAnswer(call -> {
                User user = call.getArgument(0);
                if ("collision".equals(user.getUsername())) throw integrity("23505", name);
                return user;
            }).when(users).saveAndFlush(any(User.class));
            postBatch(List.of(request("collision", "collision@example.com"), request("last", "last@example.com")))
                    .andExpect(status().isCreated()).andExpect(jsonPath("$.data.created").value(1))
                    .andExpect(jsonPath("$.data.rows[0].reason").value(reasons.get(name)))
                    .andExpect(jsonPath("$.data.rows[1].user.username").value("last"));
            var order = inOrder(users, transactions);
            order.verify(users).saveAndFlush(argThat(user -> "collision".equals(user.getUsername())));
            order.verify(transactions).rollback(any(TransactionStatus.class));
            order.verify(users).existsByUsername("last");
            verify(transactions).commit(any(TransactionStatus.class));
            verify(transactions).rollback(any(TransactionStatus.class));
        }
    }

    @Test
    void unknownIntegrityEscapesAfterRollbackWithoutUndoingEarlierCommit() {
        SQLException mismatchedOuterSql = new SQLException("outer", "23505");
        mismatchedOuterSql.initCause(new ConstraintViolationException(
                "inner", new SQLException("inner", "23514"), "users_email_normalized_key"));
        List<DataIntegrityViolationException> failures = List.of(
                integrity("23505", "users_pkey"), integrity("23505", "unrelated_unique_key"),
                integrity("23505", null), integrity("23514", "users_email_normalized_key"),
                integrity("23502", "users_username_key"), integrity("23503", "users_student_code_key"),
                new DataIntegrityViolationException("unnamed", new SQLException("unique", "23505")),
                new DataIntegrityViolationException("mismatched", mismatchedOuterSql),
                new DataIntegrityViolationException("unknown"));
        for (DataIntegrityViolationException failure : failures) {
            reset(users, passwords, transactions);
            rowTransactions();
            stubPasswordEncoding();
            doAnswer(call -> {
                User user = call.getArgument(0);
                if ("broken".equals(user.getUsername())) throw failure;
                return user;
            }).when(users).saveAndFlush(any(User.class));
            assertSame(failure, assertThrows(DataIntegrityViolationException.class,
                    () -> service.batchCreateUsers(List.of(request("first", "first@example.com"),
                            request("broken", "broken@example.com"), request("notReached", "last@example.com")))));
            var order = inOrder(transactions);
            order.verify(transactions).commit(any(TransactionStatus.class));
            order.verify(transactions).rollback(any(TransactionStatus.class));
            verify(users, never()).existsByUsername("notReached");
        }
    }

    @Test
    void cyclicCauseChainTerminatesAndPropagates() {
        rowTransactions();
        stubPasswordEncoding();
        DataIntegrityViolationException cyclic = new DataIntegrityViolationException("cycle") {
            @Override
            public synchronized Throwable getCause() { return this; }
        };
        doThrow(cyclic).when(users).saveAndFlush(any(User.class));
        assertSame(cyclic, assertThrows(DataIntegrityViolationException.class,
                () -> service.batchCreateUsers(List.of(request("broken", "broken@example.com")))));
        verify(transactions).rollback(any(TransactionStatus.class));
        verify(transactions, never()).commit(any(TransactionStatus.class));
    }

    @Test
    void systemicFailureStopsAfterEarlierCommit() {
        rowTransactions();
        stubPasswordEncoding();
        doAnswer(call -> {
            User user = call.getArgument(0);
            if ("broken".equals(user.getUsername())) throw new IllegalStateException("systemic");
            return user;
        }).when(users).saveAndFlush(any(User.class));
        assertThrows(IllegalStateException.class, () -> service.batchCreateUsers(List.of(
                request("first", "first@example.com"), request("broken", "broken@example.com"),
                request("notReached", "last@example.com"))));
        var order = inOrder(transactions);
        order.verify(transactions).commit(any(TransactionStatus.class));
        order.verify(transactions).rollback(any(TransactionStatus.class));
        verify(users, never()).existsByUsername("notReached");
    }

    @Test
    void duplicateUsernameWithinBatchNeverOverwrites() throws Exception {
        rowTransactions();
        stubPasswordEncoding();
        Map<String, User> persisted = new HashMap<>();
        when(users.existsByUsername(anyString())).thenAnswer(call -> persisted.containsKey(call.getArgument(0)));
        doAnswer(call -> {
            User user = call.getArgument(0);
            assertFalse(persisted.containsKey(user.getUsername()));
            persisted.put(user.getUsername(), user);
            return user;
        }).when(users).saveAndFlush(any(User.class));
        postBatch(List.of(request("same", "first@example.com"), request("same", "replacement@example.com"),
                request("last", "last@example.com")))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.created").value(2))
                .andExpect(jsonPath("$.data.rows[0].user.username").value("same"))
                .andExpect(jsonPath("$.data.rows[1].reason").value("DUPLICATE_IN_FILE"))
                .andExpect(jsonPath("$.data.rows[2].user.username").value("last"));
        assertEquals(2, persisted.size());
        assertEquals("first@example.com", persisted.get("same").getEmail());
        assertEquals("first@example.com", persisted.get("same").getEmailNormalized());
        verify(users, times(2)).saveAndFlush(any(User.class));
        verify(transactions, times(2)).commit(any(TransactionStatus.class));
        verify(transactions, never()).rollback(any(TransactionStatus.class));
    }

    @Test
    void inFileDuplicateIsJudgedAgainstCreatedRowsOnly() throws Exception {
        rowTransactions();
        successfulWrites();
        when(users.existsByUsername(anyString())).thenAnswer(call -> "taken".equals(call.getArgument(0)));
        // Row 1 is skipped (username exists), so its email must stay available to row 2.
        postBatch(List.of(request("taken", "shared@example.com"), request("second", " SHARED@example.com "),
                request("third", "shared@example.com"), request("second", "other@example.com"),
                request("fifth", "other@example.com")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.created").value(2))
                .andExpect(jsonPath("$.data.rows[0].reason").value("USERNAME_EXISTS"))
                .andExpect(jsonPath("$.data.rows[1].status").value("CREATED"))
                .andExpect(jsonPath("$.data.rows[1].user.username").value("second"))
                .andExpect(jsonPath("$.data.rows[2].reason").value("DUPLICATE_IN_FILE"))
                // Row 4 repeats a created username; its unused email must not block row 5.
                .andExpect(jsonPath("$.data.rows[3].reason").value("DUPLICATE_IN_FILE"))
                .andExpect(jsonPath("$.data.rows[4].status").value("CREATED"))
                .andExpect(jsonPath("$.data.rows[4].user.username").value("fifth"));
        verify(users, times(2)).saveAndFlush(any(User.class));
        assertEquals(2, mailed.size());
    }

    @Test
    void allInvalidBatchReturns201AndEmptyList() throws Exception {
        CreateUserRequest wrongRole = request("invalid", "invalid@example.com");
        wrongRole.setRole("UNKNOWN");
        postBatch(Arrays.asList(null, wrongRole, request("missing", null)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.created").value(0))
                .andExpect(jsonPath("$.data.total").value(3))
                .andExpect(jsonPath("$.data.rows[0].reason").value("INVALID_DATA"))
                .andExpect(jsonPath("$.data.rows[1].reason").value("INVALID_DATA"))
                .andExpect(jsonPath("$.data.rows[2].reason").value("MISSING_REQUIRED"));
        verifyNoInteractions(users, passwords, transactions);
        assertTrue(mailed.isEmpty());
    }

    @Test
    void batchReportsEveryRowWithItsReasonAndMailsOnlyCreatedRows() throws Exception {
        rowTransactions();
        successfulWrites();
        when(users.existsByUsername(anyString())).thenAnswer(call -> "taken".equals(call.getArgument(0)));
        postBatch(List.of(request("first", "first@example.com"), request("blank", " "),
                request("bad", "not-an-email"), request("taken", "taken@example.com"),
                request("other", " FIRST@example.com ")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.total").value(5))
                .andExpect(jsonPath("$.data.created").value(1))
                .andExpect(jsonPath("$.data.skipped").value(4))
                .andExpect(jsonPath("$.data.rows[0].row").value(1))
                .andExpect(jsonPath("$.data.rows[0].status").value("CREATED"))
                .andExpect(jsonPath("$.data.rows[0].reason").doesNotExist())
                .andExpect(jsonPath("$.data.rows[0].user.passwordStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.rows[1].reason").value("MISSING_REQUIRED"))
                .andExpect(jsonPath("$.data.rows[2].reason").value("INVALID_EMAIL"))
                .andExpect(jsonPath("$.data.rows[2].username").value("bad"))
                .andExpect(jsonPath("$.data.rows[2].email").value("not-an-email"))
                .andExpect(jsonPath("$.data.rows[3].reason").value("USERNAME_EXISTS"))
                .andExpect(jsonPath("$.data.rows[4].row").value(5))
                .andExpect(jsonPath("$.data.rows[4].reason").value("DUPLICATE_IN_FILE"));
        assertEquals(1, mailed.size());
        assertEquals("first@example.com", mailed.get(0).to());
        assertTrue(mailed.get(0).activation());
    }

    @Test
    void createIgnoresSuppliedPasswordStoresUnknownOneAndMailsOneTimeLink() throws Exception {
        List<String> encoded = new ArrayList<>();
        when(passwords.encode(anyString())).thenAnswer(call -> {
            encoded.add(call.getArgument(0));
            return "hash";
        });
        when(users.saveAndFlush(any(User.class))).thenAnswer(call -> {
            User user = call.getArgument(0);
            user.setId(UUID.randomUUID());
            return user;
        });
        postCreate(Map.of("username", "new", "password", "chosen-by-admin", "fullName", "New",
                "role", "LECTURER", "email", " New@EXAMPLE.COM "))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.passwordStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.password").doesNotExist());
        assertEquals(1, encoded.size());
        assertNotEquals("chosen-by-admin", encoded.get(0));
        assertTrue(encoded.get(0).length() >= 43);

        assertEquals(1, mailed.size());
        PasswordLinkMail mail = mailed.get(0);
        assertEquals("New@EXAMPLE.COM", mail.to());
        assertTrue(mail.link().startsWith("http://localhost:5173/#/set-password?token="));
        String token = mail.link().substring(mail.link().indexOf('=') + 1);
        verify(users).saveAndFlush(argThat(user -> user.getPasswordSetAt() == null
                && user.getPasswordTokenHash() != null
                && user.getPasswordTokenHash().matches("[0-9a-f]{64}")
                && !user.getPasswordTokenHash().contains(token)
                && user.getPasswordTokenExpiresAt().isAfter(OffsetDateTime.now().plusHours(71))
                && user.getPasswordTokenExpiresAt().isBefore(OffsetDateTime.now().plusHours(73))));
        verify(users).updatePasswordMailStatus(List.of(mail.userId()), PasswordMailStatus.SENT);
    }

    @Test
    void mailFailureKeepsTheCreatedAccountAndReportsNotSent() throws Exception {
        UUID id = UUID.randomUUID();
        undeliverable.add(id);
        stubPasswordEncoding();
        when(users.saveAndFlush(any(User.class))).thenAnswer(call -> {
            User user = call.getArgument(0);
            user.setId(id);
            return user;
        });
        postCreate(request("new", "new@example.com")).andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.username").value("new"))
                .andExpect(jsonPath("$.data.passwordStatus").value("NOT_SENT"));
        verify(users).updatePasswordMailStatus(Set.of(id), PasswordMailStatus.FAILED);
        verify(transactions, never()).rollback(any());
    }

    @Test
    void resendReplacesTheLinkAndRequiresAnEmail() throws Exception {
        UUID id = UUID.randomUUID();
        User pending = User.builder().id(id).username("pending").passwordHash("hash").fullName("Pending")
                .role(Role.STUDENT).email("pending@example.com").emailNormalized("pending@example.com")
                .passwordTokenHash("old").passwordTokenExpiresAt(OffsetDateTime.now().minusHours(1))
                .passwordMailStatus(PasswordMailStatus.SENT).build();
        when(users.findById(id)).thenReturn(Optional.of(pending));
        when(users.saveAndFlush(any(User.class))).thenAnswer(call -> call.getArgument(0));
        mvc.perform(post("/api/admin/users/" + id + "/password-link")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.passwordStatus").value("PENDING"));
        assertNotEquals("old", pending.getPasswordTokenHash());
        assertTrue(pending.getPasswordTokenExpiresAt().isAfter(OffsetDateTime.now().plusHours(71)));
        assertEquals(PasswordMailStatus.SENT, pending.getPasswordMailStatus());
        assertEquals(1, mailed.size());
        assertTrue(mailed.get(0).activation());

        UUID legacyId = UUID.randomUUID();
        when(users.findById(legacyId)).thenReturn(Optional.of(User.builder().id(legacyId).username("legacy")
                .passwordHash("hash").fullName("Legacy").role(Role.STUDENT).build()));
        mvc.perform(post("/api/admin/users/" + legacyId + "/password-link")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("USER_HAS_NO_EMAIL"));
        assertEquals(1, mailed.size());

        // A failed mail is reported as an error and changes nothing: the link mailed before keeps working.
        String workingHash = pending.getPasswordTokenHash();
        OffsetDateTime workingExpiry = pending.getPasswordTokenExpiresAt();
        undeliverable.add(id);
        mvc.perform(post("/api/admin/users/" + id + "/password-link")).andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.error").value("MAIL_NOT_SENT"));
        assertEquals(2, mailed.size());
        assertEquals(workingHash, pending.getPasswordTokenHash());
        assertEquals(workingExpiry, pending.getPasswordTokenExpiresAt());
        assertEquals(PasswordMailStatus.SENT, pending.getPasswordMailStatus());

        mvc.perform(post("/api/admin/users/" + UUID.randomUUID() + "/password-link"))
                .andExpect(status().isNotFound());
    }

    @Test
    void changingEmailInvalidatesAnOutstandingLink() {
        UUID id = UUID.randomUUID();
        User pending = User.builder().id(id).username("pending").passwordHash("hash").fullName("Pending")
                .role(Role.STUDENT).email("old@example.com").emailNormalized("old@example.com")
                .passwordTokenHash("old").passwordTokenExpiresAt(OffsetDateTime.now().plusHours(1))
                .passwordMailStatus(PasswordMailStatus.SENT).build();
        when(users.findById(id)).thenReturn(Optional.of(pending));
        when(users.saveAndFlush(any(User.class))).thenAnswer(call -> call.getArgument(0));
        service.updateUser(id, UpdateUserRequest.builder().email(" OLD@example.com ").build());
        assertEquals("old", pending.getPasswordTokenHash());
        assertEquals(PasswordStatus.NOT_SENT, service.updateUser(id,
                UpdateUserRequest.builder().email("new@example.com").build()).getPasswordStatus());
        assertNull(pending.getPasswordTokenHash());
        assertNull(pending.getPasswordTokenExpiresAt());
    }

    @Test
    void singleCreateUniqueFailureKeepsExisting409Contract() throws Exception {
        stubPasswordEncoding();
        doThrow(integrity("23505", "users_email_normalized_key")).when(users).saveAndFlush(any(User.class));
        postCreate(request("new", "new@example.com")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("DATA_INTEGRITY_CONFLICT"));
    }

    private void stubPasswordEncoding() {
        when(passwords.encode(anyString())).thenReturn("hash");
    }

    private void successfulWrites() {
        stubPasswordEncoding();
        when(users.saveAndFlush(any(User.class))).thenAnswer(call -> {
            User user = call.getArgument(0);
            user.setId(UUID.randomUUID());
            return user;
        });
    }

    private void rowTransactions() {
        when(transactions.getTransaction(any(TransactionDefinition.class))).thenAnswer(call -> {
            TransactionDefinition definition = call.getArgument(0);
            assertEquals(TransactionDefinition.PROPAGATION_REQUIRES_NEW, definition.getPropagationBehavior());
            return mock(TransactionStatus.class);
        });
    }

    private ResultActions postCreate(Object body) throws Exception {
        return mvc.perform(post("/api/admin/users").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body)));
    }

    private ResultActions postBatch(Object body) throws Exception {
        return mvc.perform(post("/api/admin/users/batch").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body)));
    }

    private ResultActions putUpdate(UUID id, Object body) throws Exception {
        return mvc.perform(put("/api/admin/users/" + id).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body)));
    }

    private CreateUserRequest request(String username, String email) {
        return CreateUserRequest.builder().username(username)
                .fullName("Full Name").role("STUDENT").email(email).build();
    }

    private DataIntegrityViolationException integrity(String state, String name) {
        return new DataIntegrityViolationException("database constraint", new ConstraintViolationException(
                "database constraint", new SQLException("database constraint", state), name));
    }
}
