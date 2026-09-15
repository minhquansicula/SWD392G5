package com.backend.module.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO trả về thông tin user (không chứa passwordHash, token).
 * Dùng cho cả view danh sách và view chi tiết.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private UUID id;
    private String username;
    private String fullName;
    private String role;
}
