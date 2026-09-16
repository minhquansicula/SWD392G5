package com.backend.module.auth.api.exception;

import org.springframework.http.HttpStatus;

public class UserNotFoundException extends AuthException {
    public UserNotFoundException(String identifier) {
        super("User not found with identifier: " + identifier, HttpStatus.NOT_FOUND, "USER_NOT_FOUND");
    }
}
