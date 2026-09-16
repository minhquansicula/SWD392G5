package com.backend.module.exam.core.controller;

import com.backend.module.exam.api.dto.CourseDto;
import com.backend.module.exam.api.service.CourseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class CourseController {
    private final CourseService courseService;

    @GetMapping("/api/courses")
    public ResponseEntity<List<CourseDto>> getCourses() {
        return ResponseEntity.ok(courseService.getAllCourses());
    }

    @PostMapping("/api/admin/courses")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CourseDto> createCourse(@Valid @RequestBody CourseDto dto) {
        return ResponseEntity.ok(courseService.createCourse(dto));
    }
}
