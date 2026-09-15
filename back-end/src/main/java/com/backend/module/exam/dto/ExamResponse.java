package com.backend.module.exam.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO trả về thông tin bài thi.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamResponse {

    private UUID id;
    private String courseCode;
    private String courseName;
    private String title;
    private OffsetDateTime startDate;
    private OffsetDateTime endDate;
    private Integer maxMainQuestions;
    private Integer maxFollowupQuestions;
    private String createdBy;
}
