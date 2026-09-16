import React from 'react';
import { Clock, ShieldCheck, HelpCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '../common/Badge';

interface ExamTimerProgressProps {
  remainingSeconds: number;
  totalSeconds: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  examCode: string;
}

export const ExamTimerProgress: React.FC<ExamTimerProgressProps> = ({
  remainingSeconds,
  totalSeconds,
  currentQuestionIndex,
  totalQuestions,
  examCode,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = remainingSeconds < 120; // less than 2 mins
  const progressPercent = Math.min(
    100,
    Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)
  );

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
      {/* Question Counter & Progress */}
      <div className="flex items-center gap-4 flex-1 min-w-[220px]">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Progress
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono">
              Question {currentQuestionIndex + 1}
            </span>
            <span className="text-xs text-slate-400">of {totalQuestions}</span>
          </div>
        </div>

        {/* Mini progress bar */}
        <div className="flex-1 max-w-xs">
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span>Progress</span>
            <span className="font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Proctoring Status Pill */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span>Audio AI Proctor Active</span>
      </div>

      {/* Countdown Timer with Warning state */}
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
            isLowTime
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 animate-pulse'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
          }`}
        >
          <Clock
            className={`h-4 w-4 ${
              isLowTime ? 'text-rose-600 animate-spin' : 'text-indigo-500'
            }`}
          />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">
              Time Remaining
            </span>
            <span className="font-mono font-bold text-base sm:text-lg">
              {formatTime(remainingSeconds)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
