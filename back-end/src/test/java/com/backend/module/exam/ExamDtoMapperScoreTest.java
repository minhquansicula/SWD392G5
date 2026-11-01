package com.backend.module.exam;

import com.backend.module.auth.api.service.UserLookupService;
import com.backend.module.exam.core.entity.Exam;
import com.backend.module.exam.core.entity.ExamSchedule;
import com.backend.module.exam.core.repository.AssignedQuestionRepository;
import com.backend.module.exam.core.repository.ExamScheduleRepository;
import com.backend.module.exam.core.service.ExamDtoMapper;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ExamDtoMapperScoreTest {
    @Test void pendingReviewDoesNotShowStaleTotalAsFinal() {
        UserLookupService users = mock(UserLookupService.class);
        ExamScheduleRepository schedules = mock(ExamScheduleRepository.class);
        AssignedQuestionRepository assigned = mock(AssignedQuestionRepository.class);
        when(users.findUsersByIds(any())).thenReturn(Map.of());
        when(assigned.countByScheduleIds(any())).thenReturn(List.of());
        Exam exam = new Exam(); exam.setId(UUID.randomUUID());
        ExamSchedule schedule = new ExamSchedule(); schedule.setId(UUID.randomUUID()); schedule.setExam(exam);
        var grade = mock(ExamScheduleRepository.CriterionGrade.class);
        when(grade.getScheduleId()).thenReturn(schedule.getId());
        when(grade.getCriterionId()).thenReturn("concept");
        when(grade.getScore()).thenReturn(new BigDecimal("3"));
        when(schedules.criterionGrades(any())).thenReturn(List.of(grade));
        schedule.setFinalScore(new BigDecimal("7")); schedule.setLecturerTotalScore(new BigDecimal("9"));
        schedule.setLecturerTotalPending(true);
        var result = new ExamDtoMapper(users, schedules, assigned).schedules(List.of(schedule)).get(0);
        assertThat(result.getFinalScore()).isNull();
        assertThat(result.getLecturerTotalPending()).isTrue();
        assertThat(result.getLecturerCriteria()).singleElement().satisfies(mark -> {
            assertThat(mark.criterionId()).isEqualTo("concept");
            assertThat(mark.score()).isEqualByComparingTo("3");
        });
    }
}
