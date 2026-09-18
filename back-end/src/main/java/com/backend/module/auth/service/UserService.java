package com.backend.module.auth.service;

import com.backend.module.auth.dto.UpdateUserRequest;
import com.backend.module.auth.dto.UserResponse;
import com.backend.module.auth.entity.User;
import com.backend.module.auth.repository.UserRepository;
import com.backend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service xử lý logic nghiệp vụ quản lý user (CRUD).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    /**
     * Lấy danh sách tất cả users.
     *
     * @return danh sách UserResponse
     */
    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::toUserResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy chi tiết 1 user theo ID.
     *
     * @param id UUID của user
     * @return UserResponse
     * @throws ResourceNotFoundException nếu không tìm thấy user
     */
    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        return toUserResponse(user);
    }

    /**
     * Cập nhật thông tin user (fullName, role).
     * Chỉ cập nhật các field không null trong request.
     *
     * @param id      UUID của user cần cập nhật
     * @param request thông tin cập nhật
     * @return UserResponse sau khi cập nhật
     * @throws ResourceNotFoundException nếu không tìm thấy user
     */
    @Transactional
    public UserResponse updateUser(UUID id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        // Chỉ cập nhật field nếu client gửi giá trị (không null, không rỗng)
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName());
        }
        if (request.getRole() != null && !request.getRole().isBlank()) {
            user.setRole(request.getRole().trim().toUpperCase());
        }

        User updatedUser = userRepository.save(user);
        log.info("Cập nhật thành công user: {} (ID: {})", updatedUser.getUsername(), updatedUser.getId());

        return toUserResponse(updatedUser);
    }

    /**
     * Xóa user theo ID (hard delete).
     *
     * @param id UUID của user cần xóa
     * @throws ResourceNotFoundException nếu không tìm thấy user
     */
    @Transactional
    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        userRepository.delete(user);
        log.info("Đã xóa user: {} (ID: {})", user.getUsername(), id);
    }

    /**
     * Chuyển đổi entity User sang DTO UserResponse.
     */
    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
