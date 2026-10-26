import apiClient from './apiClient';
import type { ApiResponse, ExamScheduleDto } from '../types/examApi';

export const studentExamService = {
  async mySchedules(signal?: AbortSignal, fresh = false): Promise<ExamScheduleDto[]> {
    const response = await apiClient.get<ApiResponse<ExamScheduleDto[]>>('/student/my-schedules', { signal, headers: fresh ? { 'Cache-Control': 'no-cache' } : {} });
    return response.data.data;
  },
  async start(scheduleId: string): Promise<ExamScheduleDto> {
    const response = await apiClient.post<ApiResponse<ExamScheduleDto>>(`/student/schedules/${scheduleId}/start`);
    return response.data.data;
  },
};
