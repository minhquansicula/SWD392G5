package com.backend.module.exam.api.service;

import com.backend.module.exam.api.dto.*;

import java.util.List;
import java.util.UUID;

public interface QuestionService {
    List<QuestionDto> getQuestions(UUID courseId, String difficulty, String topic, String query);
    QuestionDto getQuestionById(UUID id);
    QuestionDto createQuestion(CreateQuestionRequest request);
    List<QuestionDto> createBatchQuestions(BatchCreateQuestionsRequest request);
    QuestionDto updateQuestion(UUID id, UpdateQuestionRequest request);
    void deleteQuestion(UUID id);
}
