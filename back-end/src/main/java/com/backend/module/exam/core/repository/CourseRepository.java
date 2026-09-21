package com.backend.module.exam.core.repository;

import com.backend.module.exam.core.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseRepository extends JpaRepository<Course, UUID> {
    Optional<Course> findByCourseCode(String courseCode);
    boolean existsByCourseCode(String courseCode);
    boolean existsByCourseCodeAndIdNot(String courseCode, UUID id);

    @Query("SELECT DISTINCT c FROM Course c LEFT JOIN FETCH c.lecturers")
    List<Course> findAllWithLecturers();

    @Query("SELECT c FROM Course c LEFT JOIN FETCH c.lecturers WHERE c.id = :id")
    Optional<Course> findByIdWithLecturers(@Param("id") UUID id);

    @Query("SELECT c FROM Course c JOIN c.lecturers l WHERE l.id = :lecturerId")
    List<Course> findCoursesByLecturerId(@Param("lecturerId") UUID lecturerId);
}
