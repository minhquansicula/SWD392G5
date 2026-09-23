package com.teststt.storage;

/**
 * Metadata bất biến của file audio đã lưu trên đĩa.
 *
 * Tạo sau khi lưu file thành công, truyền cho caller sử dụng.
 *
 * @param storageKey key duy nhất (ví dụ: "uploads/uuid/random.webm"), dùng để load lại
 * @param mimeType   MIME type thực tế của file
 * @param sizeBytes  kích thước file (bytes)
 * @param sha256     SHA-256 hex digest để phát hiện duplicate upload
 * @param filePath   đường dẫn tuyệt đối trên đĩa (chỉ dùng nội bộ, không trả cho client)
 */
public record StoredAudio(
        String storageKey,
        String mimeType,
        long sizeBytes,
        String sha256,
        java.nio.file.Path filePath
) {}
