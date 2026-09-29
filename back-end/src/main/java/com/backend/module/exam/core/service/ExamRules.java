package com.backend.module.exam.core.service;

import com.backend.module.exam.core.entity.Exam;
import com.backend.module.exam.core.entity.ExamSchedule;
import com.backend.shared.exception.AppException;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

final class ExamRules {
    private ExamRules() { }

    // PostgreSQL TIMESTAMPTZ stores microseconds; normalize before validating and returning DTOs.
    static OffsetDateTime timestamp(OffsetDateTime value) {
        return value == null ? null : value.truncatedTo(ChronoUnit.MICROS);
    }

    static void dateRange(OffsetDateTime start, OffsetDateTime end) {
        if (start == null || end == null || !end.isAfter(start)) {
            throw new AppException("End date must be after start date", BAD_REQUEST, "INVALID_DATE_RANGE");
        }
    }

    static void questionLimits(Integer main, Integer followup) {
        if (main == null || main < 1 || main > 50 || followup == null || followup < 0 || followup > 20) {
            throw new AppException("Main questions must be 1-50 and follow-up questions 0-20",
                    BAD_REQUEST, "VALIDATION_FAILED");
        }
    }

    static void title(String title) {
        if (title == null || title.isBlank() || title.length() > 255) {
            throw new AppException("Exam title must contain 1-255 characters", BAD_REQUEST, "VALIDATION_FAILED");
        }
    }

    static void interviewLimits(Integer perMain, Integer mainSeconds, Integer followupSeconds) {
        if ((perMain != null && perMain < 0) || (mainSeconds != null && mainSeconds < 1)
                || (followupSeconds != null && followupSeconds < 1)) {
            throw new AppException("Follow-ups per main must be non-negative; answer time limits must be positive",
                    BAD_REQUEST, "VALIDATION_FAILED");
        }
    }

    static void scheduleTime(OffsetDateTime start, OffsetDateTime end, Exam exam) {
        if (start == null || end == null || !end.isAfter(start)) {
            throw new AppException("Scheduled end time must be after start time", BAD_REQUEST, "INVALID_SCHEDULE_TIME");
        }
        if (start.isBefore(exam.getStartDate()) || end.isAfter(exam.getEndDate())) {
            throw new AppException("Schedule time must be within the exam date range",
                    BAD_REQUEST, "SCHEDULE_TIME_OUT_OF_RANGE");
        }
    }

    static void pending(ExamSchedule schedule) {
        if (!"PENDING".equals(schedule.getStatus())) {
            throw new AppException("Only PENDING schedules allow this operation", BAD_REQUEST, "SCHEDULE_NOT_PENDING");
        }
    }
}
