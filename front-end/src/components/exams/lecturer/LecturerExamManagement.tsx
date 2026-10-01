import { useEffect, useState } from 'react';
import { BookOpen, Calendar, ChevronLeft, ChevronRight, Plus, RefreshCw, Users, Sparkles } from 'lucide-react';
import type { ExamPage, ExamSort } from '../../../types/examApi';
import type { UserAccount } from '../../../types';
import { lecturerExamService } from '../../../services/lecturerExamService';
import { formatExamTime, isExamOwner } from '../../../utils/lecturerExam';
import { LecturerExamDetail } from './ExamDetail';
import { LecturerExamForm } from './ExamForm';
import { ExamButton, ExamError, ExamField, ExamLoading, inputClass, panelClass } from './ExamUi';

interface Props { currentUser: UserAccount; language: 'vi' | 'en' }

// Mounted only for LECTURER in App. Existing auth/course integrations are reused.
export function LecturerExamManagement({ currentUser, language }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sort, setSort] = useState<ExamSort>('startDate,desc');
  const [result, setResult] = useState<ExamPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reload, setReload] = useState(0);
  const t = (vi: string, en: string) => language === 'vi' ? vi : en;

  useEffect(() => {
    if (selectedId || (currentUser.role !== 'LECTURER' && currentUser.role !== 'ADMIN')) return;
    const controller = new AbortController();
    // oxlint-disable-next-line react/set-state-in-effect -- Clear the previous server page while loading the new query.
    setLoading(true);
    setError(null);
    setResult(null);
    lecturerExamService.list(page, size, sort, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if (page > 0 && page >= data.page.totalPages) {
        setPage(Math.max(0, data.page.totalPages - 1));
      } else setResult(data);
    }).catch(e => { if (!controller.signal.aborted) setError(e); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedId, currentUser.role, currentUser.id, page, size, sort, reload]);

  if (currentUser.role !== 'LECTURER' && currentUser.role !== 'ADMIN') return null;
  if (selectedId) return <LecturerExamDetail key={selectedId} examId={selectedId} userId={currentUser.id} userRole={currentUser.role} language={language} onBack={() => setSelectedId(null)} />;

  const isAdmin = currentUser.role === 'ADMIN';

  return <div className="space-y-6">
    {/* Welcome Hero Banner (Matching modern EdTech reference style) */}
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 dark:from-indigo-950 dark:via-purple-950 dark:to-slate-900 border border-indigo-500/20 text-white p-6 sm:p-8 shadow-xl shadow-indigo-600/10">
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 dark:bg-white/10 backdrop-blur-md text-xs font-semibold mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{isAdmin ? t('Không gian Quản trị viên', 'Admin Workspace') : t('Không gian Giảng viên', 'Faculty Workspace')}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t('Xin chào', 'Welcome back')}, {currentUser.fullName || currentUser.username}! 👋
          </h1>

          <p className="mt-2 text-sm sm:text-base text-indigo-100 dark:text-slate-300 leading-relaxed">
            {isAdmin
              ? t(
                  'Hệ thống AIVES đang quản lý các kỳ thi vấn đáp AI. Bạn có toàn quyền thiết lập lịch thi, môn học và phân quyền tài khoản.',
                  'AIVES manages AI oral examinations. You have full authority over exam schedules, courses, and user access.'
                )
              : t(
                  'Theo dõi và cấu hình các kỳ thi vấn đáp do bạn phụ trách. Đề thi và rubric sẽ được chuyển tự động tới ứng dụng Mobile của sinh viên.',
                  'Manage viva exams under your supervision. Exam blueprints and rubrics will sync automatically to the Student Mobile app.'
                )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 text-indigo-900 text-sm font-bold shadow-lg shadow-black/10 hover:shadow-xl transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>{t('Tạo kỳ thi mới', 'Create New Exam')}</span>
          </button>
          <button
            disabled={loading}
            onClick={() => setReload(r => r + 1)}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/20 backdrop-blur-md transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('Làm mới', 'Refresh')}</span>
          </button>
        </div>
      </div>
    </div>
    <div className={`${panelClass} grid gap-4 sm:grid-cols-[1fr_180px_140px]`}>
      <div className="self-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isAdmin ? t('Tổng số kỳ thi trong hệ thống', 'Total examinations in system') : t('Kỳ thi bạn có quyền xem', 'Accessible examinations')}
        </p>
        <p className="mt-1 text-2xl font-bold">{result?.page.totalElements ?? '—'}</p>
      </div>
      <ExamField label={t('Sắp xếp', 'Sort by')}><select className={inputClass} value={sort} onChange={e => { setSort(e.target.value as ExamSort); setPage(0); }}><option value="startDate,desc">{t('Bắt đầu mới nhất', 'Latest start')}</option><option value="startDate,asc">{t('Bắt đầu sớm nhất', 'Earliest start')}</option><option value="title,asc">{t('Tiêu đề A–Z', 'Title A–Z')}</option><option value="endDate,desc">{t('Kết thúc mới nhất', 'Latest end')}</option></select></ExamField>
      <ExamField label={t('Mỗi trang', 'Page size')}><select className={inputClass} value={size} onChange={e => { setSize(Number(e.target.value)); setPage(0); }}>{[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}</select></ExamField>
    </div>
    {loading ? <ExamLoading language={language} /> : error ? <div className="space-y-3"><ExamError error={error} language={language} /><ExamButton onClick={() => setReload(r => r + 1)}>{t('Thử tải lại', 'Retry')}</ExamButton></div> : result && <>
      {result.content.length ? <div className="grid gap-4 lg:grid-cols-2">{result.content.map(exam => <article key={exam.id} className={`${panelClass} flex flex-col`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400"><BookOpen aria-hidden="true" className="h-4 w-4" />{exam.courseCode ?? '—'}</p>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isAdmin ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300' : isExamOwner(exam, currentUser.id, currentUser.role) ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
            {isAdmin ? t('Quản trị viên', 'Admin') : isExamOwner(exam, currentUser.id, currentUser.role) ? t('Do bạn tạo', 'Created by you') : t('Chỉ xem', 'Read only')}
          </span>
        </div>
        <h2 className="break-words text-lg font-bold">{exam.title}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{exam.courseName ?? '—'}</p>
        <div className="mt-4 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"><Calendar aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><div><p>{formatExamTime(exam.startDate, language)}</p><p>→ {formatExamTime(exam.endDate, language)} (UTC+07:00)</p></div></div>
        <div className="my-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"><span className="flex items-center gap-1.5"><Users aria-hidden="true" className="h-4 w-4" />{exam.totalStudents} {t('sinh viên', 'students')}</span><span>{exam.maxMainQuestions ?? '—'} {t('câu chính', 'main questions')}</span></div>
        <dl className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs dark:bg-slate-800/60">{[[t('Chờ thi', 'Pending'), exam.pendingStudents], [t('Đang thi', 'In progress'), exam.inProgressStudents], [t('Hoàn thành', 'Completed'), exam.completedStudents]].map(([label, value]) => <div key={String(label)}><dt className="text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 text-base font-semibold">{value}</dd></div>)}</dl>
        <ExamButton className="mt-auto w-full" onClick={() => setSelectedId(exam.id)}>{t('Chi tiết & lịch thi', 'Details & schedules')}<ChevronRight aria-hidden="true" className="h-4 w-4" /></ExamButton>
      </article>)}</div> : <div className={`${panelClass} py-12 text-center`}><h2 className="font-semibold">{t('Chưa có kỳ thi', 'No examinations yet')}</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{isAdmin ? t('Tạo kỳ thi mới cho bất kỳ môn học nào.', 'Create a new examination for any course.') : t('Tạo kỳ thi mới cho môn học bạn được phân công.', 'Create an examination for one of your assigned courses.')}</p></div>}
      <nav aria-label={t('Phân trang kỳ thi', 'Examination pagination')} className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500 dark:text-slate-400">{t(`Trang ${result.page.totalPages ? result.page.number + 1 : 0}/${result.page.totalPages} · ${result.page.totalElements} kỳ thi`, `Page ${result.page.totalPages ? result.page.number + 1 : 0}/${result.page.totalPages} · ${result.page.totalElements} examinations`)}</p><div className="flex gap-2"><ExamButton disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft aria-hidden="true" className="h-4 w-4" />{t('Trước', 'Previous')}</ExamButton><ExamButton disabled={page + 1 >= result.page.totalPages} onClick={() => setPage(p => p + 1)}>{t('Sau', 'Next')}<ChevronRight aria-hidden="true" className="h-4 w-4" /></ExamButton></div></nav>
    </>}
    {createOpen && <LecturerExamForm userId={currentUser.id} userRole={currentUser.role} language={language} onClose={() => { setCreateOpen(false); setReload(r => r + 1); }} onSaved={exam => { setCreateOpen(false); setSelectedId(exam.id); }} />}
  </div>;
}
