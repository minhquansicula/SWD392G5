package com.backend.module.auth.core.service;

import java.util.UUID;

/** One password link waiting to be mailed after its token has been committed. */
public record PasswordLinkMail(UUID userId, String to, String fullName, String link, boolean activation) {
}
