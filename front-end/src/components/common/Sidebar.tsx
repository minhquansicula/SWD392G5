import React from 'react';
import {
  BrainCircuit,
  CalendarDays,
  FileQuestion,
  BarChart3,
  ShieldCheck,
  BookOpen,
  LogIn,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { ModuleType, UserAccount } from '../../types';
import { Language, translations } from '../../utils/i18n';

interface SidebarProps {
  activeModule: ModuleType;
  setActiveModule: (module: ModuleType) => void;
  language: Language;
  currentUser?: UserAccount | null;
  onOpenAuthModal?: (tab?: 'login' | 'register') => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  setActiveModule,
  language,
  currentUser,
  onOpenAuthModal,
  isOpenMobile = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const t = translations[language];
  const isVi = language === 'vi';

  const handleNavClick = (module: ModuleType) => {
    setActiveModule(module);
    if (onCloseMobile) onCloseMobile();
  };

  const navItems = [
    {
      id: 'exams' as ModuleType,
      label: t.navExams,
      icon: CalendarDays,
      show: true,
    },
    {
      id: 'questions' as ModuleType,
      label: t.navQuestions,
      icon: FileQuestion,
      show: currentUser?.role === 'LECTURER' || currentUser?.role === 'ADMIN',
    },
    {
      id: 'analytics' as ModuleType,
      label: t.navAnalytics,
      icon: BarChart3,
      show: true,
    },
  ];

  const adminItems = [
    {
      id: 'admin' as ModuleType,
      label: t.navAdmin,
      icon: ShieldCheck,
      badge: 'PRO',
      show: currentUser?.role === 'ADMIN',
    },
    {
      id: 'courses' as ModuleType,
      label: isVi ? 'Quản lý môn học' : 'Course Management',
      icon: BookOpen,
      show: currentUser?.role === 'ADMIN',
    },
  ];

  const sidebarContent = (
    <div
      className={`flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80 select-none transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* 1. BRAND HEADER */}
      <div className={`h-18 px-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed ? (
          <>
            <button
              onClick={() => handleNavClick('exams')}
              className="flex items-center gap-3 text-left group focus:outline-hidden cursor-pointer min-w-0"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25 group-hover:scale-105 transition-transform shrink-0">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div className="leading-tight overflow-hidden transition-all duration-200">
                <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white font-display block truncate">
                  {t.appName}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 truncate">
                  {t.appSub}
                </span>
              </div>
            </button>

            {/* Collapse Trigger on Desktop */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                title={isVi ? 'Thu gọn thanh bên' : 'Collapse sidebar'}
                className="hidden md:flex p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          /* When collapsed: hide logo, show clean centered expand button */
          onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title={isVi ? 'Mở rộng thanh bên' : 'Expand sidebar'}
              className="hidden md:flex p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all cursor-pointer items-center justify-center"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          )
        )}

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
      <div className="flex-1 overflow-y-auto px-2.5 sm:px-3 py-4 space-y-1.5">
        {/* Section 1: Main Modules */}
        {!isCollapsed ? (
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {isVi ? 'Phân hệ chính' : 'Main Modules'}
          </div>
        ) : (
          <div className="w-6 h-0.5 bg-slate-200 dark:bg-slate-800 mx-auto my-2 rounded-full" />
        )}

        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center transition-all cursor-pointer rounded-xl ${
                  isCollapsed
                    ? 'justify-center p-3'
                    : 'gap-3 px-3 py-2.5 text-xs font-semibold'
                } ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    isActive ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}

        {/* Section 2: System Admin */}
        {currentUser?.role === 'ADMIN' && (
          <div className="pt-3">
            {!isCollapsed ? (
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                {isVi ? 'Quản trị hệ thống' : 'System Admin'}
              </div>
            ) : (
              <div className="w-6 h-0.5 bg-purple-200 dark:bg-purple-900/60 mx-auto my-2 rounded-full" />
            )}

            {adminItems
              .filter((item) => item.show)
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center transition-all cursor-pointer rounded-xl ${
                      isCollapsed
                        ? 'justify-center p-3'
                        : 'justify-between px-3 py-2.5 text-xs font-semibold'
                    } ${
                      isActive
                        ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-purple-500/80'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!isCollapsed && item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/80 text-purple-700 dark:text-purple-300">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {/* 3. SIDEBAR FOOTER: Log out is removed per user request */}
      {!currentUser && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80">
          <button
            onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
            title={isCollapsed ? (isVi ? 'Đăng nhập' : 'Sign In') : undefined}
            className={`w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-semibold shadow-xs flex items-center justify-center transition-all cursor-pointer ${
              isCollapsed ? 'px-0' : 'px-3 gap-2'
            }`}
          >
            <LogIn className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>{isVi ? 'Đăng nhập' : 'Sign In'}</span>}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex flex-col shrink-0 h-screen sticky top-0 z-30 transition-all duration-300 ease-in-out">
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
