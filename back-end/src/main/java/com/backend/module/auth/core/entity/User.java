package com.backend.module.auth.core.entity;

import com.backend.module.auth.core.enums.PasswordMailStatus;
import com.backend.module.auth.core.enums.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.util.UUID;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import jakarta.persistence.PrePersist;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @ColumnDefault("gen_random_uuid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @Size(max = 255)
    @NotNull
    @Column(name = "username", nullable = false, unique = true)
    private String username;

    @Size(max = 255)
    @NotNull
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Size(max = 255)
    @NotNull
    @Column(name = "full_name", nullable = false)
    private String fullName;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 50)
    private Role role;

    // PostgreSQL timestamp WITHOUT time zone, unlike the examination timestamps.
    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Size(max = 50)
    @Column(name = "student_code", length = 50, unique = true)
    private String studentCode;

    @Column(name = "email", columnDefinition = "text")
    private String email;

    @Email
    @Column(name = "email_normalized", columnDefinition = "text")
    private String emailNormalized;

    // Null until the owner sets a password through an emailed link (or an admin resets it).
    @Column(name = "password_set_at")
    private OffsetDateTime passwordSetAt;

    // SHA-256 hex of the one-time link token; the raw token is never stored.
    @Size(max = 64)
    @Column(name = "password_token_hash", length = 64, unique = true)
    private String passwordTokenHash;

    @Column(name = "password_token_expires_at")
    private OffsetDateTime passwordTokenExpiresAt;

    // Outcome of mailing the latest link; null when no mail has been attempted.
    @Enumerated(EnumType.STRING)
    @Column(name = "password_mail_status", length = 20)
    private PasswordMailStatus passwordMailStatus;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
    }


}
