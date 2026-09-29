package com.backend.module.exam.core.repository;

import com.backend.module.exam.core.entity.Exam;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ExamRepository extends JpaRepository<Exam, UUID> {
    @EntityGraph(attributePaths = "course")
    @Query("select e from Exam e where e.id = :id")
    Optional<Exam> findByIdWithDetails(@Param("id") UUID id);

    // Lock only the exam row (no outer fetch joins, which PostgreSQL cannot lock).
    // All exam/schedule/assignment writes acquire this lock first.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Exam e where e.id = :id")
    Optional<Exam> findByIdForUpdate(@Param("id") UUID id);

    @EntityGraph(attributePaths = "course")
    @Query("select e from Exam e")
    Page<Exam> findAllWithDetails(Pageable pageable);

    @EntityGraph(attributePaths = "course")
    @Query("""
            select e from Exam e where e.createdById = :lecturerId
            or exists (select cl.id from CourseLecturer cl
                       where cl.id.courseId = e.course.id and cl.id.lecturerId = :lecturerId)
            """)
    Page<Exam> findByLecturerAccess(@Param("lecturerId") UUID lecturerId, Pageable pageable);
}
