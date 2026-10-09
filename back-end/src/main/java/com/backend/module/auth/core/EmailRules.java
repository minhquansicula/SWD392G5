package com.backend.module.auth.core;

import com.backend.module.auth.core.entity.User;
import jakarta.validation.Validator;

/**
 * The single definition of an acceptable email. Login and account management must agree on it,
 * otherwise an account could be created with an email that login then rejects.
 */
public final class EmailRules {
    public static final int MAX_CODE_POINTS = 255;

    private EmailRules() {}

    /**
     * Canonical form of {@code rawEmail} when it satisfies every rule, otherwise {@code null}.
     * Rules: no NUL; raw and canonical at most 255 code points; canonical non-empty and well-formed.
     * "Well-formed" is the {@code @Email} constraint declared on {@link User#getEmailNormalized()}.
     */
    public static String canonicalOrNull(String rawEmail, Validator validator) {
        if (rawEmail == null || rawEmail.indexOf('\0') >= 0) return null;
        String canonical = EmailNormalizer.normalize(rawEmail);
        boolean acceptable = !canonical.isEmpty()
                && codePoints(rawEmail) <= MAX_CODE_POINTS
                && codePoints(canonical) <= MAX_CODE_POINTS
                && validator.validateValue(User.class, "emailNormalized", canonical).isEmpty();
        return acceptable ? canonical : null;
    }

    private static int codePoints(String value) {
        return value.codePointCount(0, value.length());
    }
}
