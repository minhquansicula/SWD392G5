package com.backend.module.reporting.core.service;

import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.exam.api.dto.ExamScheduleDto;
import com.backend.module.exam.api.service.ExamService;
import com.backend.module.reporting.api.dto.CriterionMarkDto;
import com.backend.module.reporting.api.dto.ExamReportDto;
import com.backend.module.reporting.api.dto.GradebookRowDto;
import com.backend.module.reporting.api.dto.QuestionStatDto;
import com.backend.module.reporting.api.service.ReportService;
import com.backend.module.reporting.core.repository.QuestionResultRepository;
import com.backend.module.reporting.core.repository.QuestionResultRepository.CriterionMark;
import com.backend.module.reporting.core.repository.QuestionResultRepository.QuestionStat;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {
    /** An answer scoring at least 7/10 counts as a good answer. */
    static final BigDecimal GOOD_ANSWER_SCORE = new BigDecimal("7.0");

    private final ExamService examService;
    private final QuestionResultRepository results;

    @Override
    public ExamReportDto getExamReport(UUID examId) {
        examService.getExamById(examId); // enforces lecturer/admin read access to the exam
        List<QuestionStat> stats = results.questionStats(examId, GOOD_ANSWER_SCORE);
        long graded = stats.stream().mapToLong(QuestionStat::getGradedCount).sum();
        long good = stats.stream().mapToLong(QuestionStat::getGoodCount).sum();
        return ExamReportDto.builder()
                .goodAnswerScore(GOOD_ANSWER_SCORE)
                .goodAnswerRate(rate(good, graded))
                .questions(stats.stream().map(s -> QuestionStatDto.builder()
                        .questionId(s.getQuestionId()).content(s.getContent()).topic(s.getTopic())
                        .difficulty(s.getDifficulty()).assignedCount(s.getAssignedCount())
                        .gradedCount(s.getGradedCount()).averageScore(s.getAverageScore())
                        .goodAnswerRate(rate(s.getGoodCount(), s.getGradedCount())).build()).toList())
                .build();
    }

    @Override
    public List<GradebookRowDto> getGradebook(UUID examId) {
        List<ExamScheduleDto> schedules = examService.getExamDetail(examId).getSchedules();
        Map<UUID, List<CriterionMarkDto>> marks = results.criterionMarks(examId).stream()
                .collect(Collectors.groupingBy(CriterionMark::getScheduleId,
                        Collectors.mapping(ReportServiceImpl::mark, Collectors.toList())));
        return schedules.stream().map(s -> {
            UserDto student = s.getStudent();
            return GradebookRowDto.builder()
                    .scheduleId(s.getId())
                    .studentCode(student == null ? null : student.getStudentCode())
                    .fullName(student == null ? null : student.getFullName())
                    .email(student == null ? null : student.getEmail())
                    .status(s.getStatus())
                    .finalScore(s.getFinalScore())
                    .criteria(marks.getOrDefault(s.getId(), List.of()))
                    .build();
        }).toList();
    }

    private static CriterionMarkDto mark(CriterionMark m) {
        String comment = Stream.of(m.getRationale(), m.getImprovement())
                .filter(text -> text != null && !text.isBlank())
                .collect(Collectors.joining(" "));
        return CriterionMarkDto.builder()
                .name(m.getName()).weight(m.getWeight()).score(m.getScore())
                .assessed(Boolean.TRUE.equals(m.getAssessed()))
                .comment(comment.isEmpty() ? null : comment)
                .build();
    }

    private static Double rate(long part, long total) {
        return total == 0 ? null : (double) part / total;
    }
}
