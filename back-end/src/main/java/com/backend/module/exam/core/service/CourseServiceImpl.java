package com.backend.module.exam.core.service;

import com.backend.module.exam.api.dto.CourseDto;
import com.backend.module.exam.api.service.CourseService;
import com.backend.module.exam.core.entity.Course;
import com.backend.module.exam.core.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseServiceImpl implements CourseService {
    private final CourseRepository courseRepository;

    @Override
    public List<CourseDto> getAllCourses() {
        return courseRepository.findAll().stream()
                .map(c -> CourseDto.builder()
                        .id(c.getId())
                        .courseCode(c.getCourseCode())
                        .courseName(c.getCourseName())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public CourseDto createCourse(CourseDto dto) {
        if (courseRepository.existsByCourseCode(dto.getCourseCode())) {
            throw new IllegalArgumentException("Course Code already exists");
        }

        Course course = new Course();
        course.setId(UUID.randomUUID());
        course.setCourseCode(dto.getCourseCode().trim().toUpperCase());
        course.setCourseName(dto.getCourseName().trim());
        courseRepository.save(course);

        dto.setId(course.getId());
        return dto;
    }
}
