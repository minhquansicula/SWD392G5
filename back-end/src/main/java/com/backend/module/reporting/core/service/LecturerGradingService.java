package com.backend.module.reporting.core.service;

import com.backend.module.exam.api.service.ExamService;
import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.api.service.AuthService;
import com.backend.module.exam.core.entity.ExamSchedule;
import com.backend.module.exam.core.entity.AssignedQuestion;
import com.backend.module.exam.core.repository.AssignedQuestionRepository;
import com.backend.module.exam.core.repository.ExamScheduleRepository;
import com.backend.module.reporting.core.entity.QuestionResult;
import com.backend.module.reporting.core.repository.QuestionResultRepository;
import com.backend.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class LecturerGradingService {
    private final ExamScheduleRepository schedules;
    private final AssignedQuestionRepository assignments;
    private final QuestionResultRepository results;
    private final ExamService exams;
    private final AuthService auth;
    private final JdbcTemplate jdbc;

    public record HistoryEntry(UUID id, UUID questionId, String criterionId, UUID lecturerId, String lecturerName,
                               BigDecimal oldScore, BigDecimal newScore, String oldFeedback,
                               String newFeedback, OffsetDateTime changedAt) {}
    public record CriterionScore(String criterionId, BigDecimal score) {}
    private record RubricCriterion(String id, BigDecimal weight, BigDecimal aiScore, boolean assessed) {}

    @Transactional
    public void criteria(UUID scheduleId, List<CriterionScore> submitted) {
        ExamSchedule schedule = authorized(scheduleId);
        List<RubricCriterion> rubric = jdbc.query("""
                SELECT item ->> 'criterion_id' AS id, CAST(item ->> 'weight' AS numeric) AS weight,
                       CAST(item ->> 'score' AS numeric) AS ai_score, CAST(item ->> 'assessed' AS boolean) AS assessed
                FROM exam_schedules s CROSS JOIN LATERAL jsonb_array_elements(
                    CASE WHEN jsonb_typeof(s.ai_report -> 'criteria') = 'array' THEN s.ai_report -> 'criteria' ELSE '[]'::jsonb END
                ) item WHERE s.id = ?
                """, (rs, n) -> new RubricCriterion(rs.getString("id"), rs.getBigDecimal("weight"),
                rs.getBigDecimal("ai_score"), rs.getBoolean("assessed")), scheduleId);
        if (rubric.isEmpty() || submitted == null) throw new AppException("Không có tiêu chí hợp lệ để lưu.", BAD_REQUEST);
        Map<String, BigDecimal> marks = new HashMap<>();
        for (CriterionScore entry : submitted) {
            if (entry == null || entry.criterionId() == null || entry.criterionId().isBlank()
                    || marks.containsKey(entry.criterionId())) throw new AppException("Danh sách tiêu chí không hợp lệ.", BAD_REQUEST);
            validate(entry.score(), BigDecimal.TEN);
            marks.put(entry.criterionId(), entry.score());
        }
        var ids = new java.util.HashSet<String>();
        BigDecimal weights = BigDecimal.ZERO;
        for (RubricCriterion c : rubric) {
            if (c.id() == null || c.id().isBlank() || c.id().length() > 100 || !ids.add(c.id())
                    || c.weight() == null || c.weight().signum() <= 0 || c.weight().compareTo(new BigDecimal("100")) > 0)
                throw new AppException("Rubric không hợp lệ, không thể tính điểm.", CONFLICT);
            weights = weights.add(c.weight());
        }
        if (!ids.equals(marks.keySet()) || weights.compareTo(new BigDecimal("100")) != 0)
            throw new AppException("Danh sách hoặc trọng số tiêu chí không hợp lệ.", CONFLICT);
        boolean reviewed = marks.values().stream().anyMatch(java.util.Objects::nonNull);
        BigDecimal total = null;
        if (reviewed) {
            BigDecimal sum = BigDecimal.ZERO;
            for (RubricCriterion c : rubric) {
                BigDecimal score = marks.get(c.id());
                if (score == null && c.assessed()) score = c.aiScore();
                if (score == null || score.signum() < 0 || score.compareTo(BigDecimal.TEN) > 0)
                    throw new AppException("Còn tiêu chí chưa có điểm AI; hãy nhập điểm giảng viên trước khi lưu.", CONFLICT);
                sum = sum.add(score.multiply(c.weight()));
            }
            total = sum.divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        }
        Map<String, BigDecimal> previous = new HashMap<>();
        jdbc.query("SELECT criterion_id, score FROM lecturer_criterion_grades WHERE exam_schedule_id = ?",
                (org.springframework.jdbc.core.RowCallbackHandler) rs -> { previous.put(rs.getString(1), rs.getBigDecimal(2)); }, scheduleId);
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) throw new AppException("Authentication is required", UNAUTHORIZED);
        UserDto user = auth.getCurrentUser(authentication.getName());
        for (RubricCriterion c : rubric) {
            BigDecimal before = previous.get(c.id()), after = marks.get(c.id());
            if (before == null ? after == null : after != null && before.compareTo(after) == 0) continue;
            if (after == null) {
                jdbc.update("DELETE FROM lecturer_criterion_grades WHERE exam_schedule_id = ? AND criterion_id = ?", scheduleId, c.id());
            } else {
                jdbc.update("""
                        INSERT INTO lecturer_criterion_grades(exam_schedule_id, criterion_id, score, graded_by)
                        VALUES (?, ?, ?, ?) ON CONFLICT (exam_schedule_id, criterion_id)
                        DO UPDATE SET score = EXCLUDED.score, graded_by = EXCLUDED.graded_by, graded_at = clock_timestamp()
                        """, scheduleId, c.id(), after, user.getId());
            }
            jdbc.update("""
                    INSERT INTO lecturer_grading_history(exam_schedule_id, criterion_id, lecturer_id, lecturer_name, old_score, new_score)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, scheduleId, c.id(), user.getId(), user.getFullName() == null ? "Unknown" : user.getFullName(), before, after);
        }
        audit(scheduleId, null, schedule.getLecturerTotalScore(), total, null, null);
        schedule.setLecturerTotalScore(total);
        schedule.setLecturerTotalPending(false);
    }

    @Transactional
    public void total(UUID scheduleId, BigDecimal score) {
        authorized(scheduleId);
        throw new AppException("Hãy lưu điểm theo tiêu chí rubric.", CONFLICT);
    }

    @Transactional
    public void calculateTotal(UUID scheduleId) {
        authorized(scheduleId);
        throw new AppException("Hãy lưu điểm theo tiêu chí rubric.", CONFLICT);
    }

    @Transactional
    public void question(UUID scheduleId, UUID questionId, BigDecimal score, String feedback) {
        ExamSchedule schedule = authorized(scheduleId);
        List<AssignedQuestion> assigned = assignments.findByExamScheduleIdOrderByQuestionOrder(scheduleId);
        if (assigned.stream()
                .noneMatch(a -> a.getQuestion().getId().equals(questionId)))
            throw new AppException("Question is not assigned to this schedule", NOT_FOUND);
        if (feedback != null && feedback.length() > 5000)
            throw new AppException("Feedback exceeds 5000 characters", BAD_REQUEST);
        var matches = results.findByExamScheduleIdAndQuestionId(scheduleId, questionId);
        if (matches.size() > 1) throw new AppException("Duplicate question results require review", CONFLICT);
        if (matches.isEmpty() && score == null && (feedback == null || feedback.isBlank())) return;
        QuestionResult result = matches.isEmpty() ? new QuestionResult() : matches.get(0);
        if (matches.isEmpty()) { result.setExamScheduleId(schedule.getId()); result.setQuestionId(questionId); }
        validate(score, result.getMaxScore() == null ? BigDecimal.TEN : result.getMaxScore());
        String newFeedback = feedback == null || feedback.isBlank() ? null : feedback.trim();
        audit(scheduleId, questionId, result.getLecturerScore(), score, result.getLecturerFeedback(), newFeedback);
        result.setLecturerScore(score);
        result.setLecturerFeedback(newFeedback);
        results.save(result);
    }

    @Transactional(readOnly = true)
    public List<HistoryEntry> history(UUID scheduleId) {
        UUID examId = schedules.findExamIdById(scheduleId).orElseThrow(() -> new AppException("Schedule not found", NOT_FOUND));
        exams.getExamById(examId);
        return jdbc.query("""
                SELECT id, question_id, criterion_id, lecturer_id, lecturer_name, old_score, new_score,
                       old_feedback, new_feedback, changed_at
                FROM lecturer_grading_history WHERE exam_schedule_id = ?
                ORDER BY changed_at DESC, id DESC LIMIT 100
                """, (rs, n) -> new HistoryEntry(rs.getObject("id", UUID.class),
                rs.getObject("question_id", UUID.class), rs.getString("criterion_id"), rs.getObject("lecturer_id", UUID.class),
                rs.getString("lecturer_name"), rs.getBigDecimal("old_score"), rs.getBigDecimal("new_score"),
                rs.getString("old_feedback"), rs.getString("new_feedback"), rs.getObject("changed_at", OffsetDateTime.class)), scheduleId);
    }

    private void audit(UUID scheduleId, UUID questionId, BigDecimal oldScore, BigDecimal newScore, String oldFeedback, String newFeedback) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) throw new AppException("Authentication is required", UNAUTHORIZED);
        UserDto user = auth.getCurrentUser(authentication.getName());
        jdbc.update("""
                INSERT INTO lecturer_grading_history
                (exam_schedule_id, question_id, lecturer_id, lecturer_name, old_score, new_score, old_feedback, new_feedback)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, scheduleId, questionId, user.getId(), user.getFullName() == null ? "Unknown" : user.getFullName(),
                oldScore, newScore, oldFeedback, newFeedback);
    }

    private ExamSchedule authorized(UUID id) {
        // Authorize before locking so unauthorized users cannot lock another exam's schedule.
        UUID examId = schedules.findExamIdById(id).orElseThrow(() -> new AppException("Schedule not found", NOT_FOUND));
        exams.getExamById(examId);
        ExamSchedule schedule = schedules.findLockedById(id).orElseThrow(() -> new AppException("Schedule not found", NOT_FOUND));
        if (!"COMPLETED".equals(schedule.getStatus())) throw new AppException("Schedule is not completed", BAD_REQUEST);
        return schedule;
    }

    private void validate(BigDecimal score, BigDecimal max) {
        if (score != null && (score.signum() < 0 || score.compareTo(max) > 0 || score.stripTrailingZeros().scale() > 2))
            throw new AppException("Invalid score", BAD_REQUEST);
    }
}
