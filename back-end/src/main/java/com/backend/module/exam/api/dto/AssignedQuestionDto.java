package com.backend.module.exam.api.dto;

import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AssignedQuestionDto {
    private UUID id;
    private UUID examScheduleId;
    private UUID questionId;
    private Integer questionOrder;
    private String contentSnapshot;
    private String difficultyLevel;
    private OffsetDateTime assignedAt;
}
