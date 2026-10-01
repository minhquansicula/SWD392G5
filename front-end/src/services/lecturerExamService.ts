import apiClient from './apiClient';
import type {
  ApiResponse, ExamDto, ExamDetailDto, ExamPage, ExamSort, ExamScheduleDto,
  AssignedQuestionDto, QuestionAssignmentResultDto, CreateExamRequest,
  UpdateExamRequest, AddStudentsRequest, UpdateScheduleRequest, ExamUserDto,
} from '../types/examApi';

// Reuse the existing JWT client. No auth/course/admin/student API duplication.
export const lecturerExamService = {
  async list(page = 0, size = 10, sort: ExamSort = 'startDate,desc', signal?: AbortSignal) {
    const response = await apiClient.get<ApiResponse<ExamPage>>('/exams', {
      params: { page, size, sort }, signal,
    });
    return response.data.data;
  },
  async detail(examId: string, signal?: AbortSignal) {
    const response = await apiClient.get<ApiResponse<ExamDetailDto>>(`/exams/${examId}`, { signal });
    return response.data.data;
  },
  async create(body: CreateExamRequest) {
    const response = await apiClient.post<ApiResponse<ExamDto>>('/lecturer/exams', body);
    return response.data.data;
  },
  async update(examId: string, body: UpdateExamRequest) {
    const response = await apiClient.put<ApiResponse<ExamDto>>(`/lecturer/exams/${examId}`, body);
    return response.data.data;
  },
  async remove(examId: string): Promise<void> {
    await apiClient.delete(`/lecturer/exams/${examId}`);
  },
  async schedules(examId: string, signal?: AbortSignal) {
    const response = await apiClient.get<ApiResponse<ExamScheduleDto[]>>(`/exams/${examId}/schedules`, { signal });
    return response.data.data;
  },
  async addStudents(examId: string, body: AddStudentsRequest) {
    const response = await apiClient.post<ApiResponse<ExamScheduleDto[]>>(`/lecturer/exams/${examId}/schedules`, body);
    return response.data.data;
  },
  async updateSchedule(scheduleId: string, body: UpdateScheduleRequest) {
    const response = await apiClient.put<ApiResponse<ExamScheduleDto>>(`/lecturer/schedules/${scheduleId}`, body);
    return response.data.data;
  },
  async removeSchedule(scheduleId: string): Promise<void> {
    await apiClient.delete(`/lecturer/schedules/${scheduleId}`);
  },
  async assignQuestions(scheduleId: string) {
    const response = await apiClient.post<ApiResponse<QuestionAssignmentResultDto>>(`/lecturer/schedules/${scheduleId}/assign-questions`);
    return response.data.data;
  },
  async assignedQuestions(scheduleId: string, signal?: AbortSignal) {
    const response = await apiClient.get<ApiResponse<AssignedQuestionDto[]>>(`/schedules/${scheduleId}/assigned-questions`, { signal });
    return response.data.data;
  },
  async start(scheduleId: string) {
    const response = await apiClient.post<ApiResponse<ExamScheduleDto>>(`/lecturer/schedules/${scheduleId}/start`);
    return response.data.data;
  },
  async searchStudents(query = '', signal?: AbortSignal) {
    const response = await apiClient.get<ApiResponse<ExamUserDto[]>>('/lecturer/students', {
      params: { query },
      signal,
    });
    return response.data.data;
  },
};
