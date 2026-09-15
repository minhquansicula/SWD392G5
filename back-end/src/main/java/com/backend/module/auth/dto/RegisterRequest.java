package com.backend.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO nhận dữ liệu đăng ký từ client.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "Username không được để trống")
    @Size(min = 3, max = 255, message = "Username phải từ 3 đến 255 ký tự")
    private String username;

    @NotBlank(message = "Password không được để trống")
    @Size(min = 5, max = 100, message = "Password phải từ 6 đến 100 ký tự")
    private String password;

    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
    private String fullName;

    @NotBlank(message = "Role không được để trống")
    @Pattern(regexp = "^(ADMIN|LECTURER|STUDENT)$", message = "Role phải là ADMIN, LECTURER hoặc STUDENT")
    private String role;
}
