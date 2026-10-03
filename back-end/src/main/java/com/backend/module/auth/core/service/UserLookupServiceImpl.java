package com.backend.module.auth.core.service;

import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.api.service.UserLookupService;
import com.backend.module.auth.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserLookupServiceImpl implements UserLookupService {
    private final UserRepository userRepository;

    @Override
    public Map<UUID, UserDto> findUsersByIds(Collection<UUID> ids) {
        if (ids.isEmpty()) return Map.of();
        return userRepository.findAllById(ids).stream()
                .map(UserDtoMapper::toDto)
                .collect(Collectors.toMap(UserDto::getId, Function.identity()));
    }

    @Override
    public List<UserDto> searchStudents(String query, int limit) {
        int pageSize = (limit <= 0 || limit > 50) ? 20 : limit;
        String sanitizedQuery = query == null ? "" : query.trim();
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, pageSize, org.springframework.data.domain.Sort.by("fullName").ascending());
        return userRepository.searchStudents(com.backend.module.auth.core.enums.Role.STUDENT, sanitizedQuery, pageable)
                .stream()
                .map(UserDtoMapper::toDto)
                .toList();
    }
}
