package com.backend.module.reporting.api.service;

import com.backend.module.reporting.api.dto.ExamReportDto;
import com.backend.module.reporting.api.dto.GradebookRowDto;

import java.util.List;
import java.util.UUID;

/** Read-only reports; access follows the exam read rules of the authenticated caller. */
public interface ReportService {
    ExamReportDto getExamReport(UUID examId);
    List<GradebookRowDto> getGradebook(UUID examId);
}
