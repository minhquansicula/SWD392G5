package com.backend.module.exam.controller;

import com.backend.module.exam.dto.CreateQuestionRequest;
import com.backend.module.exam.dto.QuestionResponse;
import com.backend.module.exam.dto.UpdateQuestionRequest;
import com.backend.module.exam.service.QuestionService;
import com.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Controller xử lý các API quản lý ngân hàng câu hỏi (Question).
 * Base path: /api/questions (yêu cầu JWT authenticated, quyền ADMIN hoặc
 * LECTURER).
 */
@Tag(name = "Question Management", description = "Các API quản lý ngân hàng câu hỏi phỏng vấn")
@RestController
@RequestMapping("/api/questions")
@RequiredArgsConstructor
public class QuestionController {

        private final QuestionService questionService;

        /**
         * Tạo câu hỏi mới cho môn học.
         *
         * POST /api/questions
         *
         * @param request thông tin câu hỏi (courseId, content, difficultyLevel)
         * @return ApiResponse chứa QuestionResponse
         */
        @Operation(summary = "Tạo câu hỏi mới", description = "Admin hoặc Giảng viên thêm câu hỏi mới vào ngân hàng đề của môn học.")
        @PreAuthorize("hasAnyRole('ADMIN', 'LECTURER')")
        @PostMapping
        public ResponseEntity<ApiResponse<QuestionResponse>> createQuestion(
                        @Valid @RequestBody CreateQuestionRequest request) {

                QuestionResponse response = questionService.createQuestion(request);

                return ResponseEntity
                                .status(HttpStatus.CREATED)
                                .body(ApiResponse.ok("Tạo câu hỏi thành công", response));
        }

        /**
         * Lấy danh sách câu hỏi với tuỳ chọn lọc theo môn học và mức độ khó.
         *
         * GET /api/questions?courseId=...&difficultyLevel=...
         *
         * @param courseId        UUID môn học cần lọc (optional)
         * @param difficultyLevel Mức độ khó cần lọc (EASY, MEDIUM, HARD) (optional)
         * @return ApiResponse chứa danh sách QuestionResponse
         */
        @Operation(summary = "Lấy danh sách câu hỏi", description = "Lấy danh sách câu hỏi trong ngân hàng đề. Hỗ trợ lọc theo môn học và mức độ khó. Chỉ dành cho Giảng viên và Admin.")
        @PreAuthorize("hasAnyRole('ADMIN', 'LECTURER')")
        @GetMapping
        public ResponseEntity<ApiResponse<List<QuestionResponse>>> getQuestions(
                        @Parameter(description = "ID môn học để lọc") @RequestParam(required = false) UUID courseId,
                        @Parameter(description = "Mức độ khó để lọc (EASY, MEDIUM, HARD)") @RequestParam(required = false) String difficultyLevel) {

                List<QuestionResponse> questions = questionService.getQuestions(courseId, difficultyLevel);

                return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách câu hỏi thành công", questions));
        }

        /**
         * Lấy thông tin chi tiết một câu hỏi theo ID.
         *
         * GET /api/questions/{id}
         *
         * @param id UUID của câu hỏi
         * @return ApiResponse chứa QuestionResponse
         */
        @Operation(summary = "Lấy chi tiết câu hỏi", description = "Lấy nội dung chi tiết của một câu hỏi theo ID.")
        @PreAuthorize("hasAnyRole('ADMIN', 'LECTURER')")
        @GetMapping("/{id}")
        public ResponseEntity<ApiResponse<QuestionResponse>> getQuestionById(
                        @Parameter(description = "ID của câu hỏi") @PathVariable UUID id) {

                QuestionResponse response = questionService.getQuestionById(id);

                return ResponseEntity.ok(ApiResponse.ok("Lấy thông tin câu hỏi thành công", response));
        }

        /**
         * Cập nhật thông tin câu hỏi.
         *
         * PUT /api/questions/{id}
         *
         * @param id      UUID của câu hỏi cần cập nhật
         * @param request thông tin cập nhật (content, difficultyLevel, courseId —
         *                optional)
         * @return ApiResponse chứa QuestionResponse sau khi cập nhật
         */
        @Operation(summary = "Cập nhật câu hỏi", description = "Admin hoặc Giảng viên cập nhật nội dung, độ khó hoặc chuyển môn học cho câu hỏi.")
        @PreAuthorize("hasAnyRole('ADMIN', 'LECTURER')")
        @PutMapping("/{id}")
        public ResponseEntity<ApiResponse<QuestionResponse>> updateQuestion(
                        @Parameter(description = "ID của câu hỏi") @PathVariable UUID id,
                        @Valid @RequestBody UpdateQuestionRequest request) {

                QuestionResponse response = questionService.updateQuestion(id, request);

                return ResponseEntity.ok(ApiResponse.ok("Cập nhật câu hỏi thành công", response));
        }

        /**
         * Xoá câu hỏi khỏi ngân hàng đề.
         *
         * DELETE /api/questions/{id}
         *
         * @param id UUID của câu hỏi cần xoá
         * @return ApiResponse xác nhận xoá thành công
         */
        @Operation(summary = "Xoá câu hỏi", description = "Admin hoặc Giảng viên xoá câu hỏi khỏi ngân hàng đề.")
        @PreAuthorize("hasAnyRole('ADMIN', 'LECTURER')")
        @DeleteMapping("/{id}")
        public ResponseEntity<ApiResponse<Void>> deleteQuestion(
                        @Parameter(description = "ID của câu hỏi") @PathVariable UUID id) {

                questionService.deleteQuestion(id);

                return ResponseEntity.ok(ApiResponse.ok("Xoá câu hỏi thành công", null));
        }
}
