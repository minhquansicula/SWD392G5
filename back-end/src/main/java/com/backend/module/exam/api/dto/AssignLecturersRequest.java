package com.backend.module.exam.api.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignLecturersRequest {
    @NotEmpty(message = "Lecturer IDs list cannot be empty")
    private List<UUID> lecturerIds;
}
