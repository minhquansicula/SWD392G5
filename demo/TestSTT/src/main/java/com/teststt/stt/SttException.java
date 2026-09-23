package com.teststt.stt;

import lombok.Getter;

/**
 * Exception chuyên biệt cho lỗi STT.
 *
 * Phân loại lỗi để worker quyết định retry hay dừng:
 * - retryable=true:  lỗi mạng, 5xx, 429 (rate limit) → retry trong giới hạn
 * - retryable=false: 401/403, file lỗi, format không hỗ trợ → không retry
 *
 * retryAfterSeconds > 0 khi provider trả Retry-After header (HTTP 429).
 */
@Getter
public class SttException extends RuntimeException {

    private final String errorCode;
    private final boolean retryable;
    private final int retryAfterSeconds;

    public SttException(String errorCode, String message, boolean retryable) {
        this(errorCode, message, retryable, 0, null);
    }

    public SttException(String errorCode, String message, boolean retryable, Throwable cause) {
        this(errorCode, message, retryable, 0, cause);
    }

    public SttException(String errorCode, String message, boolean retryable,
                        int retryAfterSeconds, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.retryable = retryable;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
