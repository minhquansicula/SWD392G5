package com.backend.module.auth.api.dto;

import com.backend.module.auth.core.enums.Role;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class LoginRequest {
    @NotBlank(message = "Username cannot be blank")
    private String username;

    @Min(value = 8, message = "Password must contains at least 8 characters")
    private String password;

    @NotBlank(message = "Full Name cannot be blank")
    private String fullName;

    @Pattern(regexp = "ADMIN|LECTURER|STUDENT", message = "Role must be ADMIN, LECTURER or STUDENT")
    private Role role;
}
