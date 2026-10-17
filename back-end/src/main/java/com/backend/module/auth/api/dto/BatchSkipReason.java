package com.backend.module.auth.api.dto;

/** Why a row of a batch import was not turned into an account. */
public enum BatchSkipReason {
    /** Full name, email, or a student's code is absent or blank. */
    MISSING_REQUIRED,
    /** The email breaks the format or length rule. */
    INVALID_EMAIL,
    /** Any other invalid field: too long, unknown role, or a null row. */
    INVALID_DATA,
    /** Same student code or email as a row created earlier in the same request. */
    DUPLICATE_IN_FILE,
    EMAIL_EXISTS,
    STUDENT_CODE_EXISTS
}
