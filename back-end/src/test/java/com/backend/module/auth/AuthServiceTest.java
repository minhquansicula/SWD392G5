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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private AuthServiceImpl authService;

    private User mockUser;

    @BeforeEach
    void setUp() {
        mockUser = User.builder()
                .id(UUID.randomUUID())
                .username("lecturer1")
                .passwordHash("hashed_pwd")
                .fullName("Nguyen Van A")
                .role(Role.LECTURER)
                .build();
    }

    @Test
    void login_Success() {
        LoginRequest request = new LoginRequest("lecturer1", "password123");

        when(userRepository.findByUsername("lecturer1")).thenReturn(Optional.of(mockUser));
        when(passwordEncoder.matches("password123", "hashed_pwd")).thenReturn(true);
        when(jwtTokenProvider.generateToken(eq("lecturer1"), eq("LECTURER"), any(Map.class)))
                .thenReturn("mock_jwt_token");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("mock_jwt_token", response.getToken());
        assertEquals("Bearer", response.getTokenType());
        assertEquals("lecturer1", response.getUser().getUsername());
        assertEquals("LECTURER", response.getUser().getRole());
    }

    @Test
    void login_WrongPassword_ThrowsInvalidCredentialsException() {
        LoginRequest request = new LoginRequest("lecturer1", "wrong_password");

        when(userRepository.findByUsername("lecturer1")).thenReturn(Optional.of(mockUser));
        when(passwordEncoder.matches("wrong_password", "hashed_pwd")).thenReturn(false);

        assertThrows(InvalidCredentialsException.class, () -> authService.login(request));
    }

    @Test
    void login_UserNotFound_ThrowsInvalidCredentialsException() {
        LoginRequest request = new LoginRequest("non_existent", "password123");

        when(userRepository.findByUsername("non_existent")).thenReturn(Optional.empty());

        assertThrows(InvalidCredentialsException.class, () -> authService.login(request));
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
