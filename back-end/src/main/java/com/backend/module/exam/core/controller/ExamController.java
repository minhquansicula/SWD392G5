package com.backend.module.exam.core.controller;

import com.backend.module.exam.api.dto.*;
import com.backend.module.exam.api.service.ExamService;
import com.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "Exam Management", description = "Oral examination management")
@PreAuthorize("hasAnyRole('LECTURER', 'ADMIN')")
public class ExamController {
    private final ExamService examService;

    @Operation(summary = "Create an exam for an assigned course")
    @PostMapping("/api/lecturer/exams")
    public ResponseEntity<ApiResponse<ExamDto>> create(@Valid @RequestBody CreateExamRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Exam created successfully", examService.createExam(request)));
    }

    @Operation(summary = "List exams accessible to the current lecturer or admin")
    @GetMapping("/api/exams")
    public ResponseEntity<ApiResponse<PagedModel<ExamDto>>> list(
            @PageableDefault(size = 10, sort = "startDate", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok("Get exams successfully", new PagedModel<>(examService.getExams(pageable))));
    }

    @Operation(summary = "Get exam details, student schedules and statistics")
    @GetMapping("/api/exams/{id}")
    public ResponseEntity<ApiResponse<ExamDetailDto>> detail(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok("Get exam detail successfully", examService.getExamDetail(id)));
    }

    @Operation(summary = "Partially update an exam owned by the current lecturer")
    @PutMapping("/api/lecturer/exams/{id}")
    public ResponseEntity<ApiResponse<ExamDto>> update(@PathVariable UUID id, @Valid @RequestBody UpdateExamRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Exam updated successfully", examService.updateExam(id, request)));
    }

    @Operation(summary = "Delete an exam with no active or completed schedules")
    @DeleteMapping("/api/lecturer/exams/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        examService.deleteExam(id);
        return ResponseEntity.ok(ApiResponse.ok("Exam deleted successfully", null));
    }
}
