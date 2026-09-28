package com.backend.module.exam.api.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateExamRequest {
    @NotNull(message = "Course ID is required")
    private UUID courseId;
    @NotBlank(message = "Exam title is required")
    @Size(max = 255)
    private String title;
    @NotNull(message = "Start date is required")
    private OffsetDateTime startDate;
    @NotNull(message = "End date is required")
    private OffsetDateTime endDate;
    @NotNull @Min(1) @Max(50)
    private Integer maxMainQuestions;
    @NotNull @Min(0) @Max(20)
    private Integer maxFollowupQuestions;
}
