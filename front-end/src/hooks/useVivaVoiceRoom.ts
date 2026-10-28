import { useState, useEffect, useRef, useCallback } from 'react';
import { PCMPlayer } from '../services/vivaAudioPlayer';
import { getAiAccessToken } from '../services/aiAuth';
import { clearApiCache } from '../services/apiClient';

export type VivaConnectionStatus = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' | 'EVALUATING' | 'COMPLETED' | 'ERROR';
export interface VivaPlan {
  type: 'main' | 'followup'; number: number; total?: number; content?: string;
  followup_index?: number; max_followups_per_main?: number; total_followups_used?: number;
  max_total_followups?: number; time_limit_seconds?: number;
  sources?: Array<{ filename: string; text: string }>;
}
export interface VivaTranscriptItem { id: string; role: 'user' | 'assistant'; text: string; final?: boolean; question_id?: string; }
export interface VivaExamMetadata {
  examTitle: string; totalQuestions: number; maxMainQuestions: number; maxFollowupQuestions: number;
  maxFollowupsPerMain: number; mainAnswerTimeLimitSeconds: number; followupAnswerTimeLimitSeconds: number;
}
export interface UseVivaVoiceRoomProps { scheduleId: string; onFinish?: (report: any) => void; onError?: (error: string) => void; }

const CONNECTION_TIMEOUT = 30000;
const GRADING_TIMEOUT = 120000;
const integer = (value: unknown, fallback: number, min = 0) => typeof value === 'number' && Number.isFinite(value) && value >= min ? Math.floor(value) : fallback;

