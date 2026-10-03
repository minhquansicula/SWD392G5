// Wire contracts for the lecturer exam module; independent of the demo Exam model.
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface ExamUserDto {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'LECTURER' | 'STUDENT';
  studentCode: string | null;
  email: string | null;
  createdAt: string | null;
}

export interface ExamDto {
  id: string;
  courseId: string | null;
  courseCode: string | null;
  courseName: string | null;
  title: string;
  startDate: string;
  endDate: string;
  maxMainQuestions: number | null;
  maxFollowupQuestions: number | null;
  maxFollowupsPerMain: number | null;
  mainAnswerTimeLimitSeconds: number | null;
  followupAnswerTimeLimitSeconds: number | null;
  createdBy: ExamUserDto | null;
  totalStudents: number;
  completedStudents: number;
  pendingStudents: number;
  inProgressStudents: number;
}

export type ScheduleStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface ExamScheduleDto {
  id: string;
  examId: string;
  examTitle: string;
  courseCode: string | null;
  courseName: string | null;
  student: ExamUserDto | null;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  status: ScheduleStatus | null;
  finalScore: number | null;
  assignedQuestionCount: number;
  isConnected: boolean | null;
  fullRecordingUrl: string | null;
  gradedById: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
}

export interface ExamDetailDto {
  exam: ExamDto;
  schedules: ExamScheduleDto[];
}

export interface AssignedQuestionDto {
  id: string;
  examScheduleId: string;
  questionId: string;
  questionOrder: number;
  contentSnapshot: string;
  difficultyLevel: string | null;
  assignedAt: string;
}

export interface QuestionAssignmentResultDto {
  examScheduleId: string;
  totalAssigned: number;
  totalAvailableInPool: number;
  assignedQuestions: AssignedQuestionDto[];
}

export interface ExamPage {
  content: ExamDto[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

export interface CreateExamRequest {
  courseId: string;
  title: string;
  startDate: string;
  endDate: string;
  maxMainQuestions: number;
  maxFollowupQuestions: number;
  maxFollowupsPerMain?: number;
  mainAnswerTimeLimitSeconds?: number;
  followupAnswerTimeLimitSeconds?: number;
}

export type UpdateExamRequest = Partial<Omit<CreateExamRequest, 'courseId'>>;
export interface UpdateScheduleRequest {
  scheduledStartTime: string;
  scheduledEndTime: string;
}
export interface StudentScheduleEntry extends UpdateScheduleRequest {
  studentId: string;
}
export interface AddStudentsRequest { students: StudentScheduleEntry[] }

export type ExamSort = `${'id' | 'title' | 'startDate' | 'endDate' | 'maxMainQuestions' | 'maxFollowupQuestions'},${'asc' | 'desc'}`;

export interface ExamApiError {
  status?: number;
  error?: string;
  message?: string;
  validationErrors?: Record<string, string>;
}
