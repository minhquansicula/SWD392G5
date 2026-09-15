package com.backend.module.auth.controller;

import com.backend.module.auth.dto.UpdateUserRequest;
import com.backend.module.auth.dto.UserResponse;
import com.backend.module.auth.service.UserService;
import com.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Controller xử lý các API quản lý user (CRUD).
 * Base path: /api/users (yêu cầu JWT authenticated).
 * Chỉ ADMIN mới có quyền truy cập.
 */
@Tag(name = "User Management", description = "Các API quản lý người dùng (xem, sửa, xóa)")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * Lấy danh sách tất cả users.
     *
     * GET /api/users
     *
     * @return danh sách UserResponse
     */
    @Operation(summary = "Lấy danh sách users", description = "Trả về danh sách tất cả người dùng trong hệ thống. Chỉ ADMIN mới có quyền.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers() {
        List<UserResponse> users = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách người dùng thành công", users));
    }

    /**
     * Lấy chi tiết 1 user theo ID.
     *
     * GET /api/users/{id}
     *
     * @param id UUID của user
     * @return UserResponse
     */
    @Operation(summary = "Xem chi tiết user", description = "Trả về thông tin chi tiết của 1 người dùng theo ID. Chỉ ADMIN mới có quyền.")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable UUID id) {
        UserResponse user = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.ok("Lấy thông tin người dùng thành công", user));
    }

    /**
     * Cập nhật thông tin user.
     *
     * PUT /api/users/{id}
     *
     * @param id      UUID của user cần cập nhật
     * @param request thông tin cập nhật (fullName, role)
     * @return UserResponse sau khi cập nhật
     */
    @Operation(summary = "Cập nhật thông tin user", description = "Cập nhật họ tên và/hoặc role của người dùng. Chỉ ADMIN mới có quyền.")
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request) {
        UserResponse updatedUser = userService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật người dùng thành công", updatedUser));
    }

    /**
     * Xóa user theo ID.
     *
     * DELETE /api/users/{id}
     *
     * @param id UUID của user cần xóa
     * @return thông báo xóa thành công
     */
    @Operation(summary = "Xóa user", description = "Xóa người dùng khỏi hệ thống theo ID. Chỉ ADMIN mới có quyền.")
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable UUID id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.ok("Xóa người dùng thành công", null));
    }
}
