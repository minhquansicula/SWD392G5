package com.backend.module.exam.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO trả về thông tin môn học.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseResponse {

    private UUID id;
    private String courseCode;
    private String courseName;
}
