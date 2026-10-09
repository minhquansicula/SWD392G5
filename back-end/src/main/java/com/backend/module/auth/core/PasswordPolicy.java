package com.backend.module.auth.core;

import java.nio.charset.StandardCharsets;

/** The rule for a password an account owner chooses through an emailed link. */
public final class PasswordPolicy {
    public static final int MIN_LENGTH = 8;

    /** BCrypt reads at most 72 bytes; Spring Security rejects longer input instead of truncating it. */
    public static final int MAX_UTF8_BYTES = 72;

    private PasswordPolicy() {}

    public static boolean isAcceptable(String password) {
        return password != null
                && !password.isBlank()
                && password.length() >= MIN_LENGTH
                && password.getBytes(StandardCharsets.UTF_8).length <= MAX_UTF8_BYTES;
    }
}
