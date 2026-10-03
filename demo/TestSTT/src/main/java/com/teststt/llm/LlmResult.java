package com.teststt.llm;

/**
 * Kết quả trả về sau khi gọi LLM.
 */
public record LlmResult(
        String response,
        String providerName,
        String modelUsed,
        long durationMs
) {}
