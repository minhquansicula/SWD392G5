package com.backend.module.auth.core.service;

import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.core.entity.User;

final class UserDtoMapper {
    private UserDtoMapper() { }

    static UserDto toDto(User user) {
        return UserDto.builder().id(user.getId()).username(user.getUsername()).fullName(user.getFullName())
                .role(user.getRole().name()).studentCode(user.getStudentCode()).email(user.getEmail())
                .createdAt(user.getCreatedAt()).build();
    }
}
