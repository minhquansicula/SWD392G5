package com.backend.module.auth.core.controller;

import com.backend.module.auth.api.dto.BatchCreateResult;
import com.backend.module.auth.api.dto.CreateUserRequest;
import com.backend.module.auth.api.dto.UpdateUserRequest;
import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.api.service.AdminUserService;
import com.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
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
            @ParameterObject Pageable pageable) {
        Page<UserDto> users = adminUserService.getUsers(role, pageable);
        return ResponseEntity.ok(ApiResponse.ok("Get User list successfully", users));
    }

    @Operation(summary = "Get User by ID")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> getUserById(@PathVariable UUID id) {
        UserDto user = adminUserService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.ok("Get User successfully", user));
    }

    @Operation(summary = "Create new User")
    @PostMapping
    public ResponseEntity<ApiResponse<UserDto>> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserDto createdUser = adminUserService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Create new User successfully", createdUser));
    }

    @Operation(summary = "Batch create Users",
            description = "Create valid users independently; skip invalid or business-duplicate entries; "
                    + "return one result per submitted row with the skip reason")
    @PostMapping("/batch")
    // Intentionally no aggregate @Valid: the service validates each row and reports why a row was skipped.
    public ResponseEntity<ApiResponse<BatchCreateResult>> batchCreateUsers(
            @RequestBody java.util.List<CreateUserRequest> requests) {
        BatchCreateResult result = adminUserService.batchCreateUsers(requests);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Batch created Users successfully", result));
    }

    @Operation(summary = "Send a new password link",
            description = "Invalidates the previous link and mails a new one; check passwordStatus for the outcome")
    @PostMapping("/{id}/password-link")
    public ResponseEntity<ApiResponse<UserDto>> resendPasswordLink(@PathVariable UUID id) {
        UserDto user = adminUserService.resendPasswordLink(id);
        return ResponseEntity.ok(ApiResponse.ok("Password link processed", user));
    }

    @Operation(summary = "Update User information")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request) {
        UserDto updatedUser = adminUserService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Update User successfully", updatedUser));
    }

    @Operation(summary = "Reset User Password")
    @PutMapping("/{id}/password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @PathVariable UUID id,
            @Valid @RequestBody com.backend.module.auth.api.dto.ResetPasswordRequest request) {
        adminUserService.resetPassword(id, request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.ok("Reset password successfully", null));
    }

    @Operation(summary = "Delete User")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable UUID id) {
        adminUserService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.ok("Delete User successfully", null));
    }
}
