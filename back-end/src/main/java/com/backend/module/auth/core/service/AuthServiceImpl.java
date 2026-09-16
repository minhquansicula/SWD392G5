package com.backend.module.auth.core.service;

import com.backend.module.auth.api.dto.AuthResponse;
import com.backend.module.auth.api.dto.LoginRequest;
import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.api.exception.InvalidCredentialsException;
import com.backend.module.auth.api.exception.UserNotFoundException;
import com.backend.module.auth.api.service.AuthService;
import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.repository.UserRepository;
import com.backend.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new InvalidCredentialsException("Username or password is incorrect"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Username or password is incorrect");
        }

        String token = jwtTokenProvider.generateToken(user.getUsername(), user.getRole().name(), Map.of());

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .user(UserDto.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .fullName(user.getFullName())
                        .role(user.getRole().name())
                        .build())
                .build();
    }

    @Override
    public UserDto getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException(username));

        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }
}
