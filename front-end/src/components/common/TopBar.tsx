import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Sun, Moon, ChevronDown, LogOut, Languages } from 'lucide-react';
import type { UserAccount, ModuleType } from '../../types';
import type { Language } from '../../utils/i18n';
import { Button } from '../ui';

interface TopBarProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  currentUser?: UserAccount | null;
  onLogout?: () => void;
  onOpenAuthModal?: (tab?: 'login' | 'register') => void;
  onOpenMobileSidebar: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

export function TopBar({ language, setLanguage, isDarkMode, setIsDarkMode, currentUser, onLogout, onOpenMobileSidebar }: TopBarProps) {
  const vi = language === 'vi';
  const location = useLocation();
  const userMenu = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const labels: Record<ModuleType, string> = { exams: vi ? 'Kỳ thi' : 'Examinations', questions: vi ? 'Ngân hàng câu hỏi' : 'Question bank', materials: vi ? 'Học liệu & Rubric' : 'Materials & rubrics', analytics: vi ? 'Kết quả' : 'Results', admin: vi ? 'Tài khoản' : 'Accounts', courses: vi ? 'Môn học' : 'Courses' };
  const module = location.pathname.split('/')[1] as ModuleType;
  const roleLabel = currentUser?.role === 'ADMIN' ? (vi ? 'Quản trị viên' : 'Administrator') : currentUser?.role === 'LECTURER' ? (vi ? 'Giảng viên' : 'Lecturer') : (vi ? 'Sinh viên' : 'Student');
  useEffect(() => {
    const outside = (event: MouseEvent) => { if (!userMenu.current?.contains(event.target as Node)) userMenu.current?.removeAttribute('open'); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && userMenu.current?.open) { userMenu.current.open = false; trigger.current?.focus(); } };
    document.addEventListener('click', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('click', outside); document.removeEventListener('keydown', escape); };
  }, []);
  return <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 sm:px-7 lg:px-9">
    <div className="flex min-w-0 items-center gap-3"><Button className="ui-icon-button md:hidden" onClick={onOpenMobileSidebar} aria-label={vi ? 'Mở điều hướng' : 'Open navigation'}><Menu aria-hidden="true" className="h-5 w-5" /></Button><div className="min-w-0"><p className="hidden text-xs text-[var(--muted)] sm:block">{roleLabel}</p><p className="truncate text-sm font-semibold">{labels[module] || labels.exams}</p></div></div>
    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
      <Button onClick={() => setLanguage(vi ? 'en' : 'vi')} aria-label={vi ? 'Switch to English' : 'Chuyển sang tiếng Việt'} className="border-transparent px-2 sm:px-3"><Languages aria-hidden="true" className="h-4 w-4" /><span>{vi ? 'VI' : 'EN'}</span></Button>
      <Button className="ui-icon-button border-transparent" onClick={() => setIsDarkMode(!isDarkMode)} aria-label={vi ? (isDarkMode ? 'Dùng giao diện sáng' : 'Dùng giao diện tối') : (isDarkMode ? 'Use light theme' : 'Use dark theme')}>{isDarkMode ? <Sun aria-hidden="true" className="h-[18px] w-[18px]" /> : <Moon aria-hidden="true" className="h-[18px] w-[18px]" />}</Button>
      <div className="mx-1 hidden h-7 w-px bg-[var(--line)] sm:block" />
      <details ref={userMenu} className="relative">
        <summary ref={trigger} aria-label={vi ? 'Menu tài khoản' : 'Account menu'} className="flex min-h-11 list-none items-center gap-2 rounded-lg p-1.5 hover:bg-[var(--surface-muted)] [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-sm font-bold text-[var(--primary)]">{(currentUser?.fullName || currentUser?.email || 'U').split(' ').filter(Boolean).slice(-2).map(part => part[0]).join('').toUpperCase()}</span>
          <span className="hidden max-w-40 truncate text-sm font-medium lg:block">{currentUser?.fullName || currentUser?.email}</span><ChevronDown aria-hidden="true" className="hidden h-4 w-4 text-[var(--muted)] sm:block" />
        </summary>
        <div className="ui-panel absolute right-0 mt-3 w-64 max-w-[calc(100vw-2rem)] overflow-hidden p-2">
          <div className="mb-2 border-b border-[var(--line)] px-3 py-3"><p className="break-words text-sm font-semibold">{currentUser?.fullName}</p><p className="mt-1 break-all text-xs text-[var(--muted)]">{currentUser?.email}</p><span className="ui-tag mt-3">{roleLabel}</span></div>
          <button onClick={() => { userMenu.current?.removeAttribute('open'); onLogout?.(); }} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950"><LogOut aria-hidden="true" className="h-4 w-4" />{vi ? 'Đăng xuất' : 'Sign out'}</button>
        </div>
      </details>
    </div>
  </header>;
}
