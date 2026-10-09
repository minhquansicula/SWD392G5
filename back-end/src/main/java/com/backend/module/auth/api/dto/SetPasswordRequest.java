package com.backend.module.auth.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SetPasswordRequest {
    @NotBlank(message = "Token cannot be blank")
    private String token;

    // Length is checked by PasswordPolicy in the service: its upper bound is in bytes, not characters.
    @NotBlank(message = "Password cannot be blank")
    private String newPassword;
}
