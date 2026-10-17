package com.backend.security.user;

import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.UUID;

/**
 * Triển khai UserDetailsService chuẩn của Spring Security để tải thông tin người dùng từ Database.
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String userId) throws UsernameNotFoundException {
        UUID id;
        try { id = UUID.fromString(userId); }
        catch (IllegalArgumentException ex) { throw new UsernameNotFoundException("Invalid user ID"); }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("Cannot find User with ID: " + userId));

        String roleName = user.getRole().name().startsWith("ROLE_") ? user.getRole().name() : "ROLE_" + user.getRole().name();

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getId().toString())
                .password(user.getPasswordHash())
                .authorities(Collections.singletonList(new SimpleGrantedAuthority(roleName)))
                .build();
    }
}
