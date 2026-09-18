package com.backend.module.exam.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class CreateExamSchedulesRequest {
    @NotEmpty
    @Size(max = 1000)
    private List<@NotNull @Valid Slot> schedules;

    @Data
    public static class Slot {
        @NotNull
        private UUID studentId;
        @NotNull
        private OffsetDateTime scheduledStartTime;
        @NotNull
        private OffsetDateTime scheduledEndTime;
    }
}
