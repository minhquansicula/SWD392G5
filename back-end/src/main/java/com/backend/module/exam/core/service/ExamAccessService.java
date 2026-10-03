package com.backend.module.exam.core.service;

import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.api.service.AuthService;
import com.backend.module.exam.core.entity.Exam;
import com.backend.module.exam.core.repository.CourseRepository;
import com.backend.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import static org.springframework.http.HttpStatus.*;

@Component
@RequiredArgsConstructor
public class ExamAccessService {
    private final AuthService authService;
    private final CourseRepository courseRepository;

    public UserDto currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new AppException("Authentication is required", UNAUTHORIZED, "UNAUTHORIZED");
        }
        return authService.getCurrentUser(auth.getName());
    }

    public UserDto manager() {
        UserDto user = currentUser();
        requireManager(user);
        return user;
    }

    public void requireManager(UserDto user) {
        if (!isAdmin(user) && !"LECTURER".equals(user.getRole())) {
            throw new AppException("Lecturer or admin access is required", FORBIDDEN, "FORBIDDEN");
        }
    }

    public boolean isAdmin(UserDto user) {
        return "ADMIN".equals(user.getRole());
    }

    public void requireOwner(Exam exam, UserDto user) {
        requireManager(user);
        if (!isAdmin(user) && !user.getId().equals(exam.getCreatedById())) {
            throw new AppException("Not authorized to manage this exam", FORBIDDEN, "NOT_EXAM_OWNER");
        }
    }

    public void requireRead(Exam exam, UserDto user) {
        requireManager(user);
        if (!isAdmin(user) && !user.getId().equals(exam.getCreatedById())
                && (exam.getCourse() == null
                || !courseRepository.isLecturerAssigned(exam.getCourse().getId(), user.getId()))) {
            throw new AppException("Not authorized to view this exam", FORBIDDEN, "NOT_COURSE_LECTURER");
        }
    }
}
