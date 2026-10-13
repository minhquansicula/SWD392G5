package com.backend.module.auth;

import com.backend.module.auth.api.dto.AuthResponse;
import com.backend.module.auth.api.dto.LoginRequest;
import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.api.exception.InvalidCredentialsException;
import com.backend.module.auth.api.exception.UserNotFoundException;
import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.enums.Role;
import com.backend.module.auth.core.repository.UserRepository;
import com.backend.module.auth.core.service.AuthServiceImpl;
import com.backend.security.jwt.JwtTokenProvider;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    private static final ValidatorFactory FACTORY =
            Validation.buildDefaultValidatorFactory();

    @AfterAll
    static void closeFactory() {
        FACTORY.close();
    }

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    private AuthServiceImpl authService;

    private User mockUser;

    @BeforeEach
    void setUp() {
        authService = new AuthServiceImpl(
                userRepository, passwordEncoder, jwtTokenProvider, FACTORY.getValidator());
        mockUser = User.builder()
                .id(UUID.randomUUID())
                .username("lecturer1")
                .passwordHash("hashed_pwd")
                .fullName("Nguyen Van A")
                .role(Role.LECTURER)
                .email(" Lecturer1@EXAMPLE.COM ")
                .emailNormalized("lecturer1@example.com")
                .build();
    }

    @Test
    void login_Success() {
        LoginRequest request = new LoginRequest(" Lecturer1@EXAMPLE.COM ", "password123");

        when(userRepository.findTop2ByEmailNormalized("lecturer1@example.com")).thenReturn(List.of(mockUser));
        when(passwordEncoder.matches("password123", "hashed_pwd")).thenReturn(true);
        when(jwtTokenProvider.generateToken(eq("lecturer1"), eq("LECTURER"), any(Map.class)))
                .thenReturn("mock_jwt_token");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("mock_jwt_token", response.getToken());
        assertEquals("Bearer", response.getTokenType());
        assertEquals("lecturer1", response.getUser().getUsername());
        assertEquals("LECTURER", response.getUser().getRole());
        assertEquals(" Lecturer1@EXAMPLE.COM ", request.getUsername());
        verify(userRepository, never()).findByUsername(anyString());
    }

    @Test
    void login_WrongPassword_ThrowsInvalidCredentialsException() {
        LoginRequest request = new LoginRequest("lecturer1@example.com", "wrong_password");

        when(userRepository.findTop2ByEmailNormalized("lecturer1@example.com")).thenReturn(List.of(mockUser));
        when(passwordEncoder.matches("wrong_password", "hashed_pwd")).thenReturn(false);

        InvalidCredentialsException failure =
                assertThrows(InvalidCredentialsException.class, () -> authService.login(request));
        assertEquals("Email or password is incorrect", failure.getMessage());
        verifyNoInteractions(jwtTokenProvider);
    }

    @Test
    void login_UserNotFound_ThrowsInvalidCredentialsException() {
        LoginRequest request = new LoginRequest("missing@example.com", "password123");

        when(userRepository.findTop2ByEmailNormalized("missing@example.com")).thenReturn(List.of());

        InvalidCredentialsException failure =
                assertThrows(InvalidCredentialsException.class, () -> authService.login(request));
        assertEquals("Email or password is incorrect", failure.getMessage());
        verify(userRepository, never()).findByUsername(anyString());
        verifyNoInteractions(passwordEncoder, jwtTokenProvider);
    }

    @Test
    void getCurrentUser_Success() {
        when(userRepository.findByUsername("lecturer1")).thenReturn(Optional.of(mockUser));

        UserDto userDto = authService.getCurrentUser("lecturer1");

        assertNotNull(userDto);
        assertEquals("lecturer1", userDto.getUsername());
        assertEquals("Nguyen Van A", userDto.getFullName());
    }

    @Test
    void getCurrentUser_NotFound_ThrowsUserNotFoundException() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> authService.getCurrentUser("unknown"));
    }
}
