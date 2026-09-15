package com.backend.module.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO nhận dữ liệu cập nhật user từ client.
 * Cho phép cập nhật fullName và role. Các field null sẽ không bị cập nhật.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Thông tin cập nhật người dùng")
public class UpdateUserRequest {

    @Schema(description = "Họ tên mới", example = "Nguyễn Văn B")
    @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
    private String fullName;

    @Schema(description = "Role mới", example = "LECTURER")
    @Pattern(regexp = "^(ADMIN|LECTURER|STUDENT)$", message = "Role phải là ADMIN, LECTURER hoặc STUDENT")
    private String role;
}
