package com.backend.module.auth.core.service;

import com.backend.module.auth.api.dto.PasswordStatus;
import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.enums.PasswordMailStatus;

import java.time.OffsetDateTime;

final class UserDtoMapper {
    private UserDtoMapper() { }

    static UserDto toDto(User user) {
        return UserDto.builder().id(user.getId()).username(user.getUsername()).fullName(user.getFullName())
                .role(user.getRole().name()).studentCode(user.getStudentCode()).email(user.getEmail())
                .passwordStatus(passwordStatus(user)).createdAt(user.getCreatedAt()).build();
    }

    static PasswordStatus passwordStatus(User user) {
        if (user.getPasswordSetAt() != null) return PasswordStatus.ACTIVATED;
        if (user.getPasswordMailStatus() != PasswordMailStatus.SENT || user.getPasswordTokenExpiresAt() == null) {
            return PasswordStatus.NOT_SENT;
        }
        return user.getPasswordTokenExpiresAt().isAfter(OffsetDateTime.now())
                ? PasswordStatus.PENDING : PasswordStatus.EXPIRED;
    }
}
