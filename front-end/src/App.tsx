import React, { useState, useEffect } from 'react';
import {
  ModuleType,
  ExamSubView,
  Exam,
  StudentAssignment,
  StudentEvaluationReport,
  ClassAnalyticsData,
  UserAccount,
} from './types';
import {
  mockExams,
  mockStudentAssignments,
  mockStudentEvaluation,
  mockClassAnalytics,
} from './data/mockData';
import { Language } from './utils/i18n';
import { Sidebar } from './components/common/Sidebar';
import { TopBar } from './components/common/TopBar';
import { ExamListPage } from './components/exams/ExamListPage';
import { CreateExamModal } from './components/exams/CreateExamModal';
import { StudentAssignmentPage } from './components/exams/StudentAssignmentPage';
import { ExamDetailPage } from './components/exams/ExamDetailPage';
import { LiveVivaRoom } from './components/interview/LiveVivaRoom';
import { ResultAnalyticsView } from './components/analytics/ResultAnalyticsView';
import { UserManagementPage } from './components/admin/UserManagementPage';
import { CourseManagementPage } from './components/admin/CourseManagementPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { AuthModal } from './components/auth/AuthModal';
import { AuthLandingPage } from './components/auth/AuthLandingPage';
import {
  getCurrentSession,
  clearSession,
} from './services/authService';

