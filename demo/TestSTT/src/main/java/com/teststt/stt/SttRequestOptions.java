package com.teststt.stt;

import lombok.Builder;
import lombok.Getter;

/**
 * Tùy chọn mở rộng khi gửi request STT đến Groq Whisper.
 */
@Getter
@Builder
public class SttRequestOptions {

    /**
     * Gợi ý từ vựng / ngữ cảnh (glossary prompt).
     * Giúp Whisper nhận diện chính xác các thuật ngữ chuyên ngành IT
     * như: Spring Boot, REST API, Microservices, ACID, Transaction, v.v.
     */
    private String prompt;

    /**
     * Model STT (ví dụ: "whisper-large-v3" hoặc "whisper-large-v3-turbo").
     * Nếu null, dùng model mặc định trong GroqProperties.
     */
    private String model;

    /**
     * Mã ngôn ngữ (mặc định "vi").
     * Nếu null, dùng ngôn ngữ mặc định trong GroqProperties.
     */
    private String language;

    /**
     * Temperature (0.0 đến 1.0). Mặc định là 0.0 cho kết quả ổn định và chính xác nhất.
     */
    private Double temperature;

    /**
     * API Key tùy chọn nếu muốn override cấu hình hệ thống theo từng request.
     */
    private String apiKeyOverride;

    /**
     * Tạo tùy chọn mặc định không có prompt hay override.
     */
    public static SttRequestOptions defaults() {
        return SttRequestOptions.builder().build();
    }
}
