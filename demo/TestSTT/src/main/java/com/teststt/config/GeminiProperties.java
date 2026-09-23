package com.teststt.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cấu hình kết nối Google Gemini API.
 * Bind từ prefix "aives.ai.gemini" trong application.yaml.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "aives.ai.gemini")
public class GeminiProperties {

    /**
     * API key lấy từ https://aistudio.google.com/app/apikey.
     * Đặt biến môi trường GEMINI_API_KEY hoặc cấu hình trên Web UI.
     */
    private String apiKey = "";

    /**
     * Base URL của Gemini API v1beta.
     */
    private String baseUrl = "https://generativelanguage.googleapis.com/v1beta";

    /**
     * Model Gemini sử dụng (ví dụ: gemini-3.5-flash-lite, gemini-3.6-flash).
     */
    private String model = "gemini-3.5-flash-lite";
}
