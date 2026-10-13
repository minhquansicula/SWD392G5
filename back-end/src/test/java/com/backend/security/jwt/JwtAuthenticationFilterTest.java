package com.backend.security.jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.BeanCreationException;
import org.springframework.beans.factory.NoUniqueBeanDefinitionException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.InvalidDataAccessResourceUsageException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock JwtTokenProvider tokens;
    @Mock ObjectProvider<UserDetailsService> provider;
    @Mock UserDetailsService users;
    @Mock FilterChain chain;

    private final JsonMapper mapper = JsonMapper.builder().build();
    private final UserDetails user = User.withUsername("student")
            .password("unused").authorities("ROLE_STUDENT").build();
    private SecurityContextHolderStrategy originalStrategy;
    private JwtAuthenticationEntryPoint writer;
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        originalStrategy = SecurityContextHolder.getContextHolderStrategy();
        SecurityContextHolder.clearContext();
        writer = new JwtAuthenticationEntryPoint(mapper);
        filter = new JwtAuthenticationFilter(tokens, provider, writer);
    }

    @AfterEach
    void cleanUp() {
        try {
            verify(tokens, never()).getAuthoritiesFromToken(any());
        } finally {
            SecurityContextHolder.setContextHolderStrategy(originalStrategy);
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void absentInvalidAndExpiredTokensPreserveExistingContext() throws Exception {
        for (String token : new String[]{null, "invalid", "expired"}) {
            if (token != null) {
                when(tokens.validateToken(token)).thenReturn(false);
            }
            SecurityContext previous = existingContext();
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request(token), response, chain);

            assertThat(SecurityContextHolder.getContext()).isSameAs(previous);
            assertThat(response.getContentAsString()).isEmpty();
        }
        verify(chain, times(3)).doFilter(any(), any());
        verifyNoInteractions(provider, users);
        verify(tokens, never()).getUsernameFromToken(any());
    }

    @Test
    void tokenParsingExceptionPreservesContextAndContinues() throws Exception {
        when(tokens.validateToken("valid-token")).thenReturn(true);
        when(tokens.getUsernameFromToken("valid-token"))
                .thenThrow(new IllegalArgumentException("parse failure"));
        SecurityContext previous = existingContext();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request("valid-token"), response, chain);

        assertThat(SecurityContextHolder.getContext()).isSameAs(previous);
        assertThat(response.getContentAsString()).isEmpty();
        verify(chain).doFilter(any(), any());
        verifyNoInteractions(provider, users);
    }

    @Test
    void validUserReplacesContextUsingOnlyUserDetailsAuthorities() throws Exception {
        successfulLookup();
        SecurityContext previous = existingContext();
        var previousAuthentication = previous.getAuthentication();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request("valid-token"), response, chain);

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        assertThat(SecurityContextHolder.getContext()).isNotSameAs(previous);
        assertThat(previous.getAuthentication()).isSameAs(previousAuthentication);
        assertThat(authentication.getPrincipal()).isSameAs(user);
        assertThat(authentication.isAuthenticated()).isTrue();
        assertThat(authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority()).toList())
                .containsExactly("ROLE_STUDENT");
        verify(chain).doFilter(any(), any());
    }

    @Test
    void lookupExceptionsFollowCausePriorityAndClearContext() throws Exception {
        acceptedToken();
        when(provider.getIfAvailable()).thenReturn(users);
        Map<RuntimeException, Integer> cases = new LinkedHashMap<>();
        cases.put(new UsernameNotFoundException("missing"), 401);
        cases.put(new RuntimeException(new UsernameNotFoundException("missing")), 401);
        cases.put(new DataAccessResourceFailureException("connection"), 503);
        cases.put(new InvalidDataAccessResourceUsageException("schema"), 503);
        cases.put(new DataAccessException("generic data access") {}, 503);
        cases.put(new RuntimeException(new DataAccessResourceFailureException("wrapped")), 503);
        cases.put(new UsernameNotFoundException("missing",
                new DataAccessResourceFailureException("infrastructure")), 503);
        cases.put(new DataAccessResourceFailureException("infrastructure",
                new UsernameNotFoundException("missing")), 503);
        cases.put(new IllegalStateException("unexpected"), 500);
        cases.put(new RuntimeException(new IllegalArgumentException("wrapped")), 500);

        for (var testCase : cases.entrySet()) {
            doThrow(testCase.getKey()).when(users).loadUserByUsername("student");
            rejected(testCase.getValue());
        }
    }

    @Test
    void providerExceptionsNeverBecomeUserNotFound() throws Exception {
        acceptedToken();
        Map<RuntimeException, Integer> cases = new LinkedHashMap<>();
        cases.put(new NoUniqueBeanDefinitionException(
                UserDetailsService.class, 2, "ambiguous"), 500);
        cases.put(new BeanCreationException("users", "creation",
                new DataAccessResourceFailureException("connection")), 503);
        cases.put(new BeanCreationException("users", "creation",
                new IllegalStateException("wiring")), 500);
        cases.put(new BeanCreationException("users", "creation",
                new UsernameNotFoundException("not an account lookup")), 500);
        cases.put(new RuntimeException(new DataAccessResourceFailureException("wrapped")), 503);

        for (var testCase : cases.entrySet()) {
            doThrow(testCase.getKey()).when(provider).getIfAvailable();
            rejected(testCase.getValue());
        }
        verifyNoInteractions(users);
    }

    @Test
    void nullProviderAndNullUserDetailsAreRejected() throws Exception {
        acceptedToken();
        rejected(503);
        verifyNoInteractions(users);

        when(provider.getIfAvailable()).thenReturn(users);
        rejected(500);
        verify(users).loadUserByUsername("student");
    }

    @Test
    void cyclicCausesTerminateAndKeepClassification() {
        acceptedToken();
        when(provider.getIfAvailable()).thenReturn(users);
        Map<RuntimeException, Integer> cases = new LinkedHashMap<>();
        cases.put(cycle(new RuntimeException("cycle")), 500);
        cases.put(cycle(new UsernameNotFoundException("cycle")), 401);
        cases.put(cycle(new DataAccessResourceFailureException("cycle")), 503);

        for (var testCase : cases.entrySet()) {
            doThrow(testCase.getKey()).when(users).loadUserByUsername("student");
            assertTimeoutPreemptively(Duration.ofSeconds(2), () -> {
                try {
                    rejected(testCase.getValue());
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
        }
    }

    @Test
    void postLookupFailurePreservesContextEvenForDataAccessException() throws Exception {
        acceptedToken();
        when(provider.getIfAvailable()).thenReturn(users);
        UserDetails broken = mock(UserDetails.class);
        when(users.loadUserByUsername("student")).thenReturn(broken);
        when(broken.getAuthorities())
                .thenThrow(new DataAccessResourceFailureException("after lookup"));
        SecurityContext previous = existingContext();
        var previousAuthentication = previous.getAuthentication();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request("valid-token"), response, chain);

        assertThat(SecurityContextHolder.getContext()).isSameAs(previous);
        assertThat(previous.getAuthentication()).isSameAs(previousAuthentication);
        assertThat(response.getContentAsString()).isEmpty();
        verify(chain).doFilter(any(), any());
    }

    @Test
    void installationFailureAfterSwapRestoresPreviousContext() throws Exception {
        successfulLookup();
        SecurityContext previous = existingContext();
        var previousAuthentication = previous.getAuthentication();
        failingInstallationStrategy(null);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request("valid-token"), response, chain);

        assertThat(SecurityContextHolder.getContext()).isSameAs(previous);
        assertThat(previous.getAuthentication()).isSameAs(previousAuthentication);
        assertThat(response.getContentAsString()).isEmpty();
        verify(chain).doFilter(any(), any());
    }

    @Test
    void restorationFailurePropagatesWithoutWriterOrDownstream() throws IOException {
        successfulLookup();
        existingContext();
        IllegalStateException restoration = new IllegalStateException("restore failure");
        SecurityContextHolderStrategy failing = failingInstallationStrategy(restoration);
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertThatThrownBy(() -> filter.doFilter(
                request("valid-token"), response, chain)).isSameAs(restoration);

        assertThat(response.getContentAsString()).isEmpty();
        verifyNoInteractions(chain);
        verify(failing, never()).clearContext();
    }

    @Test
    void downstreamExceptionsAreNotConvertedOrRetried() throws Exception {
        successfulLookup();
        for (Exception failure : List.of(
                new IOException("downstream"),
                new ServletException("downstream"),
                new DataAccessResourceFailureException("controller"))) {
            clearInvocations(chain);
            MockHttpServletRequest request = request("valid-token");
            MockHttpServletResponse response = new MockHttpServletResponse();
            doThrow(failure).when(chain).doFilter(request, response);

            assertThatThrownBy(() -> filter.doFilter(request, response, chain))
                    .isSameAs(failure);

            verify(chain).doFilter(request, response);
            assertThat(response.getContentAsString()).isEmpty();
        }
    }

    @Test
    void writerIOExceptionPropagatesAfterContextClear() throws Exception {
        acceptedToken();
        when(provider.getIfAvailable()).thenReturn(users);
        when(users.loadUserByUsername("student"))
                .thenThrow(new UsernameNotFoundException("missing"));
        JwtAuthenticationEntryPoint brokenWriter = mock(JwtAuthenticationEntryPoint.class);
        JwtAuthenticationFilter localFilter =
                new JwtAuthenticationFilter(tokens, provider, brokenWriter);
        MockHttpServletRequest request = request("valid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        IOException failure = new IOException("writer failure");
        doThrow(failure).when(brokenWriter).writeError(request, response, 401);
        existingContext();

        assertThatThrownBy(() -> localFilter.doFilter(request, response, chain))
                .isSameAs(failure);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verifyNoInteractions(chain);
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

    private SecurityContext existingContext() {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                "existing", null, List.of()));
        SecurityContextHolder.setContext(context);
        return context;
    }

    private MockHttpServletRequest request(String token) {
        MockHttpServletRequest request =
                new MockHttpServletRequest("GET", "/api/auth/me");
        if (token != null) {
            request.addHeader("Authorization", "Bearer " + token);
        }
        return request;
    }

    private void rejected(int status) throws Exception {
        existingContext();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request("valid-token"), response, chain);

        assertThat(response.getStatus()).isEqualTo(status);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        Map<?, ?> body = mapper.readValue(response.getContentAsString(), Map.class);
        assertThat(((Number) body.get("status")).intValue()).isEqualTo(status);
        verifyNoInteractions(chain);
    }

    private RuntimeException cycle(RuntimeException first) {
        RuntimeException second = new RuntimeException("cycle wrapper");
        first.initCause(second);
        second.initCause(first);
        return first;
    }

    private SecurityContextHolderStrategy failingInstallationStrategy(
            RuntimeException restorationFailure) {
        SecurityContextHolderStrategy failing = mock(SecurityContextHolderStrategy.class);
        when(failing.getContext()).thenAnswer(invocation -> originalStrategy.getContext());
        AtomicInteger installations = new AtomicInteger();

        doAnswer(invocation -> {
            SecurityContext requested = invocation.getArgument(0);
            if (installations.getAndIncrement() == 0) {
                originalStrategy.setContext(requested);
                throw new IllegalStateException("installation failed after swap");
            }
            if (restorationFailure != null) {
                throw restorationFailure;
            }
            originalStrategy.setContext(requested);
            return null;
        }).when(failing).setContext(any(SecurityContext.class));

        SecurityContextHolder.setContextHolderStrategy(failing);
        return failing;
    }
}
