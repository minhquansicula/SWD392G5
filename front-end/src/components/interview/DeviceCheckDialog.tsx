import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle2, Headphones, Loader2, Mic, Volume2 } from 'lucide-react';
import { Button, Dialog } from '../ui';

interface Props { language: 'vi' | 'en'; examTitle: string; onClose: () => void; onConfirm: () => Promise<void>; }

/** A local device check only. No recording or exam-start request is made here. */
export function DeviceCheckDialog({ language, examTitle, onClose, onConfirm }: Props) {
  const vi = language === 'vi';
  const [micReady, setMicReady] = useState(false);
  const [speakerPlayed, setSpeakerPlayed] = useState(false);
  const [heardAudio, setHeardAudio] = useState(false);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null);
  const frame = useRef<number | null>(null);
  const generation = useRef(0);
  const submitting = useRef(false);
  function release() {
    generation.current += 1;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    void context.current?.close().catch(() => {});
    context.current = null;
  }
  useEffect(() => () => release(), []);
  async function checkMic() {
    release(); setChecking(true); setMicReady(false); setLevel(0); setError('');
    const attempt = generation.current;
    let acquired: MediaStream | null = null;
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode) throw new Error(vi ? 'Cần HTTPS hoặc localhost và trình duyệt hỗ trợ Web Audio để sử dụng micro.' : 'Microphone access requires HTTPS or localhost and a browser with Web Audio support.');
      acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (attempt !== generation.current) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream.current = acquired;
      const ctx = new AudioContext(); context.current = ctx;
      await ctx.resume();
      if (attempt !== generation.current) return;
      const analyser = ctx.createAnalyser(); analyser.fftSize = 256;
      ctx.createMediaStreamSource(acquired).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, sample) => sum + ((sample - 128) / 128) ** 2, 0) / samples.length);
        setLevel(Math.min(100, Math.round(rms * 500)));
        frame.current = requestAnimationFrame(tick);
      };
      tick(); setMicReady(true);
    } catch (err) {
      if (attempt !== generation.current) return;
      acquired?.getTracks().forEach(track => track.stop());
      release();
      setError(err instanceof DOMException && err.name === 'NotAllowedError' ? (vi ? 'Micro đang bị chặn. Mở quyền micro trong cài đặt trang rồi thử lại.' : 'Microphone access is blocked. Allow it in site settings and try again.') : err instanceof Error ? err.message : (vi ? 'Không thể truy cập micro.' : 'Unable to access microphone.'));
    } finally { if (attempt === generation.current || !stream.current) setChecking(false); }
  }
  async function playSound() {
    setError('');
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
      await ctx.resume();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = 440;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      oscillator.connect(gain); gain.connect(ctx.destination);
      oscillator.onended = () => { void ctx?.close().catch(() => {}); };
      oscillator.start(); oscillator.stop(ctx.currentTime + 0.65);
      setSpeakerPlayed(true);
    } catch { void ctx?.close().catch(() => {}); setError(vi ? 'Không phát được âm thanh thử. Kiểm tra loa và trình duyệt.' : 'Could not play the test sound. Check your output device and browser.'); }
  }
  async function confirm() {
    if (submitting.current || uncertain) return;
    submitting.current = true; setBusy(true); setError(''); release();
    try { await onConfirm(); }
    catch (err) { setMicReady(false); setUncertain(axios.isAxiosError(err) && (!err.response || err.response.status >= 500)); setError(err instanceof Error ? err.message : (vi ? 'Không thể bắt đầu ca thi.' : 'Unable to start the examination.')); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <Dialog title={vi ? 'Sẵn sàng trước khi thi' : 'Get ready for your examination'} onClose={onClose} busy={busy} closeLabel={vi ? 'Đóng' : 'Close'}>
    <p className="text-sm text-[var(--muted)]">{examTitle}</p>
    <div className="flex gap-3 rounded-xl bg-[var(--primary-soft)] p-4 text-sm leading-relaxed"><Headphones aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" /><p>{vi ? 'Chọn nơi yên tĩnh và đeo tai nghe. Bước kiểm tra này chưa bắt đầu ca thi và không lưu bản ghi âm.' : 'Find a quiet space and use headphones. This check does not start your examination or save an audio recording.'}</p></div>
    <section className="rounded-xl border border-[var(--line)] p-4"><div className="mb-3 flex items-center gap-2 font-semibold"><Mic aria-hidden="true" className="h-4 w-4" />{vi ? '1. Kiểm tra micro' : '1. Check your microphone'}{micReady && <CheckCircle2 aria-label={vi ? 'Đã có quyền micro' : 'Microphone access granted'} className="ml-auto h-5 w-5 text-[var(--primary)]" />}</div><p className="mb-3 text-sm text-[var(--muted)]">{vi ? 'Cho phép micro và nói một câu. Thanh bên dưới sẽ phản hồi khi có âm thanh.' : 'Allow microphone access and say a few words. The meter responds to your voice.'}</p><meter min={0} max={100} value={level} aria-label={vi ? 'Mức âm lượng micro' : 'Microphone level'} className="mb-3 h-3 w-full" /><Button onClick={checkMic} disabled={checking || busy}>{checking && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{vi ? (micReady ? 'Kiểm tra lại micro' : 'Cho phép & Kiểm tra micro') : (micReady ? 'Check microphone again' : 'Allow & check microphone')}</Button></section>
    <section className="rounded-xl border border-[var(--line)] p-4"><div className="mb-3 flex items-center gap-2 font-semibold"><Volume2 aria-hidden="true" className="h-4 w-4" />{vi ? '2. Kiểm tra tai nghe / loa' : '2. Check headphones / speakers'}</div><Button onClick={playSound} disabled={busy}>{vi ? 'Phát âm thanh thử' : 'Play test sound'}</Button><label className="mt-4 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={heardAudio} disabled={!speakerPlayed || busy} onChange={event => setHeardAudio(event.target.checked)} className="h-4 w-4" />{vi ? 'Tôi đã nghe rõ âm thanh thử.' : 'I could hear the test sound clearly.'}</label></section>
    {error && <div role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200"><AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
    {uncertain && <p className="text-sm leading-7 text-amber-700 dark:text-amber-300">{vi ? 'Chưa xác định máy chủ đã bắt đầu ca thi hay chưa. Đóng cửa sổ này và làm mới lịch thi trước khi thao tác tiếp để tránh gửi trùng.' : 'The start request outcome is unknown. Close this dialog and refresh your schedules before proceeding to avoid a duplicate request.'}</p>}
    <p className="text-xs leading-relaxed text-[var(--muted)]">{vi ? 'Khi xác nhận, hệ thống ghi nhận thời gian bắt đầu và có thể gán câu hỏi. Bạn không thể hoàn tác việc bắt đầu ca thi.' : 'Confirming records your start time and may assign questions. Starting the examination cannot be undone.'}</p>
    <div className="flex flex-wrap justify-end gap-2"><Button disabled={busy} onClick={onClose}>{vi ? 'Đóng' : 'Close'}</Button><Button variant="primary" disabled={!micReady || !heardAudio || busy || checking || uncertain} onClick={confirm}>{busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{vi ? 'Xác nhận & Bắt đầu thi' : 'Confirm & start examination'}</Button></div>
  </Dialog>;
}
