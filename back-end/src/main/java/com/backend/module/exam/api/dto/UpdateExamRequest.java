package com.backend.module.exam.api.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.time.OffsetDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UpdateExamRequest {
    @Size(max = 255)
    @Pattern(regexp = "(?s).*\\S.*", message = "Exam title must not be blank")
    private String title;
    private OffsetDateTime startDate;
    private OffsetDateTime endDate;
    @Min(1) @Max(50)
    private Integer maxMainQuestions;
    @Min(0) @Max(20)
    private Integer maxFollowupQuestions;
}
