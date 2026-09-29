package com.backend.module.exam.core.entity;

import com.backend.module.auth.core.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.OffsetDateTime;
import java.util.UUID;

/** The join table has its own audit data and therefore is an entity. */
@Getter @Setter
@Entity
@Table(name = "course_lecturers")
public class CourseLecturer {
    @EmbeddedId
    private CourseLecturerId id;

    @MapsId("courseId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Course course;

    @MapsId("lecturerId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lecturer_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User lecturer;

    @Column(name = "assigned_at")
    @ColumnDefault("CURRENT_TIMESTAMP")
    private OffsetDateTime assignedAt;

    @Column(name = "assigned_by")
    private UUID assignedById;

    @PrePersist
    void onCreate() {
        if (assignedAt == null) assignedAt = OffsetDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
    }
}
