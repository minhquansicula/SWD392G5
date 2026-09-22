// ============================================================
// AIVES — Feedback & Reporting Service
// FE service layer for Module 6. Currently backed by mock data
// with the exact shape the future backend should return.
// Swap the mock implementations with axios calls when:
//  GET /api/schedules/:scheduleId/report
//  GET /api/exams/:examId/analytics
//  GET /api/exams/:examId/report/export?format=csv
// become available.
// ============================================================
import {
  ClassAnalyticsData,
  StudentAssignment,
  StudentEvaluationReport,
} from '../types';
import {
  mockClassAnalytics,
  mockStudentAssignments,
  mockStudentEvaluation,
} from '../data/mockData';

const LATENCY_MS = 350;
const delay = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ReportServiceResult<T> {
  data: T;
  source: 'mock' | 'api';
  fetchedAt: string;
}

export function getHardestQuestions(analytics: ClassAnalyticsData, limit = 3) {
  return [...analytics.questionDifficultyMetrics]
    .sort((a, b) => a.avgScorePercent - b.avgScorePercent)
    .slice(0, limit);
}

export function getBestAnsweredRate(analytics: ClassAnalyticsData, threshold = 70): number {
  if (analytics.questionDifficultyMetrics.length === 0) return 0;
  const good = analytics.questionDifficultyMetrics.filter((q) => q.avgScorePercent >= threshold).length;
  return Math.round((good / analytics.questionDifficultyMetrics.length) * 1000) / 10;
}

export function toCsvRows(analytics: ClassAnalyticsData): string {
  const header = 'question_index,topic,avg_score_percent,difficulty,success_rate_percent,common_mistake';
  const rows = analytics.questionDifficultyMetrics.map((q) =>
    [
      q.questionIndex,
      `"${q.topic.replace(/"/g, '""')}"`,
      q.avgScorePercent,
      q.difficultyLevel,
      q.avgScorePercent,
      `"${q.commonMistake.replace(/"/g, '""')}"`,
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function fetchStudentReport(
  scheduleOrStudentId: string,
): Promise<ReportServiceResult<StudentEvaluationReport>> {
  await delay();
  // TODO(BE): GET /api/schedules/{scheduleId}/report
  // Expected: StudentEvaluationReport + exam_schedules.final_score + question_results.ai_feedback
  if (scheduleOrStudentId === 'stu-9922') {
    return {
      data: {
        ...mockStudentEvaluation,
        studentId: 'stu-9922',
        studentName: 'Marcus Chen',
        matriculationNo: 'CS2023-8849',
        totalScore: 38,
        percentage: 76,
        gradeLetter: 'B+',
        cohortPercentile: 72.4,
        durationSpentMinutes: 15,
      },
      source: 'mock',
      fetchedAt: new Date().toISOString(),
    };
  }
  return { data: mockStudentEvaluation, source: 'mock', fetchedAt: new Date().toISOString() };
}

export async function fetchClassAnalytics(
  examId: string,
): Promise<ReportServiceResult<ClassAnalyticsData>> {
  await delay();
  // TODO(BE): GET /api/exams/{examId}/analytics
  // Expected aggregation from exam_schedules.final_score + question_results grouped by exam_question_id.
  return {
    data: { ...mockClassAnalytics, examId },
    source: 'mock',
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchExamCandidates(examId: string): Promise<StudentAssignment[]> {
  await delay(180);
  // TODO(BE): GET /api/exams/{examId}/schedules
  return mockStudentAssignments.filter((item) => item.examId === examId);
}

export async function exportClassAnalyticsCsv(examId: string): Promise<{ filename: string; csv: string }> {
  const { data } = await fetchClassAnalytics(examId);
  return {
    filename: `aives-class-analytics-${examId}.csv`,
    csv: toCsvRows(data),
  };
}
