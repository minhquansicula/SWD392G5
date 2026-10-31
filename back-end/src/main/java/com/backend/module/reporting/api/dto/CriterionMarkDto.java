package com.backend.module.reporting.api.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CriterionMarkDto {
    private String name;
    private BigDecimal weight;
    private BigDecimal score;
    private boolean assessed;
    private String comment;
}
