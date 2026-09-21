package com.backend.module.exam.core.service;

import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.enums.Role;
import com.backend.module.auth.core.repository.UserRepository;
import com.backend.module.exam.api.dto.CourseDto;
import com.backend.module.exam.api.service.CourseService;
import com.backend.module.exam.core.entity.Course;
import com.backend.module.exam.core.repository.CourseRepository;
import com.backend.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseServiceImpl implements CourseService {
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    private CourseDto toDto(Course c) {
        List<UserDto> lecturerDtos = c.getLecturers() != null
                ? c.getLecturers().stream()
                .map(u -> UserDto.builder()
                        .id(u.getId())
                        .username(u.getUsername())
                        .fullName(u.getFullName())
                        .role(u.getRole() != null ? u.getRole().name() : "LECTURER")
                        .build())
                .collect(Collectors.toList())
                : List.of();

        return CourseDto.builder()
                .id(c.getId())
                .courseCode(c.getCourseCode())
                .courseName(c.getCourseName())
                .lecturers(lecturerDtos)
                .lecturerCount(lecturerDtos.size())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseDto> getAllCourses() {
        return courseRepository.findAllWithLecturers().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CourseDto createCourse(CourseDto dto) {
        String code = dto.getCourseCode().trim().toUpperCase();
        if (courseRepository.existsByCourseCode(code)) {
            throw new AppException("Course Code already exists", HttpStatus.BAD_REQUEST, "COURSE_CODE_EXISTS");
        }

        Course course = new Course();
        course.setId(UUID.randomUUID());
        course.setCourseCode(code);
        course.setCourseName(dto.getCourseName().trim());
        courseRepository.save(course);

        dto.setId(course.getId());
        dto.setCourseCode(code);
        dto.setLecturers(List.of());
        dto.setLecturerCount(0);
        return dto;
    }

    @Override
    @Transactional
    public CourseDto updateCourse(UUID id, CourseDto dto) {
        Course course = courseRepository.findByIdWithLecturers(id)
                .orElseThrow(() -> new AppException("Course not found", HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND"));

        String newCode = dto.getCourseCode().trim().toUpperCase();
        if (courseRepository.existsByCourseCodeAndIdNot(newCode, id)) {
            throw new AppException("Course Code already exists", HttpStatus.BAD_REQUEST, "COURSE_CODE_EXISTS");
        }

        course.setCourseCode(newCode);
        course.setCourseName(dto.getCourseName().trim());
        courseRepository.save(course);

        return toDto(course);
    }

    @Override
    @Transactional
    public void deleteCourse(UUID id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new AppException("Course not found", HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND"));

        try {
            courseRepository.delete(course);
            courseRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new AppException("Cannot delete course because it is referenced by existing exams or questions", HttpStatus.BAD_REQUEST, "COURSE_IN_USE");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserDto> getCourseLecturers(UUID courseId) {
        Course course = courseRepository.findByIdWithLecturers(courseId)
                .orElseThrow(() -> new AppException("Course not found", HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND"));

        return course.getLecturers().stream()
                .map(u -> UserDto.builder()
                        .id(u.getId())
                        .username(u.getUsername())
                        .fullName(u.getFullName())
                        .role(u.getRole() != null ? u.getRole().name() : "LECTURER")
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CourseDto assignLecturers(UUID courseId, List<UUID> lecturerIds) {
        Course course = courseRepository.findByIdWithLecturers(courseId)
                .orElseThrow(() -> new AppException("Course not found", HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND"));

        if (lecturerIds == null || lecturerIds.isEmpty()) {
            return toDto(course);
        }

        for (UUID lecturerId : lecturerIds) {
            User user = userRepository.findById(lecturerId)
                    .orElseThrow(() -> new AppException("User not found with id: " + lecturerId, HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

            if (user.getRole() != Role.LECTURER) {
                throw new AppException("User @" + user.getUsername() + " is not a Lecturer. Only lecturers can be assigned to courses.",
                        HttpStatus.BAD_REQUEST, "INVALID_ROLE");
            }

            course.getLecturers().add(user);
        }

        courseRepository.save(course);
        return toDto(course);
    }

    @Override
    @Transactional
    public void removeLecturerFromCourse(UUID courseId, UUID lecturerId) {
        Course course = courseRepository.findByIdWithLecturers(courseId)
                .orElseThrow(() -> new AppException("Course not found", HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND"));

        course.getLecturers().removeIf(u -> u.getId().equals(lecturerId));
        courseRepository.save(course);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseDto> getCoursesByLecturer(UUID lecturerId) {
        return courseRepository.findCoursesByLecturerId(lecturerId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }
}
