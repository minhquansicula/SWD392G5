package com.backend.module.exam.api.dto;

import lombok.*;
import java.util.List;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class QuestionAssignmentResultDto {
    private UUID examScheduleId;
    private Integer totalAssigned;
    private Integer totalAvailableInPool;
    private List<AssignedQuestionDto> assignedQuestions;
}
