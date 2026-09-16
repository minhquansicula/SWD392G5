// ============================================================
// AIVES — Theme Store (Light / Dark Mode State)
// ============================================================
import { create } from 'zustand';

const THEME_STORAGE_KEY = 'aives_theme';

// Read initial theme preference (default: 'dark')
const getInitialTheme = () => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
};

const applyThemeToDOM = (theme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'light') {
        root.classList.remove('dark');
        root.classList.add('light');
        root.setAttribute('data-theme', 'light');
    } else {
        root.classList.remove('light');
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
    }
};

// Apply on file load
applyThemeToDOM(getInitialTheme());

export const useThemeStore = create((set, get) => ({
    theme: getInitialTheme(),
    isDark: getInitialTheme() === 'dark',
    toggleTheme: () => {
        const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
        if (typeof window !== 'undefined') {
            localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        }
        applyThemeToDOM(nextTheme);
        set({ theme: nextTheme, isDark: nextTheme === 'dark' });
    },
    setTheme: (theme) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        }
        applyThemeToDOM(theme);
        set({ theme, isDark: theme === 'dark' });
    },
}));
