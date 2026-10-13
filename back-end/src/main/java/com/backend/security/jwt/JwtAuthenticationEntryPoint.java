package com.backend.security.jwt;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;

/**
 * Xử lý khi người dùng chưa đăng nhập hoặc token không hợp lệ/hết hạn.
 * Trả về mã lỗi 401 Unauthorized kèm định dạng JSON chuẩn.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final JsonMapper jsonMapper;

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException, ServletException {
        log.error("Unauthorized error: {} - Path: {}", authException.getMessage(), request.getRequestURI());
        writeError(request, response, HttpServletResponse.SC_UNAUTHORIZED);
    }

    public void writeError(HttpServletRequest request,
                           HttpServletResponse response,
                           int status) throws IOException {
        String error;
        String message;
        switch (status) {
            case HttpServletResponse.SC_UNAUTHORIZED -> {
                error = "Unauthorized";
                message = "Authentication is required to access this resource";
            }
            case HttpServletResponse.SC_SERVICE_UNAVAILABLE -> {
                error = "Service Unavailable";
                message = "Authentication service is temporarily unavailable";
            }
            case HttpServletResponse.SC_INTERNAL_SERVER_ERROR -> {
                error = "Internal Server Error";
                message = "An internal authentication error occurred";
            }
            default -> throw new IllegalArgumentException(
                    "Unsupported authentication error status: " + status);
        }

        String json = jsonMapper.writeValueAsString(Map.of(
                "timestamp", Instant.now().toString(),
                "status", status,
                "error", error,
                "message", message,
                "path", request.getRequestURI()));

        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.setStatus(status);
        response.getWriter().write(json);
    }
}
