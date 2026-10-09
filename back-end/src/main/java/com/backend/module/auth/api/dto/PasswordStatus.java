package com.backend.module.auth.api.dto;

/** Where an account stands in the "set your own password through an emailed link" flow. */
public enum PasswordStatus {
    /** The owner has set a password, or the account predates the link flow. */
    ACTIVATED,
    /** A link was mailed and is still valid. */
    PENDING,
    /** The mailed link ran out before it was used. */
    EXPIRED,
    /** No link reached the owner: the mail failed or was never attempted. */
    NOT_SENT
}
