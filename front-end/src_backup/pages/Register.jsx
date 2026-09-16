// ============================================================
// AIVES — Register Page (Minimal & Focused, Admin-Assigned Roles)
// ============================================================
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Lock, 
    User, 
    Mail, 
    ArrowRight, 
    Eye, 
    EyeOff, 
    AlertCircle, 
    Loader2, 
    CheckCircle,
    ShieldAlert
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Role } from '../types';

export default function Register() {
    const navigate = useNavigate();
    const { register, isLoading, error, clearError } = useAuthStore();

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
            setLocalError('Bạn cần đồng ý với Quy chế và Điều khoản để tiếp tục');
            return;
        }

        try {
            // Role is default assigned as STUDENT initially, pending Admin role management
            const user = await register({
                fullName: fullName.trim(),
                username: username.trim(),
                email: email.trim(),
                password,
                role: Role.STUDENT,
            });

            setSuccessMessage(`Đăng ký thành công! Đang chuyển hướng vào hệ thống...`);
            setTimeout(() => {
                navigate('/my-schedules', { replace: true });
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

            {/* Main Auth Container */}
            <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-lg relative z-10 my-8"
            >
                {/* Glassmorphism Card */}
                <div className="glass bg-surface-900/70 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary-400/50 to-transparent" />

                    <div className="mb-5">
                        <h2 className="text-xl font-bold text-white tracking-tight">Tạo tài khoản mới</h2>
                        <p className="text-xs text-surface-400 mt-1">
                            Đăng ký tài khoản thành viên hệ thống AIVES
                        </p>
                    </div>

                    {/* Admin role assignment policy note */}
                    <div className="mb-5 p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-start gap-2.5 text-xs text-primary-300">
                        <ShieldAlert className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                            <span className="font-semibold text-white">Chính sách phân quyền:</span> Sau khi đăng ký, tài khoản sẽ được Quản trị viên (Admin) xét duyệt và phân quyền vai trò (Sinh viên hoặc Giảng viên).
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
