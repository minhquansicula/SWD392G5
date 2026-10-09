// ============================================================
// AIVES — Authentication & User Management Service
// Real API Integration with Spring Boot Backend
// ============================================================
import { PasswordStatus, UserAccount, UserRole } from '../types';
import apiClient, { clearApiCache } from './apiClient';

const STORAGE_SESSION_KEY = 'aives_auth_session';
const TOKEN_KEY = 'accessToken';
let sessionGeneration = 0;

// DTO interface mapping from backend
export interface BackendUserDto {
  id: string;
  username: string;
  fullName: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
  email?: string | null;
  passwordStatus?: PasswordStatus | null;
}

export type ImportSkipReason =
  | 'MISSING_REQUIRED'
  | 'INVALID_EMAIL'
  | 'INVALID_DATA'
  | 'DUPLICATE_IN_FILE'
  | 'USERNAME_EXISTS'
  | 'EMAIL_EXISTS'
  | 'STUDENT_CODE_EXISTS';

// One entry per submitted row, in file order
export interface ImportRowResult {
  row: number;
  username: string;
  email: string;
  status: 'CREATED' | 'SKIPPED';
  reason: ImportSkipReason | null;
  passwordStatus?: PasswordStatus;
}

export interface PasswordLinkInfo {
  email: string;
  fullName: string;
  activation: boolean;
}

export interface AuthResponseData {
  token: string;
  tokenType: string;
  user: BackendUserDto;
}

// Vietnamese text for the error codes of the admin user API (field "error" of the response)
const ADMIN_USER_ERRORS: Record<string, string> = {
  VALIDATION_FAILED: 'Dữ liệu không hợp lệ. Kiểm tra các trường bắt buộc, độ dài và định dạng email.',
  USER_ALREADY_EXISTS: 'Username đã tồn tại.',
  STUDENT_CODE_EXISTS: 'Mã sinh viên đã tồn tại.',
  DATA_INTEGRITY_CONFLICT: 'Email đã được dùng bởi tài khoản khác (hoặc dữ liệu bị trùng với tài khoản đã có).',
  USER_NOT_FOUND: 'Không tìm thấy tài khoản.',
  USER_HAS_NO_EMAIL: 'Tài khoản chưa có email để gửi link.',
  MAIL_NOT_SENT: 'Không gửi được email. Kiểm tra cấu hình gửi mail của máy chủ rồi thử lại.',
};

// Known error code first, then the server message; null when the server sent neither
function adminUserErrorMessage(err: any): string | null {
  const code = err.response?.data?.error;
  return (code && ADMIN_USER_ERRORS[code]) || err.response?.data?.message || null;
}

/**
 * Format Backend User DTO to UserAccount format used across front-end
 */
export function mapBackendUserToAccount(u: BackendUserDto): UserAccount {
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: (u.role || 'STUDENT').toUpperCase() as UserRole,
    email: u.email ?? '',
    ...(u.passwordStatus ? { passwordStatus: u.passwordStatus } : {}),
    createdAt: u.createdAt || new Date().toISOString(),
  };
}

/**
 * User Login API
 * Calls POST /api/auth/login
 */
export async function loginUser(email: string, password: string): Promise<UserAccount> {
  try {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: AuthResponseData;
    }>('/auth/login', {
      username: email,
      password,
    });

    const data = response.data?.data;
    if (!data || !data.token || !data.user) {
      throw new Error(response.data?.message || 'Đăng nhập không thành công.');
    }

    const safeUser = mapBackendUserToAccount(data.user);
    clearSession();
    localStorage.setItem(TOKEN_KEY, data.token);
    saveSession(safeUser);

    return safeUser;
  } catch (err: any) {
    const message =
      err.response?.data?.message ||
      err.message ||
      'Đăng nhập không thành công.';
    throw new Error(message);
  }
}

