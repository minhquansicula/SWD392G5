package com.backend.module.auth.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PasswordLinkInfo {
    private String email;
    private String fullName;
    // true: first password of a new account; false: reset of an existing password.
    private boolean activation;
}
