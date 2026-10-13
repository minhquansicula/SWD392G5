package com.backend.module.auth.api.service;

import com.backend.module.auth.api.dto.PasswordLinkInfo;

public interface PasswordSetupService {
    PasswordLinkInfo describeLink(String token);
    void setPassword(String token, String newPassword);
    void requestReset(String email);
}
