package com.teststt.controller;

import lombok.Data;

/**
 * Request payload để cập nhật nhanh cấu hình Groq STT tại runtime.
 */
@Data
public class ConfigUpdateRequest {
    private String apiKey;
    private String sttModel;
    private String language;
}
