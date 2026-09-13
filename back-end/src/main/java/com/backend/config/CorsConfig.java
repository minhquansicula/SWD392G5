package com.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

/**
 * Cấu hình CORS (Cross-Origin Resource Sharing) cho kết nối giữa ReactJS frontend và Spring Boot backend.
 * Tự động đọc cấu hình từ file application.yml (nhóm thuộc tính aives.cors).
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${aives.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private String allowedOrigins;

    @Value("${aives.cors.allowed-methods:GET,POST,PUT,PATCH,DELETE,OPTIONS}")
    private String allowedMethods;

    @Value("${aives.cors.allowed-headers:*}")
    private String allowedHeaders;

    @Value("${aives.cors.allow-credentials:true}")
    private boolean allowCredentials;

    private List<String> parseList(String commaSeparatedValues) {
        return Arrays.stream(commaSeparatedValues.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    /**
     * Cấu hình CORS cho Spring MVC DispatcherServlet.
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> origins = parseList(allowedOrigins);
        List<String> methods = parseList(allowedMethods);
        List<String> headers = parseList(allowedHeaders);

        registry.addMapping("/**")
                .allowedOriginPatterns(origins.toArray(new String[0]))
                .allowedMethods(methods.toArray(new String[0]))
                .allowedHeaders(headers.toArray(new String[0]))
                .allowCredentials(allowCredentials)
                .exposedHeaders("Authorization", "Content-Disposition")
                .maxAge(3600);
    }

    /**
     * Cung cấp bean CorsConfigurationSource dùng chung cho Spring MVC và Spring Security.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        configuration.setAllowedOriginPatterns(parseList(allowedOrigins));
        configuration.setAllowedMethods(parseList(allowedMethods));
        
        List<String> headers = parseList(allowedHeaders);
        if (headers.contains("*")) {
            configuration.addAllowedHeader("*");
        } else {
            configuration.setAllowedHeaders(headers);
        }
        
        configuration.setAllowCredentials(allowCredentials);
        configuration.setExposedHeaders(List.of("Authorization", "Content-Disposition"));
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Bean CorsFilter giúp xử lý CORS ở tầng Filter đầu tiên,
     * đảm bảo các preflight request (OPTIONS) được phản hồi ngay cả khi có Spring Security.
     */
    @Bean
    public CorsFilter corsFilter() {
        return new CorsFilter(corsConfigurationSource());
    }
}
