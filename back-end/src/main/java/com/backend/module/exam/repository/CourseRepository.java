package com.backend.module.exam.repository;

import com.backend.module.exam.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Repository truy xuất dữ liệu bảng courses.
 */
@Repository
public interface CourseRepository extends JpaRepository<Course, UUID> {
}
