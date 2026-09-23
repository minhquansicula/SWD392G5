package com.teststt.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

/**
 * Dịch vụ lưu trữ file audio trên local filesystem.
 *
 * Nguyên tắc theo hướng dẫn:
 * - Storage key do server sinh, không dùng tên file từ client (chống path traversal)
 * - File lưu vào thư mục riêng, không expose công khai
 * - Tính SHA-256 bằng stream trong quá trình ghi, không đọc file lại
 * - Retry upload dùng key chứa random attempt ID → không ghi đè file cũ
 */
@Slf4j
@Service
public class AudioStorageService {

    /** Các MIME type audio cho phép upload. */
    private static final List<String> ALLOWED_MIME_TYPES = List.of(
            "audio/webm", "audio/ogg", "audio/wav", "audio/mpeg",
            "audio/mp4", "audio/m4a", "audio/flac", "audio/x-m4a",
            "video/webm" // MediaRecorder trên một số browser tạo video/webm
    );

    /** Giới hạn kích thước file (10 MB). Groq Free Plan giới hạn 25MB. */
    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;

    private final Path rootPath;

    public AudioStorageService(
            @Value("${aives.audio.storage-path:./uploads/audio}") String storagePath) {
        this.rootPath = Paths.get(storagePath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.rootPath);
            log.info("Audio storage initialized at: {}", this.rootPath);
        } catch (IOException e) {
            throw new RuntimeException(
                    "Không thể tạo thư mục lưu trữ audio: " + storagePath, e);
        }
    }

    /**
     * Lưu file audio upload từ HTTP multipart request.
     *
     * Trình tự:
     * 1. Validate: file không rỗng, kích thước ≤ 10MB, MIME hợp lệ
     * 2. Ghi file + tính SHA-256 cùng lúc (1 pass, không đọc lại)
     * 3. Trả StoredAudio chứa metadata
     *
     * @param file MultipartFile từ HTTP request
     * @return StoredAudio chứa metadata (storageKey, sha256, size, path)
     * @throws IllegalArgumentException nếu file không hợp lệ
     */
    public StoredAudio store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("EMPTY_AUDIO: File audio nộp lên bị rỗng");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException(
                    "AUDIO_TOO_LARGE: File vượt giới hạn "
                            + (MAX_FILE_SIZE / 1024 / 1024) + "MB");
        }

        String mimeType = resolveMimeType(file);
        validateMimeType(mimeType);

        // Tạo storage key do server sinh
        String extension = extensionForMime(mimeType);
        String uniqueId = UUID.randomUUID().toString();
        String storageKey = "uploads/" + uniqueId + extension;
        Path targetPath = rootPath.resolve(storageKey);

        try {
            Files.createDirectories(targetPath.getParent());

            // Ghi file + tính SHA-256 cùng lúc
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream is = file.getInputStream();
                 DigestInputStream dis = new DigestInputStream(is, digest)) {
                Files.copy(dis, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }

            String sha256 = HexFormat.of().formatHex(digest.digest());
            long sizeBytes = Files.size(targetPath);

            log.info("Audio đã lưu: key={}, size={}B, sha256={}", storageKey, sizeBytes, sha256);

            return new StoredAudio(storageKey, mimeType, sizeBytes, sha256, targetPath);

        } catch (IOException | NoSuchAlgorithmException e) {
            // Cleanup file nếu đã ghi một phần
            try { Files.deleteIfExists(targetPath); } catch (IOException ignored) {}
            throw new RuntimeException("Không thể lưu file audio: " + e.getMessage(), e);
        }
    }

    /**
     * Lưu mảng byte audio (ví dụ âm thanh sinh ra từ TTS).
     */
    public StoredAudio storeBytes(byte[] audioBytes, String mimeType) {
        if (audioBytes == null || audioBytes.length == 0) {
            throw new IllegalArgumentException("EMPTY_AUDIO: Mảng byte audio bị rỗng");
        }
        if (audioBytes.length > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("AUDIO_TOO_LARGE: Dữ liệu audio vượt quá giới hạn");
        }
        validateMimeType(mimeType);

        String extension = extensionForMime(mimeType);
        String uniqueId = UUID.randomUUID().toString();
        String storageKey = "tts/" + uniqueId + extension;
        Path targetPath = rootPath.resolve(storageKey);

        try {
            Files.createDirectories(targetPath.getParent());

            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream is = new java.io.ByteArrayInputStream(audioBytes);
                 DigestInputStream dis = new DigestInputStream(is, digest)) {
                Files.copy(dis, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }

            String sha256 = HexFormat.of().formatHex(digest.digest());
            long sizeBytes = Files.size(targetPath);

            log.info("Audio TTS đã lưu: key={}, size={}B, sha256={}", storageKey, sizeBytes, sha256);
            return new StoredAudio(storageKey, mimeType, sizeBytes, sha256, targetPath);

        } catch (IOException | NoSuchAlgorithmException e) {
            try { Files.deleteIfExists(targetPath); } catch (IOException ignored) {}
            throw new RuntimeException("Không thể lưu file audio TTS: " + e.getMessage(), e);
        }
    }

    /**
     * Load file audio từ storage key.
     *
     * @param storageKey key trả từ store()
     * @return Resource để trả cho HTTP response
     */
    public Resource load(String storageKey) {
        Path filePath = rootPath.resolve(storageKey).normalize();

        // Chống path traversal
        if (!filePath.startsWith(rootPath)) {
            throw new IllegalArgumentException("Storage key không hợp lệ");
        }
        if (!Files.exists(filePath)) {
            throw new IllegalArgumentException("File audio không tồn tại: " + storageKey);
        }

        return new FileSystemResource(filePath);
    }

    /**
     * Trả Path tuyệt đối từ storage key (cho STT provider dùng).
     */
    public Path resolveAbsolutePath(String storageKey) {
        Path filePath = rootPath.resolve(storageKey).normalize();
        if (!filePath.startsWith(rootPath)) {
            throw new IllegalArgumentException("Storage key không hợp lệ");
        }
        return filePath;
    }

    // ──────────── Private helpers ────────────

    private String resolveMimeType(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType != null && !contentType.isBlank()
                && !contentType.equals("application/octet-stream")) {
            // Loại bỏ codecs suffix: "audio/webm;codecs=opus" → "audio/webm"
            return contentType.contains(";")
                    ? contentType.substring(0, contentType.indexOf(';')).strip()
                    : contentType.strip();
        }
        // Fallback theo tên file
        String filename = file.getOriginalFilename();
        if (filename != null) {
            if (filename.endsWith(".webm")) return "audio/webm";
            if (filename.endsWith(".mp3"))  return "audio/mpeg";
            if (filename.endsWith(".wav"))  return "audio/wav";
            if (filename.endsWith(".ogg"))  return "audio/ogg";
            if (filename.endsWith(".m4a"))  return "audio/m4a";
            if (filename.endsWith(".flac")) return "audio/flac";
            if (filename.endsWith(".mp4"))  return "audio/mp4";
        }
        return "audio/webm";
    }

    private void validateMimeType(String mimeType) {
        if (ALLOWED_MIME_TYPES.stream().noneMatch(mimeType::equalsIgnoreCase)) {
            throw new IllegalArgumentException(
                    "UNSUPPORTED_AUDIO_FORMAT: Định dạng '" + mimeType
                            + "' không được hỗ trợ. Chấp nhận: webm, ogg, wav, mp3, mp4, m4a, flac.");
        }
    }

    private String extensionForMime(String mimeType) {
        return switch (mimeType.toLowerCase()) {
            case "audio/webm", "video/webm" -> ".webm";
            case "audio/mpeg", "audio/mpga"  -> ".mp3";
            case "audio/wav"                 -> ".wav";
            case "audio/ogg"                 -> ".ogg";
            case "audio/mp4", "video/mp4"    -> ".mp4";
            case "audio/m4a", "audio/x-m4a"  -> ".m4a";
            case "audio/flac"                -> ".flac";
            default                          -> ".bin";
        };
    }
}
