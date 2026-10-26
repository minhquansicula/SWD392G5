import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, ChevronLeft, ChevronRight, FileText, MessageSquareText, RefreshCw } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ClassAnalyticsData, StudentAssignment, StudentEvaluationReport, UserAccount } from '../../types';
import type { ExamDto, ExamScheduleDto } from '../../types/examApi';
import type { Language } from '../../utils/i18n';
import { studentExamService } from '../../services/studentExamService';
import { lecturerExamService } from '../../services/lecturerExamService';
import { getSessionDetail } from '../../services/aiService';
import type { SessionDetail } from '../../services/aiService';
import { formatExamTime } from '../../utils/lecturerExam';
import { Button, EmptyState, LoadingState, PageHeader } from '../ui';

interface ResultAnalyticsViewProps {
  report?: StudentEvaluationReport;
  analytics?: ClassAnalyticsData;
  assignments?: StudentAssignment[];
  onSelectCandidate?: (candidateId: string) => void;
  defaultSubTab?: 'student' | 'transcript' | 'class';
  language?: Language;
  currentUser?: UserAccount | null;
  initialExamId?: string;
  initialScheduleId?: string;
}

export function ResultAnalyticsView({ language = 'vi', currentUser, initialExamId, initialScheduleId, defaultSubTab = 'student' }: ResultAnalyticsViewProps) {
  const vi = language === 'vi';
  const t = useCallback((vn: string, en: string) => vi ? vn : en, [vi]);
  const student = currentUser?.role === 'STUDENT';
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get('tab') || defaultSubTab;
  const tab = requestedTab === 'transcript' ? 'transcript' : requestedTab === 'class' && !student ? 'class' : 'student';
  const [exams, setExams] = useState<ExamDto[]>([]);
  const [examPages, setExamPages] = useState(0);
  const pageValue = Number(params.get('examPage') || 0);
  const examPage = Number.isInteger(pageValue) && pageValue >= 0 ? pageValue : 0;
  const requestedExam = params.get('exam') || initialExamId || '';
  const examId = requestedExam || exams[0]?.id || '';
  const [schedules, setSchedules] = useState<ExamScheduleDto[]>([]);
  const requestedSchedule = params.get('schedule') || initialScheduleId;
  const selected = requestedSchedule ? schedules.find(schedule => schedule.id === requestedSchedule) : schedules.find(schedule => schedule.status === 'COMPLETED') || schedules[0];
  const [sessionDetail, setDetail] = useState<SessionDetail | null>(null);
  const matchingDetail = sessionDetail?.schedule_id === selected?.id ? sessionDetail : null;
  const detail = matchingDetail ? { ...matchingDetail, transcripts: Array.isArray(matchingDetail.transcripts) ? matchingDetail.transcripts : [], assigned_questions: Array.isArray(matchingDetail.assigned_questions) ? matchingDetail.assigned_questions : [], results: Array.isArray(matchingDetail.results) ? matchingDetail.results : [] } : null;
  const [loading, setLoading] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [reload, setReload] = useState(0);
  function update(values: Record<string, string | null>) {
    setParams(previous => { const next = new URLSearchParams(previous); Object.entries(values).forEach(([key, value]) => value === null ? next.delete(key) : next.set(key, value)); return next; });
  }
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setSchedules([]); setExams([]);
    async function load() {
      try {
        if (student) {
          const data = await studentExamService.mySchedules(controller.signal, true);
          if (!controller.signal.aborted) setSchedules(data);
        } else {
          const data = await lecturerExamService.list(examPage, 50, 'startDate,desc', controller.signal, true);
          if (controller.signal.aborted) return;
          let items = data.content;
          const target = requestedExam;
          if (target && !items.some(exam => exam.id === target)) {
            const targetDetail = await lecturerExamService.detail(target, controller.signal, true);
            items = [targetDetail.exam, ...items];
          }
          if (!controller.signal.aborted) { setExams(items); setExamPages(data.page.totalPages); }
        }
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : t('Không tải được dữ liệu.', 'Unable to load records.')); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [currentUser?.id, currentUser?.role, student, examPage, reload, requestedExam, t]);
  useEffect(() => {
    if (student || !examId || loading) return;
    const controller = new AbortController();
    setLoadingSchedules(true); setScheduleError(''); setSchedules([]);
    lecturerExamService.schedules(examId, controller.signal, true).then(data => { if (!controller.signal.aborted) setSchedules(data); }).catch(err => { if (!controller.signal.aborted) setScheduleError(err instanceof Error ? err.message : t('Không tải được danh sách ca thi.', 'Unable to load examination schedules.')); }).finally(() => { if (!controller.signal.aborted) setLoadingSchedules(false); });
    return () => controller.abort();
  }, [examId, student, loading, reload, t]);
  useEffect(() => {
    let active = true;
    setDetail(null); setDetailError('');
    if (!selected?.id || selected.status !== 'COMPLETED') { setLoadingDetail(false); return; }
    setLoadingDetail(true);
    getSessionDetail(selected.id).then(data => { if (!active) return; if (data?.schedule_id !== selected.id) throw new Error(t('Dữ liệu kết quả không khớp ca thi đã chọn.', 'The result does not match the selected schedule.')); setDetail(data); }).catch(err => { if (active) setDetailError(err instanceof Error ? err.message : t('Chưa tải được chi tiết từ dịch vụ AI.', 'Unable to load AI session details.')); }).finally(() => { if (active) setLoadingDetail(false); });
    return () => { active = false; };
  }, [selected?.id, selected?.status, reload, t]);
  const scores = useMemo(() => schedules.filter(schedule => schedule.finalScore != null && Number.isFinite(Number(schedule.finalScore))).map(schedule => Number(schedule.finalScore)), [schedules]);
  const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
  const distribution = useMemo(() => Array.from({ length: 5 }, (_, index) => ({ range: `${index * 2}–${index === 4 ? '10' : (index + 1) * 2}`, count: scores.filter(score => score >= index * 2 && (index === 4 ? score <= 10 : score < (index + 1) * 2)).length })), [scores]);
  const elapsed = detail?.actual_start_time && detail.actual_end_time ? (Date.parse(detail.actual_end_time) - Date.parse(detail.actual_start_time)) / 60000 : selected?.actualStartTime && selected.actualEndTime ? (Date.parse(selected.actualEndTime) - Date.parse(selected.actualStartTime)) / 60000 : null;
  const duration = elapsed != null && Number.isFinite(elapsed) && elapsed >= 0 ? `${elapsed.toFixed(1)} ${t('phút', 'min')}` : '—';
  const tabs = [{ id: 'student', icon: FileText, label: t('Kết quả', 'Results') }, { id: 'transcript', icon: MessageSquareText, label: t('Hội thoại', 'Transcript') }, ...(!student ? [{ id: 'class', icon: BarChart3, label: t('Phân tích kỳ thi', 'Examination analytics') }] : [])];
  const failure = (message: string) => <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"><span>{message}</span><Button onClick={() => setReload(value => value + 1)}>{t('Thử lại', 'Try again')}</Button></div>;
  return <div className="space-y-6">
    <PageHeader title={student ? t('Kết quả của tôi', 'My results') : t('Kết quả & Phân tích', 'Results & analytics')} description={t('Theo dõi kết quả được ghi nhận và xem lại nội dung vấn đáp. Nhận xét AI chỉ hiển thị khi có dữ liệu thực tế.', 'Review recorded results and examination conversations. AI feedback is displayed only when source data is available.')} actions={<Button disabled={loading || loadingSchedules} onClick={() => setReload(value => value + 1)}><RefreshCw aria-hidden="true" className="h-4 w-4" />{t('Làm mới', 'Refresh')}</Button>} />
    {error ? failure(error) : loading ? <LoadingState label={t('Đang tải kết quả…', 'Loading results…')} /> : <>
      <div className="ui-panel space-y-5 p-5 sm:p-6"><div className="grid gap-4 md:grid-cols-2">
        {!student && <div><label htmlFor="result-exam" className="ui-label">{t('Kỳ thi', 'Examination')}</label><select id="result-exam" className="ui-input" value={examId} onChange={event => update({ exam: event.target.value, schedule: null })} disabled={!exams.length || loadingSchedules}>{!exams.length && <option value="">{t('Chưa có kỳ thi', 'No examinations')}</option>}{exams.map(exam => <option key={exam.id} value={exam.id}>{exam.courseCode} · {exam.title}</option>)}</select>{examPages > 1 && <div className="mt-2 flex items-center gap-2"><Button className="ui-icon-button" disabled={examPage === 0} onClick={() => update({ examPage: String(examPage - 1), exam: null, schedule: null })} aria-label={t('Trang kỳ thi trước', 'Previous examination page')}><ChevronLeft aria-hidden="true" className="h-4 w-4" /></Button><span className="text-xs text-[var(--muted)]">{examPage + 1}/{examPages}</span><Button className="ui-icon-button" disabled={examPage + 1 >= examPages} onClick={() => update({ examPage: String(examPage + 1), exam: null, schedule: null })} aria-label={t('Trang kỳ thi sau', 'Next examination page')}><ChevronRight aria-hidden="true" className="h-4 w-4" /></Button></div>}</div>}
        {tab !== 'class' && <div><label htmlFor="result-schedule" className="ui-label">{student ? t('Ca thi', 'Examination schedule') : t('Sinh viên / Ca thi', 'Student / Schedule')}</label><select id="result-schedule" className="ui-input" value={selected?.id || ''} onChange={event => update({ schedule: event.target.value })} disabled={!schedules.length || loadingSchedules}>{!schedules.length && <option value="">{t('Chưa có ca thi', 'No schedules')}</option>}{schedules.map(schedule => <option key={schedule.id} value={schedule.id}>{student ? `${schedule.courseCode || ''} · ${schedule.examTitle}` : `${schedule.student?.fullName || '—'} · ${schedule.student?.studentCode || schedule.student?.email || ''}`} · {formatExamTime(schedule.scheduledStartTime, language)}</option>)}</select></div>}
      </div><nav aria-label={t('Nội dung kết quả', 'Result sections')} className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">{tabs.map(({ id, icon: Icon, label }) => <Button key={id} variant={tab === id ? 'primary' : 'secondary'} aria-current={tab === id ? 'page' : undefined} onClick={() => update({ tab: id })}><Icon aria-hidden="true" className="h-4 w-4" />{label}</Button>)}</nav></div>
      {scheduleError ? failure(scheduleError) : loadingSchedules ? <LoadingState label={t('Đang tải ca thi…', 'Loading schedules…')} /> : !schedules.length ? <EmptyState title={t('Chưa có ca thi để hiển thị', 'No examination records yet')} description={t('Kết quả sẽ xuất hiện tại đây khi có ca thi được ghi nhận.', 'Results will appear here when examination records are available.')} /> : !selected && tab !== 'class' ? <EmptyState title={t('Ca thi không có trong danh sách được phép xem', 'This schedule is not available to your account')} description={t('Chọn một ca thi khác trong danh sách phía trên.', 'Choose an available schedule from the selector above.')} /> : tab === 'class' ? <>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[[t('Được xếp lịch', 'Scheduled'), schedules.length], [t('Đã hoàn thành', 'Completed'), schedules.filter(schedule => schedule.status === 'COMPLETED').length], [t('Có điểm ghi nhận', 'With recorded scores'), scores.length], [t('Điểm trung bình', 'Average score'), average == null ? '—' : average.toFixed(1)]].map(([label, value]) => <div key={label} className="ui-panel p-5"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p></div>)}</div>
        <section className="ui-panel p-5 sm:p-7"><h2 className="text-lg font-semibold">{t('Phân bố điểm được ghi nhận', 'Recorded score distribution')}</h2><p className="mb-6 mt-2 text-sm text-[var(--muted)]">{t('Chỉ tính các ca có điểm trên lịch thi. Không suy ra thứ hạng hoặc ngưỡng đạt.', 'Includes schedules with recorded scores only. No inferred rankings or pass thresholds.')}</p>{scores.length ? <><div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={distribution} accessibilityLayer><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="range" tick={{ fill: 'var(--muted)', fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} /><Tooltip contentStyle={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink)', borderRadius: 8 }} /><Bar dataKey="count" name={t('Số ca thi', 'Schedules')} fill="#0f766e" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="mt-6 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">{t('Dữ liệu phân bố điểm', 'Score distribution data')}</caption><thead><tr><th scope="col" className="px-4">{t('Khoảng điểm', 'Score interval')}</th><th scope="col" className="px-4">{t('Số ca thi', 'Schedule count')}</th></tr></thead><tbody>{distribution.map((item, index) => <tr key={item.range} className="border-b border-[var(--line)]"><td className="px-4">{item.range}{index < 4 ? t(' (không gồm cận trên)', ' (upper bound excluded)') : ''}</td><td className="px-4 tabular-nums">{item.count}</td></tr>)}</tbody></table></div></> : <p className="py-10 text-center text-sm text-[var(--muted)]">{t('Chưa có điểm để lập biểu đồ.', 'No recorded scores to chart yet.')}</p>}</section>
      </> : <>
        {loadingDetail && <LoadingState label={t('Đang tải chi tiết vấn đáp…', 'Loading session details…')} />}
        {detailError && failure(detailError)}
        {tab === 'transcript' ? <section className="ui-panel p-5 sm:p-7"><h2 className="mb-6 text-lg font-semibold">{t('Biên bản hội thoại', 'Conversation transcript')}</h2>{detail?.transcripts.length ? <ol className="space-y-5">{detail.transcripts.map(item => <li key={item.id}><div className="mb-2 flex flex-wrap items-center gap-3 text-xs"><strong className={item.role === 'STUDENT' ? 'text-[var(--primary)]' : ''}>{item.role === 'STUDENT' ? selected?.student?.fullName || currentUser?.fullName || t('Sinh viên', 'Student') : t('Giám khảo AI', 'AI examiner')}</strong><span className="text-[var(--muted)]">{item.created_at ? formatExamTime(item.created_at, language) : t('Chưa có thời gian', 'Timestamp unavailable')}</span></div><p className="whitespace-pre-wrap break-words rounded-xl bg-[var(--surface-muted)] p-4 text-sm leading-7">{item.text}</p></li>)}</ol> : <p className="py-8 text-center text-sm text-[var(--muted)]">{loadingDetail ? t('Đang tải hội thoại…', 'Loading transcript…') : t('Chưa có bản ghi hội thoại để hiển thị.', 'No transcript is available to display.')}</p>}</section> : <>
          <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]"><section className="ui-panel p-6 sm:p-8"><span className="ui-tag">{selected?.status === 'COMPLETED' ? t('Đã hoàn thành', 'Completed') : selected?.status === 'IN_PROGRESS' ? t('Đang thi', 'In progress') : t('Chờ thi', 'Pending')}</span><h2 className="mt-5 text-xl font-semibold">{selected?.examTitle || exams.find(exam => exam.id === examId)?.title}</h2><p className="mt-2 text-sm text-[var(--muted)]">{selected?.student?.fullName || currentUser?.fullName} · {selected?.courseCode || '—'}</p><div className="mt-7 grid grid-cols-2 gap-5"><div><p className="text-sm text-[var(--muted)]">{t('Điểm trên lịch thi', 'Recorded schedule score')}</p><p className="mt-3 text-4xl font-semibold tabular-nums">{selected?.finalScore ?? '—'}<span className="text-base text-[var(--muted)]"> /10</span></p></div><div><p className="text-sm text-[var(--muted)]">{t('Điểm từ dịch vụ AI', 'AI service score')}</p><p className="mt-3 text-4xl font-semibold tabular-nums">{detail?.final_score ?? '—'}<span className="text-base text-[var(--muted)]"> /10</span></p></div></div><p className="mt-6 rounded-xl bg-[var(--primary-soft)] p-4 text-xs leading-6 text-[var(--muted)]">{t('Điểm AI là đề xuất. Dữ liệu hiện tại chưa cung cấp trạng thái giảng viên duyệt/công bố, nên giao diện không xác nhận đây là điểm chính thức.', 'AI scores are advisory. Current data does not expose lecturer approval/publication status, so these scores are not presented as confirmed official grades.')}</p></section><section className="ui-panel p-6 sm:p-8"><h2 className="text-base font-semibold">{t('Thông tin ca thi', 'Session information')}</h2><dl className="mt-5 space-y-4 text-sm">{[[t('Môn học', 'Course'), selected?.courseName || selected?.courseCode || '—'], [t('Bắt đầu thực tế', 'Actual start'), formatExamTime(detail?.actual_start_time || selected?.actualStartTime, language)], [t('Thời lượng', 'Duration'), duration], [t('Câu hỏi được gán', 'Assigned questions'), selected?.assignedQuestionCount ?? '—']].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 border-b border-[var(--line)] pb-4"><dt className="text-[var(--muted)]">{label}</dt><dd className="max-w-full break-words font-medium">{value}</dd></div>)}</dl></section></div>
          <section className="ui-panel p-5 sm:p-7"><h2 className="text-lg font-semibold">{t('Nhận xét theo câu hỏi', 'Question-by-question feedback')}</h2><p className="mb-6 mt-2 text-sm text-[var(--muted)]">{t('Chỉ hiển thị điểm và nhận xét do dịch vụ AI trả về, không tự tạo nội dung khi thiếu dữ liệu.', 'Only scores and feedback returned by the AI service are shown. Missing data is never synthesized.')}</p>{detail?.assigned_questions.length ? <div className="space-y-4">{detail.assigned_questions.map((question, index) => { const result = detail.results.find(item => item.question_id === question.question_id); return <article key={question.id} className="rounded-xl border border-[var(--line)] p-5"><div className="mb-3 flex flex-wrap justify-between gap-2 text-sm"><span className="font-semibold text-[var(--primary)]">{t('Câu hỏi', 'Question')} {question.order || index + 1}</span><span className="ui-tag">{result?.ai_score != null ? `${result.ai_score}/10 · AI` : t('Chưa có điểm AI', 'No AI score')}</span></div><h3 className="whitespace-pre-wrap text-base font-medium leading-7">{question.content}</h3><p className="mt-4 whitespace-pre-wrap rounded-lg bg-[var(--surface-muted)] p-4 text-sm leading-7 text-[var(--muted)]">{result?.ai_feedback || t('Chưa có nhận xét cho câu hỏi này.', 'No feedback is available for this question.')}</p></article>; })}</div> : <p className="py-8 text-center text-sm text-[var(--muted)]">{t('Chưa có dữ liệu chi tiết câu hỏi.', 'Question details are not available yet.')}</p>}</section>
        </>}
      </>}
    </>}
  </div>;
}
