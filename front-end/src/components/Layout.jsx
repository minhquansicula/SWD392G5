// ============================================================
// AIVES — Layout Component (App Shell)
// ============================================================
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { GraduationCap, BookOpen, Calendar, BarChart3, } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Role } from '../types';
import { mockUsers } from '../mocks/data';
export default function Layout() {
    const { currentUser, switchToUser } = useAuthStore();
    const location = useLocation();
    // Hide layout in viva room (full-screen mode)
    if (location.pathname.startsWith('/viva/')) {
        return <Outlet />;
    }
    const isLecturer = currentUser.role === Role.LECTURER;
    const lecturerLinks = [
        { to: '/exams', icon: BookOpen, label: 'Exams' },
        { to: '/analytics/exam-001', icon: BarChart3, label: 'Analytics' },
    ];
    const studentLinks = [
        { to: '/my-schedules', icon: Calendar, label: 'My Schedules' },
    ];
    const navLinks = isLecturer ? lecturerLinks : studentLinks;
    return (<div className="flex h-screen bg-surface-950">
      {/* Sidebar */}
      <aside className="w-64 glass flex flex-col border-r border-surface-800">
        {/* Logo */}
        <div className="p-6 border-b border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white"/>
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">AIVES</h1>
              <p className="text-xs text-surface-200/60">AI Viva Exam System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navLinks.map((link) => (<NavLink key={link.to} to={link.to} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30'
                : 'text-surface-200/70 hover:bg-surface-800/50 hover:text-surface-100'}`}>
              <link.icon className="w-4 h-4"/>
              {link.label}
            </NavLink>))}
        </nav>

        {/* Role Switcher */}
        <div className="p-4 border-t border-surface-800">
          <p className="text-xs text-surface-200/40 mb-2 uppercase tracking-wider">Switch User</p>
          <div className="space-y-1">
            {mockUsers.map((user) => (<button key={user.id} onClick={() => switchToUser(user.id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${currentUser.id === user.id
                ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30'
                : 'text-surface-200/60 hover:bg-surface-800/50 hover:text-surface-100'}`}>
                <div className={`w-2 h-2 rounded-full ${user.role === Role.LECTURER ? 'bg-accent-500' : 'bg-primary-400'}`}/>
                <span className="truncate">{user.fullName}</span>
                <span className="ml-auto text-[10px] opacity-50">{user.role}</span>
              </button>))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 glass-light border-b border-surface-800 flex items-center justify-between px-6">
          <div>
            <p className="text-sm text-surface-200/60">
              {isLecturer ? 'Lecturer Dashboard' : 'Student Portal'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-surface-100">{currentUser.fullName}</p>
              <p className="text-xs text-surface-200/50">{currentUser.role}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-bold">
              {currentUser.fullName.charAt(0)}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>);
}
