import React, { useEffect, useState } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  isAiSpeaking?: boolean;
  isListening?: boolean;
  barCount?: number;
  className?: string;
  theme?: 'examiner' | 'student' | 'neutral';
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isActive,
  isAiSpeaking = false,
  isListening = false,
  barCount = 28,
  className = '',
  theme = 'examiner',
}) => {
  const [heights, setHeights] = useState<number[]>(() =>
    Array.from({ length: barCount }, () => 12)
  );

  useEffect(() => {
    if (!isActive && !isAiSpeaking && !isListening) {
      setHeights(Array.from({ length: barCount }, () => 8));
      return;
    }

    const interval = setInterval(() => {
      setHeights(
        Array.from({ length: barCount }, (_, i) => {
          if (isAiSpeaking) {
            // Smooth undulating frequency curve for AI Examiner voice
            const wave = Math.sin(Date.now() / 180 + i * 0.4);
            const secondary = Math.cos(Date.now() / 320 + i * 0.2);
            return Math.max(10, Math.min(84, Math.abs(wave * 45 + secondary * 25 + 15)));
          } else if (isListening) {
            // Jittery voice pattern for human student speech
            const randomPulse = Math.random() * 55 + 10;
            return randomPulse;
          } else {
            return 8;
          }
        })
      );
    }, 60);

    return () => clearInterval(interval);
  }, [isActive, isAiSpeaking, isListening, barCount]);

  const getBarColor = (index: number) => {
    if (isAiSpeaking) {
      return 'bg-gradient-to-t from-indigo-600 via-indigo-400 to-cyan-300 dark:from-indigo-500 dark:via-cyan-400 dark:to-cyan-200 shadow-cyan-500/20';
    }
    if (isListening) {
      return 'bg-gradient-to-t from-emerald-600 to-teal-400 dark:from-emerald-500 dark:to-teal-300 shadow-emerald-500/20';
    }
    return 'bg-slate-300 dark:bg-slate-700';
  };

  return (
    <div
      aria-label="Real-time voice audio visualizer"
      className={`flex items-center justify-center gap-1 h-16 px-4 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 ${className}`}
    >
      {heights.map((h, index) => (
        <div
          key={index}
          className={`w-1 rounded-full transition-all duration-75 ease-out shadow-xs ${getBarColor(
            index
          )}`}
          style={{ height: `${h}%`, minHeight: '6px' }}
        />
      ))}
    </div>
  );
};
