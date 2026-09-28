package com.backend.module.exam;

import com.backend.module.exam.core.entity.*;
import com.backend.module.exam.core.repository.*;
import com.backend.module.exam.core.service.*;
import com.backend.shared.exception.AppException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QuestionAssignmentServiceTest {
    @Mock QuestionRepository questions;
    @Mock AssignedQuestionRepository assignments;
    @Mock ExamDtoMapper mapper;
    @InjectMocks QuestionAssignmentService service;

    @Test
    void exhaustedPoolPrefersLeastRecentlyUsedQuestions() {
        ExamSchedule schedule = schedule(2);
        List<Question> pool = pool(4);
        when(questions.findByCourseId(schedule.getExam().getCourse().getId())).thenReturn(pool);
        OffsetDateTime now = OffsetDateTime.now();
        when(assignments.findQuestionUsage(schedule.getExam().getId())).thenReturn(List.of(
                usage(pool.get(0), now.minusHours(1)), usage(pool.get(1), now.minusHours(1)),
                usage(pool.get(2), now), usage(pool.get(3), now)));
        when(assignments.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        service.assignQuestions(schedule);
        @SuppressWarnings("unchecked") ArgumentCaptor<List<AssignedQuestion>> captor = ArgumentCaptor.forClass(List.class);
        verify(assignments).saveAll(captor.capture());
        assertThat(captor.getValue()).extracting(a -> a.getQuestion().getId())
                .containsExactlyInAnyOrder(pool.get(0).getId(), pool.get(1).getId());
        assertThat(captor.getValue()).extracting(AssignedQuestion::getQuestionOrder).containsExactly(1, 2);
        assertThat(captor.getValue()).allSatisfy(a -> assertThat(a.getContentSnapshot()).isEqualTo(a.getQuestion().getContent()));
    }

    @Test
    void duplicateAssignmentIsRejectedBeforeReadingPool() {
        ExamSchedule schedule = schedule(2);
        when(assignments.existsByExamScheduleId(schedule.getId())).thenReturn(true);
        assertThatThrownBy(() -> service.assignQuestions(schedule)).isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo("QUESTIONS_ALREADY_ASSIGNED"));
        verifyNoInteractions(questions);
        verify(assignments, never()).saveAll(anyList());
    }

    @Test
    void insufficientPoolNeverPersistsPartialAssignment() {
        ExamSchedule schedule = schedule(3);
        when(questions.findByCourseId(schedule.getExam().getCourse().getId())).thenReturn(pool(2));
        assertThatThrownBy(() -> service.assignQuestions(schedule)).isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo("NOT_ENOUGH_QUESTIONS"));
        verify(assignments, never()).saveAll(anyList());
    }

    private ExamSchedule schedule(int count) {
        Course course = new Course();
        course.setId(UUID.randomUUID());
        Exam exam = new Exam();
        exam.setId(UUID.randomUUID());
        exam.setCourse(course);
        exam.setMaxMainQuestions(count);
        exam.setMaxFollowupQuestions(0);
        ExamSchedule schedule = new ExamSchedule();
        schedule.setId(UUID.randomUUID());
        schedule.setExam(exam);
        return schedule;
    }

    private List<Question> pool(int size) {
        List<Question> result = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            Question q = new Question();
            q.setId(UUID.randomUUID());
            q.setContent("Question " + i);
            result.add(q);
        }
        return result;
    }

    private AssignedQuestionRepository.QuestionUsage usage(Question question, OffsetDateTime time) {
        return new AssignedQuestionRepository.QuestionUsage() {
            public UUID getQuestionId() { return question.getId(); }
            public OffsetDateTime getLastAssignedAt() { return time; }
        };
    }
}
