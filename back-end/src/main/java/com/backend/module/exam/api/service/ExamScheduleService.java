package com.backend.module.exam.api.service;

import com.backend.module.exam.api.dto.*;
import com.backend.module.auth.api.dto.UserDto;

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

    List<AssignedQuestionDto> getAssignedQuestions(UUID scheduleId);

    ExamScheduleDto startSchedule(UUID scheduleId);

    List<UserDto> searchStudents(String query);
}
