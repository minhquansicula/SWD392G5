package com.backend.module.exam.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BatchCreateQuestionsRequest {
    @NotNull(message = "Course ID is required")
    private UUID courseId;

    @NotEmpty(message = "Question list cannot be empty")
    @Valid
    private List<QuestionItem> questions;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuestionItem {
        @NotBlank(message = "Question content cannot be blank")
        private String content;

        @Size(max = 50, message = "Difficulty level cannot exceed 50 characters")
        private String difficultyLevel;

        @Size(max = 255, message = "Topic cannot exceed 255 characters")
        private String topic;

        private String expectedAnswer;
    }
}
