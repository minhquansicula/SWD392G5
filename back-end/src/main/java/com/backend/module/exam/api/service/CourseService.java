package com.backend.module.exam.api.service;

import com.backend.module.exam.api.dto.CourseDto;
import java.util.List;

public interface CourseService {
    List<CourseDto> getAllCourses();
    CourseDto createCourse(CourseDto dto);
}
