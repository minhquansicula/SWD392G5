package com.backend.module.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO nhận dữ liệu đăng nhập từ client.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Thông tin đăng nhập của người dùng")
public class LoginRequest {

    @Schema(description = "Tên đăng nhập", example = "student01")
    @NotBlank(message = "Username không được để trống")
    private String username;

    @Schema(description = "Mật khẩu", example = "123456")
    @NotBlank(message = "Password không được để trống")
    private String password;
}
