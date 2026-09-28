package com.backend.module.exam.core.service;

import com.backend.module.exam.api.dto.QuestionAssignmentResultDto;
import com.backend.module.exam.core.entity.*;
import com.backend.module.exam.core.repository.*;
import com.backend.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
@RequiredArgsConstructor
public class QuestionAssignmentService {
    private final QuestionRepository questions;
    private final AssignedQuestionRepository assignments;
    private final ExamDtoMapper mapper;

    /** Internal operation: caller must authorize and hold the parent exam's write lock. */
    @Transactional(propagation = Propagation.MANDATORY)
    public QuestionAssignmentResultDto assignQuestions(ExamSchedule schedule) {
        if (assignments.existsByExamScheduleId(schedule.getId())) {
            throw new AppException("Questions have already been assigned", BAD_REQUEST, "QUESTIONS_ALREADY_ASSIGNED");
        }
        ExamRules.pending(schedule);
        Exam exam = schedule.getExam();
        ExamRules.questionLimits(exam.getMaxMainQuestions(), exam.getMaxFollowupQuestions());
        if (exam.getCourse() == null) {
            throw new AppException("Exam has no course question pool", BAD_REQUEST, "NOT_ENOUGH_QUESTIONS");
        }
        List<Question> pool = new ArrayList<>(questions.findByCourseId(exam.getCourse().getId()));
        int required = exam.getMaxMainQuestions();
        if (pool.size() < required) {
            throw new AppException("Course only has " + pool.size() + " questions, but exam requires " + required,
                    BAD_REQUEST, "NOT_ENOUGH_QUESTIONS");
        }
        Map<UUID, OffsetDateTime> usage = assignments.findQuestionUsage(exam.getId()).stream()
                .collect(Collectors.toMap(AssignedQuestionRepository.QuestionUsage::getQuestionId,
                        AssignedQuestionRepository.QuestionUsage::getLastAssignedAt));

        // Randomize ties, then prioritize unused questions and least recently used fallback.
        // Stable sorting retains the randomized order within each recency bucket.
        Collections.shuffle(pool);
        pool.sort(Comparator.comparing(q -> usage.get(q.getId()), Comparator.nullsFirst(Comparator.naturalOrder())));
        List<Question> selected = new ArrayList<>(pool.subList(0, required));
        Collections.shuffle(selected);
        OffsetDateTime assignedAt = ExamRules.timestamp(OffsetDateTime.now());
        List<AssignedQuestion> result = new ArrayList<>();
        for (int i = 0; i < selected.size(); i++) {
            Question question = selected.get(i);
            result.add(AssignedQuestion.builder().examSchedule(schedule).question(question)
                    .questionOrder(i + 1).contentSnapshot(question.getContent()).assignedAt(assignedAt).build());
        }
        List<AssignedQuestion> saved = assignments.saveAll(result);
        return QuestionAssignmentResultDto.builder().examScheduleId(schedule.getId())
                .totalAssigned(saved.size()).totalAvailableInPool(pool.size())
                .assignedQuestions(saved.stream().map(mapper::assignedQuestion).toList()).build();
    }
}
