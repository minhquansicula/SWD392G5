import { useEffect, useId, useRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { lockBodyScroll } from '../../utils/scrollLock';

export function Button({ variant = 'secondary', className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return <button type="button" {...props} className={`ui-button ${variant === 'primary' ? 'ui-button-primary' : variant === 'danger' ? 'ui-button-danger' : ''} ${className}`}>{children}</button>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <header className="ui-page-header"><div className="min-w-0"><h1 className="ui-page-title">{title}</h1>{description && <p className="ui-page-description">{description}</p>}</div>{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}</header>;
}

export function Dialog({ title, children, onClose, busy = false, closeLabel = 'Đóng', className = '' }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; closeLabel?: string; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    const unlock = lockBodyScroll();
    dialog?.showModal();
    return () => { dialog?.close(); unlock(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} aria-busy={busy} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className={`ui-panel m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto p-0 ${className}`}>
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--surface)] px-5 py-4 sm:px-6"><h2 id={titleId} className="text-lg font-semibold">{title}</h2><Button disabled={busy} onClick={onClose} aria-label={closeLabel} className="ui-icon-button"><X aria-hidden="true" className="h-4 w-4" /></Button></div>
    <div className="space-y-5 p-5 sm:p-6">{children}</div>
  </dialog>;
}

export function EmptyState({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return <div className="ui-panel ui-empty"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-muted)]"><AlertCircle aria-hidden="true" className="h-6 w-6" /></div><h2 className="font-semibold text-[var(--ink)]">{title}</h2>{description && <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed">{description}</p>}{children && <div className="mt-5 flex justify-center">{children}</div>}</div>;
}

export function LoadingState({ label }: { label: string }) {
  return <div role="status" className="ui-panel flex items-center justify-center gap-3 p-12 text-sm text-[var(--muted)]"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-[var(--primary)]" />{label}</div>;
}

/** Native modal behavior for feature forms that already render their own header. */
export function ModalSurface({ label, children, onClose, busy = false, className = '' }: { label: string; children: ReactNode; onClose: () => void; busy?: boolean; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    const unlock = lockBodyScroll();
    dialog?.showModal();
    return () => { dialog?.close(); unlock(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={ref} aria-label={label} aria-busy={busy} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className={`m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-2xl border-0 bg-transparent p-0 text-[var(--ink)] ${className}`}><fieldset disabled={busy} className="flex min-w-0 justify-center border-0 p-0">{children}</fieldset></dialog>;
}
