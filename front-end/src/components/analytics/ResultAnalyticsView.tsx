import React, { useEffect, useState } from 'react';
import {
  FileText,
  BarChart3,
  MessageSquareQuote,
  User,
  Loader2,
  TriangleAlert,
} from 'lucide-react';
import {
  StudentEvaluationReport,
  ClassAnalyticsData,
  UserAccount,
} from '../../types';
import { Language } from '../../utils/i18n';
import { StudentScoreReport } from './StudentScoreReport';
import { TranscriptViewer } from './TranscriptViewer';
import { ClassAnalyticsDashboard } from './ClassAnalyticsDashboard';
import {
  fetchClassAnalytics,
  fetchStudentReport,
} from '../../services/reportService';

interface ResultAnalyticsViewProps {
  report: StudentEvaluationReport;
  analytics: ClassAnalyticsData;
  onSelectCandidate: (candidateId: string) => void;
  defaultSubTab?: 'student' | 'transcript' | 'class';
  isSimpleMode?: boolean;
  language?: Language;
  currentUser?: UserAccount | null;
  examId?: string;
}

export const ResultAnalyticsView: React.FC<ResultAnalyticsViewProps> = ({
  report,
  analytics,
  onSelectCandidate,
  defaultSubTab = 'student',
  isSimpleMode = true,
  language = 'vi',
  currentUser,
  examId,
}) => {
  const isVi = language === 'vi';
  const role = currentUser?.role ?? 'LECTURER';
  const isStudent = role === 'STUDENT';
  const initialTab = isStudent ? 'student' : defaultSubTab;
  const [activeTab, setActiveTab] = useState<'student' | 'transcript' | 'class'>(initialTab);
  const [liveReport, setLiveReport] = useState(report);
  const [liveAnalytics, setLiveAnalytics] = useState(analytics);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'mock' | 'api'>('mock');

  useEffect(() => {
    setLiveReport(report);
  }, [report]);

  useEffect(() => {
    setLiveAnalytics(analytics);
  }, [analytics]);

  useEffect(() => {
    setActiveTab(isStudent ? 'student' : defaultSubTab);
  }, [isStudent, defaultSubTab]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const targetExamId = examId ?? analytics.examId;
        const [studentRes, classRes] = await Promise.all([
          fetchStudentReport(report.studentId),
          fetchClassAnalytics(targetExamId),
        ]);
        if (cancelled) return;
        setLiveReport(studentRes.data);
        setLiveAnalytics(classRes.data);
        setSource(studentRes.source);
      } catch {
        if (!cancelled) setError(isVi ? 'Không tải được dữ liệu báo cáo mới, đang hiển thị dữ liệu mẫu.' : 'Could not load fresh reporting data; showing sample data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, report.studentId]);

  const dataSourceLabel = source === 'mock'
    ? (isVi ? 'Dữ liệu mẫu — chờ API Module 6' : 'Sample data — awaiting Module 6 API')
    : (isVi ? 'Dữ liệu trực tiếp' : 'Live data');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-xs text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200 sm:flex-row sm:items-center sm:justify-between">
        <p>
          {isStudent
            ? (isVi
              ? 'Sinh viên chỉ xem được phiếu điểm của chính mình: điểm từng câu và nhận xét của AI.'
              : 'Students can only review their own scorecard: per-question scores and AI feedback.')
            : (isVi
              ? 'Giảng viên xem toàn lớp: câu hỏi khó nhất, tỷ lệ trả lời tốt, phân bố điểm và từng thí sinh.'
              : 'Lecturers review the whole cohort: hardest questions, good-answer rate, score distribution, and each candidate.')}
        </p>
        <div className="flex items-center gap-2 font-semibold">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{loading ? (isVi ? 'Đang đồng bộ...' : 'Syncing...') : dataSourceLabel}</span>
        </div>
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {/* Analytics Sub-navigation header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold" role="tablist" aria-label={isVi ? 'Phản hồi và báo cáo' : 'Feedback and reporting'}>
          <button
            role="tab"
            aria-selected={activeTab === 'student'}
            onClick={() => setActiveTab('student')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'student'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>{language === 'vi' ? 'Phiếu Điểm Thí Sinh' : 'Student Score Report'}</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'transcript'}
            onClick={() => setActiveTab('transcript')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'transcript'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquareQuote className="h-4 w-4" />
            <span>{language === 'vi' ? 'Toàn Bộ Hội Thoại' : 'Verbatim Transcript'}</span>
          </button>

          {!isStudent && (
            <button
              role="tab"
              aria-selected={activeTab === 'class'}
              onClick={() => setActiveTab('class')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'class'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>{language === 'vi' ? 'Phân Tích Cả Lớp' : 'Class Cohort Analytics'}</span>
            </button>
          )}
        </div>

        {/* Candidate Selector for Individual View */}
        {activeTab !== 'class' && !isStudent && (
          <div className="flex items-center gap-2 text-xs">
            <User className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
              {isVi ? 'Thí sinh' : 'Candidate'}:
            </span>
            <select
              value={liveReport.studentId}
              onChange={(e) => onSelectCandidate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-indigo-500"
            >
              <option value="stu-9921">Elena Rostova (Điểm A - 88%)</option>
              <option value="stu-9922">Marcus Chen (Điểm B+ - 76%)</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Tab Render */}
      {activeTab === 'student' && (
        <StudentScoreReport
          report={liveReport}
          onViewTranscriptTab={() => setActiveTab('transcript')}
          isSimpleMode={isSimpleMode}
          language={language}
          dataSourceLabel={dataSourceLabel}
        />
      )}

      {activeTab === 'transcript' && (
        <TranscriptViewer
          transcript={liveReport.fullTranscript}
          candidateName={liveReport.studentName}
          examinerName="Dr. Aris (AI-Examiner)"
        />
      )}

      {activeTab === 'class' && !isStudent && (
        <ClassAnalyticsDashboard analytics={liveAnalytics} language={language} dataSourceLabel={dataSourceLabel} />
      )}
    </div>
  );
};
