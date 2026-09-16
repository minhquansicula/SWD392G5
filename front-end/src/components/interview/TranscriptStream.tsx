import React, { useEffect, useRef } from 'react';
import { Bot, User, Sparkles } from 'lucide-react';
import { TranscriptEntry } from '../../types';
import { Language } from '../../utils/i18n';

interface TranscriptStreamProps {
  transcript: TranscriptEntry[];
  isAiSpeaking: boolean;
  isStudentSpeaking: boolean;
  isSimpleMode?: boolean;
  language?: Language;
}

export const TranscriptStream: React.FC<TranscriptStreamProps> = ({
  transcript,
  isAiSpeaking,
  isStudentSpeaking,
  isSimpleMode = true,
  language = 'vi',
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, isAiSpeaking, isStudentSpeaking]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Transcript Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-display">
            {language === 'vi' ? 'Nội Dung Cuộc Hội Thoại Trực Tiếp' : 'Live Speech Transcript'}
          </h3>
        </div>

        <span className="text-[11px] text-slate-400 font-mono">
          {transcript.length} {language === 'vi' ? 'lượt trao đổi' : 'turns'}
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
        {transcript.map((item) => {
          const isExaminer = item.speaker === 'examiner';

          return (
            <div
              key={item.id}
              className={`flex gap-3 ${
                isExaminer ? 'items-start' : 'items-start flex-row-reverse'
              }`}
            >
              {/* Speaker Avatar Icon */}
              <div
                className={`h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-white shadow-xs ${
                  isExaminer
                    ? 'bg-gradient-to-tr from-indigo-600 to-indigo-800'
                    : 'bg-gradient-to-tr from-emerald-600 to-teal-700'
                }`}
              >
                {isExaminer ? (
                  <Bot className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>

              {/* Speech Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 shadow-2xs space-y-1.5 ${
                  isExaminer
                    ? 'bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                    : 'bg-indigo-600 text-white rounded-tr-xs'
                }`}
              >
                {/* Meta header */}
                <div
                  className={`flex items-center justify-between gap-3 text-[11px] ${
                    isExaminer
                      ? 'text-slate-500 dark:text-slate-400'
                      : 'text-indigo-100'
                  }`}
                >
                  <span className="font-bold">{item.speakerName}</span>

                  <div className="flex items-center gap-2">
                    {item.isAdaptiveProbe && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold text-[10px] flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> {language === 'vi' ? 'Câu hỏi phụ' : 'Follow-up'}
                      </span>
                    )}
                    <span className="font-mono text-[10px] opacity-75">
                      {item.timestamp}
                    </span>
                  </div>
                </div>

                {/* Spoken text */}
                <p className="leading-relaxed font-normal text-xs sm:text-sm whitespace-pre-wrap">
                  {item.text}
                </p>

                {/* In Detailed Mode only: Show extracted concepts */}
                {!isSimpleMode && item.highlightedConcepts && item.highlightedConcepts.length > 0 && (
                  <div className="pt-2 border-t border-indigo-500/30 flex flex-wrap gap-1 items-center">
                    <span className="text-[10px] text-indigo-200 font-medium">
                      Khái niệm nhận diện:
                    </span>
                    {item.highlightedConcepts.map((c, ci) => (
                      <span
                        key={ci}
                        className="px-1.5 py-0.5 rounded-md bg-indigo-500/40 text-white font-mono text-[10px]"
                      >
                        ✓ {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live typing / listening indicator */}
        {isAiSpeaking && (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" />
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
              <span className="ml-1 font-medium">
                {language === 'vi' ? 'Giám khảo đang nói...' : 'Examiner speaking...'}
              </span>
            </div>
          </div>
        )}

        {isStudentSpeaking && (
          <div className="flex items-center gap-3 flex-row-reverse">
            <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
            <div className="px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium">
                {language === 'vi' ? 'Đang ghi nhận giọng nói của bạn...' : 'Transcribing speech in real-time...'}
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
