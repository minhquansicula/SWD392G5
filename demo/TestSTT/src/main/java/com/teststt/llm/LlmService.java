package com.teststt.llm;

import com.teststt.config.GeminiProperties;
import com.teststt.config.GroqProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service điều phối LLM: chọn giữa Google Gemini và Groq Llama,
 * tự động fallback nếu chưa cấu hình Gemini API key.
 */
@Slf4j
@Service
public class LlmService {

    private final GeminiLlmProvider geminiProvider;
    private final GroqLlmProvider groqProvider;
    private final GeminiProperties geminiProps;
    private final GroqProperties groqProps;

    public LlmService(
            GeminiLlmProvider geminiProvider,
            GroqLlmProvider groqProvider,
            GeminiProperties geminiProps,
            GroqProperties groqProps) {
        this.geminiProvider = geminiProvider;
        this.groqProvider = groqProvider;
        this.geminiProps = geminiProps;
        this.groqProps = groqProps;
    }

    /**
     * Sinh phản hồi từ LLM dựa trên transcript người dùng vừa nói.
     *
     * @param userMessage       văn bản từ STT
     * @param preferredProvider "gemini" hoặc "groq"
     * @param systemPrompt      vai trò của AI (ví dụ: Giám khảo phỏng vấn IT)
     * @param apiKeyOverride    API key tùy chọn
     * @return LlmResult chứa text, provider, model, latency
     */
    public LlmResult generateResponse(
            String userMessage,
            String preferredProvider,
            String systemPrompt,
            String apiKeyOverride) {

        String target = (preferredProvider != null && !preferredProvider.isBlank())
                ? preferredProvider.strip().toLowerCase() : "gemini";

        long start = System.currentTimeMillis();

        // 1. Thử dùng Gemini nếu được yêu cầu
        if ("gemini".equals(target)) {
            String geminiKey = (apiKeyOverride != null && !apiKeyOverride.isBlank())
                    ? apiKeyOverride : geminiProps.getApiKey();

            if (geminiKey != null && !geminiKey.isBlank()) {
                String reply = geminiProvider.generateResponse(userMessage, systemPrompt, geminiKey);
                long duration = System.currentTimeMillis() - start;
                return new LlmResult(reply, "Google Gemini", geminiProps.getModel(), duration);
            }

            // Nếu không có Gemini key, tự động fallback sang Groq Llama
            log.warn("Gemini API key chưa được cấu hình, tự động chuyển hướng sang Groq Llama");
        }

        // 2. Dùng Groq Llama 3.3
        String reply = groqProvider.generateResponse(userMessage, systemPrompt, null);
        long duration = System.currentTimeMillis() - start;
        return new LlmResult(reply, "Groq Llama", groqProps.getLlmModel(), duration);
    }
}
