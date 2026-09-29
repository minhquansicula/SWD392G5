package com.backend.module.auth.api.dto;

import lombok.*;

import java.util.UUID;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserDto {
    private UUID id;
    private String username;
    private String fullName;
    private String role;
    private String studentCode;
    private String email;
    private LocalDateTime createdAt;
}

