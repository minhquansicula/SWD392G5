package com.backend.module.exam.api.dto;

import com.backend.module.auth.api.dto.UserDto;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExamDto {
    private UUID id;
    private UUID courseId;
    private String courseCode;
    private String courseName;
    private String title;
    private OffsetDateTime startDate;
    private OffsetDateTime endDate;
    private Integer maxMainQuestions;
    private Integer maxFollowupQuestions;
    private UserDto createdBy;
    private Integer totalStudents;
    private Integer completedStudents;
    private Integer pendingStudents;
    private Integer inProgressStudents;
}
