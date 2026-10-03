package com.backend.module.exam.api.dto;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExamDetailDto {
    private ExamDto exam;
    private List<ExamScheduleDto> schedules;
}
