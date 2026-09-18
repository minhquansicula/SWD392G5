package com.backend.module.exam.dto;

import lombok.Builder;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class ExamScheduleResponse {
    private UUID id;
    private UUID examId;
    private String examTitle;
    private UUID courseId;
    private String courseCode;
    private String courseName;
    private UUID studentId;
    private String studentName;
    private OffsetDateTime scheduledStartTime;
    private OffsetDateTime scheduledEndTime;
    /** Calculated 1-based position within the exam; never persisted in exam_schedules. */
    private Integer sequenceNo;
    private String status;
}
