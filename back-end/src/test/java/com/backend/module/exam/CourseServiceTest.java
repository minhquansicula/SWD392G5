package com.backend.module.exam;

import com.backend.module.exam.api.dto.CourseDto;
import com.backend.module.exam.core.entity.Course;
import com.backend.module.exam.core.repository.CourseRepository;
import com.backend.module.exam.core.service.CourseServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @InjectMocks
    private CourseServiceImpl courseService;

    private Course sampleCourse;

    @BeforeEach
    void setUp() {
        sampleCourse = new Course();
        sampleCourse.setId(UUID.randomUUID());
        sampleCourse.setCourseCode("SWD392");
        sampleCourse.setCourseName("Software Architecture and Design");
    }

    @Test
    void getAllCourses_Success() {
        when(courseRepository.findAll()).thenReturn(List.of(sampleCourse));

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

        assertThrows(IllegalArgumentException.class, () -> courseService.createCourse(dto));
    }
}
