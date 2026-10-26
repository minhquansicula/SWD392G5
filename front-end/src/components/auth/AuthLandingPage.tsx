import { useRef, useState } from 'react';
import { GraduationCap, Eye, EyeOff, ArrowLeft, AudioLines, ClipboardCheck, CalendarDays, Languages, Sun, Moon, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { UserAccount } from '../../types';
import type { Language } from '../../utils/i18n';
import { loginUser, requestPasswordReset } from '../../services/authService';
import { Button } from '../ui';

interface AuthLandingPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
}

export function AuthLandingPage({ onLoginSuccess, language, setLanguage, isDarkMode, setIsDarkMode }: AuthLandingPageProps) {
  const vi = language === 'vi';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const submitting = useRef(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    if (!email.trim()) { setError(vi ? 'Vui lòng nhập email' : 'Please enter your email'); return; }
    if (!forgot && !password) { setError(vi ? 'Vui lòng nhập mật khẩu' : 'Please enter your password'); return; }
    submitting.current = true;
    setError(''); setSuccess(''); setBusy(true);
    try {
      if (forgot) {
        await requestPasswordReset(email);
        setSuccess(vi ? 'Nếu email thuộc về một tài khoản, link đặt lại mật khẩu đã được gửi. Hãy kiểm tra cả mục Spam. Link có hạn 72 giờ; mỗi tài khoản nhận tối đa một email trong 15 phút.' : 'If this email belongs to an account, a reset link has been sent. Check your inbox and spam folder. Links expire after 72 hours; requests are limited to one email per 15 minutes.');
      } else {
        const user = await loginUser(email, password);
        onLoginSuccess(user);
      }
    } catch (err) { setError(err instanceof Error ? err.message : (vi ? 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.' : 'Unable to complete your request. Please try again.')); }
    finally { submitting.current = false; setBusy(false); }
  }
  function changeMode(next: boolean) { setForgot(next); setError(''); setSuccess(''); }
  const features = [
    { icon: CalendarDays, title: vi ? 'Sẵn sàng cho mỗi kỳ thi' : 'Ready for every examination', text: vi ? 'Lịch thi và thông tin cần thiết trong một không gian.' : 'Your schedules and examination details in one place.' },
    { icon: AudioLines, title: vi ? 'Đối thoại để hiểu sâu hơn' : 'A conversation that goes deeper', text: vi ? 'Vấn đáp bằng giọng nói với câu hỏi thích ứng từ AI.' : 'Voice-based examinations with adaptive AI questions.' },
    { icon: ClipboardCheck, title: vi ? 'Đánh giá có sự đồng hành' : 'Assessment with human oversight', text: vi ? 'AI hỗ trợ phân tích. Giảng viên quyết định điểm chính thức.' : 'AI assists analysis. Lecturers determine official grades.' },
  ];
  return <div className="flex min-h-dvh flex-col bg-[var(--canvas)] text-[var(--ink)]">
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-10"><a href="#/exams" className="flex items-center gap-3 rounded-lg" aria-label="AIVES"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#172b3a] text-white"><GraduationCap aria-hidden="true" className="h-6 w-6" /></span><span className="text-2xl font-bold tracking-tight">AIVES<span className="text-[var(--primary)]">.</span></span></a><div className="flex gap-1"><Button className="border-transparent" onClick={() => setLanguage(vi ? 'en' : 'vi')} aria-label={vi ? 'Switch to English' : 'Chuyển sang tiếng Việt'}><Languages aria-hidden="true" className="h-4 w-4" />{vi ? 'VI' : 'EN'}</Button><Button className="ui-icon-button border-transparent" onClick={() => setIsDarkMode(!isDarkMode)} aria-label={vi ? 'Đổi giao diện sáng/tối' : 'Switch theme'}>{isDarkMode ? <Sun aria-hidden="true" className="h-5 w-5" /> : <Moon aria-hidden="true" className="h-5 w-5" />}</Button></div></header>
    <main className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-5 py-8 sm:px-10 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:py-16">
      <section className="hidden lg:block">
        <span className="ui-tag mb-7 bg-[var(--primary-soft)] text-[var(--primary)]">{vi ? 'Nền tảng thi vấn đáp có AI hỗ trợ' : 'AI-assisted oral examinations'}</span>
        <h1 className="max-w-xl text-5xl font-semibold leading-[1.2] tracking-[-0.045em]">{vi ? <>Tập trung vào kiến thức.<br /><span className="text-[var(--primary)]">Tự tin trong từng câu trả lời.</span></> : <>Focus on what you know.<br /><span className="text-[var(--primary)]">Find confidence in every answer.</span></>}</h1>
        <p className="mt-6 max-w-md text-base leading-8 text-[var(--muted)]">{vi ? 'Kết nối giảng viên và sinh viên trong một trải nghiệm khảo thí rõ ràng, liền mạch và lấy con người làm trung tâm.' : 'Connecting lecturers and students through a clear, seamless, human-centered examination experience.'}</p>
        <div className="mt-10 space-y-6">{features.map(({ icon: Icon, title, text }) => <div key={title} className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--primary)]"><Icon aria-hidden="true" className="h-5 w-5" /></span><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{text}</p></div></div>)}</div>
      </section>
      <section className="ui-panel mx-auto w-full max-w-md p-6 sm:p-9" aria-labelledby="auth-heading">
        <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]"><GraduationCap aria-hidden="true" className="h-6 w-6" /></span>
        <h2 id="auth-heading" className="text-2xl font-semibold tracking-tight">{forgot ? (vi ? 'Quên mật khẩu?' : 'Forgot your password?') : (vi ? 'Chào mừng trở lại' : 'Welcome back')}</h2>
        <p className="mb-7 mt-3 text-sm leading-relaxed text-[var(--muted)]">{forgot ? (vi ? 'Nhập email tài khoản để nhận hướng dẫn đặt lại mật khẩu.' : 'Enter your account email to receive password reset instructions.') : (vi ? 'Đăng nhập bằng tài khoản được quản trị viên cấp để vào không gian của bạn.' : 'Sign in with your administrator-provided account to access your workspace.')}</p>
        {error && <div id="landing-login-error" role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"><AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        {success && <div role="status" className="mb-5 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{success}</div>}
        <form onSubmit={submit} aria-busy={busy} className="space-y-5">
          <div><label htmlFor="landing-login-email" className="ui-label">Email</label><input id="landing-login-email" name="email" type="text" inputMode="email" autoComplete={forgot ? 'email' : 'username'} autoCapitalize="none" spellCheck={false} required value={email} onChange={event => setEmail(event.target.value)} aria-describedby={error ? 'landing-login-error' : undefined} placeholder="name@example.com" className="ui-input" /></div>
          {!forgot && <div><div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="landing-login-password" className="text-sm font-semibold">{vi ? 'Mật khẩu' : 'Password'}</label><button type="button" disabled={busy} className="min-h-8 text-xs font-semibold text-[var(--primary)] hover:underline" onClick={() => changeMode(true)}>{vi ? 'Quên mật khẩu?' : 'Forgot password?'}</button></div><div className="relative"><input id="landing-login-password" name="password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={event => setPassword(event.target.value)} className="ui-input pr-12" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={vi ? (showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu') : (showPassword ? 'Hide password' : 'Show password')} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-[var(--muted)]">{showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}</button></div></div>}
          <Button type="submit" variant="primary" disabled={busy} className="mt-2 w-full">{busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{busy ? (vi ? 'Đang xử lý…' : 'Please wait…') : forgot ? (vi ? 'Gửi link đặt lại mật khẩu' : 'Send reset link') : (vi ? 'Đăng nhập' : 'Sign in')}</Button>
          {forgot && <Button disabled={busy} onClick={() => changeMode(false)} className="w-full border-transparent"><ArrowLeft aria-hidden="true" className="h-4 w-4" />{vi ? 'Quay lại đăng nhập' : 'Back to sign in'}</Button>}
        </form>
        <p className="mt-7 border-t border-[var(--line)] pt-5 text-xs leading-relaxed text-[var(--muted)]">{vi ? 'Chưa có tài khoản? Liên hệ giảng viên hoặc quản trị viên để được hỗ trợ.' : 'Need an account? Contact your lecturer or administrator for assistance.'}</p>
      </section>
    </main>
    <footer className="mx-auto flex w-full max-w-7xl flex-wrap justify-between gap-2 px-5 py-6 text-xs text-[var(--muted)] sm:px-10"><span>AIVES · {vi ? 'Hệ thống thi vấn đáp có AI hỗ trợ' : 'AI-assisted viva examination system'}</span><span>FPT University</span></footer>
  </div>;
}
