package com.backend.module.exam.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AddStudentsRequest {
    @NotEmpty(message = "Student schedule list cannot be empty")
    private List<@NotNull @Valid StudentScheduleEntry> students;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class StudentScheduleEntry {
        @NotNull(message = "Student ID is required")
        private UUID studentId;
        @NotNull(message = "Scheduled start time is required")
        private OffsetDateTime scheduledStartTime;
        @NotNull(message = "Scheduled end time is required")
        private OffsetDateTime scheduledEndTime;
    }
}
