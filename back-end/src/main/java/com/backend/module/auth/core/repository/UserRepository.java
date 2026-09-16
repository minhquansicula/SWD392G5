package com.backend.module.auth.core.repository;

import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.enums.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    Page<User> findByRole(Role role, Pageable pageable);
}
