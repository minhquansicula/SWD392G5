package com.teststt.llm;

/**
 * Interface cho dịch vụ Large Language Model (LLM).
 * Dùng để phân tích câu trả lời của ứng viên, đóng vai Giám khảo phỏng vấn
 * và đặt câu hỏi follow-up.
 */
public interface LlmProvider {

    /**
     * Tên định danh của provider (ví dụ: "gemini", "groq").
     */
    String getProviderName();

    /**
     * Sinh văn bản phản hồi từ LLM.
     *
     * @param userMessage    nội dung người dùng nói (kết quả từ STT)
     * @param systemPrompt   chỉ đạo vai trò cho AI (ví dụ: Giám khảo phỏng vấn IT)
     * @param apiKeyOverride API key tùy chọn nếu muốn override cấu hình
     * @return câu trả lời từ AI
     */
    String generateResponse(String userMessage, String systemPrompt, String apiKeyOverride);
}
