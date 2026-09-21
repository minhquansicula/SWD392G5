package com.backend.module.exam.api.service;

import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.exam.api.dto.CourseDto;
import java.util.List;
import java.util.UUID;

public interface CourseService {
    List<CourseDto> getAllCourses();
    CourseDto createCourse(CourseDto dto);
    CourseDto updateCourse(UUID id, CourseDto dto);
    void deleteCourse(UUID id);

    List<UserDto> getCourseLecturers(UUID courseId);
    CourseDto assignLecturers(UUID courseId, List<UUID> lecturerIds);
    void removeLecturerFromCourse(UUID courseId, UUID lecturerId);
    List<CourseDto> getCoursesByLecturer(UUID lecturerId);
}
