import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, BookMarked, CalendarDays, FileQuestion, BarChart3, Users, PanelLeftClose, PanelLeftOpen, GraduationCap, X } from 'lucide-react';
import type { ModuleType, UserAccount } from '../../types';
import type { Language } from '../../utils/i18n';
import { Button } from '../ui';
import { lockBodyScroll } from '../../utils/scrollLock';

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

export function Sidebar({ language, currentUser, isOpenMobile, onCloseMobile, isCollapsed, onToggleCollapse }: SidebarProps) {
  const vi = language === 'vi';
  const role = currentUser?.role;
  const drawer = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!isOpenMobile) return;
    const previous = document.activeElement as HTMLElement | null;
    const unlock = lockBodyScroll();
    const dialog = drawer.current;
    dialog?.showModal();
    const query = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => { if (query.matches) onCloseMobile?.(); };
    query.addEventListener('change', closeOnDesktop);
    return () => { dialog?.close(); unlock(); if (previous?.isConnected) previous.focus(); query.removeEventListener('change', closeOnDesktop); };
  }, [isOpenMobile, onCloseMobile]);

  const items = [
    { id: 'exams', icon: CalendarDays, label: vi ? (role === 'STUDENT' ? 'Lịch thi của tôi' : 'Kỳ thi & Lịch thi') : (role === 'STUDENT' ? 'My examinations' : 'Examinations'), show: true },
    { id: 'questions', icon: FileQuestion, label: vi ? 'Ngân hàng câu hỏi' : 'Question bank', show: role !== 'STUDENT' },
    { id: 'materials', icon: BookMarked, label: vi ? 'Học liệu & Rubric' : 'Materials & rubrics', show: role === 'LECTURER' },
    { id: 'analytics', icon: BarChart3, label: vi ? (role === 'STUDENT' ? 'Kết quả của tôi' : 'Kết quả & Phân tích') : (role === 'STUDENT' ? 'My results' : 'Results & analytics'), show: true },
  ];
  const admin = [
    { id: 'admin', icon: Users, label: vi ? 'Tài khoản' : 'Accounts', show: role === 'ADMIN' },
    { id: 'courses', icon: BookOpen, label: vi ? 'Môn học' : 'Courses', show: role === 'ADMIN' },
  ];
  const content = (collapsed: boolean, mobile = false) => <div className={`flex h-full flex-col bg-[var(--surface)] ${collapsed ? 'w-20' : 'w-64'}`}>
    <div className={`flex h-20 shrink-0 items-center gap-3 px-5 ${collapsed ? 'justify-center px-2' : ''}`}>
      <NavLink to="/exams" onClick={mobile ? onCloseMobile : undefined} aria-label={vi ? 'AIVES · Trang kỳ thi' : 'AIVES · Examinations'} className="flex min-w-0 items-center gap-3 rounded-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#172b3a] text-white"><GraduationCap aria-hidden="true" className="h-6 w-6" /></div>
        {!collapsed && <div><span className="block text-xl font-bold tracking-tight">AIVES<span className="text-[var(--primary)]">.</span></span><span className="text-xs text-[var(--muted)]">{vi ? 'Không gian khảo thí' : 'Examination workspace'}</span></div>}
      </NavLink>
      {mobile && <Button className="ui-icon-button ml-auto" aria-label={vi ? 'Đóng điều hướng' : 'Close navigation'} onClick={onCloseMobile}><X aria-hidden="true" className="h-4 w-4" /></Button>}
    </div>
    <nav aria-label={vi ? 'Điều hướng chính' : 'Main navigation'} className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {[{ label: vi ? 'Không gian làm việc' : 'Workspace', links: items }, { label: vi ? 'Quản trị' : 'Administration', links: admin }].filter(group => group.links.some(item => item.show)).map(group => <div key={group.label}>
        {!collapsed && <p className="mb-3 px-3 text-xs font-medium text-[var(--muted)]">{group.label}</p>}
        <div className="space-y-1">{group.links.filter(item => item.show).map(({ id, label, icon: Icon }) => <NavLink key={id} to={`/${id}`} onClick={mobile ? onCloseMobile : undefined} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined} className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]'}`}>
          <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />{!collapsed && <span>{label}</span>}
        </NavLink>)}</div>
      </div>)}
    </nav>
    <div className="border-t border-[var(--line)] p-3">
      {!collapsed && <p className="px-3 pb-4 pt-2 text-xs leading-relaxed text-[var(--muted)]">{vi ? 'AI hỗ trợ đánh giá. Giảng viên quyết định điểm chính thức.' : 'AI assists evaluation. Lecturers determine official grades.'}</p>}
      {!mobile && <button onClick={onToggleCollapse} aria-label={vi ? (collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên') : (collapsed ? 'Expand sidebar' : 'Collapse sidebar')} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg text-xs text-[var(--muted)] hover:bg-[var(--surface-muted)]">{collapsed ? <PanelLeftOpen aria-hidden="true" className="h-4 w-4" /> : <><PanelLeftClose aria-hidden="true" className="h-4 w-4" /><span>{vi ? 'Thu gọn thanh bên' : 'Collapse sidebar'}</span></>}</button>}
    </div>
  </div>;

  return <>
    <aside className="sticky top-0 hidden h-dvh shrink-0 border-r border-[var(--line)] md:block">{content(!!isCollapsed)}</aside>
    {isOpenMobile && <dialog ref={drawer} aria-label={vi ? 'Điều hướng' : 'Navigation'} onCancel={event => { event.preventDefault(); onCloseMobile?.(); }} onClick={event => { if (event.target === event.currentTarget) onCloseMobile?.(); }} className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none max-w-[90vw] border-0 bg-transparent p-0 text-[var(--ink)]">{content(false, true)}</dialog>}
  </>;
}
