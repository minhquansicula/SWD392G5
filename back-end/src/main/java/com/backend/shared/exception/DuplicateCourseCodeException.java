package com.backend.shared.exception;

/**
 * Exception được ném khi mã môn học (courseCode) bị trùng trong hệ thống.
 * Trả về HTTP 409 Conflict.
 */
public class DuplicateCourseCodeException extends RuntimeException {

    public DuplicateCourseCodeException(String courseCode) {
        super(String.format("Mã môn học '%s' đã tồn tại trong hệ thống", courseCode));
    }
}
