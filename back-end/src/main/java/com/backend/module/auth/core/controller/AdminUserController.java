package com.backend.module.auth.core.controller;

import com.backend.module.auth.api.dto.CreateUserRequest;
import com.backend.module.auth.api.dto.UpdateUserRequest;
import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.api.service.AdminUserService;
import com.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Tag(name = "Admin User Management", description = "User Management API for ADMIN")
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final AdminUserService adminUserService;

    @Operation(summary = "Get User list", description = "Role filter (optional) and paging")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<UserDto>>> getUsers(
            @RequestParam(required = false) String role,
            Pageable pageable) {
        Page<UserDto> users = adminUserService.getUsers(role, pageable);
        return ResponseEntity.ok(ApiResponse.ok("Get User list successfully", users));
    }

    @Operation(summary = "Create new User")
    @PostMapping
    public ResponseEntity<ApiResponse<UserDto>> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserDto createdUser = adminUserService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Create new User successfully", createdUser));
    }

    @Operation(summary = "Update User information")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request) {
        UserDto updatedUser = adminUserService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Update User successfully", updatedUser));
    }

    @Operation(summary = "Delete User")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable UUID id) {
        adminUserService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.ok("Delete User successfully", null));
    }
}
