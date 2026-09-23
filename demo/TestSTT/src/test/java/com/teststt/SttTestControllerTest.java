package com.teststt;

import com.teststt.config.GeminiProperties;
import com.teststt.config.GroqProperties;
import com.teststt.controller.SttTestController;
import com.teststt.llm.LlmResult;
import com.teststt.llm.LlmService;
import com.teststt.storage.AudioStorageService;
import com.teststt.stt.SttProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class SttTestControllerTest {

    private MockMvc mockMvc;

    @Mock
    private SttProvider sttProvider;

    @Mock
    private AudioStorageService audioStorageService;

    @Mock
    private LlmService llmService;

    @Mock
    private com.teststt.tts.TtsService ttsService;

    private GroqProperties groqProperties;
    private GeminiProperties geminiProperties;

    @BeforeEach
    void setUp() {
        groqProperties = new GroqProperties();
        groqProperties.setApiKey("");
        groqProperties.setBaseUrl("https://api.groq.com/openai/v1");
        groqProperties.setSttModel("whisper-large-v3");
        groqProperties.setLanguage("vi");

        geminiProperties = new GeminiProperties();
        geminiProperties.setApiKey("");
        geminiProperties.setModel("gemini-1.5-flash");

        SttTestController controller = new SttTestController(
                sttProvider, audioStorageService, groqProperties, geminiProperties, llmService, ttsService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void healthCheck_ReturnsOk() throws Exception {
        mockMvc.perform(get("/api/test/stt/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("Groq Cloud Whisper"))
                .andExpect(jsonPath("$.sttModel").value("whisper-large-v3"))
                .andExpect(jsonPath("$.language").value("vi"))
                .andExpect(jsonPath("$.apiKeyConfigured").value(false));
    }

    @Test
    void updateConfig_SavesApiKeySuccessfully() throws Exception {
        String jsonPayload = """
                {
                    "apiKey": "gsk_test1234567890abcdef",
                    "sttModel": "whisper-large-v3-turbo",
                    "language": "vi"
                }
                """;

        mockMvc.perform(post("/api/test/stt/config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.sttModel").value("whisper-large-v3-turbo"))
                .andExpect(jsonPath("$.apiKeyConfigured").value(true));
    }

    @Test
    void transcribe_EmptyAudio_ReturnsBadRequest() throws Exception {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "audio", "empty.webm", "audio/webm", new byte[0]
        );

        mockMvc.perform(multipart("/api/test/stt/transcribe").file(emptyFile))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("EMPTY_AUDIO")));
    }

    @Test
    void transcribe_ValidAudio_WithLlm_ReturnsTranscribedTextAndLlmResponse() throws Exception {
        when(sttProvider.transcribe(any(), any(), any()))
                .thenReturn("Em hãy giải thích vai trò của transaction.");

        when(llmService.generateResponse(any(), any(), any(), any()))
                .thenReturn(new LlmResult("Transaction giúp dữ liệu toàn vẹn.", "Google Gemini", "gemini-1.5-flash", 250));

        MockMultipartFile validFile = new MockMultipartFile(
                "audio", "voice.webm", "audio/webm", "test audio content".getBytes()
        );

        mockMvc.perform(multipart("/api/test/stt/transcribe")
                        .file(validFile)
                        .param("prompt", "Transaction, ACID")
                        .param("enableLlm", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.transcribedText").value("Em hãy giải thích vai trò của transaction."))
                .andExpect(jsonPath("$.data.llmResponse").value("Transaction giúp dữ liệu toàn vẹn."))
                .andExpect(jsonPath("$.data.llmProvider").value("Google Gemini"));
    }

    @Test
    void chatWithLlm_ValidMessage_ReturnsLlmResponse() throws Exception {
        when(llmService.generateResponse(any(), any(), any(), any()))
                .thenReturn(new LlmResult("Chào bạn, tôi là giám khảo AI.", "Groq Llama", "llama-3.3-70b-versatile", 180));

        String jsonPayload = """
                {
                    "message": "Xin chào giám khảo",
                    "provider": "groq"
                }
                """;

        mockMvc.perform(post("/api/test/stt/llm/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.response").value("Chào bạn, tôi là giám khảo AI."))
                .andExpect(jsonPath("$.provider").value("Groq Llama"));
    }
}
