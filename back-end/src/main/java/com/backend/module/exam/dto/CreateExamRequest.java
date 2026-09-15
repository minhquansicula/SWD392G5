package com.backend.module.exam.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO nhận dữ liệu tạo bài thi mới từ client.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Thông tin tạo bài thi mới")
public class CreateExamRequest {

    @Schema(description = "ID của môn học", example = "550e8400-e29b-41d4-a716-446655440000")
    @NotNull(message = "Course ID không được để trống")
    private UUID courseId;

    @Schema(description = "Tiêu đề bài thi", example = "Kiểm tra giữa kỳ SWD392")
    @NotBlank(message = "Tiêu đề bài thi không được để trống")
    @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
    private String title;

    @Schema(description = "Thời gian bắt đầu thi", example = "2026-10-01T08:00:00+07:00")
    @NotNull(message = "Thời gian bắt đầu không được để trống")
    @Future(message = "Thời gian bắt đầu phải là thời điểm trong tương lai")
    private OffsetDateTime startDate;

    @Schema(description = "Thời gian kết thúc thi", example = "2026-10-01T10:00:00+07:00")
    @NotNull(message = "Thời gian kết thúc không được để trống")
    @Future(message = "Thời gian kết thúc phải là thời điểm trong tương lai")
    private OffsetDateTime endDate;

    @Schema(description = "Số câu hỏi chính tối đa", example = "10")
    @Min(value = 0, message = "Số câu hỏi chính phải >= 0")
    private Integer maxMainQuestions = 0;

    @Schema(description = "Số câu hỏi phụ tối đa", example = "5")
    @Min(value = 0, message = "Số câu hỏi phụ phải >= 0")
    private Integer maxFollowupQuestions = 0;
}
