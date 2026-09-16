import React from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  HelpCircle,
  Award,
  Bot,
  Layers,
  CheckCircle2,
  Users,
  PlayCircle,
  BarChart3,
  BookOpen,
  Sparkles,
  GitBranch,
} from 'lucide-react';
import { Exam } from '../../types';
import { Badge } from '../common/Badge';

interface ExamDetailPageProps {
  exam: Exam;
  onBack: () => void;
  onLaunchViva: () => void;
  onGoToAssignments: () => void;
  onGoToAnalytics: () => void;
}

export const ExamDetailPage: React.FC<ExamDetailPageProps> = ({
  exam,
  onBack,
  onLaunchViva,
  onGoToAssignments,
  onGoToAnalytics,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {exam.code}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-display">
                {exam.title}
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {exam.course} • {exam.department} • {exam.term}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onGoToAssignments}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Users className="h-3.5 w-3.5 text-indigo-500" />
            <span>Manage Candidates ({exam.assignedCandidateCount})</span>
          </button>

          {exam.completedCandidateCount > 0 && (
            <button
              onClick={onGoToAnalytics}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
              <span>Class Analytics</span>
            </button>
          )}

          <button
            onClick={onLaunchViva}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 transition-all hover:scale-[1.02]"
          >
            <PlayCircle className="h-4 w-4" />
            <span>Enter Viva Room</span>
          </button>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
            Oral Window
          </span>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-indigo-500" />
            {exam.vivaDurationMin} minutes / student
          </p>
          <span className="text-[11px] text-slate-400 block mt-1">
            Standard oral slot length
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
            Primary Question Bank
          </span>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-cyan-500" />
            {exam.totalQuestions} Socratic Items
          </p>
          <span className="text-[11px] text-slate-400 block mt-1">
            With dynamic follow-up triggers
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
            Pass Threshold
          </span>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
            <Award className="h-4 w-4 text-amber-500" />
            {exam.passingMarks}/{exam.totalMarks} pts (
            {Math.round((exam.passingMarks / exam.totalMarks) * 100)}%)
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-1">
            Faculty calibrated
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
            AI Examiner Agent
          </span>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5 truncate">
            <Bot className="h-4 w-4 text-indigo-500" />
            {exam.examinerConfig.name}
          </p>
          <span className="text-[11px] text-slate-400 block mt-1 capitalize">
            {exam.examinerConfig.persona.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Question Blueprint & Adaptive Branches */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                  Socratic Question Blueprint & Adaptive Probes
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Each foundational question includes adaptive branches triggered by the depth of candidate answers.
                </p>
              </div>
              <Badge variant="purple">
                <GitBranch className="h-3.5 w-3.5 mr-1" />
                Adaptive AI Branching
              </Badge>
            </div>

            <div className="space-y-4">
              {exam.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {q.topic}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          q.difficulty === 'advanced'
                            ? 'danger'
                            : q.difficulty === 'intermediate'
                            ? 'warning'
                            : 'success'
                        }
                        size="sm"
                      >
                        {q.difficulty}
                      </Badge>
                      <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {q.maxMarks} pts
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    "{q.questionText}"
                  </p>

                  {/* Expected Concepts */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Expected Key Concepts:
                    </span>
                    {q.expectedConcepts.map((concept, ci) => (
                      <span
                        key={ci}
                        className="px-2 py-0.5 text-[10px] rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>

                  {/* Adaptive Follow-up Branches */}
                  {q.adaptiveFollowUps && q.adaptiveFollowUps.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Dynamic Adaptive Probes ({q.adaptiveFollowUps.length}):
                      </span>
                      {q.adaptiveFollowUps.map((probe, pi) => (
                        <div
                          key={pi}
                          className="pl-3 border-l-2 border-indigo-400 text-xs text-slate-600 dark:text-slate-400 italic"
                        >
                          <span className="font-semibold not-italic text-slate-700 dark:text-slate-300">
                            Trigger [{probe.condition.replace('_', ' ')}]:{' '}
                          </span>
                          "{probe.probeQuestion}"
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Syllabus Coverage & Rubric Matrix */}
        <div className="space-y-6">
          {/* Syllabus Topics */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-display mb-3">
              Assessed Syllabus Topics
            </h3>
            <ul className="space-y-2">
              {exam.syllabusTopics.map((topic, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Rubric Weights */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-display mb-1">
              Assessment Rubric
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Automated scoring weights applied by the AI Examiner
            </p>

            <div className="space-y-3">
              {exam.rubric.map((r) => (
                <div key={r.id} className="text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                    <span>{r.name}</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                      {r.weight}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full"
                      style={{ width: `${r.weight}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {r.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
