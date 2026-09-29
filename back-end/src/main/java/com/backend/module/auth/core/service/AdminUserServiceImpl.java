package com.backend.module.auth.core.service;

import com.backend.module.auth.api.dto.*;
import com.backend.module.auth.api.exception.UserAlreadyExistsException;
import com.backend.module.auth.api.exception.UserNotFoundException;
import com.backend.module.auth.api.service.AdminUserService;
import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.enums.Role;
import com.backend.module.auth.core.repository.UserRepository;
import com.backend.shared.exception.AppException;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserServiceImpl implements AdminUserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Validator validator;

    @Override
    @Transactional(readOnly = true)
    public Page<UserDto> getUsers(String role, Pageable pageable) {
        Set<String> sortable = Set.of("id", "username", "fullName", "role", "studentCode", "email", "createdAt");
        if (pageable.isUnpaged() || pageable.getPageSize() > 100
                || pageable.getSort().stream().anyMatch(o -> !sortable.contains(o.getProperty()))) {
            throw new AppException("Use page size 1-100 and a supported user sort field", BAD_REQUEST, "VALIDATION_FAILED");
        }
        Page<User> users = role == null || role.isBlank() ? userRepository.findAll(pageable)
                : userRepository.findByRole(parseRole(role), pageable);
        return users.map(UserDtoMapper::toDto);
    }

    @Override
    @Transactional
    public UserDto createUser(CreateUserRequest request) {
        validate(request);
        String username = request.getUsername().trim();
        String studentCode = optionalText(request.getStudentCode());
        if (userRepository.existsByUsername(username)) throw new UserAlreadyExistsException(username);
        if (studentCode != null && userRepository.existsByStudentCode(studentCode)) {
            throw new AppException("Student code already exists", CONFLICT, "STUDENT_CODE_EXISTS");
        }
        User user = User.builder().username(username).passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim()).role(request.getRole() == null ? Role.STUDENT : request.getRole())
                .studentCode(studentCode).email(optionalText(request.getEmail())).build();
        return UserDtoMapper.toDto(userRepository.saveAndFlush(user));
    }

    @Override
    @Transactional
    public List<UserDto> batchCreateUsers(List<CreateUserRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new AppException("User list must not be empty", BAD_REQUEST, "VALIDATION_FAILED");
        }
        List<UserDto> result = new ArrayList<>();
        for (CreateUserRequest request : requests) result.add(createUser(request));
        return result;
    }

    @Override
    @Transactional
    public UserDto updateUser(UUID id, UpdateUserRequest request) {
        validate(request);
        User user = userRepository.findById(id).orElseThrow(() -> new UserNotFoundException(id.toString()));
        if (request.getFullName() != null) user.setFullName(request.getFullName().trim());
        if (request.getRole() != null) user.setRole(parseRole(request.getRole()));
        if (request.getStudentCode() != null) {
            String studentCode = optionalText(request.getStudentCode());
            if (studentCode != null && userRepository.existsByStudentCodeAndIdNot(studentCode, id)) {
                throw new AppException("Student code already exists", CONFLICT, "STUDENT_CODE_EXISTS");
            }
            user.setStudentCode(studentCode);
        }
        if (request.getEmail() != null) user.setEmail(optionalText(request.getEmail()));
        return UserDtoMapper.toDto(userRepository.saveAndFlush(user));
    }

    @Override
    @Transactional
    public void deleteUser(UUID userId) {
        if (!userRepository.existsById(userId)) throw new UserNotFoundException(userId.toString());
        try {
            userRepository.deleteById(userId);
            userRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new AppException("User is referenced by examination data that cannot be deleted", CONFLICT, "USER_IN_USE");
        }
    }

    private Role parseRole(String role) {
        try {
            return Role.valueOf(role.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new AppException("Role must be ADMIN, LECTURER or STUDENT", BAD_REQUEST, "INVALID_ROLE");
        }
    }

    private void validate(Object request) {
        if (request == null || !validator.validate(request).isEmpty()) {
            throw new AppException("Invalid user data: check required fields, lengths and email", BAD_REQUEST, "VALIDATION_FAILED");
        }
    }

    private String optionalText(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
