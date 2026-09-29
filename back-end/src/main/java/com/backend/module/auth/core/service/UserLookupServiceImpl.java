package com.backend.module.auth.core.service;

import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.api.service.UserLookupService;
import com.backend.module.auth.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
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
}
