import { useEffect, useId, useRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import axios from 'axios';
import type { ExamApiError, ScheduleStatus } from '../../../types/examApi';

export const inputClass = 'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-white';
export const panelClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900';

export function ExamButton({ children, primary, danger, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean; danger?: boolean }) {
  return <button type="button" {...props} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${primary ? 'bg-indigo-600 text-white hover:bg-indigo-700' : danger ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'} ${className}`}>{children}</button>;
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
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-700"><h2 id={titleId} className="text-lg font-bold">{title}</h2><ExamButton disabled={busy} aria-label={language === 'vi' ? 'Đóng' : 'Close'} onClick={onClose}><X aria-hidden="true" className="h-4 w-4" /></ExamButton></div>
    <div className="space-y-4 p-5">{children}</div>
  </dialog>;
}

export function ScheduleBadge({ status, language }: { status: ScheduleStatus | null; language: 'vi' | 'en' }) {
  const labels = { PENDING: ['Chờ thi', 'Pending'], IN_PROGRESS: ['Đang thi', 'In progress'], COMPLETED: ['Hoàn thành', 'Completed'] };
  const color = status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{status ? labels[status]?.[language === 'vi' ? 0 : 1] ?? '—' : '—'}</span>;
}
