package com.backend.module.exam.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class GenerateExamSchedulesRequest {
    @NotEmpty
    @Size(max = 1000)
    private List<@NotNull UUID> studentIds;
    @NotNull
    private OffsetDateTime firstSlotStart;
    @NotNull
    @Min(1)
    private Integer durationMinutes;
    @NotNull
    @Min(0)
    private Integer breakMinutes = 0;
}
