import { useEffect, useState } from 'react';
import { reportService, type GradingHistoryEntry } from '../../services/reportService';
import type { SessionAssignedQuestion } from '../../services/aiService';

export function GradingHistory({ scheduleId, questions }: { scheduleId: string; questions: SessionAssignedQuestion[] }) {
  // A different schedule must never inherit another student's history or errors.
  return <ScheduleGradingHistory key={scheduleId} scheduleId={scheduleId} questions={questions} />;
}

function ScheduleGradingHistory({ scheduleId, questions }: { scheduleId: string; questions: SessionAssignedQuestion[] }) {
  const [items, setItems] = useState<GradingHistoryEntry[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    reportService.gradingHistory(scheduleId, controller.signal).then(items => {
      if (!controller.signal.aborted) setItems(items);
    }).catch(() => {
      if (!controller.signal.aborted) setError('Không tải được lịch sử chấm điểm.');
    });
    return () => controller.abort();
  }, [scheduleId]);
  return <section className="ui-panel p-5 sm:p-7">
    <h2 className="text-lg font-semibold">Lịch sử chấm điểm của giảng viên</h2>
    <p className="mt-2 text-sm text-[var(--muted)]">Hiển thị tối đa 100 lần thay đổi gần nhất.</p>
    {error ? <p role="alert" className="mt-4">{error}</p> : !items ? <p className="mt-4">Đang tải lịch sử…</p> : !items.length ? <p className="mt-4">Chưa có thay đổi nào được ghi nhận.</p> : <ol className="mt-4 space-y-3">{items.map(item => {
      const question = questions.find(q => q.question_id === item.questionId);
      return <li key={item.id} className="rounded-lg border border-[var(--line)] p-4 text-sm">
        <p><strong>{item.lecturerName}</strong> · {new Date(item.changedAt).toLocaleString()} · {item.questionId ? `Câu ${question?.order ?? '—'}` : 'Điểm tổng'}</p>
        <p className="mt-2">Điểm: {item.oldScore ?? '—'} → {item.newScore ?? '—'}</p>
        {item.questionId && <><p className="mt-2 whitespace-pre-wrap">Nhận xét trước: {item.oldFeedback || '—'}</p><p className="whitespace-pre-wrap">Nhận xét sau: {item.newFeedback || '—'}</p></>}
      </li>;
    })}</ol>}
  </section>;
}
