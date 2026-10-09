package com.backend.module.auth.api.service;

import com.backend.module.auth.api.dto.BatchCreateResult;
import com.backend.module.auth.api.dto.CreateUserRequest;
import com.backend.module.auth.api.dto.UpdateUserRequest;
import com.backend.module.auth.api.dto.UserDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface AdminUserService {
    Page<UserDto> getUsers(String role, Pageable pageable);
    UserDto getUserById(UUID id);
    UserDto createUser(CreateUserRequest request);
    BatchCreateResult batchCreateUsers(List<CreateUserRequest> requests);
    UserDto resendPasswordLink(UUID userId);
    UserDto updateUser(UUID id, UpdateUserRequest request);
    void resetPassword(UUID userId, String newPassword);
    void deleteUser(UUID userId);
}
