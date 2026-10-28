package com.backend.module.auth.core.init;

import com.backend.module.auth.core.EmailNormalizer;
import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.enums.Role;
import com.backend.module.auth.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * Khởi tạo dữ liệu người dùng mẫu cho các vai trò: ADMIN, LECTURER, STUDENT.
 * Chỉ tạo tài khoản mới nếu chưa tồn tại trong database.
 * Tuyệt đối không can thiệp hay sửa đổi bất kỳ dữ liệu nào đã có sẵn trong DB.
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class UserDataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("=== Bắt đầu kiểm tra khởi tạo tài khoản mẫu mới (Auth Module) ===");

        // 1. Quản trị viên (ADMIN)
        seedNewUserOnly(
                "admin@aives.edu.vn",
                "Admin@123",
                "Quản Trị Viên Hệ Thống",
                Role.ADMIN,
                null,
                true
        );

        // 2. Giảng viên (LECTURER)
        seedNewUserOnly(
                "lecturer@aives.edu.vn",
                "Lecturer@123",
                "Giảng Viên Nguyễn Văn An",
                Role.LECTURER,
                null,
                false
        );

        // 3. Sinh viên (STUDENT)
        seedNewUserOnly(
                "student@aives.edu.vn",
                "Student@123",
                "Sinh Viên Trần Thị Bình",
                Role.STUDENT,
                "SE180001",
                false
        );

        log.info("=== Kết thúc kiểm tra khởi tạo tài khoản mẫu ===");
    }

    /**
     * Chỉ tạo mới nếu email chưa tồn tại. Nếu đã có thì bỏ qua 100%, không sửa đổi mật khẩu hay bất kỳ thông tin nào.
     */
    private void seedNewUserOnly(String email, String rawPassword, String fullName, Role role, String studentCode, boolean isSystemAdmin) {
        String normalizedEmail = EmailNormalizer.normalize(email);

        if (userRepository.existsByEmailNormalized(normalizedEmail)) {
            log.info("-> Tài khoản [{}] đã có trong DB, giữ nguyên dữ liệu sẵn có (bỏ qua).", email);
            return;
        }

        User user = User.builder()
                .email(email)
                .emailNormalized(normalizedEmail)
                .fullName(fullName)
                .role(role)
                .studentCode(role == Role.STUDENT ? studentCode : null)
                .systemAdmin(isSystemAdmin)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .passwordSetAt(OffsetDateTime.now())
                .build();

        userRepository.save(user);
        log.info("-> [TẠO MỚI THÀNH CÔNG] Tài khoản: [{}] | Role: [{}] | Password: [{}]", email, role, rawPassword);
    }
}
