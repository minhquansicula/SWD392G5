import React, { useState } from 'react';
import {
  X,
  Layers,
  FolderTree,
  Palette,
  LayoutTemplate,
  Code2,
  CheckCircle2,
  Copy,
} from 'lucide-react';

interface SystemSpecModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemSpecModal: React.FC<SystemSpecModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<
    'pages' | 'components' | 'mockups' | 'structure' | 'tailwind'
  >('pages');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                AIVES Front-End UI Architecture & Specifications
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Complete engineering documentation, page tree, component taxonomy & Tailwind recommendations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/30 dark:bg-slate-900/30 overflow-x-auto">
          {[
            { id: 'pages', label: '1. Page Hierarchy', icon: Layers },
            { id: 'components', label: '2. Component Hierarchy', icon: FolderTree },
            { id: 'mockups', label: '3. UI Mockup Descriptions', icon: LayoutTemplate },
            { id: 'structure', label: '4. React Component Structure', icon: Code2 },
            { id: 'tailwind', label: '5. Tailwind Guidelines', icon: Palette },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
          {activeTab === 'pages' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Hierarchical Route & Navigation Structure
                </h3>
                <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-medium">
                  3 Primary Modules + Modals
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                <pre>{`AIVES Root Application (SPA)
├── 1. Module: Exam & Schedule Management (/exams)
│   ├── Exam List Page (Default Landing)
│   │   ├── Status filter tabs (All, In Progress, Scheduled, Completed, Draft)
│   │   ├── Metric overview cards (Active cohorts, pending reviews, avg scores)
│   │   └── Search, sorting & batch operations
│   ├── Create Exam Wizard (/exams/create)
│   │   ├── Step 1: Course & Metadata Specs
│   │   ├── Step 2: Syllabus Topics & Competency Rubrics
│   │   ├── Step 3: AI Examiner Configuration (Persona, Voice, Strictness)
│   │   └── Step 4: Time Windows, Question Limits & Proctoring Rules
│   ├── Student Assignment Page (/exams/:id/assign)
│   │   ├── Interactive slot allocation matrix
│   │   ├── Batch CSV candidate importer
│   │   └── Notification & invitation dispatch tracker
│   └── Exam Detail Dashboard (/exams/:id)
│       ├── Syllabus mastery blueprint
│       ├── Live candidate status table
│       └── Direct launch to Viva Room or Class Analytics
│
├── 2. Module: AI Viva Oral Interview Room (/interview/:id)
│   ├── Oral Examination Chamber
│   │   ├── AI Examiner Virtual Avatar (Speaking, Listening, Socratic probing)
│   │   ├── Real-time Bi-directional Audio Waveform
│   │   ├── Live STT Transcript Stream with Confidence Scores
│   │   ├── Adaptive Question Decision Tree Visualizer
│   │   ├── Exam Countdown & Question Milestones
│   │   └── Microphone & Input Audio Controls
│   └── Completion & Submission Interstitial State
│
└── 3. Module: Results & Analytics Dashboard (/analytics)
    ├── Student Individual Evaluation Report (/analytics/student/:id)
    │   ├── Overall score, letter grade & percentile rank
    │   ├── Radar / Bar Competency Breakdown vs Cohort Benchmark
    │   ├── Question-by-Question Socratic Feedback & Knowledge Gaps
    │   └── Searchable Verbatim Transcript with sentiment markers
    └── Class Cohort Analytics Dashboard (/analytics/cohort/:id)
        ├── High-level class metrics (Pass rate, standard deviation, median)
        ├── Bell Curve / Score Distribution Histogram
        ├── Question Difficulty & Discrimination Index (Item Analysis)
        └── Topic Mastery vs Target Benchmark Gap Analysis`}</pre>
              </div>
            </div>
          )}

          {activeTab === 'components' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Component Hierarchy & Composition Tree
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-2 font-sans text-sm">
                    Common & Layout Components
                  </span>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                    <li>&lt;Header /&gt; - Navigation & Global controls</li>
                    <li>&lt;Badge /&gt; - Universal status & difficulty indicators</li>
                    <li>&lt;AudioVisualizer /&gt; - Reactive sound frequency bars</li>
                    <li>&lt;SystemSpecModal /&gt; - Architecture & spec reference</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-2 font-sans text-sm">
                    Exam Management Components
                  </span>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                    <li>&lt;ExamListPage /&gt; - Catalog, filters & KPI cards</li>
                    <li>&lt;CreateExamModal /&gt; - 4-step configuration wizard</li>
                    <li>&lt;StudentAssignmentPage /&gt; - Slot allocation scheduler</li>
                    <li>&lt;ExamDetailPage /&gt; - Syllabus breakdown & candidate roster</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-2 font-sans text-sm">
                    AI Viva Interview Components
                  </span>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                    <li>&lt;LiveVivaRoom /&gt; - Examination orchestra container</li>
                    <li>&lt;AiExaminerAvatar /&gt; - Expressive animated agent</li>
                    <li>&lt;VoiceControls /&gt; - Mic, mute, volume & simulation</li>
                    <li>&lt;TranscriptStream /&gt; - Live speech turn transcript</li>
                    <li>&lt;AdaptiveQuestionTree /&gt; - Dynamic branching view</li>
                    <li>&lt;ExamTimerProgress /&gt; - Countdown clock & question meter</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-2 font-sans text-sm">
                    Analytics & Evaluation Components
                  </span>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                    <li>&lt;ResultAnalyticsView /&gt; - Tab orchestrator</li>
                    <li>&lt;StudentScoreReport /&gt; - Individual report & radar breakdown</li>
                    <li>&lt;QuestionFeedbackList /&gt; - Expandable answer critiques</li>
                    <li>&lt;TranscriptViewer /&gt; - Searchable historical transcript</li>
                    <li>&lt;ClassAnalyticsDashboard /&gt; - Distribution & difficulty charts</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mockups' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                UI Mockup Descriptions & Visual Layouts
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-sm mb-1">
                    Exam Management & Schedule UI
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300">
                    A clean bento-grid dashboard layout featuring 4 top KPI metrics (Active Exams, Scheduled Vivas, Avg Score, Completion Rate). The main view displays responsive exam cards with rubric badges, countdown dates, candidate progress bars, and direct action triggers (Assign Candidates, View Blueprint, Start Interview).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <h4 className="font-bold text-rose-600 dark:text-rose-400 text-sm mb-1">
                    Live AI Viva Room Layout
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300">
                    A high-focus split viewport. <strong>Left Column:</strong> The animated AI Examiner Avatar featuring responsive holographic state halos (Listening, Speaking, Evaluating), live dual-frequency audio visualizer, current question prompt banner, and real-time audio controls. <strong>Right Column:</strong> Real-time streaming transcription with speaker attribution, confidence percentages, and an adaptive follow-up tree revealing real-time AI decision paths.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mb-1">
                    Result & Analytics Dashboard UI
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300">
                    Academic performance interface with dual views: (1) <strong>Student Score Report</strong> with large letter grade stamp, percentile badge, 4-pillar competency matrix benchmarked against cohort average, and question-by-question examiner critique cards; (2) <strong>Class Analytics Dashboard</strong> featuring Gaussian score distribution histogram, item discrimination index table, and topic mastery gap analysis.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'structure' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                React Component Architecture & State Strategy
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside">
                <li>
                  <strong>Clean State Separation:</strong> Exam catalog, active viva room state, and analytics records are strictly decoupled to prevent unnecessary re-renders.
                </li>
                <li>
                  <strong>Web Speech API Integration:</strong> The viva room utilizes native browser <code className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">window.speechSynthesis</code> for realistic oral examiner vocal output and interactive microphone streaming.
                </li>
                <li>
                  <strong>Adaptive Branching State Machine:</strong> Dynamic question progression tracks student depth and triggers Socratic probes based on key concept detection.
                </li>
                <li>
                  <strong>Accessible Design:</strong> ARIA labels, live speech regions (<code className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">aria-live="polite"</code>), high-contrast color ratios, and keyboard navigation support.
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'tailwind' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Tailwind CSS Styling Recommendations
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <strong className="text-slate-900 dark:text-white">Typography Hierarchy:</strong>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Headings: <code className="text-indigo-600 dark:text-indigo-400">font-display ('Be Vietnam Pro')</code> chuẩn tiếng Việt & hiện đại. Body text: <code className="text-indigo-600 dark:text-indigo-400">font-sans ('Be Vietnam Pro' / 'Inter')</code> sắc nét, tối ưu đọc tiếng Việt. Số & thời gian: <code className="text-indigo-600 dark:text-indigo-400">font-mono ('JetBrains Mono')</code>.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <strong className="text-slate-900 dark:text-white">Color Palette:</strong>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Primary Accent: <code className="text-indigo-600 dark:text-indigo-400">indigo-600 / dark:indigo-400</code> for academic rigor. Live Viva Activity: <code className="text-rose-600 dark:text-rose-400">rose-500 / dark:rose-400</code> for live recording indicators. Evaluation & Success: <code className="text-emerald-600 dark:text-emerald-400">emerald-600 / dark:emerald-400</code>.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <strong className="text-slate-900 dark:text-white">Card & Border Aesthetics:</strong>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    No extreme radiuses (capped at <code className="text-indigo-600 dark:text-indigo-400">rounded-xl</code> to <code className="text-indigo-600 dark:text-indigo-400">rounded-2xl</code>). Subtle borders with <code className="text-indigo-600 dark:text-indigo-400">border-slate-200 dark:border-slate-800</code>, flattened depth with negative space rather than nested cards.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            AIVES - AI-Powered Oral Viva Voce Examination Architecture
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Close Specifications
          </button>
        </div>
      </div>
    </div>
  );
};
