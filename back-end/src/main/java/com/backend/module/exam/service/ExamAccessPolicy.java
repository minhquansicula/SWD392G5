package com.backend.module.exam.service;

import com.backend.module.auth.entity.User;
import com.backend.module.auth.repository.UserRepository;
import com.backend.module.exam.entity.Exam;
import com.backend.shared.exception.ScheduleConflictException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

@Component
@RequiredArgsConstructor
public class ExamAccessPolicy {
    private final UserRepository userRepository;

    public User requireUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AccessDeniedException("Tài khoản không còn tồn tại"));
    }

    public void requireManager(Exam exam, String username) {
        User actor = requireUser(username);
        if ("ADMIN".equals(actor.getRole())) {
            return;
        }
        if (!"LECTURER".equals(actor.getRole()) || exam.getCreatedBy() == null
                || !exam.getCreatedBy().getId().equals(actor.getId())) {
            throw new AccessDeniedException("Bạn không có quyền quản lý kỳ thi này");
        }
    }

    public void requireNotStarted(Exam exam) {
        if (!exam.getStartDate().isAfter(OffsetDateTime.now())) {
            throw new ScheduleConflictException("EXAM_ALREADY_STARTED", "Kỳ thi đã bắt đầu, không thể thay đổi lịch");
        }
    }
}
