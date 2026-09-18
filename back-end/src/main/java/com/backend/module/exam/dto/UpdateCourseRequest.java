package com.backend.module.exam.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO nhận dữ liệu cập nhật môn học từ client.
 * Các field đều optional — chỉ update field nào được gửi lên (not null).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Thông tin cập nhật môn học")
public class UpdateCourseRequest {

    @Schema(description = "Mã môn học mới (duy nhất)", example = "SWD392")
    @Size(max = 50, message = "Mã môn học tối đa 50 ký tự")
    private String courseCode;

    @Schema(description = "Tên môn học mới", example = "Software Architecture and Design")
    @Size(max = 255, message = "Tên môn học tối đa 255 ký tự")
    private String courseName;
}
