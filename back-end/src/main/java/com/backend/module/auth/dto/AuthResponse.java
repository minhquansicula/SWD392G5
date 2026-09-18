package com.backend.module.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO trả về sau khi đăng ký / đăng nhập thành công.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private UUID id;
    private String username;
    private String fullName;
    private String role;
    private OffsetDateTime createdAt;
    private String token;

    @Builder.Default
    private String tokenType = "Bearer";
}
