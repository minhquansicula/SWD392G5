package com.backend.shared.exception;

/**
 * Exception được ném khi không tìm thấy resource trong hệ thống.
 * Dùng chung cho mọi entity (User, Exam, Course,...).
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String resourceName, Object id) {
        super(String.format("Không tìm thấy %s với ID: %s", resourceName, id));
    }
}
