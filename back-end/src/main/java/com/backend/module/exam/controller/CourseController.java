package com.backend.module.exam.controller;

import com.backend.module.exam.dto.CourseResponse;
import com.backend.module.exam.dto.CreateCourseRequest;
import com.backend.module.exam.dto.UpdateCourseRequest;
import com.backend.module.exam.service.CourseService;
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

/**
 * Controller xử lý các API quản lý môn học (Course).
 * Base path: /api/courses (yêu cầu JWT authenticated).
 */
@Tag(name = "Course Management", description = "Các API quản lý môn học")
@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseService courseService;

    /**
     * Tạo môn học mới.
     *
     * POST /api/courses
     *
     * @param request thông tin môn học (courseCode, courseName)
     * @return ApiResponse chứa CourseResponse
     */
    @Operation(summary = "Tạo môn học mới",
            description = "Admin hoặc Giảng viên tạo môn học mới. Mã môn học phải duy nhất.")
    @PreAuthorize("hasAnyRole('ADMIN', 'LECTURER')")
    @PostMapping
    public ResponseEntity<ApiResponse<CourseResponse>> createCourse(
            @Valid @RequestBody CreateCourseRequest request) {

        CourseResponse response = courseService.createCourse(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Tạo môn học thành công", response));
    }

    /**
     * Lấy danh sách toàn bộ môn học.
     *
     * GET /api/courses
     *
     * @return ApiResponse chứa danh sách CourseResponse
     */
    @Operation(summary = "Lấy danh sách môn học",
            description = "Lấy toàn bộ danh sách môn học trong hệ thống. Mọi user đã đăng nhập đều truy cập được.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<CourseResponse>>> getAllCourses() {
        List<CourseResponse> courses = courseService.getAllCourses();

        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách môn học thành công", courses));
    }

    /**
     * Lấy thông tin chi tiết một môn học.
     *
     * GET /api/courses/{id}
     *
     * @param id UUID của môn học
     * @return ApiResponse chứa CourseResponse
     */
    @Operation(summary = "Lấy chi tiết môn học",
            description = "Lấy thông tin chi tiết một môn học theo ID.")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CourseResponse>> getCourseById(@PathVariable UUID id) {
        CourseResponse response = courseService.getCourseById(id);

        return ResponseEntity.ok(ApiResponse.ok("Lấy thông tin môn học thành công", response));
    }

    /**
     * Cập nhật thông tin môn học.
     *
     * PUT /api/courses/{id}
     *
     * @param id      UUID của môn học cần cập nhật
     * @param request thông tin cập nhật (courseCode, courseName — optional)
     * @return ApiResponse chứa CourseResponse sau khi cập nhật
     */
    @Operation(summary = "Cập nhật môn học",
            description = "Admin hoặc Giảng viên cập nhật thông tin môn học. Chỉ cần gửi field cần thay đổi.")
    @PreAuthorize("hasAnyRole('ADMIN', 'LECTURER')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CourseResponse>> updateCourse(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCourseRequest request) {

        CourseResponse response = courseService.updateCourse(id, request);

        return ResponseEntity.ok(ApiResponse.ok("Cập nhật môn học thành công", response));
    }

    /**
     * Xoá môn học.
     *
     * DELETE /api/courses/{id}
     *
     * @param id UUID của môn học cần xoá
     * @return ApiResponse xác nhận xoá thành công
     */
    @Operation(summary = "Xoá môn học",
            description = "Chỉ Admin được xoá môn học. Lưu ý: xoá môn học sẽ cascade xoá toàn bộ Questions và Exams liên quan.")
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCourse(@PathVariable UUID id) {
        courseService.deleteCourse(id);

        return ResponseEntity.ok(ApiResponse.ok("Xoá môn học thành công", null));
    }
}
