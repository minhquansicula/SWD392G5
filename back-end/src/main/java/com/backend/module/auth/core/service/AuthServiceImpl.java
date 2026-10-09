package com.backend.module.auth.core.service;

import com.backend.module.auth.api.dto.AuthResponse;
import com.backend.module.auth.api.dto.LoginRequest;
import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.api.exception.InvalidCredentialsException;
import com.backend.module.auth.api.exception.UserNotFoundException;
import com.backend.module.auth.api.service.AuthService;
import com.backend.module.auth.core.EmailRules;
import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.repository.UserRepository;
import com.backend.security.jwt.JwtTokenProvider;
import com.backend.shared.exception.AppException;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final Validator validator;

    @Override
    public AuthResponse login(LoginRequest request) {
        if (request == null) {
            throw new AppException("Invalid login request", BAD_REQUEST, "VALIDATION_FAILED");
        }
        // The payload field is still called username, but it carries the email.
        String canonical = EmailRules.canonicalOrNull(request.getUsername(), validator);
        if (canonical == null || !validator.validate(request).isEmpty()) {
            throw new AppException("Invalid email format", BAD_REQUEST, "VALIDATION_FAILED");
        }

        var matches = userRepository.findTop2ByEmailNormalized(canonical);
        if (matches.size() != 1) {
            throw new InvalidCredentialsException();
        }
        User user = matches.get(0);

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        String token = jwtTokenProvider.generateToken(user.getUsername(), user.getRole().name(), Map.of());

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .user(UserDtoMapper.toDto(user))
                .build();
    }

    @Override
    public UserDto getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException(username));

        return UserDtoMapper.toDto(user);
    }
}
