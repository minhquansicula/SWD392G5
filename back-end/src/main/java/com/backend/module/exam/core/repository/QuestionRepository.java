package com.backend.module.exam.core.repository;

import com.backend.module.exam.core.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuestionRepository extends JpaRepository<Question, UUID> {
    List<Question> findByCourseId(UUID courseId);
    long countByCourseId(UUID courseId);

    @Query("SELECT q FROM Question q JOIN FETCH q.course c WHERE q.id = :id")
    Optional<Question> findByIdWithCourse(@Param("id") UUID id);

    @Query("SELECT q FROM Question q JOIN FETCH q.course c WHERE " +
           "(:courseId IS NULL OR q.course.id = :courseId) AND " +
           "(:difficulty IS NULL OR :difficulty = '' OR LOWER(q.difficultyLevel) = LOWER(:difficulty)) AND " +
           "(:topic IS NULL OR :topic = '' OR LOWER(COALESCE(q.topic, '')) LIKE LOWER(CONCAT('%', :topic, '%'))) AND " +
           "(:query IS NULL OR :query = '' OR LOWER(q.content) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Question> searchQuestions(
            @Param("courseId") UUID courseId,
            @Param("difficulty") String difficulty,
            @Param("topic") String topic,
            @Param("query") String query
    );
}
