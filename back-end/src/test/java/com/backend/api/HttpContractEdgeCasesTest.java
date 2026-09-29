package com.backend.api;

import com.backend.support.EntitySchemaApiTestSupport;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Tests HTTP contracts that happy-path controller mocks cannot verify. */
@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "EXAM_TEST_DATABASE_URL", matches = ".+")
class HttpContractEdgeCasesTest extends EntitySchemaApiTestSupport {
    @Autowired MockMvc mvc;

    @Test
    void unsupportedMethodReturns405RatherThan500() throws Exception {
        mvc.perform(patch("/api/lecturer/exams/11111111-1111-4111-8111-111111111111")
                        .with(user("owner").roles("LECTURER")).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void unsupportedContentTypeReturns415RatherThan500() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.TEXT_PLAIN).content("not-json"))
                .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    void malformedJsonReturnsStructured400() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{broken"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
    }

    @Test
    void allowedFrontendOriginCanPreflightWithoutAuthentication() throws Exception {
        mvc.perform(options("/api/lecturer/exams").header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }

    @Test
    void unknownOriginIsRejected() throws Exception {
        mvc.perform(options("/api/lecturer/exams").header("Origin", "http://untrusted.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden());
    }

    @Test
    void openApiIsPublicAndIncludesEveryApiFamily() throws Exception {
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/auth/login']").exists())
                .andExpect(jsonPath("$.paths['/api/admin/users']").exists())
                .andExpect(jsonPath("$.paths['/api/courses']").exists())
                .andExpect(jsonPath("$.paths['/api/exams']").exists())
                .andExpect(jsonPath("$.paths['/api/student/my-schedules']").exists())
                .andExpect(jsonPath("$.paths['/api/questions']").exists());
    }
}
