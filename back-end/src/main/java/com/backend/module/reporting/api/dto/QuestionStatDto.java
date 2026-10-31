package com.backend.module.reporting.api.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class QuestionStatDto {
    private UUID questionId;
    private String content;
    private String topic;
    private String difficulty;
    private long assignedCount;
    private long gradedCount;
    private BigDecimal averageScore;
    /** Share of graded answers at or above the good-answer score; null when nothing is graded. */
    private Double goodAnswerRate;
}
