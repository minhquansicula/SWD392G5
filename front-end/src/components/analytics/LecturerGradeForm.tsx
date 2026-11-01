import { useState } from 'react';
import { reportService } from '../../services/reportService';
import { Button } from '../ui';

interface Props {
  scheduleId: string;
  questionId: string;
  score: number | null;
  feedback?: string | null;
  onSaved: () => Promise<void>;
}

export function LecturerGradeForm({ scheduleId, questionId, score, feedback, onSaved }: Props) {
  const [comment, setComment] = useState(feedback || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function save(clear = false) {
    setBusy(true); setError(''); setSaved(false);
    try {
      await reportService.gradeQuestion(scheduleId, questionId, score, clear ? null : comment);
      if (clear) setComment('');
      setSaved(true);
      await onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Không lưu được nhận xét.'); }
    finally { setBusy(false); }
  }
  const id = questionId;
  return <div className="mt-4 space-y-3 rounded-lg border border-[var(--line)] p-4">
    <label className="ui-label" htmlFor={`feedback-${id}`}>Nhận xét giảng viên</label><textarea id={`feedback-${id}`} className="ui-input" maxLength={5000} value={comment} onChange={e => setComment(e.target.value)} />
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {saved && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">Đã lưu đánh giá.</p>}
    <div className="flex gap-2"><Button disabled={busy} onClick={() => void save()}>Lưu</Button><Button disabled={busy} onClick={() => void save(true)}>Xóa nhận xét giảng viên</Button></div>
  </div>;
}
