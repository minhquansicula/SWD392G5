package com.backend.module.auth.core.service;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface PasswordLinkMailer {
    /** Never throws for delivery problems; returns the users whose mail was not accepted. */
    Set<UUID> send(List<PasswordLinkMail> mails);
}
