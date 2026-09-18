package com.backend.shared.exception;

import lombok.Getter;

@Getter
public class ScheduleConflictException extends RuntimeException {
    private final String code;

    public ScheduleConflictException(String code, String message) {
        super(message);
        this.code = code;
    }
}
