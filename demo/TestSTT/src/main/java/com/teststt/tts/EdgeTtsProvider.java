package com.teststt.tts;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;

/**
 * Provider hiện thực Microsoft Edge TTS thông qua giao thức WebSocket chính thức của Edge Read Aloud.
 * Hoàn toàn miễn phí, không cần API Key, sử dụng giọng đọc Neural đỉnh cao vi-VN-HoaiMyNeural và vi-VN-NamMinhNeural.
 */
@Slf4j
@Component("edgeTtsProvider")
public class EdgeTtsProvider implements TtsProvider {

    private static final String TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
    private static final String WSS_BASE_URL = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
    private static final String DEFAULT_VOICE = "vi-VN-HoaiMyNeural"; // Hoặc "vi-VN-NamMinhNeural"
    private static final long WIN_EPOCH = 11644473600L;

    private final HttpClient httpClient;

    public EdgeTtsProvider() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public EdgeTtsProvider(HttpClient httpClient) {
        this.httpClient = httpClient;
    }

    @Override
    public String getProviderName() {
        return "edge";
    }

    @Override
    public byte[] synthesize(String text, String language) {
        return synthesizeWithVoice(text, DEFAULT_VOICE);
    }

    /**
     * Sinh token Sec-MS-GEC chống abuse của Microsoft Edge Read Aloud.
     */
    private static String generateSecMsGec() {
        try {
            long ticks = java.time.Instant.now().getEpochSecond() + WIN_EPOCH;
            ticks -= (ticks % 300);
            ticks *= 10_000_000L;
            String toHash = ticks + TRUSTED_CLIENT_TOKEN;

            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(toHash.getBytes(StandardCharsets.US_ASCII));
            return java.util.HexFormat.of().withUpperCase().formatHex(digest);
        } catch (Exception e) {
            log.warn("Không thể tính toán Sec-MS-GEC: {}", e.getMessage());
            return "";
        }
    }

    /**
     * Tổng hợp văn bản thành MP3 bằng Microsoft Edge Neural Voice cụ thể.
     *
     * @param text      nội dung văn bản
     * @param voiceName ví dụ "vi-VN-HoaiMyNeural" hoặc "vi-VN-NamMinhNeural"
     * @return mảng byte âm thanh MP3
     */
    public byte[] synthesizeWithVoice(String text, String voiceName) {
        if (text == null || text.isBlank()) {
            return new byte[0];
        }

        String voice = (voiceName != null && !voiceName.isBlank()) ? voiceName : DEFAULT_VOICE;
        String requestId = UUID.randomUUID().toString().replace("-", "");
        String connectionId = UUID.randomUUID().toString().replace("-", "");
        String secMsGec = generateSecMsGec();
        String muid = UUID.randomUUID().toString().replace("-", "").toUpperCase();

        String urlWithConnection = WSS_BASE_URL + "?TrustedClientToken=" + TRUSTED_CLIENT_TOKEN
                + "&Sec-MS-GEC=" + secMsGec
                + "&Sec-MS-GEC-Version=1-143.0.3650.75"
                + "&ConnectionId=" + connectionId;

        ByteArrayOutputStream audioBuffer = new ByteArrayOutputStream();
        CompletableFuture<byte[]> future = new CompletableFuture<>();

        WebSocket.Listener listener = new WebSocket.Listener() {
            @Override
            public void onOpen(WebSocket webSocket) {
                log.debug("Đã kết nối Edge TTS WebSocket, gửi config & SSML...");
                // 1. Gửi cấu hình định dạng audio
                String configMsg = "Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n"
                        + "{\"context\":{\"synthesis\":{\"audio\":{\"metadataoptions\":{\"sentenceBoundaryEnabled\":\"false\",\"wordBoundaryEnabled\":\"false\"},\"outputFormat\":\"audio-24khz-48kbitrate-mono-mp3\"}}}}";
                webSocket.sendText(configMsg, true);

                // 2. Gửi nội dung SSML
                String ssml = buildSsml(text, voice);
                String ssmlMsg = "X-RequestId:" + requestId + "\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n" + ssml;
                webSocket.sendText(ssmlMsg, true);

                webSocket.request(1);
            }

            @Override
            public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                String textData = data.toString();
                if (textData.contains("Path:turn.end")) {
                    log.debug("Edge TTS nhận tín hiệu kết thúc turn.end");
                    future.complete(audioBuffer.toByteArray());
                }
                webSocket.request(1);
                return null;
            }

            @Override
            public CompletionStage<?> onBinary(WebSocket webSocket, ByteBuffer data, boolean last) {
                // Định dạng Edge TTS nhị phân:
                // 2 bytes đầu: độ dài header text (big-endian short)
                // theo sau là header text (ví dụ: X-RequestId:... Path:audio\r\n)
                // phần còn lại là raw MP3 audio payload!
                if (data.remaining() > 2) {
                    int headerLen = data.getShort();
                    if (data.remaining() >= headerLen) {
                        byte[] headerBytes = new byte[headerLen];
                        data.get(headerBytes);
                        // Phần còn lại là audio
                        byte[] audioBytes = new byte[data.remaining()];
                        data.get(audioBytes);
                        audioBuffer.write(audioBytes, 0, audioBytes.length);
                    }
                }
                webSocket.request(1);
                return null;
            }

            @Override
            public void onError(WebSocket webSocket, Throwable error) {
                log.warn("Edge TTS WebSocket lỗi: {}", error.getMessage());
                if (!future.isDone()) {
                    future.completeExceptionally(error);
                }
            }

            @Override
            public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
                if (!future.isDone()) {
                    future.complete(audioBuffer.toByteArray());
                }
                return null;
            }
        };

        try {
            WebSocket webSocket = httpClient.newWebSocketBuilder()
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0")
                    .header("Pragma", "no-cache")
                    .header("Cache-Control", "no-cache")
                    .header("Origin", "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold")
                    .header("Accept-Encoding", "gzip, deflate, br, zstd")
                    .header("Accept-Language", "en-US,en;q=0.9")
                    .header("Cookie", "muid=" + muid + ";")
                    .buildAsync(URI.create(urlWithConnection), listener)
                    .get(8, TimeUnit.SECONDS);

            byte[] result = future.get(15, TimeUnit.SECONDS);
            log.info("Microsoft Edge TTS thành công: {} bytes MP3 (voice={})", result.length, voice);
            webSocket.sendClose(WebSocket.NORMAL_CLOSURE, "Done");
            return result;

        } catch (Exception e) {
            log.warn("Lỗi khi gọi Microsoft Edge TTS: {}, fallback", e.getMessage());
            return new byte[0];
        }
    }

    private String buildSsml(String text, String voice) {
        String escaped = escapeXml(text);
        return String.format(
                "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='vi-VN'>"
                        + "<voice name='%s'>"
                        + "<prosody pitch='+0Hz' rate='+0%%' volume='+0%%'>"
                        + "%s"
                        + "</prosody>"
                        + "</voice>"
                        + "</speak>",
                voice, escaped);
    }

    private String escapeXml(String text) {
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }
}
