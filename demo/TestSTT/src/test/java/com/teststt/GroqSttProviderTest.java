package com.teststt;

import com.teststt.config.GroqProperties;
import com.teststt.stt.GroqSttProvider;
import com.teststt.stt.SttException;
import com.teststt.stt.SttRequestOptions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class GroqSttProviderTest {

    @TempDir
    Path tempDir;

    private GroqProperties groqProps;
    private GroqSttProvider provider;
    private Path sampleAudio;

    @BeforeEach
    void setUp() throws IOException {
        groqProps = new GroqProperties();
        groqProps.setApiKey(""); // Chưa cấu hình key
        groqProps.setBaseUrl("https://api.groq.com/openai/v1");
        groqProps.setSttModel("whisper-large-v3");
        groqProps.setLanguage("vi");

        RestClient restClient = RestClient.builder()
                .baseUrl(groqProps.getBaseUrl())
                .build();

        provider = new GroqSttProvider(restClient, groqProps);

        sampleAudio = tempDir.resolve("test.webm");
        Files.writeString(sampleAudio, "dummy-audio-content");
    }

    @Test
    void transcribe_WithoutApiKey_ThrowsNotConfiguredException() {
        SttException ex = assertThrows(
                SttException.class,
                () -> provider.transcribe(sampleAudio, "audio/webm")
        );

        assertEquals("STT_NOT_CONFIGURED", ex.getErrorCode());
        assertFalse(ex.isRetryable());
        assertTrue(ex.getMessage().contains("GROQ_API_KEY chưa được cấu hình"));
    }

    @Test
    void transcribe_WithUnsupportedMimeType_ThrowsUnsupportedFormatException() {
        // Cho dù có key hay override key, MIME không hợp lệ sẽ bị từ chối
        SttRequestOptions options = SttRequestOptions.builder()
                .apiKeyOverride("gsk_dummy_test_key_1234567890")
                .build();

        SttException ex = assertThrows(
                SttException.class,
                () -> provider.transcribe(sampleAudio, "text/plain", options)
        );

        assertEquals("STT_UNSUPPORTED_FORMAT", ex.getErrorCode());
        assertFalse(ex.isRetryable());
        assertTrue(ex.getMessage().contains("không được Groq Whisper hỗ trợ"));
    }
}
