package com.backend.security.jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collection;

/**
 * Filter chặn mọi HTTP request để kiểm tra và xác thực JWT token từ header 'Authorization: Bearer <token>'.
 * Nếu token hợp lệ, thiết lập Authentication vào SecurityContextHolder.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final ObjectProvider<UserDetailsService> userDetailsServiceProvider;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String username = tokenProvider.getUsernameFromToken(jwt);

                UserDetails userDetails = null;
                UserDetailsService userDetailsService = userDetailsServiceProvider.getIfAvailable();
                if (userDetailsService != null) {
                    try {
                        userDetails = userDetailsService.loadUserByUsername(username);
                    } catch (Exception ex) {
                        log.debug("Không thể load UserDetails qua UserDetailsService: {}", ex.getMessage());
                    }
                }

                Collection<? extends GrantedAuthority> authorities;
                Object principal;
                if (userDetails != null) {
                    authorities = userDetails.getAuthorities();
                    principal = userDetails;
                } else {
                    authorities = tokenProvider.getAuthoritiesFromToken(jwt);
                    principal = username;
                }

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(principal, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) {
            log.error("Không thể thiết lập user authentication vào security context: {}", ex.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Lấy token JWT từ header Authorization dạng "Bearer <token>".
     */
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
