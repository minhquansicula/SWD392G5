package com.backend.module.exam.core.service;

import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.exam.api.dto.*;
import com.backend.module.exam.api.service.ExamService;
import com.backend.module.exam.core.entity.*;
import com.backend.module.exam.core.repository.*;
import com.backend.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExamServiceImpl implements ExamService {
    private final ExamRepository exams;
    private final CourseRepository courses;
    private final ExamScheduleRepository schedules;
    private final AssignedQuestionRepository assignments;
    private final ExamAccessService access;
    private final ExamDtoMapper mapper;

    @Override
    @Transactional
    public ExamDto createExam(CreateExamRequest request) {
        UserDto user = access.manager();
        Course course = courses.findById(request.getCourseId())
                .orElseThrow(() -> new AppException("Course not found", NOT_FOUND, "COURSE_NOT_FOUND"));
        if (!access.isAdmin(user) && !courses.isLecturerAssigned(course.getId(), user.getId())) {
            throw new AppException("You are not assigned to this course", FORBIDDEN, "NOT_COURSE_LECTURER");
        }
        OffsetDateTime start = ExamRules.timestamp(request.getStartDate());
        OffsetDateTime end = ExamRules.timestamp(request.getEndDate());
        ExamRules.title(request.getTitle());
        ExamRules.dateRange(start, end);
        ExamRules.questionLimits(request.getMaxMainQuestions(), request.getMaxFollowupQuestions());
        if (!start.isAfter(OffsetDateTime.now())) {
            throw new AppException("Start date must be in the future", BAD_REQUEST, "START_DATE_IN_PAST");
        }
        Exam exam = new Exam();
        exam.setId(UUID.randomUUID());
        exam.setCourse(course);
        exam.setCreatedById(user.getId());
        exam.setTitle(request.getTitle().trim());
        exam.setStartDate(start);
        exam.setEndDate(end);
        exam.setMaxMainQuestions(request.getMaxMainQuestions());
        exam.setMaxFollowupQuestions(request.getMaxFollowupQuestions());
        return dto(exams.save(exam));
    }

    @Override
    @Transactional
    public ExamDto updateExam(UUID examId, UpdateExamRequest request) {
        UserDto user = access.manager();
        Exam exam = lockedExam(examId);
        access.requireOwner(exam, user);
        String title = request.getTitle() == null ? exam.getTitle() : request.getTitle();
        OffsetDateTime start = request.getStartDate() == null ? exam.getStartDate() : ExamRules.timestamp(request.getStartDate());
        OffsetDateTime end = request.getEndDate() == null ? exam.getEndDate() : ExamRules.timestamp(request.getEndDate());
        Integer main = request.getMaxMainQuestions() == null ? exam.getMaxMainQuestions() : request.getMaxMainQuestions();
        Integer followup = request.getMaxFollowupQuestions() == null ? exam.getMaxFollowupQuestions() : request.getMaxFollowupQuestions();
        ExamRules.title(title);
        ExamRules.dateRange(start, end);
        ExamRules.questionLimits(main, followup);
        boolean limitsChanged = !Objects.equals(main, exam.getMaxMainQuestions())
                || !Objects.equals(followup, exam.getMaxFollowupQuestions());
        if (limitsChanged && (hasActiveSchedules(examId) || assignments.existsByExamScheduleExamId(examId))) {
            throw new AppException("Cannot modify question limits after questions are assigned or the exam is active",
                    BAD_REQUEST, "CANNOT_MODIFY_ACTIVE_EXAM");
        }
        if (!start.isEqual(exam.getStartDate()) || !end.isEqual(exam.getEndDate())) {
            for (ExamSchedule schedule : schedules.findByExamIdOrderByScheduledStartTimeAscIdAsc(examId)) {
                if ((schedule.getScheduledStartTime() != null && schedule.getScheduledStartTime().isBefore(start))
                        || (schedule.getScheduledEndTime() != null && schedule.getScheduledEndTime().isAfter(end))) {
                    throw new AppException("New exam dates exclude an existing schedule", BAD_REQUEST, "SCHEDULE_TIME_OUT_OF_RANGE");
                }
            }
        }
        exam.setTitle(title.trim());
        exam.setStartDate(start);
        exam.setEndDate(end);
        exam.setMaxMainQuestions(main);
        exam.setMaxFollowupQuestions(followup);
        return dto(exam);
    }

    @Override
    @Transactional
    public void deleteExam(UUID examId) {
        UserDto user = access.manager();
        Exam exam = lockedExam(examId);
        access.requireOwner(exam, user);
        if (hasActiveSchedules(examId)) {
            throw new AppException("Cannot delete an exam with active or completed schedules",
                    BAD_REQUEST, "EXAM_HAS_ACTIVE_SCHEDULES");
        }
        exams.delete(exam);
    }

    @Override
    public ExamDto getExamById(UUID examId) {
        Exam exam = readableExam(examId);
        return dto(exam);
    }

    @Override
    public ExamDetailDto getExamDetail(UUID examId) {
        Exam exam = readableExam(examId);
        return ExamDetailDto.builder().exam(dto(exam))
                .schedules(mapper.schedules(schedules.findByExamIdOrderByScheduledStartTimeAscIdAsc(examId))).build();
    }

    @Override
    public Page<ExamDto> getExams(Pageable pageable) {
        UserDto user = access.manager();
        Set<String> sortable = Set.of("id", "title", "startDate", "endDate", "maxMainQuestions", "maxFollowupQuestions");
        if (pageable.isUnpaged() || pageable.getPageSize() > 100
                || pageable.getSort().stream().anyMatch(o -> !sortable.contains(o.getProperty()))) {
            throw new AppException("Use page size 1-100 and a supported exam sort field", BAD_REQUEST, "VALIDATION_FAILED");
        }
        Sort sort = pageable.getSort().isUnsorted() ? Sort.by("startDate").descending() : pageable.getSort();
        if (sort.getOrderFor("id") == null) sort = sort.and(Sort.by("id"));
        Pageable stablePage = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
        Page<Exam> page = access.isAdmin(user) ? exams.findAllWithDetails(stablePage)
                : exams.findByLecturerAccess(user.getId(), stablePage);
        Map<UUID, ExamDto> dtos = mapper.exams(page.getContent());
        return page.map(e -> dtos.get(e.getId()));
    }

    private Exam readableExam(UUID id) {
        UserDto user = access.manager();
        Exam exam = exams.findByIdWithDetails(id)
                .orElseThrow(() -> new AppException("Exam not found", NOT_FOUND, "EXAM_NOT_FOUND"));
        access.requireRead(exam, user);
        return exam;
    }

    private Exam lockedExam(UUID id) {
        return exams.findByIdForUpdate(id)
                .orElseThrow(() -> new AppException("Exam not found", NOT_FOUND, "EXAM_NOT_FOUND"));
    }

    private boolean hasActiveSchedules(UUID id) {
        return schedules.existsByExamIdAndStatusIn(id, List.of("IN_PROGRESS", "COMPLETED"));
    }

    private ExamDto dto(Exam exam) {
        return mapper.exams(List.of(exam)).get(exam.getId());
    }
}
