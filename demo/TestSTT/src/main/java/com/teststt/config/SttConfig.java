package com.teststt.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;

/**
 * Cấu hình trung tâm cho STT và LLM test:
 * - Đăng ký ConfigurationProperties cho Groq và Gemini
 * - Tạo RestClient cho Groq và RestClient cho Gemini
 * - Tạo Clock bean và ObjectMapper bean
 */
@Configuration
@EnableConfigurationProperties({GroqProperties.class, GeminiProperties.class})
public class SttConfig {

    @Bean
    Clock sttClock() {
        return Clock.systemUTC();
    }

    @Bean
    ObjectMapper objectMapper() {
        return new ObjectMapper();
    }

    /**
     * RestClient chuyên dùng cho Groq Cloud (STT và Llama Chat).
     */
    @Bean
    RestClient groqSttRestClient(GroqProperties groq) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();

        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(30));

        return RestClient.builder()
                .baseUrl(groq.getBaseUrl())
                .requestFactory(factory)
                .build();
    }

    /**
     * RestClient dùng cho Google Gemini API.
     */
    @Bean
    RestClient geminiRestClient(GeminiProperties gemini) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();

        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(30));

        return RestClient.builder()
                .baseUrl(gemini.getBaseUrl())
                .requestFactory(factory)
                .build();
    }
}
