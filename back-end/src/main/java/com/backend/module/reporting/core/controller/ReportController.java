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
import com.backend.module.reporting.core.service.LecturerGradingService;
import java.math.BigDecimal;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
    private final LecturerGradingService grading;

    public record GradeRequest(BigDecimal score, String feedback) {}
    public record CriteriaRequest(List<LecturerGradingService.CriterionScore> criteria) {}

    @PutMapping("/api/lecturer/schedules/{scheduleId}/criteria")
    public ResponseEntity<Void> gradeCriteria(@PathVariable UUID scheduleId, @RequestBody CriteriaRequest request) {
        grading.criteria(scheduleId, request.criteria());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/lecturer/schedules/{scheduleId}/grading-history")
    public ResponseEntity<ApiResponse<List<LecturerGradingService.HistoryEntry>>> gradingHistory(@PathVariable UUID scheduleId) {
        return ResponseEntity.ok(ApiResponse.ok(grading.history(scheduleId)));
    }

    @PutMapping("/api/lecturer/schedules/{scheduleId}/grade")
    public ResponseEntity<Void> gradeTotal(@PathVariable UUID scheduleId, @RequestBody GradeRequest request) {
        grading.total(scheduleId, request.score());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/api/lecturer/schedules/{scheduleId}/grade/calculate")
    public ResponseEntity<Void> calculateTotal(@PathVariable UUID scheduleId) {
        grading.calculateTotal(scheduleId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/api/lecturer/schedules/{scheduleId}/questions/{questionId}/grade")
    public ResponseEntity<Void> gradeQuestion(@PathVariable UUID scheduleId, @PathVariable UUID questionId, @RequestBody GradeRequest request) {
        grading.question(scheduleId, questionId, request.score(), request.feedback());
        return ResponseEntity.noContent().build();
    }

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
