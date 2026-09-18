package com.backend.module.exam.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO trả về thông tin chi tiết câu hỏi.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionResponse {

    private UUID id;
    private UUID courseId;
    private String courseCode;
    private String courseName;
    private String content;
    private String difficultyLevel;
}
