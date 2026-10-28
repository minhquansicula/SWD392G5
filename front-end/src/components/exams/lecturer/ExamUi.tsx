import { useEffect, useRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { Button, Dialog } from '../../ui';
import type { ExamApiError, ScheduleStatus } from '../../../types/examApi';

export const inputClass = 'ui-input disabled:opacity-60';
export const panelClass = 'ui-panel p-5 sm:p-6';

export function ExamButton({ children, primary, danger, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean; danger?: boolean }) {
  return <Button {...props} variant={primary ? 'primary' : danger ? 'danger' : 'secondary'} className={className}>{children}</Button>;
}

export function ExamField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block min-w-0 space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
    <span>{label}</span>{children}{hint && <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">{hint}</span>}
  </label>;
}

export function ExamError({ error, language = 'vi' }: { error: unknown; language?: 'vi' | 'en' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) ref.current?.focus(); }, [error]);
  if (!error) return null;
  const api = axios.isAxiosError<ExamApiError>(error) ? error.response?.data : undefined;
  const message = api?.message || (error instanceof Error ? error.message : String(error));
  const uncertain = axios.isAxiosError(error) && (!error.response || error.response.status >= 500);
  return <div ref={ref} tabIndex={-1} role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 focus:outline-none dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
    <p className="flex items-start gap-2"><AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span>{message}{api?.error && <span className="ml-2 font-mono text-xs">({api.error})</span>}</span></p>
    {api?.validationErrors && <ul className="mt-2 list-inside list-disc">{Object.entries(api.validationErrors).map(([field, detail]) => <li key={field}>{field}: {detail}</li>)}</ul>}
    {uncertain && <p className="mt-2">{language === 'vi' ? 'Kết quả yêu cầu có thể chưa xác định. Đóng biểu mẫu và tải lại dữ liệu trước khi gửi lại để tránh thao tác trùng.' : 'The request outcome may be unknown. Close the form and reload data before retrying to avoid duplicate operations.'}</p>}
  </div>;
}

export function ExamLoading({ language }: { language: 'vi' | 'en' }) {
  return <p role="status" className="flex items-center gap-2 py-8 text-sm text-slate-600 dark:text-slate-300"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" />{language === 'vi' ? 'Đang tải dữ liệu…' : 'Loading…'}</p>;
}

export function ExamDialog({ title, children, onClose, busy = false, language }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; language: 'vi' | 'en' }) {
  return <Dialog title={title} onClose={onClose} busy={busy} closeLabel={language === 'vi' ? 'Đóng' : 'Close'} className="max-w-3xl">{children}</Dialog>;
}

export function ScheduleBadge({ status, language }: { status: ScheduleStatus | null; language: 'vi' | 'en' }) {
  const labels = { PENDING: ['Chờ thi', 'Pending'], IN_PROGRESS: ['Đang thi', 'In progress'], COMPLETED: ['Hoàn thành', 'Completed'] };
  const color = status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{status ? labels[status]?.[language === 'vi' ? 0 : 1] ?? '—' : '—'}</span>;
}
