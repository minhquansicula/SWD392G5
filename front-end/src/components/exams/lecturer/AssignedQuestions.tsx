import { useEffect, useState } from 'react';
import type { AssignedQuestionDto, ExamScheduleDto } from '../../../types/examApi';
import { lecturerExamService } from '../../../services/lecturerExamService';
import { formatExamTime } from '../../../utils/lecturerExam';
import { ExamButton, ExamDialog, ExamError, ExamLoading } from './ExamUi';

export function LecturerAssignedQuestions({ schedule, language, onClose }: { schedule: ExamScheduleDto; language: 'vi' | 'en'; onClose: () => void }) {
  const [questions, setQuestions] = useState<AssignedQuestionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [retry, setRetry] = useState(0);
  const t = (vi: string, en: string) => language === 'vi' ? vi : en;
  useEffect(() => {
    const controller = new AbortController();
    // oxlint-disable-next-line react/set-state-in-effect -- A different schedule/retry starts a new remote request.
    setLoading(true);
    setError(null);
    lecturerExamService.assignedQuestions(schedule.id, controller.signal).then(result => {
      if (!controller.signal.aborted) setQuestions([...result].sort((a, b) => a.questionOrder - b.questionOrder));
    }).catch(e => { if (!controller.signal.aborted) setError(e); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [schedule.id, retry]);

  return <ExamDialog title={t('Câu hỏi đã gán', 'Assigned questions')} onClose={onClose} language={language}>
    <p className="text-sm text-slate-600 dark:text-slate-300">{schedule.student?.fullName ?? '—'} · {schedule.student?.studentCode ?? schedule.student?.username ?? '—'}</p>
    <p className="text-xs text-slate-500 dark:text-slate-400">{t('Nội dung dưới đây là bản chụp tại thời điểm gán, theo thứ tự câu hỏi của sinh viên.', 'These are the saved content snapshots in this student’s assigned question order.')}</p>
    {loading ? <ExamLoading language={language} /> : error ? <><ExamError error={error} language={language} /><ExamButton onClick={() => setRetry(r => r + 1)}>{t('Thử tải lại', 'Retry loading')}</ExamButton></> : questions.length ? <ol className="space-y-4">{questions.map(q => <li key={q.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><h3 className="font-semibold">{t('Câu', 'Question')} {q.questionOrder}</h3><span className="text-slate-500 dark:text-slate-400">{q.difficultyLevel ?? t('Chưa có độ khó', 'No difficulty')}</span></div>
      <p className="my-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{q.contentSnapshot}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t('Đã gán', 'Assigned')}: {formatExamTime(q.assignedAt, language)} (UTC+07:00)</p>
    </li>)}</ol> : <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('Lịch thi này chưa được gán câu hỏi.', 'No questions have been assigned to this schedule.')}</p>}
  </ExamDialog>;
}
