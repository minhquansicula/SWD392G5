package com.backend.module.auth.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO nhận dữ liệu cập nhật user từ client.
 * Cho phép cập nhật fullName và role. Các field null sẽ không bị cập nhật.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Update user information")
public class UpdateUserRequest {

    @Schema(description = "New Full Name", example = "Nguyễn Văn B")
    @Size(max = 255, message = "Full Name at most 255 characters")
    private String fullName;

    @Schema(description = "New Role", example = "LECTURER")
    @Pattern(regexp = "^(ADMIN|LECTURER|STUDENT)$", message = "Role must ADMIN, LECTURER or STUDENT")
    private String role;
}
