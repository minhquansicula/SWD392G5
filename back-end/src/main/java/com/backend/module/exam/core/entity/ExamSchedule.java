package com.backend.module.exam.core.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "exam_schedules", uniqueConstraints =
        @UniqueConstraint(name = "uk_exam_student", columnNames = {"exam_id", "student_id"}))
public class ExamSchedule {
    @Id
    @ColumnDefault("gen_random_uuid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "exam_id")
    private Exam exam;

    @Column(name = "student_id")
    private UUID studentId;

    @Column(name = "scheduled_start_time")
    private OffsetDateTime scheduledStartTime;

    @Column(name = "scheduled_end_time")
    private OffsetDateTime scheduledEndTime;

    @Size(max = 50)
    @ColumnDefault("'PENDING'")
    @Column(name = "status", length = 50)
    private String status = "PENDING";

    @Column(name = "final_score", precision = 5, scale = 2)
    private BigDecimal finalScore;

    @OneToMany(mappedBy = "examSchedule", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("questionOrder ASC")
    private List<AssignedQuestion> assignedQuestions = new ArrayList<>();


}
