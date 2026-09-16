import React, { useState, useEffect } from 'react';
import {
  ModuleType,
  ExamSubView,
  Exam,
  StudentAssignment,
  StudentEvaluationReport,
  ClassAnalyticsData,
} from './types';
import {
  mockExams,
  mockStudentAssignments,
  mockStudentEvaluation,
  mockClassAnalytics,
} from './data/mockData';
import { Language } from './utils/i18n';
import { Header } from './components/common/Header';
import { SystemSpecModal } from './components/common/SystemSpecModal';
import { ExamListPage } from './components/exams/ExamListPage';
import { CreateExamModal } from './components/exams/CreateExamModal';
import { StudentAssignmentPage } from './components/exams/StudentAssignmentPage';
import { ExamDetailPage } from './components/exams/ExamDetailPage';
import { LiveVivaRoom } from './components/interview/LiveVivaRoom';
import { ResultAnalyticsView } from './components/analytics/ResultAnalyticsView';

export default function App() {
  // Navigation & View state
  const [activeModule, setActiveModule] = useState<ModuleType>('exams');
  const [examSubView, setExamSubView] = useState<ExamSubView>('list');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSpecsModalOpen, setIsSpecsModalOpen] = useState(false);

  // App Theme & Preferences (Default to Simple Mode & Vietnamese for clean simplicity)
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
  const [isSimpleMode, setIsSimpleMode] = useState(true);
  const [language, setLanguage] = useState<Language>('vi');

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
      // Pick first ready or in-progress candidate or default
      const cand = assignments.find((a) => a.examId === exam.id) || assignments[0];
      setSelectedCandidate(cand);
    }
    setActiveModule('interview');
  };

  // Finish Viva -> updates candidate score and navigates to report
  const handleFinishViva = (score: number = 44) => {
    // Update assignment status
    const updated = assignments.map((a) =>
      a.id === selectedCandidate.id
        ? { ...a, status: 'completed' as const, score }
        : a
    );
    setAssignments(updated);

    // Update report
    setStudentReport({
      ...studentReport,
      totalScore: score,
      evaluatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    setActiveModule('analytics');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Universal Navigation Header */}
      <Header
        activeModule={activeModule}
        setActiveModule={(m) => {
          setActiveModule(m);
          if (m === 'exams') setExamSubView('list');
        }}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        isSoundEnabled={isSoundEnabled}
        setIsSoundEnabled={setIsSoundEnabled}
        userRole={userRole}
        setUserRole={setUserRole}
        isSimpleMode={isSimpleMode}
        setIsSimpleMode={setIsSimpleMode}
        language={language}
        setLanguage={setLanguage}
        onOpenSpecsModal={() => setIsSpecsModalOpen(true)}
      />

      {/* Main Container */}
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
                isSimpleMode={isSimpleMode}
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
                  // Merge with global assignments
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
            isSimpleMode={isSimpleMode}
            language={language}
          />
        )}

        {/* MODULE 3: RESULT & ANALYTICS DASHBOARD */}
        {activeModule === 'analytics' && (
          <ResultAnalyticsView
            report={studentReport}
            analytics={classAnalytics}
            assignments={assignments}
            isSimpleMode={isSimpleMode}
            language={language}
            onSelectCandidate={(candId) => {
              if (candId === 'stu-9922') {
                // Marcus Chen
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
                // Elena Rostova
                setStudentReport(mockStudentEvaluation);
              }
            }}
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
            <button
              onClick={() => setIsSpecsModalOpen(true)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              View UI & Architecture Specs
            </button>
            <span>WCAG 2.1 AA Compliant</span>
          </div>
        </div>
      </footer>

      {/* Create Exam Wizard Modal */}
      <CreateExamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateExam={handleCreateExam}
      />

      {/* System Specifications & Architecture Modal */}
      <SystemSpecModal
        isOpen={isSpecsModalOpen}
        onClose={() => setIsSpecsModalOpen(false)}
      />
    </div>
  );
}
