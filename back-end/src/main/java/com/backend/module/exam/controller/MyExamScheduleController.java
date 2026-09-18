package com.backend.module.exam.controller;

import com.backend.module.exam.dto.ExamScheduleResponse;
import com.backend.module.exam.service.ExamScheduleService;
import com.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class MyExamScheduleController {
    private final ExamScheduleService scheduleService;

    @GetMapping("/api/me/exam-schedules")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Sinh viên xem lịch của chính mình, xác định từ JWT")
    public ApiResponse<List<ExamScheduleResponse>> getMySchedules(Authentication auth) {
        return ApiResponse.ok(scheduleService.getMySchedules(auth.getName()));
    }
}
