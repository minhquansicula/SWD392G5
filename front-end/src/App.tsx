import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import {
  ModuleType,
  ExamSubView,
  UserAccount,
} from './types';
import { Language } from './utils/i18n';
import { Sidebar } from './components/common/Sidebar';
import { TopBar } from './components/common/TopBar';
import { StudentScheduleList } from './components/exams/student/StudentScheduleList';
import { LecturerExamManagement } from './components/exams/lecturer/LecturerExamManagement';
import { ResultAnalyticsView } from './components/analytics/ResultAnalyticsView';
import { UserManagementPage } from './components/admin/UserManagementPage';
import { CourseManagementPage } from './components/admin/CourseManagementPage';
import { QuestionBankPage } from './components/questions/QuestionBankPage';
import { AuthModal } from './components/auth/AuthModal';
import { AuthLandingPage } from './components/auth/AuthLandingPage';
import { SetPasswordPage } from './components/auth/SetPasswordPage';
import {
  verifyCurrentSession,
  clearSession,
} from './services/authService';

// One-time token from an emailed link: /#/set-password?token=...
function readPasswordLinkToken(): string | null {
  try {
    const match = window.location.hash.match(/^#\/set-password\?token=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export default function App() {
  // Authentication & Current User Session
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [passwordLinkToken, setPasswordLinkToken] = useState<string | null>(readPasswordLinkToken);

  // Navigation & View state
  const [activeModule, setActiveModule] = useState<ModuleType>('exams');
  const [examSubView, setExamSubView] = useState<ExamSubView>('list');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('aives_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('aives_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // App Theme & Preferences
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('aives_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [userRole, setUserRole] = useState<'faculty' | 'student'>('faculty');
  const [language, setLanguage] = useState<Language>('vi');

  // Sync userRole with currentUser & guard admin routes
  useEffect(() => {
    if (!currentUser && isSessionLoading) return;
    if (currentUser) {
      setUserRole(currentUser.role === 'STUDENT' ? 'student' : 'faculty');
      if (currentUser.role !== 'ADMIN' && activeModule === 'admin') {
        setActiveModule('exams');
        setExamSubView('list');
      }
    } else {
      setActiveModule('exams');
      setExamSubView('list');
    }
  }, [currentUser, activeModule, isSessionLoading]);

  // Apply dark mode class to root HTML element & persist
  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('aives_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('aives_theme', 'light');
      }
    } catch {
      // Ignore if localStorage is restricted
    }
  }, [isDarkMode]);


  // Logout Handler
  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setActiveModule('exams');
    setExamSubView('list');
  };

  // Recheck identity and permissions after login or account changes.
  const handleRefreshCurrentUser = () => {
    setCurrentUser(null);
    setSessionError('');
    setIsSessionLoading(true);
    setSessionAttempt((attempt) => attempt + 1);
  };

  useEffect(() => {
    let cancelled = false;
    verifyCurrentSession()
      .then((user) => { if (!cancelled) setCurrentUser(user); })
      .catch((error: Error) => { if (!cancelled) setSessionError(error.message); })
      .finally(() => { if (!cancelled) setIsSessionLoading(false); });
    return () => { cancelled = true; };
  }, [sessionAttempt]);

  useEffect(() => {
    const onUnauthorized = () => {
      setCurrentUser(null);
      setSessionError('');
      setIsSessionLoading(false);
      setIsAuthModalOpen(false);
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  // A link pasted into an already open tab only changes the hash, so the page does not reload.
  useEffect(() => {
    const onHashChange = () => {
      const token = readPasswordLinkToken();
      if (token) setPasswordLinkToken(token);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Leave the set-password page and drop the token from the URL.
  // A changed password requires a fresh login; an unusable link leaves any current session alone.
  const handlePasswordLinkDone = (passwordChanged: boolean) => {
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch {}
    if (passwordChanged) {
      clearSession();
      setCurrentUser(null);
    }
    setPasswordLinkToken(null);
  };

  if (passwordLinkToken) {
    return (
      <SetPasswordPage
        key={passwordLinkToken}
        token={passwordLinkToken}
        language={language}
        onDone={handlePasswordLinkDone}
      />
    );
  }

  if (isSessionLoading || sessionError) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-6 font-sans transition-colors duration-200">
        {sessionError ? (
          <div role="alert" className="max-w-md p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{sessionError}</span>
          </div>
        ) : (
          <div role="status" className="flex flex-col items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span>{language === 'vi' ? 'Đang xác nhận phiên...' : 'Verifying session...'}</span>
          </div>
        )}
        {sessionError && (
          <button
            type="button"
            onClick={handleRefreshCurrentUser}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {language === 'vi' ? 'Thử lại' : 'Retry'}
          </button>
        )}
      </main>
    );
  }

  // Dedicated Authentication Landing Page with moving gradient animation
  if (!currentUser) {
    return (
      <div className={isDarkMode ? 'dark' : ''}>
        <AuthLandingPage
          onLoginSuccess={handleRefreshCurrentUser}
          language={language}
          setLanguage={setLanguage}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans transition-colors duration-200">
      {/* Modern Left Sidebar Navigation */}
      <Sidebar
        activeModule={activeModule}
        setActiveModule={(m) => {
          setActiveModule(m);
          if (m === 'exams') setExamSubView('list');
        }}
        language={language}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Modern Utility TopBar */}
        <TopBar
          language={language}
          setLanguage={setLanguage}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={toggleSidebarCollapse}
        />

        {/* Main View Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div key={activeModule} className="animate-tab-enter">
          {/* MODULE 1: EXAM & SCHEDULE MANAGEMENT */}
          {activeModule === 'exams' && (currentUser.role === 'LECTURER' || currentUser.role === 'ADMIN') && (
            <LecturerExamManagement key={currentUser.id} currentUser={currentUser} language={language} />
          )}
          {activeModule === 'exams' && currentUser.role === 'STUDENT' && (
            <StudentScheduleList key={currentUser.id} currentUser={currentUser} language={language} />
          )}

          {/* MODULE: QUESTION BANK MANAGEMENT (LECTURER & ADMIN) */}
          {activeModule === 'questions' && (currentUser.role === 'LECTURER' || currentUser.role === 'ADMIN') && (
            <QuestionBankPage currentUser={currentUser} language={language} />
          )}


          {/* MODULE 3: RESULT & ANALYTICS DASHBOARD */}
          {activeModule === 'analytics' && (
            <ResultAnalyticsView
              language={language}
              currentUser={currentUser}
            />
          )}

          {/* MODULE 4: ADMIN USER & ROLE MANAGEMENT */}
          {activeModule === 'admin' && currentUser?.role === 'ADMIN' && (
            <UserManagementPage
              language={language}
              currentUserId={currentUser?.id}
              onNavigateToCourses={() => setActiveModule('courses')}
            />
          )}

          {/* MODULE 5: COURSE MANAGEMENT */}
          {activeModule === 'courses' && currentUser?.role === 'ADMIN' && (
            <CourseManagementPage
              language={language}
              onNavigateToUsers={() => setActiveModule('admin')}
            />
          )}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 py-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white font-display">
                AIVES
              </span>
              <span>— AI-Powered Oral Viva Voce Examination System</span>
            </div>
            <div className="flex items-center gap-4">
              <span>WCAG 2.1 AA Compliant</span>
            </div>
          </div>
        </footer>
      </div>

      

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        language={language}
        onSuccess={handleRefreshCurrentUser}
      />
    </div>
  );
}
