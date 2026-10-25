import { useState, useEffect, useRef, useCallback } from 'react';
import { PCMPlayer } from '../services/vivaAudioPlayer';

export type VivaConnectionStatus =
  | 'IDLE'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'EVALUATING'
  | 'COMPLETED'
  | 'ERROR';

export interface VivaPlan {
  type: 'main' | 'followup';
  number: number;
  total?: number;
  content?: string;
  followup_index?: number;
  max_followups_per_main?: number;
  total_followups_used?: number;
  max_total_followups?: number;
  time_limit_seconds?: number;
  sources?: Array<{ filename: string; text: string }>;
}

export interface VivaTranscriptItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  final?: boolean;
  question_id?: string;
}

export interface VivaExamMetadata {
  examTitle: string;
  totalQuestions: number;
  maxMainQuestions: number;
  maxFollowupQuestions: number;
  maxFollowupsPerMain: number;
  mainAnswerTimeLimitSeconds: number;
  followupAnswerTimeLimitSeconds: number;
}

export interface UseVivaVoiceRoomProps {
  scheduleId: string;
  onFinish?: (report: any) => void;
  onError?: (error: string) => void;
}

export function useVivaVoiceRoom({ scheduleId, onFinish, onError }: UseVivaVoiceRoomProps) {
  const [status, setStatus] = useState<VivaConnectionStatus>('IDLE');
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [transcripts, setTranscripts] = useState<VivaTranscriptItem[]>([]);
  const [currentPlan, setCurrentPlan] = useState<VivaPlan | null>(null);
  const [metadata, setMetadata] = useState<VivaExamMetadata | null>(null);
  const [evaluationReport, setEvaluationReport] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Question countdown state
  const [questionCountdown, setQuestionCountdown] = useState<number>(120);
  const [isTimeWarning, setIsTimeWarning] = useState<boolean>(false);

  // References for Audio & WebSocket lifecycle
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playerRef = useRef<PCMPlayer | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const isCleaningUpRef = useRef<boolean>(false);

  // Clear timers & connections
  const cleanup = useCallback(async () => {
    isCleaningUpRef.current = true;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (workletNodeRef.current) {
      try {
        workletNodeRef.current.disconnect();
      } catch {}
      workletNodeRef.current = null;
    }

    if (playerRef.current) {
      playerRef.current.clear();
      playerRef.current = null;
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        await audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }

    setIsAiSpeaking(false);
  }, []);

  // Update countdown timer whenever a new question plan arrives
  useEffect(() => {
    if (status !== 'CONNECTED' || !currentPlan) return;

    const limit = currentPlan.time_limit_seconds || (currentPlan.type === 'followup' ? 60 : 120);
    setQuestionCountdown(limit);
    setIsTimeWarning(false);

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    timerRef.current = window.setInterval(() => {
      setQuestionCountdown((prev) => {
        if (prev <= 1) {
          setIsTimeWarning(true);
          return 0;
        }
        if (prev <= 15) {
          setIsTimeWarning(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentPlan, status]);

  // Handle incoming transcript items (stream chunks or final)
  const handleTranscriptEvent = useCallback((event: any) => {
    setTranscripts((prev) => {
      const idx = prev.findIndex((item) => item.id === event.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          id: event.id,
          role: event.role === 'user' ? 'user' : 'assistant',
          text: event.text,
          final: Boolean(event.final),
          question_id: event.question_id,
        };
        return next;
      } else {
        return [
          ...prev,
          {
            id: event.id,
            role: event.role === 'user' ? 'user' : 'assistant',
            text: event.text,
            final: Boolean(event.final),
            question_id: event.question_id,
          },
        ];
      }
    });
  }, []);

  // Start Voice Room Session
  const startRoom = useCallback(async () => {
    if (status === 'CONNECTING' || status === 'CONNECTED') return;

    setErrorMsg(null);
    setStatus('CONNECTING');
    isCleaningUpRef.current = false;

    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode) {
        throw new Error('Trình duyệt không hỗ trợ Web Audio. Vui lòng dùng Chrome, Edge hoặc Safari phiên bản mới.');
      }

      // 1. AudioContext & Microphone capture via AudioWorklet
      const ctx = new AudioContext();
      await ctx.resume();
      audioCtxRef.current = ctx;

      const player = new PCMPlayer(ctx, (speaking) => {
        setIsAiSpeaking(speaking);
      });
      playerRef.current = player;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      await ctx.audioWorklet.addModule('/audio-capture-worklet.js');
      const micNode = new AudioWorkletNode(ctx, 'mic-capture');
      workletNodeRef.current = micNode;

      const source = ctx.createMediaStreamSource(stream);
      const silence = ctx.createGain();
      silence.gain.value = 0;
      source.connect(micNode);
      micNode.connect(silence);
      silence.connect(ctx.destination);

      // 2. WebSocket Connection to Python AI Microservice
      const aiBase = (import.meta.env.VITE_AI_API_URL || 'http://localhost:8000').replace(/^http/, 'ws');
      const wsUrl = `${aiBase}/ws/live/sessions/${scheduleId}`;
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      micNode.port.onmessage = ({ data }) => {
        if (isCleaningUpRef.current) return;
        if (ws.readyState === WebSocket.OPEN && !isMicMuted) {
          if (data instanceof ArrayBuffer) {
            ws.send(data);
          }
        }
      };

      ws.onopen = () => {
        setStatus('CONNECTED');
      };

      ws.onmessage = ({ data }) => {
        if (isCleaningUpRef.current) return;

        // Binary PCM24k audio chunks from Gemini Live
        if (data instanceof ArrayBuffer) {
          player.push(data, 24000);
          return;
        }

        // Text JSON events
        try {
          const event = JSON.parse(data);

          if (event.type === 'ready') {
            setStatus('CONNECTED');
            setMetadata({
              examTitle: event.exam_title || '',
              totalQuestions: event.total_questions || 0,
              maxMainQuestions: event.max_main_questions || event.total_questions || 0,
              maxFollowupQuestions: event.max_followup_questions || 0,
              maxFollowupsPerMain: event.max_followups_per_main || 2,
              mainAnswerTimeLimitSeconds: event.main_answer_time_limit_seconds || 120,
              followupAnswerTimeLimitSeconds: event.followup_answer_time_limit_seconds || 60,
            });
          }

          if (event.type === 'plan') {
            setCurrentPlan({
              type: event.kind || event.type || 'main',
              number: event.number || 1,
              total: event.total,
              content: event.content,
              followup_index: event.followup_index,
              max_followups_per_main: event.max_followups_per_main,
              total_followups_used: event.total_followups_used,
              max_total_followups: event.max_total_followups,
              time_limit_seconds: event.time_limit_seconds,
              sources: event.sources,
            });
          }

          if (event.type === 'transcript') {
            handleTranscriptEvent(event);
          }

          if (event.type === 'clear_audio') {
            player.clear();
          }

          if (event.type === 'reconnecting') {
            setStatus('RECONNECTING');
            player.clear();
          }

          if (event.type === 'questions_complete') {
            // Handled automatically or let student review & finish
          }

          if (event.type === 'report') {
            setStatus('COMPLETED');
            const rep = event.data || event.report;
            setEvaluationReport(rep);
            if (onFinish) onFinish(rep);
            cleanup();
          }

          if (event.type === 'error') {
            const msg = event.message || 'Lỗi phiên phỏng vấn.';
            setErrorMsg(msg);
            if (onError) onError(msg);
            setStatus((prev) => (prev === 'EVALUATING' ? 'ERROR' : prev));
          }
        } catch (e: any) {
          console.warn('Failed to parse websocket event', e);
        }
      };

      ws.onclose = () => {
        if (!isCleaningUpRef.current) {
          setStatus((prev) => (prev === 'EVALUATING' ? prev : ('DISCONNECTED' as any)));
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket error', e);
      };
    } catch (err: any) {
      console.error('Failed to start voice room', err);
      const msg = err.message || 'Không thể mở mic hoặc kết nối phòng thi.';
      setErrorMsg(msg);
      setStatus('ERROR');
      if (onError) onError(msg);
      cleanup();
    }
  }, [scheduleId, isMicMuted, onFinish, onError, handleTranscriptEvent, cleanup]);

  // Finish early and grade immediately (with WebSocket & resilient HTTP fallback)
  const finishExamNow = useCallback(async () => {
    setStatus('EVALUATING');
    setErrorMsg(null);

    // 1. Try sending finish command via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'finish' }));
      } catch (err) {
        console.warn('Failed to send finish message via WS', err);
      }
    }

    // 2. Resilient HTTP fallback in case WebSocket closed or encountered error
    const aiBase = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${aiBase}/api/v1/sessions/${scheduleId}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const report = await response.json();
        setStatus('COMPLETED');
        setEvaluationReport(report);
        if (onFinish) onFinish(report);
        cleanup();
      }
    } catch (httpErr) {
      console.warn('HTTP finish fallback note:', httpErr);
    }
  }, [scheduleId, onFinish, cleanup]);

  // Toggle mic
  const toggleMic = useCallback(() => {
    setIsMicMuted((prev) => !prev);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
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
  };
}
