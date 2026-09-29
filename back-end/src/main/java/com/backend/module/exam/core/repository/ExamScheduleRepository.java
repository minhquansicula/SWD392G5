package com.backend.module.exam.core.repository;

import com.backend.module.exam.core.entity.ExamSchedule;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExamScheduleRepository extends JpaRepository<ExamSchedule, UUID> {
    @EntityGraph(attributePaths = {"exam", "exam.course"})
    List<ExamSchedule> findByExamIdOrderByScheduledStartTimeAscIdAsc(UUID examId);

    @EntityGraph(attributePaths = {"exam", "exam.course"})
    List<ExamSchedule> findByStudentIdOrderByScheduledStartTimeAscIdAsc(UUID studentId);

    @EntityGraph(attributePaths = {"exam", "exam.course"})
    @Query("select s from ExamSchedule s where s.id = :id")
    Optional<ExamSchedule> findByIdWithDetails(@Param("id") UUID id);

    // Scalar lookup avoids loading stale schedule state before acquiring the exam lock.
    @Query("select s.exam.id from ExamSchedule s where s.id = :id")
    Optional<UUID> findExamIdById(@Param("id") UUID id);

    boolean existsByExamIdAndStudentId(UUID examId, UUID studentId);
    boolean existsByExamIdAndStatusIn(UUID examId, Collection<String> statuses);

    interface StatusCount {
        UUID getExamId();
        String getStatus();
        long getTotal();
    }

    @Query("""
            select s.exam.id as examId, s.status as status, count(s) as total
            from ExamSchedule s where s.exam.id in :examIds group by s.exam.id, s.status
            """)
    List<StatusCount> countStatuses(@Param("examIds") Collection<UUID> examIds);
}
