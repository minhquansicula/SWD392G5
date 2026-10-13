package com.backend.module.auth.core.controller;

import com.backend.module.auth.api.dto.AuthResponse;
import com.backend.module.auth.api.dto.ForgotPasswordRequest;
import com.backend.module.auth.api.dto.LoginRequest;
import com.backend.module.auth.api.dto.PasswordLinkInfo;
import com.backend.module.auth.api.dto.PasswordLinkRequest;
import com.backend.module.auth.api.dto.SetPasswordRequest;
import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.api.service.AuthService;
import com.backend.module.auth.api.service.PasswordSetupService;
import com.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Authentication", description = "Authentication API and personal account")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordSetupService passwordSetupService;

    @Operation(summary = "Login",
            description = "Login with email in the username field and password; JWT subject remains the internal username")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successfully", response));
    }

    @Operation(summary = "Check a password link", description = "Returns the account behind a valid one-time link")
    @PostMapping("/password/link")
    public ResponseEntity<ApiResponse<PasswordLinkInfo>> describePasswordLink(
            @Valid @RequestBody PasswordLinkRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Password link is valid",
                passwordSetupService.describeLink(request.getToken())));
    }

    @Operation(summary = "Set password with a link", description = "Consumes the one-time link")
    @PostMapping("/password/set")
    public ResponseEntity<ApiResponse<Void>> setPassword(@Valid @RequestBody SetPasswordRequest request) {
        passwordSetupService.setPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.ok("Password set successfully", null));
    }

    @Operation(summary = "Forgot password",
            description = "Mails a reset link when the email belongs to an account; the response never tells which")
    @PostMapping("/password/forgot")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordSetupService.requestReset(request.getEmail());
        return ResponseEntity.ok(ApiResponse.ok("If the email belongs to an account, a reset link has been sent", null));
    }

    @Operation(summary = "Get User information", description = "Get profile of logging User")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not validate yet"));
        }
        UserDto user = authService.getCurrentUser(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Get User information successfully", user));
    }
}
