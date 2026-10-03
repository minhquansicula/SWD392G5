package com.backend.module.auth.api.service;

import com.backend.module.auth.api.dto.UserDto;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Read-only user contract for other modules; never exposes persistence entities. */
public interface UserLookupService {
    Map<UUID, UserDto> findUsersByIds(Collection<UUID> ids);
    List<UserDto> searchStudents(String query, int limit);
}
