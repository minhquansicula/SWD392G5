import React, { useState } from 'react';
import {
  Search,
  Bot,
  User,
  Sparkles,
  Volume2,
  Filter,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { TranscriptEntry } from '../../types';

interface TranscriptViewerProps {
  transcript: TranscriptEntry[];
  candidateName: string;
  examinerName: string;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  transcript,
  candidateName,
  examinerName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState<'all' | 'examiner' | 'student'>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const filtered = transcript.filter((item) => {
    const matchesSearch =
      item.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.speakerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpeaker =
      speakerFilter === 'all' ? true : item.speaker === speakerFilter;
    return matchesSearch && matchesSpeaker;
  });

  const handleSimulateAudioPlay = (id: string, text: string) => {
    setPlayingId(id);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.onend = () => setPlayingId(null);
      window.speechSynthesis.speak(u);
    } else {
      setTimeout(() => setPlayingId(null), 2500);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-4">
      {/* Header & Search / Filter Controls */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search words in spoken transcript (e.g. Paxos, Quorum)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setSpeakerFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              speakerFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            All Speakers
          </button>
          <button
            onClick={() => setSpeakerFilter('examiner')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              speakerFilter === 'examiner'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            AI Examiner
          </button>
          <button
            onClick={() => setSpeakerFilter('student')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              speakerFilter === 'student'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Candidate Oral
          </button>
        </div>
      </div>

      {/* Transcript Items */}
      <div className="p-4 sm:p-6 space-y-4 max-h-[600px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No speech entries match your query.
          </div>
        ) : (
          filtered.map((item) => {
            const isExaminer = item.speaker === 'examiner';
            const isPlaying = playingId === item.id;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-colors ${
                  isExaminer
                    ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                    : 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-xs ${
                        isExaminer ? 'bg-indigo-600' : 'bg-emerald-600'
                      }`}
                    >
                      {isExaminer ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                    </div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {item.speakerName}
                    </span>
                    {item.isAdaptiveProbe && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold">
                        Adaptive Follow-Up
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-[11px] text-slate-400">
                      {item.timestamp}
                    </span>
                    <button
                      onClick={() => handleSimulateAudioPlay(item.id, item.text)}
                      title="Play Audio Recording"
                      className={`p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${
                        isPlaying ? 'text-indigo-600 animate-pulse' : 'text-slate-400'
                      }`}
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                  {item.text}
                </p>

                {item.highlightedConcepts && item.highlightedConcepts.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Key Terms Recognized:
                    </span>
                    {item.highlightedConcepts.map((c, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-medium text-slate-700 dark:text-slate-300"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
