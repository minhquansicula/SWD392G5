package com.backend.module.exam.service;

import com.backend.module.auth.entity.User;
import com.backend.module.auth.repository.UserRepository;
import com.backend.module.exam.dto.CreateExamRequest;
import com.backend.module.exam.dto.ExamResponse;
import com.backend.module.exam.entity.Course;
import com.backend.module.exam.entity.Exam;
import com.backend.module.exam.repository.CourseRepository;
import com.backend.module.exam.repository.ExamRepository;
import com.backend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service xử lý logic nghiệp vụ quản lý bài thi (Exam).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExamService {

    private final ExamRepository examRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    /**
     * Tạo bài thi mới.
     *
     * @param request  thông tin bài thi từ client
     * @param username username của giảng viên (lấy từ JWT token)
     * @return ExamResponse chứa thông tin bài thi đã tạo
     * @throws ResourceNotFoundException nếu courseId hoặc username không tồn tại
     * @throws IllegalArgumentException  nếu endDate <= startDate
     */
    @Transactional
    public ExamResponse createExam(CreateExamRequest request, String username) {
        // 1. Validate endDate > startDate
        if (!request.getEndDate().isAfter(request.getStartDate())) {
            throw new IllegalArgumentException("Thời gian kết thúc phải sau thời gian bắt đầu");
        }

        // 2. Tìm Course theo courseId
        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Course", request.getCourseId()));

        // 3. Tìm User (lecturer) theo username từ JWT
        User lecturer = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", username));

        // 4. Tạo entity Exam
        Exam exam = new Exam();
        exam.setCourse(course);
        exam.setTitle(request.getTitle());
        exam.setStartDate(request.getStartDate());
        exam.setEndDate(request.getEndDate());
        exam.setMaxMainQuestions(request.getMaxMainQuestions() != null ? request.getMaxMainQuestions() : 0);
        exam.setMaxFollowupQuestions(request.getMaxFollowupQuestions() != null ? request.getMaxFollowupQuestions() : 0);
        exam.setCreatedBy(lecturer);

        // 5. Lưu vào database
        Exam savedExam = examRepository.save(exam);
        log.info("Giảng viên {} đã tạo bài thi '{}' (ID: {}) cho môn {}",
                lecturer.getUsername(), savedExam.getTitle(), savedExam.getId(), course.getCourseCode());

        // 6. Trả về response
        return toExamResponse(savedExam);
    }

    /**
     * Chuyển đổi entity Exam sang DTO ExamResponse.
     */
    private ExamResponse toExamResponse(Exam exam) {
        return ExamResponse.builder()
                .id(exam.getId())
                .courseCode(exam.getCourse() != null ? exam.getCourse().getCourseCode() : null)
                .courseName(exam.getCourse() != null ? exam.getCourse().getCourseName() : null)
                .title(exam.getTitle())
                .startDate(exam.getStartDate())
                .endDate(exam.getEndDate())
                .maxMainQuestions(exam.getMaxMainQuestions())
                .maxFollowupQuestions(exam.getMaxFollowupQuestions())
                .createdBy(exam.getCreatedBy() != null ? exam.getCreatedBy().getFullName() : null)
                .build();
    }
}