export default function App() {
  // Authentication & Current User Session
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getCurrentSession());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Navigation & View state
  const [activeModule, setActiveModule] = useState<ModuleType>('exams');
  const [examSubView, setExamSubView] = useState<ExamSubView>('list');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
  }, [currentUser, activeModule]);

  // Active Entities
  const [exams, setExams] = useState<Exam[]>(mockExams);
  const [assignments, setAssignments] = useState<StudentAssignment[]>(mockStudentAssignments);
  const [selectedExam, setSelectedExam] = useState<Exam>(mockExams[0]);
  const [selectedCandidate, setSelectedCandidate] = useState<StudentAssignment>(mockStudentAssignments[0]);

  // Analytics Data
  const [studentReport, setStudentReport] = useState<StudentEvaluationReport>(mockStudentEvaluation);
  const [classAnalytics, setClassAnalytics] = useState<ClassAnalyticsData>(mockClassAnalytics);

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

  // Handle creating a new exam
  const handleCreateExam = (newExam: Exam) => {
    setExams([newExam, ...exams]);
    setSelectedExam(newExam);
    setExamSubView('detail');
  };

  // Launch Live Viva
  const handleLaunchViva = (exam: Exam, candidate?: StudentAssignment) => {
    setSelectedExam(exam);
    if (candidate) {
      setSelectedCandidate(candidate);
    } else {
      const cand = assignments.find((a) => a.examId === exam.id) || assignments[0];
      setSelectedCandidate(cand);
    }
    setActiveModule('interview');
  };

  // Finish Viva -> updates candidate score and navigates to report
  const handleFinishViva = (score: number = 44) => {
    const updated = assignments.map((a) =>
      a.id === selectedCandidate.id
        ? { ...a, status: 'completed' as const, score }
        : a
    );
    setAssignments(updated);

    setStudentReport({
      ...studentReport,
      totalScore: score,
      evaluatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    setActiveModule('analytics');
  };

  // Logout Handler
  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setActiveModule('exams');
    setExamSubView('list');
  };

  // Refresh current user session from storage (e.g. after Admin role updates)
  const handleRefreshCurrentUser = () => {
    const session = getCurrentSession();
    setCurrentUser(session);
  };

  // Dedicated Authentication Landing Page with moving gradient animation
  if (!currentUser) {
    return (
      <div className={isDarkMode ? 'dark' : ''}>
        <AuthLandingPage
          onLoginSuccess={(user) => {
            setCurrentUser(user);
          }}
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
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        isSoundEnabled={isSoundEnabled}
        setIsSoundEnabled={setIsSoundEnabled}
        language={language}
        setLanguage={setLanguage}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Slim Top Bar */}
        <TopBar
          activeModule={activeModule}
          language={language}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          currentUser={currentUser}
        />

        {/* Main View Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* MODULE 1: EXAM & SCHEDULE MANAGEMENT */}
          {activeModule === 'exams' && (
            <>
              {examSubView === 'list' && (
                <ExamListPage
                  exams={exams}
                  onSelectExam={(exam, view) => {
                    setSelectedExam(exam);
                    setExamSubView(view);
                  }}
                  onLaunchViva={(exam) => handleLaunchViva(exam)}
                  onOpenCreateExam={() => setIsCreateModalOpen(true)}
                  onViewAnalytics={(examId) => {
                    const ex = exams.find((e) => e.id === examId) || exams[0];
                    setSelectedExam(ex);
                    setActiveModule('analytics');
                  }}
                  language={language}
                />
              )}

              {examSubView === 'detail' && (
                <ExamDetailPage
                  exam={selectedExam}
                  onBack={() => setExamSubView('list')}
                  onLaunchViva={() => handleLaunchViva(selectedExam)}
                  onGoToAssignments={() => setExamSubView('assignment')}
                  onGoToAnalytics={() => setActiveModule('analytics')}
                />
              )}

              {examSubView === 'assignment' && (
                <StudentAssignmentPage
                  exam={selectedExam}
                  assignments={assignments.filter((a) => a.examId === selectedExam.id)}
                  onBack={() => setExamSubView('list')}
                  onLaunchVivaForStudent={(candidate) =>
                    handleLaunchViva(selectedExam, candidate)
                  }
                  onUpdateAssignments={(updated) => {
                    const other = assignments.filter((a) => a.examId !== selectedExam.id);
                    setAssignments([...other, ...updated]);
                  }}
                />
              )}
            </>
          )}

          {/* MODULE 2: LIVE AI VIVA ORAL INTERVIEW */}
          {activeModule === 'interview' && (
            <LiveVivaRoom
              exam={selectedExam}
              candidate={selectedCandidate}
              onFinishViva={handleFinishViva}
              onExit={() => {
                setActiveModule('exams');
                setExamSubView('list');
              }}
              isSoundEnabled={isSoundEnabled}
              language={language}
            />
          )}

          {/* MODULE 3: RESULT & ANALYTICS DASHBOARD */}
          {activeModule === 'analytics' && (
            <ResultAnalyticsView
              report={studentReport}
              analytics={classAnalytics}
              assignments={assignments}
              language={language}
              onSelectCandidate={(candId) => {
                if (candId === 'stu-9922') {
                  setStudentReport({
                    ...studentReport,
                    studentId: 'stu-9922',
                    studentName: 'Marcus Chen',
                    matriculationNo: 'CS2023-8849',
                    totalScore: 38,
                    percentage: 76,
                    gradeLetter: 'B+',
                    cohortPercentile: 72.4,
                    durationSpentMinutes: 15.0,
                  });
                } else {
                  setStudentReport(mockStudentEvaluation);
                }
              }}
            />
          )}

          {/* MODULE 4: ADMIN USER & ROLE MANAGEMENT */}
          {activeModule === 'admin' && currentUser?.role === 'ADMIN' && (
            <UserManagementPage
              language={language}
              currentUserId={currentUser?.id}
              onRefreshCurrentUser={handleRefreshCurrentUser}
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

          {/* MODULE 6: SYSTEM SETTINGS */}
          {activeModule === 'settings' && (
            <SettingsPage
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
              isSoundEnabled={isSoundEnabled}
              setIsSoundEnabled={setIsSoundEnabled}
              language={language}
              setLanguage={setLanguage}
              currentUser={currentUser}
            />
          )}
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

      {/* Create Exam Wizard Modal */}
      <CreateExamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateExam={handleCreateExam}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        language={language}
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    </div>
  );
}
