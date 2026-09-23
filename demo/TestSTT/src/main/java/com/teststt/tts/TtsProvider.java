package com.teststt.tts;

/**
 * Interface cho dịch vụ chuyển đổi văn bản thành giọng nói (Text-to-Speech).
 */
public interface TtsProvider {

    /**
     * Tên định danh provider (ví dụ: "google", "edge").
     */
    String getProviderName();

    /**
     * Chuyển đổi văn bản thành mảng byte định dạng MP3.
     *
     * @param text     nội dung văn bản cần đọc
     * @param language mã ngôn ngữ (ví dụ: "vi" cho tiếng Việt)
     * @return mảng byte âm thanh MP3
     */
    byte[] synthesize(String text, String language);
}
