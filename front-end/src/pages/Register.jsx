// ============================================================
// AIVES — Register Page (Linear / Vercel Glassmorphism Style)
// ============================================================
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    GraduationCap, 
    Lock, 
    User, 
    Mail, 
    ArrowRight, 
    Eye, 
    EyeOff, 
    AlertCircle, 
    Loader2, 
    Sun, 
    Moon, 
    CheckCircle,
    UserCheck,
    BookOpen
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { Role } from '../types';
import { cn } from '../lib/utils';

export default function Register() {
    const navigate = useNavigate();
    const { register, isLoading, error, clearError } = useAuthStore();
    const { theme, toggleTheme } = useThemeStore();

    const [role, setRole] = useState(Role.STUDENT);
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(true);
    const [localError, setLocalError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        clearError();

        // Validation
        if (!fullName.trim()) {
            setLocalError('Vui lòng nhập họ và tên của bạn');
            return;
        }
        if (!username.trim()) {
            setLocalError('Vui lòng nhập tên đăng nhập');
            return;
        }
        if (username.trim().length < 3) {
            setLocalError('Tên đăng nhập phải có ít nhất 3 ký tự');
            return;
        }
        if (/\s/.test(username.trim())) {
            setLocalError('Tên đăng nhập không được chứa khoảng trắng');
            return;
        }
        if (!email.trim()) {
            setLocalError('Vui lòng nhập địa chỉ email');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setLocalError('Định dạng email không hợp lệ (ví dụ: student@fpt.edu.vn)');
            return;
        }
        if (!password) {
            setLocalError('Vui lòng nhập mật khẩu');
            return;
        }
        if (password.length < 6) {
            setLocalError('Mật khẩu phải chứa ít nhất 6 ký tự');
            return;
        }
        if (password !== confirmPassword) {
            setLocalError('Mật khẩu xác nhận không trùng khớp');
            return;
        }
        if (!agreeTerms) {
            setLocalError('Bạn cần đồng ý với Quy chế thi vấn đáp trực tuyến để tiếp tục');
            return;
        }

        try {
            const user = await register({
                fullName: fullName.trim(),
                username: username.trim(),
                email: email.trim(),
                password,
                role,
            });

            setSuccessMessage(`Đăng ký thành công! Đang chuyển hướng vào hệ thống...`);
            setTimeout(() => {
                if (user.role === Role.STUDENT) {
                    navigate('/my-schedules', { replace: true });
                } else {
                    navigate('/exams', { replace: true });
                }
            }, 900);
        } catch (err) {
            setLocalError(err.message || 'Đăng ký không thành công. Vui lòng thử lại!');
        }
    };

    const displayError = localError || error;

    return (
        <div className="min-h-screen bg-surface-950 text-surface-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden select-none">
            {/* Ambient Lighting Gradients */}
            <div className="absolute top-1/6 -right-20 w-96 h-96 bg-primary-600/15 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-1/6 -left-20 w-96 h-96 bg-accent-500/10 rounded-full blur-[140px] pointer-events-none" />

            {/* Top Bar (Theme Toggle) */}
            <header className="absolute top-6 right-6 z-30 flex items-center gap-3">
                <button
                    onClick={toggleTheme}
                    className="p-2.5 rounded-xl border border-white/10 bg-surface-900/60 backdrop-blur-xl text-surface-400 hover:text-white hover:bg-white/5 transition-all shadow-sm cursor-pointer"
                    title={theme === 'dark' ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
                >
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-warning-400" /> : <Moon className="w-4 h-4 text-primary-400" />}
                </button>
            </header>

            {/* Main Auth Container */}
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-lg relative z-10 my-8"
            >
                {/* Brand Header */}
                <div className="text-center mb-6">
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                        className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-b from-primary-400 to-primary-600 shadow-[0_0_35px_rgba(59,130,246,0.35)] border border-primary-300/30 mb-3"
                    >
                        <GraduationCap className="w-6 h-6 text-white drop-shadow-md" />
                    </motion.div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
                        Tạo tài khoản mới
                    </h1>
                    <p className="text-xs text-surface-400 font-medium">
                        Tham gia nền tảng khảo thí AI thế hệ mới tại Đại học FPT
                    </p>
                </div>

                {/* Glassmorphism Card */}
                <div className="glass bg-surface-900/70 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary-400/50 to-transparent" />

                    {/* Role Selector Tabs */}
                    <div className="mb-6">
                        <label className="block text-xs font-semibold text-surface-400 mb-2 uppercase tracking-wider">
                            Chọn vai trò của bạn
                        </label>
                        <div className="grid grid-cols-2 p-1 bg-surface-950/70 rounded-xl border border-white/10 relative">
                            <button
                                type="button"
                                onClick={() => setRole(Role.STUDENT)}
                                className={cn(
                                    "relative py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer outline-none z-10",
                                    role === Role.STUDENT ? "text-white" : "text-surface-400 hover:text-surface-200"
                                )}
                            >
                                {role === Role.STUDENT && (
                                    <motion.div
                                        layoutId="roleActiveTab"
                                        className="absolute inset-0 bg-primary-600/30 border border-primary-500/40 rounded-lg shadow-sm"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <UserCheck className="w-4 h-4 relative z-10 text-primary-400" />
                                <span className="relative z-10">Sinh viên (Student)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setRole(Role.LECTURER)}
                                className={cn(
                                    "relative py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer outline-none z-10",
                                    role === Role.LECTURER ? "text-white" : "text-surface-400 hover:text-surface-200"
                                )}
                            >
                                {role === Role.LECTURER && (
                                    <motion.div
                                        layoutId="roleActiveTab"
                                        className="absolute inset-0 bg-accent-600/30 border border-accent-500/40 rounded-lg shadow-sm"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <BookOpen className="w-4 h-4 relative z-10 text-accent-400" />
                                <span className="relative z-10">Giảng viên (Lecturer)</span>
                            </button>
                        </div>

                        {/* Role helper caption */}
                        <p className="text-[11px] text-surface-500 mt-2 italic px-1">
                            {role === Role.STUDENT
                                ? '• Tài khoản Sinh viên: Thi vấn đáp với giám khảo AI, tra cứu điểm số và biên bản thi.'
                                : '• Tài khoản Giảng viên: Tạo đề thi vấn đáp, xem hàng đợi chấm thi và phân tích thống kê.'}
                        </p>
                    </div>

                    {/* Success Banner */}
                    <AnimatePresence>
                        {successMessage && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-5 overflow-hidden"
                            >
                                <div className="p-3.5 rounded-xl bg-accent-500/10 border border-accent-500/25 flex items-center gap-3 text-xs text-accent-300">
                                    <CheckCircle className="w-4 h-4 text-accent-400 shrink-0" />
                                    <p className="font-semibold">{successMessage}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Error Banner */}
                    <AnimatePresence>
                        {displayError && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-5 overflow-hidden"
                            >
                                <div className="p-3.5 rounded-xl bg-danger-500/10 border border-danger-500/25 flex items-start gap-3 text-xs text-danger-300">
                                    <AlertCircle className="w-4 h-4 text-danger-400 shrink-0 mt-0.5" />
                                    <p className="flex-1 font-medium leading-relaxed">{displayError}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Registration Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name */}
                        <div>
                            <label className="block text-xs font-semibold text-surface-300 mb-1.5 uppercase tracking-wider">
                                Họ và tên đầy đủ
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="ví dụ: Nguyễn Hoàng Nam"
                                className="w-full px-3.5 py-2.5 bg-surface-950/60 border border-white/10 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 rounded-xl text-sm text-white placeholder-surface-500 outline-none transition-all"
                            />
                        </div>

                        {/* Username & Email in a 2-col Grid on sm screens */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-surface-300 mb-1.5 uppercase tracking-wider">
                                    Tên tài khoản
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-500 group-focus-within:text-primary-400">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="hoangnam26"
                                        className="w-full pl-9 pr-3 py-2.5 bg-surface-950/60 border border-white/10 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 rounded-xl text-sm text-white placeholder-surface-500 outline-none transition-all"
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-surface-300 mb-1.5 uppercase tracking-wider">
                                    Địa chỉ Email
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-500 group-focus-within:text-primary-400">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="namnh@fpt.edu.vn"
                                        className="w-full pl-9 pr-3 py-2.5 bg-surface-950/60 border border-white/10 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 rounded-xl text-sm text-white placeholder-surface-500 outline-none transition-all"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Password & Confirm Password in 2-col Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-surface-300 mb-1.5 uppercase tracking-wider">
                                    Mật khẩu
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-500 group-focus-within:text-primary-400">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Ít nhất 6 ký tự"
                                        className="w-full pl-9 pr-8 py-2.5 bg-surface-950/60 border border-white/10 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 rounded-xl text-sm text-white placeholder-surface-500 outline-none transition-all"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-surface-500 hover:text-surface-300"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-surface-300 mb-1.5 uppercase tracking-wider">
                                    Xác nhận mật khẩu
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-500 group-focus-within:text-primary-400">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Nhập lại mật khẩu"
                                        className="w-full pl-9 pr-3 py-2.5 bg-surface-950/60 border border-white/10 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 rounded-xl text-sm text-white placeholder-surface-500 outline-none transition-all"
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Agreement Checkbox */}
                        <div className="pt-1">
                            <label className="flex items-start gap-2 text-xs text-surface-400 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={agreeTerms}
                                    onChange={(e) => setAgreeTerms(e.target.checked)}
                                    className="mt-0.5 rounded bg-surface-950 border-white/15 text-primary-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 accent-primary-500"
                                />
                                <span>
                                    Tôi cam kết tuân thủ{' '}
                                    <span className="text-surface-200 underline font-medium">Quy chế thi vấn đáp trực tuyến</span>{' '}
                                    và Điều khoản bảo mật AI của AIVES.
                                </span>
                            </label>
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-3 py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-semibold text-sm shadow-[0_0_25px_rgba(59,130,246,0.3)] hover:shadow-[0_0_35px_rgba(59,130,246,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Đang tạo tài khoản...</span>
                                </>
                            ) : (
                                <>
                                    <span>Hoàn tất Đăng ký</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* Back to Login Link */}
                    <div className="mt-6 pt-5 border-t border-white/5 text-center">
                        <p className="text-xs text-surface-400">
                            Đã có tài khoản thành viên?{' '}
                            <Link
                                to="/login"
                                className="text-primary-400 hover:text-primary-300 font-semibold transition-colors hover:underline"
                            >
                                Đăng nhập ngay
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
