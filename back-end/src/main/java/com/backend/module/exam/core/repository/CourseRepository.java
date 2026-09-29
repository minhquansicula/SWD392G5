package com.backend.module.exam.core.repository;

import com.backend.module.exam.core.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
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

    @Query("SELECT DISTINCT c FROM Course c LEFT JOIN FETCH c.lecturerAssignments a LEFT JOIN FETCH a.lecturer")
    List<Course> findAllWithLecturers();

    @Query("SELECT c FROM Course c LEFT JOIN FETCH c.lecturerAssignments a LEFT JOIN FETCH a.lecturer WHERE c.id = :id")
    Optional<Course> findByIdWithLecturers(@Param("id") UUID id);

    @Query("SELECT DISTINCT c FROM Course c LEFT JOIN FETCH c.lecturerAssignments a LEFT JOIN FETCH a.lecturer " +
           "WHERE EXISTS (SELECT cl.id FROM CourseLecturer cl WHERE cl.course = c AND cl.id.lecturerId = :lecturerId)")
    List<Course> findCoursesByLecturerId(@Param("lecturerId") UUID lecturerId);

    @Query("select count(cl) > 0 from CourseLecturer cl where cl.id.courseId = :courseId and cl.id.lecturerId = :lecturerId")
    boolean isLecturerAssigned(@Param("courseId") UUID courseId, @Param("lecturerId") UUID lecturerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Course c where c.id = :id")
    Optional<Course> findByIdForUpdate(@Param("id") UUID id);
}
