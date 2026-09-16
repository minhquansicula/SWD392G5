// ============================================================
// AIVES — Auth Store (Zustand with Session Persistence)
// ============================================================
import { create } from 'zustand';
import { Role } from '../types';
import { mockUsers } from '../mocks/data';
import { 
    loginApi, 
    registerApi, 
    saveSession, 
    getInitialSession, 
    clearSession, 
    getRegisteredUsers 
} from '../lib/authApi';

// Initial check: if there is an active session, use it.
const initialSession = getInitialSession();

export const useAuthStore = create((set, get) => ({
    currentUser: initialSession ? initialSession.user : null,
    token: initialSession ? initialSession.token : null,
    isAuthenticated: Boolean(initialSession?.user),
    isLoading: false,
    error: null,

    // Clear error
    clearError: () => set({ error: null }),

    // Login action
    login: async ({ usernameOrEmail, password, rememberMe = true }) => {
        set({ isLoading: true, error: null });
        try {
            const { user, token } = await loginApi({ usernameOrEmail, password });
            saveSession(user, token, rememberMe);
            set({ 
                currentUser: user, 
                token, 
                isAuthenticated: true, 
                isLoading: false, 
                error: null 
            });
            return user;
        } catch (err) {
            set({ isLoading: false, error: err.message || 'Đăng nhập thất bại' });
            throw err;
        }
    },

    // Register action
    register: async ({ fullName, username, email, password, role }) => {
        set({ isLoading: true, error: null });
        try {
            const { user, token } = await registerApi({ fullName, username, email, password, role });
            saveSession(user, token, true);
            set({ 
                currentUser: user, 
                token, 
                isAuthenticated: true, 
                isLoading: false, 
                error: null 
            });
            return user;
        } catch (err) {
            set({ isLoading: false, error: err.message || 'Đăng ký thất bại' });
            throw err;
        }
    },

    // Logout action
    logout: () => {
        clearSession();
        set({ 
            currentUser: null, 
            token: null, 
            isAuthenticated: false, 
            error: null 
        });
    },

    // Identity switcher (convenience for demo / testing while logged in)
    switchRole: (role) => {
        const users = getRegisteredUsers();
        const user = users.find((u) => u.role === role) || mockUsers.find((u) => u.role === role);
        if (user) {
            const { password: _, ...safeUser } = user;
            saveSession(safeUser, get().token || 'mock-token', true);
            set({ currentUser: safeUser, isAuthenticated: true });
        }
    },

    switchToUser: (userId) => {
        const users = getRegisteredUsers();
        const user = users.find((u) => u.id === userId) || mockUsers.find((u) => u.id === userId);
        if (user) {
            const { password: _, ...safeUser } = user;
            saveSession(safeUser, get().token || 'mock-token', true);
            set({ currentUser: safeUser, isAuthenticated: true });
        }
    },
}));
