package com.backend.module.auth;

import com.backend.module.auth.api.dto.CreateUserRequest;
import com.backend.module.auth.api.dto.UpdateUserRequest;
import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.api.exception.UserAlreadyExistsException;
import com.backend.module.auth.api.exception.UserNotFoundException;
import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.enums.Role;
import com.backend.module.auth.core.repository.UserRepository;
import com.backend.module.auth.core.service.AdminUserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AdminUserServiceImpl adminUserService;

    private User sampleUser;
    private UUID sampleUserId;

    @BeforeEach
    void setUp() {
        sampleUserId = UUID.randomUUID();
        sampleUser = User.builder()
                .id(sampleUserId)
                .username("SE170001")
                .passwordHash("encoded_pwd")
                .fullName("Tran Van Sinh Vien")
                .role(Role.STUDENT)
                .build();
    }

    @Test
    void getUsers_NoRoleFilter_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        when(userRepository.findAll(pageable)).thenReturn(new PageImpl<>(List.of(sampleUser)));

        Page<UserDto> result = adminUserService.getUsers(null, pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("SE170001", result.getContent().get(0).getUsername());
    }

    @Test
    void getUsers_WithRoleFilter_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        when(userRepository.findByRole(Role.STUDENT, pageable)).thenReturn(new PageImpl<>(List.of(sampleUser)));

        Page<UserDto> result = adminUserService.getUsers("STUDENT", pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("STUDENT", result.getContent().get(0).getRole());
    }

    @Test
    void createUser_Success() {
        CreateUserRequest request = new CreateUserRequest();
        request.setUsername("SE170002");
        request.setPassword("password123");
        request.setFullName("Le Thi B");
        request.setRole(Role.STUDENT);

        when(userRepository.existsByUsername("SE170002")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded_new_pwd");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        UserDto result = adminUserService.createUser(request);

        assertNotNull(result);
        assertEquals("SE170002", result.getUsername());
        assertEquals("Le Thi B", result.getFullName());
        assertEquals("STUDENT", result.getRole());
    }

    @Test
    void createUser_UsernameAlreadyExists_ThrowsException() {
        CreateUserRequest request = new CreateUserRequest();
        request.setUsername("SE170001");
        request.setPassword("password123");
        request.setFullName("Duplicate");

        when(userRepository.existsByUsername("SE170001")).thenReturn(true);

        assertThrows(UserAlreadyExistsException.class, () -> adminUserService.createUser(request));
    }

    @Test
    void updateUser_Success() {
        UpdateUserRequest request = new UpdateUserRequest();
        request.setFullName("Tran Van Sinh Vien Updated");
        request.setRole("LECTURER");

        when(userRepository.findById(sampleUserId)).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenReturn(sampleUser);

        UserDto result = adminUserService.updateUser(sampleUserId, request);

        assertNotNull(result);
        assertEquals("Tran Van Sinh Vien Updated", sampleUser.getFullName());
        assertEquals(Role.LECTURER, sampleUser.getRole());
    }

    @Test
    void deleteUser_Success() {
        when(userRepository.existsById(sampleUserId)).thenReturn(true);
        doNothing().when(userRepository).deleteById(sampleUserId);

        assertDoesNotThrow(() -> adminUserService.deleteUser(sampleUserId));
        verify(userRepository, times(1)).deleteById(sampleUserId);
    }

    @Test
    void deleteUser_NotFound_ThrowsException() {
        UUID nonExistentId = UUID.randomUUID();
        when(userRepository.existsById(nonExistentId)).thenReturn(false);

        assertThrows(UserNotFoundException.class, () -> adminUserService.deleteUser(nonExistentId));
    }
}
