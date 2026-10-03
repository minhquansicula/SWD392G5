package com.backend.module.exam.core.controller;

import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.exam.api.dto.*;
import com.backend.module.exam.api.service.ExamScheduleService;
import com.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "Exam Schedule Management", description = "Student schedules and question assignment")
@PreAuthorize("hasAnyRole('LECTURER', 'ADMIN')")
public class ExamScheduleController {
    private final ExamScheduleService scheduleService;

    @Operation(summary = "Search students for scheduling by student code, name, username, or email")
    @GetMapping("/api/lecturer/students")
    public ResponseEntity<ApiResponse<List<UserDto>>> searchStudents(
            @RequestParam(required = false, defaultValue = "") String query) {
        return ResponseEntity.ok(ApiResponse.ok("Students searched successfully", scheduleService.searchStudents(query)));
    }

    @Operation(summary = "Add student schedules atomically")
    @PostMapping("/api/lecturer/exams/{examId}/schedules")
    public ResponseEntity<ApiResponse<List<ExamScheduleDto>>> add(@PathVariable UUID examId,
            @Valid @RequestBody AddStudentsRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Students added to exam successfully",
                scheduleService.addStudentsToExam(examId, request)));
    }

    @Operation(summary = "List schedules for an accessible exam")
    @GetMapping("/api/exams/{examId}/schedules")
    public ResponseEntity<ApiResponse<List<ExamScheduleDto>>> list(@PathVariable UUID examId) {
        return ResponseEntity.ok(ApiResponse.ok("Get schedules successfully", scheduleService.getSchedulesByExamId(examId)));
    }

    @Operation(summary = "Reschedule a pending student examination")
    @PutMapping("/api/lecturer/schedules/{scheduleId}")
    public ResponseEntity<ApiResponse<ExamScheduleDto>> update(@PathVariable UUID scheduleId,
            @Valid @RequestBody UpdateScheduleRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Schedule updated successfully", scheduleService.updateSchedule(scheduleId, request)));
    }

    @Operation(summary = "Remove a pending student examination")
    @DeleteMapping("/api/lecturer/schedules/{scheduleId}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID scheduleId) {
        scheduleService.removeStudentFromExam(scheduleId);
        return ResponseEntity.ok(ApiResponse.ok("Schedule deleted successfully", null));
    }

    @Operation(summary = "Get the authenticated student's schedules and available final scores")
    @GetMapping("/api/student/my-schedules")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<List<ExamScheduleDto>>> mine() {
        return ResponseEntity.ok(ApiResponse.ok("Get my schedules successfully", scheduleService.getMySchedules()));
    }

    @Operation(summary = "Assign and snapshot main questions once for a pending schedule")
    @PostMapping("/api/lecturer/schedules/{scheduleId}/assign-questions")
    public ResponseEntity<ApiResponse<QuestionAssignmentResultDto>> assign(@PathVariable UUID scheduleId) {
        return ResponseEntity.ok(ApiResponse.ok("Questions assigned successfully", scheduleService.assignQuestionsToSchedule(scheduleId)));
    }

    @Operation(summary = "Assign and snapshot main questions for all pending schedules of an exam in chronological order")
    @PostMapping("/api/lecturer/exams/{examId}/assign-questions")
    public ResponseEntity<ApiResponse<List<QuestionAssignmentResultDto>>> assignAll(@PathVariable UUID examId) {
        return ResponseEntity.ok(ApiResponse.ok("Questions assigned to all schedules successfully",
                scheduleService.assignAllQuestionsForExam(examId)));
    }

    @Operation(summary = "View assigned question snapshots as an authorized lecturer or admin")
    @GetMapping("/api/schedules/{scheduleId}/assigned-questions")
    public ResponseEntity<ApiResponse<List<AssignedQuestionDto>>> questions(@PathVariable UUID scheduleId) {
        return ResponseEntity.ok(ApiResponse.ok("Get assigned questions successfully", scheduleService.getAssignedQuestions(scheduleId)));
    }

    @Operation(summary = "Start an examination within its scheduled time window; auto-assign questions if needed")
    @PostMapping({"/api/student/schedules/{scheduleId}/start", "/api/lecturer/schedules/{scheduleId}/start"})
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ExamScheduleDto>> start(@PathVariable UUID scheduleId) {
        return ResponseEntity.ok(ApiResponse.ok("Examination started successfully", scheduleService.startSchedule(scheduleId)));
    }
}
