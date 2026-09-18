package com.backend.module.exam.dto;

import lombok.Data;
import java.time.OffsetDateTime;

@Data
public class UpdateExamScheduleRequest {
    private OffsetDateTime scheduledStartTime;
    private OffsetDateTime scheduledEndTime;
}
