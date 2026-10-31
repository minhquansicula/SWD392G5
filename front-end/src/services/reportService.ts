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
  criteria: CriterionMarkDto[];
}

export const reportService = {
  async examReport(examId: string, signal?: AbortSignal) {
    const response = await apiClient.get<ApiResponse<ExamReportDto>>(`/lecturer/exams/${examId}/report`, { signal, headers: { 'Cache-Control': 'no-cache' } });
    return response.data.data;
  },
  async gradebook(examId: string) {
    const response = await apiClient.get<ApiResponse<GradebookRowDto[]>>(`/lecturer/exams/${examId}/gradebook`, { headers: { 'Cache-Control': 'no-cache' } });
    return response.data.data;
  },
};
