package com.teststt.config;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Cấu hình kết nối Groq Cloud API cho Speech-to-Text (STT) và Chat Completions (LLM).
 * Bind từ prefix "aives.ai.groq" trong application.yaml.
 */
@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "aives.ai.groq")
public class GroqProperties {

    /**
     * API key lấy từ https://console.groq.com/keys.
     * Đặt biến môi trường GROQ_API_KEY, không commit vào Git.
     */
    private String apiKey = "";

    /**
     * Base URL của Groq Cloud API (tương thích OpenAI).
     */
    @NotBlank
    private String baseUrl = "https://api.groq.com/openai/v1";

    /**
     * Model STT sử dụng. whisper-large-v3 hỗ trợ tiếng Việt tốt.
     */
    @NotBlank
    private String sttModel = "whisper-large-v3";

    /**
     * Model LLM sử dụng trên Groq (ví dụ: openai/gpt-oss-120b, qwen/qwen3.8-27b).
     */
    private String llmModel = "openai/gpt-oss-120b";

    /**
     * Ngôn ngữ audio đầu vào (mặc định "vi").
     */
    @NotBlank
    private String language = "vi";
}
