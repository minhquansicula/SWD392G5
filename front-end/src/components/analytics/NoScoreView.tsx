import React from 'react';
import {
  Clock,
  Calendar,
  AlertCircle,
  Sparkles,
  RefreshCw,
  User,
  BookOpen,
  CheckCircle2,
  FileQuestion,
  HelpCircle,
} from 'lucide-react';
import { ExamScheduleDto } from '../../types/examApi';
import { Language } from '../../utils/i18n';

interface NoScoreViewProps {
  schedule?: ExamScheduleDto | null;
  candidateName?: string | null;
  studentCode?: string | null;
  email?: string | null;
  examTitle?: string | null;
  courseCode?: string | null;
  language?: Language;
  onRefresh?: () => void;
  isStudent?: boolean;
}

export const NoScoreView: React.FC<NoScoreViewProps> = ({
  schedule,
  candidateName,
  studentCode,
  email,
  examTitle,
  courseCode,
  language = 'vi',
  onRefresh,
  isStudent = false,
}) => {
  const isVi = language === 'vi';
  const t = (vi: string, en: string) => (isVi ? vi : en);

  const status = schedule?.status;
  const isPending = !status || status === 'PENDING';
  const isInProgress = status === 'IN_PROGRESS';
  const isCompleted = status === 'COMPLETED';

  // Format datetime
  const formatTime = (iso?: string | null) => {
    if (!iso) return t('Chưa xác định', 'Not specified');
    try {
      const d = new Date(iso);
      return d.toLocaleString(isVi ? 'vi-VN' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  // Status configuration
  const getStatusConfig = () => {
    if (isInProgress) {
      return {
        badge: t('Đang thi vấn đáp', 'In Progress'),
        badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
        title: t('Ca thi đang diễn ra — Chưa có điểm', 'Exam In Progress — No Grade Yet'),
        description: t(
          'Thí sinh đang trong phòng thi vấn đáp trực tiếp với AI. Hệ thống đang ghi nhận các câu trả lời và sẽ tổng hợp kết quả ngay khi ca thi kết thúc.',
          'The candidate is currently in the oral viva session. Audio and responses are being recorded and evaluated in real-time.'
        ),
        accentBg: 'from-blue-600/10 via-indigo-600/5 to-transparent',
        iconBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
        icon: Sparkles,
      };
    }

    if (isCompleted) {
      return {
        badge: t('Chờ chốt điểm', 'Pending Final Grade'),
        badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
        title: t('Ca thi đã hoàn thành — Đang chờ chốt điểm', 'Exam Completed — Grading Pending'),
        description: t(
          'Thí sinh đã hoàn thành phần thi vấn đáp. Biên bản hội thoại đang được AI và Hội đồng Giảng viên thẩm định trước khi công bố điểm chính thức.',
          'The oral examination has concluded. The transcript and AI rubric assessment are being reviewed by the examination board.'
        ),
        accentBg: 'from-amber-600/10 via-orange-600/5 to-transparent',
        iconBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
        icon: Clock,
      };
    }

    // Default / PENDING
    return {
      badge: t('Chưa có điểm / Chưa thi', 'Not Graded / Scheduled'),
      badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
      title: t('Chưa có kết quả điểm thi', 'No Examination Grade Available'),
      description: t(
        'Thí sinh chưa bước vào ca thi này hoặc chưa có kết quả đánh giá. Điểm số, biên bản đối thoại và phiếu đánh giá năng lực sẽ tự động xuất hiện tại đây sau khi ca thi kết thúc.',
        'This examination has not yet taken place or has not been scored yet. Detailed evaluation reports will appear once the viva session completes.'
      ),
      accentBg: 'from-slate-500/10 via-indigo-500/5 to-transparent',
      iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
      icon: Calendar,
    };
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  const displayCandidateName = candidateName || schedule?.student?.fullName || schedule?.student?.username || t('Thí sinh', 'Candidate');
  const displayStudentCode = studentCode || schedule?.student?.studentCode || schedule?.student?.username || t('N/A', 'N/A');
  const displayEmail = email || schedule?.student?.email || '';
  const displayExamTitle = examTitle || schedule?.examTitle || t('Kỳ thi vấn đáp AI', 'AI Viva Exam');
  const displayCourseCode = courseCode || schedule?.courseCode || 'AIVES';

  return (
    <div className="space-y-6 animate-tab-enter">
      {/* Hero Empty / Pending Card */}
      <div className={`p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden bg-gradient-to-br ${config.accentBg}`}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${config.iconBg}`}>
              <StatusIcon className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${config.badgeClass}`}>
                  {config.badge}
                </span>
                <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                  {displayCourseCode}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-display">
                {config.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                {config.description}
              </p>
            </div>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors shrink-0 self-start cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('Làm mới dữ liệu', 'Refresh Data')}</span>
            </button>
          )}
        </div>

        {/* Candidate & Schedule Meta Grid */}
        <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              {t('Thí sinh', 'Candidate')}
            </span>
            <p className="font-bold text-slate-900 dark:text-white truncate">
              {displayCandidateName}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
              MSSV: {displayStudentCode}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              {t('Môn học & Kỳ thi', 'Course & Exam')}
            </span>
            <p className="font-bold text-slate-900 dark:text-white truncate">
              {displayExamTitle}
            </p>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate">
              {displayCourseCode}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              {t('Thời gian ca thi', 'Scheduled Time')}
            </span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {formatTime(schedule?.scheduledStartTime)}
            </p>
            {schedule?.scheduledEndTime && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                đến {formatTime(schedule.scheduledEndTime)}
              </p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              {t('Trạng thái điểm số', 'Grade Status')}
            </span>
            <p className="font-bold text-amber-600 dark:text-amber-400">
              {schedule?.finalScore !== null && schedule?.finalScore !== undefined
                ? `${schedule.finalScore} / 10`
                : t('Chưa có điểm', 'Not Graded')}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isCompleted ? t('Đang chờ thẩm định', 'Under review') : t('Chưa thực hiện', 'Pending exam')}
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Explanation Helper */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t('Quy trình khảo thí & Công bố điểm', 'Viva Evaluation & Grading Flow')}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
              <span>{t('Thi vấn đáp AI (Mobile)', 'AI Oral Examination')}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
              {t(
                'Thí sinh tham gia phòng thi vấn đáp trên ứng dụng Mobile đúng giờ quy định. AI Examiner đặt câu hỏi và phân tích câu trả lời.',
                'Candidate attends the oral viva on the Mobile app at the scheduled time. AI examiner poses questions and records responses.'
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
              <span>{t('AI Phân tích Rubric & Điểm', 'AI Rubric Synthesis')}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
              {t(
                'Hệ thống AI xử lý biên bản đối thoại (Transcript), đối chiếu tiêu chí rubric và đề xuất điểm số sơ bộ cùng nhận xét.',
                'AI engine processes the verbatim transcript against the scoring rubric, generating initial scores and strength/weakness critiques.'
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
              <span>{t('Hội đồng Chốt & Công bố', 'Official Grade Finalization')}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
              {t(
                'Giảng viên thẩm định bài thi, điều chỉnh nếu cần thiết và bấm Chốt điểm. Bảng điểm chính thức sẽ được kích hoạt tại đây.',
                'The course lecturer verifies the evaluation, applies any necessary adjustments, and finalizes the official grade for viewing.'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
