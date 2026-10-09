package com.backend.module.auth.core.service;

import com.backend.module.auth.api.dto.PasswordLinkInfo;
import com.backend.module.auth.api.exception.UserNotFoundException;
import com.backend.module.auth.api.service.PasswordSetupService;
import com.backend.module.auth.core.EmailNormalizer;
import com.backend.module.auth.core.PasswordPolicy;
import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.enums.PasswordMailStatus;
import com.backend.module.auth.core.repository.UserRepository;
import com.backend.shared.exception.AppException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;

/**
 * One-time password links: issuing, mailing and redeeming them.
 *
 * <p>Only the SHA-256 of a token is stored; the raw token exists in the mailed link alone.
 * Transactions are programmatic because a mail must go out after its token is committed,
 * never from inside the transaction.
 */
@Slf4j
@Service
public class PasswordLinkService implements PasswordSetupService, DisposableBean {

    /** A forgot-password request is ignored while the account's current link is younger than this. */
    static final Duration RESET_COOLDOWN = Duration.ofMinutes(15);

    private static final int RESET_QUEUE_CAPACITY = 100;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordLinkMailer mailer;
    private final TransactionTemplate transaction;
    private final Duration lifetime;
    private final String frontendBaseUrl;
    private final Executor resetExecutor;

    @Autowired
    public PasswordLinkService(UserRepository userRepository,
                               PasswordEncoder passwordEncoder,
                               PasswordLinkMailer mailer,
                               PlatformTransactionManager transactionManager,
                               @Value("${aives.mail.password-link-hours:72}") long linkHours,
                               @Value("${aives.mail.frontend-base-url:http://localhost:5173}") String frontendBaseUrl) {
        this(userRepository, passwordEncoder, mailer, transactionManager, linkHours, frontendBaseUrl,
                newResetExecutor());
    }

