package com.backend.module.exam.api.dto;

import com.backend.module.auth.api.dto.UserDto;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CourseDto {
    private UUID id;

    @NotBlank(message = "Course Code cannot be blank")
    private String courseCode;

    @NotBlank(message = "Course Name cannot be blank")
    private String courseName;

    private List<UserDto> lecturers;
    private Integer lecturerCount;
}
