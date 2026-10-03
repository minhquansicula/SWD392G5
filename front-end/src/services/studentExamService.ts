import apiClient from './apiClient';
import type { ApiResponse, ExamScheduleDto } from '../types/examApi';

export const studentExamService = {
  async mySchedules(signal?: AbortSignal): Promise<ExamScheduleDto[]> {
    const response = await apiClient.get<ApiResponse<ExamScheduleDto[]>>('/student/my-schedules', { signal });
    return response.data.data;
  },
  async start(scheduleId: string): Promise<ExamScheduleDto> {
    const response = await apiClient.post<ApiResponse<ExamScheduleDto>>(`/student/schedules/${scheduleId}/start`);
    return response.data.data;
  },
};
