// ============================================================
// AIVES — Layout Component (App Shell)
// ============================================================
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, Calendar, BarChart3, Settings, Sun, Moon, LogOut } from 'lucide-react';
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
        if (targetUser?.role === Role.STUDENT) {
            navigate('/my-schedules');
        } else {
            navigate('/exams');
        }
    };

    const isLecturer = currentUser?.role === Role.LECTURER;
    const lecturerLinks = [
        { to: '/exams', icon: BookOpen, label: 'Exams' },
        { to: '/analytics/exam-001', icon: BarChart3, label: 'Analytics' },
    ];
    const studentLinks = [
        { to: '/my-schedules', icon: Calendar, label: 'My Schedules' },
    ];
    const navLinks = isLecturer ? lecturerLinks : studentLinks;

    return (
        <div className="flex h-screen bg-surface-950 text-surface-200 overflow-hidden">
            {/* Sidebar */}
            <motion.aside 
                initial={{ x: -250, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-64 flex flex-col border-r border-white/5 bg-surface-900/50 backdrop-blur-3xl relative z-20"
            >
                {/* Logo Area */}
                <div className="p-6 border-b border-white/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-primary-400 to-primary-600 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-primary-300/20">
                                <GraduationCap className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold text-white tracking-tight">AIVES</h1>
                                <p className="text-[11px] text-surface-500 font-medium">AI Viva Exam System</p>
                            </div>
                        </div>

                        <button 
                            onClick={toggleTheme}
                            className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-surface-400 hover:text-white transition-colors cursor-pointer"
                            title={theme === 'dark' ? "Chuyển sang Giao diện Sáng (Light)" : "Chuyển sang Giao diện Tối (Dark)"}
                        >
                            {theme === 'dark' ? <Sun className="w-4 h-4 text-warning-400" /> : <Moon className="w-4 h-4 text-primary-500" />}
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 relative">
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
                                        className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                )}
                                <link.icon className={cn("w-4 h-4 relative z-10 transition-colors", isActive ? "text-primary-400" : "text-surface-400 group-hover:text-surface-200")} />
                                <span className={cn("relative z-10 transition-colors", isActive ? "text-white" : "text-surface-400 group-hover:text-surface-200")}>
                                    {link.label}
                                </span>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Role Switcher (Mock utility) & Logout */}
                <div className="p-4 border-t border-white/5 bg-black/20">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-widest">Switch Identity</p>
                        <Settings className="w-3 h-3 text-surface-600" />
                    </div>
                    <div className="space-y-1">
                        {mockUsers.map((user) => (
                            <button 
                                key={user.id} 
                                onClick={() => handleSwitchUser(user.id)} 
                                className={cn(
                                    "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-all outline-none cursor-pointer",
                                    currentUser?.id === user.id 
                                        ? 'bg-primary-500/10 text-primary-300 border border-primary-500/20' 
                                        : 'text-surface-400 hover:bg-white/5 hover:text-surface-200 border border-transparent'
                                )}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", user.role === Role.LECTURER ? 'bg-accent-500' : 'bg-primary-400')} />
                                    <span className="truncate font-medium">{user.fullName}</span>
                                </div>
                                <span className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 font-mono",
                                    user.role === Role.LECTURER 
                                        ? "text-accent-400 bg-accent-500/10 border-accent-500/20" 
                                        : "text-primary-400 bg-primary-500/10 border-primary-500/20"
                                )}>
                                    {user.role === Role.LECTURER ? 'GV' : 'SV'}
                                </span>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full mt-3 flex items-center justify-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-surface-400 hover:text-danger-400 hover:bg-danger-500/10 transition-colors border border-transparent hover:border-danger-500/20 cursor-pointer"
                        title="Đăng xuất khỏi hệ thống"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative z-10">
                {/* Subtle top glow */}
                <div className="absolute top-0 left-0 right-0 h-[500px] bg-primary-500/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2" />

                {/* Top Header */}
                <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-surface-950/40 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
                        <p className="text-xs font-medium text-surface-400 uppercase tracking-widest">
                            {isLecturer ? 'Lecturer Workspace' : 'Student Portal'}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3 sm:gap-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-surface-400 hover:text-white flex items-center gap-2 text-xs font-semibold cursor-pointer"
                            title={theme === 'dark' ? "Chuyển sang Giao diện Sáng (Light Theme)" : "Chuyển sang Giao diện Tối (Dark Theme)"}
                        >
                            {theme === 'dark' ? (
                                <>
                                    <Sun className="w-4 h-4 text-warning-400" />
                                    <span className="hidden md:inline">Sáng</span>
                                </>
                            ) : (
                                <>
                                    <Moon className="w-4 h-4 text-primary-500" />
                                    <span className="hidden md:inline">Tối</span>
                                </>
                            )}
                        </button>

                        <div className="h-5 w-[1px] bg-white/10 hidden sm:block" />

                        {currentUser && (
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-semibold text-white">{currentUser.fullName}</p>
                                    <p className="text-[11px] text-surface-400">{currentUser.role}</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-surface-700 to-surface-600 flex items-center justify-center text-white text-xs font-bold border border-white/10 shadow-sm">
                                    {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-xl border border-white/10 hover:bg-danger-500/10 hover:border-danger-500/30 text-surface-400 hover:text-danger-400 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
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
