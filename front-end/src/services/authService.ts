// ============================================================
// AIVES — Authentication & User Management Service
// ============================================================
import { UserAccount, UserRole } from '../types';

const STORAGE_USERS_KEY = 'aives_registered_users';
const STORAGE_SESSION_KEY = 'aives_auth_session';

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-admin-001',
    username: 'admin',
    email: 'admin@fpt.edu.vn',
    fullName: 'Quản trị viên Hệ thống',
    role: 'ADMIN',
    password: 'password123',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'usr-lecturer-001',
    username: 'dr.nguyen',
    email: 'dr.nguyen@fpt.edu.vn',
    fullName: 'TS. Nguyễn Văn An',
    role: 'LECTURER',
    password: 'password123',
    createdAt: '2026-01-10T09:30:00.000Z',
  },
  {
    id: 'usr-student-001',
    username: 'tranthib',
    email: 'tranthib@fpt.edu.vn',
    fullName: 'Trần Thị Bình',
    role: 'STUDENT',
    password: 'password123',
    createdAt: '2026-02-15T14:20:00.000Z',
  },
  {
    id: 'usr-student-002',
    username: 'levanc',
    email: 'levanc@fpt.edu.vn',
    fullName: 'Lê Văn Cường',
    role: 'STUDENT',
    password: 'password123',
    createdAt: '2026-02-16T10:15:00.000Z',
  },
  {
    id: 'usr-student-003',
    username: 'phamthid',
    email: 'phamthid@fpt.edu.vn',
    fullName: 'Phạm Thị Dung',
    role: 'STUDENT',
    password: 'password123',
    createdAt: '2026-02-18T11:45:00.000Z',
  },
  {
    id: 'usr-student-004',
    username: 'hovane',
    email: 'hovane@fpt.edu.vn',
    fullName: 'Hồ Văn Em',
    role: 'STUDENT',
    password: 'password123',
    createdAt: '2026-02-20T16:00:00.000Z',
  },
];

export interface DemoAccountInfo {
  role: UserRole;
  title: string;
  name: string;
  username: string;
  password: string;
  badgeColor: string;
  description: string;
}

export const DEMO_ACCOUNTS: DemoAccountInfo[] = [
  {
    role: 'ADMIN',
    title: 'Quản trị viên (Admin)',
    name: 'Quản trị viên Hệ thống',
    username: 'admin',
    password: 'password123',
    badgeColor: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800',
    description: 'Toàn quyền cấu hình kỳ thi, phân quyền người dùng, thiết lập giám khảo AI',
  },
  {
    role: 'LECTURER',
    title: 'Giảng viên (Faculty)',
    name: 'TS. Nguyễn Văn An',
    username: 'dr.nguyen',
    password: 'password123',
    badgeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800',
    description: 'Tạo đề thi vấn đáp, giám sát phòng thi, xem analytics và phúc khảo điểm số',
  },
  {
    role: 'STUDENT',
    title: 'Sinh viên (Student)',
    name: 'Trần Thị Bình',
    username: 'tranthib',
    password: 'password123',
    badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
    description: 'Tham gia thi vấn đáp trực tiếp với giám khảo AI, tra cứu phiếu điểm & nhận xét',
  },
];

// Helper to get all registered users
export function getRegisteredUsers(): UserAccount[] {
  try {
    const stored = localStorage.getItem(STORAGE_USERS_KEY);
    const registered: any[] = stored ? JSON.parse(stored) : [];
    const combined: UserAccount[] = [...INITIAL_USERS];

    registered.forEach((u) => {
      const normalizedUser: UserAccount = {
        id: u.id || `usr-${Date.now().toString(36)}`,
        username: u.username || 'user',
        email: u.email || '',
        fullName: u.fullName || u.name || u.username || 'User',
        role: (u.role || 'STUDENT').toUpperCase() as UserRole,
        password: u.password,
        createdAt: u.createdAt || new Date().toISOString(),
      };
      const existingIdx = combined.findIndex(
        (item) => item.id === normalizedUser.id || item.username.toLowerCase() === normalizedUser.username.toLowerCase()
      );
      if (existingIdx >= 0) {
        combined[existingIdx] = { ...combined[existingIdx], ...normalizedUser };
      } else {
        combined.push(normalizedUser);
      }
    });

    return combined;
  } catch {
    return INITIAL_USERS;
  }
}

// User Login API
export async function loginUser(usernameOrEmail: string, password: string): Promise<UserAccount> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 250));

  const users = getRegisteredUsers();
  const query = usernameOrEmail.trim().toLowerCase();

  const user = users.find(
    (u) =>
      u.username.toLowerCase() === query ||
      (u.email && u.email.toLowerCase() === query)
  );

  if (!user) {
    throw new Error('Tài khoản hoặc email không tồn tại trong hệ thống.');
  }

  // Allow standard mock password or user custom password
  if (user.password && user.password !== password && password !== 'password123') {
    throw new Error('Mật khẩu không chính xác. Vui lòng thử lại!');
  }

  const { password: _, ...safeUser } = user;
  saveSession(safeUser as UserAccount);
  return safeUser as UserAccount;
}

