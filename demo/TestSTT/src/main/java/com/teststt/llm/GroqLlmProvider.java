package com.teststt.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teststt.config.GroqProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

/**
 * Provider kết nối Groq Chat Completions (Llama 3.3 70B Versatile).
 * Dùng luôn GROQ_API_KEY hiện có mà không cần cấu hình thêm key mới.
 */
@Slf4j
@Service("groqLlmProvider")
public class GroqLlmProvider implements LlmProvider {

    private final RestClient client;
    private final GroqProperties props;
    private final ObjectMapper objectMapper;

    public GroqLlmProvider(
            @Qualifier("groqSttRestClient") RestClient client,
            GroqProperties props,
            ObjectMapper objectMapper) {
        this.client = client;
        this.props = props;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getProviderName() {
        return "groq";
    }

    @Override
    public String generateResponse(String userMessage, String systemPrompt, String apiKeyOverride) {
        String effectiveKey = (apiKeyOverride != null && !apiKeyOverride.isBlank())
                ? apiKeyOverride.strip()
                : (props.getApiKey() != null ? props.getApiKey().strip() : "");

        if (effectiveKey.isBlank()) {
            throw new IllegalArgumentException(
                    "GROQ_API_KEY chưa được cấu hình. Vui lòng nhập key trên Web UI.");
        }

        String sysPrompt = (systemPrompt != null && !systemPrompt.isBlank())
                ? systemPrompt.strip()
                : "Bạn là một giám khảo phỏng vấn AI công nghệ thông tin. "
                + "Hãy nhận xét ngắn gọn câu trả lời của ứng viên và đặt 1 câu hỏi follow-up tiếp theo.";

        String model = (props.getLlmModel() != null && !props.getLlmModel().isBlank())
                ? props.getLlmModel().strip() : "llama-3.3-70b-versatile";

        Map<String, Object> payload = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", sysPrompt),
                        Map.of("role", "user", "content", userMessage)
                ),
                "temperature", 0.7
        );

        try {
            log.info("Gọi Groq LLM [model={}]: message length={}", model, userMessage.length());
            long startMs = System.currentTimeMillis();

            String rawJson = client.post()
                    .uri("/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + effectiveKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            long durationMs = System.currentTimeMillis() - startMs;
            log.info("Groq LLM phản hồi sau {}ms", durationMs);

            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode textNode = root.path("choices").path(0).path("message").path("content");

            if (!textNode.isMissingNode() && !textNode.asText().isBlank()) {
                return textNode.asText().strip();
            }

            return "Không nhận được phản hồi hợp lệ từ Groq LLM.";

        } catch (RestClientResponseException ex) {
            log.error("Lỗi HTTP từ Groq LLM {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new RuntimeException("Groq LLM lỗi (HTTP " + ex.getStatusCode().value() + "): "
                    + ex.getResponseBodyAsString(), ex);
        } catch (Exception ex) {
            log.error("Lỗi khi gọi Groq LLM: {}", ex.getMessage(), ex);
            throw new RuntimeException("Không thể nhận phản hồi từ Groq LLM: " + ex.getMessage(), ex);
        }
    }
}
