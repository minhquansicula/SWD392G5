import React from 'react';
import { Menu, CalendarDays, Radio, BarChart3, ShieldCheck } from 'lucide-react';
import { ModuleType, UserAccount } from '../../types';
import { Language, translations } from '../../utils/i18n';

interface TopBarProps {
  activeModule: ModuleType;
  language: Language;
  onOpenMobileSidebar: () => void;
  currentUser?: UserAccount | null;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeModule,
  language,
  onOpenMobileSidebar,
  currentUser,
}) => {
  const t = translations[language];
  const isVi = language === 'vi';

  const getModuleInfo = () => {
    switch (activeModule) {
      case 'exams':
        return {
          title: t.navExams,
          subtitle: isVi ? 'Quản lý lịch thi, cấu hình đề thi & hội đồng' : 'Exam schedules & configuration',
          icon: <CalendarDays className="w-4 h-4 text-indigo-500" />,
        };
      case 'interview':
        return {
          title: t.navInterview,
          subtitle: isVi ? 'Phiên vấn đáp 1-kèm-1 trực tiếp với Giám khảo AI' : 'Live 1-on-1 AI Oral examination',
          icon: <Radio className="w-4 h-4 text-rose-500" />,
        };
      case 'analytics':
        return {
          title: t.navAnalytics,
          subtitle: isVi ? 'Báo cáo năng lực, phân tích rubric & phúc khảo' : 'Competency reports & analytics',
          icon: <BarChart3 className="w-4 h-4 text-indigo-500" />,
        };
      case 'admin':
        return {
          title: t.navAdmin,
          subtitle: isVi ? 'Phân quyền tài khoản & danh sách người dùng' : 'User roles & system access',
          icon: <ShieldCheck className="w-4 h-4 text-purple-500" />,
        };
      default:
        return {
          title: t.appName,
          subtitle: t.appSub,
          icon: null,
        };
    }
  };

  const moduleInfo = getModuleInfo();

  return (
    <header className="sticky top-0 z-20 w-full h-14 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 transition-colors flex items-center justify-between px-4 sm:px-6">
      {/* Left: Mobile hamburger + Active Module breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 shrink-0">
            {moduleInfo.icon}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              {moduleInfo.title}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block leading-tight">
              {moduleInfo.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Status Pill */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>AIVES Online</span>
        </div>
      </div>
    </header>
  );
};
