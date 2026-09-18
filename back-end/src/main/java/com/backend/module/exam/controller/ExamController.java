package com.backend.module.exam.controller;

import com.backend.module.exam.dto.CreateExamRequest;
import com.backend.module.exam.dto.ExamResponse;
import com.backend.module.exam.dto.UpdateExamRequest;
import com.backend.module.exam.service.ExamService;
import com.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Controller xử lý các API quản lý bài thi (Exam).
 * Base path: /api/exams (yêu cầu JWT authenticated).
 */
@Tag(name = "Exam Management", description = "Các API quản lý bài thi")
@RestController
@RequestMapping("/api/exams")
@RequiredArgsConstructor
public class ExamController {

    private final ExamService examService;

    /**
     * Tạo bài thi mới.
     *
     * POST /api/exams
     *
     * @param request        thông tin bài thi (courseId, title, startDate, endDate,...)
     * @param authentication thông tin xác thực từ JWT token
     * @return ApiResponse chứa ExamResponse
     */
    @Operation(summary = "Tạo bài thi mới",
            description = "Giảng viên hoặc Admin tạo bài thi mới cho một môn học. Tự động gán người tạo là user đang đăng nhập.")
    @PreAuthorize("hasAnyRole('ADMIN', 'LECTURER')")
    @PostMapping
    public ResponseEntity<ApiResponse<ExamResponse>> createExam(
            @Valid @RequestBody CreateExamRequest request,
            Authentication authentication) {

        String username = authentication.getName();
        ExamResponse response = examService.createExam(request, username);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Tạo bài thi thành công", response));
    }

    /**
     * Lấy danh sách bài thi (hỗ trợ lọc theo môn học).
     *
     * GET /api/exams?courseId=...
     *
     * @param courseId UUID của môn học cần lọc (optional)
     * @return ApiResponse chứa danh sách ExamResponse
     */
    @Operation(summary = "Lấy danh sách bài thi",
            description = "Lấy danh sách toàn bộ bài thi hoặc lọc theo môn học. Mọi user đã đăng nhập đều có thể truy cập.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ExamResponse>>> getExams(
            @Parameter(description = "ID môn học để lọc") @RequestParam(required = false) UUID courseId) {

        List<ExamResponse> exams = examService.getExams(courseId);

        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách bài thi thành công", exams));
    }

    /**
     * Lấy thông tin chi tiết một bài thi theo ID.
     *
     * GET /api/exams/{id}
     *
     * @param id UUID của bài thi
     * @return ApiResponse chứa ExamResponse
     */
    @Operation(summary = "Lấy chi tiết bài thi",
            description = "Lấy thông tin chi tiết bài thi theo ID.")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExamResponse>> getExamById(
            @Parameter(description = "ID của bài thi") @PathVariable UUID id) {

        ExamResponse response = examService.getExamById(id);

        return ResponseEntity.ok(ApiResponse.ok("Lấy thông tin bài thi thành công", response));
    }

    /**
     * Cập nhật thông tin bài thi.
     *
     * PUT /api/exams/{id}
     *
     * @param id      UUID của bài thi cần cập nhật
     * @param request thông tin cập nhật
     * @return ApiResponse chứa ExamResponse sau khi cập nhật
     */
    @Operation(summary = "Cập nhật bài thi",
            description = "Giảng viên hoặc Admin cập nhật thông tin bài thi (tiêu đề, thời gian thi, số câu hỏi, môn học).")
    @PreAuthorize("hasAnyRole('ADMIN', 'LECTURER')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ExamResponse>> updateExam(
            @Parameter(description = "ID của bài thi") @PathVariable UUID id,
            @Valid @RequestBody UpdateExamRequest request, Authentication authentication) {

        ExamResponse response = examService.updateExam(id, request, authentication.getName());

        return ResponseEntity.ok(ApiResponse.ok("Cập nhật bài thi thành công", response));
    }

    /**
     * Xoá bài thi.
     *
     * DELETE /api/exams/{id}
     *
     * @param id UUID của bài thi cần xoá
     * @return ApiResponse xác nhận xoá thành công
     */
    @Operation(summary = "Xoá bài thi",
            description = "Giảng viên sở hữu kỳ thi hoặc Admin xoá trước giờ bắt đầu, khi mọi ca thi còn PENDING.")
    @PreAuthorize("hasAnyRole('ADMIN', 'LECTURER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteExam(
            @Parameter(description = "ID của bài thi") @PathVariable UUID id, Authentication authentication) {

        examService.deleteExam(id, authentication.getName());

        return ResponseEntity.ok(ApiResponse.ok("Xoá bài thi thành công", null));
    }
}
