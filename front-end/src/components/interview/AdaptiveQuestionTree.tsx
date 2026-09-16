import React from 'react';
import { Sparkles, HelpCircle, CornerDownRight } from 'lucide-react';
import { VivaQuestion } from '../../types';
import { Language } from '../../utils/i18n';

interface AdaptiveQuestionTreeProps {
  currentQuestion: VivaQuestion;
  currentQuestionIndex: number;
  totalQuestions: number;
  hasAdaptiveFollowUpActive: boolean;
  activeFollowUpText?: string;
  isSimpleMode?: boolean;
  language?: Language;
}

export const AdaptiveQuestionTree: React.FC<AdaptiveQuestionTreeProps> = ({
  currentQuestion,
  currentQuestionIndex,
  totalQuestions,
  hasAdaptiveFollowUpActive,
  activeFollowUpText,
  isSimpleMode = true,
  language = 'vi',
}) => {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
      {/* Current Question Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold items-center justify-center">
            {currentQuestionIndex + 1}
          </span>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-display">
            {language === 'vi'
              ? `Câu hỏi ${currentQuestionIndex + 1} / ${totalQuestions}`
              : `Question ${currentQuestionIndex + 1} of ${totalQuestions}`}
          </h4>
        </div>
        <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900">
          {currentQuestion.topic}
        </span>
      </div>

      {/* Main Question Text */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
          "{currentQuestion.questionText}"
        </p>
      </div>

      {/* Adaptive Follow-up Probe branch */}
      {hasAdaptiveFollowUpActive && activeFollowUpText && (
        <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              {language === 'vi' ? 'Giám khảo hỏi thêm (Phát triển tư duy):' : 'AI Examiner Follow-Up Question:'}
            </span>
          </div>
          <p className="italic text-xs font-medium pl-1">
            "{activeFollowUpText}"
          </p>
        </div>
      )}
    </div>
  );
};
