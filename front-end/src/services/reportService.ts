import apiClient from './apiClient';
import type { ApiResponse } from '../types/examApi';

export interface QuestionStatDto {
  questionId: string;
  content: string;
  topic: string | null;
  difficulty: string | null;
  assignedCount: number;
  gradedCount: number;
  averageScore: number | null;
  goodAnswerRate: number | null;
}

export interface ExamReportDto {
  goodAnswerScore: number;
  goodAnswerRate: number | null;
  questions: QuestionStatDto[];
}

export interface CriterionMarkDto {
  criterionId?: string;
  lecturerScore?: number | null;
  name: string;
  weight: number;
  score: number | null;
  assessed: boolean;
  comment: string | null;
}

export interface GradebookRowDto {
  scheduleId: string;
  studentCode: string | null;
  fullName: string | null;
  email: string | null;
  status: string;
  finalScore: number | null;
  lecturerTotalScore?: number | null;
  criteria: CriterionMarkDto[];
}

export interface GradingHistoryEntry {
  id: string;
  questionId: string | null;
  criterionId?: string | null;
  lecturerName: string;
  oldScore: number | null;
  newScore: number | null;
  oldFeedback: string | null;
  newFeedback: string | null;
  changedAt: string;
}

export const reportService = {
  async saveCriteria(scheduleId: string, criteria: { criterionId: string; score: number | null }[]) {
    await apiClient.put(`/lecturer/schedules/${scheduleId}/criteria`, { criteria });
  },
  async calculateTotal(scheduleId: string) {
    await apiClient.put(`/lecturer/schedules/${scheduleId}/grade/calculate`);
  },
  async gradingHistory(scheduleId: string, signal?: AbortSignal) {
    const response = await apiClient.get<ApiResponse<GradingHistoryEntry[]>>(`/lecturer/schedules/${scheduleId}/grading-history`, { signal, headers: { 'Cache-Control': 'no-cache' } });
    return response.data.data;
  },
  async gradeTotal(scheduleId: string, score: number | null) {
    await apiClient.put(`/lecturer/schedules/${scheduleId}/grade`, { score });
  },
  async gradeQuestion(scheduleId: string, questionId: string, score: number | null, feedback: string | null) {
    await apiClient.put(`/lecturer/schedules/${scheduleId}/questions/${questionId}/grade`, { score, feedback });
  },
  async examReport(examId: string, signal?: AbortSignal) {
    const response = await apiClient.get<ApiResponse<ExamReportDto>>(`/lecturer/exams/${examId}/report`, { signal, headers: { 'Cache-Control': 'no-cache' } });
    return response.data.data;
  },
  async gradebook(examId: string) {
    const response = await apiClient.get<ApiResponse<GradebookRowDto[]>>(`/lecturer/exams/${examId}/gradebook`, { headers: { 'Cache-Control': 'no-cache' } });
    return response.data.data;
  },
};
