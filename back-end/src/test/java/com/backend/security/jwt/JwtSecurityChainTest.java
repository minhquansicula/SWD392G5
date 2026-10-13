package com.backend.security.jwt;

import com.backend.config.CorsConfig;
import com.backend.config.SecurityConfig;
import com.backend.module.auth.api.dto.AuthResponse;
import com.backend.module.auth.api.dto.LoginRequest;
import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.api.service.AuthService;
import com.backend.module.auth.core.controller.AuthController;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.BeanCreationException;
import org.springframework.beans.factory.NoUniqueBeanDefinitionException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.InvalidDataAccessResourceUsageException;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import tools.jackson.databind.json.JsonMapper;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class JwtSecurityChainTest {

    private static final List<String> ROUTES = List.of(
            "GET /api/auth/me",
            "POST /api/auth/login",
            "GET /swagger-ui.html",
            "GET /v3/api-docs",
            "GET /ws/probe",
            "GET /error",
            "OPTIONS /api/auth/login");

    @Mock JwtTokenProvider tokens;
    @Mock ObjectProvider<UserDetailsService> provider;
    @Mock UserDetailsService users;
    @Mock AuthService authService;

    private AnnotationConfigWebApplicationContext context;
    private MockMvc mvc;
    private final UserDetails user = User.withUsername("student")
            .password("unused").authorities("ROLE_STUDENT").build();

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        Fixtures fixtures = new Fixtures(tokens, provider, users, authService);
        context.addBeanFactoryPostProcessor(
                factory -> factory.registerSingleton("fixtures", fixtures));
        context.register(WebTestConfiguration.class);
        context.refresh();
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity()).build();
    }

    @AfterEach
    void cleanUp() {
        try {
            verify(tokens, never()).getAuthoritiesFromToken(any());
        } finally {
            if (context != null) {
                context.close();
            }
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void noTokenRejectsProtectedButAllowsPublicLogin() throws Exception {
        when(authService.login(any(LoginRequest.class))).thenReturn(loginResponse());

        mvc.perform(route("GET /api/auth/me", null))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(message(401)));
        verifyNoInteractions(authService);

        mvc.perform(route("POST /api/auth/login", null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").value("replacement-token"));

        verify(authService).login(any(LoginRequest.class));
        verifyNoInteractions(provider, users, tokens);
    }

    @Test
    void invalidAndExpiredTokensDoNotTriggerLookup() throws Exception {
        when(authService.login(any(LoginRequest.class))).thenReturn(loginResponse());

        for (String token : List.of("invalid", "expired")) {
            when(tokens.validateToken(token)).thenReturn(false);
            mvc.perform(route("GET /api/auth/me", token))
                    .andExpect(status().isUnauthorized());
            mvc.perform(route("POST /api/auth/login", token))
                    .andExpect(status().isOk());
        }

        verifyNoInteractions(provider, users);
        verify(tokens, never()).getUsernameFromToken(any());
    }

    @Test
    void validUserReachesProtectedController() throws Exception {
        successfulLookup();
        when(authService.getCurrentUser("student")).thenReturn(dto("student"));

        mvc.perform(route("GET /api/auth/me", "valid-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("student"));

        verify(users).loadUserByUsername("student");
        verify(authService).getCurrentUser("student");
    }

    @Test
    void lookupFailuresBlockProtectedAndEveryPublicRouteListed() throws Exception {
        acceptedToken();
        when(provider.getIfAvailable()).thenReturn(users);
        Map<RuntimeException, Integer> cases = new LinkedHashMap<>();
        cases.put(new UsernameNotFoundException("missing"), 401);
        cases.put(new InvalidDataAccessResourceUsageException("schema"), 503);
        cases.put(new IllegalStateException("unexpected"), 500);

        for (var testCase : cases.entrySet()) {
            doThrow(testCase.getKey()).when(users).loadUserByUsername("student");
            for (String endpoint : ROUTES) {
                expectFailure(endpoint, testCase.getValue());
            }
        }
        verifyNoInteractions(authService);
    }

    @Test
    void wrappedCausesKeepTheirPriorityThroughSecurityChain() throws Exception {
        acceptedToken();
        when(provider.getIfAvailable()).thenReturn(users);
        Map<RuntimeException, Integer> cases = new LinkedHashMap<>();
        cases.put(new RuntimeException(new UsernameNotFoundException("missing")), 401);
        cases.put(new RuntimeException(new DataAccessResourceFailureException("wrapped")), 503);
        cases.put(new UsernameNotFoundException("missing",
                new DataAccessResourceFailureException("priority")), 503);

        for (var testCase : cases.entrySet()) {
            doThrow(testCase.getKey()).when(users).loadUserByUsername("student");
            expectFailure("GET /api/auth/me", testCase.getValue());
            expectFailure("POST /api/auth/login", testCase.getValue());
        }
        verifyNoInteractions(authService);
    }

    @Test
    void providerFailuresBlockProtectedAndPublicWithoutUserLookup() throws Exception {
        acceptedToken();
        Map<RuntimeException, Integer> cases = new LinkedHashMap<>();
        cases.put(new NoUniqueBeanDefinitionException(
                UserDetailsService.class, 2, "ambiguous"), 500);
        cases.put(new BeanCreationException("users", "creation",
                new DataAccessResourceFailureException("connection")), 503);
        cases.put(new BeanCreationException("users", "creation",
                new IllegalStateException("wiring")), 500);

        for (var testCase : cases.entrySet()) {
            doThrow(testCase.getKey()).when(provider).getIfAvailable();
            expectFailure("GET /api/auth/me", testCase.getValue());
            expectFailure("POST /api/auth/login", testCase.getValue());
        }
        verifyNoInteractions(users, authService);
    }

    @Test
    void nullProviderAndNullUserDetailsBlockBothKindsOfEndpoint() throws Exception {
        acceptedToken();
        expectFailure("GET /api/auth/me", 503);
        expectFailure("POST /api/auth/login", 503);
        verifyNoInteractions(users);

        when(provider.getIfAvailable()).thenReturn(users);
        expectFailure("GET /api/auth/me", 500);
        expectFailure("POST /api/auth/login", 500);
        verifyNoInteractions(authService);
    }

    @Test
    void postLookupFailureLetsControllerUseExistingAuthentication() throws Exception {
        acceptedToken();
        when(provider.getIfAvailable()).thenReturn(users);
        UserDetails broken = mock(UserDetails.class);
        when(users.loadUserByUsername("student")).thenReturn(broken);
        when(broken.getAuthorities())
                .thenThrow(new DataAccessResourceFailureException("after lookup"));
        when(authService.getCurrentUser("existing")).thenReturn(dto("existing"));
        var existing = UsernamePasswordAuthenticationToken.authenticated(
                "existing", null, List.of());

        mvc.perform(route("GET /api/auth/me", "valid-token")
                        .with(authentication(existing)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("existing"));

        verify(authService).getCurrentUser("existing");
        verify(authService, never()).getCurrentUser("student");
    }

    @Test
    void downstreamControllerExceptionIsNotConvertedToLookup503() {
        successfulLookup();
        DataAccessResourceFailureException failure =
                new DataAccessResourceFailureException("controller failure");
        when(authService.getCurrentUser("student")).thenThrow(failure);

        assertThatThrownBy(() -> mvc.perform(
                route("GET /api/auth/me", "valid-token")))
                .hasRootCause(failure);

        verify(authService).getCurrentUser("student");
        verify(users).loadUserByUsername("student");
    }

    private void acceptedToken() {
        when(tokens.validateToken("valid-token")).thenReturn(true);
        when(tokens.getUsernameFromToken("valid-token")).thenReturn("student");
    }

    private void successfulLookup() {
        acceptedToken();
        when(provider.getIfAvailable()).thenReturn(users);
        when(users.loadUserByUsername("student")).thenReturn(user);
    }

    private MockHttpServletRequestBuilder route(String descriptor, String token) {
        String[] parts = descriptor.split(" ", 2);
        MockHttpServletRequestBuilder request =
                request(HttpMethod.valueOf(parts[0]), parts[1]);
        if ("POST /api/auth/login".equals(descriptor)) {
            request.contentType(MediaType.APPLICATION_JSON)
                    .content("{\"username\":\"new-login\",\"password\":\"unused\"}");
        }
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        return request;
    }

    private void expectFailure(String endpoint, int expectedStatus) throws Exception {
        mvc.perform(route(endpoint, "valid-token"))
                .andExpect(status().is(expectedStatus))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(expectedStatus))
                .andExpect(jsonPath("$.message").value(message(expectedStatus)))
                .andExpect(jsonPath("$.path").value(endpoint.split(" ", 2)[1]));
    }

    private String message(int status) {
        return switch (status) {
            case 401 -> "Authentication is required to access this resource";
            case 503 -> "Authentication service is temporarily unavailable";
            case 500 -> "An internal authentication error occurred";
            default -> throw new IllegalArgumentException("Unexpected test status");
        };
    }

    private static UserDto dto(String username) {
        return UserDto.builder().username(username)
                .fullName("Test User").role("STUDENT").build();
    }

    private static AuthResponse loginResponse() {
        return AuthResponse.builder().token("replacement-token")
                .tokenType("Bearer").user(dto("new-login")).build();
    }

    private record Fixtures(
            JwtTokenProvider tokens,
            ObjectProvider<UserDetailsService> provider,
            UserDetailsService users,
            AuthService authService) {
    }

    @Configuration(proxyBeanMethods = false)
    @EnableWebMvc
    @Import({SecurityConfig.class, CorsConfig.class})
    static class WebTestConfiguration {

        @Bean
        JsonMapper jsonMapper() {
            return JsonMapper.builder().build();
        }

        @Bean
        JwtTokenProvider jwtTokenProvider(Fixtures fixtures) {
            return fixtures.tokens();
        }

        @Bean
        UserDetailsService userDetailsService(Fixtures fixtures) {
            return fixtures.users();
        }

        @Bean
        AuthService authService(Fixtures fixtures) {
            return fixtures.authService();
        }

        @Bean
        JwtAuthenticationEntryPoint entryPoint(JsonMapper mapper) {
            return new JwtAuthenticationEntryPoint(mapper);
        }

        @Bean
        JwtAuthenticationFilter jwtAuthenticationFilter(
                Fixtures fixtures, JwtAuthenticationEntryPoint entryPoint) {
            return new JwtAuthenticationFilter(
                    fixtures.tokens(), fixtures.provider(), entryPoint);
        }

        @Bean
        AuthController authController(AuthService service) {
            return new AuthController(service, org.mockito.Mockito.mock(com.backend.module.auth.api.service.PasswordSetupService.class));
        }
    }
}
