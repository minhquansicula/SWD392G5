import React, { useState, useRef, useEffect } from 'react';
import {
  BrainCircuit,
  CalendarDays,
  Radio,
  BarChart3,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Sparkles,
  Languages,
  ShieldCheck,
  GraduationCap,
  Users,
  ChevronDown,
  LogOut,
  LogIn,
  Check,
} from 'lucide-react';
import { ModuleType, UserAccount, UserRole } from '../../types';
import { Language, translations } from '../../utils/i18n';

interface HeaderProps {
  activeModule: ModuleType;
  setActiveModule: (module: ModuleType) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  isSoundEnabled: boolean;
  setIsSoundEnabled: (enabled: boolean) => void;
  userRole: 'faculty' | 'student';
  setUserRole: (role: 'faculty' | 'student') => void;
  isSimpleMode: boolean;
  setIsSimpleMode: (simple: boolean) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  currentUser?: UserAccount | null;
  onOpenAuthModal?: (tab?: 'login' | 'register') => void;
  onSwitchUser?: (username: string) => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  setActiveModule,
  isDarkMode,
  setIsDarkMode,
  isSoundEnabled,
  setIsSoundEnabled,
  isSimpleMode,
  setIsSimpleMode,
  language,
  setLanguage,
  currentUser,
  onOpenAuthModal,
  onSwitchUser,
  onLogout,
}) => {
  const t = translations[language];
  const isVi = language === 'vi';
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return isVi ? 'Quản trị viên' : 'Admin';
      case 'LECTURER':
        return isVi ? 'Giảng viên' : 'Faculty';
      case 'STUDENT':
        return isVi ? 'Sinh viên' : 'Student';
      default:
        return isVi ? 'Thành viên' : 'Member';
    }
  };

  const getRoleBadgeClasses = (role?: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/70 border-purple-200 dark:border-purple-800';
      case 'LECTURER':
        return 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800';
      case 'STUDENT':
      default:
        return 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Clean Title */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveModule('exams')}
              className="flex items-center gap-2.5 text-left group focus:outline-hidden rounded-lg cursor-pointer"
            >
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white font-display block leading-tight">
                  {t.appName}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {t.appSub}
                </span>
              </div>
            </button>
          </div>

          {/* Primary Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveModule('exams')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeModule === 'exams'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              <span>{t.navExams}</span>
            </button>

            <button
              onClick={() => setActiveModule('interview')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeModule === 'interview'
                  ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Radio className="h-4 w-4 text-rose-500" />
              <span>{t.navInterview}</span>
            </button>

            <button
              onClick={() => setActiveModule('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeModule === 'analytics'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>{t.navAnalytics}</span>
            </button>

            {/* Admin Management Tab (Visible to Admin or for system administration) */}
            {currentUser?.role === 'ADMIN' && (
              <button
                onClick={() => setActiveModule('admin')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeModule === 'admin'
                    ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShieldCheck className="h-4 w-4 text-purple-500" />
                <span>{t.navAdmin}</span>
              </button>
            )}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Simple vs Detailed Mode Switcher */}
            <button
              onClick={() => setIsSimpleMode(!isSimpleMode)}
              title={isSimpleMode ? t.simpleModeHint : t.detailedModeHint}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isSimpleMode
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Sparkles className={`h-3.5 w-3.5 ${isSimpleMode ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{isSimpleMode ? t.simpleModeOn : t.simpleModeOff}</span>
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
              title="Chuyển đổi ngôn ngữ / Switch Language"
              className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Languages className="h-3.5 w-3.5 text-indigo-500" />
              <span>{language.toUpperCase()}</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              title={isSoundEnabled ? t.soundOn : t.soundOff}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
            >
              {isSoundEnabled ? (
                <Volume2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <VolumeX className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {/* Dark/Light Mode Switcher */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={
                isDarkMode
                  ? isVi
                    ? 'Chuyển sang Giao diện Sáng (Light mode)'
                    : 'Switch to Light Mode'
                  : isVi
                  ? 'Chuyển sang Giao diện Tối (Dark mode)'
                  : 'Switch to Dark Mode'
              }
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-semibold border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer"
            >
              {isDarkMode ? (
                <>
                  <Sun className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline text-amber-300 text-[11px] font-medium">
                    {isVi ? 'Sáng' : 'Light'}
                  </span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span className="hidden sm:inline text-slate-700 text-[11px] font-medium">
                    {isVi ? 'Tối' : 'Dark'}
                  </span>
                </>
              )}
            </button>

            {/* User Account / Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              {currentUser ? (
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                    {currentUser.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[110px]">
                      {currentUser.fullName}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
                      {getRoleLabel(currentUser.role)}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ) : (
                <button
                  onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Đăng nhập' : 'Sign In'}</span>
                </button>
              )}

              {/* User Dropdown Menu */}
              {isUserMenuOpen && currentUser && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Account Summary */}
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.fullName}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getRoleBadgeClasses(currentUser.role)}`}>
                        {getRoleLabel(currentUser.role)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      @{currentUser.username} • {currentUser.email}
                    </p>
                  </div>

                  {/* Admin Portal link if user is Admin */}
                  {currentUser.role === 'ADMIN' && (
                    <button
                      onClick={() => {
                        setActiveModule('admin');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors text-left cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isVi ? 'Cổng Quản lý Người dùng' : 'Open User Management'}</span>
                    </button>
                  )}

                  {/* Auth Actions: Logout */}
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        if (onLogout) onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{isVi ? 'Đăng xuất tài khoản' : 'Log Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden border-t border-slate-200 dark:border-slate-800 py-2 gap-1 justify-around text-xs font-semibold">
          <button
            onClick={() => setActiveModule('exams')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${
              activeModule === 'exams'
                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{t.navExams}</span>
          </button>
          <button
            onClick={() => setActiveModule('interview')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${
              activeModule === 'interview'
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Radio className="h-3.5 w-3.5 text-rose-500" />
            <span>{t.navInterview}</span>
          </button>
          <button
            onClick={() => setActiveModule('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${
              activeModule === 'analytics'
                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>{t.navAnalytics}</span>
          </button>
          {currentUser?.role === 'ADMIN' && (
            <button
              onClick={() => setActiveModule('admin')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${
                activeModule === 'admin'
                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />
              <span>{t.navAdmin}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
