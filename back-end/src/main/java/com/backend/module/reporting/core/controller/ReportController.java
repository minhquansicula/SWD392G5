package com.backend.module.reporting.core.controller;

import com.backend.module.reporting.api.dto.ExamReportDto;
import com.backend.module.reporting.api.dto.GradebookRowDto;
import com.backend.module.reporting.api.service.ReportService;
import com.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "Reporting", description = "Class statistics and gradebook data")
@PreAuthorize("hasAnyRole('LECTURER', 'ADMIN')")
public class ReportController {
    private final ReportService reportService;

    @Operation(summary = "Question difficulty and good-answer statistics for an accessible exam")
    @GetMapping("/api/lecturer/exams/{examId}/report")
    public ResponseEntity<ApiResponse<ExamReportDto>> report(@PathVariable UUID examId) {
        return ResponseEntity.ok(ApiResponse.ok("Exam report generated successfully", reportService.getExamReport(examId)));
    }

    @Operation(summary = "Per-student rubric marks for the school gradebook export")
    @GetMapping("/api/lecturer/exams/{examId}/gradebook")
    public ResponseEntity<ApiResponse<List<GradebookRowDto>>> gradebook(@PathVariable UUID examId) {
        return ResponseEntity.ok(ApiResponse.ok("Gradebook generated successfully", reportService.getGradebook(examId)));
    }
}
