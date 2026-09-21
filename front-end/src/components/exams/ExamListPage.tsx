import React, { useState } from 'react';
import {
  Search,
  Plus,
  Calendar,
  Clock,
  HelpCircle,
  Users,
  Award,
  PlayCircle,
  Sparkles,
  Layers,
  BookOpen,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { Exam, ExamStatus } from '../../types';
import { Badge } from '../common/Badge';
import { Language, translations } from '../../utils/i18n';

interface ExamListPageProps {
  exams: Exam[];
  onSelectExam: (exam: Exam, view: 'detail' | 'assignment') => void;
  onLaunchViva: (exam: Exam) => void;
  onOpenCreateExam: () => void;
  onViewAnalytics: (examId: string) => void;
  language?: Language;
}

export const ExamListPage: React.FC<ExamListPageProps> = ({
  exams,
  onSelectExam,
  onLaunchViva,
  onOpenCreateExam,
  onViewAnalytics,
  language = 'vi',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const t = translations[language];

  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ? true : exam.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ExamStatus) => {
    switch (status) {
      case 'in_progress':
        return (
          <Badge variant="warning" size="sm">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse mr-1" />
            {t.statusInProgress}
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge variant="info" size="sm">
            <Calendar className="h-3 w-3 mr-1" />
            {t.statusScheduled}
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="success" size="sm">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t.statusCompleted}
          </Badge>
        );
      case 'draft':
      default:
        return (
          <Badge variant="default" size="sm">
            {t.statusDraft}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome & Mode Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
            {language === 'vi' ? 'Danh Sách Kỳ Thi Vấn Đáp' : 'Viva Examinations'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === 'vi'
              ? 'Chọn kỳ thi bên dưới để bắt đầu phiên vấn đáp trực tuyến cùng Giám khảo AI.'
              : 'Select an exam below to begin an interactive oral viva session with the AI examiner.'}
          </p>
        </div>

        <button
          onClick={onOpenCreateExam}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>{language === 'vi' ? 'Tạo kỳ thi mới' : 'Create Viva Exam'}</span>
        </button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Tổng số môn thi</span>
            <Layers className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2 font-display">
            {exams.length}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            3 Ngành đào tạo
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Thí sinh đã lên lịch</span>
            <Users className="h-4 w-4 text-cyan-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2 font-display">
            102
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            52 ca thi đã hoàn thành
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Điểm trung bình</span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2 font-display">
            78.4%
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
            Đạt chuẩn đầu ra
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Độ chính xác AI</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2 font-display">
            99.1%
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Chuẩn hóa theo Bareme
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="h-4 w-4 text-slate-400 shrink-0 ml-1 hidden sm:block" />
          {[
            { id: 'all', label: t.allFilter },
            { id: 'in_progress', label: t.statusInProgress },
            { id: 'scheduled', label: t.statusScheduled },
            { id: 'completed', label: t.statusCompleted },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                statusFilter === item.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Exam Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredExams.map((exam) => (
          <div
            key={exam.id}
            className="group flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-xs transition-all"
          >
            <div>
              {/* Header: Code, Title, Status */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                    {exam.code}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {exam.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {exam.course}
                  </p>
                </div>
                {getStatusBadge(exam.status)}
              </div>

              {/* Essential Parameters */}
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-600 dark:text-slate-300 py-2 border-y border-slate-100 dark:border-slate-800/80">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  <span>{exam.vivaDurationMin} {t.minutes}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
                  <span>{exam.totalQuestions} {t.questions}</span>
                </span>
                <span>•</span>
                <span className="truncate">
                  {t.examiner}: <strong className="font-medium text-slate-800 dark:text-slate-200">{exam.examinerConfig.name.split(' ')[0]}</strong>
                </span>
              </div>

              {/* Topics and Progress */}
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {exam.syllabusTopics.slice(0, 3).map((topic, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-[11px] rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                      {topic}
                    </span>
                  ))}
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Tiến độ thi của thí sinh</span>
                    <span>
                      {exam.completedCandidateCount}/{exam.assignedCandidateCount} ca
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{
                        width: `${(exam.completedCandidateCount / (exam.assignedCandidateCount || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Clear Action Buttons */}
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                onClick={() => onSelectExam(exam, 'detail')}
                className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1.5 rounded-lg transition-colors"
              >
                {t.viewDetails}
              </button>

              <div className="flex items-center gap-2">
                {exam.completedCandidateCount > 0 && (
                  <button
                    onClick={() => onViewAnalytics(exam.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                  >
                    {t.navAnalytics}
                  </button>
                )}

                <button
                  onClick={() => onLaunchViva(exam)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <PlayCircle className="h-4 w-4" />
                  <span>{t.startViva}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
