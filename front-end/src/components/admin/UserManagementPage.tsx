import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  GraduationCap,
  Search,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  ChevronDown,
  Mail,
  Calendar,
  X,
  UserPlus,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { UserAccount, UserRole } from '../../types';
import {
  getRegisteredUsers,
  updateUserRole,
  deleteUser,
  createUserByAdmin,
} from '../../services/authService';
import { Language } from '../../utils/i18n';

interface UserManagementPageProps {
  language: Language;
  currentUserId?: string;
  onRefreshCurrentUser?: () => void;
}

export const UserManagementPage: React.FC<UserManagementPageProps> = ({
  language,
  currentUserId,
  onRefreshCurrentUser,
}) => {
  const isVi = language === 'vi';

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Modal create user state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newRole, setNewRole] = useState<UserRole>('STUDENT');
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load all users on mount
  const loadUsers = () => {
    const list = getRegisteredUsers();
    setUsers(list);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Filter users based on search and role
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const name = u.fullName || (u as any).name || u.username || '';
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole =
        selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, selectedRoleFilter]);

  // Summary counts
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    const lecturers = users.filter((u) => u.role === 'LECTURER').length;
    const students = users.filter((u) => u.role === 'STUDENT').length;
    return { total, admins, lecturers, students };
  }, [users]);

  // Handle immediate role update
  const handleRoleChange = async (userId: string, newRoleValue: UserRole) => {
    try {
      await updateUserRole(userId, newRoleValue);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRoleValue } : u))
      );
      showToast(
        isVi
          ? `Đã cập nhật phân quyền thành công sang ${newRoleValue}`
          : `Role updated to ${newRoleValue}`
      );
      if (onRefreshCurrentUser) onRefreshCurrentUser();
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật phân quyền', 'error');
    }
  };

  // Handle delete user
  const handleDeleteUser = async (user: UserAccount) => {
    if (user.username === 'admin') {
      showToast(
        isVi ? 'Không thể xóa tài khoản Quản trị viên hệ thống!' : 'Cannot delete default system Admin!',
        'error'
      );
      return;
    }

    const confirmMsg = isVi
      ? `Bạn có chắc chắn muốn xóa tài khoản @${user.username} (${user.fullName})?`
      : `Are you sure you want to delete user @${user.username}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      showToast(
        isVi ? `Đã xóa tài khoản @${user.username}` : `Deleted user @${user.username}`
      );
    } catch (err: any) {
      showToast(err.message || 'Lỗi xóa người dùng', 'error');
    }
  };

  // Handle create user by admin
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!newFullName.trim() || !newUsername.trim() || !newEmail.trim() || !newPassword) {
      setCreateError(isVi ? 'Vui lòng điền đầy đủ các mục bắt buộc' : 'Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createUserByAdmin({
        fullName: newFullName.trim(),
        username: newUsername.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      });

      setUsers((prev) => [created, ...prev]);
      setIsCreateModalOpen(false);
      setNewFullName('');
      setNewUsername('');
      setNewEmail('');
      setNewPassword('password123');
      setNewRole('STUDENT');

      showToast(
        isVi
          ? `Đã tạo tài khoản @${created.username} thành công với quyền ${created.role}`
          : `User @${created.username} created successfully as ${created.role}`
      );
    } catch (err: any) {
      setCreateError(err.message || 'Tạo tài khoản thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            {isVi ? 'Quản trị viên' : 'Admin'}
          </span>
        );
      case 'LECTURER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <GraduationCap className="w-3.5 h-3.5" />
            {isVi ? 'Giảng viên' : 'Faculty'}
          </span>
        );
      case 'STUDENT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Users className="w-3.5 h-3.5" />
            {isVi ? 'Sinh viên' : 'Student'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-rose-600 text-white border-rose-700'
          }`}
        >
          {notification.type === 'success' ? (
            <Check className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            {isVi ? 'Quản lý Người dùng & Phân quyền' : 'User & Role Management'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {isVi
              ? 'Cấp quyền và quản lý tài khoản người dùng trong hệ thống thi vấn đáp AI (AIVES)'
              : 'Manage accounts and assign roles for the AI Viva Exam System'}
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>{isVi ? 'Thêm tài khoản' : 'Add New User'}</span>
        </button>
      </div>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isVi ? 'Tổng người dùng' : 'Total Users'}
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {stats.total}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isVi ? 'Tài khoản hoạt động' : 'Active accounts'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              {isVi ? 'Quản trị viên' : 'Admins'}
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {stats.admins}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isVi ? 'Toàn quyền cấu hình' : 'Full access'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {isVi ? 'Giảng viên' : 'Lecturers'}
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {stats.lecturers}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isVi ? 'Tạo đề & Giám sát' : 'Create exams & reviews'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              {isVi ? 'Sinh viên' : 'Students'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {stats.students}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isVi ? 'Thí sinh dự thi' : 'Viva candidates'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isVi
                ? 'Tìm kiếm theo tên, username (@) hoặc email...'
                : 'Search by name, username (@) or email...'
            }
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setSelectedRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedRoleFilter === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isVi ? 'Tất cả' : 'All'} ({stats.total})
          </button>
          <button
            onClick={() => setSelectedRoleFilter('ADMIN')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedRoleFilter === 'ADMIN'
                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Admin ({stats.admins})
          </button>
          <button
            onClick={() => setSelectedRoleFilter('LECTURER')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedRoleFilter === 'LECTURER'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isVi ? 'Giảng viên' : 'Lecturers'} ({stats.lecturers})
          </button>
          <button
            onClick={() => setSelectedRoleFilter('STUDENT')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedRoleFilter === 'STUDENT'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isVi ? 'Sinh viên' : 'Students'} ({stats.students})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">{isVi ? 'Người dùng' : 'User'}</th>
                <th className="py-3.5 px-4">{isVi ? 'Email FPT' : 'Email'}</th>
                <th className="py-3.5 px-4">{isVi ? 'Phân quyền (Role)' : 'Role Assignment'}</th>
                <th className="py-3.5 px-4 hidden md:table-cell">{isVi ? 'Ngày tạo' : 'Joined Date'}</th>
                <th className="py-3.5 px-4 text-right">{isVi ? 'Thao tác' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <p className="text-base font-medium">
                      {isVi ? 'Không tìm thấy người dùng nào' : 'No users match your criteria'}
                    </p>
                    <p className="text-xs mt-1">
                      {isVi ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc vai trò' : 'Try adjusting search or role filter'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = user.id === currentUserId;
                  const isDefaultAdmin = user.username === 'admin';

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* User Info */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                            {(user.fullName || (user as any).name || user.username || 'User').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {user.fullName || (user as any).name || user.username}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                                  {isVi ? 'Bạn' : 'You'}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                              @{user.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{user.email}</span>
                        </div>
                      </td>

                      {/* Direct Role Assignment Selector */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                            disabled={isDefaultAdmin}
                            className={`text-xs font-bold rounded-xl px-2.5 py-1.5 border transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                              user.role === 'ADMIN'
                                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                : user.role === 'LECTURER'
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                          >
                            <option value="ADMIN">🛡️ {isVi ? 'Quản trị viên (Admin)' : 'Admin'}</option>
                            <option value="LECTURER">🎓 {isVi ? 'Giảng viên (Lecturer)' : 'Lecturer'}</option>
                            <option value="STUDENT">👨‍🎓 {isVi ? 'Sinh viên (Student)' : 'Student'}</option>
                          </select>
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 hidden md:table-cell text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={isDefaultAdmin}
                          title={
                            isDefaultAdmin
                              ? isVi
                                ? 'Không thể xóa Admin mặc định'
                                : 'Protected account'
                              : isVi
                              ? 'Xóa tài khoản'
                              : 'Delete user'
                          }
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create User Manually by Admin */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              {isVi ? 'Thêm Tài Khoản Người Dùng Mới' : 'Add New User Account'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {isVi
                ? 'Chỉ định thông tin và phân quyền vai trò trực tiếp cho người dùng.'
                : 'Directly create an account and specify their role.'}
            </p>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Họ và tên' : 'Full Name'} *
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
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
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="nguyenvana"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Email FPT' : 'Email'} *
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="anv@fpt.edu.vn"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Mật khẩu khởi tạo' : 'Initial Password'} *
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Chỉ định phân quyền vai trò (Role)' : 'Assign Role'} *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('ADMIN')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      newRole === 'ADMIN'
                        ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 mb-1 text-purple-500" />
                    <span className="text-xs block">Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRole('LECTURER')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      newRole === 'LECTURER'
                        ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 mb-1 text-indigo-500" />
                    <span className="text-xs block">{isVi ? 'Giảng viên' : 'Faculty'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRole('STUDENT')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      newRole === 'STUDENT'
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Users className="w-4 h-4 mb-1 text-emerald-500" />
                    <span className="text-xs block">{isVi ? 'Sinh viên' : 'Student'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {isVi ? 'Hủy bỏ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting
                    ? isVi
                      ? 'Đang tạo...'
                      : 'Creating...'
                    : isVi
                    ? 'Tạo tài khoản'
                    : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
