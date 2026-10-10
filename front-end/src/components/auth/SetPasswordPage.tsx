import React, { useEffect, useState } from 'react';
import {
  BrainCircuit,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { checkPasswordLink, setPasswordWithLink, PasswordLinkInfo } from '../../services/authService';
import { Language, translations } from '../../utils/i18n';

interface SetPasswordPageProps {
  token: string;
  language: Language;
  // Leave the page; passwordChanged tells whether a new password was saved
  onDone: (passwordChanged: boolean) => void;
}

type LinkState = 'checking' | 'ready' | 'invalid' | 'unreachable' | 'done';

export const SetPasswordPage: React.FC<SetPasswordPageProps> = ({ token, language, onDone }) => {
  const isVi = language === 'vi';
  const t = translations[language];

  const [linkState, setLinkState] = useState<LinkState>('checking');
  const [linkInfo, setLinkInfo] = useState<PasswordLinkInfo | null>(null);
  const [checkAttempt, setCheckAttempt] = useState(0);

  // Form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Verify the link with the backend before showing the form
  useEffect(() => {
    let cancelled = false;
    checkPasswordLink(token)
      .then((info) => {
        if (cancelled) return;
        setLinkInfo(info);
        setLinkState('ready');
      })
      .catch((err: Error & { invalidLink?: boolean }) => {
        if (!cancelled) setLinkState(err.invalidLink ? 'invalid' : 'unreachable');
      });
    return () => {
      cancelled = true;
    };
  }, [token, checkAttempt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // The upper bound is in bytes: the server hashes with BCrypt, which reads at most 72 bytes.
    if (newPassword.length < 8 || new TextEncoder().encode(newPassword).length > 72) {
      setErrorMessage(
        isVi
          ? 'Mật khẩu phải có ít nhất 8 ký tự và không quá 72 byte (72 ký tự không dấu)'
          : 'Password must contain at least 8 characters and at most 72 bytes'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage(isVi ? 'Mật khẩu nhập lại không khớp' : 'Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await setPasswordWithLink(token, newPassword);
      setLinkState('done');
    } catch (err: any) {
      if (err.invalidLink) {
        setLinkState('invalid');
      } else {
        setErrorMessage(err.message || (isVi ? 'Không thể đặt mật khẩu' : 'Could not set password'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isActivation = linkInfo?.activation !== false;

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-white flex flex-col justify-between relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background dynamic ambient glow lights */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-[128px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/25 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-pink-600/20 rounded-full blur-[128px] pointer-events-none" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* BRAND HEADER */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          <BrainCircuit className="h-6 w-6 animate-pulse" />
        </div>
        <span className="font-extrabold text-xl tracking-tight text-white font-display">{t.appName}</span>
      </header>

      <main className="relative z-10 flex-1 w-full flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          <div className="bg-slate-900/80 border border-white/15 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] relative overflow-hidden">
            {/* Top glowing accent line */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

            {/* Card Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                  {isVi ? 'Link dùng một lần' : 'One-time link'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {isActivation
                  ? isVi
                    ? 'Đặt mật khẩu cho tài khoản'
                    : 'Set your account password'
                  : isVi
                  ? 'Đặt lại mật khẩu'
                  : 'Reset your password'}
              </h2>
              {linkState === 'ready' && linkInfo && (
                <p className="text-xs text-slate-400 mt-1 break-all">
                  {isVi ? 'Tài khoản: ' : 'Account: '}
                  <span className="text-indigo-300 font-medium">{linkInfo.fullName}</span>
                  {' — '}
                  <span className="whitespace-pre-wrap">{linkInfo.email.trim()}</span>
                </p>
              )}
            </div>

            {/* CHECKING THE LINK */}
            {linkState === 'checking' && (
              <div role="status" className="py-6 flex flex-col items-center justify-center gap-2 text-sm text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <span>{isVi ? 'Đang kiểm tra link...' : 'Checking link...'}</span>
              </div>
            )}

            {/* LINK USED / REPLACED / EXPIRED */}
            {linkState === 'invalid' && (
              <>
                <div role="alert" className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>
                    {isVi
                      ? 'Link không hợp lệ, đã được dùng hoặc đã hết hạn. Hãy bấm "Quên mật khẩu?" ở trang đăng nhập để nhận link mới, hoặc liên hệ Quản trị viên.'
                      : 'This link is invalid, already used or expired. Use "Forgot password?" on the sign-in page to get a new one, or contact your administrator.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onDone(false)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isVi ? 'Về trang đăng nhập' : 'Go to sign in'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* SERVER UNREACHABLE: the link itself may still be fine */}
            {linkState === 'unreachable' && (
              <>
                <div role="alert" className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>
                    {isVi
                      ? 'Không thể kiểm tra link với máy chủ. Link của bạn vẫn còn nguyên; vui lòng thử lại.'
                      : 'Could not reach the server. Your link is untouched; please try again.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLinkState('checking');
                    setCheckAttempt((attempt) => attempt + 1);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{isVi ? 'Thử lại' : 'Retry'}</span>
                </button>
              </>
            )}

            {/* PASSWORD SAVED */}
            {linkState === 'done' && (
              <>
                <div role="status" className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>
                    {isVi
                      ? 'Đã lưu mật khẩu. Bạn có thể đăng nhập bằng email và mật khẩu vừa đặt.'
                      : 'Password saved. You can now sign in with your email and new password.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onDone(true)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isVi ? 'Đăng nhập ngay' : 'Sign in now'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* SET PASSWORD FORM */}
            {linkState === 'ready' && (
              <>
                {errorMessage && (
                  <div id="set-password-error" role="alert" className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isSubmitting}>
                  <div>
                    <label htmlFor="set-password-new" className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {isVi ? 'Mật khẩu mới (tối thiểu 8 ký tự)' : 'New password (at least 8 characters)'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="set-password-new"
                        name="new-password"
                        autoComplete="new-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        aria-describedby={errorMessage ? 'set-password-error' : undefined}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-white/15 bg-white/5 text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={isVi ? 'Hiện hoặc ẩn mật khẩu' : 'Show or hide password'}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="set-password-confirm" className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {isVi ? 'Nhập lại mật khẩu' : 'Confirm password'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="set-password-confirm"
                        name="confirm-password"
                        autoComplete="new-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-white/15 bg-white/5 text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {isSubmitting ? (
                      <span>{isVi ? 'Đang lưu...' : 'Saving...'}</span>
                    ) : (
                      <>
                        <span>{isVi ? 'Lưu mật khẩu' : 'Save password'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 border-t border-white/10 text-xs text-slate-400">
        <span className="font-bold text-white">AIVES</span>
        <span> — AI-Powered Oral Viva Voce Examination System © 2026</span>
      </footer>
    </div>
  );
};
