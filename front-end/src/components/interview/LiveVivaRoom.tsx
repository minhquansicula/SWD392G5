import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Play,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  LogOut,
  Volume2,
  Mic,
  MicOff,
  Sparkles,
  BookOpen,
  Layers,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  FileText,
  Square,
  CheckSquare,
  RefreshCw,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useVivaVoiceRoom, VivaPlan } from '../../hooks/useVivaVoiceRoom';
import { AiExaminerAvatar } from './AiExaminerAvatar';
import { AudioVisualizer } from '../common/AudioVisualizer';
import { Language } from '../../utils/i18n';

interface LiveVivaRoomProps {
  scheduleId: string;
  examTitle?: string;
  courseCode?: string;
  candidateName?: string;
  studentCode?: string;
  onExit: () => void;
  onFinished?: (score?: number) => void;
  language?: Language;
}

export const LiveVivaRoom: React.FC<LiveVivaRoomProps> = ({
  scheduleId,
  examTitle = 'Kỳ thi vấn đáp AI',
  courseCode = 'COURSE',
  candidateName = 'Thí sinh',
  studentCode,
  onExit,
  onFinished,
  language = 'vi',
}) => {
  const isVi = language === 'vi';
  const t = (vi: string, en: string) => (isVi ? vi : en);

  // Hook connecting WebSocket & Audio
  const {
    status,
    isAiSpeaking,
    isMicMuted,
    transcripts,
    currentPlan,
    metadata,
    evaluationReport,
    errorMsg,
    questionCountdown,
    isTimeWarning,
    startRoom,
    finishExamNow,
    toggleMic,
    cleanup,
  } = useVivaVoiceRoom({
    scheduleId,
    onFinish: (report) => {
      if (onFinished && report && report.total_score != null) {
        onFinished(report.total_score);
      }
    },
  });

  // UI state
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll transcript to bottom as speech streams
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Handle Fullscreen Toggle
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullScreen(false);
    }
  };

  // Derive avatar state
  const avatarState: 'idle' | 'speaking' | 'listening' | 'evaluating' =
    status === 'EVALUATING'
      ? 'evaluating'
      : isAiSpeaking
      ? 'speaking'
      : status === 'CONNECTED' && !isAiSpeaking
      ? 'listening'
      : 'idle';

  // Format countdown mm:ss
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentMainOrder = currentPlan?.number || 1;
  const totalMainQuestions = metadata?.totalQuestions || currentPlan?.total || metadata?.maxMainQuestions || 5;
  const currentFollowupIndex = currentPlan?.followup_index || 0;
  const maxFollowupsPerMain = currentPlan?.max_followups_per_main || metadata?.maxFollowupsPerMain || 2;
  const totalFollowupsUsed = currentPlan?.total_followups_used || 0;
  const maxTotalFollowups = currentPlan?.max_total_followups || metadata?.maxFollowupQuestions || 10;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col overflow-hidden select-none font-sans">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 px-2.5 items-center justify-center rounded-lg bg-purple-600/30 text-purple-400 font-bold text-xs border border-purple-500/40">
              <Sparkles className="h-3.5 w-3.5 mr-1 text-purple-400 animate-pulse" />
              VIVA LIVE
            </span>
            <span className="text-xs font-semibold text-slate-300 hidden md:inline">
              {courseCode} • {metadata?.examTitle || examTitle}
            </span>
          </div>

          <span className="text-xs text-slate-500 hidden lg:inline">|</span>

          <span className="text-xs text-slate-400 hidden lg:inline">
            {t('Thí sinh:', 'Candidate:')}{' '}
            <strong className="text-slate-200">
              {candidateName} {studentCode ? `(${studentCode})` : ''}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Connection Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-slate-700 bg-slate-800/80">
            <span
              className={`h-2 w-2 rounded-full ${
                status === 'CONNECTED'
                  ? 'bg-emerald-400 animate-pulse'
                  : status === 'CONNECTING' || status === 'RECONNECTING'
                  ? 'bg-amber-400 animate-ping'
                  : status === 'EVALUATING'
                  ? 'bg-purple-400 animate-spin'
                  : 'bg-slate-500'
              }`}
            />
            <span className="text-[11px] text-slate-300">
              {status === 'CONNECTED'
                ? isMicMuted
                  ? t('Đã kết nối (Mic tắt)', 'Connected (Mic muted)')
                  : t('Đã kết nối • Mic mở', 'Connected • Mic live')
                : status === 'CONNECTING'
                ? t('Đang kết nối…', 'Connecting…')
                : status === 'RECONNECTING'
                ? t('Đang kết nối lại…', 'Reconnecting…')
                : status === 'EVALUATING'
                ? t('Đang chấm điểm…', 'Grading…')
                : status === 'COMPLETED'
                ? t('Đã hoàn thành', 'Completed')
                : t('Chưa kết nối', 'Disconnected')}
            </span>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullScreen}
            title={isFullScreen ? t('Thu nhỏ', 'Exit full screen') : t('Toàn màn hình', 'Full screen')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Progress & Indicator Bar */}
      <div className="h-12 border-b border-slate-800/80 bg-slate-900/50 px-4 sm:px-6 flex items-center justify-between shrink-0 flex-wrap gap-2 text-xs">
        {/* Indicators */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          {/* Main Question Progress */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/50 border border-indigo-800/60 text-indigo-300 font-semibold">
            <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
            <span>
              {t('Câu hỏi chính:', 'Main Q:')} {currentMainOrder} / {totalMainQuestions}
            </span>
          </div>

          {/* Follow-up for Current Question */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold transition-all ${
              currentPlan?.type === 'followup'
                ? 'bg-amber-950/60 border-amber-600 text-amber-300 animate-pulse'
                : 'bg-slate-800/50 border-slate-700/60 text-slate-400'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-amber-400" />
            <span>
              {t('Hỏi xoáy câu này:', 'Follow-up:')} {currentFollowupIndex} / {maxFollowupsPerMain}
            </span>
          </div>

          {/* Total Follow-ups Used in Session */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/40 border border-slate-700/50 text-slate-300">
            <span>{t('Tổng câu phụ đã dùng:', 'Total follow-ups:')}</span>
            <strong className="text-purple-400">
              {totalFollowupsUsed} / {maxTotalFollowups}
            </strong>
          </div>
        </div>

        {/* Question Countdown Timer */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-mono font-bold text-xs transition-all ${
              isTimeWarning
                ? 'border-rose-500 bg-rose-950 text-rose-300 animate-pulse shadow-rose-900/50 shadow-md'
                : 'border-slate-700 bg-slate-800 text-slate-200'
            }`}
          >
            <Clock className={`h-3.5 w-3.5 ${isTimeWarning ? 'text-rose-400 animate-spin' : 'text-slate-400'}`} />
            <span>
              {t('Thời gian câu:', 'Time:')} {formatCountdown(questionCountdown)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Chamber Body Grid (Split 2 Columns) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left Column (5 cols): AI Examiner Avatar, Active Question & Controls */}
        <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Avatar Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col items-center justify-center relative overflow-hidden shadow-lg">
            <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
              <Bot className="h-3.5 w-3.5 text-purple-400" />
              <span>{t('Giám khảo AI (Socratic Examiner)', 'AI Examiner')}</span>
            </div>

            <div className="my-2">
              <AiExaminerAvatar
                config={{
                  name: 'Giám khảo AI',
                  title: 'Hệ thống Vấn đáp Trực tiếp AIVES',
                  persona: 'rigorous_socratic',
                  voiceType: 'Puck',
                  avatarStyle: 'holographic',
                  followUpDepth: 2,
                  strictness: 'moderate',
                }}
                state={avatarState}
              />
            </div>

            {/* Audio Waveform */}
            <div className="w-full max-w-xs mt-1">
              <AudioVisualizer
                isActive={status === 'CONNECTED' && (isAiSpeaking || !isMicMuted)}
                isAiSpeaking={isAiSpeaking}
                isListening={status === 'CONNECTED' && !isAiSpeaking && !isMicMuted}
                theme="examiner"
              />
            </div>

            {/* Speaking Status text */}
            <p className="mt-2 text-xs font-medium text-slate-400 text-center">
              {isAiSpeaking
                ? t('Giám khảo AI đang đặt câu hỏi… Bạn có thể ngắt lời bất cứ lúc nào.', 'Examiner speaking… You can interrupt anytime.')
                : status === 'CONNECTED'
                ? t('Đang lắng nghe câu trả lời của bạn qua micro…', 'Listening to your answer via microphone…')
                : status === 'EVALUATING'
                ? t('Đang tổng hợp transcript và chấm điểm theo Rubric…', 'Evaluating response against rubrics…')
                : t('Sẵn sàng khi bạn bắt đầu.', 'Ready when you start.')}
            </p>
          </div>

          {/* Current Question Display Box */}
          <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    currentPlan?.type === 'followup'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                      : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/80'
                  }`}
                >
                  {currentPlan?.type === 'followup'
                    ? t(`⚡ CÂU HỎI XOÁY #${currentFollowupIndex}`, `⚡ FOLLOW-UP PROBE #${currentFollowupIndex}`)
                    : t(`🎯 CÂU HỎI CHÍNH #${currentMainOrder}`, `🎯 MAIN QUESTION #${currentMainOrder}`)}
                </span>

                <span className="text-[11px] text-slate-400">
                  {currentPlan?.type === 'followup'
                    ? t(`Tối đa ${maxFollowupsPerMain} câu phụ quanh câu này`, `Max ${maxFollowupsPerMain} followups`)
                    : t(`Giới hạn: ${currentPlan?.time_limit_seconds || 120}s`, `Limit: ${currentPlan?.time_limit_seconds || 120}s`)}
                </span>
              </div>

              {/* Question Text */}
              <div className="mt-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <p className="text-sm font-medium text-slate-100 leading-relaxed whitespace-pre-wrap">
                  {currentPlan?.content ||
                    (currentPlan?.type === 'followup'
                      ? t(
                          'Giám khảo AI đang đối chiếu tài liệu giáo trình và đặt câu hỏi đào sâu về câu trả lời của bạn…',
                          'Examiner is cross-referencing materials to probe deeper into your answer…'
                        )
                      : t(
                          'Đang tải câu hỏi từ ngân hàng đề đã được bốc thăm…',
                          'Loading assigned question from question bank…'
                        ))}
                </p>
              </div>

              {/* Sources quote if RAG retrieved */}
              {currentPlan?.sources && currentPlan.sources.length > 0 && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-purple-950/30 border border-purple-900/40 text-[11px] text-purple-300">
                  <span className="font-semibold block mb-1">
                    📚 {t('Tài liệu học liệu đối chiếu (RAG Context):', 'Retrieved Course References:')}
                  </span>
                  <ul className="space-y-1 list-disc list-inside text-slate-400">
                    {currentPlan.sources.slice(0, 2).map((s, idx) => (
                      <li key={idx} className="truncate">
                        <strong className="text-purple-300">{s.filename}:</strong> {s.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Bottom Controls Area */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {/* Mic Mute / Unmute Button */}
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={status !== 'CONNECTED'}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isMicMuted
                      ? 'bg-rose-950/80 border-rose-800 text-rose-300 hover:bg-rose-900'
                      : 'bg-emerald-950/60 border-emerald-700 text-emerald-300 hover:bg-emerald-900/80'
                  }`}
                >
                  {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  <span>{isMicMuted ? t('Bật Micro', 'Unmute Mic') : t('Tắt Micro', 'Mute Mic')}</span>
                </button>
              </div>

              {/* SPECIAL REQUIREMENT: Finish Exam Early & Grade Immediately Button */}
              <button
                id="finish-viva-exam-now-btn"
                data-testid="finish-viva-exam-now-btn"
                type="button"
                onClick={() => setShowFinishConfirm(true)}
                disabled={status !== 'CONNECTED'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Award className="h-4 w-4" />
                <span>{t('Kết thúc & Chấm điểm ngay', 'Finish & Grade Immediately')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Real-Time Speech-to-Text Transcript Feed */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col overflow-hidden shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {t('Phụ đề đối thoại trực tiếp (Live Transcript)', 'Live Conversation Subtitles')}
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">
              {t('Tự động ghi nhận theo giọng nói', 'Auto-transcribed from audio')}
            </span>
          </div>

          {/* Transcript Scroll Area */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
            {transcripts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Bot className="h-8 w-8 mb-2 opacity-40 text-purple-400" />
                <p className="text-xs font-medium">
                  {t(
                    'Phụ đề lời nói giữa bạn và Giám khảo AI sẽ hiển thị theo thời gian thực tại đây.',
                    'Real-time conversation subtitles between you and AI will appear here.'
                  )}
                </p>
              </div>
            ) : (
              transcripts.map((item, idx) => {
                const isStudent = item.role === 'user';
                return (
                  <div
                    key={item.id || idx}
                    className={`flex flex-col gap-1 ${isStudent ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                      {isStudent ? (
                        <>
                          <span className="text-emerald-400 font-bold">{t('BẠN (THÍ SINH)', 'YOU')}</span>
                          <span>•</span>
                          <span className="text-[10px] text-slate-500">Micro</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 text-purple-400" />
                          <span className="text-purple-400 font-bold">{t('GIÁM KHẢO AI', 'AI EXAMINER')}</span>
                        </>
                      )}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        isStudent
                          ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-100 rounded-tr-xs'
                          : 'bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-tl-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{item.text}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      </div>

      {/* Start Entrance Gate Overlay (If session not started yet) */}
      {status === 'IDLE' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl text-center space-y-5">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/10">
              <Bot className="h-8 w-8 animate-bounce" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                {t('Phòng Vấn Đáp Trực Tiếp AI Sẵn Sàng', 'AI Viva Examination Chamber Ready')}
              </h2>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                {t(
                  'Cuộc phỏng vấn diễn ra qua giọng nói song công 2 chiều. Giám khảo AI sẽ hỏi câu chính và đặt câu hỏi đào sâu dựa trên câu trả lời của bạn.',
                  'Live oral viva voce via duplex audio. The AI examiner will probe your reasoning based on your verbal answers.'
                )}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-left text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-semibold">
                <HelpCircle className="h-4 w-4 shrink-0" />
                <span>{t('Lưu ý quan trọng trước khi bắt đầu:', 'Important notices:')}</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                <li>{t('Hãy đeo tai nghe (headphone) để giảm thiểu tiếng vọng âm thanh.', 'Wear headphones to minimize audio echo.')}</li>
                <li>{t('Cho phép quyền truy cập Micro trên trình duyệt khi được yêu cầu.', 'Allow browser microphone permission when prompted.')}</li>
                <li>{t('Bạn có thể kết thúc sớm để AI chấm điểm bất cứ lúc nào.', 'You can finish early and trigger instant grading anytime.')}</li>
              </ul>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl border border-rose-800 bg-rose-950/60 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onExit}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                {t('Quay lại danh sách', 'Back to schedules')}
              </button>
              <button
                id="start-viva-exam-btn"
                data-testid="start-viva-exam-btn"
                type="button"
                onClick={startRoom}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{t('Bật Micro & Bắt đầu phỏng vấn', 'Open Mic & Enter Exam')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluating Overlay Spinner */}
      {status === 'EVALUATING' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 animate-spin">
              <RefreshCw className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-white">
              {t('Giám khảo AI đang chấm điểm…', 'AI Examiner is Grading…')}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t(
                'Đang đối chiếu toàn bộ transcript câu trả lời của bạn với tiêu chí Rubric môn học. Quá trình này thường mất khoảng 5 - 10 giây.',
                'Cross-referencing your oral defense against the course rubric. This takes about 5 - 10 seconds.'
              )}
            </p>
          </div>
        </div>
      )}

      {/* Final Evaluation Report Modal */}
      {status === 'COMPLETED' && evaluationReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="text-center space-y-2">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Award className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {t('Kết Quả Đánh Giá Phỏng Vấn Vấn Đáp', 'Oral Viva Examination Report')}
              </h2>
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 font-bold text-lg">
                <span>{evaluationReport.total_score}</span>
                <span className="text-xs text-emerald-400 font-normal">/ {evaluationReport.scale || 10} điểm</span>
              </div>
            </div>

            {/* Summary */}
            {evaluationReport.summary && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold text-purple-400 block mb-1">
                  💡 {t('Nhận xét tổng quát từ Giám khảo AI:', 'AI Examiner Overall Assessment:')}
                </span>
                <p>{evaluationReport.summary}</p>
              </div>
            )}

            {/* Criteria Breakdown */}
            {evaluationReport.criteria && evaluationReport.criteria.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('Chi tiết theo tiêu chí Rubric:', 'Rubric Criteria Breakdown:')}
                </h3>
                {evaluationReport.criteria.map((c: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-200">{c.name}</span>
                      <span className="text-purple-400 font-bold">
                        {c.score}/10 ({c.weight}%)
                      </span>
                    </div>
                    {c.rationale && <p className="text-slate-400 text-[11px]">{c.rationale}</p>}
                    {c.improvement && (
                      <p className="text-amber-400/90 text-[11px]">
                        <strong>{t('Cần cải thiện:', 'Improvement:')}</strong> {c.improvement}
                      </p>
                    )}
                    {c.evidence && c.evidence.length > 0 && (
                      <blockquote className="border-l-2 border-purple-500 pl-2 italic text-[11px] text-slate-400 mt-1">
                        "{c.evidence[0].quote}"
                      </blockquote>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-center pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onExit}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg transition-colors cursor-pointer"
              >
                {t('Hoàn tất & Về danh sách ca thi', 'Done & Back to Schedules')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Finish Exam Early */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <Award className="h-6 w-6 shrink-0" />
              <h2 className="text-base font-bold text-white">
                {t('Kết thúc ca thi & Chấm điểm ngay?', 'Finish Exam & Grade Immediately?')}
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t(
                'Bạn có chắc chắn muốn kết thúc ca thi sớm? Giám khảo AI sẽ dừng phiên đối thoại và chấm điểm ngay lập tức dựa trên các câu trả lời bạn đã thực hiện.',
                'Are you sure you want to conclude the exam early? The AI examiner will stop the interview and calculate your final score based on the answers given so far.'
              )}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFinishConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-colors"
              >
                {t('Tiếp tục thi', 'Continue Exam')}
              </button>
              <button
                id="confirm-finish-viva-btn"
                data-testid="confirm-finish-viva-btn"
                type="button"
                onClick={() => {
                  setShowFinishConfirm(false);
                  finishExamNow();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-md cursor-pointer"
              >
                {t('Xác nhận kết thúc & Chấm điểm', 'Confirm & Grade Now')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error / Retry Modal if Grading or Session encounters an issue */}
      {status === 'ERROR' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-rose-800/80 bg-slate-900 p-8 shadow-2xl text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold text-white">
              {t('Gặp sự cố khi chấm điểm', 'Evaluation Issue Encountered')}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {errorMsg || t('Chưa thể hoàn tất chấm điểm Rubric. Toàn bộ transcript vẫn được bảo toàn trong hệ thống.', 'Could not finalize grading. All transcripts are securely preserved.')}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={finishExamNow}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
              >
                {t('Thử lại chấm điểm ngay', 'Retry Grading Now')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
