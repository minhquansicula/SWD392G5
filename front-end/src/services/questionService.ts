import apiClient from './apiClient';

export interface QuestionDto {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  content: string;
  difficultyLevel: 'EASY' | 'MEDIUM' | 'HARD' | string;
  topic: string | null;
  expectedAnswer: string | null;
}

export interface CreateQuestionRequest {
  courseId: string;
  content: string;
  difficultyLevel?: string;
  topic?: string;
  expectedAnswer?: string;
}

export interface QuestionBatchItem {
  content: string;
  difficultyLevel?: string;
  topic?: string;
  expectedAnswer?: string;
}

export interface BatchCreateQuestionsRequest {
  courseId: string;
  questions: QuestionBatchItem[];
}

export interface UpdateQuestionRequest {
  content: string;
  difficultyLevel?: string;
  topic?: string;
  expectedAnswer?: string;
}

export interface QuestionFilterParams {
  courseId?: string;
  difficulty?: string;
  topic?: string;
  query?: string;
}

export const questionService = {
  async getQuestions(params?: QuestionFilterParams, signal?: AbortSignal): Promise<QuestionDto[]> {
    const response = await apiClient.get<{
      success: boolean;
      message: string;
      data: QuestionDto[];
    }>('/questions', { params, signal });
    return response.data?.data || [];
  },

  async getQuestionById(id: string, signal?: AbortSignal): Promise<QuestionDto> {
    const response = await apiClient.get<{
      success: boolean;
      message: string;
      data: QuestionDto;
    }>(`/questions/${id}`, { signal });
    return response.data.data;
  },

  async createQuestion(request: CreateQuestionRequest): Promise<QuestionDto> {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: QuestionDto;
    }>('/questions', request);
    return response.data.data;
  },

  async createBatchQuestions(request: BatchCreateQuestionsRequest): Promise<QuestionDto[]> {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: QuestionDto[];
    }>('/questions/batch', request);
    return response.data.data;
  },

  async updateQuestion(id: string, request: UpdateQuestionRequest): Promise<QuestionDto> {
    const response = await apiClient.put<{
      success: boolean;
      message: string;
      data: QuestionDto;
    }>(`/questions/${id}`, request);
    return response.data.data;
  },

  async deleteQuestion(id: string): Promise<void> {
    await apiClient.delete(`/questions/${id}`);
  },
};
