package com.backend.module.exam.repository;

import com.backend.module.exam.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository truy xuất dữ liệu bảng questions.
 */
@Repository
public interface QuestionRepository extends JpaRepository<Question, UUID> {

    /**
     * Lấy danh sách câu hỏi theo môn học.
     */
    List<Question> findByCourseId(UUID courseId);

    /**
     * Lấy danh sách câu hỏi theo môn học và mức độ khó.
     */
    List<Question> findByCourseIdAndDifficultyLevel(UUID courseId, String difficultyLevel);

    /**
     * Lấy danh sách câu hỏi theo mức độ khó.
     */
    List<Question> findByDifficultyLevel(String difficultyLevel);

    /**
     * Đếm tổng số câu hỏi thuộc một môn học.
     */
    long countByCourseId(UUID courseId);
}
