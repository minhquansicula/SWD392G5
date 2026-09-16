// ============================================================
// AIVES — Auth API Adapter (Mock & Backend-Ready)
// ============================================================
import { Role } from '../types';
import { mockUsers } from '../mocks/data';

const STORAGE_USERS_KEY = 'aives_registered_users';
const STORAGE_SESSION_KEY = 'aives_auth_session';

// Default initial credentials for mock users
const INITIAL_CREDENTIALS = [
    {
        id: 'usr-admin-001',
        username: 'admin',
        email: 'admin@fpt.edu.vn',
        fullName: 'Quản trị viên Hệ thống',
        role: Role.ADMIN,
        password: 'password123',
        createdAt: '2026-01-01T08:00:00.000Z',
    },
    {
        id: 'usr-lecturer-001',
        username: 'dr.nguyen',
        email: 'dr.nguyen@fpt.edu.vn',
        fullName: 'TS. Nguyễn Văn An',
        role: Role.LECTURER,
        password: 'password123',
        createdAt: '2026-01-10T09:30:00.000Z',
    },
    {
        id: 'usr-student-001',
        username: 'tranthib',
        email: 'tranthib@fpt.edu.vn',
        fullName: 'Trần Thị Bình',
        role: Role.STUDENT,
        password: 'password123',
        createdAt: '2026-02-15T14:20:00.000Z',
    },
    {
        id: 'usr-student-002',
        username: 'levanc',
        email: 'levanc@fpt.edu.vn',
        fullName: 'Lê Văn Cường',
        role: Role.STUDENT,
        password: 'password123',
        createdAt: '2026-02-16T10:15:00.000Z',
    },
    {
        id: 'usr-student-003',
        username: 'phamthid',
        email: 'phamthid@fpt.edu.vn',
        fullName: 'Phạm Thị Dung',
        role: Role.STUDENT,
        password: 'password123',
        createdAt: '2026-02-18T11:45:00.000Z',
    },
    {
        id: 'usr-student-004',
        username: 'hovane',
        email: 'hovane@fpt.edu.vn',
        fullName: 'Hồ Văn Em',
        role: Role.STUDENT,
        password: 'password123',
        createdAt: '2026-02-20T16:00:00.000Z',
    },
];

// Helper to get all registered users (initial mock + user-registered)
export function getRegisteredUsers() {
    try {
        const stored = localStorage.getItem(STORAGE_USERS_KEY);
        const registered = stored ? JSON.parse(stored) : [];
        // Combine initial and stored users (stored overrides initial if same id/username)
        const combined = [...INITIAL_CREDENTIALS];
        registered.forEach((u) => {
            const existingIdx = combined.findIndex(
                (item) => item.id === u.id || item.username.toLowerCase() === u.username.toLowerCase()
            );
            if (existingIdx >= 0) {
                combined[existingIdx] = { ...combined[existingIdx], ...u };
            } else {
                combined.push(u);
            }
        });
        return combined;
    } catch {
        return INITIAL_CREDENTIALS;
    }
}

// Quick demo accounts for one-click login (Admin, Lecturer, Student)
export const DEMO_ACCOUNTS = [
    {
        role: Role.ADMIN,
        title: 'Quản trị viên',
        name: 'Quản trị viên Hệ thống',
        username: 'admin',
        password: 'password123',
        badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
        role: Role.LECTURER,
        title: 'Giảng viên',
        name: 'TS. Nguyễn Văn An',
        username: 'dr.nguyen',
        password: 'password123',
        badgeColor: 'text-accent-400 bg-accent-500/10 border-accent-500/20',
    },
    {
        role: Role.STUDENT,
        title: 'Sinh viên',
        name: 'Trần Thị Bình',
        username: 'tranthib',
        password: 'password123',
        badgeColor: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
    },
];

/**
 * Login API
 * Simulates network delay and authenticates user
 */
export async function loginApi({ usernameOrEmail, password }) {
    // Network delay simulation (350ms)
    await new Promise((resolve) => setTimeout(resolve, 350));

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

    // Check password (allow 'password123' or exact match for ease of testing)
    if (user.password && user.password !== password && password !== 'password123') {
        throw new Error('Mật khẩu không chính xác. Vui lòng thử lại!');
    }

    // Strip password from returned user object
    const { password: _, ...safeUser } = user;
    const token = `aives-jwt-${safeUser.id}-${Date.now()}`;

    return {
        user: safeUser,
        token,
    };
}

