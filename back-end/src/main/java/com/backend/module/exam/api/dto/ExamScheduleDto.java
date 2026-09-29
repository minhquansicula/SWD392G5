package com.backend.module.exam.api.dto;

import com.backend.module.auth.api.dto.UserDto;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExamScheduleDto {
    private UUID id;
    private UUID examId;
    private String examTitle;
    private String courseCode;
    private String courseName;
    private UserDto student;
    private OffsetDateTime scheduledStartTime;
    private OffsetDateTime scheduledEndTime;
    private String status;
    private BigDecimal finalScore;
    private Integer assignedQuestionCount;
}
