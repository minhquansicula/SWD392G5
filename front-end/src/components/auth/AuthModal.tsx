import React, { useState } from 'react';
import {
  X,
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
} from 'lucide-react';
import { UserAccount, UserRole } from '../../types';
import { DEMO_ACCOUNTS, loginUser, registerUser } from '../../services/authService';
import { Language } from '../../utils/i18n';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserAccount) => void;
  language: Language;
  initialTab?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  language,
  initialTab = 'login',
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state (No role selection!)
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // State feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const isVi = language === 'vi';

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
      setSuccessMessage(isVi ? `Đăng nhập thành công! Chào mừng ${user.fullName}` : `Welcome back, ${user.fullName}`);
      setTimeout(() => {
        onSuccess(user);
        onClose();
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
      setSuccessMessage(isVi ? `Đăng nhập thành công vai trò ${user.role}` : `Logged in as ${user.role}`);
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 400);
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user registration (Role is strictly NOT chosen by user; Admin assigns later)
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
      setErrorMessage(isVi ? 'Mật khẩu xác nhận không khớp' : 'Passwords do not match');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage(isVi ? 'Bạn cần đồng ý với điều khoản sử dụng' : 'Please accept terms & conditions');
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
          ? 'Tạo tài khoản thành công! Quyền hạn ban đầu là Sinh viên (Admin sẽ nâng cấp sau).'
          : 'Account created successfully! Default role assigned (Admin assigns specific role later).'
      );
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || (isVi ? 'Đăng ký không thành công' : 'Registration failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Tabs */}
        <div className="pt-6 px-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              onClick={() => {
                setActiveTab('login');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isVi ? 'Đăng nhập' : 'Sign In'}
            </button>
            <button
              onClick={() => {
                setActiveTab('register');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'register'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isVi ? 'Đăng ký tài khoản' : 'Register Account'}
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab 1: LOGIN */}
        {activeTab === 'login' && (
          <div className="p-6 space-y-5">
            {/* 1-Touch Demo Accounts Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {isVi ? '⚡ Đăng nhập 1 chạm (Tài khoản thử nghiệm)' : '⚡ 1-Click Quick Demo Login'}
                </span>
                <span className="text-[11px] text-slate-400">password123</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => handleDemoLogin(acc.username, acc.password)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 transition-all text-left group"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {acc.role === 'ADMIN' && <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />}
                      {acc.role === 'LECTURER' && <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />}
                      {acc.role === 'STUDENT' && <Users className="w-3.5 h-3.5 text-emerald-500" />}
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {acc.role === 'ADMIN' ? 'Admin' : acc.role === 'LECTURER' ? 'Giảng viên' : 'Sinh viên'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">@{acc.username}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-400 absolute">
                {isVi ? 'hoặc nhập thông tin' : 'or enter details'}
              </span>
            </div>

            {/* Standard Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isVi ? 'Tên đăng nhập hoặc Email' : 'Username or Email'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder={isVi ? 'admin, dr.nguyen, tranthib...' : 'username or email'}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isVi ? 'Mật khẩu' : 'Password'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>{isVi ? 'Đang xác thực...' : 'Authenticating...'}</span>
                ) : (
                  <>
                    <span>{isVi ? 'Đăng nhập vào AIVES' : 'Sign In to AIVES'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: REGISTER (NO ROLE PICKER, ADMIN ASSIGNS LATER) */}
        {activeTab === 'register' && (
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Policy Notice Box */}
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <div>
                <p className="font-semibold">{isVi ? 'Quy chế phân quyền người dùng' : 'Account Role Policy'}</p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {isVi
                    ? 'Tài khoản đăng ký mới sẽ tự động có quyền Sinh viên. Quản trị viên (Admin) của khoa/trường sẽ tiến hành phân quyền Giảng viên hoặc Quản lý sau khi xác thực danh tính.'
                    : 'Newly registered accounts start as Student. Department Admins will assign Faculty/Admin privileges upon identity verification.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Họ và tên' : 'Full Name'} *
                </label>
                <input
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder={isVi ? 'Nguyễn Văn A' : 'John Doe'}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Tên đăng nhập' : 'Username'} *
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="nguyenvana"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Email FPT / Học tập' : 'Email Address'} *
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="anv@fpt.edu.vn"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Mật khẩu' : 'Password'} *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 pr-9 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Xác nhận mật khẩu' : 'Confirm Password'} *
                  </label>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="agreeTerms" className="text-xs text-slate-600 dark:text-slate-400">
                  {isVi ? 'Tôi đồng ý với Quy chế thi vấn đáp và bảo mật AIVES' : 'I agree to the Examination Code & Policy'}
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>{isVi ? 'Đang khởi tạo tài khoản...' : 'Creating account...'}</span>
                ) : (
                  <>
                    <span>{isVi ? 'Hoàn tất Đăng ký' : 'Complete Registration'}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
