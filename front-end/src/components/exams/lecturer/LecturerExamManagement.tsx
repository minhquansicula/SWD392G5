import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw, Users } from 'lucide-react';
import type { ExamPage, ExamSort } from '../../../types/examApi';
import type { UserAccount } from '../../../types';
import { lecturerExamService } from '../../../services/lecturerExamService';
import { formatExamTime, isExamOwner } from '../../../utils/lecturerExam';
import { LecturerExamDetail } from './ExamDetail';
import { LecturerExamForm } from './ExamForm';
import { ExamButton, ExamError, ExamField, ExamLoading, inputClass } from './ExamUi';
import { EmptyState, PageHeader } from '../../ui';

interface Props { currentUser: UserAccount; language: 'vi' | 'en'; onNavigateToResults?: (examId: string, scheduleId?: string) => void; }
const sorts: ExamSort[] = ['startDate,desc', 'startDate,asc', 'title,asc', 'endDate,desc'];

export function LecturerExamManagement({ currentUser, language, onNavigateToResults }: Props) {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('exam');
  const createOpen = params.get('action') === 'create';
  const rawPage = Number(params.get('page') || 0);
  const page = Number.isInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
  const size = [10, 20, 50, 100].includes(Number(params.get('size'))) ? Number(params.get('size')) : 10;
  const sort = sorts.includes(params.get('sort') as ExamSort) ? params.get('sort') as ExamSort : 'startDate,desc';
  const [result, setResult] = useState<ExamPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reload, setReload] = useState(0);
  const t = (vi: string, en: string) => language === 'vi' ? vi : en;
  function update(values: Record<string, string | null>, replace = false) {
    setParams(previous => { const next = new URLSearchParams(previous); Object.entries(values).forEach(([key, value]) => value === null ? next.delete(key) : next.set(key, value)); return next; }, { replace });
  }
  useEffect(() => {
    if (selectedId || !['LECTURER', 'ADMIN'].includes(currentUser.role)) return;
    const controller = new AbortController();
    setLoading(true); setError(null);
    lecturerExamService.list(page, size, sort, controller.signal, true).then(data => {
      if (controller.signal.aborted) return;
      if (page > 0 && page >= data.page.totalPages) update({ page: String(Math.max(0, data.page.totalPages - 1)) }, true);
      else setResult(data);
    }).catch(err => { if (!controller.signal.aborted) setError(err); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedId, currentUser.role, currentUser.id, page, size, sort, reload]);
  if (!['LECTURER', 'ADMIN'].includes(currentUser.role)) return null;
  if (selectedId) return <LecturerExamDetail key={selectedId} examId={selectedId} userId={currentUser.id} userRole={currentUser.role} language={language} onBack={() => update({ exam: null })} onNavigateToResults={onNavigateToResults} />;
  return <div className="space-y-6">
    <PageHeader title={t('Kỳ thi & Lịch thi', 'Examinations & schedules')} description={t('Chuẩn bị kỳ thi, sắp xếp lịch và theo dõi tiến độ vấn đáp trong một không gian.', 'Prepare examinations, organize student schedules, and follow viva progress in one workspace.')} actions={<><ExamButton onClick={() => setReload(value => value + 1)} disabled={loading} aria-label={t('Làm mới danh sách kỳ thi', 'Refresh examinations')}><RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">{t('Làm mới', 'Refresh')}</span></ExamButton><ExamButton primary onClick={() => update({ action: 'create' })}><Plus aria-hidden="true" className="h-4 w-4" />{t('Tạo kỳ thi', 'Create examination')}</ExamButton></>} />
    <div className="ui-panel flex flex-wrap items-end justify-between gap-5 p-5">
      <div className="self-center"><p className="text-sm font-semibold">{result?.page.totalElements ?? '—'} {t('kỳ thi', 'examinations')}</p><p className="mt-1 text-xs text-[var(--muted)]">{t('Danh sách theo quyền truy cập của bạn', 'Available to your account')}</p></div>
      <div className="flex w-full flex-wrap gap-3 sm:w-auto"><div className="min-w-44 flex-1"><ExamField label={t('Sắp xếp', 'Sort by')}><select className={inputClass} value={sort} onChange={event => update({ sort: event.target.value, page: '0' })}><option value="startDate,desc">{t('Bắt đầu mới nhất', 'Latest start')}</option><option value="startDate,asc">{t('Bắt đầu sớm nhất', 'Earliest start')}</option><option value="title,asc">{t('Tiêu đề A–Z', 'Title A–Z')}</option><option value="endDate,desc">{t('Kết thúc mới nhất', 'Latest end')}</option></select></ExamField></div><div className="w-28"><ExamField label={t('Mỗi trang', 'Per page')}><select className={inputClass} value={size} onChange={event => update({ size: event.target.value, page: '0' })}>{[10, 20, 50, 100].map(n => <option key={n}>{n}</option>)}</select></ExamField></div></div>
    </div>
    {loading ? <ExamLoading language={language} /> : error ? <div className="space-y-3"><ExamError error={error} language={language} /><ExamButton onClick={() => setReload(value => value + 1)}>{t('Thử lại', 'Try again')}</ExamButton></div> : result && <>
      {result.content.length ? <div className="grid gap-5 xl:grid-cols-2">{result.content.map(exam => {
        const progress = exam.totalStudents ? Math.round(exam.completedStudents / exam.totalStudents * 100) : 0;
        return <article key={exam.id} className="ui-panel flex flex-col overflow-hidden">
          <div className="flex-1 p-5 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"><BookOpen aria-hidden="true" className="h-4 w-4" />{exam.courseCode || '—'}</span><span className="ui-tag">{currentUser.role === 'ADMIN' ? t('Quyền quản trị', 'Administrator') : isExamOwner(exam, currentUser.id, currentUser.role) ? t('Do bạn phụ trách', 'Managed by you') : t('Chỉ xem', 'Read only')}</span></div>
          <h2 className="break-words text-xl font-semibold tracking-tight"><button onClick={() => update({ exam: exam.id })} className="rounded text-left hover:text-[var(--primary)]">{exam.title}</button></h2><p className="mt-2 text-sm text-[var(--muted)]">{exam.courseName || '—'}</p>
          <div className="mt-5 flex items-start gap-3 text-sm text-[var(--muted)]"><CalendarDays aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><div><p>{formatExamTime(exam.startDate, language)}</p><p className="mt-1">{t('Đến', 'Until')} {formatExamTime(exam.endDate, language)} · UTC+07</p></div></div>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--line)] pt-4 text-sm"><span className="inline-flex items-center gap-2"><Users aria-hidden="true" className="h-4 w-4 text-[var(--muted)]" />{exam.totalStudents} {t('sinh viên', 'students')}</span><span className="text-[var(--muted)]">{exam.maxMainQuestions ?? '—'} {t('câu hỏi chính', 'main questions')}</span></div>
          <div className="mb-2 mt-5 flex justify-between text-xs text-[var(--muted)]"><span>{t('Tiến độ hoàn thành', 'Completion progress')}</span><span>{exam.completedStudents}/{exam.totalStudents}</span></div><progress className="h-1.5 w-full overflow-hidden rounded-full accent-indigo-600" value={progress} max={100} aria-label={t('Tiến độ kỳ thi', 'Examination progress')} />
          </div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--primary-soft)] px-5 py-4 sm:px-6"><span className="text-xs text-[var(--muted)]">{exam.pendingStudents} {t('chờ thi', 'pending')} · {exam.inProgressStudents} {t('đang thi', 'in progress')}</span><ExamButton onClick={() => update({ exam: exam.id })}>{t('Chi tiết & Lịch thi', 'Details & schedules')}<ChevronRight aria-hidden="true" className="h-4 w-4" /></ExamButton></div>
        </article>;
      })}</div> : <EmptyState title={t('Chưa có kỳ thi', 'No examinations yet')} description={t('Tạo kỳ thi cho môn học để bắt đầu sắp xếp lịch sinh viên.', 'Create a course examination to start scheduling students.')}><ExamButton primary onClick={() => update({ action: 'create' })}><Plus aria-hidden="true" className="h-4 w-4" />{t('Tạo kỳ thi đầu tiên', 'Create your first examination')}</ExamButton></EmptyState>}
      <nav aria-label={t('Phân trang kỳ thi', 'Examination pagination')} className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[var(--muted)]">{t('Trang', 'Page')} {result.page.totalPages ? result.page.number + 1 : 0}/{result.page.totalPages}</p><div className="flex gap-2"><ExamButton disabled={page === 0} onClick={() => update({ page: String(page - 1) })}><ChevronLeft aria-hidden="true" className="h-4 w-4" />{t('Trước', 'Previous')}</ExamButton><ExamButton disabled={page + 1 >= result.page.totalPages} onClick={() => update({ page: String(page + 1) })}>{t('Sau', 'Next')}<ChevronRight aria-hidden="true" className="h-4 w-4" /></ExamButton></div></nav>
    </>}
    {createOpen && <LecturerExamForm userId={currentUser.id} userRole={currentUser.role} language={language} onClose={() => { update({ action: null }); setReload(value => value + 1); }} onSaved={exam => update({ action: null, exam: exam.id })} />}
  </div>;
}
