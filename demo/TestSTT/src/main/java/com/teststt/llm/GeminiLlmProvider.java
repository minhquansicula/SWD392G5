package com.teststt.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teststt.config.GeminiProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

/**
 * Provider kết nối Google Gemini API (gemini-1.5-flash / gemini-2.0-flash).
 */
@Slf4j
@Service("geminiLlmProvider")
public class GeminiLlmProvider implements LlmProvider {

    private final RestClient client;
    private final GeminiProperties props;
    private final ObjectMapper objectMapper;

    public GeminiLlmProvider(
            @Qualifier("geminiRestClient") RestClient client,
            GeminiProperties props,
            ObjectMapper objectMapper) {
        this.client = client;
        this.props = props;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getProviderName() {
        return "gemini";
    }

    @Override
    public String generateResponse(String userMessage, String systemPrompt, String apiKeyOverride) {
        String effectiveKey = (apiKeyOverride != null && !apiKeyOverride.isBlank())
                ? apiKeyOverride.strip()
                : (props.getApiKey() != null ? props.getApiKey().strip() : "");

        if (effectiveKey.isBlank()) {
            throw new IllegalArgumentException(
                    "GEMINI_API_KEY chưa được cấu hình. "
                            + "Vui lòng nhập Gemini Key trên Web UI hoặc dùng Groq Llama 3.3.");
        }

        String sysPrompt = (systemPrompt != null && !systemPrompt.isBlank())
                ? systemPrompt.strip()
                : "Bạn là một giám khảo phỏng vấn AI công nghệ thông tin. "
                + "Hãy nhận xét ngắn gọn câu trả lời của ứng viên và đặt 1 câu hỏi follow-up tiếp theo.";

        // Xây dựng payload theo Google Gemini API format
        Map<String, Object> payload = Map.of(
                "system_instruction", Map.of(
                        "parts", List.of(Map.of("text", sysPrompt))
                ),
                "contents", List.of(
                        Map.of(
                                "role", "user",
                                "parts", List.of(Map.of("text", userMessage))
                        )
                ),
                "generationConfig", Map.of(
                        "temperature", 0.7,
                        "maxOutputTokens", 800
                )
        );

        String model = (props.getModel() != null && !props.getModel().isBlank())
                ? props.getModel().strip() : "gemini-1.5-flash";

        String uri = String.format("/models/%s:generateContent?key=%s", model, effectiveKey);

        try {
            log.info("Gọi Gemini LLM [model={}]: message length={}", model, userMessage.length());
            long startMs = System.currentTimeMillis();

            String rawJson = client.post()
                    .uri(uri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            long durationMs = System.currentTimeMillis() - startMs;
            log.info("Gemini LLM phản hồi sau {}ms", durationMs);

            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");

            if (!textNode.isMissingNode() && !textNode.asText().isBlank()) {
                return textNode.asText().strip();
            }

            return "Không nhận được phản hồi hợp lệ từ Gemini.";

        } catch (RestClientResponseException ex) {
            log.error("Lỗi HTTP từ Gemini API {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new RuntimeException("Gemini API lỗi (HTTP " + ex.getStatusCode().value() + "): "
                    + extractErrorMessage(ex.getResponseBodyAsString()), ex);
        } catch (Exception ex) {
            log.error("Lỗi khi gọi Gemini LLM: {}", ex.getMessage(), ex);
            throw new RuntimeException("Không thể nhận phản hồi từ Gemini: " + ex.getMessage(), ex);
        }
    }

    private String extractErrorMessage(String body) {
        try {
            JsonNode node = objectMapper.readTree(body);
            String msg = node.path("error").path("message").asText();
            if (!msg.isBlank()) return msg;
        } catch (Exception ignored) {}
        return body.length() > 200 ? body.substring(0, 200) + "..." : body;
    }
}
