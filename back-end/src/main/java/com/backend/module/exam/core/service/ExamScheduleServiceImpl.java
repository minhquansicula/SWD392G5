package com.backend.module.exam.core.service;

import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.api.service.UserLookupService;
import com.backend.module.exam.api.dto.*;
import com.backend.module.exam.api.service.ExamScheduleService;
import com.backend.module.exam.core.entity.*;
import com.backend.module.exam.core.repository.*;
import com.backend.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExamScheduleServiceImpl implements ExamScheduleService {
    private final ExamRepository exams;
    private final ExamScheduleRepository schedules;
    private final AssignedQuestionRepository assignments;
    private final UserLookupService users;
    private final QuestionAssignmentService questionAssignment;
    private final ExamAccessService access;
    private final ExamDtoMapper mapper;

    @Override
    @Transactional
    public List<ExamScheduleDto> addStudentsToExam(UUID examId, AddStudentsRequest request) {
        UserDto user = access.manager();
        Exam exam = lockedExam(examId);
        access.requireOwner(exam, user);
        if (request.getStudents() == null || request.getStudents().isEmpty()
                || request.getStudents().stream().anyMatch(e -> e == null || e.getStudentId() == null)) {
            throw new AppException("A non-empty list of student schedules is required", BAD_REQUEST, "VALIDATION_FAILED");
        }
        List<UUID> ids = request.getStudents().stream().map(AddStudentsRequest.StudentScheduleEntry::getStudentId).toList();
        if (new HashSet<>(ids).size() != ids.size()) {
            throw new AppException("Student occurs more than once in the request", BAD_REQUEST, "STUDENT_ALREADY_SCHEDULED");
        }
        Map<UUID, UserDto> students = users.findUsersByIds(ids);
        List<ExamSchedule> created = new ArrayList<>();
        for (AddStudentsRequest.StudentScheduleEntry entry : request.getStudents()) {
            UserDto student = students.get(entry.getStudentId());
            if (student == null) {
                throw new AppException("Student not found: " + entry.getStudentId(), NOT_FOUND, "STUDENT_NOT_FOUND");
            }
            if (!"STUDENT".equals(student.getRole())) {
                throw new AppException("User is not a student: " + student.getUsername(), BAD_REQUEST, "NOT_A_STUDENT");
            }
            if (schedules.existsByExamIdAndStudentId(examId, student.getId())) {
                throw new AppException("Student already has a schedule in this exam", BAD_REQUEST, "STUDENT_ALREADY_SCHEDULED");
            }
            OffsetDateTime start = ExamRules.timestamp(entry.getScheduledStartTime());
            OffsetDateTime end = ExamRules.timestamp(entry.getScheduledEndTime());
            ExamRules.scheduleTime(start, end, exam);
            if (schedules.hasOverlappingSchedule(student.getId(), start, end, null)) {
                throw new AppException("Student @" + student.getUsername() + " already has a conflicting schedule in this time range",
                        CONFLICT, "STUDENT_SCHEDULE_CONFLICT");
            }
            ExamSchedule schedule = new ExamSchedule();
            schedule.setExam(exam);
            schedule.setStudentId(student.getId());
            schedule.setScheduledStartTime(start);
            schedule.setScheduledEndTime(end);
            created.add(schedule);
        }
        // Validate the entire batch before writing; the transaction is all-or-nothing.
        return mapper.schedules(schedules.saveAll(created));
    }

    @Override
    @Transactional
    public ExamScheduleDto updateSchedule(UUID scheduleId, UpdateScheduleRequest request) {
        UserDto user = access.manager();
        ExamSchedule schedule = lockedSchedule(scheduleId);
        access.requireOwner(schedule.getExam(), user);
        ExamRules.pending(schedule);
        OffsetDateTime start = ExamRules.timestamp(request.getScheduledStartTime());
        OffsetDateTime end = ExamRules.timestamp(request.getScheduledEndTime());
        ExamRules.scheduleTime(start, end, schedule.getExam());
        if (schedules.hasOverlappingSchedule(schedule.getStudentId(), start, end, schedule.getId())) {
            throw new AppException("Student already has a conflicting schedule in this time range",
                    CONFLICT, "STUDENT_SCHEDULE_CONFLICT");
        }
        schedule.setScheduledStartTime(start);
        schedule.setScheduledEndTime(end);
        return dto(schedule);
    }

    @Override
    @Transactional
    public void removeStudentFromExam(UUID scheduleId) {
        UserDto user = access.manager();
        ExamSchedule schedule = lockedSchedule(scheduleId);
        access.requireOwner(schedule.getExam(), user);
        ExamRules.pending(schedule);
        schedules.delete(schedule);
    }

    @Override
    public List<ExamScheduleDto> getSchedulesByExamId(UUID examId) {
        UserDto user = access.manager();
        Exam exam = exams.findByIdWithDetails(examId)
                .orElseThrow(() -> new AppException("Exam not found", NOT_FOUND, "EXAM_NOT_FOUND"));
        access.requireRead(exam, user);
        return mapper.schedules(schedules.findByExamIdOrderByScheduledStartTimeAscIdAsc(examId));
    }

    @Override
    public List<ExamScheduleDto> getMySchedules() {
        UserDto user = access.currentUser();
        if (!"STUDENT".equals(user.getRole())) {
            throw new AppException("Student access is required", FORBIDDEN, "FORBIDDEN");
        }
        return mapper.schedules(schedules.findByStudentIdOrderByScheduledStartTimeAscIdAsc(user.getId()));
    }

    @Override
    public ExamScheduleDto getScheduleById(UUID scheduleId) {
        UserDto user = access.currentUser();
        ExamSchedule schedule = schedule(scheduleId);
        requireScheduleRead(schedule, user);
        return dto(schedule);
    }

    @Override
    @Transactional
    public QuestionAssignmentResultDto assignQuestionsToSchedule(UUID scheduleId) {
        UserDto user = access.manager();
        ExamSchedule schedule = lockedSchedule(scheduleId);
        access.requireOwner(schedule.getExam(), user);
        return questionAssignment.assignQuestions(schedule);
    }

    @Override
    @Transactional
    public List<QuestionAssignmentResultDto> assignAllQuestionsForExam(UUID examId) {
        UserDto user = access.manager();
        Exam exam = lockedExam(examId);
        access.requireOwner(exam, user);
        List<ExamSchedule> examSchedules = schedules.findByExamIdOrderByScheduledStartTimeAscIdAsc(examId);
        List<QuestionAssignmentResultDto> results = new ArrayList<>();
        for (ExamSchedule s : examSchedules) {
            if ("PENDING".equals(s.getStatus()) && !assignments.existsByExamScheduleId(s.getId())) {
                results.add(questionAssignment.assignQuestions(s));
            }
        }
        return results;
    }

    @Override
    public List<AssignedQuestionDto> getAssignedQuestions(UUID scheduleId) {
        UserDto user = access.manager();
        ExamSchedule schedule = schedule(scheduleId);
        access.requireRead(schedule.getExam(), user);
        return assignments.findByExamScheduleIdOrderByQuestionOrder(scheduleId).stream()
                .map(mapper::assignedQuestion).toList();
    }

    @Override
    @Transactional
    public ExamScheduleDto startSchedule(UUID scheduleId) {
        UserDto user = access.currentUser();
        ExamSchedule schedule = lockedSchedule(scheduleId);
        if ("STUDENT".equals(user.getRole())) {
            requireScheduleRead(schedule, user);
        } else {
            access.requireOwner(schedule.getExam(), user);
        }
        ExamRules.pending(schedule);
        ExamRules.scheduleTime(schedule.getScheduledStartTime(), schedule.getScheduledEndTime(), schedule.getExam());
        OffsetDateTime now = OffsetDateTime.now();
        if (now.isBefore(schedule.getScheduledStartTime()) || !now.isBefore(schedule.getScheduledEndTime())) {
            throw new AppException("The schedule is not within its examination time window",
                    BAD_REQUEST, "SCHEDULE_NOT_OPEN");
        }
        if (!assignments.existsByExamScheduleId(scheduleId)) {
            questionAssignment.assignQuestions(schedule);
        }
        // Assignment and transition commit together; failures leave the schedule PENDING.
        schedule.setStatus("IN_PROGRESS");
        schedule.setActualStartTime(ExamRules.timestamp(now));
        return dto(schedule);
    }

    private void requireScheduleRead(ExamSchedule schedule, UserDto user) {
        if ("STUDENT".equals(user.getRole())) {
            if (!user.getId().equals(schedule.getStudentId())) {
                throw new AppException("This schedule belongs to another student", FORBIDDEN, "FORBIDDEN");
            }
        } else {
            access.requireRead(schedule.getExam(), user);
        }
    }

    private Exam lockedExam(UUID examId) {
        return exams.findByIdForUpdate(examId)
                .orElseThrow(() -> new AppException("Exam not found", NOT_FOUND, "EXAM_NOT_FOUND"));
    }

    private ExamSchedule lockedSchedule(UUID scheduleId) {
        UUID examId = schedules.findExamIdById(scheduleId)
                .orElseThrow(() -> new AppException("Schedule not found", NOT_FOUND, "SCHEDULE_NOT_FOUND"));
        lockedExam(examId);
        return schedule(scheduleId);
    }

    private ExamSchedule schedule(UUID id) {
        return schedules.findByIdWithDetails(id)
                .orElseThrow(() -> new AppException("Schedule not found", NOT_FOUND, "SCHEDULE_NOT_FOUND"));
    }

    private ExamScheduleDto dto(ExamSchedule schedule) {
        return mapper.schedules(List.of(schedule)).get(0);
    }

    @Override
    public List<UserDto> searchStudents(String query) {
        return users.searchStudents(query, 20);
    }
}
