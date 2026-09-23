package com.teststt;

import com.teststt.storage.AudioStorageService;
import com.teststt.storage.StoredAudio;
import com.teststt.tts.GoogleTtsProvider;
import com.teststt.tts.TtsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TtsServiceTest {

    @Mock
    private com.teststt.tts.EdgeTtsProvider edgeTtsProvider;

    @Mock
    private GoogleTtsProvider googleTtsProvider;

    @Mock
    private AudioStorageService audioStorageService;

    private TtsService ttsService;

    @BeforeEach
    void setUp() {
        ttsService = new TtsService(edgeTtsProvider, googleTtsProvider, audioStorageService);
    }

    @Test
    void synthesizeToMp3_whenTextEmpty_returnsEmptyArray() {
        byte[] result = ttsService.synthesizeToMp3("", "vi");
        assertThat(result).isEmpty();
        verifyNoInteractions(googleTtsProvider);
        verifyNoInteractions(edgeTtsProvider);
    }

    @Test
    void synthesizeToMp3_whenValidText_cachesAndReturnsBytes() {
        String text = "Xin chào ứng viên";
        byte[] fakeMp3 = new byte[]{1, 2, 3, 4};
        when(edgeTtsProvider.synthesizeWithVoice(text, "vi-VN-HoaiMyNeural")).thenReturn(fakeMp3);

        byte[] firstCall = ttsService.synthesizeToMp3(text, "vi");
        byte[] secondCall = ttsService.synthesizeToMp3(text, "vi");

        assertThat(firstCall).isEqualTo(fakeMp3);
        assertThat(secondCall).isEqualTo(fakeMp3);
        // Kiểm tra cache: edgeTtsProvider chỉ được gọi duy nhất 1 lần
        verify(edgeTtsProvider, times(1)).synthesizeWithVoice(text, "vi-VN-HoaiMyNeural");
    }

    @Test
    void synthesizeAndStore_storesAudioFileCorrectly() {
        String text = "Chào bạn, hãy giới thiệu bản thân.";
        byte[] fakeMp3 = new byte[]{10, 20, 30};
        when(edgeTtsProvider.synthesizeWithVoice(text, "vi-VN-HoaiMyNeural")).thenReturn(fakeMp3);

        StoredAudio fakeStored = new StoredAudio(
                "tts_123.mp3",
                "audio/mpeg",
                (long) fakeMp3.length,
                "fake-sha",
                Path.of("uploads/audio/tts_123.mp3")
        );
        when(audioStorageService.storeBytes(any(byte[].class), anyString())).thenReturn(fakeStored);

        StoredAudio result = ttsService.synthesizeAndStore(text, "vi");

        assertThat(result).isNotNull();
        assertThat(result.storageKey()).isEqualTo("tts_123.mp3");
        assertThat(result.mimeType()).isEqualTo("audio/mpeg");
        verify(audioStorageService).storeBytes(any(byte[].class), anyString());
    }

    @Test
    void splitIntoChunks_splitsLongSentencesProperly() {
        GoogleTtsProvider provider = new GoogleTtsProvider();
        String longText = "Đây là câu thứ nhất rất dài. Đây là câu thứ hai cũng rất dài và chứa nhiều nội dung. Câu thứ ba kết thúc tại đây.";
        List<String> chunks = provider.splitIntoChunks(longText, 50);

        assertThat(chunks).isNotEmpty();
        for (String chunk : chunks) {
            assertThat(chunk.length()).isLessThanOrEqualTo(50);
        }
    }
}
