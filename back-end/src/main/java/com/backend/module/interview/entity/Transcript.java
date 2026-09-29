package com.backend.module.interview.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
    @ColumnDefault("gen_random_uuid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "exam_schedule_id")
    private UUID examScheduleId;

    @Column(name = "assigned_question_id")
    private UUID assignedQuestionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "parent_transcript_id")
    private Transcript parentTranscript;

    @Size(max = 50)
    @NotNull
    @Column(name = "role", nullable = false, length = 50)
    private String role;

    @NotNull
    @Column(name = "text_content", nullable = false, length = Integer.MAX_VALUE)
    private String textContent;

    @Size(max = 255)
    @Column(name = "audio_url")
    private String audioUrl;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "created_at")
    private OffsetDateTime createdAt;


}
