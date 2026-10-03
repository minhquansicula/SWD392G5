package com.backend.module.exam.core.controller;

import com.backend.module.exam.api.dto.*;
import com.backend.module.exam.api.service.QuestionService;
import com.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Question Bank Management", description = "Course question bank CRUD for lecturers and admins")
@RestController
@RequestMapping("/api/questions")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('LECTURER', 'ADMIN')")
public class QuestionController {

    private final QuestionService questionService;

    @Operation(summary = "Search or list questions", description = "Filter by courseId, difficulty, topic, or content keyword")
    @GetMapping
    public ResponseEntity<ApiResponse<List<QuestionDto>>> getQuestions(
            @RequestParam(required = false) UUID courseId,
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) String topic,
            @RequestParam(required = false) String query) {
        List<QuestionDto> list = questionService.getQuestions(courseId, difficulty, topic, query);
        return ResponseEntity.ok(ApiResponse.ok("Get questions successfully", list));
    }

    @Operation(summary = "Get question by ID")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<QuestionDto>> getQuestionById(@PathVariable UUID id) {
        QuestionDto question = questionService.getQuestionById(id);
        return ResponseEntity.ok(ApiResponse.ok("Get question successfully", question));
    }

    @Operation(summary = "Create a new question")
    @PostMapping
    public ResponseEntity<ApiResponse<QuestionDto>> createQuestion(@Valid @RequestBody CreateQuestionRequest request) {
        QuestionDto created = questionService.createQuestion(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Create question successfully", created));
    }

    @Operation(summary = "Batch create multiple questions for a course")
    @PostMapping("/batch")
    public ResponseEntity<ApiResponse<List<QuestionDto>>> createBatchQuestions(
            @Valid @RequestBody BatchCreateQuestionsRequest request) {
        List<QuestionDto> created = questionService.createBatchQuestions(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Create batch questions successfully", created));
    }

    @Operation(summary = "Update an existing question")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<QuestionDto>> updateQuestion(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateQuestionRequest request) {
        QuestionDto updated = questionService.updateQuestion(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Update question successfully", updated));
    }

    @Operation(summary = "Delete a question")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteQuestion(@PathVariable UUID id) {
        questionService.deleteQuestion(id);
        return ResponseEntity.ok(ApiResponse.ok("Delete question successfully", null));
    }
}