export function useVivaVoiceRoom({ scheduleId, onFinish, onError }: UseVivaVoiceRoomProps) {
  const [status, setStatus] = useState<VivaConnectionStatus>('IDLE');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [transcripts, setTranscripts] = useState<VivaTranscriptItem[]>([]);
  const [currentPlan, setCurrentPlan] = useState<VivaPlan | null>(null);
  const [metadata, setMetadata] = useState<VivaExamMetadata | null>(null);
  const [evaluationReport, setEvaluationReport] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [questionCountdown, setQuestionCountdown] = useState(120);
  const [isTimeWarning, setIsTimeWarning] = useState(false);
  const mounted = useRef(true);
  const generation = useRef(0);
  const starting = useRef(false);
  const finishing = useRef(false);
  const statusRef = useRef<VivaConnectionStatus>('IDLE');
  const muted = useRef(false);
  const callbacks = useRef({ onFinish, onError });
  callbacks.current = { onFinish, onError };
  const socketRef = useRef<WebSocket | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const playerRef = useRef<PCMPlayer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const connectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gradingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gradingRequest = useRef<AbortController | null>(null);
  const questionDeadline = useRef(0);

  const transition = useCallback((next: VivaConnectionStatus) => {
    statusRef.current = next;
    if (mounted.current) setStatus(next);
  }, []);

  const cleanup = useCallback(async () => {
    generation.current += 1;
    starting.current = false;
    if (connectionTimer.current) clearTimeout(connectionTimer.current);
    if (gradingTimer.current) clearTimeout(gradingTimer.current);
    connectionTimer.current = null; gradingTimer.current = null;
    gradingRequest.current?.abort(); gradingRequest.current = null;
    const socket = socketRef.current; socketRef.current = null;
    if (socket) {
      socket.onopen = null; socket.onclose = null; socket.onerror = null; socket.onmessage = null;
      try { socket.close(); } catch { /* Already closed. */ }
    }
    const stream = streamRef.current; streamRef.current = null;
    stream?.getTracks().forEach(track => track.stop());
    const worklet = workletRef.current; workletRef.current = null;
    if (worklet) { worklet.port.onmessage = null; try { worklet.disconnect(); } catch { /* Already disconnected. */ } }
    const player = playerRef.current; playerRef.current = null;
    try { player?.clear(); } catch { /* Device may already have been detached. */ }
    const context = contextRef.current; contextRef.current = null;
    if (mounted.current) setIsAiSpeaking(false);
    if (context && context.state !== 'closed') { try { await context.close(); } catch { /* Already closed. */ } }
  }, []);

  const fail = useCallback((message: string) => {
    if (!mounted.current || statusRef.current === 'COMPLETED') return;
    setErrorMsg(message); transition('ERROR');
    void cleanup();
    callbacks.current.onError?.(message);
  }, [cleanup, transition]);

  const complete = useCallback((report: any) => {
    if (!mounted.current || statusRef.current === 'COMPLETED') return;
    const scale = report?.scale ?? 10;
    if (!report || typeof report.total_score !== 'number' || !Number.isFinite(report.total_score)
      || typeof scale !== 'number' || !Number.isFinite(scale) || scale <= 0 || report.total_score < 0 || report.total_score > scale) {
      fail('Dữ liệu kết quả từ máy chủ không hợp lệ. Vui lòng kiểm tra lại lịch thi hoặc liên hệ giảng viên.'); return;
    }
    clearApiCache();
    setEvaluationReport(report); transition('COMPLETED');
    void cleanup();
    callbacks.current.onFinish?.(report);
  }, [cleanup, fail, transition]);

  useEffect(() => {
    if (status !== 'CONNECTED' || !currentPlan) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((questionDeadline.current - Date.now()) / 1000));
      setQuestionCountdown(seconds); setIsTimeWarning(seconds <= 15);
      return seconds;
    };
    tick();
    const timer = setInterval(() => { if (tick() === 0) clearInterval(timer); }, 1000);
    return () => clearInterval(timer);
  }, [currentPlan, status]);

  const startRoom = useCallback(async () => {
    if (!mounted.current || starting.current || ['CONNECTING', 'CONNECTED', 'RECONNECTING', 'EVALUATING', 'COMPLETED'].includes(statusRef.current)) return;
    // cleanup invalidates all earlier async work synchronously before a new attempt starts.
    void cleanup();
    const attempt = generation.current;
    const active = () => mounted.current && attempt === generation.current;
    starting.current = true; finishing.current = false;
    setErrorMsg(null); transition('CONNECTING');
    try {
      const token = getAiAccessToken();
      if (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode || !window.AudioContext) throw new Error('Trình duyệt không hỗ trợ Web Audio. Vui lòng dùng trình duyệt mới trên HTTPS hoặc localhost.');
      const context = new AudioContext(); contextRef.current = context;
      await context.resume(); if (!active()) return;
      const player = new PCMPlayer(context, speaking => { if (active()) setIsAiSpeaking(speaking); }); playerRef.current = player;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (!active()) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      await context.audioWorklet.addModule('/audio-capture-worklet.js'); if (!active()) return;
      const worklet = new AudioWorkletNode(context, 'mic-capture'); workletRef.current = worklet;
      const source = context.createMediaStreamSource(stream);
      const silence = context.createGain(); silence.gain.value = 0;
      source.connect(worklet); worklet.connect(silence); silence.connect(context.destination);
      const base = (import.meta.env.VITE_AI_API_URL || 'http://localhost:8000').replace(/\/$/, '').replace(/^http/, 'ws');
      const socket = new WebSocket(`${base}/ws/live/sessions/${encodeURIComponent(scheduleId)}`);
      socket.binaryType = 'arraybuffer'; socketRef.current = socket;
      socket.onopen = () => {
        if (!active()) return;
        try { socket.send(JSON.stringify({ type: 'authenticate', token })); }
        catch { fail('Không gửi được yêu cầu xác thực phòng thi. Vui lòng đăng nhập lại.'); }
      };
      connectionTimer.current = setTimeout(() => { if (active()) fail('Hết thời gian chờ kết nối phòng thi. Kiểm tra mạng và trạng thái ca thi trước khi kết nối lại.'); }, CONNECTION_TIMEOUT);
      worklet.port.onmessage = ({ data }) => {
        if (!active() || statusRef.current !== 'CONNECTED' || muted.current || socket.readyState !== WebSocket.OPEN || !(data instanceof ArrayBuffer)) return;
        try { socket.send(data); } catch { fail('Không gửi được âm thanh. Kết nối phòng thi đã bị gián đoạn.'); }
      };
      socket.onmessage = ({ data }) => {
        if (!active()) return;
        if (data instanceof ArrayBuffer) {
          if (statusRef.current !== 'CONNECTED') return;
          try { player.push(data, 24000); } catch (error) { fail(error instanceof Error ? error.message : 'Không thể phát âm thanh.'); }
          return;
        }
        let event: any;
        try { event = JSON.parse(data); } catch { return; }
        if (!event || typeof event !== 'object') return;
        if (event.type === 'ready' && statusRef.current !== 'EVALUATING') {
          if (connectionTimer.current) clearTimeout(connectionTimer.current); connectionTimer.current = null;
          setMetadata({ examTitle: typeof event.exam_title === 'string' ? event.exam_title : '', totalQuestions: integer(event.total_questions, 0), maxMainQuestions: integer(event.max_main_questions, integer(event.total_questions, 0)), maxFollowupQuestions: integer(event.max_followup_questions, 0), maxFollowupsPerMain: integer(event.max_followups_per_main, 2), mainAnswerTimeLimitSeconds: integer(event.main_answer_time_limit_seconds, 120, 1), followupAnswerTimeLimitSeconds: integer(event.followup_answer_time_limit_seconds, 60, 1) });
          transition('CONNECTED');
        } else if (event.type === 'plan' && statusRef.current !== 'EVALUATING') {
          const type = event.kind === 'followup' ? 'followup' : 'main';
          const limit = integer(event.time_limit_seconds, type === 'followup' ? 60 : 120, 1);
          questionDeadline.current = Date.now() + limit * 1000;
          setCurrentPlan({ type, number: integer(event.number, 1, 1), total: event.total, content: typeof event.content === 'string' ? event.content : undefined, followup_index: event.followup_index, max_followups_per_main: event.max_followups_per_main, total_followups_used: event.total_followups_used, max_total_followups: event.max_total_followups, time_limit_seconds: limit, sources: Array.isArray(event.sources) ? event.sources : undefined });
        } else if (event.type === 'transcript' && typeof event.id === 'string' && typeof event.text === 'string') {
          const item: VivaTranscriptItem = { id: event.id, role: event.role === 'user' ? 'user' : 'assistant', text: event.text, final: !!event.final, question_id: event.question_id };
          setTranscripts(previous => { const index = previous.findIndex(entry => entry.id === item.id); return index < 0 ? [...previous, item] : previous.map((entry, i) => i === index ? item : entry); });
        } else if (event.type === 'clear_audio') player.clear();
        else if (event.type === 'reconnecting' && statusRef.current !== 'EVALUATING') {
          transition('RECONNECTING'); player.clear();
          if (connectionTimer.current) clearTimeout(connectionTimer.current);
          connectionTimer.current = setTimeout(() => { if (active()) fail('Không thể kết nối lại phòng thi. Vui lòng kiểm tra trạng thái ca thi.'); }, CONNECTION_TIMEOUT);
        } else if (event.type === 'report') complete(event.data || event.report);
        else if (event.type === 'error') fail(typeof event.message === 'string' ? event.message : 'Có sự cố trong phiên vấn đáp.');
      };
      socket.onclose = () => {
        if (!active()) return;
        if (statusRef.current === 'EVALUATING') fail('Kết nối bị ngắt khi đang chấm điểm. Kết quả yêu cầu chưa xác định; hãy kiểm tra lại lịch thi trước khi thao tác tiếp.');
        else { transition('DISCONNECTED'); void cleanup(); }
      };
      socket.onerror = () => { if (active()) fail('Không thể kết nối dịch vụ vấn đáp. Kiểm tra mạng hoặc liên hệ giảng viên.'); };
    } catch (error) { if (active()) fail(error instanceof Error ? error.message : 'Không thể mở micro hoặc kết nối phòng thi.'); }
    finally { if (active()) starting.current = false; }
  }, [scheduleId, cleanup, complete, fail, transition]);

  const finishExamNow = useCallback(async () => {
    if (!mounted.current || finishing.current || !['CONNECTED', 'DISCONNECTED'].includes(statusRef.current)) return;
    finishing.current = true; setErrorMsg(null); transition('EVALUATING');
    streamRef.current?.getAudioTracks().forEach(track => { track.enabled = false; });
    playerRef.current?.clear();
    const attempt = generation.current;
    const active = () => mounted.current && attempt === generation.current && statusRef.current === 'EVALUATING';
    gradingTimer.current = setTimeout(() => { if (active()) fail('Hết thời gian chờ kết quả. Yêu cầu có thể đã được xử lý; hãy kiểm tra lịch thi trước khi gửi lại.'); }, GRADING_TIMEOUT);
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      // Never send HTTP in parallel: a sent WebSocket mutation may already be committed.
      try { socket.send(JSON.stringify({ type: 'finish' })); } catch { fail('Chưa xác định yêu cầu kết thúc đã được gửi hay chưa. Hãy kiểm tra lại lịch thi.'); }
      return;
    }
    const controller = new AbortController(); gradingRequest.current = controller;
    try {
      const base = (import.meta.env.VITE_AI_API_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await fetch(`${base}/api/v1/sessions/${encodeURIComponent(scheduleId)}/finish`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAiAccessToken()}` }, signal: controller.signal });
      if (!active()) return;
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(typeof body?.detail === 'string' ? body.detail : `Không thể hoàn tất yêu cầu chấm điểm (HTTP ${response.status}).`);
      }
      const report = await response.json(); if (active()) complete(report);
    } catch (error) { if (active()) fail(error instanceof Error ? error.message : 'Không thể lấy kết quả từ máy chủ.'); }
  }, [scheduleId, complete, fail, transition]);

  const toggleMic = useCallback(() => {
    if (statusRef.current !== 'CONNECTED') return;
    muted.current = !muted.current; setIsMicMuted(muted.current);
    streamRef.current?.getAudioTracks().forEach(track => { track.enabled = !muted.current; });
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; void cleanup(); };
  }, [cleanup]);

  return { status, isAiSpeaking, isMicMuted, transcripts, currentPlan, metadata, evaluationReport, errorMsg, questionCountdown, isTimeWarning, startRoom, finishExamNow, toggleMic, cleanup };
}
