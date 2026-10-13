package com.backend.module.auth.core.enums;

/** Outcome of mailing the latest password link of an account; stored in users.password_mail_status. */
public enum PasswordMailStatus {
    SENT,
    FAILED
}
