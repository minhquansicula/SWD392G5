package com.backend.module.exam.service;

import com.backend.module.auth.entity.User;
import com.backend.module.auth.repository.UserRepository;
import com.backend.module.exam.dto.CreateExamRequest;
import com.backend.module.exam.dto.ExamResponse;
import com.backend.module.exam.dto.UpdateExamRequest;
import com.backend.module.exam.entity.Course;
import com.backend.module.exam.entity.Exam;
import com.backend.module.exam.repository.CourseRepository;
import com.backend.module.exam.repository.ExamRepository;
import com.backend.module.exam.repository.ExamScheduleRepository;
import com.backend.shared.exception.ResourceNotFoundException;
import com.backend.shared.exception.ScheduleConflictException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

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
    private final ExamScheduleRepository examScheduleRepository;
    private final ExamAccessPolicy accessPolicy;

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
     * Lấy danh sách bài thi, có hỗ trợ lọc theo môn học.
     *
     * @param courseId UUID của môn học (optional)
     * @return danh sách ExamResponse
     */
    @Transactional(readOnly = true)
    public List<ExamResponse> getExams(UUID courseId) {
        List<Exam> exams;
        if (courseId != null) {
            exams = examRepository.findByCourseIdOrderByStartDateDesc(courseId);
        } else {
            exams = examRepository.findAllByOrderByStartDateDesc();
        }

        return exams.stream()
                .map(this::toExamResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy thông tin chi tiết bài thi theo ID.
     *
     * @param id UUID của bài thi
     * @return ExamResponse
     * @throws ResourceNotFoundException nếu không tìm thấy
     */
    @Transactional(readOnly = true)
    public ExamResponse getExamById(UUID id) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exam", id));
        return toExamResponse(exam);
    }

    /**
     * Cập nhật thông tin bài thi (hỗ trợ partial update).
     *
     * @param id      UUID của bài thi cần cập nhật
     * @param request dữ liệu cập nhật
     * @return ExamResponse sau khi cập nhật
     * @throws ResourceNotFoundException nếu không tìm thấy bài thi hoặc môn học mới
     * @throws IllegalArgumentException  nếu endDate <= startDate
     */
    @Transactional
    public ExamResponse updateExam(UUID id, UpdateExamRequest request, String username) {
        Exam exam = examRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exam", id));
        accessPolicy.requireManager(exam, username);
        requireEditable(exam);

        // 1. Validate thời gian nếu có cập nhật startDate hoặc endDate
        OffsetDateTime newStartDate = request.getStartDate() != null ? request.getStartDate() : exam.getStartDate();
        OffsetDateTime newEndDate = request.getEndDate() != null ? request.getEndDate() : exam.getEndDate();

        if (!newEndDate.isAfter(newStartDate)) {
            throw new IllegalArgumentException("Thời gian kết thúc phải sau thời gian bắt đầu");
        }
        if (!newStartDate.isAfter(OffsetDateTime.now())) {
            throw new IllegalArgumentException("Thời gian bắt đầu kỳ thi phải ở tương lai");
        }
        boolean outsideWindow = examScheduleRepository.findByExamId(id).stream().anyMatch(s ->
                s.getScheduledStartTime().isBefore(newStartDate) || s.getScheduledEndTime().isAfter(newEndDate));
        if (outsideWindow) {
            throw new ScheduleConflictException("EXAM_WINDOW_CONFLICT", "Khoảng thời gian mới không chứa tất cả slot đã xếp");
        }

        // 2. Cập nhật môn học nếu có
        if (request.getCourseId() != null) {
            Course course = courseRepository.findById(request.getCourseId())
                    .orElseThrow(() -> new ResourceNotFoundException("Course", request.getCourseId()));
            exam.setCourse(course);
        }

        // 3. Cập nhật tiêu đề nếu có
        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            exam.setTitle(request.getTitle());
        }

        // 4. Cập nhật thời gian thi
        if (request.getStartDate() != null) {
            exam.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            exam.setEndDate(request.getEndDate());
        }

        // 5. Cập nhật số câu hỏi
        if (request.getMaxMainQuestions() != null) {
            exam.setMaxMainQuestions(request.getMaxMainQuestions());
        }
        if (request.getMaxFollowupQuestions() != null) {
            exam.setMaxFollowupQuestions(request.getMaxFollowupQuestions());
        }

        Exam savedExam = examRepository.save(exam);
        log.info("Đã cập nhật bài thi ID: '{}' ({})", savedExam.getId(), savedExam.getTitle());

        return toExamResponse(savedExam);
    }

    /**
     * Xoá bài thi theo ID.
     * Chỉ cho phép người quản lý xoá trước giờ bắt đầu khi mọi ca thi còn PENDING.
     *
     * @param id UUID bài thi cần xoá
     * @throws ResourceNotFoundException nếu không tìm thấy bài thi
     * @throws ScheduleConflictException nếu kỳ thi hoặc ca thi đã bắt đầu
     */
    @Transactional
    public void deleteExam(UUID id, String username) {
        Exam exam = examRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exam", id));
        accessPolicy.requireManager(exam, username);
        requireEditable(exam);

        examRepository.delete(exam);
        log.info("Đã xoá bài thi ID: {} ({})", id, exam.getTitle());
    }

    /**
     * Chuyển đổi entity Exam sang DTO ExamResponse.
     */
    private ExamResponse toExamResponse(Exam exam) {
        return ExamResponse.builder()
                .id(exam.getId())
                .courseId(exam.getCourse() != null ? exam.getCourse().getId() : null)
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

    private void requireEditable(Exam exam) {
        accessPolicy.requireNotStarted(exam);
        if (examScheduleRepository.existsByExamIdAndStatusNot(exam.getId(), "PENDING")) {
            throw new ScheduleConflictException("SCHEDULE_LOCKED", "Không thể thay đổi kỳ thi đã có ca thi bắt đầu hoặc hoàn tất");
        }
    }
}
