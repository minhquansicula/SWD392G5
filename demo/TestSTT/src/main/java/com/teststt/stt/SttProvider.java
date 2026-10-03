package com.teststt.stt;

import java.nio.file.Path;

/**
 * Interface cho dịch vụ Speech-to-Text (STT).
 *
 * Giữ provider sau interface để:
 * - Test bằng fake implementation trước khi tích hợp API thật
 * - Đổi provider (Groq → Google → Azure) mà không sửa logic nghiệp vụ
 * - Không truyền entity JPA sang provider/thread khác
 */
public interface SttProvider {

    /**
     * Chuyển đổi file audio thành văn bản với tùy chọn mặc định.
     *
     * @param audioFile đường dẫn tới file audio đã lưu trên đĩa (webm, mp3, wav, ...)
     * @param mimeType  kiểu MIME thực tế của file (ví dụ: "audio/webm", "audio/mpeg")
     * @return văn bản nhận diện được, không bao giờ null hoặc blank
     * @throws SttException nếu không thể transcribe (lỗi mạng, file lỗi, rate limit, ...)
     */
    default String transcribe(Path audioFile, String mimeType) {
        return transcribe(audioFile, mimeType, SttRequestOptions.defaults());
    }

    /**
     * Chuyển đổi file audio thành văn bản với các tùy chọn bổ sung (prompt glossary, custom model/key).
     *
     * @param audioFile đường dẫn tới file audio đã lưu trên đĩa
     * @param mimeType  kiểu MIME thực tế của file
     * @param options   tùy chọn (prompt glossary, language, model, override key)
     * @return văn bản nhận diện được, không bao giờ null hoặc blank
     * @throws SttException nếu không thể transcribe
     */
    String transcribe(Path audioFile, String mimeType, SttRequestOptions options);
}
