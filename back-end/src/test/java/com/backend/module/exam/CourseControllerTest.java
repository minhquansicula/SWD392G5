package com.backend.module.exam;

import com.backend.module.exam.api.dto.CourseDto;
import com.backend.module.exam.api.service.CourseService;
import com.backend.module.exam.core.controller.CourseController;
import com.backend.shared.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CourseControllerTest {

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private CourseService courseService;

    @InjectMocks
    private CourseController courseController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(courseController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void getCourses_Returns200() throws Exception {
        CourseDto course = CourseDto.builder()
                .id(UUID.randomUUID())
                .courseCode("SWD392")
                .courseName("Software Architecture and Design")
                .build();

        when(courseService.getAllCourses()).thenReturn(List.of(course));

        mockMvc.perform(get("/api/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].courseCode").value("SWD392"));
    }

    @Test
    void createCourse_Returns201Created() throws Exception {
        CourseDto request = CourseDto.builder()
                .courseCode("PRN231")
                .courseName("Building Cross-Platform Apps")
                .build();

        CourseDto created = CourseDto.builder()
                .id(UUID.randomUUID())
                .courseCode("PRN231")
                .courseName("Building Cross-Platform Apps")
                .build();

        when(courseService.createCourse(any(CourseDto.class))).thenReturn(created);

        mockMvc.perform(post("/api/admin/courses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.courseCode").value("PRN231"));
    }

    @Test
    void updateCourse_Returns200Ok() throws Exception {
        UUID id = UUID.randomUUID();
        CourseDto request = CourseDto.builder()
                .courseCode("PRN232")
                .courseName("Updated Course Name")
                .build();

        CourseDto updated = CourseDto.builder()
                .id(id)
                .courseCode("PRN232")
                .courseName("Updated Course Name")
                .build();

        when(courseService.updateCourse(eq(id), any(CourseDto.class))).thenReturn(updated);

        mockMvc.perform(put("/api/admin/courses/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.courseCode").value("PRN232"));
    }

    @Test
    void deleteCourse_Returns200Ok() throws Exception {
        UUID id = UUID.randomUUID();
        doNothing().when(courseService).deleteCourse(id);

        mockMvc.perform(delete("/api/admin/courses/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void getCourseLecturers_Returns200Ok() throws Exception {
        UUID id = UUID.randomUUID();
        com.backend.module.auth.api.dto.UserDto lecturer = com.backend.module.auth.api.dto.UserDto.builder()
                .id(UUID.randomUUID())
                .username("lecturer1")
                .fullName("Dr. Lecturer")
                .role("LECTURER")
                .build();

        when(courseService.getCourseLecturers(id)).thenReturn(List.of(lecturer));

        mockMvc.perform(get("/api/courses/" + id + "/lecturers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].username").value("lecturer1"));
    }

    @Test
    void assignLecturers_Returns200Ok() throws Exception {
        UUID courseId = UUID.randomUUID();
        UUID lecturerId = UUID.randomUUID();
        com.backend.module.exam.api.dto.AssignLecturersRequest request =
                com.backend.module.exam.api.dto.AssignLecturersRequest.builder()
                        .lecturerIds(List.of(lecturerId))
                        .build();

        CourseDto updated = CourseDto.builder()
                .id(courseId)
                .courseCode("SWD392")
                .courseName("Software Architecture")
                .lecturerCount(1)
                .build();

        when(courseService.assignLecturers(eq(courseId), anyList())).thenReturn(updated);

        mockMvc.perform(post("/api/admin/courses/" + courseId + "/lecturers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.lecturerCount").value(1));
    }

    @Test
    void removeLecturer_Returns200Ok() throws Exception {
        UUID courseId = UUID.randomUUID();
        UUID lecturerId = UUID.randomUUID();

        doNothing().when(courseService).removeLecturerFromCourse(courseId, lecturerId);

        mockMvc.perform(delete("/api/admin/courses/" + courseId + "/lecturers/" + lecturerId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
