import axios from 'axios';

const AI_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

const aiClient = axios.create({
  baseURL: AI_BASE_URL,
  timeout: 120000, // 2 phút cho các tác vụ embedding & phân tích LLM
});

export interface CourseDocument {
  id: string;
  course_id: string;
  filename: string;
  chunk_count: number;
  sha256?: string;
  embedding_model?: string;
  created_at: string;
}

export interface RubricCriterion {
  id: string;
  name: string;
  weight: number;
  description: string;
}

export interface RubricData {
  id?: string;
  title: string;
  criteria: RubricCriterion[];
}

export interface AiCourse {
  id: string;
  courseCode: string;
  courseName: string;
}

/**
 * Lấy danh sách môn học trực tiếp từ Python AI API
 */
export async function getAiCourses(): Promise<AiCourse[]> {
  const response = await aiClient.get<any[]>('/api/v1/courses');
  return (response.data || []).map((c: any) => ({
    id: c.id,
    courseCode: c.courseCode || c.course_code || '',
    courseName: c.courseName || c.course_name || '',
  }));
}

/**
 * Lấy danh sách tài liệu giáo trình đã nạp cho môn học
 */
export async function getCourseDocuments(courseId: string): Promise<CourseDocument[]> {
  const response = await aiClient.get<CourseDocument[]>(`/api/v1/courses/${courseId}/documents`);
  return response.data || [];
}

/**
 * Tải tài liệu lên để Gemini phân đoạn và nhúng vector pgvector
 */
export async function uploadCourseDocument(
  courseId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<CourseDocument> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await aiClient.post<CourseDocument>(
    `/api/v1/courses/${courseId}/documents`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    }
  );

  return response.data;
}

/**
 * Xóa tài liệu và các vector embedding tương ứng khỏi database
 */
export async function deleteCourseDocument(courseId: string, documentId: string): Promise<void> {
  await aiClient.delete(`/api/v1/courses/${courseId}/documents/${documentId}`);
}

/**
 * Dùng Gemini đọc file rubric (JSON/Markdown/Word/PDF) và trích xuất cấu trúc chuẩn
 */
export async function previewRubricFile(file: File): Promise<RubricData> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await aiClient.post<RubricData>('/api/v1/rubrics/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
}

/**
 * Lấy danh sách rubric của môn học
 */
export async function getCourseRubrics(courseId: string): Promise<RubricData[]> {
  const response = await aiClient.get<RubricData[]>(`/api/v1/courses/${courseId}/rubrics`);
  return response.data || [];
}

/**
 * Lưu rubric cho môn học
 */
export async function saveCourseRubric(courseId: string, rubric: RubricData): Promise<RubricData> {
  const response = await aiClient.post<RubricData>(`/api/v1/courses/${courseId}/rubrics`, rubric);
  return response.data;
}

/**
 * Xóa rubric của môn học
 */
export async function deleteCourseRubric(courseId: string, rubricId: string): Promise<void> {
  await aiClient.delete(`/api/v1/courses/${courseId}/rubrics/${rubricId}`);
}

export interface GenerateQuestionsParams {
  count: number;
  difficulty?: 'BALANCED' | 'EASY' | 'MEDIUM' | 'HARD';
  topicHint?: string;
}

export interface QuestionItemAi {
  content: string;
  difficulty_level: 'EASY' | 'MEDIUM' | 'HARD' | string;
  topic: string;
  expected_answer: string;
}

export interface GeneratedQuestionsAiResponse {
  course_id: string;
  course_name: string;
  total_generated: number;
  questions: QuestionItemAi[];
}

/**
 * Dùng AI sinh câu hỏi vấn đáp gợi ý từ học liệu môn học
 */
export async function generateQuestionsFromMaterials(
  courseId: string,
  params: GenerateQuestionsParams
): Promise<GeneratedQuestionsAiResponse> {
  const response = await aiClient.post<GeneratedQuestionsAiResponse>(
    `/api/v1/courses/${courseId}/generate-questions`,
    {
      count: params.count,
      difficulty: params.difficulty || 'BALANCED',
      topic_hint: params.topicHint?.trim() || null,
    }
  );
  return response.data;
}

export interface SessionTranscript {
  id: string;
  role: 'AI' | 'STUDENT';
  text: string;
  created_at: string;
}

export interface SessionQuestionResult {
  question_id: string;
  ai_score: number | null;
  ai_feedback: string | null;
}

export interface SessionAssignedQuestion {
  id: string;
  question_id: string;
  order: number;
  content: string;
}

export interface SessionDetail {
  schedule_id: string;
  exam_id: string | null;
  exam_title: string | null;
  status: string;
  final_score: number | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  assigned_questions: SessionAssignedQuestion[];
  transcripts: SessionTranscript[];
  results: SessionQuestionResult[];
}

/**
 * Lấy toàn bộ biên bản hội thoại thực tế (transcripts), điểm AI và nhận xét từng câu hỏi từ DB
 */
export async function getSessionDetail(scheduleId: string): Promise<SessionDetail> {
  const response = await aiClient.get<SessionDetail>(`/api/v1/sessions/${scheduleId}`);
  return response.data;
}

