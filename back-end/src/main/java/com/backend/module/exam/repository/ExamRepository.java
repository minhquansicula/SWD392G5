package com.backend.module.exam.repository;

import com.backend.module.exam.entity.Exam;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository truy xuất dữ liệu bảng exams.
 */
@Repository
public interface ExamRepository extends JpaRepository<Exam, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Exam e where e.id = :id")
    Optional<Exam> findByIdForUpdate(@Param("id") UUID id);

    List<Exam> findByCreatedById(UUID createdById);

    /**
     * Lấy danh sách bài thi theo môn học, sắp xếp theo thời gian bắt đầu giảm dần.
     */
    List<Exam> findByCourseIdOrderByStartDateDesc(UUID courseId);

    /**
     * Lấy toàn bộ danh sách bài thi, sắp xếp theo thời gian bắt đầu giảm dần.
     */
    List<Exam> findAllByOrderByStartDateDesc();
}
