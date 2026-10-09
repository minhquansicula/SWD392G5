package com.backend.module.auth;

import com.backend.module.auth.api.dto.LoginRequest;
import com.backend.module.auth.core.controller.AuthController;
import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.enums.Role;
import com.backend.module.auth.core.repository.UserRepository;
import com.backend.module.auth.core.service.AuthServiceImpl;
import com.backend.security.jwt.JwtTokenProvider;
import com.backend.shared.exception.GlobalExceptionHandler;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.json.JsonMapper;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class EmailLoginHttpTest {
    private static final ValidatorFactory FACTORY =
            Validation.buildDefaultValidatorFactory();

    @Mock UserRepository users;
    @Mock PasswordEncoder passwords;
    @Mock JwtTokenProvider tokens;

    private final JsonMapper json = JsonMapper.builder().build();
    private AuthServiceImpl service;
    private MockMvc mvc;

    @AfterAll
    static void closeFactory() {
        FACTORY.close();
    }

    @BeforeEach
    void setup() {
        service = new AuthServiceImpl(users, passwords, tokens, FACTORY.getValidator());
        mvc = MockMvcBuilders.standaloneSetup(new AuthController(service, org.mockito.Mockito.mock(com.backend.module.auth.api.service.PasswordSetupService.class)))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    void rawEmailIsNormalizedButPayloadPasswordAndJwtSubjectStayUnchanged()
            throws Exception {
        when(users.findTop2ByEmailNormalized("lect@example.com"))
                .thenReturn(List.of(account()));
        when(passwords.matches(" password123 ", "hash")).thenReturn(true);
        when(tokens.generateToken(eq("lecturer1"), eq("LECTURER"), anyMap()))
                .thenReturn("test-token");

        LoginRequest request = new LoginRequest(
                " \tLect@EXAMPLE.COM\r\n ", " password123 ");
        login(request).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").value("test-token"))
                .andExpect(jsonPath("$.data.user.username").value("lecturer1"));
        assertEquals(" \tLect@EXAMPLE.COM\r\n ", request.getUsername());
        assertEquals(" password123 ", request.getPassword());
        verify(tokens).generateToken("lecturer1", "LECTURER", Map.of());
        verify(users, never()).findByUsername(anyString());
    }

    @Test
    void invalidFormatDoesNotReachLookupOrPasswordCheck() throws Exception {
        for (String email : List.of(
                "lecturer1", "invalid", "a b@example.com",
                "\0lect@example.com", "a".repeat(256) + "@example.com")) {
            login(new LoginRequest(email, "password123"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
        }
        verifyNoInteractions(users, passwords, tokens);
    }

    @Test
    void missingCanonicalNeverFallsBackToAnEmailShapedInternalUsername()
            throws Exception {
        when(users.findTop2ByEmailNormalized("legacy@example.com"))
                .thenReturn(List.of());

        credentialsRejected(new LoginRequest("legacy@example.com", "password123"));
        verify(users, never()).findByUsername(anyString());
        verifyNoInteractions(passwords, tokens);
    }

    @Test
    void duplicateCanonicalIsRejectedBeforePasswordOrToken() throws Exception {
        when(users.findTop2ByEmailNormalized("lect@example.com"))
                .thenReturn(List.of(account(), account()));

        credentialsRejected(new LoginRequest("lect@example.com", "password123"));
        verify(users, never()).findByUsername(anyString());
        verifyNoInteractions(passwords, tokens);
    }

    @Test
    void wrongPasswordUsesExactlyTheSameCredentialsResponse() throws Exception {
        when(users.findTop2ByEmailNormalized("lect@example.com"))
                .thenReturn(List.of(account()));
        when(passwords.matches("wrong", "hash")).thenReturn(false);

        credentialsRejected(new LoginRequest("lect@example.com", "wrong"));
        verifyNoInteractions(tokens);
    }

    @Test
    void repositoryInfrastructureFailureIsNotInvalidCredentials() throws Exception {
        DataAccessResourceFailureException failure =
                new DataAccessResourceFailureException("lookup unavailable");
        when(users.findTop2ByEmailNormalized("lect@example.com")).thenThrow(failure);

        assertSame(failure, assertThrows(DataAccessResourceFailureException.class,
                () -> service.login(new LoginRequest("lect@example.com", "password123"))));
        login(new LoginRequest("lect@example.com", "password123"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("INTERNAL_SERVER_ERROR"));
        verifyNoInteractions(passwords, tokens);
    }

    @Test
    void passwordEncoderFailureIsNotWrongPassword() throws Exception {
        when(users.findTop2ByEmailNormalized("lect@example.com"))
                .thenReturn(List.of(account()));
        when(passwords.matches("password123", "hash"))
                .thenThrow(new IllegalStateException("encoder unavailable"));

        login(new LoginRequest("lect@example.com", "password123"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("INTERNAL_SERVER_ERROR"));
        verifyNoInteractions(tokens);
    }

    @Test
    void blankRequestStillUsesExistingDtoValidation() throws Exception {
        login(new LoginRequest("", "")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
        verifyNoInteractions(users, passwords, tokens);
    }

    private void credentialsRejected(LoginRequest request) throws Exception {
        login(request).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").value("Email or password is incorrect"));
    }

    private ResultActions login(LoginRequest request) throws Exception {
        return mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(request)));
    }

    private User account() {
        return User.builder().id(UUID.randomUUID()).username("lecturer1")
                .passwordHash("hash").fullName("Lecturer")
                .role(Role.LECTURER)
                .email(" Lect@EXAMPLE.COM ")
                .emailNormalized("lect@example.com").build();
    }
}
