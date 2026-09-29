package com.backend.module.exam.core.service;

import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.exam.api.dto.*;
import com.backend.module.exam.api.service.QuestionService;
import com.backend.module.exam.core.entity.Course;
import com.backend.module.exam.core.entity.Question;
import com.backend.module.exam.core.repository.CourseRepository;
import com.backend.module.exam.core.repository.QuestionRepository;
import com.backend.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuestionServiceImpl implements QuestionService {

    private final QuestionRepository questionRepository;
    private final CourseRepository courseRepository;
    private final ExamAccessService access;

    @Override
    public List<QuestionDto> getQuestions(UUID courseId, String difficulty, String topic, String query) {
        UserDto user = access.currentUser();
        access.requireManager(user);

        List<Question> list = questionRepository.searchQuestions(
                courseId,
                difficulty != null ? difficulty.trim() : null,
                topic != null ? topic.trim() : null,
                query != null ? query.trim() : null
        );
        return list.stream().map(this::toDto).toList();
    }

    @Override
    public QuestionDto getQuestionById(UUID id) {
        UserDto user = access.currentUser();
        access.requireManager(user);

        Question question = questionRepository.findByIdWithCourse(id)
                .orElseThrow(() -> new AppException("Question not found with ID: " + id, NOT_FOUND, "QUESTION_NOT_FOUND"));
        return toDto(question);
    }

    @Override
    @Transactional
    public QuestionDto createQuestion(CreateQuestionRequest request) {
        UserDto user = access.currentUser();
        access.requireManager(user);

        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new AppException("Course not found with ID: " + request.getCourseId(), NOT_FOUND, "COURSE_NOT_FOUND"));

        Question question = new Question();
        question.setCourse(course);
        question.setContent(request.getContent().trim());
        question.setDifficultyLevel(request.getDifficultyLevel() != null ? request.getDifficultyLevel().trim().toUpperCase() : "MEDIUM");
        question.setTopic(request.getTopic() != null ? request.getTopic().trim() : null);
        question.setExpectedAnswer(request.getExpectedAnswer() != null ? request.getExpectedAnswer().trim() : null);

        Question saved = questionRepository.save(question);
        return toDto(saved);
    }

    @Override
    @Transactional
    public List<QuestionDto> createBatchQuestions(BatchCreateQuestionsRequest request) {
        UserDto user = access.currentUser();
        access.requireManager(user);

        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new AppException("Course not found with ID: " + request.getCourseId(), NOT_FOUND, "COURSE_NOT_FOUND"));

        if (request.getQuestions() == null || request.getQuestions().isEmpty()) {
            throw new AppException("Question list cannot be empty", BAD_REQUEST, "VALIDATION_FAILED");
        }

        List<Question> toSave = new ArrayList<>();
        for (BatchCreateQuestionsRequest.QuestionItem item : request.getQuestions()) {
            if (item.getContent() == null || item.getContent().isBlank()) {
                continue;
            }
            Question q = new Question();
            q.setCourse(course);
            q.setContent(item.getContent().trim());
            q.setDifficultyLevel(item.getDifficultyLevel() != null ? item.getDifficultyLevel().trim().toUpperCase() : "MEDIUM");
            q.setTopic(item.getTopic() != null ? item.getTopic().trim() : null);
            q.setExpectedAnswer(item.getExpectedAnswer() != null ? item.getExpectedAnswer().trim() : null);
            toSave.add(q);
        }

        if (toSave.isEmpty()) {
            throw new AppException("No valid questions found to create", BAD_REQUEST, "VALIDATION_FAILED");
        }

        List<Question> saved = questionRepository.saveAll(toSave);
        return saved.stream().map(this::toDto).toList();
    }

    @Override
    @Transactional
    public QuestionDto updateQuestion(UUID id, UpdateQuestionRequest request) {
        UserDto user = access.currentUser();
        access.requireManager(user);

        Question question = questionRepository.findByIdWithCourse(id)
                .orElseThrow(() -> new AppException("Question not found with ID: " + id, NOT_FOUND, "QUESTION_NOT_FOUND"));

        question.setContent(request.getContent().trim());
        if (request.getDifficultyLevel() != null) {
            question.setDifficultyLevel(request.getDifficultyLevel().trim().toUpperCase());
        }
        if (request.getTopic() != null) {
            question.setTopic(request.getTopic().trim());
        }
        if (request.getExpectedAnswer() != null) {
            question.setExpectedAnswer(request.getExpectedAnswer().trim());
        }

        Question updated = questionRepository.save(question);
        return toDto(updated);
    }

    @Override
    @Transactional
    public void deleteQuestion(UUID id) {
        UserDto user = access.currentUser();
        access.requireManager(user);

        if (!questionRepository.existsById(id)) {
            throw new AppException("Question not found with ID: " + id, NOT_FOUND, "QUESTION_NOT_FOUND");
        }

        questionRepository.deleteById(id);
    }

    private QuestionDto toDto(Question q) {
        return QuestionDto.builder()
                .id(q.getId())
                .courseId(q.getCourse() != null ? q.getCourse().getId() : null)
                .courseCode(q.getCourse() != null ? q.getCourse().getCourseCode() : null)
                .courseName(q.getCourse() != null ? q.getCourse().getCourseName() : null)
                .content(q.getContent())
                .difficultyLevel(q.getDifficultyLevel())
                .topic(q.getTopic())
                .expectedAnswer(q.getExpectedAnswer())
                .build();
    }
}
