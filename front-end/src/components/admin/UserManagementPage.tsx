import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  ShieldCheck,
  GraduationCap,
  Search,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Mail,
  Calendar,
  X,
  UserPlus,
  Pencil,
  FileSpreadsheet,
  Download,
  UploadCloud,
  FileText,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { UserAccount, UserRole } from '../../types';
import {
  getRegisteredUsers,
  updateUserRole,
  updateUserAccount,
  deleteUser,
  createUserByAdmin,
  importStudentsBatch,
  getCurrentSession,
} from '../../services/authService';
import { Language } from '../../utils/i18n';

interface UserManagementPageProps {
  language: Language;
  currentUserId?: string;
  onRefreshCurrentUser?: () => void;
}

interface ParsedStudentRow {
  username: string;
  fullName: string;
  password?: string;
}

export const UserManagementPage: React.FC<UserManagementPageProps> = ({
  language,
  currentUserId,
  onRefreshCurrentUser,
}) => {
  const isVi = language === 'vi';

  // Core user list & search
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modal create user state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newRole, setNewRole] = useState<UserRole>('STUDENT');
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal edit user state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('STUDENT');
  const [editError, setEditError] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Modal import XLSX state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedStudents, setParsedStudents] = useState<ParsedStudentRow[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal Confirm Delete state (custom modal alert)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get active user session to enforce self-protection
  const activeUser = useMemo(() => getCurrentSession(), []);

  // Helper to check if a target user is the currently logged-in user
  const isSelfUser = (u: UserAccount) => {
    if (currentUserId && u.id === currentUserId) return true;
    if (activeUser && (u.id === activeUser.id || u.username.toLowerCase() === activeUser.username.toLowerCase())) {
      return true;
    }
    return false;
  };

  // Load all users directly from backend API (Only if ADMIN)
  const loadUsers = async () => {
    if (activeUser && activeUser.role !== 'ADMIN') {
      return;
    }
    setIsLoading(true);
    try {
      const list = await getRegisteredUsers();
      setUsers(list);
    } catch (err: any) {
      showToast(err.message || (isVi ? 'Lỗi tải danh sách người dùng' : 'Failed to load users'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeUser?.role === 'ADMIN') {
      loadUsers();
    }
  }, [activeUser]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
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

  // Handle immediate role update via table select
  const handleRoleChange = async (userId: string, newRoleValue: UserRole) => {
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser && isSelfUser(targetUser)) {
      showToast(
        isVi
          ? 'Quy tắc nghiệp vụ: Bạn không thể tự thay đổi hoặc hạ vai trò của chính mình!'
          : 'Security policy: You cannot alter your own role!',
        'error'
      );
      return;
    }

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
      showToast(err.message || (isVi ? 'Lỗi cập nhật phân quyền' : 'Role update failed'), 'error');
    }
  };

  // Open edit modal (Prevent self-editing)
  const handleOpenEdit = (user: UserAccount) => {
    if (isSelfUser(user)) {
      showToast(
        isVi
          ? 'Quy tắc nghiệp vụ: Admin không được tự chỉnh sửa tài khoản của chính mình trong danh sách quản trị!'
          : 'Security rule: Administrators cannot edit their own account here!',
        'error'
      );
      return;
    }

    setEditingUser(user);
    setEditFullName(user.fullName || user.username);
    setEditRole(user.role);
    setEditError('');
    setIsEditModalOpen(true);
  };

  // Handle submit edit user
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError('');

    if (!editFullName.trim()) {
      setEditError(isVi ? 'Họ và tên không được để trống' : 'Full name is required');
      return;
    }

    setIsEditSubmitting(true);
    try {
      const updated = await updateUserAccount(editingUser.id, {
        fullName: editFullName.trim(),
        role: editRole,
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, fullName: updated.fullName, role: updated.role } : u))
      );
      setIsEditModalOpen(false);
      showToast(
        isVi
          ? `Đã cập nhật tài khoản @${editingUser.username} thành công`
          : `Account @${editingUser.username} updated successfully`
      );
      if (onRefreshCurrentUser) onRefreshCurrentUser();
    } catch (err: any) {
      setEditError(err.message || (isVi ? 'Cập nhật tài khoản thất bại' : 'Update failed'));
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Trigger Custom Modal Confirmation for Deletion
  const handleRequestDelete = (user: UserAccount) => {
    if (user.username === 'admin') {
      showToast(
        isVi ? 'Không thể xóa tài khoản Quản trị viên hệ thống mặc định!' : 'Cannot delete default system Admin!',
        'error'
      );
      return;
    }

    if (isSelfUser(user)) {
      showToast(
        isVi ? 'Quy tắc nghiệp vụ: Bạn không thể tự xóa tài khoản của chính mình!' : 'You cannot delete your own account!',
        'error'
      );
      return;
    }

    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete user via custom modal
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      showToast(
        isVi ? `Đã xóa vĩnh viễn tài khoản @${userToDelete.username}` : `Deleted user @${userToDelete.username}`
      );
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      showToast(err.message || (isVi ? 'Lỗi xóa người dùng' : 'Delete failed'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle create user by admin
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!newFullName.trim() || !newUsername.trim() || !newPassword) {
      setCreateError(isVi ? 'Vui lòng điền đầy đủ các mục bắt buộc' : 'Please fill all required fields');
      return;
    }

    if (newPassword.length < 8) {
      setCreateError(
        isVi
          ? 'Mật khẩu phải có tối thiểu 8 ký tự theo quy định'
          : 'Password must contain at least 8 characters'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createUserByAdmin({
        fullName: newFullName.trim(),
        username: newUsername.trim(),
        email: newEmail.trim() || `${newUsername.trim()}@fpt.edu.vn`,
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
      setCreateError(err.message || (isVi ? 'Tạo tài khoản thất bại' : 'Create failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Mã sinh viên / Username': 'SE170001',
        'Họ và tên': 'Nguyễn Văn Minh',
        'Mật khẩu': 'password123',
      },
      {
        'Mã sinh viên / Username': 'SE170002',
        'Họ và tên': 'Trần Phương Thảo',
        'Mật khẩu': 'password123',
      },
      {
        'Mã sinh viên / Username': 'SE170003',
        'Họ và tên': 'Lê Hoàng Long',
        'Mật khẩu': 'password123',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'Mau_Danh_Sach_Sinh_Vien_AIVES.xlsx');
  };

  // Handle file upload & parse XLSX
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!json || json.length === 0) {
          setImportError(isVi ? 'Tệp Excel trống hoặc không đúng định dạng.' : 'Excel sheet is empty.');
          setParsedStudents([]);
          return;
        }

        const parsed: ParsedStudentRow[] = [];
        for (const row of json) {
          // Normalize column headers
          const username =
            row['Mã sinh viên / Username'] ||
            row['Username'] ||
            row['username'] ||
            row['Mã sinh viên'] ||
            row['MSSV'] ||
            row['Tài khoản'];
          const fullName =
            row['Họ và tên'] ||
            row['FullName'] ||
            row['fullName'] ||
            row['Họ tên'] ||
            row['Name'];
          const password =
            row['Mật khẩu'] ||
            row['Password'] ||
            row['password'] ||
            'password123';

          if (username && fullName) {
            parsed.push({
              username: String(username).trim().toLowerCase(),
              fullName: String(fullName).trim(),
              password: String(password).trim(),
            });
          }
        }

        if (parsed.length === 0) {
          setImportError(
            isVi
              ? 'Không tìm thấy dòng sinh viên hợp lệ. Cột cần có: Username (hoặc Mã sinh viên), Họ và tên.'
              : 'No valid students found. Expected columns: Username, Full Name.'
          );
          setParsedStudents([]);
        } else {
          setParsedStudents(parsed);
        }
      } catch (err) {
        console.error('Failed to parse Excel:', err);
        setImportError(isVi ? 'Không thể đọc tệp Excel. Vui lòng kiểm tra lại file.' : 'Could not parse Excel file.');
        setParsedStudents([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Submit Batch Import
  const handleExecuteImport = async () => {
    if (parsedStudents.length === 0) return;

    setIsImporting(true);
    setImportError('');

    try {
      const res = await importStudentsBatch(parsedStudents);
      if (res.success > 0) {
        showToast(
          isVi
            ? `Đã thêm thành công ${res.success} sinh viên vào hệ thống!`
            : `Successfully imported ${res.success} students!`
        );
        setIsImportModalOpen(false);
        setParsedStudents([]);
        setImportFileName('');
        await loadUsers();
      }

      if (res.failed > 0) {
        setImportError(
          isVi
            ? `Có ${res.failed} sinh viên không thể thêm (trùng lặp hoặc dữ liệu không hợp lệ): ${res.errors.slice(0, 3).join(', ')}${res.errors.length > 3 ? '...' : ''}`
            : `${res.failed} records failed: ${res.errors.slice(0, 3).join(', ')}`
        );
      }
    } catch (err: any) {
      setImportError(err.message || (isVi ? 'Nhập danh sách thất bại' : 'Import failed'));
    } finally {
      setIsImporting(false);
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
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
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

        {/* Action Buttons: Add with XLSX & Add Single User */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setParsedStudents([]);
              setImportFileName('');
              setImportError('');
              setIsImportModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-sm font-semibold shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{isVi ? 'Thêm bằng XLSX' : 'Add with XLSX'}</span>
          </button>

          <button
            onClick={() => {
              setCreateError('');
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isVi ? 'Thêm tài khoản' : 'Add New User'}</span>
          </button>

          <button
            onClick={loadUsers}
            title={isVi ? 'Tải lại danh sách' : 'Refresh list'}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
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
            {isVi ? 'Tài khoản trong CSDL' : 'Active accounts in DB'}
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
            {isVi ? 'Toàn quyền cấu hình' : 'Full system access'}
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
            {isVi ? 'Tạo đề & Giám sát' : 'Exam supervisors'}
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
            {isVi ? 'Thí sinh tham gia thi' : 'Viva candidates'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
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
            {isVi ? 'Quản trị' : 'Admins'} ({stats.admins})
          </button>
          <button
            onClick={() => setSelectedRoleFilter('LECTURER')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedRoleFilter === 'LECTURER'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isVi ? 'Giảng viên' : 'Faculty'} ({stats.lecturers})
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">{isVi ? 'Người dùng' : 'User'}</th>
                <th className="py-3 px-4">{isVi ? 'Email' : 'Email'}</th>
                <th className="py-3 px-4">{isVi ? 'Vai trò & Quyền' : 'Role'}</th>
                <th className="py-3 px-4 hidden md:table-cell">{isVi ? 'Ngày tạo' : 'Created At'}</th>
                <th className="py-3 px-4 text-right">{isVi ? 'Thao tác' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                      <span>{isVi ? 'Đang tải danh sách người dùng từ hệ thống...' : 'Loading users from server...'}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-slate-600 dark:text-slate-300">
                      {isVi ? 'Không tìm thấy người dùng nào' : 'No users found'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {isVi
                        ? 'Thử thay đổi từ khóa tìm kiếm hoặc bấm Thêm tài khoản / Thêm bằng XLSX.'
                        : 'Try searching with a different term or add a user.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = isSelfUser(user);
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
                                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                                  {isVi ? 'Bạn (Đang đăng nhập)' : 'You (Current)'}
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
                            disabled={isDefaultAdmin || isCurrent}
                            title={
                              isCurrent
                                ? isVi
                                  ? 'Tài khoản của bạn (Không thể tự đổi vai trò)'
                                  : 'Your account (Cannot change own role)'
                                : undefined
                            }
                            className={`text-xs font-bold rounded-xl px-2.5 py-1.5 border transition-all ${
                              user.role === 'ADMIN'
                                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                : user.role === 'LECTURER'
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            } ${
                              isDefaultAdmin || isCurrent
                                ? 'opacity-60 cursor-not-allowed'
                                : 'cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500'
                            }`}
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

                      {/* Actions: Edit & Delete */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(user)}
                            disabled={isCurrent}
                            title={
                              isCurrent
                                ? isVi
                                  ? 'Bạn không thể tự chỉnh sửa tài khoản của chính mình'
                                  : 'Cannot edit your own account'
                                : isVi
                                ? 'Chỉnh sửa tài khoản'
                                : 'Edit account'
                            }
                            className={`p-2 rounded-xl transition-colors ${
                              isCurrent
                                ? 'opacity-30 cursor-not-allowed text-slate-400'
                                : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer'
                            }`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleRequestDelete(user)}
                            disabled={isDefaultAdmin || isCurrent}
                            title={
                              isDefaultAdmin
                                ? isVi
                                  ? 'Không thể xóa Admin mặc định'
                                  : 'Protected default admin'
                                : isCurrent
                                ? isVi
                                  ? 'Bạn không thể tự xóa tài khoản của chính mình'
                                  : 'Cannot delete your own account'
                                : isVi
                                ? 'Xóa tài khoản'
                                : 'Delete user'
                            }
                            className={`p-2 rounded-xl transition-colors ${
                              isDefaultAdmin || isCurrent
                                ? 'opacity-30 cursor-not-allowed text-slate-400'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: CREATE USER MANUALLY BY ADMIN */}
      {/* ============================================================ */}
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
                  required
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
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="nguyenvana"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Email FPT' : 'Email'}
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
                  {isVi ? 'Mật khẩu khởi tạo (tối thiểu 8 ký tự)' : 'Initial Password (min 8 chars)'} *
                </label>
                <input
                  type="text"
                  required
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

      {/* ============================================================ */}
      {/* MODAL: EDIT USER */}
      {/* ============================================================ */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Pencil className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isVi ? 'Chỉnh Sửa Thông Tin Người Dùng' : 'Edit User Information'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {isVi
                ? `Cập nhật thông tin cho tài khoản @${editingUser.username}`
                : `Update profile details for @${editingUser.username}`}
            </p>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Tên đăng nhập (Username)' : 'Username'}
                </label>
                <input
                  type="text"
                  disabled
                  value={editingUser.username}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-slate-500 cursor-not-allowed font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {isVi ? 'Tên đăng nhập được dùng làm mã định danh và không thể thay đổi.' : 'Username is a unique ID and cannot be changed.'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Họ và tên' : 'Full Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Vai trò (Role)' : 'Role'}
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  disabled={editingUser.username === 'admin'}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                >
                  <option value="ADMIN">🛡️ {isVi ? 'Quản trị viên (Admin)' : 'Admin'}</option>
                  <option value="LECTURER">🎓 {isVi ? 'Giảng viên (Lecturer)' : 'Lecturer'}</option>
                  <option value="STUDENT">👨‍🎓 {isVi ? 'Sinh viên (Student)' : 'Student'}</option>
                </select>
                {editingUser.username === 'admin' && (
                  <span className="text-[10px] text-amber-500 mt-1 block">
                    {isVi ? 'Tài khoản admin mặc định không thể hạ quyền.' : 'Default admin cannot change role.'}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isEditSubmitting ? (isVi ? 'Đang lưu...' : 'Saving...') : isVi ? 'Lưu thay đổi' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADD WITH XLSX (IMPORT STUDENTS BATCH) */}
      {/* ============================================================ */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isVi ? 'Nhập Danh Sách Sinh Viên từ Excel (XLSX)' : 'Import Students via XLSX'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {isVi
                ? 'Tải lên bảng tính Excel chứa danh sách tài khoản sinh viên cần tạo tự động.'
                : 'Upload an Excel file to automatically batch-provision student accounts.'}
            </p>

            {importError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{importError}</span>
              </div>
            )}

            {/* Template Download Prompt */}
            <div className="p-3 mb-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-indigo-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {isVi ? 'Chưa có file mẫu Excel?' : 'Need an Excel template?'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isVi
                      ? 'Tải file mẫu định dạng chuẩn các cột: Username, Họ và tên, Mật khẩu.'
                      : 'Download a pre-formatted template with required columns.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span>{isVi ? 'Tải file mẫu' : 'Template'}</span>
              </button>
            </div>

            {/* Upload Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <UploadCloud className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {importFileName ? importFileName : isVi ? 'Bấm vào đây để chọn tệp .XLSX / .CSV' : 'Click to select .XLSX / .CSV file'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {isVi ? 'Hỗ trợ các file định dạng Excel 2007 trở lên (.xlsx, .xls) hoặc .csv' : 'Supports Excel spreadsheets (.xlsx, .xls) or .csv'}
              </p>
            </div>

            {/* Parsed Preview Table */}
            {parsedStudents.length > 0 && (
              <div className="mt-4 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {isVi
                      ? `Đã phát hiện ${parsedStudents.length} tài khoản sinh viên:`
                      : `Found ${parsedStudents.length} student records:`}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isVi ? 'Role mặc định: STUDENT' : 'Default role: STUDENT'}
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-y-auto max-h-48 text-xs">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Username (MSSV)</th>
                        <th className="py-2 px-3">{isVi ? 'Họ và tên' : 'Full Name'}</th>
                        <th className="py-2 px-3">{isVi ? 'Mật khẩu' : 'Password'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedStudents.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-1.5 px-3 text-slate-400">{idx + 1}</td>
                          <td className="py-1.5 px-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                            @{s.username}
                          </td>
                          <td className="py-1.5 px-3 text-slate-700 dark:text-slate-300">{s.fullName}</td>
                          <td className="py-1.5 px-3 font-mono text-slate-500">
                            {s.password ? '••••••••' : 'password123'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 mt-auto border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {isVi ? 'Đóng' : 'Close'}
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting || parsedStudents.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isVi ? 'Đang xử lý...' : 'Importing...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {isVi
                        ? `Nhập ${parsedStudents.length} sinh viên`
                        : `Import ${parsedStudents.length} Students`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ALERT CONFIRM DELETE USER */}
      {/* ============================================================ */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden text-left">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-amber-500" />

            {/* Close Button */}
            <button
              onClick={() => {
                if (!isDeleting) {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                }
              }}
              disabled={isDeleting}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Warning Icon & Header */}
            <div className="flex items-start gap-3.5 mb-4">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="pt-0.5">
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  {isVi ? 'Cảnh báo' : 'Security Warning'}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                  {isVi ? 'Xác nhận xóa tài khoản' : 'Confirm User Deletion'}
                </h3>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              {isVi
                ? 'Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản sau khỏi hệ thống? Hành động này không thể hoàn tác và toàn bộ dữ liệu phân quyền liên quan sẽ bị thu hồi.'
                : 'Are you sure you want to permanently delete the following account? This action cannot be undone.'}
            </p>

            {/* Target User Card Preview */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                  {(userToDelete.fullName || userToDelete.username).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {userToDelete.fullName || userToDelete.username}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                    @{userToDelete.username} • {userToDelete.email}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                    userToDelete.role === 'ADMIN'
                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                      : userToDelete.role === 'LECTURER'
                      ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  {userToDelete.role}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isVi ? 'Hủy bỏ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isVi ? 'Đang xóa...' : 'Deleting...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{isVi ? 'Xác nhận xóa vĩnh viễn' : 'Delete Account'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
