import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  Settings,
  X,
  Calendar,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { UserAccount } from '../../types';
import { Language } from '../../utils/i18n';

interface TopBarProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  currentUser?: UserAccount | null;
  onLogout?: () => void;
  onOpenAuthModal?: (tab?: 'login' | 'register') => void;
  onNavigateToSettings?: () => void;
  onOpenMobileSidebar: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  globalSearchQuery?: string;
  onGlobalSearchChange?: (q: string) => void;
}

const VietnamFlag: React.FC = () => (
  <svg className="w-4 h-2.5 rounded-xs shrink-0 shadow-2xs overflow-hidden" viewBox="0 0 30 20" fill="none">
    <rect width="30" height="20" fill="#DA251D" />
    <polygon
      points="15,4 16.347,8.146 20.706,8.146 17.18,10.708 18.527,14.854 15,12.292 11.473,14.854 12.82,10.708 9.294,8.146 13.653,8.146"
      fill="#FFFF00"
    />
  </svg>
);

const UkFlag: React.FC = () => (
  <svg className="w-4 h-2.5 rounded-xs shrink-0 shadow-2xs overflow-hidden" viewBox="0 0 60 30" fill="none">
    <clipPath id="uk-clip-topbar">
      <rect width="60" height="30" rx="1.5" />
    </clipPath>
    <g clipPath="url(#uk-clip-topbar)">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </g>
  </svg>
);

export const TopBar: React.FC<TopBarProps> = ({
  language,
  setLanguage,
  isDarkMode,
  setIsDarkMode,
  currentUser,
  onLogout,
  onOpenAuthModal,
  onNavigateToSettings,
  onOpenMobileSidebar,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  globalSearchQuery = '',
  onGlobalSearchChange,
}) => {
  const isVi = language === 'vi';
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(globalSearchQuery);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(true);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus global search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onGlobalSearchChange) {
      onGlobalSearchChange(searchValue);
    }
  };

  const getRoleBadgeClasses = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60';
      case 'LECTURER':
        return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60';
      default:
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'ADMIN') return isVi ? 'Quản trị viên' : 'Admin';
    if (role === 'LECTURER') return isVi ? 'Giảng viên' : 'Lecturer';
    return isVi ? 'Sinh viên' : 'Student';
  };

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* 1. Left: Mobile Menu / Desktop Sidebar Toggle + Global Search */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-lg">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar (matching modern EdTech reference style) */}
        {/* <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              if (onGlobalSearchChange) onGlobalSearchChange(e.target.value);
            }}
            placeholder={
              isVi
                ? 'Tìm kiếm kỳ thi, câu hỏi, mã môn học...'
                : 'Search exams, questions, course codes...'
            }
            className="w-full pl-9 pr-14 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800/90 bg-slate-50/80 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-2xs"
          />
          {searchValue ? (
            <button
              type="button"
              onClick={() => {
                setSearchValue('');
                if (onGlobalSearchChange) onGlobalSearchChange('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-0.5 absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-mono text-slate-400 dark:text-slate-300 pointer-events-none shadow-2xs">
              <span className="text-[11px]">⌘</span>K
            </div>
          )}
        </form> */}
      </div>

      {/* 2. Right: Utilities & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-3">
        {/* Semester / System Pill (Desktop only) */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          <span>Fall 2026</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {/* Language Switcher Pill */}
        <button
          onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
          title={isVi ? 'Chuyển sang Tiếng Anh' : 'Switch to Vietnamese'}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 transition-colors text-xs font-semibold cursor-pointer shadow-2xs"
        >
          {language === 'vi' ? <VietnamFlag /> : <UkFlag />}
          <span className="text-[11px] font-bold tracking-wide">{language === 'vi' ? 'VIE' : 'ENG'}</span>
        </button>

        {/* Dark / Light Mode Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          title={
            isDarkMode
              ? isVi
                ? 'Đang dùng Giao diện Tối (Bấm để chuyển sang Sáng)'
                : 'Dark Theme active (Click for Light)'
              : isVi
              ? 'Đang dùng Giao diện Sáng (Bấm để chuyển sang Tối)'
              : 'Light Theme active (Click for Dark)'
          }
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
          aria-label="Toggle theme"
        >
          {isDarkMode ? (
            <Moon className="w-4 h-4 text-indigo-400" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setHasUnreadNotifs(false);
            }}
            title={isVi ? 'Thông báo hệ thống' : 'Notifications'}
            className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {hasUnreadNotifs && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  {isVi ? 'Thông báo hệ thống' : 'System Notifications'}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  {isVi ? 'Mới nhất' : 'Recent'}
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs max-h-72 overflow-y-auto">
                <div className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {isVi ? 'Kỳ thi vấn đáp sắp diễn ra' : 'Upcoming oral exam schedule'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isVi
                      ? 'Lịch thi môn SWD392 đã được chốt với 40 sinh viên đăng ký.'
                      : 'SWD392 viva exam schedule confirmed with 40 candidates.'}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">15 phút trước</span>
                </div>
                <div className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {isVi ? 'Giám khảo AI sẵn sàng' : 'AI Examiner Core ready'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isVi
                      ? 'Engine chấm giọng nói Whisper & TTS Edge hoạt động bình thường.'
                      : 'Whisper STT & Edge-TTS engines operational.'}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">1 giờ trước</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill (matching the Grace Stanley style in reference image) */}
        {currentUser ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2.5 p-1 sm:pl-2.5 sm:pr-3 rounded-full sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer shadow-2xs"
            >
              {/* Avatar circle with gradient */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs shrink-0 ring-2 ring-white dark:ring-slate-900">
                {(currentUser.fullName || currentUser.username || 'User')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

              {/* User text (hidden on small mobile) */}
              <div className="hidden sm:block text-left max-w-32 lg:max-w-40 truncate">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                  {currentUser.fullName || currentUser.username}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border leading-tight ${getRoleBadgeClasses(
                      currentUser.role
                    )}`}
                  >
                    {getRoleLabel(currentUser.role)}
                  </span>
                </div>
              </div>

              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 hidden sm:block transition-transform duration-150 ${isUserMenuOpen ? 'rotate-180' : ''
                  }`}
              />
            </button>

            {/* User Profile Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.fullName || currentUser.username}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                    {currentUser.email || `@${currentUser.username}`}
                  </p>
                  <div className="mt-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getRoleBadgeClasses(
                        currentUser.role
                      )}`}
                    >
                      {getRoleLabel(currentUser.role)}
                    </span>
                  </div>
                </div>

                <div className="p-1">
                  {onNavigateToSettings && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onNavigateToSettings();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>{isVi ? 'Cài đặt tài khoản' : 'Account Settings'}</span>
                    </button>
                  )}

                  {onLogout && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left cursor-pointer mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{isVi ? 'Đăng xuất' : 'Log Out'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            {isVi ? 'Đăng nhập' : 'Sign In'}
          </button>
        )}
      </div>
    </header>
  );
};
