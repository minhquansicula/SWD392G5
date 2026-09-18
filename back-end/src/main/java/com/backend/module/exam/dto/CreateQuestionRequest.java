package com.backend.module.exam.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO nhận dữ liệu tạo câu hỏi mới từ client.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Thông tin tạo câu hỏi mới trong ngân hàng đề")
public class CreateQuestionRequest {

    @Schema(description = "ID của môn học chứa câu hỏi", example = "550e8400-e29b-41d4-a716-446655440000")
    @NotNull(message = "Course ID không được để trống")
    private UUID courseId;

    @Schema(description = "Nội dung câu hỏi phỏng vấn", example = "Giải thích nguyên lý Dependency Inversion trong SOLID?")
    @NotBlank(message = "Nội dung câu hỏi không được để trống")
    private String content;

    @Schema(description = "Độ khó của câu hỏi (EASY, MEDIUM, HARD)", example = "MEDIUM")
    @Size(max = 50, message = "Độ khó tối đa 50 ký tự")
    private String difficultyLevel;
}
