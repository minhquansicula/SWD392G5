package com.backend.module.exam.api.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.OffsetDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UpdateScheduleRequest {
    @NotNull(message = "Scheduled start time is required")
    private OffsetDateTime scheduledStartTime;
    @NotNull(message = "Scheduled end time is required")
    private OffsetDateTime scheduledEndTime;
}
