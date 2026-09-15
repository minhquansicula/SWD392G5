package com.backend.shared.exception;

/**
 * Exception được ném khi username đã tồn tại trong hệ thống.
 */
public class DuplicateUsernameException extends RuntimeException {

    public DuplicateUsernameException(String username) {
        super("Username đã tồn tại: " + username);
    }
}
