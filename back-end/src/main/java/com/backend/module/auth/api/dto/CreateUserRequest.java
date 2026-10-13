package com.backend.module.auth.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateUserRequest {
    @NotBlank(message = "Username cannot be blank")
    @Size(max = 255)
    private String username;

    // No password: the account gets an unknown random one and the owner sets theirs through an emailed link.

    @NotBlank(message = "Full name cannot be blank")
    @Size(max = 255)
    private String fullName;

    @Pattern(regexp = "^(ADMIN|LECTURER|STUDENT)$", message = "Role must ADMIN, LECTURER or STUDENT")
    private String role;

    @Size(max = 50)
    private String studentCode;

    // Preserve literal input; validate email in the service after normalization.
    private String email;
}
