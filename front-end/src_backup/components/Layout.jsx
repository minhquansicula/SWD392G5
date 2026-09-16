// ============================================================
// AIVES — Layout Component (App Shell)
// ============================================================
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, BarChart3, Settings, LogOut, Sun, Moon, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { Role } from '../types';
import { mockUsers } from '../mocks/data';
import { cn } from '../lib/utils';

export default function Layout() {
    const { currentUser, switchToUser, logout } = useAuthStore();
    const { theme, toggleTheme } = useThemeStore();
    const location = useLocation();
    const navigate = useNavigate();

    // Hide layout in viva room (full-screen mode)
    if (location.pathname.startsWith('/viva/')) {
        return <Outlet />;
    }

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const handleSwitchUser = (userId) => {
        switchToUser(userId);
        const targetUser = mockUsers.find((u) => u.id === userId);
        if (targetUser?.role === Role.ADMIN) {
            navigate('/admin/users');
        } else if (targetUser?.role === Role.STUDENT) {
            navigate('/my-schedules');
        } else {
            navigate('/exams');
        }
    };

    const isAdmin = currentUser?.role === Role.ADMIN;
    const isLecturer = currentUser?.role === Role.LECTURER;

    const adminLinks = [
        { to: '/admin/users', icon: ShieldCheck, label: 'Quản lý Người dùng' },
        { to: '/exams', icon: BookOpen, label: 'Giám sát Kỳ thi' },
        { to: '/analytics/exam-001', icon: BarChart3, label: 'Thống kê Hệ thống' },
    ];
    const lecturerLinks = [
        { to: '/exams', icon: BookOpen, label: 'Exams' },
        { to: '/analytics/exam-001', icon: BarChart3, label: 'Analytics' },
    ];
    const studentLinks = [
        { to: '/my-schedules', icon: Calendar, label: 'My Schedules' },
    ];
    const navLinks = isAdmin ? adminLinks : isLecturer ? lecturerLinks : studentLinks;

    return (
        <div className="flex h-screen bg-surface-950 text-surface-200 overflow-hidden">
            {/* Sidebar */}
            <motion.aside 
                initial={{ x: -250, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-64 flex flex-col border-r border-surface-600 bg-surface-900/80 backdrop-blur-3xl relative z-20"
            >
                {/* Navigation (Starts at top) */}
                <nav className="flex-1 p-4 pt-6 space-y-1 relative">
                    {navLinks.map((link) => {
                        const isActive = location.pathname.startsWith(link.to);
                        return (
                            <NavLink 
                                key={link.to} 
                                to={link.to} 
                                className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group outline-none"
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNavIndicator"
                                        className="absolute inset-0 bg-primary-50 dark:bg-white/5 border border-primary-100 dark:border-white/10 rounded-xl"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                )}
                                <link.icon className={cn(
                                    "w-4 h-4 relative z-10 transition-colors", 
                                    isActive 
                                        ? isAdmin ? "text-purple-600 dark:text-purple-400" : "text-primary-600 dark:text-primary-400" 
                                        : "text-surface-400 group-hover:text-surface-100"
                                )} />
                                <span className={cn(
                                    "relative z-10 transition-colors font-medium", 
                                    isActive 
                                        ? isAdmin ? "text-purple-700 dark:text-white font-bold" : "text-primary-700 dark:text-white font-bold" 
                                        : "text-surface-400 group-hover:text-surface-100"
                                )}>
                                    {link.label}
                                </span>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Role Switcher (Mock utility) & Logout */}
                <div className="p-4 border-t border-surface-600 bg-surface-800/30 dark:bg-black/20">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-widest">Switch Identity</p>
                        <Settings className="w-3 h-3 text-surface-500" />
                    </div>
                    <div className="space-y-1">
                        {mockUsers.map((user) => (
                            <button 
                                key={user.id} 
                                onClick={() => handleSwitchUser(user.id)} 
                                className={cn(
                                    "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-all outline-none cursor-pointer",
                                    currentUser?.id === user.id 
                                        ? user.role === Role.ADMIN
                                            ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20'
                                            : 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-300 border border-primary-100 dark:border-primary-500/20' 
                                        : 'text-surface-400 hover:bg-surface-700/50 dark:hover:bg-white/5 hover:text-surface-100 border border-transparent'
                                )}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full shrink-0", 
                                        user.role === Role.ADMIN ? 'bg-purple-500' : user.role === Role.LECTURER ? 'bg-accent-500' : 'bg-primary-400'
                                    )} />
                                    <span className="truncate font-medium">{user.fullName}</span>
                                </div>
                                <span className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 font-mono",
                                    user.role === Role.ADMIN
                                        ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20"
                                        : user.role === Role.LECTURER 
                                            ? "text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-500/10 border-accent-200 dark:border-accent-500/20" 
                                            : "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/20"
                                )}>
                                    {user.role === Role.ADMIN ? 'AD' : user.role === Role.LECTURER ? 'GV' : 'SV'}
                                </span>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full mt-3 flex items-center justify-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-surface-400 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-colors border border-transparent hover:border-danger-200 dark:hover:border-danger-500/20 cursor-pointer"
                        title="Đăng xuất khỏi hệ thống"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative z-10">
                {/* Subtle top glow (dark mode only) */}
                <div className="absolute top-0 left-0 right-0 h-[500px] bg-primary-500/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 hidden dark:block" />

                {/* Top Header */}
                <header className="h-16 flex items-center justify-between px-8 border-b border-surface-600 bg-surface-950/40 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full animate-pulse",
                            isAdmin ? "bg-purple-500" : isLecturer ? "bg-accent-500" : "bg-primary-500"
                        )} />
                        <p className="text-xs font-medium text-surface-400 uppercase tracking-widest">
                            {isAdmin ? 'Admin Control Center' : isLecturer ? 'Lecturer Workspace' : 'Student Portal'}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {currentUser && (
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-semibold text-surface-50">{currentUser.fullName}</p>
                                    <p className="text-[11px] text-surface-400 font-mono">{currentUser.role}</p>
                                </div>
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shadow-sm",
                                    isAdmin 
                                        ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                                        : "bg-gradient-to-tr from-surface-300 to-surface-200 dark:from-surface-700 dark:to-surface-600 text-surface-50 dark:text-white border-surface-400 dark:border-white/10"
                                )}>
                                    {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-xl border border-surface-600 dark:border-white/10 hover:bg-surface-800 dark:hover:bg-white/5 transition-colors text-surface-400 hover:text-surface-100 dark:hover:text-white flex items-center justify-center cursor-pointer shadow-sm"
                            title={theme === 'dark' ? "Chuyển sang Giao diện Sáng" : "Chuyển sang Giao diện Tối"}
                        >
                            {theme === 'dark' ? <Sun className="w-4 h-4 text-warning-400" /> : <Moon className="w-4 h-4 text-primary-500" />}
                        </button>

                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-xl border border-surface-600 dark:border-white/10 hover:bg-danger-50 dark:hover:bg-danger-500/10 hover:border-danger-200 dark:hover:border-danger-500/30 text-surface-400 hover:text-danger-500 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                            title="Đăng xuất khỏi hệ thống"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden md:inline">Thoát</span>
                        </button>
                    </div>
                </header>

                {/* Page Viewport */}
                <div className="flex-1 overflow-auto p-8 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="h-full"
                    >
                        <Outlet />
                    </motion.div>
                </div>
            </main>
        </div>
    );
}