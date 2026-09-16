package com.backend.module.auth.api.exception;

import com.backend.shared.exception.AppException;
import org.springframework.http.HttpStatus;

public class AuthException extends AppException {
    public AuthException(String message) {
        super(message, HttpStatus.UNAUTHORIZED, "AUTH_ERROR");
    }

    public AuthException(String message, HttpStatus status, String errorCode) {
        super(message, status, errorCode);
    }
}
