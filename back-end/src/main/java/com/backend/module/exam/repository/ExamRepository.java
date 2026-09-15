package com.backend.module.exam.repository;

import com.backend.module.exam.entity.Exam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository truy xuất dữ liệu bảng exams.
 */
@Repository
public interface ExamRepository extends JpaRepository<Exam, UUID> {

    List<Exam> findByCreatedById(UUID createdById);
}
