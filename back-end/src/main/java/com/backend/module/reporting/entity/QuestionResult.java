package com.backend.module.reporting.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "question_results")
public class QuestionResult {
    @Id
    @ColumnDefault("gen_random_uuid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "exam_schedule_id")
    private UUID examScheduleId;

    @Column(name = "assigned_question_id", unique = true)
    private UUID assignedQuestionId;

    @Column(name = "ai_score", precision = 5, scale = 2)
    private BigDecimal aiScore;

    @Column(name = "ai_feedback", length = Integer.MAX_VALUE)
    private String aiFeedback;


}
