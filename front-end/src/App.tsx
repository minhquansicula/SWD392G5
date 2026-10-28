import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import {
  ModuleType,
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
import { CourseMaterialsPage } from './components/materials/CourseMaterialsPage';
import { AuthLandingPage } from './components/auth/AuthLandingPage';
import { SetPasswordPage } from './components/auth/SetPasswordPage';
import {
  verifyCurrentSession,
  clearSession,
} from './services/authService';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  // Authentication & Current User Session
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [sessionAttempt, setSessionAttempt] = useState(0);

  const isPasswordLink = location.pathname === '/set-password';
  const passwordLinkToken = isPasswordLink ? new URLSearchParams(location.search).get('token') || '' : null;

  // Navigation & View state
  const routeModule = location.pathname.split('/')[1] as ModuleType;
  const activeModule: ModuleType = ['exams', 'questions', 'materials', 'analytics', 'admin', 'courses'].includes(routeModule) ? routeModule : 'exams';
  const setActiveModule = (module: ModuleType) => navigate(`/${module}`);
  const resultParams = new URLSearchParams(location.search);
  const selectedResultExamId = resultParams.get('exam');
  const selectedResultScheduleId = resultParams.get('schedule');

  const handleNavigateToResults = (examId?: string, scheduleId?: string) => {
    const params = new URLSearchParams();
    if (examId) params.set('exam', examId);
    if (scheduleId) params.set('schedule', scheduleId);
    navigate(`/analytics${params.size ? `?${params}` : ''}`);
  };
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
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
  const [language, setLanguage] = useState<Language>(() => {
    try { return localStorage.getItem('aives_language') === 'en' ? 'en' : 'vi'; } catch { return 'vi'; }
  });
  useEffect(() => {
    document.documentElement.lang = language;
    try { localStorage.setItem('aives_language', language); } catch {}
  }, [language]);

  useEffect(() => {
    const labels: Record<ModuleType, string> = { exams: language === 'vi' ? 'Kỳ thi' : 'Examinations', questions: language === 'vi' ? 'Ngân hàng câu hỏi' : 'Question bank', materials: language === 'vi' ? 'Học liệu & Rubric' : 'Materials & rubrics', analytics: language === 'vi' ? 'Kết quả' : 'Results', admin: language === 'vi' ? 'Tài khoản' : 'Accounts', courses: language === 'vi' ? 'Môn học' : 'Courses' };
    document.title = `${isPasswordLink ? (language === 'vi' ? 'Thiết lập mật khẩu' : 'Set password') : labels[activeModule]} · AIVES`;
  }, [activeModule, language, isPasswordLink]);

  useEffect(() => {
    if (!currentUser) return;
    document.getElementById('main-content')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    closeMobileSidebar();
  }, [location.pathname, currentUser?.id, closeMobileSidebar]);

  useEffect(() => {
    if (!currentUser || isPasswordLink) return;
    const allowed = currentUser.role === 'ADMIN'
      ? ['exams', 'questions', 'analytics', 'admin', 'courses']
      : currentUser.role === 'LECTURER' ? ['exams', 'questions', 'materials', 'analytics'] : ['exams', 'analytics'];
    if (!allowed.includes(routeModule)) navigate(currentUser.role === 'ADMIN' ? '/admin' : '/exams', { replace: true });
  }, [currentUser, routeModule, navigate, isPasswordLink]);


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
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);


  // Leave the set-password page and drop the token from the URL.
  // A changed password requires a fresh login; an unusable link leaves any current session alone.
  const handlePasswordLinkDone = (passwordChanged: boolean) => {
    navigate('/exams', { replace: true });
    if (passwordChanged) {
      clearSession();
      setCurrentUser(null);
    }
  };

  if (isPasswordLink) {
    return (
      <SetPasswordPage
        key={passwordLinkToken}
        token={passwordLinkToken || ''}
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

  // Authentication uses the same semantic theme as the application workspace.
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
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] flex font-sans transition-colors duration-200">
      <a href="#main-content" className="skip-link" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>{language === 'vi' ? 'Đến nội dung chính' : 'Skip to main content'}</a>
      {/* Modern Left Sidebar Navigation */}
      <Sidebar
        activeModule={activeModule}
        setActiveModule={(m) => {
          setActiveModule(m);
        }}
        language={language}
        currentUser={currentUser}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
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
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={toggleSidebarCollapse}
        />

        {/* Main View Container */}
        <main id="main-content" tabIndex={-1} className="workspace flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-7 lg:px-9 py-7 lg:py-9 outline-none">
          <div key={activeModule} className="animate-tab-enter">
          {/* MODULE 1: EXAM & SCHEDULE MANAGEMENT */}
          {activeModule === 'exams' && (currentUser.role === 'LECTURER' || currentUser.role === 'ADMIN') && (
            <LecturerExamManagement
              key={`${currentUser.id}-exams`}
              currentUser={currentUser}
              language={language}
              onNavigateToResults={handleNavigateToResults}
            />
          )}
          {activeModule === 'exams' && currentUser.role === 'STUDENT' && (
            <StudentScheduleList
              key={currentUser.id}
              currentUser={currentUser}
              language={language}
              onNavigateToResults={(scheduleId) => handleNavigateToResults(undefined, scheduleId)}
            />
          )}

          {/* MODULE: QUESTION BANK MANAGEMENT (LECTURER & ADMIN) */}
          {activeModule === 'questions' && (currentUser.role === 'LECTURER' || currentUser.role === 'ADMIN') && (
            <QuestionBankPage currentUser={currentUser} language={language} />
          )}

          {/* MODULE: COURSE MATERIALS & AI RUBRICS (LECTURER ONLY) */}
          {activeModule === 'materials' && currentUser.role === 'LECTURER' && (
            <CourseMaterialsPage key={currentUser.id} currentUser={currentUser} language={language} />
          )}


          {/* MODULE 3: RESULT & ANALYTICS DASHBOARD */}
          {activeModule === 'analytics' && (
            <ResultAnalyticsView
              language={language}
              currentUser={currentUser}
              initialExamId={selectedResultExamId || undefined}
              initialScheduleId={selectedResultScheduleId || undefined}
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
        <footer className="border-t border-[var(--line)] py-5 text-xs text-[var(--muted)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white font-display">
                AIVES
              </span>
              <span>· {language === 'vi' ? 'Không gian khảo thí' : 'Examination workspace'}</span>
            </div>
            <div className="flex items-center gap-4">
              <span>{language === 'vi' ? 'AI hỗ trợ · Giảng viên thẩm định' : 'AI-assisted · Lecturer-reviewed'}</span>
            </div>
          </div>
        </footer>
      </div>

      

    </div>
  );
}
