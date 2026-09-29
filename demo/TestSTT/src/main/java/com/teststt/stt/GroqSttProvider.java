package com.teststt.stt;

import com.teststt.config.GroqProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.nio.file.Path;
import java.util.List;

/**
 * Groq Cloud STT provider dùng whisper-large-v3 hoặc whisper-large-v3-turbo.
 *
 * Gọi POST https://api.groq.com/openai/v1/audio/transcriptions
 * với multipart/form-data chứa file audio hoàn chỉnh.
 *
 * Endpoint /audio/transcriptions chép đúng ngôn ngữ nói (tiếng Việt).
 * KHÔNG dùng /audio/translations vì endpoint đó dịch sang tiếng Anh.
 */
@Slf4j
@Service
public class GroqSttProvider implements SttProvider {

    /** Các MIME type mà Groq Whisper chấp nhận. */
    private static final List<String> SUPPORTED_MIME_TYPES = List.of(
            "audio/flac", "audio/mpeg", "audio/mp4", "audio/mpga",
            "audio/m4a", "audio/ogg", "audio/wav", "audio/webm",
            "audio/x-m4a", "video/webm", "video/mp4"
    );

    private final RestClient client;
    private final GroqProperties props;

    /**
     * Constructor inject RestClient riêng cho Groq STT.
     */
    public GroqSttProvider(
            @Qualifier("groqSttRestClient") RestClient client,
            GroqProperties props) {
        this.client = client;
        this.props = props;
    }

    @Override
    public String transcribe(Path audioFile, String mimeType) {
        return transcribe(audioFile, mimeType, SttRequestOptions.defaults());
    }

