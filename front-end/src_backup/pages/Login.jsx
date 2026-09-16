// ============================================================
// AIVES — Login Page (Minimal & Focused)
// ============================================================
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Lock, 
    User, 
    ArrowRight, 
    Eye, 
    EyeOff, 
    Sparkles, 
    AlertCircle, 
    Loader2, 
    CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Role } from '../types';
import { DEMO_ACCOUNTS } from '../lib/authApi';
import { cn } from '../lib/utils';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isLoading, error, clearError } = useAuthStore();

    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [localError, setLocalError] = useState('');

    // Determine return path after successful login
    const from = location.state?.from?.pathname;

    const handleRedirectByRole = (user) => {
        if (from && from !== '/login' && from !== '/register') {
            navigate(from, { replace: true });
            return;
        }
        if (user.role === Role.ADMIN) {
            navigate('/admin/users', { replace: true });
        } else if (user.role === Role.STUDENT) {
            navigate('/my-schedules', { replace: true });
        } else {
            navigate('/exams', { replace: true });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        clearError();

        if (!usernameOrEmail.trim()) {
            setLocalError('Vui lòng nhập tên tài khoản hoặc địa chỉ email');
            return;
        }
        if (!password) {
            setLocalError('Vui lòng nhập mật khẩu');
            return;
        }

        try {
            const user = await login({
                usernameOrEmail: usernameOrEmail.trim(),
                password,
                rememberMe,
            });
            handleRedirectByRole(user);
        } catch (err) {
            setLocalError(err.message || 'Đăng nhập thất bại');
        }
    };

    // Quick demo login handler (1-touch)
    const handleQuickLogin = async (account) => {
        setUsernameOrEmail(account.username);
        setPassword(account.password);
        setLocalError('');
        clearError();
        try {
            const user = await login({
                usernameOrEmail: account.username,
                password: account.password,
                rememberMe: true,
            });
            handleRedirectByRole(user);
        } catch (err) {
            setLocalError(err.message || 'Đăng nhập thất bại');
        }
    };

    const displayError = localError || error;

    return (
        <div className="min-h-screen bg-surface-950 text-surface-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden select-none">
            {/* Ambient Lighting Gradients */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary-600/15 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent-500/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-[160px] pointer-events-none" />

            {/* Main Auth Container */}
            <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md relative z-10"
            >
                {/* Glassmorphism Card */}
                <div className="glass bg-surface-900/70 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative overflow-hidden">
                    {/* Subtle card top glow accent */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary-400/50 to-transparent" />

                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-white tracking-tight">Đăng nhập</h2>
                        <p className="text-xs text-surface-400 mt-1">
                            Nhập thông tin xác thực để truy cập hệ thống AIVES
                        </p>
                    </div>

                    {/* Error Banner */}
                    <AnimatePresence>
                        {displayError && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, y: -6 }}
                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -6 }}
                                className="mb-5 overflow-hidden"
                            >
                                <div className="p-3.5 rounded-xl bg-danger-500/10 border border-danger-500/25 flex items-start gap-3 text-xs text-danger-300">
                                    <AlertCircle className="w-4 h-4 text-danger-400 shrink-0 mt-0.5" />
                                    <p className="flex-1 font-medium leading-relaxed">{displayError}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username / Email Field */}
                        <div>
                            <label className="block text-xs font-semibold text-surface-300 mb-1.5 uppercase tracking-wider">
                                Tên đăng nhập hoặc Email
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-500 group-focus-within:text-primary-400 transition-colors">
                                    <User className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    value={usernameOrEmail}
                                    onChange={(e) => {
                                        setUsernameOrEmail(e.target.value);
                                        if (displayError) {
                                            setLocalError('');
                                            clearError();
                                        }
                                    }}
                                    placeholder="ví dụ: dr.nguyen hoặc tranthib"
                                    className="w-full pl-10 pr-4 py-2.5 bg-surface-950/60 border border-white/10 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 rounded-xl text-sm text-white placeholder-surface-500 outline-none transition-all"
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider">
                                    Mật khẩu
                                </label>
                                <button
                                    type="button"
                                    onClick={() => alert('Mật khẩu mặc định cho các tài khoản Demo là: password123')}
                                    className="text-[11px] text-primary-400 hover:text-primary-300 hover:underline transition-colors"
                                >
                                    Quên mật khẩu?
                                </button>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-500 group-focus-within:text-primary-400 transition-colors">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (displayError) {
                                            setLocalError('');
                                            clearError();
                                        }
                                    }}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-10 py-2.5 bg-surface-950/60 border border-white/10 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 rounded-xl text-sm text-white placeholder-surface-500 outline-none transition-all"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-surface-500 hover:text-surface-300 transition-colors cursor-pointer"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 text-xs text-surface-300 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="rounded bg-surface-950 border-white/15 text-primary-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 accent-primary-500"
                                />
                                <span>Ghi nhớ phiên đăng nhập</span>
                            </label>
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-semibold text-sm shadow-[0_0_25px_rgba(59,130,246,0.3)] hover:shadow-[0_0_35px_rgba(59,130,246,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Đang xác thực...</span>
                                </>
                            ) : (
                                <>
                                    <span>Đăng nhập hệ thống</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-surface-500">
                            <span className="bg-surface-900/90 px-3 backdrop-blur-md rounded">Hoặc thử nghiệm nhanh</span>
                        </div>
                    </div>

                    {/* Quick Demo Logins (1-Click) */}
                    <div className="space-y-2">
                        <p className="text-[11px] text-surface-400 font-medium flex items-center gap-1.5 mb-2">
                            <Sparkles className="w-3 h-3 text-warning-400" />
                            <span>Đăng nhập 1-chạm với tài khoản Demo:</span>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {DEMO_ACCOUNTS.map((acc) => (
                                <button
                                    key={acc.username}
                                    type="button"
                                    onClick={() => handleQuickLogin(acc)}
                                    disabled={isLoading}
                                    className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left group cursor-pointer disabled:opacity-50"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase", acc.badgeColor)}>
                                            {acc.title}
                                        </span>
                                        <CheckCircle2 className="w-3 h-3 text-surface-500 group-hover:text-primary-400 transition-colors" />
                                    </div>
                                    <p className="text-xs font-semibold text-white group-hover:text-primary-300 transition-colors truncate">
                                        {acc.name}
                                    </p>
                                    <p className="text-[10px] text-surface-400 font-mono">@{acc.username}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Register Redirect Link */}
                    <div className="mt-6 pt-5 border-t border-white/5 text-center">
                        <p className="text-xs text-surface-400">
                            Chưa có tài khoản thành viên?{' '}
                            <Link
                                to="/register"
                                className="text-primary-400 hover:text-primary-300 font-semibold transition-colors hover:underline"
                            >
                                Đăng ký ngay
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer Note */}
                <p className="text-center text-[11px] text-surface-600 mt-6">
                    AIVES © 2026 — FPT University Software Architecture & AI Lab
                </p>
            </motion.div>
        </div>
    );
}
