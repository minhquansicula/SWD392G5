package com.backend.module.exam.api.dto;

import com.backend.module.auth.api.dto.UserDto;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExamScheduleDto {
    public record CriterionGrade(String criterionId, BigDecimal score) {}
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
    private BigDecimal lecturerTotalScore;
    private Boolean lecturerTotalPending;
    private List<CriterionGrade> lecturerCriteria;
    private Integer assignedQuestionCount;
    private Boolean isConnected;
    private String fullRecordingUrl;
    private UUID gradedById;
    private OffsetDateTime actualStartTime;
    private OffsetDateTime actualEndTime;
}
