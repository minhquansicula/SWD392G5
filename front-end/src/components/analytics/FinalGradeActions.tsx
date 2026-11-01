import { useState } from 'react';
import axios from 'axios';
import { reportService } from '../../services/reportService';
import { Button } from '../ui';

export function FinalGradeActions({ scheduleId, onSaved }: { scheduleId: string; onSaved: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(useAi = false) {
    setBusy(true); setError('');
    try {
      if (useAi) await reportService.gradeTotal(scheduleId, null);
      else await reportService.calculateTotal(scheduleId);
      await onSaved();
    } catch (err) {
      setError(axios.isAxiosError(err) && typeof err.response?.data?.message === 'string'
        ? err.response.data.message : err instanceof Error ? err.message : 'Không lưu được điểm cuối cùng.');
    } finally { setBusy(false); }
  }
  return <div className="mt-4 space-y-3 rounded-lg border border-[var(--line)] p-4">
    <p className="text-sm text-[var(--muted)]">Điểm cuối cùng tự cập nhật sau khi lưu từng câu: lấy trung bình các câu, ưu tiên điểm giảng viên; câu chưa sửa dùng điểm AI. Nếu chưa có đánh giá giảng viên, hệ thống dùng điểm tổng AI.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void save()}>Lưu điểm cuối cùng</Button><Button disabled={busy} onClick={() => void save(true)}>Dùng lại điểm AI</Button></div>
  </div>;
}
