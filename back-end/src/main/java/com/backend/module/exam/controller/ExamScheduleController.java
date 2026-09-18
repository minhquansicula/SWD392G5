package com.backend.module.exam.controller;

import com.backend.module.exam.dto.*;
import com.backend.module.exam.service.ExamScheduleService;
import com.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
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

@RestController
@RequestMapping("/api/exams/{examId}/schedules")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'LECTURER')")
@Tag(name = "Exam Schedules", description = "Quản lý roster và lịch thi một luồng")
public class ExamScheduleController {
    private final ExamScheduleService scheduleService;

    @PostMapping
    @Operation(summary = "Thêm batch sinh viên với slot cụ thể")
    public ResponseEntity<ApiResponse<List<ExamScheduleResponse>>> create(
            @PathVariable UUID examId, @Valid @RequestBody CreateExamSchedulesRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Thêm lịch thi thành công", scheduleService.create(examId, request, auth.getName())));
    }

    @PostMapping("/generate")
    @Operation(summary = "Sinh lịch liên tiếp theo thứ tự studentIds")
    public ResponseEntity<ApiResponse<List<ExamScheduleResponse>>> generate(
            @PathVariable UUID examId, @Valid @RequestBody GenerateExamSchedulesRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Sinh lịch thi thành công", scheduleService.generate(examId, request, auth.getName())));
    }

    @GetMapping
    @Operation(summary = "Xem roster theo giờ bắt đầu và ID; số thứ tự do backend tính")
    public ApiResponse<List<ExamScheduleResponse>> getRoster(@PathVariable UUID examId, Authentication auth) {
        return ApiResponse.ok(scheduleService.getRoster(examId, auth.getName()));
    }

    @PatchMapping("/{scheduleId}")
    @Operation(summary = "Điều chỉnh slot trước khi kỳ thi bắt đầu")
    public ApiResponse<ExamScheduleResponse> update(@PathVariable UUID examId, @PathVariable UUID scheduleId,
            @Valid @RequestBody UpdateExamScheduleRequest request, Authentication auth) {
        return ApiResponse.ok("Cập nhật lịch thi thành công", scheduleService.update(examId, scheduleId, request, auth.getName()));
    }

    @DeleteMapping("/{scheduleId}")
    @Operation(summary = "Loại sinh viên khỏi lịch trước khi kỳ thi bắt đầu")
    public ApiResponse<Void> delete(@PathVariable UUID examId, @PathVariable UUID scheduleId, Authentication auth) {
        scheduleService.delete(examId, scheduleId, auth.getName());
        return ApiResponse.ok("Xóa lịch thi thành công", null);
    }
}
