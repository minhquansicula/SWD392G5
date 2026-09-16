export type ModuleType = 'exams' | 'interview' | 'analytics' | 'admin';

export type UserRole = 'ADMIN' | 'LECTURER' | 'STUDENT';

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  password?: string;
  createdAt: string;
}

export type ExamSubView = 'list' | 'create' | 'detail' | 'assignment';
export type AnalyticsSubView = 'student' | 'class';

export type ExamStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed';

export interface RubricCriterion {
  id: string;
  name: string;
  weight: number; // e.g. 25%
  description: string;
  maxScore: number;
}

export interface AiExaminerConfig {
  name: string;
  title: string;
  persona: 'encouraging' | 'standard_academic' | 'rigorous_socratic';
  voiceType: string;
  avatarStyle: 'holographic' | 'academic' | 'minimalist';
  followUpDepth: number; // 1 to 3 levels
  strictness: 'lenient' | 'moderate' | 'strict';
}

export interface VivaQuestion {
  id: string;
  index: number;
  topic: string;
  questionText: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  expectedConcepts: string[];
  maxMarks: number;
  adaptiveFollowUps?: {
    condition: 'incomplete_answer' | 'advanced_knowledge' | 'misconception';
    probeQuestion: string;
  }[];
}

export interface Exam {
  id: string;
  code: string;
  title: string;
  course: string;
  department: string;
  term: string;
  status: ExamStatus;
  scheduledDate: string;
  vivaDurationMin: number;
  totalQuestions: number;
  totalMarks: number;
  passingMarks: number;
  assignedCandidateCount: number;
  completedCandidateCount: number;
  averageScore?: number;
  syllabusTopics: string[];
  rubric: RubricCriterion[];
  examinerConfig: AiExaminerConfig;
  questions: VivaQuestion[];
  instructions: string;
}

export interface StudentAssignment {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  matriculationNo: string;
  email: string;
  assignedSlot: string; // e.g. "2026-09-18 09:30 AM"
  status: 'scheduled' | 'ready' | 'in_progress' | 'completed' | 'absent';
  score?: number;
  durationMinutes?: number;
  proctorFlags?: number;
}

export interface TranscriptEntry {
  id: string;
  speaker: 'examiner' | 'student';
  speakerName: string;
  text: string;
  timestamp: string;
  confidence?: number;
  sentiment?: 'confident' | 'hesitant' | 'neutral' | 'elaborate';
  highlightedConcepts?: string[];
  isAdaptiveProbe?: boolean;
}

export interface QuestionFeedbackItem {
  questionNumber: number;
  questionText: string;
  topic: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  studentResponseSummary: string;
  score: number;
  maxScore: number;
  bloomTaxonomy: string;
  examinerCritique: string;
  keyStrengths: string[];
  knowledgeGaps: string[];
  adaptiveProbeAsked?: string;
  suggestedRevision: string;
}

export interface StudentEvaluationReport {
  studentId: string;
  studentName: string;
  matriculationNo: string;
  examId: string;
  examTitle: string;
  courseCode: string;
  evaluatedAt: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  gradeLetter: string;
  cohortPercentile: number;
  durationSpentMinutes: number;
  academicIntegrityScore: number; // e.g. 98%
  competencyBreakdown: {
    category: string;
    studentScore: number;
    maxScore: number;
    cohortAverage: number;
  }[];
  questionFeedback: QuestionFeedbackItem[];
  fullTranscript: TranscriptEntry[];
  aiExaminerSummary: {
    overallImpression: string;
    recommendedGradeAdjustment: string;
    topStrength: string;
    primaryDevelopmentArea: string;
    vocalConfidenceIndex: number; // percentage
  };
}

export interface ClassAnalyticsData {
  examId: string;
  examTitle: string;
  totalAssigned: number;
  totalCompleted: number;
  averageScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  standardDeviation: number;
  scoreDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  questionDifficultyMetrics: {
    questionIndex: number;
    topic: string;
    avgScorePercent: number;
    discriminationIndex: number; // 0.00 - 1.00
    difficultyLevel: 'Easy' | 'Moderate' | 'Challenging' | 'Very High';
    commonMistake: string;
  }[];
  topicPerformance: {
    topic: string;
    cohortScore: number;
    targetBenchmark: number;
  }[];
  integrityAlertsCount: number;
  avgDurationMinutes: number;
}
