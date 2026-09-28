package com.backend.module.exam.core.repository;

import com.backend.module.exam.core.entity.AssignedQuestion;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface AssignedQuestionRepository extends JpaRepository<AssignedQuestion, UUID> {
    @EntityGraph(attributePaths = "question")
    List<AssignedQuestion> findByExamScheduleIdOrderByQuestionOrder(UUID scheduleId);

    boolean existsByExamScheduleId(UUID scheduleId);
    boolean existsByExamScheduleExamId(UUID examId);

    interface QuestionUsage {
        UUID getQuestionId();
        OffsetDateTime getLastAssignedAt();
    }

    @Query("""
            select a.question.id as questionId, max(a.assignedAt) as lastAssignedAt
            from AssignedQuestion a where a.examSchedule.exam.id = :examId group by a.question.id
            """)
    List<QuestionUsage> findQuestionUsage(@Param("examId") UUID examId);

    interface ScheduleCount {
        UUID getScheduleId();
        long getTotal();
    }

    @Query("""
            select a.examSchedule.id as scheduleId, count(a) as total from AssignedQuestion a
            where a.examSchedule.id in :scheduleIds group by a.examSchedule.id
            """)
    List<ScheduleCount> countByScheduleIds(@Param("scheduleIds") Collection<UUID> scheduleIds);
}
