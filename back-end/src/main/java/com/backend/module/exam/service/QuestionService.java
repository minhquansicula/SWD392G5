package com.backend.module.exam.service;

import com.backend.module.exam.dto.CreateQuestionRequest;
import com.backend.module.exam.dto.QuestionResponse;
import com.backend.module.exam.dto.UpdateQuestionRequest;
import com.backend.module.exam.entity.Course;
import com.backend.module.exam.entity.Question;
import com.backend.module.exam.repository.CourseRepository;
import com.backend.module.exam.repository.QuestionRepository;
import com.backend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service xử lý logic nghiệp vụ quản lý ngân hàng câu hỏi (Question).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final CourseRepository courseRepository;

    /**
     * Tạo câu hỏi mới trong ngân hàng đề.
     *
     * @param request dữ liệu tạo câu hỏi từ client
     * @return QuestionResponse chứa thông tin câu hỏi vừa tạo
     * @throws ResourceNotFoundException nếu courseId không tồn tại
     */
    @Transactional
    public QuestionResponse createQuestion(CreateQuestionRequest request) {
        // 1. Kiểm tra Course tồn tại
        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Course", request.getCourseId()));

        // 2. Tạo entity Question
        Question question = new Question();
        question.setCourse(course);
        question.setContent(request.getContent().trim());
        if (request.getDifficultyLevel() != null && !request.getDifficultyLevel().isBlank()) {
            question.setDifficultyLevel(request.getDifficultyLevel().trim().toUpperCase());
        }

        // 3. Lưu vào database
        Question savedQuestion = questionRepository.save(question);
        log.info("Đã tạo câu hỏi mới ID: {} cho môn học {} ({})",
                savedQuestion.getId(), course.getCourseCode(), course.getCourseName());

        return toQuestionResponse(savedQuestion);
    }

    /**
     * Lấy danh sách câu hỏi có hỗ trợ lọc linh hoạt theo môn học và mức độ khó.
     *
     * @param courseId        UUID của môn học (optional)
     * @param difficultyLevel Mức độ khó (EASY, MEDIUM, HARD) (optional)
     * @return danh sách QuestionResponse
     */
    @Transactional(readOnly = true)
    public List<QuestionResponse> getQuestions(UUID courseId, String difficultyLevel) {
        String normalizedDifficulty = (difficultyLevel != null && !difficultyLevel.isBlank())
                ? difficultyLevel.trim().toUpperCase()
                : null;

        List<Question> questions;
        if (courseId != null && normalizedDifficulty != null) {
            questions = questionRepository.findByCourseIdAndDifficultyLevel(courseId, normalizedDifficulty);
        } else if (courseId != null) {
            questions = questionRepository.findByCourseId(courseId);
        } else if (normalizedDifficulty != null) {
            questions = questionRepository.findByDifficultyLevel(normalizedDifficulty);
        } else {
            questions = questionRepository.findAll();
        }

        return questions.stream()
                .map(this::toQuestionResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy thông tin chi tiết một câu hỏi theo ID.
     *
     * @param id UUID của câu hỏi
     * @return QuestionResponse
     * @throws ResourceNotFoundException nếu không tìm thấy câu hỏi
     */
    @Transactional(readOnly = true)
    public QuestionResponse getQuestionById(UUID id) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question", id));
        return toQuestionResponse(question);
    }

    /**
     * Cập nhật thông tin câu hỏi (hỗ trợ partial update).
     *
     * @param id      UUID của câu hỏi cần cập nhật
     * @param request dữ liệu cập nhật
     * @return QuestionResponse sau khi cập nhật
     * @throws ResourceNotFoundException nếu không tìm thấy câu hỏi hoặc môn học mới
     */
    @Transactional
    public QuestionResponse updateQuestion(UUID id, UpdateQuestionRequest request) {
        // 1. Tìm Question theo ID
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question", id));

        // 2. Cập nhật Course nếu có thay đổi môn
        if (request.getCourseId() != null) {
            Course newCourse = courseRepository.findById(request.getCourseId())
                    .orElseThrow(() -> new ResourceNotFoundException("Course", request.getCourseId()));
            question.setCourse(newCourse);
        }

        // 3. Cập nhật nội dung câu hỏi nếu có
        if (request.getContent() != null && !request.getContent().isBlank()) {
            question.setContent(request.getContent().trim());
        }

        // 4. Cập nhật độ khó nếu có
        if (request.getDifficultyLevel() != null) {
            question.setDifficultyLevel(request.getDifficultyLevel().trim().toUpperCase());
        }

        // 5. Lưu vào database
        Question updatedQuestion = questionRepository.save(question);
        log.info("Đã cập nhật câu hỏi ID: {}", updatedQuestion.getId());

        return toQuestionResponse(updatedQuestion);
    }

    /**
     * Xoá câu hỏi theo ID.
     *
     * @param id UUID của câu hỏi cần xoá
     * @throws ResourceNotFoundException nếu không tìm thấy câu hỏi
     */
    @Transactional
    public void deleteQuestion(UUID id) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question", id));

        questionRepository.delete(question);
        log.info("Đã xoá câu hỏi ID: {} khỏi hệ thống", id);
    }

    /**
     * Chuyển đổi entity Question sang DTO QuestionResponse.
     */
    private QuestionResponse toQuestionResponse(Question question) {
        return QuestionResponse.builder()
                .id(question.getId())
                .courseId(question.getCourse() != null ? question.getCourse().getId() : null)
                .courseCode(question.getCourse() != null ? question.getCourse().getCourseCode() : null)
                .courseName(question.getCourse() != null ? question.getCourse().getCourseName() : null)
                .content(question.getContent())
                .difficultyLevel(question.getDifficultyLevel())
                .build();
    }
}
