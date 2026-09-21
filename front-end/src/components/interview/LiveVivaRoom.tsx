import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Bot,
  Play,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  SkipForward,
  LogOut,
  Maximize2,
  Volume2,
} from 'lucide-react';
import { Exam, StudentAssignment, TranscriptEntry } from '../../types';
import { Language, translations } from '../../utils/i18n';
import { AiExaminerAvatar } from './AiExaminerAvatar';
import { AudioVisualizer } from '../common/AudioVisualizer';
import { VoiceControls } from './VoiceControls';
import { TranscriptStream } from './TranscriptStream';
import { AdaptiveQuestionTree } from './AdaptiveQuestionTree';
import { ExamTimerProgress } from './ExamTimerProgress';

interface LiveVivaRoomProps {
  exam: Exam;
  candidate: StudentAssignment;
  onFinishViva: (completedScore?: number) => void;
  onExit: () => void;
  isSoundEnabled: boolean;
  language?: Language;
}

export const LiveVivaRoom: React.FC<LiveVivaRoomProps> = ({
  exam,
  candidate,
  onFinishViva,
  onExit,
  isSoundEnabled,
  language = 'vi',
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(exam.vivaDurationMin * 60);
  const [avatarState, setAvatarState] = useState<'idle' | 'speaking' | 'listening' | 'evaluating'>('speaking');
  const [isMicActive, setIsMicActive] = useState(false);
  const [hasAdaptiveFollowUpActive, setHasAdaptiveFollowUpActive] = useState(false);
  const [activeFollowUpText, setActiveFollowUpText] = useState<string | undefined>();
  const [isStudentSpeaking, setIsStudentSpeaking] = useState(false);
  const t = translations[language];

  const currentQuestion = exam.questions[currentQuestionIndex] || exam.questions[0];

  // Initial greeting and question transcript
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([
    {
      id: 'msg-0',
      speaker: 'examiner',
      speakerName: exam.examinerConfig.name,
      text: `Welcome, ${candidate.studentName}. I am ${exam.examinerConfig.name}. We are conducting your oral examination for ${exam.code}: ${exam.title}. I will ask foundational questions and explore your reasoning. Let us begin with Question 1.`,
      timestamp: '00:00',
    },
    {
      id: 'msg-1',
      speaker: 'examiner',
      speakerName: exam.examinerConfig.name,
      text: currentQuestion.questionText,
      timestamp: '00:04',
    },
  ]);

  // Voice speech synthesis helper
  const speakText = (text: string) => {
    if (!isSoundEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => {
        setAvatarState('speaking');
      };
      utterance.onend = () => {
        setAvatarState('listening');
        setIsMicActive(true);
      };
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis unavailable', e);
    }
  };

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onFinishViva();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onFinishViva]);

  // Read first question on room entrance
  useEffect(() => {
    const timeout = setTimeout(() => {
      setAvatarState('speaking');
      speakText(currentQuestion.questionText);
      setTimeout(() => {
        setAvatarState('listening');
        setIsMicActive(true);
      }, 3500);
    }, 1000);

    return () => {
      clearTimeout(timeout);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleMic = () => {
    setIsMicActive(!isMicActive);
  };

  const handleRepeatQuestion = () => {
    setAvatarState('speaking');
    const repeatNotice: TranscriptEntry = {
      id: `msg-${Date.now()}`,
      speaker: 'examiner',
      speakerName: exam.examinerConfig.name,
      text: `Let me repeat: ${hasAdaptiveFollowUpActive && activeFollowUpText ? activeFollowUpText : currentQuestion.questionText}`,
      timestamp: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
    };
    setTranscript((prev) => [...prev, repeatNotice]);
    speakText(repeatNotice.text);
    setTimeout(() => {
      setAvatarState('listening');
      setIsMicActive(true);
    }, 3000);
  };

  const handleSubmitStudentAnswer = (
    answerText: string,
    sentiment: 'confident' | 'hesitant' | 'elaborate' = 'confident'
  ) => {
    setIsMicActive(false);
    setIsStudentSpeaking(true);

    // Add student speech to transcript
    const studentEntry: TranscriptEntry = {
      id: `msg-${Date.now()}`,
      speaker: 'student',
      speakerName: candidate.studentName,
      text: answerText,
      timestamp: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
      sentiment,
      confidence: 0.96,
      highlightedConcepts: currentQuestion.expectedConcepts.slice(0, 3),
    };

    setTranscript((prev) => [...prev, studentEntry]);

    setTimeout(() => {
      setIsStudentSpeaking(false);
      setAvatarState('evaluating');

      // Check if we should trigger an adaptive follow-up
      if (
        !hasAdaptiveFollowUpActive &&
        currentQuestion.adaptiveFollowUps &&
        currentQuestion.adaptiveFollowUps.length > 0
      ) {
        setTimeout(() => {
          const probe = currentQuestion.adaptiveFollowUps![0];
          setHasAdaptiveFollowUpActive(true);
          setActiveFollowUpText(probe.probeQuestion);
          setAvatarState('speaking');

          const examinerProbe: TranscriptEntry = {
            id: `msg-${Date.now() + 1}`,
            speaker: 'examiner',
            speakerName: exam.examinerConfig.name,
            text: probe.probeQuestion,
            timestamp: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
            isAdaptiveProbe: true,
          };
          setTranscript((prev) => [...prev, examinerProbe]);
          speakText(probe.probeQuestion);

          setTimeout(() => {
            setAvatarState('listening');
            setIsMicActive(true);
          }, 3500);
        }, 1500);
      } else {
        // Evaluate and advance to next question or complete
        setTimeout(() => {
          setAvatarState('speaking');
          const evalNotice: TranscriptEntry = {
            id: `msg-${Date.now() + 2}`,
            speaker: 'examiner',
            speakerName: exam.examinerConfig.name,
            text: 'Noted. Your defense and rationale have been recorded in the rubric matrix. Moving forward.',
            timestamp: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
          };
          setTranscript((prev) => [...prev, evalNotice]);

          setTimeout(() => {
            if (currentQuestionIndex + 1 < exam.questions.length) {
              advanceToNextQuestion();
            } else {
              // Viva Completed!
              onFinishViva(44);
            }
          }, 2000);
        }, 1200);
      }
    }, 1000);
  };

  const advanceToNextQuestion = () => {
    const nextIdx = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIdx);
    setHasAdaptiveFollowUpActive(false);
    setActiveFollowUpText(undefined);
    setAvatarState('speaking');

    const nextQ = exam.questions[nextIdx];
    const nextPrompt: TranscriptEntry = {
      id: `msg-${Date.now() + 3}`,
      speaker: 'examiner',
      speakerName: exam.examinerConfig.name,
      text: `Question ${nextIdx + 1}: ${nextQ.questionText}`,
      timestamp: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
    };

    setTranscript((prev) => [...prev, nextPrompt]);
    speakText(nextPrompt.text);

    setTimeout(() => {
      setAvatarState('listening');
      setIsMicActive(true);
    }, 4000);
  };

  return (
    <div className="space-y-4">
      {/* Top Session Navigation & Exit */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{t.leaveRoom}</span>
          </button>

          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
              {exam.code} • {language === 'vi' ? 'Phòng thi Vấn đáp AI' : 'Oral Viva Room'}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline ml-2">
              {t.candidate}: {candidate.studentName} ({candidate.matriculationNo})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentQuestionIndex + 1 < exam.questions.length ? (
            <button
              onClick={advanceToNextQuestion}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 transition-colors"
            >
              <span>{t.nextQuestion}</span>
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={() => onFinishViva(44)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{t.finishExam}</span>
            </button>
          )}
        </div>
      </div>

      {/* Timer & Question Progress Bar */}
      <ExamTimerProgress
        remainingSeconds={remainingSeconds}
        totalSeconds={exam.vivaDurationMin * 60}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={exam.totalQuestions}
        examCode={exam.code}
      />

      {/* Main Oral Chamber Viewport (Split Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[520px]">
        {/* Left Column (5 cols): Examiner Avatar, Audio Waveform & Mic Controls */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center">
            {/* AI Examiner Animated Avatar */}
            <AiExaminerAvatar
              config={exam.examinerConfig}
              state={avatarState}
            />

            {/* Audio Waveform Visualizer */}
            <div className="w-full mt-2">
              <AudioVisualizer
                isActive={isMicActive || avatarState === 'speaking'}
                isAiSpeaking={avatarState === 'speaking'}
                isListening={avatarState === 'listening' && isMicActive}
                theme="examiner"
              />
            </div>
          </div>

          {/* Adaptive Question Socratic Logic / Clean Current Question Card */}
          <AdaptiveQuestionTree
            currentQuestion={currentQuestion}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={exam.totalQuestions}
            hasAdaptiveFollowUpActive={hasAdaptiveFollowUpActive}
            activeFollowUpText={activeFollowUpText}
            language={language}
          />

          {/* Voice Interaction & Microphone Controls */}
          <VoiceControls
            isMicActive={isMicActive}
            onToggleMic={handleToggleMic}
            onRepeatQuestion={handleRepeatQuestion}
            onSubmitStudentAnswer={handleSubmitStudentAnswer}
            isAiSpeaking={avatarState === 'speaking'}
            isEvaluating={avatarState === 'evaluating'}
            language={language}
          />
        </div>

        {/* Right Column (7 cols): Real-Time Speech-to-Text Transcript Feed */}
        <div className="lg:col-span-7 h-full min-h-[460px]">
          <TranscriptStream
            transcript={transcript}
            isAiSpeaking={avatarState === 'speaking'}
            isStudentSpeaking={isStudentSpeaking}
            language={language}
          />
        </div>
      </div>
    </div>
  );
};
