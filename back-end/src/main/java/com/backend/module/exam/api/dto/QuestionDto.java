package com.backend.module.exam.api.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionDto {
    private UUID id;
    private UUID courseId;
    private String courseCode;
    private String courseName;
    private String content;
    private String difficultyLevel;
    private String topic;
    private String expectedAnswer;
}