    /** @param resetExecutor where forgot-password requests are processed; tests pass {@code Runnable::run} */
    public PasswordLinkService(UserRepository userRepository,
                               PasswordEncoder passwordEncoder,
                               PasswordLinkMailer mailer,
                               PlatformTransactionManager transactionManager,
                               long linkHours,
                               String frontendBaseUrl,
                               Executor resetExecutor) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailer = mailer;
        this.transaction = new TransactionTemplate(transactionManager);
        this.lifetime = Duration.ofHours(linkHours);
        this.frontendBaseUrl = frontendBaseUrl.replaceAll("/+$", "");
        this.resetExecutor = resetExecutor;
    }

    /** 256 random bits, URL-safe. Used for link tokens and for the unknown initial password. */
    public static String randomSecret() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    // ------------------------------------------------------------------
    // Building blocks for callers that save the user in their own transaction
    // ------------------------------------------------------------------

    /** Replaces any earlier link of the user and returns the raw token. */
    public String issueToken(User user) {
        String token = randomSecret();
        user.setPasswordTokenHash(hash(token));
        user.setPasswordTokenExpiresAt(OffsetDateTime.now().plus(lifetime));
        user.setPasswordMailStatus(null);
        return token;
    }

    /** Makes any outstanding link of the user unusable. */
    public void revokeLink(User user) {
        user.setPasswordTokenHash(null);
        user.setPasswordTokenExpiresAt(null);
        user.setPasswordMailStatus(null);
    }

    /** Records that the account now has a deliberately chosen password; an outstanding link dies with it. */
    public void markPasswordSet(User user) {
        user.setPasswordSetAt(OffsetDateTime.now());
        user.setPasswordTokenHash(null);
        user.setPasswordTokenExpiresAt(null);
    }

    /** Builds the mail for a saved user (the id must already be assigned). */
    public PasswordLinkMail mailFor(User user, String token) {
        return new PasswordLinkMail(user.getId(), user.getEmail().trim(), user.getFullName(),
                frontendBaseUrl + "/#/set-password?token=" + token, user.getPasswordSetAt() == null);
    }

    /** Mails links whose tokens are already committed and records each outcome. Returns the users whose mail failed. */
    public Set<UUID> deliver(List<PasswordLinkMail> mails) {
        if (mails.isEmpty()) return Set.of();
        Set<UUID> failed = mailer.send(mails);
        List<UUID> sent = mails.stream().map(PasswordLinkMail::userId).filter(id -> !failed.contains(id)).toList();
        transaction.executeWithoutResult(status -> {
            if (!sent.isEmpty()) userRepository.updatePasswordMailStatus(sent, PasswordMailStatus.SENT);
            if (!failed.isEmpty()) userRepository.updatePasswordMailStatus(failed, PasswordMailStatus.FAILED);
        });
        return failed;
    }

    // ------------------------------------------------------------------
    // Replacing the link of an existing account
    // ------------------------------------------------------------------

    /**
     * Replaces the user's link and mails the new one. When the mail cannot be sent the earlier
     * link is put back, so a failed call changes nothing.
     */
    public User resend(UUID userId) {
        Reissue reissue = transaction.execute(status -> {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new UserNotFoundException(userId.toString()));
            if (user.getEmail() == null || user.getEmailNormalized() == null) {
                throw new AppException("User has no email to send a password link to", CONFLICT, "USER_HAS_NO_EMAIL");
            }
            return reissue(user);
        });
        if (!mailReissued(reissue)) {
            throw new AppException("Password link email could not be sent", BAD_GATEWAY, "MAIL_NOT_SENT");
        }
        return transaction.execute(status -> userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId.toString())));
    }

    /** Always returns at once and silently, so neither the answer nor its timing reveals whether the email exists. */
    @Override
    public void requestReset(String email) {
        String canonical = EmailNormalizer.normalize(email);
        if (canonical == null || canonical.isEmpty()) return;
        try {
            resetExecutor.execute(() -> mailResetLink(canonical));
        } catch (RejectedExecutionException ex) {
            log.warn("Password reset queue is full or shut down; request dropped");
        }
    }

    private void mailResetLink(String canonicalEmail) {
        try {
            Reissue reissue = transaction.execute(status -> {
                List<User> matches = userRepository.findTop2ByEmailNormalized(canonicalEmail);
                if (matches.size() != 1 || issuedWithin(matches.get(0), RESET_COOLDOWN)) return null;
                return reissue(matches.get(0));
            });
            if (reissue != null) mailReissued(reissue);
        } catch (RuntimeException ex) {
            // Runs on a worker thread with nobody to answer to. Never log the email.
            log.error("Password reset request failed ({})", ex.getClass().getName());
        }
    }

    /** Call inside a transaction. */
    private Reissue reissue(User user) {
        LinkState previous = LinkState.of(user);
        String token = issueToken(user);
        User saved = userRepository.saveAndFlush(user);
        return new Reissue(mailFor(saved, token), saved.getPasswordTokenHash(), previous);
    }

    /** Mails a reissued link and records the outcome; on failure the earlier link is restored. */
    private boolean mailReissued(Reissue reissue) {
        boolean sent;
        try {
            sent = mailer.send(List.of(reissue.mail())).isEmpty();
        } catch (RuntimeException ex) {
            // A mailer must report failures, not throw; if it does anyway, still put the earlier link back.
            log.error("Password link mailer threw ({})", ex.getClass().getName());
            sent = false;
        }
        boolean delivered = sent;
        transaction.executeWithoutResult(status -> userRepository.findById(reissue.mail().userId())
                // If the link was replaced or used meanwhile, that later change wins.
                .filter(user -> reissue.tokenHash().equals(user.getPasswordTokenHash()))
                .ifPresent(user -> {
                    if (delivered) {
                        user.setPasswordMailStatus(PasswordMailStatus.SENT);
                    } else {
                        reissue.previous().restoreTo(user);
                    }
                    userRepository.saveAndFlush(user);
                }));
        return delivered;
    }

    private boolean issuedWithin(User user, Duration window) {
        OffsetDateTime expiresAt = user.getPasswordTokenExpiresAt();
        return expiresAt != null && expiresAt.minus(lifetime).isAfter(OffsetDateTime.now().minus(window));
    }

    // ------------------------------------------------------------------
    // Redeeming a link
    // ------------------------------------------------------------------

    @Override
    public PasswordLinkInfo describeLink(String token) {
        return transaction.execute(status -> {
            User user = requireValidLink(token);
            return PasswordLinkInfo.builder().email(user.getEmail()).fullName(user.getFullName())
                    .activation(user.getPasswordSetAt() == null).build();
        });
    }

    @Override
    public void setPassword(String token, String newPassword) {
        if (!PasswordPolicy.isAcceptable(newPassword)) {
            throw new AppException("Password must contain at least " + PasswordPolicy.MIN_LENGTH
                    + " characters and at most " + PasswordPolicy.MAX_UTF8_BYTES + " bytes in UTF-8",
                    BAD_REQUEST, "VALIDATION_FAILED");
        }
        transaction.executeWithoutResult(status -> {
            User user = requireValidLink(token);
            user.setPasswordHash(passwordEncoder.encode(newPassword));
            markPasswordSet(user);
            userRepository.saveAndFlush(user);
        });
    }

    private User requireValidLink(String token) {
        if (token != null && !token.isBlank()) {
            User user = userRepository.findByPasswordTokenHash(hash(token)).orElse(null);
            if (user != null && user.getPasswordTokenExpiresAt() != null
                    && user.getPasswordTokenExpiresAt().isAfter(OffsetDateTime.now())) {
                return user;
            }
        }
        throw new AppException("Password link is invalid or has expired", BAD_REQUEST, "INVALID_PASSWORD_LINK");
    }

    @Override
    public void destroy() {
        if (resetExecutor instanceof ExecutorService service) service.shutdown();
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    /** One worker and a bounded queue: a flood of reset requests cannot pile up threads or memory. */
    private static ExecutorService newResetExecutor() {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(1, 1, 30, TimeUnit.SECONDS,
                new ArrayBlockingQueue<>(RESET_QUEUE_CAPACITY), task -> {
                    Thread thread = new Thread(task, "password-reset-mail");
                    thread.setDaemon(true);
                    return thread;
                });
        executor.allowCoreThreadTimeOut(true);
        return executor;
    }

    /** The link fields of a user, captured so that a failed reissue can be undone. */
    private record LinkState(String tokenHash, OffsetDateTime expiresAt, PasswordMailStatus mailStatus) {
        static LinkState of(User user) {
            return new LinkState(user.getPasswordTokenHash(), user.getPasswordTokenExpiresAt(),
                    user.getPasswordMailStatus());
        }

        void restoreTo(User user) {
            user.setPasswordTokenHash(tokenHash);
            user.setPasswordTokenExpiresAt(expiresAt);
            user.setPasswordMailStatus(mailStatus);
        }
    }

    private record Reissue(PasswordLinkMail mail, String tokenHash, LinkState previous) { }
}
