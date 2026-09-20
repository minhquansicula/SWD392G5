// ============================================================
// AIVES — Authentication & User Management Service
// Real API Integration with Spring Boot Backend
// ============================================================
import { UserAccount, UserRole } from '../types';
import apiClient from './apiClient';

const STORAGE_SESSION_KEY = 'aives_auth_session';
const TOKEN_KEY = 'accessToken';

// DTO interface mapping from backend
export interface BackendUserDto {
  id: string;
  username: string;
  fullName: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
  email?: string;
}

export interface AuthResponseData {
  token: string;
  tokenType: string;
  user: BackendUserDto;
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
    email: u.email || `${u.username}@fpt.edu.vn`,
    createdAt: u.createdAt || new Date().toISOString(),
  };
}

/**
 * User Login API
 * Calls POST /api/auth/login
 */
export async function loginUser(usernameOrEmail: string, password: string): Promise<UserAccount> {
  const username = usernameOrEmail.trim();

  try {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: AuthResponseData;
    }>('/auth/login', {
      username,
      password,
    });

    const data = response.data?.data;
    if (!data || !data.token || !data.user) {
      throw new Error(response.data?.message || 'Đăng nhập không thành công.');
    }

    // Save JWT token
    localStorage.setItem(TOKEN_KEY, data.token);

    // Save session
    const safeUser = mapBackendUserToAccount(data.user);
    saveSession(safeUser);

    return safeUser;
  } catch (err: any) {
    const message =
      err.response?.data?.message ||
      err.message ||
      'Tên đăng nhập hoặc mật khẩu không chính xác.';
    throw new Error(message);
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
    console.error('Error fetching users from backend:', err);
    throw new Error(
      err.response?.data?.message || 'Không thể tải danh sách tài khoản từ máy chủ.'
    );
  }
}

/**
 * Admin: Create user directly with designated role
 * Calls POST /api/admin/users
 */
export async function createUserByAdmin(data: {
  fullName: string;
  username: string;
  email?: string;
  password: string;
  role: UserRole;
}): Promise<UserAccount> {
  try {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: BackendUserDto;
    }>('/admin/users', {
      fullName: data.fullName.trim(),
      username: data.username.trim(),
      password: data.password,
      role: data.role,
    });

    const created = response.data?.data;
    return mapBackendUserToAccount(created);
  } catch (err: any) {
    console.error('Error creating user via backend:', err);
    const message =
      err.response?.data?.message ||
      err.message ||
      'Không thể tạo tài khoản người dùng.';
    throw new Error(message);
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
    console.error('Error updating user role:', err);
    throw new Error(
      err.response?.data?.message || 'Không thể cập nhật quyền người dùng.'
    );
  }
}

/**
 * Admin: Update user information (fullName, role)
 * Calls PUT /api/admin/users/{id}
 */
export async function updateUserAccount(
  userId: string,
  data: { fullName?: string; role?: UserRole }
): Promise<UserAccount> {
  try {
    const payload: { fullName?: string; role?: string } = {};
    if (data.fullName !== undefined) payload.fullName = data.fullName.trim();
    if (data.role !== undefined) payload.role = data.role;

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
      });
    }

    return updated;
  } catch (err: any) {
    console.error('Error updating user:', err);
    throw new Error(
      err.response?.data?.message || 'Không thể cập nhật thông tin người dùng.'
    );
  }
}

/**
 * Admin: Batch import students from parsed XLSX data
 */
export async function importStudentsBatch(
  students: { username: string; fullName: string; password?: string }[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const s of students) {
    try {
      await createUserByAdmin({
        username: s.username.trim(),
        fullName: s.fullName.trim(),
        password: s.password && s.password.length >= 8 ? s.password : 'password123',
        role: 'STUDENT',
      });
      success++;
    } catch (err: any) {
      failed++;
      errors.push(`@${s.username}: ${err.message || 'Lỗi tạo tài khoản'}`);
    }
  }

  return { success, failed, errors };
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
    console.error('Error deleting user:', err);
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
      if (userObj && typeof userObj === 'object') {
        return {
          id: userObj.id || 'usr-admin',
          username: userObj.username || 'admin',
          email: userObj.email || `${userObj.username || 'user'}@fpt.edu.vn`,
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
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(STORAGE_SESSION_KEY);
  } catch {
    // ignore
  }
}
