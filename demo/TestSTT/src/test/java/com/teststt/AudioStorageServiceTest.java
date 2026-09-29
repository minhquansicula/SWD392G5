package com.teststt;

import com.teststt.storage.AudioStorageService;
import com.teststt.storage.StoredAudio;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.*;

class AudioStorageServiceTest {

    @TempDir
    Path tempStorageDir;

    private AudioStorageService storageService;

    @BeforeEach
    void setUp() {
        storageService = new AudioStorageService(tempStorageDir.toString());
    }

    @Test
    void store_ValidAudio_StoresFileAndCalculatesCorrectSha256() throws NoSuchAlgorithmException {
        byte[] audioBytes = "fake-audio-bytes-for-test".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile(
                "audio", "answer.webm", "audio/webm", audioBytes
        );

        StoredAudio stored = storageService.store(file);

        assertNotNull(stored);
        assertNotNull(stored.storageKey());
        assertTrue(stored.storageKey().startsWith("uploads/"));
        assertTrue(stored.storageKey().endsWith(".webm"));
        assertEquals("audio/webm", stored.mimeType());
        assertEquals(audioBytes.length, stored.sizeBytes());

        // Kiểm tra hash SHA-256
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        String expectedHash = HexFormat.of().formatHex(md.digest(audioBytes));
        assertEquals(expectedHash, stored.sha256());

        // Kiểm tra file thực tế tồn tại trên đĩa
        assertTrue(Files.exists(stored.filePath()));
    }

    @Test
    void store_EmptyAudio_ThrowsException() {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "audio", "empty.webm", "audio/webm", new byte[0]
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> storageService.store(emptyFile)
        );
        assertTrue(ex.getMessage().contains("EMPTY_AUDIO"));
    }

    @Test
    void store_UnsupportedFormat_ThrowsException() {
        byte[] textBytes = "hello world".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile txtFile = new MockMultipartFile(
                "audio", "test.txt", "text/plain", textBytes
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> storageService.store(txtFile)
        );
        assertTrue(ex.getMessage().contains("UNSUPPORTED_AUDIO_FORMAT"));
    }

    @Test
    void load_ValidFile_ReturnsResource() {
        byte[] audioBytes = "test-bytes".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile(
                "audio", "rec.wav", "audio/wav", audioBytes
        );

        StoredAudio stored = storageService.store(file);
        var resource = storageService.load(stored.storageKey());

        assertNotNull(resource);
        assertTrue(resource.exists());
    }

    @Test
    void load_PathTraversalAttempt_ThrowsException() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> storageService.load("../../../secret.txt")
        );
        assertTrue(ex.getMessage().contains("không hợp lệ") || ex.getMessage().contains("không tồn tại"));
    }
}
