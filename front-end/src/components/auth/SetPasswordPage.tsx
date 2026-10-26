import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, GraduationCap, Loader2, RefreshCw } from 'lucide-react';
import { checkPasswordLink, setPasswordWithLink } from '../../services/authService';
import type { PasswordLinkInfo } from '../../services/authService';
import type { Language } from '../../utils/i18n';
import { Button } from '../ui';

interface SetPasswordPageProps { token: string; language: Language; onDone: (passwordChanged: boolean) => void; }
type LinkState = 'checking' | 'ready' | 'invalid' | 'unreachable' | 'done';

export function SetPasswordPage({ token, language, onDone }: SetPasswordPageProps) {
  const vi = language === 'vi';
  const t = (vn: string, en: string) => vi ? vn : en;
  const [state, setState] = useState<LinkState>('checking');
  const [info, setInfo] = useState<PasswordLinkInfo | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  useEffect(() => {
    let active = true;
    setState('checking');
    checkPasswordLink(token).then(result => { if (active) { setInfo(result); setState('ready'); } }).catch((err: Error & { invalidLink?: boolean }) => { if (active) setState(err.invalidLink ? 'invalid' : 'unreachable'); });
    return () => { active = false; };
  }, [token, attempt]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setError('');
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) { setError(t('Mật khẩu phải có ít nhất 8 ký tự và không quá 72 byte (72 ký tự không dấu).', 'Password must contain at least 8 characters and at most 72 bytes.')); return; }
    if (password !== confirmation) { setError(t('Mật khẩu nhập lại không khớp.', 'The passwords do not match.')); return; }
    submitting.current = true; setBusy(true);
    try { await setPasswordWithLink(token, password); setPassword(''); setConfirmation(''); setState('done'); }
    catch (err) { if ((err as { invalidLink?: boolean } | null)?.invalidLink) setState('invalid'); else setError(err instanceof Error ? err.message : t('Không thể lưu mật khẩu.', 'Could not save your password.')); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <div className="flex min-h-dvh flex-col bg-[var(--canvas)] text-[var(--ink)]">
    <header className="mx-auto flex w-full max-w-7xl items-center gap-3 px-6 py-7"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#172b3a] text-white"><GraduationCap aria-hidden="true" className="h-6 w-6" /></span><span className="text-2xl font-bold tracking-tight">AIVES<span className="text-[var(--primary)]">.</span></span></header>
    <main className="flex flex-1 items-center justify-center px-5 py-10"><section className="ui-panel w-full max-w-md space-y-6 p-6 sm:p-9"><div><span className="ui-tag mb-4">{t('Liên kết dùng một lần', 'One-time link')}</span><h1 className="text-2xl font-semibold tracking-tight">{info?.activation === false ? t('Đặt lại mật khẩu', 'Reset your password') : t('Thiết lập mật khẩu', 'Set your password')}</h1>{state === 'ready' && info && <p className="mt-3 break-words text-sm leading-relaxed text-[var(--muted)]">{info.fullName}<br /><span className="break-all">{info.email.trim()}</span></p>}</div>
      {state === 'checking' && <p role="status" className="flex items-center gap-3 py-6 text-sm text-[var(--muted)]"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />{t('Đang kiểm tra liên kết…', 'Checking your link…')}</p>}
      {state === 'invalid' && <><p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm leading-7 text-rose-800 dark:bg-rose-950 dark:text-rose-200">{t('Liên kết không hợp lệ, đã dùng hoặc hết hạn. Chọn “Quên mật khẩu?” ở trang đăng nhập để nhận liên kết mới hoặc liên hệ quản trị viên.', 'This link is invalid, used, or expired. Use “Forgot password?” on the sign-in page to request a new link, or contact your administrator.')}</p><Button variant="primary" className="w-full" onClick={() => onDone(false)}>{t('Về trang đăng nhập', 'Back to sign in')}</Button></>}
      {state === 'unreachable' && <><p role="alert" className="text-sm leading-7 text-[var(--muted)]">{t('Chưa kết nối được máy chủ để kiểm tra liên kết. Vui lòng thử lại.', 'Unable to contact the server to verify this link. Please try again.')}</p><Button className="w-full" onClick={() => setAttempt(value => value + 1)}><RefreshCw aria-hidden="true" className="h-4 w-4" />{t('Thử lại', 'Try again')}</Button><Button className="w-full border-transparent" onClick={() => onDone(false)}>{t('Về đăng nhập', 'Back to sign in')}</Button></>}
      {state === 'done' && <><div role="status" className="rounded-xl bg-[var(--primary-soft)] p-4 text-sm leading-7"><CheckCircle2 aria-hidden="true" className="mb-3 h-7 w-7 text-[var(--primary)]" />{t('Mật khẩu đã được lưu. Bạn có thể đăng nhập bằng email và mật khẩu vừa đặt.', 'Your password has been saved. You can now sign in with your email and new password.')}</div><Button variant="primary" className="w-full" onClick={() => onDone(true)}>{t('Đăng nhập', 'Sign in')}</Button></>}
      {state === 'ready' && <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
        {error && <div id="set-password-error" role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200"><AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        <div><label htmlFor="set-password-new" className="ui-label">{t('Mật khẩu mới', 'New password')}</label><div className="relative"><input id="set-password-new" name="new-password" autoComplete="new-password" type={show ? 'text' : 'password'} required minLength={8} value={password} onChange={event => setPassword(event.target.value)} aria-describedby={`password-hint${error ? ' set-password-error' : ''}`} className="ui-input pr-12" /><button type="button" onClick={() => setShow(!show)} aria-label={show ? t('Ẩn mật khẩu', 'Hide password') : t('Hiện mật khẩu', 'Show password')} aria-pressed={show} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-[var(--muted)]">{show ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}</button></div><p id="password-hint" className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{t('Ít nhất 8 ký tự, không quá 72 byte. Bạn có thể dùng trình quản lý mật khẩu.', 'At least 8 characters, at most 72 bytes. Password managers are supported.')}</p></div>
        <div><label htmlFor="set-password-confirm" className="ui-label">{t('Nhập lại mật khẩu', 'Confirm password')}</label><input id="set-password-confirm" name="confirm-password" autoComplete="new-password" type={show ? 'text' : 'password'} required value={confirmation} onChange={event => setConfirmation(event.target.value)} aria-describedby={error ? 'set-password-error' : undefined} className="ui-input" /></div>
        <Button type="submit" variant="primary" disabled={busy} className="w-full">{busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{busy ? t('Đang lưu…', 'Saving…') : t('Lưu mật khẩu', 'Save password')}</Button>
      </form>}
    </section></main><footer className="px-6 py-6 text-center text-xs text-[var(--muted)]">AIVES · FPT University</footer>
  </div>;
}
