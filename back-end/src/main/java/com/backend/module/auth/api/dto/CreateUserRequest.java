package com.backend.module.auth.api.dto;

import com.backend.module.auth.core.enums.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Email;
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

    @NotBlank(message = "Password cannot be blank")
    @Size(min = 8, message = "Password must contain at least 8 characters")
    private String password;

    @NotBlank(message = "Full name cannot be blank")
    @Size(max = 255)
    private String fullName;

    private Role role;

    @Size(max = 50)
    private String studentCode;

    @Email
    @Size(max = 255)
    private String email;
}
