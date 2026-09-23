package com.teststt.controller;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

/**
 * DTO trả về kết quả test STT kèm phản hồi của LLM.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SttTestResponse {

    /** Văn bản nhận diện được từ audio (tiếng Việt). */
    private String transcribedText;

    /** Tên file gốc. */
    private String audioFileName;

    /** Kích thước file (bytes). */
    private Long audioSizeBytes;

    /** SHA-256 hex digest của file audio. */
    private String sha256;

    /** MIME type thực tế của file. */
    private String mimeType;

    /** Storage key nếu file đã được lưu vào đĩa. */
    private String storageKey;

    /** URL để phát lại audio trên trình duyệt. */
    private String audioUrl;

    /** Model Whisper đã xử lý (ví dụ: whisper-large-v3). */
    private String modelUsed;

    /** Ngôn ngữ đã xử lý (ví dụ: vi). */
    private String languageUsed;

    /** Thời gian xử lý STT (milliseconds). */
    private Long processingTimeMs;

    // ──────────── Trường phản hồi từ LLM ────────────

    /** Lời phản hồi / câu hỏi follow-up từ LLM. */
    private String llmResponse;

    /** Tên LLM Provider đã sử dụng (Google Gemini hoặc Groq Llama). */
    private String llmProvider;

    /** Model LLM cụ thể (ví dụ: gemini-1.5-flash hoặc llama-3.3-70b-versatile). */
    private String llmModelUsed;

    /** Thời gian LLM xử lý (milliseconds). */
    private Long llmProcessingTimeMs;

    // ──────────── Trường âm thanh giọng nói (TTS) ────────────

    /** URL phát âm thanh giọng nói của Giám khảo AI (MP3). */
    private String ttsAudioUrl;

    /** Thời gian tổng hợp giọng nói TTS (milliseconds). */
    private Long ttsDurationMs;
}
