package com.backend.module.exam.core.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "assigned_questions", uniqueConstraints = {
        @UniqueConstraint(name = "uq_assigned_question_order", columnNames = {"exam_schedule_id", "question_order"}),
        @UniqueConstraint(name = "uq_assigned_question", columnNames = {"exam_schedule_id", "question_id"})
})
public class AssignedQuestion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exam_schedule_id", nullable = false, updatable = false)
    private ExamSchedule examSchedule;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false, updatable = false)
    private Question question;

    @Column(name = "question_order", nullable = false, updatable = false)
    @Positive
    private Integer questionOrder;

    @Column(name = "content_snapshot", nullable = false, updatable = false, columnDefinition = "text")
    private String contentSnapshot;

    @Column(name = "assigned_at", nullable = false, updatable = false)
    private OffsetDateTime assignedAt;

    @PrePersist
    void onCreate() {
        if (assignedAt == null) assignedAt = OffsetDateTime.now();
    }
}
