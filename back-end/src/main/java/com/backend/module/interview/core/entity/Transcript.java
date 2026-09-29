package com.backend.module.interview.core.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "transcripts")
public class Transcript {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @ColumnDefault("gen_random_uuid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "exam_schedule_id")
    private UUID examScheduleId;

    @Column(name = "question_id")
    private UUID questionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "parent_transcript_id")
    private Transcript parentTranscript;

    @Size(max = 50)
    @NotNull
    @Column(name = "role", nullable = false, length = 50)
    @Pattern(regexp = "AI|STUDENT")
    private String role;

    @NotNull
    @Column(name = "text_content", nullable = false, length = Integer.MAX_VALUE)
    private String textContent;

    @Size(max = 500)
    @Column(name = "audio_url", length = 500)
    private String audioUrl;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Size(max = 50)
    @ColumnDefault("'MAIN'")
    @Column(name = "transcript_type", length = 50)
    private String transcriptType = "MAIN";

    @Size(max = 100)
    @Column(name = "stream_session_id", length = 100)
    private String streamSessionId;

    @Column(name = "speech_duration_ms")
    private Integer speechDurationMs;

    @Column(name = "latency_ms")
    private Integer latencyMs;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
    }


}
