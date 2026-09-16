package com.backend.module.auth.api.service;

import com.backend.module.auth.api.dto.AuthResponse;
import com.backend.module.auth.api.dto.LoginRequest;
import com.backend.module.auth.api.dto.UserDto;

public interface AuthService {
    AuthResponse login(LoginRequest request);
    UserDto getCurrentUser(String username);
}