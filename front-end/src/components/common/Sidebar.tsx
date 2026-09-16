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
  UserPlus,
  LogIn,
  Check,
  X,
  Menu,
} from 'lucide-react';
import { ModuleType, UserAccount, UserRole } from '../../types';
import { Language, translations } from '../../utils/i18n';
import { DEMO_ACCOUNTS } from '../../services/authService';

interface SidebarProps {
  activeModule: ModuleType;
  setActiveModule: (module: ModuleType) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  isSoundEnabled: boolean;
  setIsSoundEnabled: (enabled: boolean) => void;
  isSimpleMode: boolean;
  setIsSimpleMode: (simple: boolean) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  currentUser?: UserAccount | null;
  onOpenAuthModal?: (tab?: 'login' | 'register') => void;
  onSwitchUser?: (username: string) => void;
  onLogout?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
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
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const t = translations[language];
  const isVi = language === 'vi';

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
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

  const handleNavClick = (module: ModuleType) => {
    setActiveModule(module);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80 w-64 select-none transition-colors duration-200">
      {/* 1. BRAND HEADER */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
        <button
          onClick={() => handleNavClick('exams')}
          className="flex items-center gap-3 text-left group focus:outline-hidden cursor-pointer"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25 group-hover:scale-105 transition-transform shrink-0">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white font-display block">
              {t.appName}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
              {t.appSub}
            </span>
          </div>
        </button>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. NAVIGATION LINKS */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {isVi ? 'Phân hệ chính' : 'Main Modules'}
        </div>

        {/* Exams */}
        <button
          onClick={() => handleNavClick('exams')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeModule === 'exams'
              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <CalendarDays
            className={`h-4 w-4 shrink-0 ${
              activeModule === 'exams' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
            }`}
          />
          <span className="truncate">{t.navExams}</span>
        </button>

        {/* Live Viva */}
        <button
          onClick={() => handleNavClick('interview')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeModule === 'interview'
              ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 shadow-2xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-3 truncate">
            <Radio
              className={`h-4 w-4 shrink-0 ${
                activeModule === 'interview' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
              }`}
            />
            <span className="truncate">{t.navInterview}</span>
          </div>
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
        </button>

        {/* Analytics */}
        <button
          onClick={() => handleNavClick('analytics')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeModule === 'analytics'
              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <BarChart3
            className={`h-4 w-4 shrink-0 ${
              activeModule === 'analytics' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
            }`}
          />
          <span className="truncate">{t.navAnalytics}</span>
        </button>

        {/* User Management (Admin Only or Quick Admin access) */}
        {currentUser?.role === 'ADMIN' && (
          <div className="pt-2">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              {isVi ? 'Quản trị hệ thống' : 'System Admin'}
            </div>
            <button
              onClick={() => handleNavClick('admin')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeModule === 'admin'
                  ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <ShieldCheck
                  className={`h-4 w-4 shrink-0 ${
                    activeModule === 'admin' ? 'text-purple-600 dark:text-purple-400' : 'text-purple-500'
                  }`}
                />
                <span className="truncate">{t.navAdmin}</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                PRO
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 3. UTILITY CONTROLS BAR (Theme, Sound, Lang, Simple Mode) */}
      <div className="px-3 py-2.5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex items-center justify-between gap-1">
          {/* Simple Mode Toggle */}
          <button
            onClick={() => setIsSimpleMode(!isSimpleMode)}
            title={isSimpleMode ? t.simpleModeHint : t.detailedModeHint}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isSimpleMode
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Sparkles className={`h-3 w-3 ${isSimpleMode ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="text-[11px] truncate">
              {isSimpleMode ? (isVi ? 'Tinh gọn' : 'Simple') : (isVi ? 'Chi tiết' : 'Detail')}
            </span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
            title="Ngôn ngữ / Language"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer text-xs font-bold"
          >
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            title={isSoundEnabled ? t.soundOn : t.soundOff}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer"
          >
            {isSoundEnabled ? (
              <Volume2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>

          {/* Dark / Light Mode Switcher (Icon only, no text, exactly as user requested) */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={
              isDarkMode
                ? isVi
                  ? 'Chuyển sang Giao diện Sáng'
                  : 'Switch to Light Mode'
                : isVi
                ? 'Chuyển sang Giao diện Tối'
                : 'Switch to Dark Mode'
            }
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center cursor-pointer"
          >
            {isDarkMode ? (
              <Sun className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            )}
          </button>
        </div>
      </div>

      {/* 4. USER ACCOUNT WIDGET (Bottom of Sidebar) */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 relative" ref={userMenuRef}>
        {currentUser ? (
          <div>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs shrink-0">
                {(currentUser.fullName || (currentUser as any).name || currentUser.username || 'User')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.fullName || (currentUser as any).name || currentUser.username || 'User'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border leading-tight ${getRoleBadgeClasses(
                      currentUser.role
                    )}`}
                  >
                    {getRoleLabel(currentUser.role)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono truncate">
                    @{currentUser.username || 'user'}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                  isUserMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Popup Menu */}
            {isUserMenuOpen && (
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800/80">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.fullName || (currentUser as any).name || currentUser.username || 'User'}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                    {currentUser.email}
                  </p>
                </div>

                {/* 1-Touch Demo Switcher */}
                <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-800/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
                    {isVi ? '⚡ Đổi vai trò nhanh' : '⚡ Quick Role Switch'}
                  </p>
                  <div className="space-y-0.5">
                    {DEMO_ACCOUNTS.map((acc) => {
                      const isCurrentAcc = currentUser.username === acc.username;
                      return (
                        <button
                          key={acc.username}
                          onClick={() => {
                            if (onSwitchUser) onSwitchUser(acc.username);
                            setIsUserMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                            isCurrentAcc
                              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {acc.role === 'ADMIN' && <ShieldCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                            {acc.role === 'LECTURER' && (
                              <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            )}
                            {acc.role === 'STUDENT' && <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                            <span className="truncate">{acc.title}</span>
                          </div>
                          {isCurrentAcc && (
                            <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-1 px-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      if (onOpenAuthModal) onOpenAuthModal('register');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isVi ? 'Đăng ký tài khoản mới' : 'Register New'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isVi ? 'Đăng xuất' : 'Log Out'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
            className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{isVi ? 'Đăng nhập / Đăng ký' : 'Sign In / Register'}</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex flex-col shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer content */}
          <div className="relative z-10 animate-in slide-in-from-left duration-200 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
