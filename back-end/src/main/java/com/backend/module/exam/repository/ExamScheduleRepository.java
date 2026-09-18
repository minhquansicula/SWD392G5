package com.backend.module.exam.repository;

import com.backend.module.exam.entity.ExamSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Repository truy xuất dữ liệu bảng exam_schedules.
 */
@Repository
public interface ExamScheduleRepository extends JpaRepository<ExamSchedule, UUID> {

    /**
     * Kiểm tra xem bài thi có ca thi nào đang ở một trạng thái cụ thể hay không (ví dụ: IN_PROGRESS).
     */
    boolean existsByExamIdAndStatus(UUID examId, String status);

    /**
     * Đếm tổng số ca thi thuộc một bài thi.
     */
    long countByExamId(UUID examId);

    /**
     * Lấy danh sách các ca thi của một bài thi.
     */
    List<ExamSchedule> findByExamId(UUID examId);

    List<ExamSchedule> findByExamIdOrderByScheduledStartTimeAscIdAsc(UUID examId);

    List<ExamSchedule> findByExamIdInOrderByScheduledStartTimeAscIdAsc(List<UUID> examIds);

    List<ExamSchedule> findByStudentIdOrderByScheduledStartTimeAscIdAsc(UUID studentId);

    boolean existsByExamIdAndStatusNot(UUID examId, String status);

    @Query("""
            select s from ExamSchedule s where s.student.id = :studentId
            and s.scheduledStartTime < :end and s.scheduledEndTime > :start
            """)
    List<ExamSchedule> findStudentOverlaps(
            @Param("studentId") UUID studentId,
            @Param("start") OffsetDateTime start,
            @Param("end") OffsetDateTime end);
}
