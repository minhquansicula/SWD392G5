package com.backend.module.reporting;

import com.backend.module.exam.api.service.ExamService;
import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.api.service.AuthService;
import com.backend.module.exam.core.entity.ExamSchedule;
import com.backend.module.exam.core.entity.AssignedQuestion;
import com.backend.module.exam.core.entity.Question;
import com.backend.module.exam.core.repository.AssignedQuestionRepository;
import com.backend.module.exam.core.repository.ExamScheduleRepository;
import com.backend.module.reporting.core.repository.QuestionResultRepository;
import com.backend.module.reporting.core.entity.QuestionResult;
import com.backend.module.reporting.core.service.LecturerGradingService;
import com.backend.shared.exception.AppException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.List;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LecturerGradingServiceTest {
    @Mock ExamScheduleRepository schedules;
    @Mock AssignedQuestionRepository assignments;
    @Mock QuestionResultRepository results;
    @Mock ExamService exams;
    @Mock AuthService auth;
    @Mock JdbcTemplate jdbc;
    @InjectMocks LecturerGradingService service;
    UUID scheduleId = UUID.randomUUID(), examId = UUID.randomUUID();
    UUID lecturerId = UUID.randomUUID();

    @BeforeEach void authenticate() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("lecturer", "test", List.of()));
        lenient().when(auth.getCurrentUser("lecturer")).thenReturn(UserDto.builder().id(lecturerId).fullName("Lecturer").build());
    }

    @AfterEach void clearAuthentication() { SecurityContextHolder.clearContext(); }

    @Test void weightedRubricUsesLecturerScoreAndFallsBackToAi() throws Exception {
        ExamSchedule schedule = completedSchedule();
        java.sql.ResultSet rs = mock(java.sql.ResultSet.class);
        when(rs.getString("id")).thenReturn("concept", "analysis", "communication");
        when(rs.getBigDecimal("weight")).thenReturn(new BigDecimal("35"), new BigDecimal("35"), new BigDecimal("30"));
        when(rs.getBigDecimal("ai_score")).thenReturn(new BigDecimal("8"), new BigDecimal("6"), new BigDecimal("7"));
        when(rs.getBoolean("assessed")).thenReturn(true);
        when(jdbc.query(anyString(), any(org.springframework.jdbc.core.RowMapper.class), eq(scheduleId))).thenAnswer(inv -> {
            org.springframework.jdbc.core.RowMapper<?> mapper = inv.getArgument(1);
            return List.of(mapper.mapRow(rs, 0), mapper.mapRow(rs, 1), mapper.mapRow(rs, 2));
        });
        service.criteria(scheduleId, List.of(new LecturerGradingService.CriterionScore("concept", null),
                new LecturerGradingService.CriterionScore("analysis", new BigDecimal("9")),
                new LecturerGradingService.CriterionScore("communication", null)));
        assertThat(schedule.getLecturerTotalScore()).isEqualByComparingTo("8.05");
        assertThat(schedule.getFinalScore()).isEqualByComparingTo("7.50");
    }

    @Test void rejectsOutOfRangeAndIncompleteSchedules() {
        ExamSchedule schedule = new ExamSchedule();
        schedule.setStatus("COMPLETED");
        when(schedules.findExamIdById(scheduleId)).thenReturn(Optional.of(examId));
        when(schedules.findLockedById(scheduleId)).thenReturn(Optional.of(schedule));
        assertThatThrownBy(() -> service.total(scheduleId, new BigDecimal("10.01"))).isInstanceOf(AppException.class);
        schedule.setStatus("IN_PROGRESS");
        assertThatThrownBy(() -> service.total(scheduleId, BigDecimal.ONE)).isInstanceOf(AppException.class);
    }

    @Test void deniedExamCannotBeLockedOrChanged() {
        when(schedules.findExamIdById(scheduleId)).thenReturn(Optional.of(examId));
        when(exams.getExamById(examId)).thenThrow(new AppException("forbidden", org.springframework.http.HttpStatus.FORBIDDEN));
        assertThatThrownBy(() -> service.total(scheduleId, BigDecimal.ONE)).isInstanceOf(AppException.class);
        verify(schedules, never()).findLockedById(any());
        assertThatThrownBy(() -> service.history(scheduleId)).isInstanceOf(AppException.class);
        verifyNoInteractions(jdbc);
    }

    @Test void questionOverrideKeepsAiResultAndCanBeCleared() {
        UUID questionId = UUID.randomUUID();
        ExamSchedule schedule = new ExamSchedule(); schedule.setStatus("COMPLETED");
        Question question = new Question(); question.setId(questionId);
        AssignedQuestion assigned = new AssignedQuestion(); assigned.setQuestion(question);
        QuestionResult result = new QuestionResult(); result.setQuestionId(questionId); result.setAiScore(new BigDecimal("6")); result.setAiFeedback("AI");
        when(schedules.findExamIdById(scheduleId)).thenReturn(Optional.of(examId));
        when(schedules.findLockedById(scheduleId)).thenReturn(Optional.of(schedule));
        when(assignments.findByExamScheduleIdOrderByQuestionOrder(scheduleId)).thenReturn(List.of(assigned));
        when(results.findByExamScheduleIdAndQuestionId(scheduleId, questionId)).thenReturn(List.of(result));
        service.question(scheduleId, questionId, new BigDecimal("8"), "Review");
        assertThat(result.getAiScore()).isEqualByComparingTo("6");
        assertThat(result.getAiFeedback()).isEqualTo("AI");
        assertThat(result.getLecturerScore()).isEqualByComparingTo("8");
        assertThat(schedule.getLecturerTotalScore()).isNull();
        service.question(scheduleId, questionId, null, null);
        assertThat(result.getLecturerScore()).isNull();
        assertThat(result.getLecturerFeedback()).isNull();
        assertThat(schedule.getLecturerTotalScore()).isNull();
        verify(jdbc, times(2)).update(anyString(), eq(scheduleId), eq(questionId), eq(lecturerId), eq("Lecturer"), any(), any(), any(), any());
    }

    @Test void savingPartialReviewPreservesOldTotalButMarksItPending() {
        ExamSchedule schedule = completedSchedule();
        schedule.setLecturerTotalScore(new BigDecimal("8.25"));
        UUID q1 = UUID.randomUUID(), q2 = UUID.randomUUID();
        QuestionResult result = result(q1, "5", null, "10");
        when(assignments.findByExamScheduleIdOrderByQuestionOrder(scheduleId)).thenReturn(List.of(assigned(q1), assigned(q2)));
        when(results.findByExamScheduleIdAndQuestionId(scheduleId, q1)).thenReturn(List.of(result));
        service.question(scheduleId, q1, new BigDecimal("6"), "Review");
        assertThat(schedule.getLecturerTotalPending()).isNotEqualTo(true);
        assertThat(schedule.getLecturerTotalScore()).isEqualByComparingTo("8.25");
        assertThat(result.getLecturerScore()).isEqualByComparingTo("6");
    }

    private ExamSchedule completedSchedule() {
        ExamSchedule schedule = new ExamSchedule();
        schedule.setStatus("COMPLETED");
        schedule.setFinalScore(new BigDecimal("7.50"));
        when(schedules.findExamIdById(scheduleId)).thenReturn(Optional.of(examId));
        when(schedules.findLockedById(scheduleId)).thenReturn(Optional.of(schedule));
        return schedule;
    }

    private static AssignedQuestion assigned(UUID id) {
        Question question = new Question(); question.setId(id);
        AssignedQuestion result = new AssignedQuestion(); result.setQuestion(question);
        return result;
    }

    private static QuestionResult result(UUID id, String ai, String lecturer, String max) {
        QuestionResult result = new QuestionResult(); result.setQuestionId(id);
        result.setAiScore(ai == null ? null : new BigDecimal(ai));
        result.setLecturerScore(lecturer == null ? null : new BigDecimal(lecturer));
        result.setMaxScore(new BigDecimal(max));
        return result;
    }
}
