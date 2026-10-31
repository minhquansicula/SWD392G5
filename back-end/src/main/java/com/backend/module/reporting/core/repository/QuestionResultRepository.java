package com.backend.module.reporting.core.repository;

import com.backend.module.reporting.core.entity.QuestionResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface QuestionResultRepository extends JpaRepository<QuestionResult, UUID> {
    interface QuestionStat {
        UUID getQuestionId();
        String getContent();
        String getTopic();
        String getDifficulty();
        Long getAssignedCount();
        Long getGradedCount();
        BigDecimal getAverageScore();
        Long getGoodCount();
    }

    // Effective score: a lecturer override wins over the AI score, normalised to a 10-point scale.
    @Query(nativeQuery = true, value = """
            SELECT aq.question_id AS "questionId", MIN(aq.content_snapshot) AS "content",
                   q.topic AS "topic", q.difficulty_level AS "difficulty",
                   COUNT(*) AS "assignedCount",
                   COUNT(COALESCE(qr.lecturer_score, qr.ai_score)) AS "gradedCount",
                   ROUND(AVG(COALESCE(qr.lecturer_score, qr.ai_score) * 10 / NULLIF(qr.max_score, 0)), 2) AS "averageScore",
                   COUNT(*) FILTER (WHERE COALESCE(qr.lecturer_score, qr.ai_score) * 10 / NULLIF(qr.max_score, 0) >= :goodScore) AS "goodCount"
            FROM exam_schedules s
            JOIN assigned_questions aq ON aq.exam_schedule_id = s.id
            JOIN questions q ON q.id = aq.question_id
            LEFT JOIN question_results qr ON qr.exam_schedule_id = s.id AND qr.question_id = aq.question_id
            WHERE s.exam_id = :examId AND s.status = 'COMPLETED'
            GROUP BY aq.question_id, q.topic, q.difficulty_level
            ORDER BY "averageScore" ASC NULLS LAST, "gradedCount" DESC
            """)
    List<QuestionStat> questionStats(@Param("examId") UUID examId, @Param("goodScore") BigDecimal goodScore);

    interface CriterionMark {
        UUID getScheduleId();
        String getName();
        BigDecimal getWeight();
        BigDecimal getScore();
        Boolean getAssessed();
        String getRationale();
        String getImprovement();
    }

    /** Rubric marks stored by the Python AI service in exam_schedules.ai_report, in rubric order. */
    @Query(nativeQuery = true, value = """
            SELECT s.id AS "scheduleId", c.item ->> 'name' AS "name",
                   CAST(c.item ->> 'weight' AS numeric) AS "weight",
                   CAST(c.item ->> 'score' AS numeric) AS "score",
                   CAST(c.item ->> 'assessed' AS boolean) AS "assessed",
                   c.item ->> 'rationale' AS "rationale", c.item ->> 'improvement' AS "improvement"
            FROM exam_schedules s
            CROSS JOIN LATERAL jsonb_array_elements(s.ai_report -> 'criteria') WITH ORDINALITY AS c(item, position)
            WHERE s.exam_id = :examId
            ORDER BY s.id, c.position
            """)
    List<CriterionMark> criterionMarks(@Param("examId") UUID examId);
}
