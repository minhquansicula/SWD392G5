package com.backend.module.auth.core.service;

import com.backend.module.auth.api.dto.*;
import com.backend.module.auth.api.exception.UserAlreadyExistsException;
import com.backend.module.auth.api.exception.UserNotFoundException;
import com.backend.module.auth.api.service.AdminUserService;
import com.backend.module.auth.core.EmailNormalizer;
import com.backend.module.auth.core.EmailRules;
import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.enums.PasswordMailStatus;
import com.backend.module.auth.core.enums.Role;
import com.backend.module.auth.core.repository.UserRepository;
import com.backend.shared.exception.AppException;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.*;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserServiceImpl implements AdminUserService {
    private static final String VALIDATION_FAILED = "VALIDATION_FAILED";
    private static final String STUDENT_CODE_EXISTS = "STUDENT_CODE_EXISTS";

    /** Unique constraints whose violation only means "this account already exists". */
    private static final Map<String, BatchSkipReason> BUSINESS_UNIQUE_CONSTRAINTS = Map.of(
            "users_username_key", BatchSkipReason.USERNAME_EXISTS,
            "users_student_code_key", BatchSkipReason.STUDENT_CODE_EXISTS,
            "users_email_normalized_key", BatchSkipReason.EMAIL_EXISTS);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Validator validator;
    private final PlatformTransactionManager transactionManager;
    private final PasswordLinkService passwordLinks;

    @Override
    @Transactional(readOnly = true)
    public Page<UserDto> getUsers(String role, Pageable pageable) {
        Set<String> sortable = Set.of("id", "username", "fullName", "role", "studentCode", "email", "createdAt");
        if (pageable.isUnpaged() || pageable.getPageSize() > 100
                || pageable.getSort().stream().anyMatch(o -> !sortable.contains(o.getProperty()))) {
            throw new AppException("Use page size 1-100 and a supported user sort field", BAD_REQUEST, "VALIDATION_FAILED");
        }
        Page<User> users = role == null || role.isBlank() ? userRepository.findAll(pageable)
                : userRepository.findByRole(parseRole(role), pageable);
        return users.map(UserDtoMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto getUserById(UUID id) {
        User user = userRepository.findById(id).orElseThrow(() -> new UserNotFoundException(id.toString()));
        return UserDtoMapper.toDto(user);
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public UserDto createUser(CreateUserRequest request) {
        if (validationProblem(request) != null) throw invalidUserData();
        // Commit first, then mail: a failed mail must not undo the account.
        CreatedUser created = new TransactionTemplate(transactionManager).execute(status -> insertUser(request));
        Set<UUID> failedMails = passwordLinks.deliver(List.of(created.mail()));
        return createdDto(created, failedMails);
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public BatchCreateResult batchCreateUsers(List<CreateUserRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new AppException("User list must not be empty", BAD_REQUEST, VALIDATION_FAILED);
        }
        // Each row commits or rolls back alone: one bad row never undoes another.
        TransactionTemplate rowTransaction = new TransactionTemplate(transactionManager);
        rowTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        List<BatchRowResult> rows = new ArrayList<>();
        Map<BatchRowResult, CreatedUser> created = new LinkedHashMap<>();
        CreatedKeys createdKeys = new CreatedKeys();
        try {
            for (CreateUserRequest request : requests) {
                RowOutcome outcome = createRow(request, rowTransaction, createdKeys);
                BatchRowResult row = BatchRowResult.builder().row(rows.size() + 1)
                        .username(request == null ? null : request.getUsername())
                        .email(request == null ? null : request.getEmail())
                        .status(outcome.created() == null
                                ? BatchRowResult.Status.SKIPPED : BatchRowResult.Status.CREATED)
                        .reason(outcome.skipReason()).build();
                rows.add(row);
                if (outcome.created() != null) {
                    created.put(row, outcome.created());
                    createdKeys.add(outcome.created().user());
                }
            }
        } catch (RuntimeException ex) {
            // Rows committed before a systemic failure still get their link.
            try {
                passwordLinks.deliver(mailsOf(created.values()));
            } catch (RuntimeException ignored) {
                // Their status stays NOT_SENT; an admin can resend.
            }
            throw ex;
        }
        Set<UUID> failedMails = passwordLinks.deliver(mailsOf(created.values()));
        created.forEach((row, user) -> row.setUser(createdDto(user, failedMails)));
        return BatchCreateResult.builder().total(rows.size()).created(created.size())
                .skipped(rows.size() - created.size()).rows(rows).build();
    }

    @Override
    public UserDto resendPasswordLink(UUID userId) {
        return UserDtoMapper.toDto(passwordLinks.resend(userId));
    }

    @Override
    @Transactional
    public UserDto updateUser(UUID id, UpdateUserRequest request) {
        validate(request);
        String emailNormalized = null;
        if (request.getEmail() != null) {
            emailNormalized = EmailRules.canonicalOrNull(request.getEmail(), validator);
            if (emailNormalized == null) throw invalidUserData();
        }
        User user = userRepository.findById(id).orElseThrow(() -> new UserNotFoundException(id.toString()));
        if (request.getFullName() != null) user.setFullName(request.getFullName().trim());
        if (request.getRole() != null) user.setRole(parseRole(request.getRole()));
        if (request.getStudentCode() != null) {
            String studentCode = optionalText(request.getStudentCode());
            if (studentCode != null && userRepository.existsByStudentCodeAndIdNot(studentCode, id)) {
                throw studentCodeExists();
            }
            user.setStudentCode(studentCode);
        }
        if (emailNormalized != null) {
            // A link mailed to the previous address must stop working.
            if (!emailNormalized.equals(user.getEmailNormalized())) passwordLinks.revokeLink(user);
            user.setEmail(request.getEmail());
            user.setEmailNormalized(emailNormalized);
        }
        return UserDtoMapper.toDto(userRepository.saveAndFlush(user));
    }

    @Override
    @Transactional
    public void resetPassword(UUID userId, String newPassword) {
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new AppException("Password must be at least 6 characters", BAD_REQUEST, "VALIDATION_FAILED");
        }
        User user = userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId.toString()));
        user.setPasswordHash(passwordEncoder.encode(newPassword.trim()));
        passwordLinks.markPasswordSet(user);
        userRepository.saveAndFlush(user);
    }

    @Override
    @Transactional
    public void deleteUser(UUID userId) {
        if (!userRepository.existsById(userId)) throw new UserNotFoundException(userId.toString());
        try {
            userRepository.deleteById(userId);
            userRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new AppException("User is referenced by examination data that cannot be deleted", CONFLICT, "USER_IN_USE");
        }
    }

    // ------------------------------------------------------------------
    // Creating users
    // ------------------------------------------------------------------

    /** Why a request can never become a user, whatever is already stored; null when it can. */
    private BatchSkipReason validationProblem(CreateUserRequest request) {
        if (request == null) return BatchSkipReason.INVALID_DATA;
        String canonicalEmail = EmailNormalizer.normalize(request.getEmail());
        if (optionalText(request.getUsername()) == null || optionalText(request.getFullName()) == null
                || canonicalEmail == null || canonicalEmail.isEmpty()) {
            return BatchSkipReason.MISSING_REQUIRED;
        }
        if (EmailRules.canonicalOrNull(request.getEmail(), validator) == null) return BatchSkipReason.INVALID_EMAIL;
        return validator.validate(request).isEmpty() ? null : BatchSkipReason.INVALID_DATA;
    }

    /** Stores a request that already passed {@link #validationProblem}. Call inside a transaction. */
    private CreatedUser insertUser(CreateUserRequest request) {
        String username = request.getUsername().trim();
        String studentCode = optionalText(request.getStudentCode());
        if (userRepository.existsByUsername(username)) throw new UserAlreadyExistsException(username);
        if (studentCode != null && userRepository.existsByStudentCode(studentCode)) throw studentCodeExists();
        // Nobody knows this password; the owner replaces it through the emailed link.
        User user = User.builder().username(username)
                .passwordHash(passwordEncoder.encode(PasswordLinkService.randomSecret()))
                .fullName(request.getFullName().trim())
                .role(request.getRole() == null ? Role.STUDENT : parseRole(request.getRole()))
                .studentCode(studentCode).email(request.getEmail())
                .emailNormalized(EmailNormalizer.normalize(request.getEmail())).build();
        String token = passwordLinks.issueToken(user);
        User saved = userRepository.saveAndFlush(user);
        return new CreatedUser(saved, passwordLinks.mailFor(saved, token));
    }

    /** One batch row: validated, checked against rows already created, then inserted in its own transaction. */
    private RowOutcome createRow(CreateUserRequest request, TransactionTemplate rowTransaction, CreatedKeys createdKeys) {
        BatchSkipReason problem = validationProblem(request);
        if (problem != null) return RowOutcome.skipped(problem);
        if (createdKeys.contains(request)) return RowOutcome.skipped(BatchSkipReason.DUPLICATE_IN_FILE);
        try {
            return new RowOutcome(rowTransaction.execute(status -> insertUser(request)), null);
        } catch (DataIntegrityViolationException ex) {
            // Caught outside execute(): this row has already rolled back.
            BatchSkipReason duplicate = businessUniqueViolation(ex);
            if (duplicate == null) throw ex;
            return RowOutcome.skipped(duplicate);
        } catch (UserAlreadyExistsException ex) {
            return RowOutcome.skipped(BatchSkipReason.USERNAME_EXISTS);
        } catch (AppException ex) {
            if (!STUDENT_CODE_EXISTS.equals(ex.getErrorCode())) throw ex;
            return RowOutcome.skipped(BatchSkipReason.STUDENT_CODE_EXISTS);
        }
    }

    /** The skip reason for a whitelisted unique constraint, or null for any other integrity failure. */
    private BatchSkipReason businessUniqueViolation(Throwable failure) {
        Set<Throwable> visited = Collections.newSetFromMap(new IdentityHashMap<>());
        for (Throwable cause = failure; cause != null && visited.add(cause); cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException constraint
                    && "23505".equals(constraint.getSQLState())
                    && constraint.getConstraintName() != null
                    && BUSINESS_UNIQUE_CONSTRAINTS.containsKey(constraint.getConstraintName())) {
                return BUSINESS_UNIQUE_CONSTRAINTS.get(constraint.getConstraintName());
            }
        }
        return null;
    }

    private UserDto createdDto(CreatedUser created, Set<UUID> failedMails) {
        // The entity is detached here; mirror what deliver() recorded.
        created.user().setPasswordMailStatus(failedMails.contains(created.user().getId())
                ? PasswordMailStatus.FAILED : PasswordMailStatus.SENT);
        return UserDtoMapper.toDto(created.user());
    }

    private static List<PasswordLinkMail> mailsOf(Collection<CreatedUser> created) {
        return created.stream().map(CreatedUser::mail).toList();
    }

    private record CreatedUser(User user, PasswordLinkMail mail) { }

    /** Exactly one of the two is null. */
    private record RowOutcome(CreatedUser created, BatchSkipReason skipReason) {
        static RowOutcome skipped(BatchSkipReason reason) {
            return new RowOutcome(null, reason);
        }
    }

    /** Usernames and emails created so far in one batch, so an in-file duplicate is reported as such. */
    private static final class CreatedKeys {
        private final Set<String> usernames = new HashSet<>();
        private final Set<String> emails = new HashSet<>();

        boolean contains(CreateUserRequest request) {
            return usernames.contains(request.getUsername().trim())
                    || emails.contains(EmailNormalizer.normalize(request.getEmail()));
        }

        void add(User user) {
            usernames.add(user.getUsername());
            emails.add(user.getEmailNormalized());
        }
    }

    // ------------------------------------------------------------------
    // Shared helpers
    // ------------------------------------------------------------------

    private Role parseRole(String role) {
        try {
            return Role.valueOf(role.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new AppException("Role must be ADMIN, LECTURER or STUDENT", BAD_REQUEST, "INVALID_ROLE");
        }
    }

    private void validate(Object request) {
        if (request == null || !validator.validate(request).isEmpty()) throw invalidUserData();
    }

    private AppException invalidUserData() {
        return new AppException("Invalid user data: check required fields, lengths and email",
                BAD_REQUEST, VALIDATION_FAILED);
    }

    private AppException studentCodeExists() {
        return new AppException("Student code already exists", CONFLICT, STUDENT_CODE_EXISTS);
    }

    private String optionalText(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
