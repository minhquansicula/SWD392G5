package com.backend.module.exam.entity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.backend.module.auth.entity.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "exam_schedules", uniqueConstraints = {
@UniqueConstraint(name = "uq_exam_student", columnNames = {"exam_id", "student_id"})
}, indexes = @Index(name = "ix_schedule_student_start", columnList = "student_id, scheduled_start_time"))
public class ExamSchedule {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @ColumnDefault("gen_random_uuid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(name = "scheduled_start_time", nullable = false)
    private OffsetDateTime scheduledStartTime;

    @Column(name = "scheduled_end_time", nullable = false)
    private OffsetDateTime scheduledEndTime;

    @Size(max = 50)
    @ColumnDefault("'PENDING'")
    @Column(name = "status", length = 50, nullable = false)
    private String status = "PENDING";

    @Column(name = "final_score", precision = 5, scale = 2)
    private BigDecimal finalScore;


}
