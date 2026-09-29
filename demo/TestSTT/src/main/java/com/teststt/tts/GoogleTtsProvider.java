package com.teststt.tts;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Provider hiện thực Text-to-Speech sử dụng Google TTS Engine.
 * Hỗ trợ tự động chia tách câu dài thành từng đoạn nhỏ dưới 150 ký tự
 * và ghép nối luồng byte MP3 liền mạch cho tiếng Việt.
 */
@Slf4j
@Component("googleTtsProvider")
public class GoogleTtsProvider implements TtsProvider {

    private static final String BASE_URL = "https://translate.google.com/translate_tts";
    private static final int MAX_CHUNK_LENGTH = 150;
    private final RestClient restClient;

    public GoogleTtsProvider() {
        this.restClient = RestClient.builder()
                .defaultHeader(HttpHeaders.USER_AGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .build();
    }

    public GoogleTtsProvider(RestClient restClient) {
        this.restClient = restClient;
    }

    @Override
    public String getProviderName() {
        return "google";
    }

    @Override
    public byte[] synthesize(String text, String language) {
        if (text == null || text.isBlank()) {
            return new byte[0];
        }

        String lang = (language != null && !language.isBlank()) ? language.strip().toLowerCase() : "vi";
        List<String> chunks = splitIntoChunks(text, MAX_CHUNK_LENGTH);
        log.info("Bắt đầu tổng hợp giọng nói TTS cho {} ký tự (chia làm {} đoạn), ngôn ngữ={}",
                text.length(), chunks.size(), lang);

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

        for (String chunk : chunks) {
            if (chunk.isBlank()) continue;
            try {
                byte[] audioPart = fetchTtsAudio(chunk, lang);
                if (audioPart != null && audioPart.length > 0) {
                    outputStream.write(audioPart);
                }
            } catch (Exception ex) {
                log.warn("Lỗi khi tải đoạn TTS '{}': {}", chunk, ex.getMessage());
            }
        }

        byte[] result = outputStream.toByteArray();
        log.info("Tổng hợp TTS hoàn tất: {} bytes MP3", result.length);
        return result;
    }

    private byte[] fetchTtsAudio(String chunk, String lang) {
        String encodedText = URLEncoder.encode(chunk, StandardCharsets.UTF_8);
        String url = String.format("%s?ie=UTF-8&tl=%s&client=tw-ob&q=%s", BASE_URL, lang, encodedText);

        return restClient.get()
                .uri(java.net.URI.create(url))
                .accept(MediaType.valueOf("audio/mpeg"))
                .retrieve()
                .body(byte[].class);
    }

    /**
     * Tách văn bản dài thành các đoạn nhỏ dưới limit, ưu tiên ngắt ở dấu câu hoặc khoảng trắng.
     */
    public List<String> splitIntoChunks(String text, int maxLength) {
        List<String> result = new ArrayList<>();
        String cleaned = text.replaceAll("\\s+", " ").strip();

        // Tách theo các dấu câu thông dụng
        String[] sentences = cleaned.split("(?<=[.!?;,\\n])\\s+");

        StringBuilder currentChunk = new StringBuilder();
        for (String sentence : sentences) {
            if (sentence.length() > maxLength) {
                if (currentChunk.length() > 0) {
                    result.add(currentChunk.toString().strip());
                    currentChunk.setLength(0);
                }
                String[] words = sentence.split(" ");
                for (String word : words) {
                    if (currentChunk.length() + word.length() + 1 > maxLength) {
                        if (currentChunk.length() > 0) {
                            result.add(currentChunk.toString().strip());
                            currentChunk.setLength(0);
                        }
                    }
                    if (currentChunk.length() > 0) currentChunk.append(" ");
                    currentChunk.append(word);
                }
            } else {
                if (currentChunk.length() + sentence.length() + 1 > maxLength) {
                    result.add(currentChunk.toString().strip());
                    currentChunk.setLength(0);
                }
                if (currentChunk.length() > 0) currentChunk.append(" ");
                currentChunk.append(sentence);
            }
        }

        if (currentChunk.length() > 0) {
            result.add(currentChunk.toString().strip());
        }

        return result;
    }
}
