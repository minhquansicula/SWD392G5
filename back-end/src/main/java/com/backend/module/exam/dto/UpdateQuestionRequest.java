package com.backend.module.exam.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO nhận dữ liệu cập nhật câu hỏi từ client.
 * Các trường đều optional — chỉ cập nhật trường nào được gửi lên (khác null).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Thông tin cập nhật câu hỏi")
public class UpdateQuestionRequest {

    @Schema(description = "ID của môn học mới (nếu muốn chuyển môn)", example = "550e8400-e29b-41d4-a716-446655440000")
    private UUID courseId;

    @Schema(description = "Nội dung câu hỏi mới", example = "Trình bày các tầng trong kiến trúc Clean Architecture?")
    private String content;

    @Schema(description = "Độ khó mới (EASY, MEDIUM, HARD)", example = "HARD")
    @Size(max = 50, message = "Độ khó tối đa 50 ký tự")
    private String difficultyLevel;
}
