package com.backend.module.auth.api.dto;

import lombok.*;

import java.util.UUID;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserDto {
    private UUID id;
    private String fullName;
    private String role;
    private boolean systemAdmin;
    private String studentCode;
    private String email;
    private PasswordStatus passwordStatus;
    private LocalDateTime createdAt;
}