// User Registration API: Notice NO role parameter! Role defaults to STUDENT.
export async function registerUser(data: {
  fullName: string;
  username: string;
  email: string;
  password: string;
}): Promise<UserAccount> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const trimmedUsername = data.username.trim();
  const trimmedEmail = data.email.trim().toLowerCase();
  const users = getRegisteredUsers();

  if (users.some((u) => u.username.toLowerCase() === trimmedUsername.toLowerCase())) {
    throw new Error('Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác.');
  }

  if (users.some((u) => u.email && u.email.toLowerCase() === trimmedEmail)) {
    throw new Error('Email này đã được liên kết với một tài khoản khác.');
  }

  // Registration rule: Role is default assigned as STUDENT, waiting for Admin assignment
  const newUser: UserAccount = {
    id: `usr-stu-${Date.now().toString(36)}`,
    username: trimmedUsername,
    email: trimmedEmail,
    fullName: data.fullName.trim(),
    role: 'STUDENT',
    password: data.password,
    createdAt: new Date().toISOString(),
  };

  try {
    const stored = localStorage.getItem(STORAGE_USERS_KEY);
    const currentStored: UserAccount[] = stored ? JSON.parse(stored) : [];
    currentStored.push(newUser);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(currentStored));
  } catch (err) {
    console.warn('Cannot write to localStorage:', err);
  }

  const { password: _, ...safeUser } = newUser;
  saveSession(safeUser as UserAccount);
  return safeUser as UserAccount;
}

// Admin: Create user directly with designated role
export async function createUserByAdmin(data: {
  fullName: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<UserAccount> {
  await new Promise((resolve) => setTimeout(resolve, 250));

  const trimmedUsername = data.username.trim();
  const trimmedEmail = data.email.trim().toLowerCase();
  const users = getRegisteredUsers();

  if (users.some((u) => u.username.toLowerCase() === trimmedUsername.toLowerCase())) {
    throw new Error('Tên đăng nhập đã tồn tại.');
  }

  if (users.some((u) => u.email && u.email.toLowerCase() === trimmedEmail)) {
    throw new Error('Email đã được đăng ký.');
  }

  const newUser: UserAccount = {
    id: `usr-${data.role.toLowerCase()}-${Date.now().toString(36)}`,
    username: trimmedUsername,
    email: trimmedEmail,
    fullName: data.fullName.trim(),
    role: data.role,
    password: data.password,
    createdAt: new Date().toISOString(),
  };

  try {
    const stored = localStorage.getItem(STORAGE_USERS_KEY);
    const currentStored: UserAccount[] = stored ? JSON.parse(stored) : [];
    currentStored.push(newUser);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(currentStored));
  } catch (err) {
    console.warn('Cannot write to localStorage:', err);
  }

  const { password: _, ...safeUser } = newUser;
  return safeUser as UserAccount;
}

// Admin: Update user role
export async function updateUserRole(userId: string, newRole: UserRole): Promise<{ id: string; role: UserRole }> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const stored = localStorage.getItem(STORAGE_USERS_KEY);
  const registered: UserAccount[] = stored ? JSON.parse(stored) : [];

  const existingIdx = registered.findIndex((u) => u.id === userId);
  if (existingIdx >= 0) {
    registered[existingIdx].role = newRole;
  } else {
    const initialUser = INITIAL_USERS.find((u) => u.id === userId);
    if (initialUser) {
      registered.push({ ...initialUser, role: newRole });
    } else {
      throw new Error('Không tìm thấy tài khoản người dùng.');
    }
  }
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(registered));

  // If user changed their own role, update current active session too
  const activeSession = getCurrentSession();
  if (activeSession && activeSession.id === userId) {
    saveSession({ ...activeSession, role: newRole });
  }

  return { id: userId, role: newRole };
}

// Admin: Delete user
export async function deleteUser(userId: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const stored = localStorage.getItem(STORAGE_USERS_KEY);
  if (stored) {
    let registered: UserAccount[] = JSON.parse(stored);
    registered = registered.filter((u) => u.id !== userId);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(registered));
  }
  return true;
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
          id: userObj.id || 'usr-admin-001',
          username: userObj.username || 'admin',
          email: userObj.email || 'admin@fpt.edu.vn',
          fullName: userObj.fullName || userObj.name || userObj.username || 'Quản trị viên Hệ thống',
          role: (userObj.role || 'ADMIN').toUpperCase() as UserRole,
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
    sessionStorage.removeItem(STORAGE_SESSION_KEY);
  } catch {
    // ignore
  }
}
