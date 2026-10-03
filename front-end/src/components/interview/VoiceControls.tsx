import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Keyboard,
  Sparkles,
} from 'lucide-react';
import { Language, translations } from '../../utils/i18n';

interface VoiceControlsProps {
  isMicActive: boolean;
  onToggleMic: () => void;
  onRepeatQuestion: () => void;
  onSubmitStudentAnswer: (answerText: string, sentiment?: 'confident' | 'hesitant' | 'elaborate') => void;
  isAiSpeaking: boolean;
  isEvaluating: boolean;
  suggestedAnswers?: string[];
  language?: Language;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  isMicActive,
  onToggleMic,
  onRepeatQuestion,
  onSubmitStudentAnswer,
  isAiSpeaking,
  isEvaluating,
  language = 'vi',
}) => {
  const [typedAnswer, setTypedAnswer] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const t = translations[language];

  const handleSendTyped = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedAnswer.trim()) return;
    onSubmitStudentAnswer(typedAnswer.trim(), 'confident');
    setTypedAnswer('');
    setShowTextInput(false);
  };

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      {/* Primary Mic Controls & State */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Main Microphone Button */}
          <button
            onClick={onToggleMic}
            disabled={isAiSpeaking || isEvaluating}
            className={`relative flex items-center justify-center h-12 w-12 rounded-full transition-all duration-200 ${
              isMicActive
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 scale-105 ring-4 ring-emerald-400/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isMicActive ? t.micMuted : t.micActive}
          >
            {isMicActive ? (
              <Mic className="h-6 w-6 animate-pulse" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-display">
                {isMicActive ? t.micActive : t.micMuted}
              </span>
              <span
                className={`h-2 w-2 rounded-full ${
                  isMicActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
                }`}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAiSpeaking
                ? t.aiSpeaking
                : isEvaluating
                ? t.aiEvaluating
                : isMicActive
                ? t.studentSpeaking
                : t.speakHint}
            </p>
          </div>
        </div>

        {/* Secondary Oral Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRepeatQuestion}
            disabled={isAiSpeaking || isEvaluating}
            title="Nghe lại câu hỏi"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5 text-indigo-500" />
            <span>{t.repeatQuestion}</span>
          </button>

          <button
            onClick={() => setShowTextInput(!showTextInput)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
            title="Nhập câu trả lời bằng phím"
          >
            <Keyboard className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Oral Speech Simulation Chips (For rapid demonstration of viva dynamics) */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-indigo-500" />
            {t.quickAnswerTitle}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <button
            disabled={isAiSpeaking || isEvaluating}
            onClick={() =>
              onSubmitStudentAnswer(
                language === 'vi'
                  ? 'Theo định lý CAP, DynamoDB ưu tiên tính sẵn sàng (Availability) qua cơ chế Sloppy Quorum và Vector Clocks để xử lý xung đột ghi khi phân vùng mạng xảy ra.'
                  : 'In network partitions, Dynamo balances CAP by using sloppy quorums and hinted handoff to ensure write availability, with vector clocks reconciling concurrent writes.',
                'elaborate'
              )
            }
            className="text-left p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 hover:border-indigo-400 text-indigo-950 dark:text-indigo-200 transition-all disabled:opacity-50"
          >
            <span className="font-semibold block text-[11px] text-indigo-700 dark:text-indigo-300">
              💡 {language === 'vi' ? 'Câu trả lời mẫu 1: Chuyên sâu (Định lý CAP & Quorum)' : 'Demo Answer 1: In-depth (CAP & Quorums)'}
            </span>
            <p className="line-clamp-1 text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              {language === 'vi'
                ? '"DynamoDB dùng Sloppy Quorum và Vector Clocks để đảm bảo Availability..."'
                : '"Dynamo balances CAP using sloppy quorums and vector clocks..."'}
            </p>
          </button>

          <button
            disabled={isAiSpeaking || isEvaluating}
            onClick={() =>
              onSubmitStudentAnswer(
                language === 'vi'
                  ? 'Giao thức Raft đảm bảo tính nhất quán qua bầu cử Leader và đồng thuận Log Replication giữa đa số các node.'
                  : 'Raft consensus guarantees strong consistency through term-based leader election and replicated log matching across majority nodes.',
                'confident'
              )
            }
            className="text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-slate-400 text-slate-800 dark:text-slate-200 transition-all disabled:opacity-50"
          >
            <span className="font-semibold block text-[11px] text-slate-700 dark:text-slate-300">
              🎯 {language === 'vi' ? 'Câu trả lời mẫu 2: Ngắn gọn (Đồng thuận Raft)' : 'Demo Answer 2: Direct (Raft Consensus)'}
            </span>
            <p className="line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'vi'
                ? '"Giao thức Raft bầu cử Leader và nhân bản nhật ký đồng thuận..."'
                : '"Raft consensus ensures consistency through leader log replication..."'}
            </p>
          </button>
        </div>
      </div>

      {/* Accessible Text Input fallback */}
      {showTextInput && (
        <form onSubmit={handleSendTyped} className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <input
            type="text"
            placeholder={t.typeAnswer}
            value={typedAnswer}
            onChange={(e) => setTypedAnswer(e.target.value)}
            className="flex-1 px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={!typedAnswer.trim() || isAiSpeaking || isEvaluating}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center gap-1 shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{t.sendAnswer}</span>
          </button>
        </form>
      )}
    </div>
  );
};
