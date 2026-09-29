package com.teststt.controller;

import com.teststt.config.GeminiProperties;
import com.teststt.config.GroqProperties;
import com.teststt.llm.LlmResult;
import com.teststt.llm.LlmService;
import com.teststt.storage.AudioStorageService;
import com.teststt.storage.StoredAudio;
import com.teststt.stt.SttException;
import com.teststt.stt.SttProvider;
import com.teststt.stt.SttRequestOptions;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

/**
 * Controller thử nghiệm toàn diện cho STT và LLM (Google Gemini & Groq Llama).
 */
@Slf4j
@RestController
@RequestMapping("/api/test/stt")
@RequiredArgsConstructor
public class SttTestController {

    private final SttProvider sttProvider;
    private final AudioStorageService audioStorageService;
    private final GroqProperties groqProperties;
    private final GeminiProperties geminiProperties;
    private final LlmService llmService;
    private final com.teststt.tts.TtsService ttsService;

    /**
     * Health check — kiểm tra cấu hình Groq STT và Gemini LLM.
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        boolean groqConfigured = groqProperties.getApiKey() != null && !groqProperties.getApiKey().isBlank();
        boolean geminiConfigured = geminiProperties.getApiKey() != null && !geminiProperties.getApiKey().isBlank();

        Map<String, Object> resp = new java.util.LinkedHashMap<>();
        resp.put("status", groqConfigured ? "READY" : "KEY_NOT_CONFIGURED");
        resp.put("provider", "Groq Cloud Whisper");
        resp.put("baseUrl", groqProperties.getBaseUrl());
        resp.put("sttModel", groqProperties.getSttModel());
        resp.put("language", groqProperties.getLanguage());
        resp.put("apiKeyConfigured", groqConfigured);
        resp.put("apiKeyMasked", maskApiKey(groqProperties.getApiKey()));
        resp.put("geminiConfigured", geminiConfigured);
        resp.put("geminiModel", geminiProperties.getModel());
        resp.put("geminiKeyMasked", maskApiKey(geminiProperties.getApiKey()));
        resp.put("groqLlmModel", groqProperties.getLlmModel());
        resp.put("message", "Sẵn sàng nhận diện giọng nói và sinh phản hồi LLM.");

        return ResponseEntity.ok(resp);
    }

    /**
     * Cập nhật nhanh API key hoặc model lúc runtime (lưu vào bộ nhớ, không cần restart).
     */
    @PostMapping("/config")
    public ResponseEntity<Map<String, Object>> updateConfig(@RequestBody ConfigUpdateRequest request) {
        if (request.getApiKey() != null && !request.getApiKey().isBlank()) {
            groqProperties.setApiKey(request.getApiKey().strip());
        }
        if (request.getSttModel() != null && !request.getSttModel().isBlank()) {
            groqProperties.setSttModel(request.getSttModel().strip());
        }
        if (request.getLanguage() != null && !request.getLanguage().isBlank()) {
            groqProperties.setLanguage(request.getLanguage().strip());
        }

        log.info("Cập nhật cấu hình Groq thành công: model={}, lang={}, keyConfigured={}",
                groqProperties.getSttModel(), groqProperties.getLanguage(),
                !groqProperties.getApiKey().isBlank());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Cập nhật cấu hình thành công",
                "sttModel", groqProperties.getSttModel(),
                "language", groqProperties.getLanguage(),
                "apiKeyMasked", maskApiKey(groqProperties.getApiKey()),
                "apiKeyConfigured", !groqProperties.getApiKey().isBlank()
        ));
    }

    /**
     * Upload audio → STT trực tiếp → Tùy chọn gọi tiếp LLM phản hồi.
     */
    @PostMapping(value = "/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> transcribeDirect(
            @RequestPart("audio") MultipartFile audio,
            @RequestParam(value = "prompt", required = false) String prompt,
            @RequestParam(value = "model", required = false) String model,
            @RequestParam(value = "language", required = false) String language,
            @RequestParam(value = "temperature", required = false) Double temperature,
            @RequestParam(value = "enableLlm", defaultValue = "true") Boolean enableLlm,
            @RequestParam(value = "enableTts", defaultValue = "false") Boolean enableTts,
            @RequestParam(value = "llmProvider", required = false) String llmProvider,
            @RequestParam(value = "llmSystemPrompt", required = false) String llmSystemPrompt,
            @RequestParam(value = "geminiApiKey", required = false) String paramGeminiKey,
            @RequestHeader(value = "X-Groq-Api-Key", required = false) String headerGroqKey,
            @RequestHeader(value = "X-Gemini-Api-Key", required = false) String headerGeminiKey) throws IOException {

        validateAudioFile(audio);

        String originalFilename = audio.getOriginalFilename() != null
                ? audio.getOriginalFilename() : "audio.webm";
        String extension = originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                : ".webm";
        Path tempFile = Files.createTempFile("stt-direct-", extension);

        try {
            audio.transferTo(tempFile);
            String mimeType = resolveMimeType(audio);

            SttRequestOptions options = SttRequestOptions.builder()
                    .prompt(prompt)
                    .model(model)
                    .language(language)
                    .temperature(temperature)
                    .apiKeyOverride(headerGroqKey)
                    .build();

            // 1. Chạy STT
            long startMs = System.currentTimeMillis();
            String text = sttProvider.transcribe(tempFile, mimeType, options);
            long durationMs = System.currentTimeMillis() - startMs;

            String modelUsed = (model != null && !model.isBlank()) ? model : groqProperties.getSttModel();
            String langUsed = (language != null && !language.isBlank()) ? language : groqProperties.getLanguage();

            // 2. Chạy LLM (nếu được kích hoạt)
            LlmResult llmResult = processLlm(text, enableLlm, llmProvider, llmSystemPrompt, headerGeminiKey, paramGeminiKey);

            SttTestResponse.SttTestResponseBuilder responseBuilder = SttTestResponse.builder()
                    .transcribedText(text)
                    .audioFileName(originalFilename)
                    .audioSizeBytes(audio.getSize())
                    .mimeType(mimeType)
                    .modelUsed(modelUsed)
                    .languageUsed(langUsed)
                    .processingTimeMs(durationMs);

            if (llmResult != null) {
                responseBuilder.llmResponse(llmResult.response())
                        .llmProvider(llmResult.providerName())
                        .llmModelUsed(llmResult.modelUsed())
                        .llmProcessingTimeMs(llmResult.durationMs());

                // 3. Chạy TTS nếu được yêu cầu
                if (Boolean.TRUE.equals(enableTts) && !llmResult.response().isBlank() && !llmResult.response().startsWith("⚠️")) {
                    long ttsStart = System.currentTimeMillis();
                    String directTtsUrl = "/api/test/stt/tts?text=" + URLEncoder.encode(llmResult.response(), StandardCharsets.UTF_8);
                    responseBuilder.ttsAudioUrl(directTtsUrl)
                            .ttsDurationMs(System.currentTimeMillis() - ttsStart);
                }
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", responseBuilder.build(),
                    "message", "STT hoàn tất trong " + durationMs + "ms"
            ));

        } finally {
            Files.deleteIfExists(tempFile);
        }
    }

    /**
     * Upload → Lưu storage → STT từ file đã lưu → Tùy chọn gọi tiếp LLM phản hồi.
     */
    @PostMapping(value = "/upload-and-transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadAndTranscribe(
            @RequestPart("audio") MultipartFile audio,
            @RequestParam(value = "prompt", required = false) String prompt,
            @RequestParam(value = "model", required = false) String model,
            @RequestParam(value = "language", required = false) String language,
            @RequestParam(value = "temperature", required = false) Double temperature,
            @RequestParam(value = "enableLlm", defaultValue = "true") Boolean enableLlm,
            @RequestParam(value = "enableTts", defaultValue = "false") Boolean enableTts,
            @RequestParam(value = "llmProvider", required = false) String llmProvider,
            @RequestParam(value = "llmSystemPrompt", required = false) String llmSystemPrompt,
            @RequestParam(value = "geminiApiKey", required = false) String paramGeminiKey,
            @RequestHeader(value = "X-Groq-Api-Key", required = false) String headerGroqKey,
            @RequestHeader(value = "X-Gemini-Api-Key", required = false) String headerGeminiKey) {

        validateAudioFile(audio);

        // 1. Lưu file vào storage an toàn và tính SHA-256
        StoredAudio stored = audioStorageService.store(audio);

        // 2. Chuẩn bị options
        SttRequestOptions options = SttRequestOptions.builder()
                .prompt(prompt)
                .model(model)
                .language(language)
                .temperature(temperature)
                .apiKeyOverride(headerGroqKey)
                .build();

        // 3. Gọi STT từ file đã lưu
        long startMs = System.currentTimeMillis();
        String text = sttProvider.transcribe(stored.filePath(), stored.mimeType(), options);
        long durationMs = System.currentTimeMillis() - startMs;

        String modelUsed = (model != null && !model.isBlank()) ? model : groqProperties.getSttModel();
        String langUsed = (language != null && !language.isBlank()) ? language : groqProperties.getLanguage();
        String encodedKey = URLEncoder.encode(stored.storageKey(), StandardCharsets.UTF_8);
        String audioUrl = "/api/test/stt/audio?key=" + encodedKey;

        // 4. Chạy LLM phản hồi
        LlmResult llmResult = processLlm(text, enableLlm, llmProvider, llmSystemPrompt, headerGeminiKey, paramGeminiKey);

        SttTestResponse.SttTestResponseBuilder responseBuilder = SttTestResponse.builder()
                .transcribedText(text)
                .audioFileName(audio.getOriginalFilename())
                .audioSizeBytes(stored.sizeBytes())
                .sha256(stored.sha256())
                .mimeType(stored.mimeType())
                .storageKey(stored.storageKey())
                .audioUrl(audioUrl)
                .modelUsed(modelUsed)
                .languageUsed(langUsed)
                .processingTimeMs(durationMs);

        if (llmResult != null) {
            responseBuilder.llmResponse(llmResult.response())
                    .llmProvider(llmResult.providerName())
                    .llmModelUsed(llmResult.modelUsed())
                    .llmProcessingTimeMs(llmResult.durationMs());

            // 5. Chạy TTS nếu được yêu cầu
            if (Boolean.TRUE.equals(enableTts) && !llmResult.response().isBlank() && !llmResult.response().startsWith("⚠️")) {
                long ttsStart = System.currentTimeMillis();
                try {
                    StoredAudio ttsStored = ttsService.synthesizeAndStore(llmResult.response(), "vi");
                    String ttsUrl = "/api/test/stt/audio?key=" + URLEncoder.encode(ttsStored.storageKey(), StandardCharsets.UTF_8);
                    responseBuilder.ttsAudioUrl(ttsUrl)
                            .ttsDurationMs(System.currentTimeMillis() - ttsStart);
                } catch (Exception ex) {
                    log.warn("Không thể lưu trữ TTS: {}, fallback sang direct URL", ex.getMessage());
                    String directTtsUrl = "/api/test/stt/tts?text=" + URLEncoder.encode(llmResult.response(), StandardCharsets.UTF_8);
                    responseBuilder.ttsAudioUrl(directTtsUrl)
                            .ttsDurationMs(System.currentTimeMillis() - ttsStart);
                }
            }
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", responseBuilder.build(),
                "message", "Upload + STT hoàn tất trong " + durationMs + "ms"
        ));
    }

    /**
     * Stream file audio đã lưu để nghe lại trực tiếp trên trình duyệt.
     */
    @GetMapping("/audio")
    public ResponseEntity<Resource> getAudio(@RequestParam("key") String storageKey) {
        Resource audioResource = audioStorageService.load(storageKey);
        String mimeType = determineMediaType(storageKey);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, mimeType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + audioResource.getFilename() + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                .body(audioResource);
    }

    /**
     * Stream âm thanh giọng nói TTS tiếng Việt trực tiếp định dạng MP3.
     */
    @GetMapping(value = "/tts", produces = "audio/mpeg")
    public ResponseEntity<byte[]> getTtsAudio(
            @RequestParam("text") String text,
            @RequestParam(value = "lang", defaultValue = "vi") String lang,
            @RequestParam(value = "voice", defaultValue = "vi-VN-HoaiMyNeural") String voice) {
        if (text == null || text.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        byte[] audioBytes = ttsService.synthesizeToMp3(text, lang, voice);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "audio/mpeg")
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"interviewer_speech.mp3\"")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .body(audioBytes);
    }

    /**
     * Endpoint test riêng LLM Chat độc lập qua văn bản gõ tay.
     */
    @PostMapping("/llm/chat")
    public ResponseEntity<Map<String, Object>> chatWithLlm(@RequestBody LlmChatRequest request) {
        if (request.getMessage() == null || request.getMessage().isBlank()) {
            throw new IllegalArgumentException("Nội dung message không được để trống.");
        }

        LlmResult result = llmService.generateResponse(
                request.getMessage(),
                request.getProvider(),
                request.getSystemPrompt(),
                request.getApiKey()
        );

        String ttsUrl = "/api/test/stt/tts?text=" + URLEncoder.encode(result.response(), StandardCharsets.UTF_8);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "response", result.response(),
                "provider", result.providerName(),
                "model", result.modelUsed(),
                "latencyMs", result.durationMs(),
                "ttsAudioUrl", ttsUrl
        ));
    }

    // ──────────── Helper xử lý LLM an toàn ────────────

    private LlmResult processLlm(
            String transcriptText,
            Boolean enableLlm,
            String llmProvider,
            String systemPrompt,
            String headerGeminiKey,
            String paramGeminiKey) {

        if (Boolean.FALSE.equals(enableLlm) || transcriptText == null || transcriptText.isBlank()) {
            return null;
        }

        String effectiveGeminiKey = (paramGeminiKey != null && !paramGeminiKey.isBlank())
                ? paramGeminiKey : headerGeminiKey;

        try {
            return llmService.generateResponse(
                    transcriptText,
                    llmProvider,
                    systemPrompt,
                    effectiveGeminiKey
            );
        } catch (Exception ex) {
            log.error("Lỗi khi xử lý LLM sau STT: {}", ex.getMessage());
            // Trả thông báo lỗi thân thiện để không làm mất kết quả STT
            return new LlmResult(
                    "⚠️ [Lỗi LLM]: " + ex.getMessage(),
                    llmProvider != null ? llmProvider : "LLM",
                    "error",
                    0
            );
        }
    }

    // ──────────── Exception handlers ────────────

    @ExceptionHandler(SttException.class)
    public ResponseEntity<Map<String, Object>> handleSttException(SttException ex) {
        log.error("STT error: code={}, retryable={}, message={}",
                ex.getErrorCode(), ex.isRetryable(), ex.getMessage());

        HttpStatus status = switch (ex.getErrorCode()) {
            case "STT_NOT_CONFIGURED"      -> HttpStatus.BAD_REQUEST;
            case "STT_AUTH_ERROR"          -> HttpStatus.BAD_GATEWAY;
            case "STT_RATE_LIMITED"        -> HttpStatus.TOO_MANY_REQUESTS;
            case "STT_FILE_TOO_LARGE"     -> HttpStatus.PAYLOAD_TOO_LARGE;
            case "STT_UNSUPPORTED_FORMAT"  -> HttpStatus.UNSUPPORTED_MEDIA_TYPE;
            case "STT_EMPTY_TRANSCRIPT"    -> HttpStatus.UNPROCESSABLE_ENTITY;
            default                        -> HttpStatus.INTERNAL_SERVER_ERROR;
        };

        return ResponseEntity.status(status).body(Map.of(
                "success", false,
                "errorCode", ex.getErrorCode(),
                "message", ex.getMessage(),
                "retryable", ex.isRetryable(),
                "retryAfterSeconds", ex.getRetryAfterSeconds()
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Validation error: {}", ex.getMessage());

        HttpStatus status = HttpStatus.BAD_REQUEST;
        if (ex.getMessage() != null) {
            if (ex.getMessage().startsWith("AUDIO_TOO_LARGE"))
                status = HttpStatus.PAYLOAD_TOO_LARGE;
            else if (ex.getMessage().startsWith("UNSUPPORTED_AUDIO_FORMAT"))
                status = HttpStatus.UNSUPPORTED_MEDIA_TYPE;
            else if (ex.getMessage().contains("không tồn tại"))
                status = HttpStatus.NOT_FOUND;
        }

        return ResponseEntity.status(status).body(Map.of(
                "success", false,
                "message", ex.getMessage()
        ));
    }

    // ──────────── Private helpers ────────────

    private void validateAudioFile(MultipartFile audio) {
        if (audio == null || audio.isEmpty()) {
            throw new IllegalArgumentException(
                    "EMPTY_AUDIO: Không có file audio trong request. "
                            + "Dùng field name 'audio' trong form-data.");
        }
    }

    private String resolveMimeType(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType != null && !contentType.isBlank()
                && !contentType.equals("application/octet-stream")) {
            return contentType.contains(";")
                    ? contentType.substring(0, contentType.indexOf(';')).strip()
                    : contentType.strip();
        }
        return "audio/webm";
    }

    private String determineMediaType(String storageKey) {
        String lower = storageKey.toLowerCase();
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        if (lower.endsWith(".wav")) return "audio/wav";
        if (lower.endsWith(".ogg")) return "audio/ogg";
        if (lower.endsWith(".m4a")) return "audio/m4a";
        if (lower.endsWith(".flac")) return "audio/flac";
        if (lower.endsWith(".mp4")) return "audio/mp4";
        return "audio/webm";
    }

    private String maskApiKey(String key) {
        if (key == null || key.isBlank()) return "Chưa cấu hình";
        if (key.length() < 8) return "***";
        return key.substring(0, 4) + "****" + key.substring(key.length() - 4);
    }
}
