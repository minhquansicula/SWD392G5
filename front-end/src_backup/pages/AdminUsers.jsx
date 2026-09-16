// ============================================================
// AIVES — Admin Users & Role Management Portal
// ============================================================
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, 
    UserCheck, 
    BookOpen, 
    ShieldCheck, 
    Search, 
    Plus, 
    Trash2, 
    Check, 
    AlertCircle, 
    ChevronDown, 
    GraduationCap, 
    Mail, 
    Calendar,
    X,
    Loader2
} from 'lucide-react';
import { Role } from '../types';
import { 
    getAllUsersApi, 
    updateUserRoleApi, 
    deleteUserApi, 
    createUserByAdminApi 
} from '../lib/authApi';
import { cn } from '../lib/utils';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [notification, setNotification] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeRoleDropdown, setActiveRoleDropdown] = useState(null);

    // Form state for creating user
    const [newFullName, setNewFullName] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('password123');
    const [newRole, setNewRole] = useState(Role.STUDENT);
    const [createError, setCreateError] = useState('');
    const [createLoading, setCreateLoading] = useState(false);

    // Load users
    const fetchUsers = async () => {
        try {
            const data = await getAllUsersApi();
            setUsers(data);
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Show temporary toast notification
    const showNotification = (msg, type = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3500);
    };

    // Role assignment handler
    const handleRoleChange = async (userId, targetRole) => {
        try {
            await updateUserRoleApi(userId, targetRole);
            setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, role: targetRole } : u))
            );
            setActiveRoleDropdown(null);
            showNotification(`Đã cập nhật phân quyền thành công!`);
        } catch (err) {
            showNotification(err.message || 'Lỗi phân quyền', 'error');
        }
    };

    // Delete user handler
    const handleDeleteUser = async (userId, username) => {
        if (username === 'admin') {
            showNotification('Không thể xóa tài khoản Quản trị viên mặc định!', 'error');
            return;
        }
        if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản @${username}?`)) {
            return;
        }
        try {
            await deleteUserApi(userId);
            setUsers((prev) => prev.filter((u) => u.id !== userId));
            showNotification(`Đã xóa tài khoản @${username}`);
        } catch (err) {
            showNotification(err.message || 'Lỗi khi xóa người dùng', 'error');
        }
    };

    // Create user handler
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreateError('');
        if (!newFullName.trim() || !newUsername.trim() || !newEmail.trim() || !newPassword) {
            setCreateError('Vui lòng điền đầy đủ các thông tin bắt buộc');
            return;
        }

        setCreateLoading(true);
        try {
            await createUserByAdminApi({
                fullName: newFullName.trim(),
                username: newUsername.trim(),
                email: newEmail.trim(),
                password: newPassword,
                role: newRole,
            });
            await fetchUsers();
            setIsCreateModalOpen(false);
            setNewFullName('');
            setNewUsername('');
            setNewEmail('');
            setNewPassword('password123');
            showNotification(`Tạo người dùng @${newUsername} thành công!`);
        } catch (err) {
            setCreateError(err.message || 'Không thể tạo tài khoản');
        } finally {
            setCreateLoading(false);
        }
    };

    // Filter users
    const filteredUsers = users.filter((u) => {
        const matchesSearch =
            u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
            u.username?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase());

        if (!matchesSearch) return false;
        if (roleFilter === 'ALL') return true;
        return u.role === roleFilter;
    });

    // Counts
    const totalCount = users.length;
    const lecturerCount = users.filter((u) => u.role === Role.LECTURER).length;
    const studentCount = users.filter((u) => u.role === Role.STUDENT).length;
    const adminCount = users.filter((u) => u.role === Role.ADMIN).length;

    return (
        <div className="max-w-7xl mx-auto py-2">
            {/* Toast Notification */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-6 right-8 z-50 pointer-events-none"
                    >
                        <div className={cn(
                            "px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold backdrop-blur-xl pointer-events-auto",
                            notification.type === 'error'
                                ? "bg-danger-500/10 border-danger-500/30 text-danger-400"
                                : "bg-accent-500/10 border-accent-500/30 text-accent-400"
                        )}>
                            {notification.type === 'error' ? (
                                <AlertCircle className="w-4 h-4 text-danger-400" />
                            ) : (
                                <Check className="w-4 h-4 text-accent-400" />
                            )}
                            <span>{notification.msg}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest font-mono">
                            Admin Control Center
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold text-surface-50 dark:text-white tracking-tight">
                        Quản lý Người dùng & Phân quyền
                    </h1>
                    <p className="text-sm font-medium text-surface-400 mt-1">
                        Xét duyệt tài khoản, phân vai trò Giảng viên/Sinh viên và quản trị hệ thống
                    </p>
                </div>

                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all shadow-[0_0_20px_rgba(168,85,247,0.25)] cursor-pointer shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    <span>Thêm người dùng</span>
                </button>
            </div>

            {/* Bento Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="p-5 rounded-2xl bg-surface-900 border border-surface-600 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Tổng tài khoản</span>
                        <div className="w-8 h-8 rounded-xl bg-surface-800 flex items-center justify-center text-surface-400">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-surface-50 dark:text-white tracking-tight">{totalCount}</p>
                    <p className="text-[11px] text-surface-400 mt-1">Người dùng đã đăng ký</p>
                </div>

                <div className="p-5 rounded-2xl bg-surface-900 border border-surface-600 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Giảng viên</span>
                        <div className="w-8 h-8 rounded-xl bg-accent-500/10 text-accent-500 flex items-center justify-center">
                            <BookOpen className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-accent-500 tracking-tight">{lecturerCount}</p>
                    <p className="text-[11px] text-surface-400 mt-1">Được quyền tạo đề & chấm thi</p>
                </div>

                <div className="p-5 rounded-2xl bg-surface-900 border border-surface-600 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Sinh viên</span>
                        <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center">
                            <GraduationCap className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-primary-500 tracking-tight">{studentCount}</p>
                    <p className="text-[11px] text-surface-400 mt-1">Tham gia thi vấn đáp AI</p>
                </div>

                <div className="p-5 rounded-2xl bg-surface-900 border border-surface-600 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Quản trị viên</span>
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-purple-500 tracking-tight">{adminCount}</p>
                    <p className="text-[11px] text-surface-400 mt-1">Toàn quyền kiểm duyệt</p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                {/* Search */}
                <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm tên, username, email..."
                        className="w-full pl-9 pr-4 py-2.5 bg-surface-900 border border-surface-600 dark:border-white/10 rounded-xl text-sm text-surface-50 dark:text-white placeholder-surface-400 focus:outline-none focus:border-purple-500/50 transition-all shadow-sm"
                    />
                </div>

                {/* Role Tabs Filter */}
                <div className="flex items-center gap-1.5 p-1 bg-surface-800/60 dark:bg-surface-900 border border-surface-600 dark:border-white/10 rounded-xl self-stretch sm:self-auto overflow-x-auto">
                    {[
                        { id: 'ALL', label: 'Tất cả' },
                        { id: Role.LECTURER, label: 'Giảng viên' },
                        { id: Role.STUDENT, label: 'Sinh viên' },
                        { id: Role.ADMIN, label: 'Quản trị viên' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setRoleFilter(tab.id)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                                roleFilter === tab.id
                                    ? "bg-purple-600 text-white shadow-sm"
                                    : "text-surface-400 hover:text-surface-100"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-surface-900 border border-surface-600 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center text-surface-400 gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                        <span className="text-xs font-medium">Đang tải danh sách người dùng...</span>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-12 text-center text-surface-400">
                        <p className="text-sm font-semibold">Không tìm thấy người dùng phù hợp</p>
                        <p className="text-xs mt-1">Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-surface-600 dark:border-white/5 text-[11px] font-bold uppercase tracking-wider text-surface-400 bg-surface-800/30">
                                    <th className="py-3.5 px-5">Người dùng</th>
                                    <th className="py-3.5 px-5">Email</th>
                                    <th className="py-3.5 px-5">Ngày tạo</th>
                                    <th className="py-3.5 px-5">Vai trò hiện tại</th>
                                    <th className="py-3.5 px-5 text-right">Thao tác phân quyền</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-600 dark:divide-white/5 text-sm">
                                {filteredUsers.map((user) => (
                                    <tr 
                                        key={user.id} 
                                        className="hover:bg-surface-800/30 transition-colors group"
                                    >
                                        {/* User Info */}
                                        <td className="py-4 px-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-surface-300 to-surface-200 dark:from-surface-700 dark:to-surface-600 flex items-center justify-center text-surface-50 dark:text-white text-xs font-bold shrink-0 border border-surface-400 dark:border-white/10 shadow-xs">
                                                    {user.fullName ? user.fullName.charAt(0) : 'U'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-surface-50 dark:text-white truncate">
                                                        {user.fullName}
                                                    </p>
                                                    <p className="text-xs text-surface-400 font-mono">
                                                        @{user.username}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Email */}
                                        <td className="py-4 px-5 text-xs text-surface-300 font-mono">
                                            {user.email || '—'}
                                        </td>

                                        {/* Created Date */}
                                        <td className="py-4 px-5 text-xs text-surface-400">
                                            {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                                        </td>

                                        {/* Current Role Badge */}
                                        <td className="py-4 px-5">
                                            <span className={cn(
                                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                                                user.role === Role.ADMIN
                                                    ? "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30"
                                                    : user.role === Role.LECTURER
                                                        ? "text-accent-600 dark:text-accent-400 bg-accent-500/10 border-accent-500/30"
                                                        : "text-primary-600 dark:text-primary-400 bg-primary-500/10 border-primary-500/30"
                                            )}>
                                                <span className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    user.role === Role.ADMIN
                                                        ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                                                        : user.role === Role.LECTURER
                                                            ? "bg-accent-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                                                            : "bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                                                )} />
                                                {user.role === Role.ADMIN ? 'Quản trị viên' : user.role === Role.LECTURER ? 'Giảng viên' : 'Sinh viên'}
                                            </span>
                                        </td>

                                        {/* Role Actions */}
                                        <td className="py-4 px-5 text-right">
                                            <div className="inline-flex items-center gap-2 relative">
                                                {/* Role Switcher Pill */}
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setActiveRoleDropdown(activeRoleDropdown === user.id ? null : user.id)}
                                                        className="px-2.5 py-1.5 rounded-lg border border-surface-600 dark:border-white/10 hover:border-purple-500/50 bg-surface-800/40 text-xs font-semibold text-surface-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                                                        title="Bấm để đổi vai trò người dùng"
                                                    >
                                                        <span>Đổi quyền</span>
                                                        <ChevronDown className="w-3.5 h-3.5 text-surface-400" />
                                                    </button>

                                                    {/* Dropdown Menu */}
                                                    {activeRoleDropdown === user.id && (
                                                        <div className="absolute right-0 mt-1 w-44 rounded-xl bg-surface-900 border border-surface-600 dark:border-white/10 shadow-2xl py-1.5 z-30">
                                                            <p className="px-3 py-1 text-[10px] font-bold text-surface-500 uppercase tracking-wider">
                                                                Chọn vai trò mới:
                                                            </p>
                                                            {[
                                                                { role: Role.STUDENT, label: 'Sinh viên (Student)', color: 'text-primary-500' },
                                                                { role: Role.LECTURER, label: 'Giảng viên (Lecturer)', color: 'text-accent-500' },
                                                                { role: Role.ADMIN, label: 'Quản trị viên (Admin)', color: 'text-purple-500' },
                                                            ].map((item) => (
                                                                <button
                                                                    key={item.role}
                                                                    onClick={() => handleRoleChange(user.id, item.role)}
                                                                    className={cn(
                                                                        "w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-surface-800/70 transition-colors cursor-pointer",
                                                                        user.role === item.role ? "font-bold text-white bg-surface-800/40" : "text-surface-300"
                                                                    )}
                                                                >
                                                                    <span className={item.color}>{item.label}</span>
                                                                    {user.role === item.role && <Check className="w-3.5 h-3.5 text-accent-400" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Delete Button */}
                                                {user.username !== 'admin' && (
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id, user.username)}
                                                        className="p-1.5 rounded-lg border border-transparent hover:border-danger-500/20 hover:bg-danger-500/10 text-surface-400 hover:text-danger-400 transition-colors cursor-pointer"
                                                        title="Xóa tài khoản"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal: Thêm người dùng mới */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-surface-900 border border-surface-600 dark:border-white/10 rounded-2xl p-6 shadow-2xl relative"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-bold text-surface-50 dark:text-white">
                                    Thêm người dùng mới
                                </h3>
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {createError && (
                                <div className="mb-4 p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-xs text-danger-400 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{createError}</span>
                                </div>
                            )}

                            <form onSubmit={handleCreateUser} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-semibold text-surface-300 mb-1">
                                        Họ và tên
                                    </label>
                                    <input
                                        type="text"
                                        value={newFullName}
                                        onChange={(e) => setNewFullName(e.target.value)}
                                        placeholder="ví dụ: Lê Văn Minh"
                                        className="w-full px-3.5 py-2 bg-surface-950/60 border border-surface-600 dark:border-white/10 rounded-xl text-sm text-surface-50 dark:text-white outline-none focus:border-purple-500/50"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-surface-300 mb-1">
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            value={newUsername}
                                            onChange={(e) => setNewUsername(e.target.value)}
                                            placeholder="vanminh"
                                            className="w-full px-3 py-2 bg-surface-950/60 border border-surface-600 dark:border-white/10 rounded-xl text-sm text-surface-50 dark:text-white outline-none focus:border-purple-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-surface-300 mb-1">
                                            Vai trò phân quyền
                                        </label>
                                        <select
                                            value={newRole}
                                            onChange={(e) => setNewRole(e.target.value)}
                                            className="w-full px-3 py-2 bg-surface-950/60 border border-surface-600 dark:border-white/10 rounded-xl text-xs font-semibold text-surface-50 dark:text-white outline-none focus:border-purple-500/50 cursor-pointer"
                                        >
                                            <option value={Role.STUDENT}>Sinh viên</option>
                                            <option value={Role.LECTURER}>Giảng viên</option>
                                            <option value={Role.ADMIN}>Quản trị viên</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-surface-300 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="minhlv@fpt.edu.vn"
                                        className="w-full px-3.5 py-2 bg-surface-950/60 border border-surface-600 dark:border-white/10 rounded-xl text-sm text-surface-50 dark:text-white outline-none focus:border-purple-500/50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-surface-300 mb-1">
                                        Mật khẩu khởi tạo
                                    </label>
                                    <input
                                        type="text"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="password123"
                                        className="w-full px-3.5 py-2 bg-surface-950/60 border border-surface-600 dark:border-white/10 rounded-xl text-sm text-surface-50 dark:text-white outline-none focus:border-purple-500/50 font-mono"
                                    />
                                </div>

                                <div className="pt-2 flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createLoading}
                                        className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        {createLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        <span>Tạo tài khoản</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