/** Resolve identity/role from the backend, never from the cached profile alone. */
export async function verifyCurrentSession(): Promise<UserAccount | null> {
  const token = localStorage.getItem(TOKEN_KEY);
  const generation = sessionGeneration;
  if (!token) {
    clearSession();
    return null;
  }
  try {
    const response = await apiClient.get<{ data: BackendUserDto }>('/auth/me', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    // A late response must not restore a logged-out or replaced session.
    if (generation !== sessionGeneration || localStorage.getItem(TOKEN_KEY) !== token) return null;
    const dto = response.data?.data;
    if (!dto?.id || !dto.username || !['ADMIN', 'LECTURER', 'STUDENT'].includes(dto.role)) {
      throw new Error('Thông tin phiên từ máy chủ không hợp lệ.');
    }
    const user = mapBackendUserToAccount(dto);
    saveSession(user);
    return user;
  } catch (err: any) {
    if (generation !== sessionGeneration || localStorage.getItem(TOKEN_KEY) !== token) return null;
    if (err.response?.status === 401) {
      clearSession();
      return null;
    }
    throw new Error(err.response?.data?.message || 'Không thể xác nhận phiên với máy chủ. Vui lòng thử lại.');
  }
}

/**
 * Admin: Get registered users list
 * Calls GET /api/admin/users
 */
export async function getRegisteredUsers(role?: string): Promise<UserAccount[]> {
  try {
    const response = await apiClient.get<{
      success: boolean;
      message: string;
      data: {
        content?: BackendUserDto[];
      } | BackendUserDto[];
    }>('/admin/users', {
      params: {
        role: role && role !== 'ALL' ? role : undefined,
        size: 100,
      },
    });

    const data = response.data?.data;
    let list: BackendUserDto[] = [];

    if (Array.isArray(data)) {
      list = data;
    } else if (data && Array.isArray((data as any).content)) {
      list = (data as any).content;
    }

    return list.map(mapBackendUserToAccount);
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message || 'Không thể tải danh sách tài khoản từ máy chủ.'
    );
  }
}

/**
 * Admin: Create user directly with designated role.
 * No password is sent: the backend mails the owner a one-time link to set it.
 * Calls POST /api/admin/users
 */
export async function createUserByAdmin(data: {
  fullName: string;
  username: string;
  role: UserRole;
  email: string;
}): Promise<UserAccount> {
  try {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: BackendUserDto;
    }>('/admin/users', {
      fullName: data.fullName.trim(),
      username: data.username.trim(),
      role: data.role,
      email: data.email,
    });

    const created = response.data?.data;
    return mapBackendUserToAccount(created);
  } catch (err: any) {
    throw new Error(adminUserErrorMessage(err) || err.message || 'Không thể tạo tài khoản người dùng.');
  }
}

/**
 * Admin: Mail a new password link (the previous link stops working).
 * Calls POST /api/admin/users/{id}/password-link
 */
export async function resendPasswordLink(userId: string): Promise<UserAccount> {
  try {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: BackendUserDto;
    }>(`/admin/users/${userId}/password-link`);
    return mapBackendUserToAccount(response.data.data);
  } catch (err: any) {
    throw new Error(adminUserErrorMessage(err) || 'Không thể gửi lại link đặt mật khẩu.');
  }
}

/**
 * Public: Check a one-time password link before showing the form
 * Calls POST /api/auth/password/link
 */
export async function checkPasswordLink(token: string): Promise<PasswordLinkInfo> {
  try {
    const response = await apiClient.post<{ data: PasswordLinkInfo }>('/auth/password/link', { token });
    return response.data.data;
  } catch (err: any) {
    // 400 = link used, replaced or expired; anything else is infrastructure.
    const invalid = err.response?.status === 400;
    const error: Error & { invalidLink?: boolean } = new Error(
      invalid
        ? 'Link không hợp lệ hoặc đã hết hạn.'
        : 'Không thể kiểm tra link với máy chủ. Vui lòng thử lại.'
    );
    error.invalidLink = invalid;
    throw error;
  }
}

/**
 * Public: Set the password with a one-time link
 * Calls POST /api/auth/password/set
 */
export async function setPasswordWithLink(token: string, newPassword: string): Promise<void> {
  try {
    await apiClient.post('/auth/password/set', { token, newPassword });
  } catch (err: any) {
    const invalid = err.response?.data?.error === 'INVALID_PASSWORD_LINK';
    const error: Error & { invalidLink?: boolean } = new Error(
      invalid
        ? 'Link không hợp lệ hoặc đã hết hạn.'
        : err.response?.status === 400
          ? 'Mật khẩu phải có ít nhất 8 ký tự và không quá 72 byte.'
          : 'Không thể đặt mật khẩu. Vui lòng thử lại.'
    );
    error.invalidLink = invalid;
    throw error;
  }
}

/**
 * Public: Ask for a reset link. The backend answers the same whether or not the email exists.
 * Calls POST /api/auth/password/forgot
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await apiClient.post('/auth/password/forgot', { email });
  } catch (err: any) {
    throw new Error(
      err.response?.status === 400
        ? 'Vui lòng nhập email.'
        : 'Không thể gửi yêu cầu. Vui lòng thử lại.'
    );
  }
}

export async function updateUserRole(userId: string, newRole: UserRole): Promise<{ id: string; role: UserRole }> {
  try {
    await apiClient.put(`/admin/users/${userId}`, {
      role: newRole,
    });

    // If user changed their own role, update current active session too
    const activeSession = getCurrentSession();
    if (activeSession && activeSession.id === userId) {
      saveSession({ ...activeSession, role: newRole });
    }

    return { id: userId, role: newRole };
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message || 'Không thể cập nhật quyền người dùng.'
    );
  }
}

/**
 * Admin: Update user information (fullName, role, supplied email)
 * Calls PUT /api/admin/users/{id}
 */
