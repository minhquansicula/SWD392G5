package com.backend.module.exam.core.controller;

import com.backend.module.exam.api.dto.CourseDto;
import com.backend.module.exam.api.service.CourseService;
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

@Tag(name = "Course Management", description = "Course Management API")
@RestController
@RequiredArgsConstructor
public class CourseController {

    private final CourseService courseService;

    @Operation(summary = "Get Course List", description = "Get all courses in system")
    @GetMapping("/api/courses")
    public ResponseEntity<ApiResponse<List<CourseDto>>> getCourses() {
        List<CourseDto> courses = courseService.getAllCourses();
        return ResponseEntity.ok(ApiResponse.ok("Get Courses list successfully", courses));
    }

    @Operation(summary = "Create new Course", description = "Only ADMIN can create new Course")
    @PostMapping("/api/admin/courses")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CourseDto>> createCourse(@Valid @RequestBody CourseDto dto) {
        CourseDto createdCourse = courseService.createCourse(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Create new Course successfully", createdCourse));
    }

    @Operation(summary = "Update Course", description = "Only ADMIN can update a Course")
    @PutMapping("/api/admin/courses/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CourseDto>> updateCourse(@PathVariable UUID id, @Valid @RequestBody CourseDto dto) {
        CourseDto updatedCourse = courseService.updateCourse(id, dto);
        return ResponseEntity.ok(ApiResponse.ok("Update Course successfully", updatedCourse));
    }

    @Operation(summary = "Delete Course", description = "Only ADMIN can delete a Course")
    @DeleteMapping("/api/admin/courses/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteCourse(@PathVariable UUID id) {
        courseService.deleteCourse(id);
        return ResponseEntity.ok(ApiResponse.ok("Delete Course successfully", null));
    }

    @Operation(summary = "Get Lecturers of Course", description = "Get all lecturers assigned to this course")
    @GetMapping("/api/courses/{id}/lecturers")
    public ResponseEntity<ApiResponse<List<com.backend.module.auth.api.dto.UserDto>>> getCourseLecturers(@PathVariable UUID id) {
        List<com.backend.module.auth.api.dto.UserDto> lecturers = courseService.getCourseLecturers(id);
        return ResponseEntity.ok(ApiResponse.ok("Get Course Lecturers successfully", lecturers));
    }

    @Operation(summary = "Assign Lecturers to Course", description = "Only ADMIN can assign lecturers to Course")
    @PostMapping("/api/admin/courses/{id}/lecturers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CourseDto>> assignLecturers(
            @PathVariable UUID id,
            @Valid @RequestBody com.backend.module.exam.api.dto.AssignLecturersRequest request) {
        CourseDto course = courseService.assignLecturers(id, request.getLecturerIds());
        return ResponseEntity.ok(ApiResponse.ok("Assign Lecturers successfully", course));
    }

    @Operation(summary = "Remove Lecturer from Course", description = "Only ADMIN can remove a lecturer from Course")
    @DeleteMapping("/api/admin/courses/{id}/lecturers/{lecturerId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> removeLecturer(
            @PathVariable UUID id,
            @PathVariable UUID lecturerId) {
        courseService.removeLecturerFromCourse(id, lecturerId);
        return ResponseEntity.ok(ApiResponse.ok("Remove Lecturer from Course successfully", null));
    }
}
