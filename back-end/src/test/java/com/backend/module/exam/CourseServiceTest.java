package com.backend.module.exam;

import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.enums.Role;
import com.backend.module.auth.core.repository.UserRepository;
import com.backend.module.exam.api.dto.CourseDto;
import com.backend.module.exam.core.entity.Course;
import com.backend.module.exam.core.repository.CourseRepository;
import com.backend.module.exam.core.service.CourseServiceImpl;
import com.backend.shared.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CourseServiceImpl courseService;

    private Course sampleCourse;
    private User sampleLecturer;

    @BeforeEach
    void setUp() {
        sampleCourse = new Course();
        sampleCourse.setId(UUID.randomUUID());
        sampleCourse.setCourseCode("SWD392");
        sampleCourse.setCourseName("Software Architecture and Design");
        sampleCourse.setLecturers(new HashSet<>());

        sampleLecturer = User.builder()
                .id(UUID.randomUUID())
                .username("lecturer1")
                .fullName("Dr. Lecturer")
                .role(Role.LECTURER)
                .passwordHash("hashed")
                .build();
    }

    @Test
    void getAllCourses_Success() {
        when(courseRepository.findAllWithLecturers()).thenReturn(List.of(sampleCourse));

        List<CourseDto> result = courseService.getAllCourses();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("SWD392", result.get(0).getCourseCode());
        assertEquals("Software Architecture and Design", result.get(0).getCourseName());
    }

    @Test
    void createCourse_Success() {
        CourseDto dto = CourseDto.builder()
                .courseCode("PRN231")
                .courseName("Building Cross-Platform Apps")
                .build();

        when(courseRepository.existsByCourseCode("PRN231")).thenReturn(false);
        when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CourseDto created = courseService.createCourse(dto);

        assertNotNull(created);
        assertNotNull(created.getId());
        assertEquals("PRN231", created.getCourseCode());
        assertEquals("Building Cross-Platform Apps", created.getCourseName());
    }

    @Test
    void createCourse_DuplicateCode_ThrowsException() {
        CourseDto dto = CourseDto.builder()
                .courseCode("SWD392")
                .courseName("Duplicate Course")
                .build();

        when(courseRepository.existsByCourseCode("SWD392")).thenReturn(true);

        assertThrows(AppException.class, () -> courseService.createCourse(dto));
    }

    @Test
    void updateCourse_Success() {
        UUID id = sampleCourse.getId();
        CourseDto updateDto = CourseDto.builder()
                .courseCode("SWD393")
                .courseName("Advanced Architecture")
                .build();

        when(courseRepository.findByIdWithLecturers(id)).thenReturn(Optional.of(sampleCourse));
        when(courseRepository.existsByCourseCodeAndIdNot("SWD393", id)).thenReturn(false);
        when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CourseDto updated = courseService.updateCourse(id, updateDto);

        assertNotNull(updated);
        assertEquals("SWD393", updated.getCourseCode());
        assertEquals("Advanced Architecture", updated.getCourseName());
    }

    @Test
    void deleteCourse_Success() {
        UUID id = sampleCourse.getId();
        when(courseRepository.findById(id)).thenReturn(Optional.of(sampleCourse));

        assertDoesNotThrow(() -> courseService.deleteCourse(id));
        verify(courseRepository).delete(sampleCourse);
    }

    @Test
    void assignLecturers_Success() {
        UUID courseId = sampleCourse.getId();
        UUID lecturerId = sampleLecturer.getId();

        when(courseRepository.findByIdWithLecturers(courseId)).thenReturn(Optional.of(sampleCourse));
        when(userRepository.findById(lecturerId)).thenReturn(Optional.of(sampleLecturer));
        when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CourseDto updated = courseService.assignLecturers(courseId, List.of(lecturerId));

        assertNotNull(updated);
        assertEquals(1, updated.getLecturers().size());
        assertEquals("Dr. Lecturer", updated.getLecturers().get(0).getFullName());
    }

    @Test
    void assignLecturers_InvalidRole_ThrowsException() {
        UUID courseId = sampleCourse.getId();
        User studentUser = User.builder()
                .id(UUID.randomUUID())
                .username("student1")
                .fullName("Student User")
                .role(Role.STUDENT)
                .passwordHash("hashed")
                .build();

        when(courseRepository.findByIdWithLecturers(courseId)).thenReturn(Optional.of(sampleCourse));
        when(userRepository.findById(studentUser.getId())).thenReturn(Optional.of(studentUser));

        assertThrows(AppException.class, () ->
                courseService.assignLecturers(courseId, List.of(studentUser.getId())));
    }

    @Test
    void getCourseLecturers_Success() {
        sampleCourse.getLecturers().add(sampleLecturer);
        when(courseRepository.findByIdWithLecturers(sampleCourse.getId())).thenReturn(Optional.of(sampleCourse));

        List<UserDto> lecturers = courseService.getCourseLecturers(sampleCourse.getId());

        assertNotNull(lecturers);
        assertEquals(1, lecturers.size());
        assertEquals("lecturer1", lecturers.get(0).getUsername());
    }

    @Test
    void removeLecturerFromCourse_Success() {
        sampleCourse.getLecturers().add(sampleLecturer);
        when(courseRepository.findByIdWithLecturers(sampleCourse.getId())).thenReturn(Optional.of(sampleCourse));
        when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> invocation.getArgument(0));

        courseService.removeLecturerFromCourse(sampleCourse.getId(), sampleLecturer.getId());

        assertTrue(sampleCourse.getLecturers().isEmpty());
    }

    @Test
    void getCoursesByLecturer_Success() {
        when(courseRepository.findCoursesByLecturerId(sampleLecturer.getId())).thenReturn(List.of(sampleCourse));

        List<CourseDto> courses = courseService.getCoursesByLecturer(sampleLecturer.getId());

        assertNotNull(courses);
        assertEquals(1, courses.size());
        assertEquals("SWD392", courses.get(0).getCourseCode());
    }
}