export async function updateUserAccount(
  userId: string,
  data: { fullName?: string; role?: UserRole; email?: string | null }
): Promise<UserAccount> {
  try {
    const payload: { fullName?: string; role?: string; email?: string | null } = {};
    if (data.fullName !== undefined) payload.fullName = data.fullName.trim();
    if (data.role !== undefined) payload.role = data.role;
    if (data.email !== undefined) payload.email = data.email;

    const response = await apiClient.put<{
      success: boolean;
      message: string;
      data: BackendUserDto;
    }>(`/admin/users/${userId}`, payload);

    const updated = mapBackendUserToAccount(response.data.data);

    const activeSession = getCurrentSession();
    if (activeSession && activeSession.id === userId) {
      saveSession({
        ...activeSession,
        fullName: updated.fullName,
        role: updated.role,
        email: updated.email,
      });
    }

    return updated;
  } catch (err: any) {
    throw new Error(adminUserErrorMessage(err) || 'Không thể cập nhật thông tin người dùng.');
  }
}

/**
 * Admin: Batch import students from parsed XLSX data via backend POST /api/admin/users/batch.
 * The backend answers one result per row; created students are mailed a password link.
 */
export async function importStudentsBatch(
  students: { username: string; fullName: string; email: string }[]
): Promise<{ success: number; failed: number; rows: ImportRowResult[]; created: UserAccount[] }> {
  try {
    const payload = students.map((s) => ({
      username: s.username.trim(),
      fullName: s.fullName.trim(),
      role: 'STUDENT',
      email: s.email,
    }));

    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: {
        total: number;
        created: number;
        skipped: number;
        rows: {
          row: number;
          username: string | null;
          email: string | null;
          status: 'CREATED' | 'SKIPPED';
          reason: ImportSkipReason | null;
          user: BackendUserDto | null;
        }[];
      };
    }>('/admin/users/batch', payload);

    const resultRows = response.data?.data?.rows || [];
    const created = resultRows
      .filter((r) => r.status === 'CREATED' && r.user)
      .map((r) => mapBackendUserToAccount(r.user as BackendUserDto));

    return {
      success: created.length,
      failed: students.length - created.length,
      rows: resultRows.map((r) => ({
        row: r.row,
        username: r.username ?? '',
        email: r.email ?? '',
        status: r.status,
        reason: r.reason ?? null,
        ...(r.user?.passwordStatus ? { passwordStatus: r.user.passwordStatus } : {}),
      })),
      created,
    };
  } catch (err: any) {
    const message = err.response?.data?.message || 'Lỗi khi nhập danh sách sinh viên.';
    throw new Error(`${message} Một số dòng có thể đã được tạo; hãy kiểm tra danh sách trước khi thử lại.`);
  }
}

/**
 * Admin: Delete user
 * Calls DELETE /api/admin/users/{id}
 */
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/admin/users/${userId}`);
    return true;
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message || 'Không thể xóa tài khoản người dùng.'
    );
  }
}

// Session persistence
export function saveSession(user: UserAccount, rememberMe: boolean = true): void {
  try {
    const payload = JSON.stringify(user);
    if (rememberMe) {
      localStorage.setItem(STORAGE_SESSION_KEY, payload);
    } else {
      sessionStorage.setItem(STORAGE_SESSION_KEY, payload);
    }
  } catch (e) {
    console.warn('Failed to save session:', e);
  }
}

export function getCurrentSession(): UserAccount | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY) || sessionStorage.getItem(STORAGE_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const userObj = parsed?.user || parsed;
      if (userObj && typeof userObj.id === 'string' && userObj.id
          && typeof userObj.username === 'string' && userObj.username
          && ['ADMIN', 'LECTURER', 'STUDENT'].includes(userObj.role)) {
        return {
          id: userObj.id || 'usr-admin',
          username: userObj.username || 'admin',
          email: typeof userObj.email === 'string' ? userObj.email : '',
          fullName: userObj.fullName || userObj.name || userObj.username || 'Người dùng',
          role: (userObj.role || 'STUDENT').toUpperCase() as UserRole,
          createdAt: userObj.createdAt || new Date().toISOString(),
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearSession(): void {
  sessionGeneration++;
  clearApiCache();
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(STORAGE_SESSION_KEY);
  } catch {
    // ignore
  }
}
