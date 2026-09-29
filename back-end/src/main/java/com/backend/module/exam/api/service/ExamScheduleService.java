package com.backend.module.exam.api.service;

import com.backend.module.exam.api.dto.*;

import java.util.List;
import java.util.UUID;

public interface ExamScheduleService {
    List<ExamScheduleDto> addStudentsToExam(UUID examId, AddStudentsRequest request);
    ExamScheduleDto updateSchedule(UUID scheduleId, UpdateScheduleRequest request);
    void removeStudentFromExam(UUID scheduleId);
    List<ExamScheduleDto> getSchedulesByExamId(UUID examId);
    List<ExamScheduleDto> getMySchedules();
    ExamScheduleDto getScheduleById(UUID scheduleId);
    QuestionAssignmentResultDto assignQuestionsToSchedule(UUID scheduleId);
    List<QuestionAssignmentResultDto> assignAllQuestionsForExam(UUID examId);
    List<AssignedQuestionDto> getAssignedQuestions(UUID scheduleId);
    ExamScheduleDto startSchedule(UUID scheduleId);
}
