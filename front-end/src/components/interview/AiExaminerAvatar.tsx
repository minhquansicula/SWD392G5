import React from 'react';
import { Bot, Sparkles, Mic, Volume2, Brain, Activity } from 'lucide-react';
import { AiExaminerConfig } from '../../types';

interface AiExaminerAvatarProps {
  config: AiExaminerConfig;
  state: 'idle' | 'speaking' | 'listening' | 'evaluating';
  audioLevel?: number;
}

export const AiExaminerAvatar: React.FC<AiExaminerAvatarProps> = ({
  config,
  state,
  audioLevel = 0,
}) => {
  const getStateColor = () => {
    switch (state) {
      case 'speaking':
        return {
          ring: 'ring-indigo-500/60 shadow-indigo-500/30',
          gradient: 'from-indigo-600 via-indigo-700 to-cyan-500',
          badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          label: 'Examiner Speaking...',
          icon: Volume2,
        };
      case 'listening':
        return {
          ring: 'ring-emerald-500/60 shadow-emerald-500/30',
          gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
          badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          label: 'Listening to Candidate...',
          icon: Mic,
        };
      case 'evaluating':
        return {
          ring: 'ring-amber-500/60 shadow-amber-500/30',
          gradient: 'from-amber-600 via-orange-600 to-purple-600',
          badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          label: 'Evaluating Concepts & Socratic Depth...',
          icon: Brain,
        };
      case 'idle':
      default:
        return {
          ring: 'ring-slate-400/30 shadow-slate-500/10',
          gradient: 'from-slate-700 to-slate-900',
          badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          label: 'Oral Examiner Ready',
          icon: Bot,
        };
    }
  };

  const status = getStateColor();
  const Icon = status.icon;

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none">
      {/* Outer Holographic Halo Container */}
      <div className="relative flex items-center justify-center mb-4">
        {/* Pulsing Ripple Rings */}
        {state === 'speaking' && (
          <>
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping duration-1000 scale-125" />
            <div className="absolute -inset-3 rounded-full border border-indigo-400/40 animate-pulse duration-700" />
            <div className="absolute -inset-6 rounded-full border border-cyan-400/20 animate-pulse duration-1000" />
          </>
        )}

        {state === 'listening' && (
          <>
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping duration-1000 scale-110" />
            <div className="absolute -inset-3 rounded-full border border-emerald-400/40 animate-pulse" />
          </>
        )}

        {state === 'evaluating' && (
          <div className="absolute -inset-4 rounded-full border-2 border-dashed border-amber-500/40 animate-spin duration-3000" />
        )}

        {/* Central Avatar Visual Orb */}
        <div
          className={`relative h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-gradient-to-tr ${status.gradient} flex items-center justify-center text-white shadow-xl transition-all duration-300 ring-4 ${status.ring}`}
        >
          {/* Internal Facial Matrix Pattern */}
          <div className="flex flex-col items-center justify-center gap-2">
            {/* Eyes */}
            <div className="flex items-center gap-4">
              <div
                className={`h-2.5 w-2.5 rounded-full bg-white transition-transform ${
                  state === 'speaking'
                    ? 'scale-y-125 animate-pulse'
                    : state === 'listening'
                    ? 'scale-110 bg-emerald-200'
                    : state === 'evaluating'
                    ? 'scale-75'
                    : 'scale-100'
                }`}
              />
              <div
                className={`h-2.5 w-2.5 rounded-full bg-white transition-transform ${
                  state === 'speaking'
                    ? 'scale-y-125 animate-pulse'
                    : state === 'listening'
                    ? 'scale-110 bg-emerald-200'
                    : state === 'evaluating'
                    ? 'scale-75'
                    : 'scale-100'
                }`}
              />
            </div>

            {/* Speaking Audio Wave Mouth */}
            <div className="h-4 flex items-center gap-1">
              {state === 'speaking' ? (
                <>
                  <span className="w-1 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-3.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-2 bg-white rounded-full animate-bounce" />
                </>
              ) : state === 'listening' ? (
                <div className="w-5 h-1 bg-emerald-300 rounded-full animate-pulse" />
              ) : state === 'evaluating' ? (
                <div className="w-4 h-1 bg-amber-300 rounded-full animate-pulse" />
              ) : (
                <div className="w-4 h-1 bg-white/70 rounded-full" />
              )}
            </div>
          </div>

          {/* Socratic Agent Emblem */}
          <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Examiner Name & Title */}
      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display">
        {config.name}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-0.5">
        {config.title}
      </p>

      {/* Dynamic Status Badge */}
      <div className="mt-3">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${status.badge} transition-colors`}
        >
          <Icon className="h-3.5 w-3.5 animate-pulse" />
          <span>{status.label}</span>
        </span>
      </div>
    </div>
  );
};
