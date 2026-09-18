package com.backend.module.exam.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO nhận dữ liệu tạo môn học mới từ client.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Thông tin tạo môn học mới")
public class CreateCourseRequest {

    @Schema(description = "Mã môn học (duy nhất)", example = "SWD392")
    @NotBlank(message = "Mã môn học không được để trống")
    @Size(max = 50, message = "Mã môn học tối đa 50 ký tự")
    private String courseCode;

    @Schema(description = "Tên môn học", example = "Software Architecture and Design")
    @NotBlank(message = "Tên môn học không được để trống")
    @Size(max = 255, message = "Tên môn học tối đa 255 ký tự")
    private String courseName;
}
