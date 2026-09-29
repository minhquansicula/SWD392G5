package com.backend.module.reporting.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.util.UUID;
import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "question_results")
public class QuestionResult {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @ColumnDefault("gen_random_uuid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "exam_schedule_id")
    private UUID examScheduleId;

    @Column(name = "question_id")
    private UUID questionId;

    @Column(name = "ai_score", precision = 5, scale = 2)
    private BigDecimal aiScore;

    @Column(name = "ai_feedback", length = Integer.MAX_VALUE)
    private String aiFeedback;

    @ColumnDefault("10.0")
    @Column(name = "max_score", precision = 5, scale = 2)
    private BigDecimal maxScore = new BigDecimal("10.0");

    @Column(name = "lecturer_score", precision = 5, scale = 2)
    private BigDecimal lecturerScore;

    @Column(name = "lecturer_feedback", columnDefinition = "text")
    private String lecturerFeedback;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "graded_at")
    private OffsetDateTime gradedAt;

    @PrePersist
    void onCreate() {
        if (gradedAt == null) gradedAt = OffsetDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
    }


}
