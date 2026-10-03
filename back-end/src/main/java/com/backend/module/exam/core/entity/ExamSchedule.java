package com.backend.module.exam.core.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Pattern;
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
        @UniqueConstraint(name = "uq_exam_schedule_student", columnNames = {"exam_id", "student_id"}))
public class ExamSchedule {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
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
    @Pattern(regexp = "PENDING|IN_PROGRESS|COMPLETED")
    @ColumnDefault("'PENDING'")
    @Column(name = "status", length = 50)
    private String status = "PENDING";

    @Column(name = "final_score", precision = 5, scale = 2)
    @DecimalMin("0")
    @DecimalMax("10")
    private BigDecimal finalScore;

    @ColumnDefault("false")
    @Column(name = "is_connected")
    private Boolean isConnected = false;

    @Size(max = 500)
    @Column(name = "full_recording_url", length = 500)
    private String fullRecordingUrl;

    @Column(name = "graded_by")
    private UUID gradedById;

    @Column(name = "actual_start_time")
    private OffsetDateTime actualStartTime;

    @Column(name = "actual_end_time")
    private OffsetDateTime actualEndTime;

    @OneToMany(mappedBy = "examSchedule", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("questionOrder ASC")
    private List<AssignedQuestion> assignedQuestions = new ArrayList<>();


}
