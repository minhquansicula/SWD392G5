package com.backend.module.auth.service;

import com.backend.module.auth.dto.AuthResponse;
import com.backend.module.auth.dto.LoginRequest;
import com.backend.module.auth.dto.RegisterRequest;
import com.backend.module.auth.entity.User;
import com.backend.module.auth.repository.UserRepository;
import com.backend.security.jwt.JwtTokenProvider;
import com.backend.shared.exception.DuplicateUsernameException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.authentication.BadCredentialsException;

import java.util.Collections;
import java.util.Set;

/**
 * Service xử lý logic nghiệp vụ liên quan đến xác thực (đăng ký, đăng nhập).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    private static final Set<String> VALID_ROLES = Set.of("ADMIN", "LECTURER", "STUDENT");

    /**
     * Đăng ký tài khoản mới.
     *
     * @param request thông tin đăng ký từ client
     * @return AuthResponse chứa thông tin user và JWT token
     * @throws DuplicateUsernameException nếu username đã tồn tại
     * @throws IllegalArgumentException nếu role không hợp lệ
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // 1. Kiểm tra username đã tồn tại chưa
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateUsernameException(request.getUsername());
        }

        // 2. Kiểm tra role hợp lệ (ADMIN, LECTURER, STUDENT)
        String role = request.getRole() != null ? request.getRole().trim().toUpperCase() : "";
        if (!VALID_ROLES.contains(role)) {
            throw new IllegalArgumentException("Role không hợp lệ! Chỉ chấp nhận: ADMIN, LECTURER, STUDENT");
        }

        // 3. Tạo entity User mới
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setRole(role);

        // 3. Lưu vào database
        User savedUser = userRepository.save(user);
        log.info("Đăng ký thành công user: {} với role: {}", savedUser.getUsername(), savedUser.getRole());

        // 4. Tạo JWT token
        String token = jwtTokenProvider.generateToken(
                savedUser.getUsername(),
                savedUser.getRole(),
                Collections.emptyMap()
        );

        // 5. Trả về response
        return AuthResponse.builder()
                .id(savedUser.getId())
                .username(savedUser.getUsername())
                .fullName(savedUser.getFullName())
                .role(savedUser.getRole())
                .createdAt(savedUser.getCreatedAt())
                .token(token)
                .build();
    }

    /**
     * Đăng nhập vào hệ thống.
     *
     * @param request thông tin đăng nhập (username, password)
     * @return AuthResponse chứa thông tin người dùng và JWT token
     * @throws BadCredentialsException nếu username hoặc password sai
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        // 1. Tìm user theo username
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BadCredentialsException("Tên đăng nhập hoặc mật khẩu không chính xác"));

        // 2. So khớp mật khẩu với mã băm BCrypt trong database
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Tên đăng nhập hoặc mật khẩu không chính xác");
        }

        // 3. Tạo JWT token
        String token = jwtTokenProvider.generateToken(
                user.getUsername(),
                user.getRole(),
                Collections.emptyMap()
        );

        log.info("Người dùng {} đăng nhập thành công", user.getUsername());

        // 4. Trả về response
        return AuthResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .token(token)
                .build();
    }
}
