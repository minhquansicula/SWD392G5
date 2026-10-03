package com.teststt;

import com.teststt.config.GeminiProperties;
import com.teststt.config.GroqProperties;
import com.teststt.llm.GeminiLlmProvider;
import com.teststt.llm.GroqLlmProvider;
import com.teststt.llm.LlmResult;
import com.teststt.llm.LlmService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LlmServiceTest {

    @Mock
    private GeminiLlmProvider geminiProvider;

    @Mock
    private GroqLlmProvider groqProvider;

    private GeminiProperties geminiProps;
    private GroqProperties groqProps;
    private LlmService llmService;

    @BeforeEach
    void setUp() {
        geminiProps = new GeminiProperties();
        geminiProps.setApiKey(""); // Không có key
        geminiProps.setModel("gemini-3.5-flash-lite");

        groqProps = new GroqProperties();
        groqProps.setApiKey("gsk_test");
        groqProps.setLlmModel("openai/gpt-oss-120b");

        llmService = new LlmService(geminiProvider, groqProvider, geminiProps, groqProps);
    }

    @Test
    void generateResponse_WhenGeminiKeyMissing_FallbacksToGroqLlama() {
        when(groqProvider.generateResponse(any(), any(), any()))
                .thenReturn("Phản hồi từ Groq");

        LlmResult result = llmService.generateResponse(
                "Em dùng Spring Data JPA", "gemini", null, null
        );

        assertNotNull(result);
        assertEquals("Phản hồi từ Groq", result.response());
        assertEquals("Groq Llama", result.providerName());
    }

    @Test
    void generateResponse_WhenGeminiKeyProvided_UsesGemini() {
        when(geminiProvider.generateResponse(any(), any(), any()))
                .thenReturn("Phản hồi từ Gemini");

        LlmResult result = llmService.generateResponse(
                "Em dùng Spring Data JPA", "gemini", null, "gemini_valid_key"
        );

        assertNotNull(result);
        assertEquals("Phản hồi từ Gemini", result.response());
        assertEquals("Google Gemini", result.providerName());
    }

    @Test
    void generateResponse_WhenGroqRequested_UsesGroq() {
        when(groqProvider.generateResponse(any(), any(), any()))
                .thenReturn("Phản hồi trực tiếp từ Groq");

        LlmResult result = llmService.generateResponse(
                "REST API là gì?", "groq", null, null
        );

        assertNotNull(result);
        assertEquals("Phản hồi trực tiếp từ Groq", result.response());
        assertEquals("Groq Llama", result.providerName());
    }
}
