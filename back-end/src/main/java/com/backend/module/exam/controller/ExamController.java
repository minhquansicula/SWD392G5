package com.backend.module.exam.controller;

import com.backend.module.exam.dto.CreateExamRequest;
import com.backend.module.exam.dto.ExamResponse;
import com.backend.module.exam.service.ExamService;
import com.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
            description = "Giảng viên tạo bài thi mới cho một môn học. Tự động gán người tạo là giảng viên đang đăng nhập.")
    @PreAuthorize("hasRole('LECTURER')")
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
}
