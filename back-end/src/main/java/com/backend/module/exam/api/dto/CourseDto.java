package com.backend.module.exam.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CourseDto {
    private UUID id;

    @NotBlank(message = "Course Code cannot be blank")
    private String courseCode;

    @NotBlank(message = "Course Name cannot be blank")
    private String courseName;
}
