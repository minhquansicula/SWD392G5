package com.backend.security.jwt;

import java.io.IOException;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Set;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.NoUniqueBeanDefinitionException;
import org.springframework.dao.DataAccessException;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * JWT authentication requires a successful current-user lookup.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final ObjectProvider<UserDetailsService> userDetailsServiceProvider;
    private final JwtAuthenticationEntryPoint entryPoint;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        boolean acceptedToken = false;
        String username = null;

        try {
            String jwt = getJwtFromRequest(request);
            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                username = tokenProvider.getUsernameFromToken(jwt);
                acceptedToken = true;
            }
        } catch (Exception ex) {
            log.error("JWT token processing failed ({})", ex.getClass().getName());
        }

        if (!acceptedToken) {
            filterChain.doFilter(request, response);
            return;
        }

        UserDetailsService service;
        try {
            service = userDetailsServiceProvider.getIfAvailable();
        } catch (NoUniqueBeanDefinitionException ex) {
            log.error("JWT user service is ambiguous ({})", ex.getClass().getName());
            reject(request, response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        } catch (Exception ex) {
            log.error("JWT user service resolution failed ({})", ex.getClass().getName());
            int status = lookupFailureStatus(ex) == HttpServletResponse.SC_SERVICE_UNAVAILABLE
                    ? HttpServletResponse.SC_SERVICE_UNAVAILABLE
                    : HttpServletResponse.SC_INTERNAL_SERVER_ERROR;
            reject(request, response, status);
            return;
        }

        if (service == null) {
            reject(request, response, HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            return;
        }

        UserDetails userDetails;
        try {
            userDetails = service.loadUserByUsername(username);
        } catch (Exception ex) {
            log.error("JWT user lookup failed ({})", ex.getClass().getName());
            reject(request, response, lookupFailureStatus(ex));
            return;
        }

        if (userDetails == null) {
            reject(request, response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        }

        installAuthentication(request, userDetails);
        filterChain.doFilter(request, response);
    }

    private void installAuthentication(HttpServletRequest request, UserDetails userDetails) {
        SecurityContext previous = null;
        try {
            previous = SecurityContextHolder.getContext();
            if (previous == null) {
                throw new IllegalStateException("SecurityContext snapshot is unavailable");
            }

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
            authentication.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContext candidate = new SecurityContextImpl(authentication);
            SecurityContextHolder.setContext(candidate);
        } catch (Exception ex) {
            if (previous != null) {
                // A restoration exception must propagate before downstream runs.
                SecurityContextHolder.setContext(previous);
            }
            log.error("JWT authentication installation failed ({})", ex.getClass().getName());
        }
    }

    private void reject(HttpServletRequest request,
                        HttpServletResponse response,
                        int status) throws IOException {
        SecurityContextHolder.clearContext();
        entryPoint.writeError(request, response, status);
    }

    private static int lookupFailureStatus(Throwable failure) {
        Set<Throwable> visited =
                Collections.newSetFromMap(new IdentityHashMap<>());
        boolean userNotFound = false;

        for (Throwable current = failure;
             current != null && visited.add(current);
             current = current.getCause()) {
            if (current instanceof DataAccessException) {
                return HttpServletResponse.SC_SERVICE_UNAVAILABLE;
            }
            if (current instanceof UsernameNotFoundException) {
                userNotFound = true;
            }
        }

        return userNotFound
                ? HttpServletResponse.SC_UNAUTHORIZED
                : HttpServletResponse.SC_INTERNAL_SERVER_ERROR;
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
