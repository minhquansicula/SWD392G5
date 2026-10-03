package com.backend.module.exam.api.service;

import com.backend.module.exam.api.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/** Authorization uses the authenticated caller, never a caller-supplied role. */
public interface ExamService {
    ExamDto createExam(CreateExamRequest request);
    ExamDto updateExam(UUID examId, UpdateExamRequest request);
    void deleteExam(UUID examId);
    ExamDto getExamById(UUID examId);
    ExamDetailDto getExamDetail(UUID examId);
    Page<ExamDto> getExams(Pageable pageable);
}
