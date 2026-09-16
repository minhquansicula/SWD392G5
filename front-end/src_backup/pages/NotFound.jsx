// ============================================================
// AIVES — 404 Not Found Page
// ============================================================
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft, Home } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Role } from '../types';

export default function NotFound() {
    const { currentUser } = useAuthStore();
    const isStudent = currentUser?.role === Role.STUDENT;
    const homePath = isStudent ? '/my-schedules' : '/exams';

    return (
        <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
            <div className="glass max-w-md w-full rounded-3xl p-8 border border-white/5 relative overflow-hidden">
                <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 mx-auto mb-6">
                    <Compass className="w-8 h-8 animate-spin-slow" />
                </div>

                <span className="text-xs font-mono font-bold uppercase tracking-widest text-primary-400 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 inline-block mb-3">
                    Mã lỗi 404
                </span>

                <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
                    Không tìm thấy trang yêu cầu
                </h1>

                <p className="text-xs text-surface-400 leading-relaxed mb-8">
                    Đường dẫn bạn đang truy cập không tồn tại trong hệ thống AIVES, hoặc bạn không có quyền truy cập vào khu vực này.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                        to={homePath}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-all shadow-lg shadow-primary-600/20 cursor-pointer"
                    >
                        <Home className="w-4 h-4" />
                        <span>Về trang chủ ({isStudent ? 'Lịch thi' : 'Danh sách thi'})</span>
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white text-xs font-semibold transition-colors border border-white/5 cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Quay lại</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
