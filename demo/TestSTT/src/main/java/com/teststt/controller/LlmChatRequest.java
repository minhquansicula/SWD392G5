package com.teststt.controller;

import lombok.Data;

/**
 * Payload để test riêng LLM chat qua văn bản gõ tay.
 */
@Data
public class LlmChatRequest {
    private String message;
    private String provider; // "gemini" hoặc "groq"
    private String systemPrompt;
    private String apiKey;
}