    @Override
    public String transcribe(Path audioFile, String mimeType, SttRequestOptions options) {
        SttRequestOptions opts = (options != null) ? options : SttRequestOptions.defaults();

        // 1. Xác định API key hiệu lực (ưu tiên override theo request, fallback về config)
        String effectiveApiKey = (opts.getApiKeyOverride() != null && !opts.getApiKeyOverride().isBlank())
                ? opts.getApiKeyOverride().strip()
                : (props.getApiKey() != null ? props.getApiKey().strip() : "");

        if (effectiveApiKey.isBlank()) {
            throw new SttException(
                    "STT_NOT_CONFIGURED",
                    "GROQ_API_KEY chưa được cấu hình. "
                            + "Đặt biến môi trường GROQ_API_KEY=gsk_xxxxx, cấu hình trong Web UI, "
                            + "hoặc truyền header X-Groq-Api-Key.",
                    false);
        }

        // 2. Validate MIME type
        if (mimeType == null || mimeType.isBlank()) {
            mimeType = "audio/webm";
        }
        validateMimeType(mimeType);

        // 3. Xác định tham số model, language, temperature
        String model = (opts.getModel() != null && !opts.getModel().isBlank())
                ? opts.getModel().strip() : props.getSttModel();
        String language = (opts.getLanguage() != null && !opts.getLanguage().isBlank())
                ? opts.getLanguage().strip() : props.getLanguage();
        String temperature = (opts.getTemperature() != null)
                ? String.valueOf(opts.getTemperature()) : "0";

        log.info("STT bắt đầu: file={}, mime={}, model={}, lang={}, prompt={}",
                audioFile.getFileName(), mimeType, model, language,
                opts.getPrompt() != null ? "[" + opts.getPrompt().length() + " chars]" : "none");

        // 4. Tạo multipart file part với đúng Content-Type
        HttpHeaders fileHeaders = new HttpHeaders();
        fileHeaders.setContentType(MediaType.parseMediaType(mimeType));
        HttpEntity<FileSystemResource> filePart = new HttpEntity<>(
                new FileSystemResource(audioFile), fileHeaders);

        // 5. Đóng gói multipart/form-data payload theo API Groq
        MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
        parts.add("file", filePart);
        parts.add("model", model);
        parts.add("language", language);
        parts.add("response_format", "text");
        parts.add("temperature", temperature);

        if (opts.getPrompt() != null && !opts.getPrompt().isBlank()) {
            parts.add("prompt", opts.getPrompt().strip());
        }

        try {
            long startMs = System.currentTimeMillis();

            String transcriptText = client.post()
                    .uri("/audio/transcriptions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + effectiveApiKey)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(parts)
                    .retrieve()
                    .body(String.class);

            long durationMs = System.currentTimeMillis() - startMs;

            if (transcriptText == null || transcriptText.isBlank()) {
                log.warn("STT trả về text rỗng cho file {}", audioFile.getFileName());
                throw new SttException(
                        "STT_EMPTY_TRANSCRIPT",
                        "Không nhận diện được giọng nói trong audio. "
                                + "File có thể im lặng hoặc không có tiếng nói.",
                        false);
            }

            String result = transcriptText.strip();
            log.info("STT hoàn tất trong {}ms: {} ký tự từ file {}",
                    durationMs, result.length(), audioFile.getFileName());

            return result;

        } catch (RestClientResponseException ex) {
            return handleHttpError(ex, audioFile);
        } catch (SttException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("STT lỗi không mong muốn cho file {}: {}",
                    audioFile.getFileName(), ex.getMessage(), ex);
            throw new SttException(
                    "STT_UNEXPECTED_ERROR",
                    "Lỗi không mong muốn khi gọi Groq STT: " + ex.getMessage(),
                    true, ex);
        }
    }

    /**
     * Kiểm tra MIME type có nằm trong danh sách Groq hỗ trợ.
     * Loại bỏ phần codec nếu có (ví dụ: "audio/webm;codecs=opus" → "audio/webm").
     */
    private void validateMimeType(String mimeType) {
        String baseMime = mimeType.contains(";")
                ? mimeType.substring(0, mimeType.indexOf(';')).strip()
                : mimeType.strip();

        if (SUPPORTED_MIME_TYPES.stream().noneMatch(baseMime::equalsIgnoreCase)) {
            throw new SttException(
                    "STT_UNSUPPORTED_FORMAT",
                    "Định dạng audio '" + baseMime + "' không được Groq Whisper hỗ trợ. "
                            + "Các format hỗ trợ: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm.",
                    false);
        }
    }

    /**
     * Phân loại lỗi HTTP từ Groq API.
     */
    private String handleHttpError(RestClientResponseException ex, Path audioFile) {
        int status = ex.getStatusCode().value();
        String body = ex.getResponseBodyAsString();

        String truncatedBody = body.length() > 500 ? body.substring(0, 500) + "..." : body;
        log.error("Groq STT HTTP {}: file={}, body={}",
                status, audioFile.getFileName(), truncatedBody);

        if (status == 429) {
            int retryAfter = parseRetryAfter(ex);
            throw new SttException(
                    "STT_RATE_LIMITED",
                    "Groq STT đã đạt giới hạn request. Retry sau " + retryAfter + " giây.",
                    true, retryAfter, ex);
        }

        if (status == 401 || status == 403) {
            throw new SttException(
                    "STT_AUTH_ERROR",
                    "Groq API key không hợp lệ hoặc hết quyền. "
                            + "Kiểm tra lại GROQ_API_KEY.",
                    false, ex);
        }

        if (status == 413) {
            throw new SttException(
                    "STT_FILE_TOO_LARGE",
                    "File audio vượt giới hạn Groq (25MB Free Plan).",
                    false, ex);
        }

        if (status >= 500) {
            throw new SttException(
                    "STT_SERVER_ERROR",
                    "Groq server lỗi (HTTP " + status + "). Có thể retry.",
                    true, ex);
        }

        throw new SttException(
                    "STT_CLIENT_ERROR",
                    "Groq STT trả HTTP " + status + ": " + truncatedBody,
                    false, ex);
    }

    private int parseRetryAfter(RestClientResponseException ex) {
        if (ex.getResponseHeaders() == null) return 5;
        String retryHeader = ex.getResponseHeaders().getFirst("Retry-After");
        if (retryHeader == null) return 5;
        try {
            return Integer.parseInt(retryHeader.strip());
        } catch (NumberFormatException ignored) {
            return 5;
        }
    }
}
