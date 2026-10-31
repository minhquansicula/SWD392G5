package com.backend.module.reporting.api.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GradebookRowDto {
    private UUID scheduleId;
    private String studentCode;
    private String fullName;
    private String email;
    private String status;
    private BigDecimal finalScore;
    private List<CriterionMarkDto> criteria;
}
