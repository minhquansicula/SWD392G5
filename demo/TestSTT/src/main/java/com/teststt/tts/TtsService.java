package com.teststt.tts;

import com.teststt.storage.AudioStorageService;
import com.teststt.storage.StoredAudio;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service điều phối Text-to-Speech:
 * - Gọi TtsProvider (Google TTS) để sinh âm thanh MP3 tiếng Việt.
 * - Cache kết quả để tránh gọi lặp lại cùng một câu phỏng vấn.
 * - Tùy chọn lưu file âm thanh vào AudioStorageService để nghe lại qua URL.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TtsService {

    private final EdgeTtsProvider edgeTtsProvider;
    private final GoogleTtsProvider googleTtsProvider;
    private final AudioStorageService audioStorageService;

    // Cache đơn giản trong bộ nhớ cho các câu TTS ngắn
    private final Map<String, byte[]> memoryCache = new ConcurrentHashMap<>();

    /**
     * Tổng hợp văn bản thành mảng byte MP3.
     * Mặc định dùng Microsoft Edge Neural Voice (vi-VN-HoaiMyNeural), tự động fallback sang Google TTS nếu cần.
     */
    public byte[] synthesizeToMp3(String text, String language) {
        return synthesizeToMp3(text, language, "vi-VN-HoaiMyNeural");
    }

    public byte[] synthesizeToMp3(String text, String language, String voiceName) {
        if (text == null || text.isBlank()) {
            return new byte[0];
        }

        String cleanedText = cleanTextForSpeech(text);
        if (cleanedText.isBlank()) {
            return new byte[0];
        }

        String voice = (voiceName != null && !voiceName.isBlank()) ? voiceName : "vi-VN-HoaiMyNeural";
        String cacheKey = voice + ":" + cleanedText.strip();

        return memoryCache.computeIfAbsent(cacheKey, k -> {
            log.info("Sinh âm thanh TTS cho câu sạch: '{}' với giọng: {}", truncate(cleanedText, 60), voice);
            // 1. Thử dùng Microsoft Edge TTS Neural Voice trước
            try {
                byte[] edgeAudio = edgeTtsProvider.synthesizeWithVoice(cleanedText, voice);
                if (edgeAudio != null && edgeAudio.length > 0) {
                    return edgeAudio;
                }
            } catch (Exception e) {
                log.warn("Edge TTS gặp sự cố, tự động fallback sang Google TTS: {}", e.getMessage());
            }

            // 2. Fallback sang Google TTS
            return googleTtsProvider.synthesize(cleanedText, language);
        });
    }

    /**
     * Làm sạch văn bản Markdown, HTML, escape characters trước khi đưa vào TTS,
     * giúp AI chỉ đọc nội dung thuần túy như người nói chuyện, không đọc "sao sao", "gạch chéo n", v.v.
     */
    public static String cleanTextForSpeech(String rawText) {
        if (rawText == null || rawText.isBlank()) return "";

        String text = rawText;

        // 1. URL Decode nếu bị encode
        try {
            if (text.contains("%20") || text.contains("%C3") || text.contains("%2F")) {
                text = java.net.URLDecoder.decode(text, java.nio.charset.StandardCharsets.UTF_8);
            }
        } catch (Exception ignored) {}

        // 2. Chuẩn hóa escape \n và \" thành ký tự thực
        text = text.replace("\\n", "\n").replace("\\\"", "\"").replace("\\'", "'");

        // 3. Loại bỏ khối code ```...```
        text = text.replaceAll("(?s)```.*?```", " đoạn mã kỹ thuật ");

        // 4. Loại bỏ inline code `code`
        text = text.replaceAll("`([^`]+)`", "$1");

        // 5. Loại bỏ markdown bold/italic: **text**, *text*, __text__, _text_
        text = text.replaceAll("\\*\\*([^*]+)\\*\\*", "$1");
        text = text.replaceAll("\\*([^*]+)\\*", "$1");
        text = text.replaceAll("__([^_]+)__", "$1");
        text = text.replaceAll("_([^_]+)_", "$1");

        // 6. Loại bỏ markdown header: #, ##, ###
        text = text.replaceAll("(?m)^#{1,6}\\s*", "");

        // 7. Loại bỏ bullet points ở đầu dòng (- , * , + )
        text = text.replaceAll("(?m)^\\s*[-*+]\\s+", "");

        // 8. Loại bỏ ký hiệu trích dẫn > 
        text = text.replaceAll("(?m)^\\s*>+\\s*", "");

        // 9. Loại bỏ markdown links [text](url) -> text
        text = text.replaceAll("\\[([^\\]]+)\\]\\([^)]+\\)", "$1");

        // 10. Chuyển các dấu xuống dòng liên tiếp thành dấu chấm ngắt câu để AI nghỉ hơi tự nhiên
        text = text.replaceAll("\\n+", ". ");

        // 11. Loại bỏ các ký tự đặc biệt Markdown còn sót
        text = text.replaceAll("[*#~_`\\[\\](){}]", "");

        // 12. Chuẩn hóa khoảng trắng và dấu câu lặp
        text = text.replaceAll("\\s+", " ")
                   .replaceAll("\\s*([.,?!])", "$1")
                   .replaceAll("\\.{2,}", ".")
                   .strip();

        return text;
    }

    /**
     * Tổng hợp văn bản thành file âm thanh MP3 lưu trữ trên đĩa và trả về StoredAudio.
     */
    public StoredAudio synthesizeAndStore(String text, String language) {
        byte[] mp3Bytes = synthesizeToMp3(text, language);
        if (mp3Bytes.length == 0) {
            throw new IllegalArgumentException("Không thể sinh file âm thanh từ văn bản rỗng.");
        }

        StoredAudio stored = audioStorageService.storeBytes(mp3Bytes, "audio/mpeg");
        log.info("Đã lưu file âm thanh TTS của Giám khảo AI: key={}, size={} bytes",
                stored.storageKey(), stored.sizeBytes());
        return stored;
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }
}
