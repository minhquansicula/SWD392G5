package com.backend.module.exam.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO nhận dữ liệu cập nhật bài thi từ client.
 * Các trường đều optional — chỉ cập nhật trường nào được gửi lên (khác null).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Thông tin cập nhật bài thi")
public class UpdateExamRequest {

    @Schema(description = "ID của môn học mới (nếu muốn đổi môn)", example = "550e8400-e29b-41d4-a716-446655440000")
    private UUID courseId;

    @Schema(description = "Tiêu đề bài thi mới", example = "Kiểm tra cuối kỳ SWD392")
    @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
    private String title;

    @Schema(description = "Thời gian bắt đầu thi mới", example = "2026-10-01T08:00:00+07:00")
    private OffsetDateTime startDate;

    @Schema(description = "Thời gian kết thúc thi mới", example = "2026-10-01T10:00:00+07:00")
    private OffsetDateTime endDate;

    @Schema(description = "Số câu hỏi chính tối đa", example = "10")
    @Min(value = 0, message = "Số câu hỏi chính phải >= 0")
    private Integer maxMainQuestions;

    @Schema(description = "Số câu hỏi phụ tối đa", example = "5")
    @Min(value = 0, message = "Số câu hỏi phụ phải >= 0")
    private Integer maxFollowupQuestions;
}
