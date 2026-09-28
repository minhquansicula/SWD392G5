package com.backend.module.exam.core.repository;

import com.backend.module.exam.core.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface QuestionRepository extends JpaRepository<Question, UUID> {
    List<Question> findByCourseId(UUID courseId);
    long countByCourseId(UUID courseId);
}
