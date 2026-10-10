package com.backend.module.auth.core.repository;

import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.enums.PasswordMailStatus;
import com.backend.module.auth.core.enums.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
    List<User> findTop2ByEmailNormalized(String emailNormalized);
    Optional<User> findByPasswordTokenHash(String passwordTokenHash);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE User u SET u.passwordMailStatus = :status WHERE u.id IN :ids")
    int updatePasswordMailStatus(@Param("ids") Collection<UUID> ids, @Param("status") PasswordMailStatus status);

    boolean existsByUsername(String username);
    boolean existsByStudentCode(String studentCode);
    boolean existsByStudentCodeAndIdNot(String studentCode, UUID id);
    Page<User> findByRole(Role role, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.role = :role AND (" +
           ":query IS NULL OR :query = '' OR " +
           "CAST(u.id AS string) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(COALESCE(u.studentCode, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(COALESCE(u.email, '')) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<User> searchStudents(@Param("role") Role role, @Param("query") String query, Pageable pageable);
}
