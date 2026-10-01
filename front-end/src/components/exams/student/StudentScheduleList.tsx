import { useEffect, useState } from 'react';
import { BookOpen, Calendar, Clock, Play, RefreshCw, Award, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ExamScheduleDto } from '../../../types/examApi';
import type { UserAccount } from '../../../types';
import { studentExamService } from '../../../services/studentExamService';
import { canStartSchedule, formatExamTime } from '../../../utils/lecturerExam';
import { ExamButton, ExamError, ExamField, ExamLoading, inputClass, panelClass, ScheduleBadge } from '../lecturer/ExamUi';
import { ExamConfirmation } from '../lecturer/ExamConfirmation';

interface Props {
  currentUser: UserAccount;
  language: 'vi' | 'en';
}

export function StudentScheduleList({ currentUser, language }: Props) {
  const [schedules, setSchedules] = useState<ExamScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selectedSchedule, setSelectedSchedule] = useState<ExamScheduleDto | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const t = (vi: string, en: string) => language === 'vi' ? vi : en;

  // Poll current time every second to accurately enable the start button
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Fetch real student schedules from GET /api/student/my-schedules
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    studentExamService.mySchedules(controller.signal)
      .then(data => {
        if (!controller.signal.aborted) {
          setSchedules(data);
        }
      })
      .catch(e => {
        if (!controller.signal.aborted) setError(e);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  const filtered = schedules.filter(s => filter === 'ALL' || s.status === filter);

  const pendingCount = schedules.filter(s => s.status === 'PENDING').length;
  const inProgressCount = schedules.filter(s => s.status === 'IN_PROGRESS').length;
  const completedCount = schedules.filter(s => s.status === 'COMPLETED').length;

  const handleStartExam = async (scheduleId: string) => {
    const updated = await studentExamService.start(scheduleId);
    setSelectedSchedule(null);
    setNotice(t('Đã bắt đầu ca thi thành công! Thời gian bắt đầu thực tế đã được ghi nhận.', 'Examination started successfully! Actual start time has been recorded.'));
    // Update local state with fresh DTO
    setSchedules(prev => prev.map(s => s.id === scheduleId ? updated : s));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {t('Không gian sinh viên', 'Student workspace')}
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {t('Lịch thi vấn đáp của tôi', 'My Viva Voce Examinations')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            {t(
              'Xem các ca thi được xếp lịch cho bạn và bắt đầu lượt thi khi đến khung giờ quy định. Dữ liệu được tải trực tiếp từ máy chủ.',
              'View your assigned examination schedules and start your oral viva when your time window opens. Data is loaded directly from the server.'
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <ExamButton disabled={loading} onClick={() => setReload(r => r + 1)}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            {t('Tải lại', 'Reload')}
          </ExamButton>
        </div>
      </header>

      {/* Success Notification */}
      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}

      {/* Stats Counter Bar */}
      <div className={`${panelClass} grid gap-4 sm:grid-cols-4`}>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('Tổng số ca thi', 'Total schedules')}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{schedules.length}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('Chờ thi', 'Pending')}</p>
          <p className="mt-1 text-2xl font-bold text-slate-700 dark:text-slate-300">{pendingCount}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{t('Đang thi', 'In progress')}</p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{inProgressCount}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{t('Hoàn thành', 'Completed')}</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedCount}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className={`${panelClass} flex flex-wrap items-center justify-between gap-4`}>
        <div className="w-full sm:w-64">
          <ExamField label={t('Lọc theo trạng thái', 'Filter by status')}>
            <select className={inputClass} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="ALL">{t('Tất cả trạng thái', 'All statuses')}</option>
              <option value="PENDING">{t('Chờ thi (Pending)', 'Pending')}</option>
              <option value="IN_PROGRESS">{t('Đang thi (In progress)', 'In progress')}</option>
              <option value="COMPLETED">{t('Hoàn thành (Completed)', 'Completed')}</option>
            </select>
          </ExamField>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t(`Hiển thị ${filtered.length} trên tổng số ${schedules.length} ca thi`, `Showing ${filtered.length} of ${schedules.length} schedules`)}
        </p>
      </div>

      {/* Content Section */}
      {loading ? (
        <ExamLoading language={language} />
      ) : error ? (
        <div className="space-y-3">
          <ExamError error={error} language={language} />
          <ExamButton onClick={() => setReload(r => r + 1)}>{t('Thử tải lại', 'Retry')}</ExamButton>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`${panelClass} py-12 text-center`}>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <BookOpen className="h-6 w-6 text-slate-400" />
          </div>
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">
            {schedules.length === 0 ? t('Chưa có lịch thi nào được xếp', 'No schedules assigned yet') : t('Không có lịch thi khớp bộ lọc', 'No schedules match this filter')}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {schedules.length === 0
              ? t('Hiện tại bạn chưa được xếp lịch thi vấn đáp nào. Vui lòng liên hệ giảng viên phụ trách môn học nếu bạn chưa có tên trong danh sách.', 'You have not been scheduled for any viva exams yet. Please contact your course lecturer if you are enrolled in an exam.')
              : t('Thử chọn trạng thái khác trong bộ lọc phía trên.', 'Try selecting a different status filter above.')}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(s => {
            const isEligibleToStart = canStartSchedule(s, now);
            const isPast = s.scheduledEndTime ? now >= Date.parse(s.scheduledEndTime) : false;
            const isFuture = s.scheduledStartTime ? now < Date.parse(s.scheduledStartTime) : false;

            return (
              <article key={s.id} className={`${panelClass} flex flex-col justify-between border-l-4 ${s.status === 'COMPLETED' ? 'border-l-emerald-500' : s.status === 'IN_PROGRESS' ? 'border-l-amber-500' : 'border-l-indigo-500'}`}>
                <div>
                  {/* Top: Course & Status */}
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      <BookOpen aria-hidden="true" className="h-4 w-4" />
                      {s.courseCode ?? '—'}
                    </span>
                    <ScheduleBadge status={s.status} language={language} />
                  </div>

                  {/* Title & Course Name */}
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white break-words">
                    {s.examTitle}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {s.courseName ?? '—'}
                  </p>

                  {/* Time Window */}
                  <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-sm dark:bg-slate-800/60 space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                      <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{t('Khung giờ thi quy định:', 'Scheduled window:')}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 pl-6">
                      {formatExamTime(s.scheduledStartTime, language)} → {formatExamTime(s.scheduledEndTime, language)} (UTC+07)
                    </p>

                    {s.actualStartTime && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{t('Bắt đầu thực tế:', 'Actual start:')} {formatExamTime(s.actualStartTime, language)}</span>
                      </div>
                    )}
                  </div>

                  {/* Score & Questions Info */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="flex items-center gap-1">
                      <Award className="h-4 w-4 text-indigo-500" />
                      {t('Điểm tổng kết:', 'Final score:')}{' '}
                      <strong className="text-sm font-bold text-slate-900 dark:text-white">
                        {s.finalScore != null ? `${s.finalScore}/10` : t('Chưa có điểm', 'Not graded')}
                      </strong>
                    </span>
                    <span>
                      {s.assignedQuestionCount > 0
                        ? `${s.assignedQuestionCount} ${t('câu hỏi đã gán', 'assigned questions')}`
                        : t('Tự động bốc đề khi bắt đầu', 'Auto-assigned upon start')}
                    </span>
                  </div>
                </div>

                {/* Action Area */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {s.status === 'PENDING' && (
                    <div className="space-y-2">
                      <ExamButton
                        primary
                        disabled={!isEligibleToStart}
                        className="w-full text-center"
                        title={
                          isEligibleToStart
                            ? t('Bấm để bắt đầu làm bài thi', 'Click to begin examination')
                            : isFuture
                            ? t('Chưa tới khung giờ thi được xếp', 'Scheduled time window has not arrived yet')
                            : t('Đã quá thời gian thi quy định', 'Examination time window has passed')
                        }
                        onClick={() => setSelectedSchedule(s)}
                      >
                        <Play className="h-4 w-4 fill-current" />
                        {t('Bắt đầu lượt thi', 'Start Examination')}
                      </ExamButton>

                      {!isEligibleToStart && (
                        <p className="text-center text-xs text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {isFuture
                            ? t('Chưa đến khung giờ thi. Nút sẽ tự động bật khi đến giờ.', 'Waiting for scheduled slot. The button activates automatically.')
                            : isPast
                            ? t('Đã hết khung giờ thi quy định.', 'Scheduled examination slot has expired.')
                            : t('Chưa có khung giờ hợp lệ.', 'Missing valid schedule times.')}
                        </p>
                      )}
                    </div>
                  )}

                  {s.status === 'IN_PROGRESS' && (
                    <div className="rounded-lg bg-amber-50 p-2.5 text-center text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                      {t('Lượt thi đang diễn ra. Vui lòng thực hiện phần vấn đáp.', 'Exam in progress. Please proceed with your oral viva voce.')}
                    </div>
                  )}

                  {s.status === 'COMPLETED' && (
                    <div className="rounded-lg bg-emerald-50 p-2.5 text-center text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                      {t('Đã hoàn thành lượt thi.', 'Examination completed.')}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal to Start Exam */}
      {selectedSchedule && (
        <ExamConfirmation
          language={language}
          title={t('Bắt đầu ca thi vấn đáp?', 'Start oral viva examination?')}
          description={t(
            `Bạn chuẩn bị bắt đầu ca thi cho môn “${selectedSchedule.courseCode} — ${selectedSchedule.examTitle}”. Hệ thống sẽ tự động bốc câu hỏi từ ngân hàng đề và ghi nhận thời gian bắt đầu thực tế. Bạn không thể hoàn tác thao tác này.`,
            `You are about to start the examination for “${selectedSchedule.courseCode} — ${selectedSchedule.examTitle}”. The system will auto-assign questions and record your actual start time. This action cannot be undone.`
          )}
          confirmLabel={t('Bắt đầu thi ngay', 'Start Exam Now')}
          onClose={() => setSelectedSchedule(null)}
          onConfirm={() => handleStartExam(selectedSchedule.id)}
        />
      )}
    </div>
  );
}
