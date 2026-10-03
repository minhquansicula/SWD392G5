import { useRef, useState } from 'react';
import axios from 'axios';
import { ExamButton, ExamDialog, ExamError } from './ExamUi';

export function ExamConfirmation({ title, description, confirmLabel, danger, language, onConfirm, onClose }: {
  title: string; description: string; confirmLabel: string; danger?: boolean;
  language: 'vi' | 'en'; onConfirm: () => Promise<void>; onClose: () => void;
}) {
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const uncertain = axios.isAxiosError(error) && (!error.response || error.response.status >= 500);
  async function confirm() {
    if (submitting.current || uncertain) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try { await onConfirm(); }
    catch (e) { setError(e); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <ExamDialog title={title} onClose={onClose} busy={busy} language={language}>
    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
    <ExamError error={error} language={language} />
    <div className="flex justify-end gap-2"><ExamButton disabled={busy} onClick={onClose}>{language === 'vi' ? 'Đóng' : 'Close'}</ExamButton><ExamButton danger={danger} primary={!danger} disabled={busy || uncertain} onClick={confirm}>{busy ? (language === 'vi' ? 'Đang xử lý…' : 'Working…') : confirmLabel}</ExamButton></div>
  </ExamDialog>;
}
