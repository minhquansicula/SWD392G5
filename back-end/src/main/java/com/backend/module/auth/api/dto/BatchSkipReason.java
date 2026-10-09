package com.backend.module.auth.api.dto;

/** Why a row of a batch import was not turned into an account. */
public enum BatchSkipReason {
    /** Username, full name or email is absent or blank. */
    MISSING_REQUIRED,
    /** The email breaks the format or length rule. */
    INVALID_EMAIL,
    /** Any other invalid field: too long, unknown role, or a null row. */
    INVALID_DATA,
    /** Same username or email as a row created earlier in the same request. */
    DUPLICATE_IN_FILE,
    USERNAME_EXISTS,
    EMAIL_EXISTS,
    STUDENT_CODE_EXISTS
}
