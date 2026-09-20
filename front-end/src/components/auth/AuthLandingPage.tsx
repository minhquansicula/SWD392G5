import React, { useState } from 'react';
import {
  BrainCircuit,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Languages,
  Sun,
  Moon,
  Bot,
  BarChart3,
  Award,
  Zap,
} from 'lucide-react';
import { UserAccount } from '../../types';
import { loginUser } from '../../services/authService';
import { Language, translations } from '../../utils/i18n';

interface AuthLandingPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
}

export const AuthLandingPage: React.FC<AuthLandingPageProps> = ({
  onLoginSuccess,
  language,
  setLanguage,
  isDarkMode,
  setIsDarkMode,
}) => {
  const isVi = language === 'vi';
  const t = translations[language];

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle standard login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!loginIdentifier.trim()) {
      setErrorMessage(isVi ? 'Vui lòng nhập tên tài khoản' : 'Please enter your username');
      return;
    }
    if (!loginPassword) {
      setErrorMessage(isVi ? 'Vui lòng nhập mật khẩu' : 'Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      const user = await loginUser(loginIdentifier, loginPassword);
      setSuccessMessage(isVi ? `Đăng nhập thành công! Đang vào hệ thống...` : `Welcome back! Entering system...`);
      setTimeout(() => {
        onLoginSuccess(user);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || (isVi ? 'Đăng nhập không thành công' : 'Login failed'));
    } finally {
      setIsLoading(false);
    }
  };

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

      {/* ============================================================ */}
      {/* TOP BAR / BRAND HEADER */}
      {/* ============================================================ */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <BrainCircuit className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white font-display flex items-center gap-2">
              {t.appName}
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PRO 2026
              </span>
            </span>
            <p className="text-[11px] text-slate-400 font-medium">{t.appSub}</p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
            title="Ngôn ngữ / Language"
            className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5 text-indigo-400" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition-colors flex items-center justify-center cursor-pointer"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* MAIN CONTENT: SPLIT HERO & AUTHENTICATION CARD */}
      {/* ============================================================ */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 sm:py-12 flex-1 flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left Column: Vision & Feature Highlights */}
        <div className="w-full lg:w-1/2 space-y-6 text-left">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>{isVi ? 'TIÊN PHONG VẤN ĐÁP AI • PHIÊN BẢN 2026' : 'NEXT-GEN AI ORAL EXAMINATION'}</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl font-black font-display tracking-tight leading-tight">
            {isVi ? (
              <>
                Đánh giá năng lực{' '}
                <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                  Vấn Đáp Trực Tuyến
                </span>{' '}
                cùng Giám khảo AI.
              </>
            ) : (
              <>
                Autonomous{' '}
                <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                  Oral Viva Exams
                </span>{' '}
                Powered by AI.
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
            {isVi
              ? 'Tổ chức các phiên thi vấn đáp 1-kèm-1 thích ứng Socratic, tự động phân tích rubric, đánh giá bậc tư duy Bloom và phúc khảo điểm số với độ chính xác cao.'
              : 'Conduct dynamic 1-on-1 Socratic oral exams with real-time rubric grading, Bloom taxonomy appraisal, and multi-layered proctoring integrity.'}
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 max-w-xl">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-indigo-500/40 transition-colors">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Bot className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white">
                  {isVi ? 'Giám khảo AI Đa phong cách' : 'Adaptive AI Examiner'}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                {isVi
                  ? 'Tự động đào sâu câu hỏi bám sát giáo trình và phát hiện lỗ hổng tư duy.'
                  : 'Probes deeper concepts tailored to student speech in real time.'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-purple-500/40 transition-colors">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white">
                  {isVi ? 'Phân tích Rubric & Điểm số' : 'Instant Score Reports'}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                {isVi
                  ? 'Xuất nhận xét điểm mạnh, điểm yếu và phổ điểm lớp học ngay sau buổi thi.'
                  : 'Automated breakdown of strengths, weaknesses, and class cohorts.'}
              </p>
            </div>
          </div>

          {/* Key Metrics Pill Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>{isVi ? 'Độ trễ < 0.3s' : '< 0.3s Latency'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>{isVi ? '99.2% Chuẩn Rubric' : '99.2% Rubric Match'}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>{isVi ? 'Bảo mật FPT Edu' : 'Enterprise Proctoring'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Glassmorphism Auth Card */}
        <div className="w-full lg:w-5/12 max-w-md">
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
                  {isVi ? 'Cổng đăng nhập hệ thống' : 'Authentication Portal'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {isVi ? 'Đăng nhập vào Hệ thống' : 'Sign in to your account'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isVi
                  ? 'Vui lòng nhập tài khoản do Quản trị viên (Admin) cấp để tiếp tục.'
                  : 'Please enter credentials provisioned by your system administrator.'}
              </p>
            </div>

            {/* Error / Success Feedback */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {isVi ? 'Tên đăng nhập' : 'Username'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder={isVi ? 'Ví dụ: admin, lecturer1, student1' : 'Enter username'}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-white/15 bg-white/5 text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {isVi ? 'Mật khẩu' : 'Password'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-white/15 bg-white/5 text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <span>{isVi ? 'Đang xác thực...' : 'Authenticating...'}</span>
                ) : (
                  <>
                    <span>{isVi ? 'Đăng nhập vào Hệ thống' : 'Sign In to System'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Note about admin account provisioning */}
            <div className="mt-5 pt-4 border-t border-white/10 text-center">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {isVi ? (
                  <>
                    🛡️ Hệ thống thi vấn đáp nội bộ. Sinh viên & Giảng viên nhận tài khoản từ{' '}
                    <span className="text-indigo-300 font-medium">Quản trị viên (Admin)</span>.
                  </>
                ) : (
                  <>
                    🛡️ Internal Examination Portal. Accounts are provisioned exclusively by{' '}
                    <span className="text-indigo-300 font-medium">System Administrators</span>.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* FOOTER */}
      {/* ============================================================ */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 border-t border-white/10 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <span className="font-bold text-white">AIVES</span>
          <span> — AI-Powered Oral Viva Voce Examination System © 2026</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>WCAG 2.1 AA Compliant</span>
          <span>•</span>
          <span>FPT University</span>
        </div>
      </footer>
    </div>
  );
};
