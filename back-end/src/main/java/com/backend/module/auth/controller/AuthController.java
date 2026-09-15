package com.backend.module.auth.controller;

import com.backend.module.auth.dto.AuthResponse;
import com.backend.module.auth.dto.LoginRequest;
import com.backend.module.auth.dto.RegisterRequest;
import com.backend.module.auth.service.AuthService;
import com.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller xử lý các API liên quan đến xác thực (Authentication).
 * Base path: /api/auth (đã được permitAll trong SecurityConfig).
 */
@Tag(name = "Authentication", description = "Các API xác thực và phân quyền người dùng (Register, Login,...)")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Đăng ký tài khoản mới.
     *
     * POST /api/auth/register
     *
     * @param request thông tin đăng ký (username, password, fullName, role)
     * @return ApiResponse chứa AuthResponse (user info + JWT token)
     */
    @Operation(summary = "Đăng ký tài khoản mới", description = "Tạo tài khoản mới cho sinh viên hoặc giảng viên. Trả về thông tin tài khoản kèm JWT token.")
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Đăng ký tài khoản thành công", response));
    }

    /**
     * Đăng nhập vào hệ thống.
     *
     * POST /api/auth/login
     *
     * @param request thông tin đăng nhập (username, password)
     * @return ApiResponse chứa AuthResponse (user info + JWT token)
     */
    @Operation(summary = "Đăng nhập", description = "Xác thực tài khoản người dùng và trả về JWT Bearer token cùng thông tin tài khoản.")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Đăng nhập thành công", response));
    }
}
