package com.backend.module.exam;

import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.exam.api.dto.*;
import com.backend.module.exam.core.entity.Course;
import com.backend.module.exam.core.entity.Question;
import com.backend.module.exam.core.repository.CourseRepository;
import com.backend.module.exam.core.repository.QuestionRepository;
import com.backend.module.exam.core.service.ExamAccessService;
import com.backend.module.exam.core.service.QuestionServiceImpl;
import com.backend.shared.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QuestionServiceTest {

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private ExamAccessService access;

    @InjectMocks
    private QuestionServiceImpl questionService;

    private Course sampleCourse;
    private UserDto sampleUser;
    private Question sampleQuestion;
    private UUID courseId;
    private UUID questionId;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        questionId = UUID.randomUUID();

        sampleCourse = new Course();
        sampleCourse.setId(courseId);
        sampleCourse.setCourseCode("SWD392");
        sampleCourse.setCourseName("Software Architecture");

        sampleUser = UserDto.builder()
                .id(UUID.randomUUID())
                .username("lecturer1")
                .fullName("Lecturer One")
                .role("LECTURER")
                .build();

        sampleQuestion = new Question();
        sampleQuestion.setId(questionId);
        sampleQuestion.setCourse(sampleCourse);
        sampleQuestion.setContent("Explain the difference between Monolith and Microservices?");
        sampleQuestion.setDifficultyLevel("MEDIUM");
        sampleQuestion.setTopic("Microservices");
        sampleQuestion.setExpectedAnswer("Monolith has single deployment unit, microservices has distributed independent services.");
    }

    @Test
    void getQuestions_Success() {
        when(access.currentUser()).thenReturn(sampleUser);
        when(questionRepository.searchQuestions(eq(courseId), eq("MEDIUM"), eq("Microservices"), eq("Explain")))
                .thenReturn(List.of(sampleQuestion));

        List<QuestionDto> result = questionService.getQuestions(courseId, "MEDIUM", "Microservices", "Explain");

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("SWD392", result.get(0).getCourseCode());
        assertEquals("Explain the difference between Monolith and Microservices?", result.get(0).getContent());
        verify(access).requireManager(sampleUser);
    }

    @Test
    void getQuestionById_Success() {
        when(access.currentUser()).thenReturn(sampleUser);
        when(questionRepository.findByIdWithCourse(questionId)).thenReturn(Optional.of(sampleQuestion));

        QuestionDto result = questionService.getQuestionById(questionId);

        assertNotNull(result);
        assertEquals(questionId, result.getId());
        assertEquals("SWD392", result.getCourseCode());
        verify(access).requireManager(sampleUser);
    }

    @Test
    void getQuestionById_NotFound_ThrowsException() {
        when(access.currentUser()).thenReturn(sampleUser);
        when(questionRepository.findByIdWithCourse(questionId)).thenReturn(Optional.empty());

        assertThrows(AppException.class, () -> questionService.getQuestionById(questionId));
    }

    @Test
    void createQuestion_Success() {
        when(access.currentUser()).thenReturn(sampleUser);
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(sampleCourse));
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> {
            Question q = invocation.getArgument(0);
            q.setId(questionId);
            return q;
        });

        CreateQuestionRequest request = CreateQuestionRequest.builder()
                .courseId(courseId)
                .content("What is CQRS?")
                .difficultyLevel("HARD")
                .topic("Design Patterns")
                .expectedAnswer("Command Query Responsibility Segregation separates read and write operations.")
                .build();

        QuestionDto result = questionService.createQuestion(request);

        assertNotNull(result);
        assertEquals(questionId, result.getId());
        assertEquals("What is CQRS?", result.getContent());
        assertEquals("HARD", result.getDifficultyLevel());
        verify(questionRepository).save(any(Question.class));
    }

    @Test
    void createBatchQuestions_Success() {
        when(access.currentUser()).thenReturn(sampleUser);
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(sampleCourse));
        when(questionRepository.saveAll(anyList())).thenAnswer(invocation -> {
            List<Question> list = invocation.getArgument(0);
            for (Question q : list) {
                q.setId(UUID.randomUUID());
            }
            return list;
        });

        BatchCreateQuestionsRequest request = BatchCreateQuestionsRequest.builder()
                .courseId(courseId)
                .questions(List.of(
                        BatchCreateQuestionsRequest.QuestionItem.builder()
                                .content("Question 1")
                                .difficultyLevel("EASY")
                                .topic("Basics")
                                .build(),
                        BatchCreateQuestionsRequest.QuestionItem.builder()
                                .content("Question 2")
                                .difficultyLevel("HARD")
                                .topic("Advanced")
                                .build()
                ))
                .build();

        List<QuestionDto> result = questionService.createBatchQuestions(request);

        assertNotNull(result);
        assertEquals(2, result.size());
        verify(questionRepository).saveAll(anyList());
    }

    @Test
    void updateQuestion_Success() {
        when(access.currentUser()).thenReturn(sampleUser);
        when(questionRepository.findByIdWithCourse(questionId)).thenReturn(Optional.of(sampleQuestion));
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateQuestionRequest request = UpdateQuestionRequest.builder()
                .content("Updated content")
                .difficultyLevel("EASY")
                .topic("Updated topic")
                .expectedAnswer("Updated answer")
                .build();

        QuestionDto result = questionService.updateQuestion(questionId, request);

        assertNotNull(result);
        assertEquals("Updated content", result.getContent());
        assertEquals("EASY", result.getDifficultyLevel());
        assertEquals("Updated topic", result.getTopic());
    }

    @Test
    void deleteQuestion_Success() {
        when(access.currentUser()).thenReturn(sampleUser);
        when(questionRepository.existsById(questionId)).thenReturn(true);

        questionService.deleteQuestion(questionId);

        verify(questionRepository).deleteById(questionId);
    }
}
