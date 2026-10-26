import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Pencil, Plus, RefreshCw, Trash2, Award } from 'lucide-react';
import type { ExamDetailDto, ExamScheduleDto } from '../../../types/examApi';
import { lecturerExamService } from '../../../services/lecturerExamService';
import { canDeleteExam, canStartSchedule, formatExamTime, isExamOwner } from '../../../utils/lecturerExam';
import { LecturerExamForm } from './ExamForm';
import { LecturerScheduleForm } from './ScheduleForm';
import { LecturerAssignedQuestions } from './AssignedQuestions';
import { ExamConfirmation } from './ExamConfirmation';
import { ExamButton, ExamError, ExamField, ExamLoading, inputClass, panelClass, ScheduleBadge } from './ExamUi';

type Modal = { kind: 'exam' | 'enroll' | 'deleteExam' }
  | { kind: 'schedule' | 'questions' | 'assign' | 'start' | 'deleteSchedule'; schedule: ExamScheduleDto };

export function LecturerExamDetail({ examId, userId, userRole, language, onBack, onNavigateToResults }: { examId: string; userId: string; userRole?: string; language: 'vi' | 'en'; onBack: () => void; onNavigateToResults?: (examId: string, scheduleId?: string) => void }) {
  const t = (vi: string, en: string) => language === 'vi' ? vi : en;
  const [params, setParams] = useSearchParams();
  const view = ['overview', 'schedules', 'settings'].includes(params.get('view') || '') ? params.get('view')! : 'overview';
  const search = params.get('student') || '';
  const filter = params.get('status') || 'ALL';
  function setQuery(key: string, value: string, replace = false) { setParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); return next; }, { replace }); }
  const [detail, setDetail] = useState<ExamDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<Modal | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const request = useRef<AbortController | null>(null);

  const reload = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    try {
      // Detail already contains the full schedule list and fresh counters.
      const result = await lecturerExamService.detail(examId, controller.signal, true);
      if (!controller.signal.aborted) setDetail(result);
    } catch (e) { if (!controller.signal.aborted) setError(e); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [examId]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- Load and track request state for the selected server resource.
    void reload();
    return () => request.current?.abort();
  }, [reload]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);

  function closeMutation() {
    setModal(null);
    // Reconcile after cancellation/errors as the server may have committed a timed-out request.
    void reload();
  }
  function changed(message: string) {
    setModal(null);
    setNotice(message);
    void reload();
  }

  const exam = detail?.exam;
  const owner = userRole === 'ADMIN' || (!!exam && isExamOwner(exam, userId, userRole));
  const ready = !!detail && !loading && !error;
  const rows = detail?.schedules.filter(s => {
    const match = `${s.student?.fullName ?? ''} ${s.student?.studentCode ?? ''} ${s.student?.email ?? ''} ${s.student?.id ?? ''}`.toLowerCase().includes(search.toLowerCase());
    return match && (filter === 'ALL' || s.status === filter);
  }) ?? [];

  const scheduleActions = (s: ExamScheduleDto) => <div className="flex flex-wrap items-start gap-2">
    {s.status === 'COMPLETED' && <ExamButton primary onClick={() => onNavigateToResults?.(exam!.id, s.id)}><Award aria-hidden="true" className="h-4 w-4" />{t('Xem kết quả', 'View result')}</ExamButton>}
    {s.status === 'PENDING' && owner && <ExamButton primary disabled={!ready || !canStartSchedule(s, now)} onClick={() => setModal({ kind: 'start', schedule: s })}>{t('Bắt đầu lượt thi', 'Start examination')}</ExamButton>}
    <details className="min-w-0"><summary className="ui-button list-none [&::-webkit-details-marker]:hidden">{t('Thao tác khác', 'More actions')}</summary><div className="mt-2 flex max-w-64 flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2">
      <ExamButton disabled={!ready} onClick={() => setModal({ kind: 'questions', schedule: s })}>{t('Xem câu hỏi', 'View questions')}</ExamButton>
      {owner && <><ExamButton disabled={!ready || s.status !== 'PENDING'} onClick={() => setModal({ kind: 'schedule', schedule: s })}>{t('Đổi giờ', 'Reschedule')}</ExamButton><ExamButton disabled={!ready || s.status !== 'PENDING' || s.assignedQuestionCount > 0} onClick={() => setModal({ kind: 'assign', schedule: s })}>{t('Gán câu hỏi', 'Assign questions')}</ExamButton><ExamButton danger disabled={!ready || s.status !== 'PENDING'} onClick={() => setModal({ kind: 'deleteSchedule', schedule: s })}><Trash2 aria-hidden="true" className="h-4 w-4" />{t('Xóa lịch', 'Remove schedule')}</ExamButton></>}
    </div></details>
    {owner && s.status === 'PENDING' && !canStartSchedule(s, now) && <p className="w-full text-xs leading-relaxed text-[var(--muted)]">{t('Chỉ bắt đầu trong khung giờ thi hợp lệ.', 'Starting requires a valid examination time window.')}</p>}
  </div>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><ExamButton onClick={onBack}><ArrowLeft aria-hidden="true" className="h-4 w-4" />{t('Danh sách kỳ thi', 'Examinations')}</ExamButton><ExamButton disabled={loading} onClick={() => void reload()}><RefreshCw aria-hidden="true" className="h-4 w-4" />{t('Tải lại dữ liệu', 'Reload data')}</ExamButton></div>
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">{notice}</p>}
    <ExamError error={error} language={language} />
    {loading && <ExamLoading language={language} />}
    {exam && detail && <>
      {!!error && <p className="text-sm text-amber-700 dark:text-amber-300">{t('Dữ liệu bên dưới có thể đã cũ. Tải lại thành công trước khi thao tác.', 'The data below may be stale. Reload successfully before making changes.')}</p>}
      <section className={panelClass}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0"><p className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400"><BookOpen aria-hidden="true" className="h-4 w-4" />{exam.courseCode ?? '—'} · {exam.courseName ?? '—'}</p><h1 className="break-words text-2xl font-bold">{exam.title}</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{formatExamTime(exam.startDate, language)} — {formatExamTime(exam.endDate, language)} (UTC+07:00)</p><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('Người tạo', 'Created by')}: {exam.createdBy?.fullName ?? '—'}</p></div>
          {owner && <div className="flex flex-wrap gap-2"><ExamButton disabled={!ready} onClick={() => setModal({ kind: 'exam' })}><Pencil aria-hidden="true" className="h-4 w-4" />{t('Sửa kỳ thi', 'Edit exam')}</ExamButton><ExamButton danger disabled={!ready || !canDeleteExam(exam, userId, userRole)} title={t('Chỉ xóa khi chưa có lịch đang thi/hoàn thành.', 'Only exams without active/completed schedules can be deleted.')} onClick={() => setModal({ kind: 'deleteExam' })}><Trash2 aria-hidden="true" className="h-4 w-4" />{t('Xóa', 'Delete')}</ExamButton></div>}
        </div>
        {!owner && <p className="mt-4 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">{t('Bạn được xem kỳ thi thuộc môn phụ trách. Chỉ giảng viên tạo kỳ thi mới được chỉnh sửa, xếp lịch hoặc bắt đầu lượt thi.', 'You can view this examination as a course lecturer. Only its creator can edit, schedule, or start examinations.')}</p>}
        {view === 'settings' && <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-sm dark:border-slate-700 sm:grid-cols-3 lg:grid-cols-5">
          {[
            [t('Câu hỏi chính', 'Main questions'), exam.maxMainQuestions],
            [t('Tổng follow-up', 'Total follow-ups'), exam.maxFollowupQuestions],
            [t('Follow-up / câu chính', 'Follow-ups / main'), exam.maxFollowupsPerMain],
            [t('Giây / câu chính', 'Seconds / main'), exam.mainAnswerTimeLimitSeconds],
            [t('Giây / follow-up', 'Seconds / follow-up'), exam.followupAnswerTimeLimitSeconds],
          ].map(([label, value]) => <div key={String(label)}><dt className="text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 font-semibold">{value ?? '—'}</dd></div>)}
        </dl>}
      </section>
      <nav aria-label={t('Nội dung kỳ thi', 'Examination sections')} className="flex flex-wrap gap-2">{[['overview', t('Tổng quan', 'Overview')], ['schedules', t('Lịch thi sinh viên', 'Student schedules')], ['settings', t('Cấu hình câu hỏi', 'Question settings')]].map(([id, label]) => <ExamButton key={id} primary={view === id} aria-current={view === id ? 'page' : undefined} onClick={() => setQuery('view', id)}>{label}</ExamButton>)}</nav>
      {view === 'overview' && <><dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
        [t('Sinh viên đã xếp lịch', 'Scheduled students'), exam.totalStudents],
        [t('Chờ thi', 'Pending'), exam.pendingStudents],
        [t('Đang thi', 'In progress'), exam.inProgressStudents],
        [t('Hoàn thành', 'Completed'), exam.completedStudents],
      ].map(([label, value]) => <div key={String(label)} className={panelClass}><dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-2 text-2xl font-bold">{value}</dd></div>)}</dl><section className={`${panelClass} flex flex-wrap items-center justify-between gap-4`}><div><h2 className="text-lg font-semibold">{t('Chuẩn bị lịch thi', 'Prepare student schedules')}</h2><p className="mt-2 text-sm text-[var(--muted)]">{t('Thêm sinh viên, kiểm tra khung giờ và theo dõi từng lượt thi.', 'Add students, review time windows, and follow each examination attempt.')}</p></div><ExamButton primary onClick={() => setQuery('view', 'schedules')}>{t('Quản lý lịch thi', 'Manage schedules')}</ExamButton></section></>}
      {view === 'settings' && <div className={panelClass}><h2 className="text-lg font-semibold">{t('Cấu hình & Điều kiện chỉnh sửa', 'Configuration & editing rules')}</h2><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{t('Cấu hình câu hỏi hiển thị ở phần thông tin kỳ thi phía trên. Sau khi câu hỏi được gán hoặc có ca thi đang/đã hoàn thành, các thiết lập câu hỏi và thời gian trả lời sẽ bị khóa.', 'Question settings are shown in the examination information above. Question and answer-time settings become locked after questions are assigned or schedules are active/completed.')}</p></div>}
      {view === 'schedules' && <section className={panelClass} aria-labelledby="lecturer-schedules-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="lecturer-schedules-heading" className="text-lg font-bold">{t('Lịch thi sinh viên', 'Student schedules')}</h2>{owner && <ExamButton primary disabled={!ready} onClick={() => setModal({ kind: 'enroll' })}><Plus aria-hidden="true" className="h-4 w-4" />{t('Thêm sinh viên', 'Add students')}</ExamButton>}</div>
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]"><ExamField label={t('Tìm trong danh sách lịch thi', 'Search this schedule list')}><input className={inputClass} value={search} onChange={e => setQuery('student', e.target.value, true)} placeholder={t('Tên, mã sinh viên hoặc email', 'Name, student code or email')} /></ExamField><ExamField label={t('Trạng thái', 'Status')}><select className={inputClass} value={filter} onChange={e => setQuery('status', e.target.value)}><option value="ALL">{t('Tất cả', 'All')}</option><option value="PENDING">{t('Chờ thi', 'Pending')}</option><option value="IN_PROGRESS">{t('Đang thi', 'In progress')}</option><option value="COMPLETED">{t('Hoàn thành', 'Completed')}</option></select></ExamField></div>
        <div className="space-y-4 md:hidden">{rows.map(s => <article key={s.id} className="rounded-xl border border-[var(--line)] p-4"><div className="mb-3 flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{s.student?.fullName || '—'}</h3><p className="mt-1 text-xs text-[var(--muted)]">{s.student?.studentCode || '—'}</p></div><ScheduleBadge status={s.status} language={language} /></div><p className="break-all text-xs text-[var(--muted)]">{s.student?.email || '—'}</p><div className="my-4 space-y-1 text-sm"><p>{formatExamTime(s.scheduledStartTime, language)}</p><p className="text-[var(--muted)]">{t('Đến', 'Until')} {formatExamTime(s.scheduledEndTime, language)}</p></div><p className="mb-4 text-sm">{s.assignedQuestionCount} {t('câu hỏi', 'questions')} · {t('Điểm', 'Score')}: {s.finalScore ?? '—'}</p>{scheduleActions(s)}</article>)}</div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-left text-sm">
            <caption className="sr-only">{t('Danh sách lịch thi theo giờ Việt Nam', 'Student schedules in Vietnam time')}</caption>
            <thead className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400"><tr>{[t('Sinh viên', 'Student'), t('Khung giờ (UTC+07)', 'Time window (UTC+07)'), t('Trạng thái', 'Status'), t('Câu hỏi / Điểm', 'Questions / Score'), t('Thao tác', 'Actions')].map(label => <th key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{rows.map(s => <tr key={s.id}>
              <td className="max-w-56 px-3 py-4"><p className="font-semibold">{s.student?.fullName ?? '—'}</p><p className="text-xs text-slate-500 dark:text-slate-400">{s.student?.studentCode ?? '—'}</p><p className="break-all text-xs text-slate-500 dark:text-slate-400">{s.student?.email ?? '—'}</p><details className="mt-1 text-xs text-slate-500 dark:text-slate-400"><summary className="cursor-pointer">UUID</summary><p className="mt-1 break-all font-mono">{s.student?.id ?? '—'}</p></details></td>
              <td className="px-3 py-4"><p>{formatExamTime(s.scheduledStartTime, language)}</p><p className="text-slate-500 dark:text-slate-400">{formatExamTime(s.scheduledEndTime, language)}</p>{s.actualStartTime && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('Thực bắt đầu', 'Actually started')}: {formatExamTime(s.actualStartTime, language)}</p>}</td>
              <td className="px-3 py-4"><ScheduleBadge status={s.status} language={language} /></td>
              <td className="px-3 py-4"><p>{s.assignedQuestionCount} {t('câu đã gán', 'assigned')}</p><p className="mt-1 font-semibold">{s.finalScore != null ? `${s.finalScore}/10` : t('Chưa có điểm', 'Not graded')}</p></td>
              <td className="max-w-72 px-3 py-4">{scheduleActions(s)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {!rows.length && <p role="status" className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{detail.schedules.length ? t('Không có lịch khớp bộ lọc.', 'No schedules match your filter.') : t('Kỳ thi chưa có sinh viên được xếp lịch.', 'No students have been scheduled yet.')}</p>}
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{t('Gán câu hỏi không bắt đầu ca thi. Sinh viên kết nối phòng vấn đáp từ lịch thi của mình.', 'Assigning questions does not start an examination. Students connect to the viva room from their own schedules.')}</p>
      </section>}
      {modal?.kind === 'exam' && <LecturerExamForm detail={detail} userId={userId} userRole={userRole} language={language} onClose={closeMutation} onSaved={() => changed(t('Đã cập nhật kỳ thi.', 'Examination updated.'))} />}
      {modal?.kind === 'enroll' && <LecturerScheduleForm detail={detail} language={language} onClose={closeMutation} onSaved={() => changed(t('Đã thêm sinh viên vào lịch thi.', 'Students added to the schedule.'))} />}
      {modal?.kind === 'schedule' && <LecturerScheduleForm detail={detail} schedule={modal.schedule} language={language} onClose={closeMutation} onSaved={() => changed(t('Đã cập nhật giờ thi.', 'Schedule updated.'))} />}
      {modal?.kind === 'questions' && <LecturerAssignedQuestions schedule={modal.schedule} language={language} onClose={() => setModal(null)} />}
      {modal?.kind === 'deleteExam' && <ExamConfirmation language={language} danger title={t('Xóa kỳ thi?', 'Delete examination?')} description={t(`Xóa “${exam.title}” cùng các lịch PENDING và câu hỏi đã gán của chúng.`, `Delete “${exam.title}” including its pending schedules and assigned questions.`)} confirmLabel={t('Xóa kỳ thi', 'Delete exam')} onClose={closeMutation} onConfirm={async () => { await lecturerExamService.remove(exam.id); onBack(); }} />}
      {modal?.kind === 'deleteSchedule' && <ExamConfirmation language={language} danger title={t('Xóa lịch thi?', 'Remove schedule?')} description={t(`Xóa lịch của ${modal.schedule.student?.fullName ?? 'sinh viên'} và các câu hỏi đã gán. Tài khoản sinh viên vẫn được giữ.`, `Remove the schedule for ${modal.schedule.student?.fullName ?? 'this student'} and its questions. The student account is retained.`)} confirmLabel={t('Xóa lịch', 'Remove schedule')} onClose={closeMutation} onConfirm={async () => { await lecturerExamService.removeSchedule(modal.schedule.id); changed(t('Đã xóa lịch thi.', 'Schedule removed.')); }} />}
      {modal?.kind === 'assign' && <ExamConfirmation language={language} title={t('Gán bộ câu hỏi?', 'Assign questions?')} description={t(`Gán ${exam.maxMainQuestions} câu chính cho ${modal.schedule.student?.fullName ?? 'sinh viên'}. Mỗi lịch chỉ được gán một lần; cấu hình câu hỏi của kỳ thi sẽ được khóa.`, `Assign ${exam.maxMainQuestions} main questions to ${modal.schedule.student?.fullName ?? 'this student'}. Assignment is one-time and locks the exam question settings.`)} confirmLabel={t('Gán câu hỏi', 'Assign questions')} onClose={closeMutation} onConfirm={async () => { const result = await lecturerExamService.assignQuestions(modal.schedule.id); changed(t(`Đã gán ${result.totalAssigned} câu hỏi. Lịch vẫn ở trạng thái Chờ thi.`, `${result.totalAssigned} questions assigned. The schedule remains pending.`)); }} />}
      {modal?.kind === 'start' && <ExamConfirmation language={language} title={t('Bắt đầu lượt thi?', 'Start examination?')} description={t(`Bắt đầu lượt thi cho ${modal.schedule.student?.fullName ?? 'sinh viên'} ngay bây giờ. Server tự gán câu hỏi nếu cần và chuyển lịch sang Đang thi. Sau đó không thể đổi giờ/xóa lịch; đây không phải mở phòng thi AI mô phỏng.`, `Start the examination for ${modal.schedule.student?.fullName ?? 'this student'} now. The server assigns questions if needed and changes the schedule to In progress. Rescheduling/deletion will be disabled; this does not open the demo AI room.`)} confirmLabel={t('Bắt đầu lượt thi', 'Start examination')} onClose={closeMutation} onConfirm={async () => { await lecturerExamService.start(modal.schedule.id); changed(t('Đã bắt đầu lượt thi và ghi nhận thời gian thực tế.', 'Examination started; actual start time recorded.')); }} />}
    </>}
  </div>;
}
