// ============================================================
// AIVES — Auth Store (Role Switcher for PoC)
// ============================================================
import { create } from 'zustand';
import { Role } from '../types';
import { mockUsers } from '../mocks/data';
const defaultLecturer = mockUsers.find((u) => u.role === Role.LECTURER);
export const useAuthStore = create((set) => ({
    currentUser: defaultLecturer,
    isAuthenticated: true,
    switchRole: (role) => {
        const user = mockUsers.find((u) => u.role === role) ?? defaultLecturer;
        set({ currentUser: user });
    },
    switchToUser: (userId) => {
        const user = mockUsers.find((u) => u.id === userId) ?? defaultLecturer;
        set({ currentUser: user });
    },
}));
