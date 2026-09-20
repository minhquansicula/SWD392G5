package com.backend.module.exam.service;

import com.backend.module.auth.entity.User;
import com.backend.module.auth.repository.UserRepository;
import com.backend.module.exam.dto.*;
import com.backend.module.exam.entity.Exam;
import com.backend.module.exam.entity.ExamSchedule;
import com.backend.module.exam.repository.ExamRepository;
import com.backend.module.exam.repository.ExamScheduleRepository;
import com.backend.shared.exception.ResourceNotFoundException;
import com.backend.shared.exception.ScheduleConflictException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DateTimeException;
import java.time.OffsetDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ExamScheduleService {
    // Canonical UUID text ordering matches PostgreSQL UUID ordering, including the
    // sign bit.
    private static final Comparator<ExamSchedule> SCHEDULE_ORDER = Comparator
            .comparing((ExamSchedule s) -> s.getScheduledStartTime().toInstant())
            .thenComparing(s -> s.getId().toString());
    private final ExamRepository examRepository;
    private final ExamScheduleRepository scheduleRepository;
    private final UserRepository userRepository;
    private final ExamAccessPolicy accessPolicy;

    @Transactional
    public List<ExamScheduleResponse> create(UUID examId, CreateExamSchedulesRequest request, String username) {
        return addSlots(examId, request.getSchedules(), username);
    }

    @Transactional
    public List<ExamScheduleResponse> generate(UUID examId, GenerateExamSchedulesRequest request, String username) {
        if (request.getDurationMinutes() == null || request.getDurationMinutes() <= 0
                || request.getBreakMinutes() == null || request.getBreakMinutes() < 0
                || request.getFirstSlotStart() == null) {
            throw new IllegalArgumentException("Thời lượng phải > 0, thời gian nghỉ >= 0 và phải có giờ bắt đầu");
        }
        validateStudentIds(request.getStudentIds());
        List<CreateExamSchedulesRequest.Slot> slots = new ArrayList<>();
        try {
            // Cast before addition: avoid integer overflow for large duration/break values.
            long step = (long) request.getDurationMinutes() + request.getBreakMinutes();
            for (int i = 0; i < request.getStudentIds().size(); i++) {
                CreateExamSchedulesRequest.Slot slot = new CreateExamSchedulesRequest.Slot();
                slot.setStudentId(request.getStudentIds().get(i));
                slot.setScheduledStartTime(request.getFirstSlotStart().plusMinutes(i * step));
                slot.setScheduledEndTime(slot.getScheduledStartTime().plusMinutes(request.getDurationMinutes()));
                slots.add(slot);
            }
        } catch (DateTimeException | ArithmeticException ex) {
            throw new IllegalArgumentException("Khoảng thời gian sinh lịch vượt giới hạn cho phép");
        }
        return addSlots(examId, slots, username);
    }

    private List<ExamScheduleResponse> addSlots(UUID examId, List<CreateExamSchedulesRequest.Slot> slots,
            String username) {
        if (slots == null || slots.isEmpty() || slots.size() > 1000 || slots.stream().anyMatch(Objects::isNull)) {
            throw new IllegalArgumentException("Danh sách phải có từ 1 đến 1000 slot hợp lệ");
        }
        List<UUID> ids = slots.stream().map(CreateExamSchedulesRequest.Slot::getStudentId).toList();
        validateStudentIds(ids);
        Exam exam = lockManagedExam(examId, username);
        Map<UUID, User> students = lockStudents(ids);
        requireEditable(exam);
        List<ExamSchedule> roster = scheduleRepository.findByExamIdOrderByScheduledStartTimeAscIdAsc(examId);
        Set<UUID> enrolled = new HashSet<>();
        roster.forEach(s -> enrolled.add(s.getStudent().getId()));
        List<ExamSchedule> added = new ArrayList<>();
        for (CreateExamSchedulesRequest.Slot slot : slots) {
            if (!enrolled.add(slot.getStudentId())) {
                throw conflict("DUPLICATE_EXAM_STUDENT", "Sinh viên đã có lịch trong kỳ thi: " + slot.getStudentId());
            }
            validateWindow(exam, slot.getScheduledStartTime(), slot.getScheduledEndTime());
            validateOverlap(roster, slot.getStudentId(), slot.getScheduledStartTime(), slot.getScheduledEndTime(),
                    null);
            ExamSchedule schedule = new ExamSchedule();
            schedule.setExam(exam);
            schedule.setStudent(students.get(slot.getStudentId()));
            schedule.setScheduledStartTime(slot.getScheduledStartTime());
            schedule.setScheduledEndTime(slot.getScheduledEndTime());
            schedule.setStatus("PENDING");
            added.add(schedule);
            roster.add(schedule); // Includes earlier slots of this batch in overlap validation.
        }
        scheduleRepository.saveAllAndFlush(added);
        Map<UUID, Integer> positions = sequenceNumbers(roster);
        return added.stream().sorted(SCHEDULE_ORDER)
                .map(s -> toResponse(s, positions.get(s.getId()))).toList();
    }

    @Transactional(readOnly = true)
    public List<ExamScheduleResponse> getRoster(UUID examId, String username) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam", examId));
        accessPolicy.requireManager(exam, username);
        List<ExamSchedule> roster = scheduleRepository.findByExamIdOrderByScheduledStartTimeAscIdAsc(examId);
        Map<UUID, Integer> positions = sequenceNumbers(roster);
        return roster.stream().sorted(SCHEDULE_ORDER)
                .map(s -> toResponse(s, positions.get(s.getId()))).toList();
    }

    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public List<ExamScheduleResponse> getMySchedules(String username) {
        User student = accessPolicy.requireUser(username);
        if (!"STUDENT".equals(student.getRole())) {
            throw new AccessDeniedException("Chỉ sinh viên được xem lịch thi cá nhân");
        }
        List<ExamSchedule> personal = scheduleRepository
                .findByStudentIdOrderByScheduledStartTimeAscIdAsc(student.getId());
        if (personal.isEmpty()) {
            return List.of();
        }
        // Rank within the full exam roster, not within this student's personal list.
        // One batch query avoids a separate roster query for every personal schedule.
        List<UUID> examIds = personal.stream().map(s -> s.getExam().getId()).distinct().toList();
        Map<UUID, Integer> positions = sequenceNumbers(
                scheduleRepository.findByExamIdInOrderByScheduledStartTimeAscIdAsc(examIds));
        return personal.stream().sorted(SCHEDULE_ORDER)
                .map(s -> toResponse(s, positions.get(s.getId()))).toList();
    }

    @Transactional
    public ExamScheduleResponse update(UUID examId, UUID scheduleId, UpdateExamScheduleRequest request,
            String username) {
        Exam exam = lockManagedExam(examId, username);
        List<ExamSchedule> roster = scheduleRepository.findByExamIdOrderByScheduledStartTimeAscIdAsc(examId);
        ExamSchedule schedule = findSchedule(roster, scheduleId);
        lockStudents(List.of(schedule.getStudent().getId()));
        requireEditable(exam);
        if (request.getScheduledStartTime() == null && request.getScheduledEndTime() == null) {
            throw new IllegalArgumentException("Phải cung cấp ít nhất một mốc thời gian cần cập nhật");
        }
        OffsetDateTime start = request.getScheduledStartTime() != null
                ? request.getScheduledStartTime()
                : schedule.getScheduledStartTime();
        OffsetDateTime end = request.getScheduledEndTime() != null
                ? request.getScheduledEndTime()
                : schedule.getScheduledEndTime();
        validateWindow(exam, start, end);
        validateOverlap(roster, schedule.getStudent().getId(), start, end, scheduleId);
        schedule.setScheduledStartTime(start);
        schedule.setScheduledEndTime(end);
        scheduleRepository.flush();
        return toResponse(schedule, sequenceNumbers(roster).get(scheduleId));
    }

    @Transactional
    public void delete(UUID examId, UUID scheduleId, String username) {
        Exam exam = lockManagedExam(examId, username);
        List<ExamSchedule> roster = scheduleRepository.findByExamIdOrderByScheduledStartTimeAscIdAsc(examId);
        ExamSchedule schedule = findSchedule(roster, scheduleId);
        lockStudents(List.of(schedule.getStudent().getId()));
        requireEditable(exam);
        scheduleRepository.delete(schedule);
        scheduleRepository.flush();
    }

    private Exam lockManagedExam(UUID examId, String username) {
        Exam exam = examRepository.findByIdForUpdate(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam", examId));
        accessPolicy.requireManager(exam, username);
        return exam;
    }

    private void requireEditable(Exam exam) {
        accessPolicy.requireNotStarted(exam);
        if (scheduleRepository.existsByExamIdAndStatusNot(exam.getId(), "PENDING")) {
            throw conflict("SCHEDULE_LOCKED", "Kỳ thi đã có ca thi không còn PENDING, không thể thay đổi lịch");
        }
    }

    private void validateStudentIds(List<UUID> ids) {
        if (ids == null || ids.isEmpty() || ids.size() > 1000 || ids.stream().anyMatch(Objects::isNull)) {
            throw new IllegalArgumentException("Danh sách phải có từ 1 đến 1000 studentId hợp lệ");
        }
        if (new HashSet<>(ids).size() != ids.size()) {
            throw conflict("DUPLICATE_EXAM_STUDENT", "Danh sách có studentId bị lặp");
        }
    }

    private Map<UUID, User> lockStudents(List<UUID> ids) {
        Map<UUID, User> students = new HashMap<>();
        // Same lock order across exams avoids deadlocks for intersecting batches.
        for (UUID id : ids.stream().sorted().toList()) {
            User student = userRepository.findByIdForUpdate(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Student", id));
            if (!"STUDENT".equals(student.getRole())) {
                throw new IllegalArgumentException("User không có role STUDENT: " + id);
            }
            students.put(id, student);
        }
        return students;
    }

    private void validateWindow(Exam exam, OffsetDateTime start, OffsetDateTime end) {
        if (start == null || end == null || !end.isAfter(start)) {
            throw new IllegalArgumentException("Slot phải có thời gian kết thúc sau thời gian bắt đầu");
        }
        if (start.isBefore(exam.getStartDate()) || end.isAfter(exam.getEndDate())) {
            throw new IllegalArgumentException("Slot phải nằm trong khoảng thời gian diễn ra kỳ thi");
        }
    }

    private void validateOverlap(List<ExamSchedule> roster, UUID studentId,
            OffsetDateTime start, OffsetDateTime end, UUID excludedId) {
        for (ExamSchedule other : roster) {
            if (excludedId != null && excludedId.equals(other.getId())) {
                continue;
            }
            if (start.isBefore(other.getScheduledEndTime()) && other.getScheduledStartTime().isBefore(end)) {
                throw conflict("SCHEDULE_OVERLAP", "Slot trùng với ca thi khác trong cùng luồng của kỳ thi");
            }
        }
        boolean studentConflict = scheduleRepository.findStudentOverlaps(studentId, start, end).stream()
                .anyMatch(s -> excludedId == null || !excludedId.equals(s.getId()));
        if (studentConflict) {
            throw conflict("STUDENT_SCHEDULE_OVERLAP", "Sinh viên đã có lịch thi trùng thời gian: " + studentId);
        }
    }

    private ExamSchedule findSchedule(List<ExamSchedule> roster, UUID id) {
        return roster.stream().filter(s -> id.equals(s.getId())).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("ExamSchedule", id));
    }

    private Map<UUID, Integer> sequenceNumbers(List<ExamSchedule> schedules) {
        Map<UUID, Integer> positions = new HashMap<>();
        Map<UUID, Integer> examCounts = new HashMap<>();
        for (ExamSchedule schedule : schedules.stream().sorted(SCHEDULE_ORDER).toList()) {
            int position = examCounts.merge(schedule.getExam().getId(), 1, Integer::sum);
            positions.put(schedule.getId(), position);
        }
        return positions;
    }

    private ScheduleConflictException conflict(String code, String message) {
        return new ScheduleConflictException(code, message);
    }

    private ExamScheduleResponse toResponse(ExamSchedule s, Integer sequenceNo) {
        Exam exam = s.getExam();
        return ExamScheduleResponse.builder()
                .id(s.getId()).examId(exam.getId()).examTitle(exam.getTitle())
                .courseId(exam.getCourse() == null ? null : exam.getCourse().getId())
                .courseCode(exam.getCourse() == null ? null : exam.getCourse().getCourseCode())
                .courseName(exam.getCourse() == null ? null : exam.getCourse().getCourseName())
                .studentId(s.getStudent().getId()).studentName(s.getStudent().getFullName())
                .scheduledStartTime(s.getScheduledStartTime()).scheduledEndTime(s.getScheduledEndTime())
                .sequenceNo(sequenceNo).status(s.getStatus()).build();
    }
}
