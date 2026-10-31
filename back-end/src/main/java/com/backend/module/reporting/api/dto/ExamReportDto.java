package com.backend.module.reporting.api.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExamReportDto {
    private BigDecimal goodAnswerScore;
    private Double goodAnswerRate;
    /** Hardest first: lowest average score, ungraded questions last. */
    private List<QuestionStatDto> questions;
}
