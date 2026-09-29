package com.backend.module.exam.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateQuestionRequest {
    @NotNull(message = "Course ID is required")
    private UUID courseId;

    @NotBlank(message = "Question content cannot be blank")
    private String content;

    @Size(max = 50, message = "Difficulty level cannot exceed 50 characters")
    private String difficultyLevel;

    @Size(max = 255, message = "Topic cannot exceed 255 characters")
    private String topic;

    private String expectedAnswer;
}
