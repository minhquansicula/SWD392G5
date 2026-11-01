import { Fragment, useState } from 'react';
import { reportService, type CriterionMarkDto } from '../../services/reportService';
import { markOf, passStatus } from '../../utils/gradeSheet';
import { Button } from '../ui';

interface GradeSheetTableProps {
  criteria: CriterionMarkDto[];
  total: number | null;
  caption: string;
  scheduleId?: string;
  editable?: boolean;
  onSaved?: () => Promise<void>;
}

const cell = 'border border-[var(--line)] px-4 py-3';

export function GradeSheetTable({ criteria, total, caption, scheduleId, editable, onSaved }: GradeSheetTableProps) {
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(criteria.map(c => [c.criterionId || '', c.lecturerScore == null ? '' : String(c.lecturerScore)])));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const status = passStatus(total);
  const showLecturer = editable || criteria.some(c => c.lecturerScore != null);
  async function save() {
    if (!scheduleId || criteria.some(c => !c.criterionId)) { setMessage('Thiếu mã tiêu chí, không thể lưu điểm.'); return; }
    const entries = criteria.map(c => ({ criterionId: c.criterionId!, value: draft[c.criterionId!] || '' }));
    if (entries.some(({ value }) => value !== '' && (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) > 10))) {
      setMessage('Điểm phải từ 0 đến 10 và có tối đa 2 chữ số thập phân.'); return;
    }
    setSaving(true); setMessage('');
    try {
      await reportService.saveCriteria(scheduleId, entries.map(({ criterionId, value }) => ({ criterionId, score: value === '' ? null : Number(value) })));
      await onSaved?.();
      setMessage('Đã lưu điểm cuối cùng.');
    } catch { setMessage('Không lưu được điểm. Kiểm tra điểm và rubric, sau đó thử lại.'); }
    finally { setSaving(false); }
  }
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[640px] border-collapse text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead><tr className="bg-[var(--surface-muted)]">{['Mark group', 'Mark name', 'Weight (%)', 'Điểm AI', ...(showLecturer ? ['Điểm giảng viên'] : []), 'Final mark', 'Comment'].map(header => <th key={header} scope="col" className={`${cell} text-center font-semibold`}>{header}</th>)}</tr></thead>
      <tbody>
        {criteria.map((criterion, index) => <Fragment key={criterion.criterionId || `${criterion.name}-${index}`}>
          <tr>
            <th scope="rowgroup" rowSpan={2} className={`${cell} text-center font-semibold text-[var(--primary)]`}>{criterion.name}</th>
            <td className={cell}>{criterion.name}</td>
            <td className={`${cell} text-center`}>{criterion.weight}</td>
            <td className={`${cell} text-center`}>{criterion.assessed && criterion.score != null ? criterion.score : '—'}</td>
            {showLecturer && <td className={`${cell} text-center`}>{editable ? <input aria-label={`Điểm giảng viên ${criterion.name}`} className="ui-input w-24" type="number" min="0" max="10" step="0.01" value={draft[criterion.criterionId || ''] ?? ''} onChange={e => { setDraft(previous => ({ ...previous, [criterion.criterionId || '']: e.target.value })); setMessage(''); }} /> : criterion.lecturerScore ?? '—'}</td>}
            <td className={`${cell} text-center font-semibold`}>{markOf(criterion)}</td>
            <td className={`${cell} whitespace-pre-wrap`}>{criterion.lecturerScore != null ? 'Giáo viên cho điểm' : criterion.comment || '-'}</td>
          </tr>
          <tr className="bg-[var(--surface-muted)]"><td className={`${cell} text-center font-semibold`}>Total</td><td className={`${cell} text-center`}>{criterion.weight}%</td><td className={cell} />{showLecturer && <td className={cell} />}<td className={`${cell} text-center font-semibold`}>{markOf(criterion)}</td><td className={cell} /></tr>
        </Fragment>)}
        <tr className="bg-[var(--primary-soft)]"><td className={cell} /><td className={`${cell} text-right font-semibold`}>Late penalty (%)</td><td colSpan={showLecturer ? 4 : 3} className={`${cell} text-center`}>0%</td><td className={cell} /></tr>
        <tr className="bg-[var(--primary-soft)]"><td className={cell} /><td className={`${cell} text-right font-semibold`}>Mark bonus</td><td colSpan={showLecturer ? 4 : 3} className={`${cell} text-center`}>-</td><td className={cell} /></tr>
        <tr className="bg-[var(--primary-soft)]"><td className={cell} /><td className={`${cell} text-right font-semibold`}>Course total</td><td className={`${cell} text-center`}>Weighted</td><td className={cell} />{showLecturer && <td className={cell} />}<td className={`${cell} text-center text-lg font-bold`}>{total ?? '-'}</td><td className={cell}>Status: {status}</td></tr>
      </tbody>
    </table>
    {editable && <div className="mt-4"><Button variant="primary" disabled={saving} onClick={() => void save()}>{saving ? 'Đang lưu…' : 'Lưu điểm cuối cùng'}</Button><p role="status" className="mt-2 text-sm">{message}</p></div>}
  </div>;
}
