import React, { useState } from 'react';
import {
  BrainCircuit,
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Users,
  Languages,
  Sun,
  Moon,
  Bot,
  BarChart3,
  Award,
  Zap,
} from 'lucide-react';
import { UserAccount, UserRole } from '../../types';
import { DEMO_ACCOUNTS, loginUser, registerUser } from '../../services/authService';
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

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state (Strictly NO role picker!)
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

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
      setErrorMessage(isVi ? 'Vui lòng nhập tên tài khoản hoặc email' : 'Please enter your username or email');
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

  // Quick 1-touch demo login
  const handleDemoLogin = async (username: string, password: string) => {
    setLoginIdentifier(username);
    setLoginPassword(password);
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);
    try {
      const user = await loginUser(username, password);
      setSuccessMessage(isVi ? `Đăng nhập thành công với vai trò ${user.role}!` : `Logged in as ${user.role}!`);
      setTimeout(() => {
        onLoginSuccess(user);
      }, 400);
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user registration (Strictly no role selection!)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!regFullName.trim()) {
      setErrorMessage(isVi ? 'Vui lòng nhập họ và tên' : 'Please enter your full name');
      return;
    }
    if (!regUsername.trim()) {
      setErrorMessage(isVi ? 'Vui lòng nhập tên tài khoản' : 'Please choose a username');
      return;
    }
    if (regUsername.trim().length < 3) {
      setErrorMessage(isVi ? 'Tên tài khoản phải có ít nhất 3 ký tự' : 'Username must be at least 3 characters');
      return;
    }
    if (/\s/.test(regUsername.trim())) {
      setErrorMessage(isVi ? 'Tên tài khoản không được chứa dấu cách' : 'Username cannot contain spaces');
      return;
    }
    if (!regEmail.trim()) {
      setErrorMessage(isVi ? 'Vui lòng nhập email hợp lệ' : 'Please enter a valid email');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMessage(isVi ? 'Mật khẩu phải từ 6 ký tự trở lên' : 'Password must be at least 6 characters');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage(isVi ? 'Mật khẩu xác nhận không trùng khớp' : 'Passwords do not match');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage(isVi ? 'Bạn cần đồng ý với quy chế thi vấn đáp' : 'Please accept terms & conditions');
      return;
    }

    setIsLoading(true);
    try {
      const user = await registerUser({
        fullName: regFullName,
        username: regUsername,
        email: regEmail,
        password: regPassword,
      });
      setSuccessMessage(
        isVi
          ? 'Đăng ký thành công! Quyền hạn mặc định là Sinh viên (Admin sẽ phân quyền sau).'
          : 'Account created! Default role assigned (Admin will assign specific role).'
      );
      setTimeout(() => {
        onLoginSuccess(user);
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || (isVi ? 'Đăng ký không thành công' : 'Registration failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-slate-100 flex flex-col justify-between select-none">
      {/* ============================================================ */}
      {/* ANIMATED MOVING GRADIENTS & AMBIENT GLOW BACKDROP */}
      {/* ============================================================ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Animated Orb 1 - Violet & Indigo */}
        <div className="absolute -top-24 -left-24 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/35 via-violet-600/30 to-purple-600/25 rounded-full blur-[140px] animate-float-1" />

        {/* Animated Orb 2 - Cyan & Emerald */}
        <div className="absolute -bottom-28 -right-20 w-[650px] h-[650px] bg-gradient-to-bl from-teal-500/25 via-emerald-600/20 to-indigo-600/20 rounded-full blur-[150px] animate-float-2" />

        {/* Animated Orb 3 - Rose & Amber Accent */}
        <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-gradient-to-r from-rose-500/18 to-indigo-500/20 rounded-full blur-[160px] animate-float-3" />

        {/* Micro-dot grid texture */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:40px_40px] opacity-70" />
      </div>

      {/* ============================================================ */}
      {/* TOP HEADER / BRAND BAR */}
      {/* ============================================================ */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 border border-white/20">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-white font-display block leading-tight">
              AIVES
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {isVi ? 'Hệ thống Thi Vấn đáp AI Thông minh' : 'AI-Powered Oral Viva Voce Examination System'}
            </span>
          </div>
        </div>

        {/* Top Controls: Language, Dark Mode Icon */}
        <div className="flex items-center gap-2.5">

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
            title="Chuyển đổi ngôn ngữ / Switch Language"
            className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5 text-indigo-400" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Theme Toggle (Icon only as requested) */}
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
          <div className="bg-slate-900/75 border border-white/15 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] relative overflow-hidden">
            {/* Top glowing accent line */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

            {/* Tab Switcher */}
            <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isVi ? 'Đăng nhập' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isVi ? 'Đăng ký thành viên' : 'Register Account'}
              </button>
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

            {/* TAB 1: LOGIN */}
            {activeTab === 'login' && (
              <div className="space-y-5">
                {/* 1-Touch Demo Accounts Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {isVi ? '⚡ Đăng nhập 1 chạm (Tài khoản mẫu)' : '⚡ 1-Click Quick Demo'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">password123</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {DEMO_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.username}
                        type="button"
                        onClick={() => handleDemoLogin(acc.username, acc.password)}
                        className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:border-indigo-500 hover:bg-indigo-500/15 transition-all text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {acc.role === 'ADMIN' && <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                          {acc.role === 'LECTURER' && (
                            <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          )}
                          {acc.role === 'STUDENT' && <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          <span className="text-xs font-bold text-white truncate">
                            {acc.role === 'ADMIN' ? 'Admin' : acc.role === 'LECTURER' ? 'Giảng viên' : 'Sinh viên'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate font-mono">@{acc.username}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-white/10 w-full" />
                  <span className="bg-slate-900/90 px-3 text-[11px] font-medium text-slate-400 absolute">
                    {isVi ? 'hoặc nhập tài khoản' : 'or enter credentials'}
                  </span>
                </div>

                {/* Form Inputs */}
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {isVi ? 'Tên đăng nhập hoặc Email' : 'Username or Email'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder={isVi ? 'admin, dr.nguyen, tranthib...' : 'username or email'}
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
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span>{isVi ? 'Đang xác thực...' : 'Authenticating...'}</span>
                    ) : (
                      <>
                        <span>{isVi ? 'Đăng nhập vào Hệ thống' : 'Sign In to Workspace'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: REGISTER (NO ROLE SELECTION!) */}
            {activeTab === 'register' && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* Policy Notice Box */}
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <p className="font-bold">{isVi ? 'Chính sách phân quyền tài khoản' : 'Account Role Policy'}</p>
                    <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                      {isVi
                        ? 'Tài khoản mới tạo sẽ có vai trò mặc định là Sinh viên. Quản trị viên (Admin) của trường sẽ xét duyệt và phân quyền Giảng viên / Quản trị tương ứng.'
                        : 'New accounts default to Student. Department Admins will assign Faculty/Admin permissions following verification.'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {isVi ? 'Họ và tên của bạn' : 'Full Name'} *
                    </label>
                    <input
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder={isVi ? 'Nguyễn Văn A' : 'John Doe'}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-white/15 bg-white/5 text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {isVi ? 'Tên đăng nhập' : 'Username'} *
                      </label>
                      <input
                        type="text"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="nguyenvana"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-white/15 bg-white/5 text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {isVi ? 'Email FPT' : 'Email'} *
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="anv@fpt.edu.vn"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-white/15 bg-white/5 text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {isVi ? 'Mật khẩu' : 'Password'} *
                      </label>
                      <div className="relative">
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3.5 py-2 pr-9 text-sm rounded-xl border border-white/15 bg-white/5 text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {isVi ? 'Xác nhận mật khẩu' : 'Confirm'} *
                      </label>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-white/15 bg-white/5 text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="agreeTermsLanding"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="agreeTermsLanding" className="text-xs text-slate-400 cursor-pointer">
                      {isVi ? 'Tôi đồng ý với Quy chế thi vấn đáp AIVES' : 'I agree to the AIVES Examination Code'}
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span>{isVi ? 'Đang tạo tài khoản...' : 'Creating account...'}</span>
                    ) : (
                      <>
                        <span>{isVi ? 'Đăng Ký Tài Khoản Ngay' : 'Create Account'}</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
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
