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

    /**
     * Kiểm tra mã môn học đã tồn tại chưa (dùng khi tạo mới).
     */
    boolean existsByCourseCode(String courseCode);

    /**
     * Kiểm tra mã môn học đã tồn tại ở bản ghi khác chưa (dùng khi cập nhật, loại trừ chính nó).
     */
    boolean existsByCourseCodeAndIdNot(String courseCode, UUID id);
}
