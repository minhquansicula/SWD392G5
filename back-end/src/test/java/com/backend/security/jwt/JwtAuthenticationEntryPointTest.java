package com.backend.security.jwt;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtAuthenticationEntryPointTest {

    private final JsonMapper mapper = JsonMapper.builder().build();
    private final JwtAuthenticationEntryPoint entryPoint =
            new JwtAuthenticationEntryPoint(mapper);

    @Test
    void writesApprovedStatusAndFiveFieldJsonContract() throws Exception {
        Map<Integer, List<String>> cases = Map.of(
                401, List.of("Unauthorized",
                        "Authentication is required to access this resource"),
                503, List.of("Service Unavailable",
                        "Authentication service is temporarily unavailable"),
                500, List.of("Internal Server Error",
                        "An internal authentication error occurred"));

        for (var testCase : cases.entrySet()) {
            MockHttpServletRequest request =
                    new MockHttpServletRequest("GET", "/api/auth/me");
            MockHttpServletResponse response = new MockHttpServletResponse();

            entryPoint.writeError(request, response, testCase.getKey());

            Map<?, ?> body = parse(response);
            assertThat(response.getStatus()).isEqualTo(testCase.getKey());
            assertThat(response.getContentType()).startsWith("application/json");
            assertThat(response.getCharacterEncoding()).isEqualTo("UTF-8");
            assertThat(body.keySet().stream().map(String.class::cast).toList())
                    .containsExactlyInAnyOrder(
                            "timestamp", "status", "error", "message", "path");
            assertThat(((Number) body.get("status")).intValue())
                    .isEqualTo(testCase.getKey());
            assertThat(body.get("error")).isEqualTo(testCase.getValue().get(0));
            assertThat(body.get("message")).isEqualTo(testCase.getValue().get(1));
            assertThat(body.get("path")).isEqualTo("/api/auth/me");

            String timestamp = String.class.cast(body.get("timestamp"));
            assertThat(timestamp).endsWith("Z");
            Instant.parse(timestamp);
        }
    }

    @Test
    void commenceUsesFixed401MessageInsteadOfExceptionDetails() throws Exception {
        MockHttpServletRequest request =
                new MockHttpServletRequest("GET", "/api/auth/me");
        MockHttpServletResponse response = new MockHttpServletResponse();

        entryPoint.commence(request, response,
                new BadCredentialsException("private exception detail"));

        Map<?, ?> body = parse(response);
        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(body.get("error")).isEqualTo("Unauthorized");
        assertThat(body.get("message"))
                .isEqualTo("Authentication is required to access this resource");
        assertThat(response.getContentAsString())
                .doesNotContain("private exception detail");
    }

    @Test
    void serializesSpecialCharactersInPathAsValidUtf8Json() throws Exception {
        String path = "/api/\"quoted\\path\nTiếng Việt";
        MockHttpServletRequest request = new MockHttpServletRequest("GET", path);
        MockHttpServletResponse response = new MockHttpServletResponse();

        entryPoint.writeError(request, response, 503);

        assertThat(parse(response).get("path")).isEqualTo(path);
        assertThat(response.getCharacterEncoding()).isEqualTo("UTF-8");
    }

    @Test
    void rejectsUnsupportedStatusBeforeWritingResponse() throws Exception {
        MockHttpServletRequest request =
                new MockHttpServletRequest("GET", "/api/auth/me");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertThatThrownBy(() -> entryPoint.writeError(request, response, 400))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(response.getContentAsString()).isEmpty();
        assertThat(response.isCommitted()).isFalse();
    }

    private Map<?, ?> parse(MockHttpServletResponse response) throws Exception {
        return mapper.readValue(response.getContentAsString(), Map.class);
    }
}
