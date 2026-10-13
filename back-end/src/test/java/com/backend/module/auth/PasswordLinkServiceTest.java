package com.backend.module.auth;

import com.backend.module.auth.api.dto.PasswordLinkInfo;
import com.backend.module.auth.api.service.AuthService;
import com.backend.module.auth.core.controller.AuthController;
import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.enums.PasswordMailStatus;
import com.backend.module.auth.core.enums.Role;
import com.backend.module.auth.core.repository.UserRepository;
import com.backend.module.auth.core.service.PasswordLinkMail;
import com.backend.module.auth.core.service.PasswordLinkService;
import com.backend.shared.exception.AppException;
import com.backend.shared.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Executor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Real service and MVC; repository, encoder, transaction manager and mailer are test doubles. */
@ExtendWith(MockitoExtension.class)
class PasswordLinkServiceTest {
    @Mock UserRepository users;
    @Mock PasswordEncoder passwords;
    @Mock PlatformTransactionManager transactions;
    @Mock AuthService authService;

    private final JsonMapper json = JsonMapper.builder().build();
    private final List<PasswordLinkMail> mailed = new ArrayList<>();
    private boolean mailServerDown;
    private PasswordLinkService service;
    private MockMvc mvc;
    private User user;

    @BeforeEach
    void setup() {
        // Forgot-password work runs inline unless a test installs its own executor.
        useExecutor(Runnable::run);
        user = User.builder().id(UUID.randomUUID()).username("se170001").passwordHash("random-hash")
                .fullName("Student One").role(Role.STUDENT)
                .email(" Student@EXAMPLE.COM ").emailNormalized("student@example.com").build();
    }

    private void useExecutor(Executor executor) {
        service = new PasswordLinkService(users, passwords, mails -> {
            mailed.addAll(mails);
            Set<UUID> failed = new HashSet<>();
            if (mailServerDown) mails.forEach(mail -> failed.add(mail.userId()));
            return failed;
        }, transactions, 72, "http://localhost:5173", executor);
        mvc = MockMvcBuilders.standaloneSetup(new AuthController(authService, service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    /** Issues a link the way account creation does and lets the repository find it by hash. */
    private String issuedToken() {
        String token = service.issueToken(user);
        lenient().when(users.findByPasswordTokenHash(anyString())).thenAnswer(call ->
                call.getArgument(0).equals(user.getPasswordTokenHash()) ? Optional.of(user) : Optional.empty());
        return token;
    }

    /** The account can be found by email and by id, as the forgot-password flow needs. */
    private void accountIsStored() {
        when(users.findTop2ByEmailNormalized("student@example.com")).thenReturn(List.of(user));
        lenient().when(users.findById(user.getId())).thenReturn(Optional.of(user));
        lenient().when(users.saveAndFlush(user)).thenReturn(user);
    }

    private ResultActions forgot(String email) throws Exception {
        return mvc.perform(post("/api/auth/password/forgot").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email))));
    }

