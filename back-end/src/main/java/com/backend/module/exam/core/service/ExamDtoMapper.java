package com.backend.module.exam.core.service;

import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.api.service.UserLookupService;
import com.backend.module.exam.api.dto.*;
import com.backend.module.exam.core.entity.*;
import com.backend.module.exam.core.repository.AssignedQuestionRepository;
import com.backend.module.exam.core.repository.ExamScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Batch lookups keep paginated listings independent of the number of rows. */
@Component
@RequiredArgsConstructor
public class ExamDtoMapper {
    private final UserLookupService users;
    private final ExamScheduleRepository schedules;
    private final AssignedQuestionRepository assignedQuestions;

    public Map<UUID, ExamDto> exams(List<Exam> exams) {
        if (exams.isEmpty()) return Map.of();
        Map<UUID, UserDto> creators = users.findUsersByIds(exams.stream().map(Exam::getCreatedById)
                .filter(Objects::nonNull).distinct().toList());
        Map<UUID, List<ExamScheduleRepository.StatusCount>> counts = schedules
                .countStatuses(exams.stream().map(Exam::getId).toList()).stream()
                .collect(Collectors.groupingBy(ExamScheduleRepository.StatusCount::getExamId));
        return exams.stream().map(e -> {
            Map<String, Long> statuses = counts.getOrDefault(e.getId(), List.of()).stream()
                    .filter(c -> c.getStatus() != null)
                    .collect(Collectors.toMap(ExamScheduleRepository.StatusCount::getStatus,
                            ExamScheduleRepository.StatusCount::getTotal));
            Course c = e.getCourse();
            return ExamDto.builder().id(e.getId()).courseId(c == null ? null : c.getId())
                    .courseCode(c == null ? null : c.getCourseCode()).courseName(c == null ? null : c.getCourseName())
                    .title(e.getTitle()).startDate(e.getStartDate()).endDate(e.getEndDate())
                    .maxMainQuestions(e.getMaxMainQuestions()).maxFollowupQuestions(e.getMaxFollowupQuestions())
                    .createdBy(e.getCreatedById() == null ? null : creators.get(e.getCreatedById()))
                    .totalStudents(Math.toIntExact(counts.getOrDefault(e.getId(), List.of()).stream()
                            .mapToLong(ExamScheduleRepository.StatusCount::getTotal).sum()))
                    .pendingStudents(Math.toIntExact(statuses.getOrDefault("PENDING", 0L)))
                    .inProgressStudents(Math.toIntExact(statuses.getOrDefault("IN_PROGRESS", 0L)))
                    .completedStudents(Math.toIntExact(statuses.getOrDefault("COMPLETED", 0L))).build();
        }).collect(Collectors.toMap(ExamDto::getId, Function.identity()));
    }

    public List<ExamScheduleDto> schedules(List<ExamSchedule> items) {
        if (items.isEmpty()) return List.of();
        Map<UUID, UserDto> students = users.findUsersByIds(items.stream().map(ExamSchedule::getStudentId)
                .filter(Objects::nonNull).distinct().toList());
        Map<UUID, Long> counts = assignedQuestions.countByScheduleIds(items.stream().map(ExamSchedule::getId).toList())
                .stream().collect(Collectors.toMap(AssignedQuestionRepository.ScheduleCount::getScheduleId,
                        AssignedQuestionRepository.ScheduleCount::getTotal));
        return items.stream().map(s -> {
            Exam e = s.getExam();
            Course c = e.getCourse();
            return ExamScheduleDto.builder().id(s.getId()).examId(e.getId()).examTitle(e.getTitle())
                    .courseCode(c == null ? null : c.getCourseCode()).courseName(c == null ? null : c.getCourseName())
                    .student(s.getStudentId() == null ? null : students.get(s.getStudentId())).scheduledStartTime(s.getScheduledStartTime())
                    .scheduledEndTime(s.getScheduledEndTime()).status(s.getStatus()).finalScore(s.getFinalScore())
                    .assignedQuestionCount(Math.toIntExact(counts.getOrDefault(s.getId(), 0L))).build();
        }).toList();
    }

    public AssignedQuestionDto assignedQuestion(AssignedQuestion a) {
        return AssignedQuestionDto.builder().id(a.getId()).examScheduleId(a.getExamSchedule().getId())
                .questionId(a.getQuestion().getId()).questionOrder(a.getQuestionOrder())
                .contentSnapshot(a.getContentSnapshot()).difficultyLevel(a.getQuestion().getDifficultyLevel())
                .assignedAt(a.getAssignedAt()).build();
    }
}