/**
 * Register API
 * Creates a new user and stores into localStorage
 */
export async function registerApi({ fullName, username, email, password, role }) {
    await new Promise((resolve) => setTimeout(resolve, 450));

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const users = getRegisteredUsers();

    if (users.some((u) => u.username.toLowerCase() === trimmedUsername.toLowerCase())) {
        throw new Error('Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác.');
    }

    if (users.some((u) => u.email && u.email.toLowerCase() === trimmedEmail)) {
        throw new Error('Email này đã được liên kết với một tài khoản khác.');
    }

    const newUser = {
        id: `usr-${(role || Role.STUDENT).toLowerCase()}-${Date.now().toString(36)}`,
        username: trimmedUsername,
        email: trimmedEmail,
        fullName: fullName.trim(),
        role: role || Role.STUDENT,
        password,
        createdAt: new Date().toISOString(),
    };

    // Save to localStorage
    try {
        const stored = localStorage.getItem(STORAGE_USERS_KEY);
        const currentStored = stored ? JSON.parse(stored) : [];
        currentStored.push(newUser);
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(currentStored));
    } catch (err) {
        console.warn('Cannot write to localStorage:', err);
    }

    const { password: _, ...safeUser } = newUser;
    const token = `aives-jwt-${safeUser.id}-${Date.now()}`;

    return {
        user: safeUser,
        token,
    };
}

// ------------------------------------------------------------
// ADMIN MANAGEMENT APIS
// ------------------------------------------------------------

/**
 * Get all users for Admin
 */
export async function getAllUsersApi() {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const users = getRegisteredUsers();
    return users.map(({ password, ...u }) => ({
        ...u,
        createdAt: u.createdAt || new Date().toISOString(),
    }));
}

/**
 * Update user role (Admin role assignment)
 */
export async function updateUserRoleApi(userId, newRole) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const stored = localStorage.getItem(STORAGE_USERS_KEY);
    let registered = stored ? JSON.parse(stored) : [];

    const existingIdx = registered.findIndex((u) => u.id === userId);
    if (existingIdx >= 0) {
        registered[existingIdx].role = newRole;
    } else {
        const initialUser = INITIAL_CREDENTIALS.find((u) => u.id === userId);
        if (initialUser) {
            registered.push({ ...initialUser, role: newRole });
        } else {
            throw new Error('Không tìm thấy người dùng để phân quyền.');
        }
    }
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(registered));

    // Also update current active session if Admin changed their own role
    const activeSession = getInitialSession();
    if (activeSession?.user?.id === userId) {
        activeSession.user.role = newRole;
        saveSession(activeSession.user, activeSession.token, true);
    }

    return { id: userId, role: newRole };
}

/**
 * Delete a user (Admin only)
 */
export async function deleteUserApi(userId) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const stored = localStorage.getItem(STORAGE_USERS_KEY);
    if (stored) {
        let registered = JSON.parse(stored);
        registered = registered.filter((u) => u.id !== userId);
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(registered));
    }
    return { success: true };
}

/**
 * Create user directly by Admin
 */
export async function createUserByAdminApi({ fullName, username, email, password, role }) {
    return registerApi({ fullName, username, email, password, role });
}

export function saveSession(user, token, rememberMe = true) {
    try {
        const payload = JSON.stringify({ user, token });
        if (rememberMe) {
            localStorage.setItem(STORAGE_SESSION_KEY, payload);
        } else {
            sessionStorage.setItem(STORAGE_SESSION_KEY, payload);
        }
    } catch (e) {
        console.warn('Failed to save session:', e);
    }
}

export function getInitialSession() {
    try {
        const local = localStorage.getItem(STORAGE_SESSION_KEY);
        if (local) return JSON.parse(local);
        const session = sessionStorage.getItem(STORAGE_SESSION_KEY);
        if (session) return JSON.parse(session);
    } catch {
        // ignore
    }
    // Default fallback to null (unauthenticated by default)
    return null;
}

export function clearSession() {
    try {
        localStorage.removeItem(STORAGE_SESSION_KEY);
        sessionStorage.removeItem(STORAGE_SESSION_KEY);
    } catch {
        // ignore
    }
}
