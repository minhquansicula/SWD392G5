package com.backend.module.exam.service;

import com.backend.module.exam.dto.CourseResponse;
import com.backend.module.exam.dto.CreateCourseRequest;
import com.backend.module.exam.dto.UpdateCourseRequest;
import com.backend.module.exam.entity.Course;
import com.backend.module.exam.repository.CourseRepository;
import com.backend.shared.exception.DuplicateCourseCodeException;
import com.backend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service xử lý logic nghiệp vụ quản lý môn học (Course).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;

    /**
     * Tạo môn học mới.
     *
     * @param request thông tin môn học từ client
     * @return CourseResponse chứa thông tin môn học đã tạo
     * @throws DuplicateCourseCodeException nếu mã môn học đã tồn tại
     */
    @Transactional
    public CourseResponse createCourse(CreateCourseRequest request) {
        // 1. Kiểm tra trùng mã môn học
        if (courseRepository.existsByCourseCode(request.getCourseCode())) {
            throw new DuplicateCourseCodeException(request.getCourseCode());
        }

        // 2. Tạo entity Course
        Course course = new Course();
        course.setCourseCode(request.getCourseCode());
        course.setCourseName(request.getCourseName());

        // 3. Lưu vào database
        Course savedCourse = courseRepository.save(course);
        log.info("Đã tạo môn học mới: {} - {} (ID: {})",
                savedCourse.getCourseCode(), savedCourse.getCourseName(), savedCourse.getId());

        return toCourseResponse(savedCourse);
    }

    /**
     * Lấy danh sách toàn bộ môn học.
     *
     * @return danh sách CourseResponse
     */
    @Transactional(readOnly = true)
    public List<CourseResponse> getAllCourses() {
        return courseRepository.findAll().stream()
                .map(this::toCourseResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy thông tin chi tiết một môn học theo ID.
     *
     * @param id UUID của môn học
     * @return CourseResponse
     * @throws ResourceNotFoundException nếu không tìm thấy
     */
    @Transactional(readOnly = true)
    public CourseResponse getCourseById(UUID id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course", id));
        return toCourseResponse(course);
    }

    /**
     * Cập nhật thông tin môn học (partial update — chỉ update field không null).
     *
     * @param id      UUID của môn học cần cập nhật
     * @param request thông tin cập nhật từ client
     * @return CourseResponse chứa thông tin sau khi cập nhật
     * @throws ResourceNotFoundException    nếu không tìm thấy môn học
     * @throws DuplicateCourseCodeException nếu mã môn học mới bị trùng với bản ghi khác
     */
    @Transactional
    public CourseResponse updateCourse(UUID id, UpdateCourseRequest request) {
        // 1. Tìm Course theo ID
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course", id));

        // 2. Cập nhật courseCode nếu được gửi lên
        if (request.getCourseCode() != null) {
            // Kiểm tra trùng mã với bản ghi khác (loại trừ chính nó)
            if (courseRepository.existsByCourseCodeAndIdNot(request.getCourseCode(), id)) {
                throw new DuplicateCourseCodeException(request.getCourseCode());
            }
            course.setCourseCode(request.getCourseCode());
        }

        // 3. Cập nhật courseName nếu được gửi lên
        if (request.getCourseName() != null) {
            course.setCourseName(request.getCourseName());
        }

        // 4. Lưu vào database
        Course updatedCourse = courseRepository.save(course);
        log.info("Đã cập nhật môn học ID: {} → {} - {}",
                id, updatedCourse.getCourseCode(), updatedCourse.getCourseName());

        return toCourseResponse(updatedCourse);
    }

    /**
     * Xoá môn học theo ID.
     * Lưu ý: CASCADE sẽ xoá toàn bộ Questions và Exams thuộc Course này.
     *
     * @param id UUID của môn học cần xoá
     * @throws ResourceNotFoundException nếu không tìm thấy môn học
     */
    @Transactional
    public void deleteCourse(UUID id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course", id));

        courseRepository.delete(course);
        log.info("Đã xoá môn học: {} - {} (ID: {})",
                course.getCourseCode(), course.getCourseName(), id);
    }

    /**
     * Chuyển đổi entity Course sang DTO CourseResponse.
     */
    private CourseResponse toCourseResponse(Course course) {
        return CourseResponse.builder()
                .id(course.getId())
                .courseCode(course.getCourseCode())
                .courseName(course.getCourseName())
                .build();
    }
}
