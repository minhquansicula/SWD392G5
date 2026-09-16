package com.backend.module.auth.api.exception;

import org.springframework.http.HttpStatus;

public class UserAlreadyExistsException extends AuthException {
    public UserAlreadyExistsException(String username) {
        super("Username '" + username + "' is already registered", HttpStatus.CONFLICT, "USER_ALREADY_EXISTS");
    }
}
