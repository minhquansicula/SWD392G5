package com.backend.module.reporting;

import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.exam.api.dto.ExamDetailDto;
import com.backend.module.exam.api.dto.ExamScheduleDto;
import com.backend.module.exam.api.service.ExamService;
import com.backend.module.reporting.api.dto.ExamReportDto;
import com.backend.module.reporting.api.dto.GradebookRowDto;
import com.backend.module.reporting.core.repository.QuestionResultRepository;
import com.backend.module.reporting.core.repository.QuestionResultRepository.CriterionMark;
import com.backend.module.reporting.core.repository.QuestionResultRepository.QuestionStat;
import com.backend.module.reporting.core.service.ReportServiceImpl;
import com.backend.shared.exception.AppException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportServiceImplTest {
    @Mock ExamService examService;
    @Mock QuestionResultRepository results;
    @InjectMocks ReportServiceImpl service;

    private final UUID examId = UUID.randomUUID();

    @Test
    void reportComputesGoodAnswerRatesAndKeepsUngradedQuestionsNull() {
        QuestionStat answered = stat(4L, 1L), ungraded = stat(0L, 0L);
        when(results.questionStats(eq(examId), any())).thenReturn(List.of(answered, ungraded));

        ExamReportDto report = service.getExamReport(examId);

        verify(examService).getExamById(examId);
        assertThat(report.getGoodAnswerRate()).isEqualTo(0.25);
        assertThat(report.getQuestions()).extracting("goodAnswerRate").containsExactly(0.25, null);
    }

    @Test
    void reportStopsWhenCallerCannotReadExam() {
        when(examService.getExamById(examId)).thenThrow(new AppException("no", HttpStatus.FORBIDDEN, "NOT_COURSE_LECTURER"));

        assertThatThrownBy(() -> service.getExamReport(examId)).isInstanceOf(AppException.class);
        verifyNoInteractions(results);
    }

    @Test
    void gradebookAttachesRubricMarksPerScheduleAndEmptyListWhenUngraded() {
        UUID graded = UUID.randomUUID(), pending = UUID.randomUUID();
        UserDto student = UserDto.builder().studentCode("SE1").fullName("An").email("an@fpt.edu.vn").build();
        when(examService.getExamDetail(examId)).thenReturn(ExamDetailDto.builder().schedules(List.of(
                ExamScheduleDto.builder().id(graded).student(student).status("COMPLETED").finalScore(new BigDecimal("8.7")).build(),
                ExamScheduleDto.builder().id(pending).status("PENDING").build())).build());
        CriterionMark mark = mock(CriterionMark.class);
        when(mark.getScheduleId()).thenReturn(graded);
        when(mark.getName()).thenReturn("Attitude");
        when(mark.getAssessed()).thenReturn(true);
        when(mark.getRationale()).thenReturn("Tốt.");
        when(mark.getImprovement()).thenReturn(" ");
        when(results.criterionMarks(examId)).thenReturn(List.of(mark));

        List<GradebookRowDto> rows = service.getGradebook(examId);

        assertThat(rows.get(0).getStudentCode()).isEqualTo("SE1");
        assertThat(rows.get(0).getCriteria()).singleElement()
                .satisfies(c -> assertThat(c.getComment()).isEqualTo("Tốt."))
                .satisfies(c -> assertThat(c.isAssessed()).isTrue());
        assertThat(rows.get(1).getStudentCode()).isNull();
        assertThat(rows.get(1).getCriteria()).isEmpty();
    }

    private static QuestionStat stat(Long graded, Long good) {
        QuestionStat stat = mock(QuestionStat.class);
        lenient().when(stat.getGradedCount()).thenReturn(graded);
        lenient().when(stat.getGoodCount()).thenReturn(good);
        lenient().when(stat.getAssignedCount()).thenReturn(graded);
        return stat;
    }
}
