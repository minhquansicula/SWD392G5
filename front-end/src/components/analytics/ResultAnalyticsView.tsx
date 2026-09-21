import React, { useState } from 'react';
import {
  FileText,
  BarChart3,
  MessageSquareQuote,
  User,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  StudentEvaluationReport,
  ClassAnalyticsData,
  StudentAssignment,
} from '../../types';
import { Language, translations } from '../../utils/i18n';
import { StudentScoreReport } from './StudentScoreReport';
import { TranscriptViewer } from './TranscriptViewer';
import { ClassAnalyticsDashboard } from './ClassAnalyticsDashboard';

interface ResultAnalyticsViewProps {
  report: StudentEvaluationReport;
  analytics: ClassAnalyticsData;
  assignments: StudentAssignment[];
  onSelectCandidate: (candidateId: string) => void;
  defaultSubTab?: 'student' | 'transcript' | 'class';
  language?: Language;
}

export const ResultAnalyticsView: React.FC<ResultAnalyticsViewProps> = ({
  report,
  analytics,
  assignments,
  onSelectCandidate,
  defaultSubTab = 'student',
  language = 'vi',
}) => {
  const [activeTab, setActiveTab] = useState<'student' | 'transcript' | 'class'>(defaultSubTab);
  const t = translations[language];

  return (
    <div className="space-y-6">
      {/* Analytics Sub-navigation header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          <button
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

          <button
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
        </div>

        {/* Candidate Selector for Individual View */}
        {activeTab !== 'class' && (
          <div className="flex items-center gap-2 text-xs">
            <User className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
              {t.candidate}:
            </span>
            <select
              value={report.studentId}
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
          report={report}
          onViewTranscriptTab={() => setActiveTab('transcript')}
          language={language}
        />
      )}

      {activeTab === 'transcript' && (
        <TranscriptViewer
          transcript={report.fullTranscript}
          candidateName={report.studentName}
          examinerName="Dr. Aris (AI-Examiner)"
        />
      )}

      {activeTab === 'class' && (
        <ClassAnalyticsDashboard analytics={analytics} />
      )}
    </div>
  );
};