    private ResultActions setPassword(String token, String password) throws Exception {
        return mvc.perform(post("/api/auth/password/set").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("token", token, "newPassword", password))));
    }

    @Test
    void linkIsDescribedThenConsumedExactlyOnce() throws Exception {
        String token = issuedToken();
        when(passwords.encode("my-new-password")).thenReturn("chosen-hash");

        mvc.perform(post("/api/auth/password/link").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("token", token))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(" Student@EXAMPLE.COM "))
                .andExpect(jsonPath("$.data.activation").value(true));
        assertEquals("random-hash", user.getPasswordHash());

        setPassword(token, "my-new-password").andExpect(status().isOk());
        assertEquals("chosen-hash", user.getPasswordHash());
        assertNotNull(user.getPasswordSetAt());
        assertNull(user.getPasswordTokenHash());
        assertNull(user.getPasswordTokenExpiresAt());
        verify(users).saveAndFlush(user);

        setPassword(token, "another-password").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_PASSWORD_LINK"));
        assertEquals("chosen-hash", user.getPasswordHash());
        verify(passwords, times(1)).encode(anyString());
    }

    @Test
    void expiredUnknownAndBlankLinksAreRejectedWithoutChangingThePassword() {
        String token = issuedToken();
        user.setPasswordTokenExpiresAt(OffsetDateTime.now().minusSeconds(1));
        for (String candidate : new String[] {token, "unknown-token", " ", null}) {
            AppException failure = assertThrows(AppException.class,
                    () -> service.setPassword(candidate, "my-new-password"));
            assertEquals("INVALID_PASSWORD_LINK", failure.getErrorCode());
            assertThrows(AppException.class, () -> service.describeLink(candidate));
        }
        assertEquals("random-hash", user.getPasswordHash());
        assertNull(user.getPasswordSetAt());
        verifyNoInteractions(passwords);
        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void passwordRuleIsCheckedBeforeTheLinkIsTouchedAndItsUpperBoundIsInBytes() throws Exception {
        String token = issuedToken();
        // 25 characters but 75 bytes: BCrypt would reject it with an exception.
        String tooManyBytes = "ệ".repeat(25);
        assertEquals(75, tooManyBytes.getBytes(StandardCharsets.UTF_8).length);
        for (String password : new String[] {"short", "x".repeat(73), tooManyBytes, "        "}) {
            setPassword(token, password).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
        }
        assertThrows(AppException.class, () -> service.setPassword(token, null));
        assertNotNull(user.getPasswordTokenHash());
        verifyNoInteractions(passwords);

        // 24 such characters are exactly 72 bytes and therefore accepted.
        when(passwords.encode("ệ".repeat(24))).thenReturn("chosen-hash");
        setPassword(token, "ệ".repeat(24)).andExpect(status().isOk());
        assertEquals("chosen-hash", user.getPasswordHash());
    }

    @Test
    void newLinkInvalidatesThePreviousOne() {
        String first = issuedToken();
        String second = service.issueToken(user);
        assertNotEquals(first, second);
        assertThrows(AppException.class, () -> service.describeLink(first));
        PasswordLinkInfo info = service.describeLink(second);
        assertEquals("Student One", info.getFullName());
    }

    @Test
    void forgotPasswordMailsAResetLinkWithoutTouchingTheCurrentPassword() throws Exception {
        user.setPasswordSetAt(OffsetDateTime.now().minusDays(3));
        accountIsStored();

        forgot("  STUDENT@example.com ").andExpect(status().isOk());

        assertEquals(1, mailed.size());
        assertEquals("Student@EXAMPLE.COM", mailed.get(0).to());
        assertFalse(mailed.get(0).activation());
        assertTrue(mailed.get(0).link().startsWith("http://localhost:5173/#/set-password?token="));
        assertEquals("random-hash", user.getPasswordHash());
        assertNotNull(user.getPasswordTokenHash());
        assertEquals(PasswordMailStatus.SENT, user.getPasswordMailStatus());

        // Inside the cooldown a repeated request neither mails nor replaces the link.
        String mailedHash = user.getPasswordTokenHash();
        forgot("student@example.com").andExpect(status().isOk());
        assertEquals(1, mailed.size());
        assertEquals(mailedHash, user.getPasswordTokenHash());

        // Once the link is older than the cooldown a new request is honoured again.
        user.setPasswordTokenExpiresAt(OffsetDateTime.now().plusHours(72).minusMinutes(16));
        forgot("student@example.com").andExpect(status().isOk());
        assertEquals(2, mailed.size());
        assertNotEquals(mailedHash, user.getPasswordTokenHash());
    }

    @Test
    void forgotPasswordKeepsTheEarlierLinkWhenTheNewMailCannotBeSent() throws Exception {
        String earlierToken = issuedToken();
        user.setPasswordMailStatus(PasswordMailStatus.SENT);
        // Issued an hour ago, so the cooldown does not apply.
        OffsetDateTime earlierExpiry = OffsetDateTime.now().plusHours(71);
        user.setPasswordTokenExpiresAt(earlierExpiry);
        String earlierHash = user.getPasswordTokenHash();
        accountIsStored();
        mailServerDown = true;

        forgot("student@example.com").andExpect(status().isOk());

        assertEquals(1, mailed.size());
        assertEquals(earlierHash, user.getPasswordTokenHash());
        assertEquals(earlierExpiry, user.getPasswordTokenExpiresAt());
        assertEquals(PasswordMailStatus.SENT, user.getPasswordMailStatus());
        assertEquals("Student One", service.describeLink(earlierToken).getFullName());
    }

    @Test
    void forgotPasswordAnswersBeforeAnyLookupOrMailHappens() throws Exception {
        List<Runnable> queued = new ArrayList<>();
        useExecutor(queued::add);
        user.setPasswordSetAt(OffsetDateTime.now().minusDays(3));

        forgot("student@example.com").andExpect(status().isOk());
        forgot("nobody@example.com").andExpect(status().isOk());

        // The response is already out; nothing that depends on the account has run yet.
        assertEquals(2, queued.size());
        verifyNoInteractions(users);
        assertTrue(mailed.isEmpty());

        accountIsStored();
        when(users.findTop2ByEmailNormalized("nobody@example.com")).thenReturn(List.of());
        queued.forEach(Runnable::run);
        assertEquals(1, mailed.size());
        assertEquals(user.getId(), mailed.get(0).userId());
    }

    @Test
    void forgotPasswordAnswersTheSameForUnknownOrAmbiguousEmail() throws Exception {
        when(users.findTop2ByEmailNormalized("nobody@example.com")).thenReturn(List.of());
        when(users.findTop2ByEmailNormalized("twice@example.com")).thenReturn(List.of(user, user));
        for (String email : List.of("nobody@example.com", "twice@example.com")) {
            forgot(email).andExpect(status().isOk())
                    .andExpect(jsonPath("$.message")
                            .value("If the email belongs to an account, a reset link has been sent"));
        }
        forgot(" ").andExpect(status().isBadRequest());
        assertTrue(mailed.isEmpty());
        assertNull(user.getPasswordTokenHash());
        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void forgotPasswordSwallowsFailuresOfTheBackgroundWork() throws Exception {
        when(users.findTop2ByEmailNormalized("student@example.com"))
                .thenThrow(new IllegalStateException("database is down"));
        forgot("student@example.com").andExpect(status().isOk());
        assertTrue(mailed.isEmpty());
    }
}
