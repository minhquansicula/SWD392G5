import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, AudioLines, CheckCircle2, Clock, FileText, GraduationCap, Loader2, Maximize2, Mic, MicOff, Minimize2, ShieldCheck, Volume2, Wifi, WifiOff } from 'lucide-react';
import { useVivaVoiceRoom } from '../../hooks/useVivaVoiceRoom';
import type { Language } from '../../utils/i18n';
import { Button, Dialog } from '../ui';
import { lockBodyScroll } from '../../utils/scrollLock';

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

export function LiveVivaRoom({ scheduleId, examTitle, courseCode, candidateName, studentCode, onExit, onFinished, language = 'vi' }: LiveVivaRoomProps) {
  const vi = language === 'vi';
  const t = (vn: string, en: string) => vi ? vn : en;
  const { status, isAiSpeaking, isMicMuted, transcripts, currentPlan, metadata, evaluationReport, errorMsg, questionCountdown, isTimeWarning, startRoom, finishExamNow, toggleMic, cleanup } = useVivaVoiceRoom({ scheduleId });
  const [confirm, setConfirm] = useState<'finish' | 'exit' | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [newContent, setNewContent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const roomRef = useRef<HTMLDivElement>(null);
  const live = ['CONNECTING', 'CONNECTED', 'RECONNECTING', 'EVALUATING'].includes(status);
  const connected = status === 'CONNECTED';
  const current = currentPlan?.number;
  const total = metadata?.totalQuestions || currentPlan?.total || metadata?.maxMainQuestions;
  const connectionLabel = connected ? t('Đã kết nối', 'Connected') : status === 'CONNECTING' ? t('Đang kết nối', 'Connecting') : status === 'RECONNECTING' ? t('Đang kết nối lại', 'Reconnecting') : status === 'COMPLETED' ? t('Đã hoàn thành', 'Completed') : status === 'EVALUATING' ? t('Đang xử lý kết quả', 'Processing results') : status === 'ERROR' ? t('Có sự cố', 'An issue occurred') : status === 'DISCONNECTED' ? t('Mất kết nối', 'Disconnected') : t('Chưa kết nối', 'Not connected');
  useEffect(() => {
    const unlock = lockBodyScroll();
    const handleFullscreen = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => { unlock(); document.removeEventListener('fullscreenchange', handleFullscreen); };
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    if (live) window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [live]);
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    if (followRef.current) element.scrollTop = element.scrollHeight;
    else setNewContent(true);
  }, [transcripts, showTranscript]);
  async function exit(done = false) {
    await cleanup();
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    if (done && onFinished) onFinished(evaluationReport?.total_score);
    else onExit();
  }
  async function toggleFullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await roomRef.current?.requestFullscreen(); } catch { /* Fullscreen is optional; the room remains usable. */ }
  }
  return <div ref={roomRef} className="fixed inset-0 z-50 flex h-dvh flex-col bg-[var(--canvas)] text-[var(--ink)]">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3 sm:px-7">
      <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#172b3a] text-white"><GraduationCap aria-hidden="true" className="h-5 w-5" /></span><div className="min-w-0"><h1 className="max-w-[60vw] truncate text-sm font-semibold sm:max-w-lg">{metadata?.examTitle || examTitle || t('Phòng thi vấn đáp', 'Oral examination')}</h1><p className="mt-1 text-xs text-[var(--muted)]">{[courseCode, candidateName, studentCode].filter(Boolean).join(' · ')}</p></div></div>
      <div className="flex items-center gap-2"><span role="status" className="ui-tag">{connected ? <Wifi aria-hidden="true" className="h-4 w-4 text-[var(--primary)]" /> : <WifiOff aria-hidden="true" className="h-4 w-4" />}{connectionLabel}</span>{document.fullscreenEnabled && <Button className="ui-icon-button hidden sm:inline-flex" aria-label={fullscreen ? t('Thoát toàn màn hình', 'Exit fullscreen') : t('Toàn màn hình', 'Enter fullscreen')} onClick={toggleFullscreen}>{fullscreen ? <Minimize2 aria-hidden="true" className="h-4 w-4" /> : <Maximize2 aria-hidden="true" className="h-4 w-4" />}</Button>}<Button className="ui-icon-button" aria-label={t('Rời phòng thi', 'Leave examination room')} onClick={() => live || status === 'DISCONNECTED' || status === 'ERROR' ? setConfirm('exit') : void exit()}><ArrowLeft aria-hidden="true" className="h-4 w-4" /></Button></div>
    </header>
    <main className={`mx-auto grid min-h-0 w-full max-w-[1440px] flex-1 gap-5 overflow-y-auto p-4 sm:p-7 ${showTranscript ? 'lg:grid-cols-[1.35fr_1fr]' : ''}`}>
      <div className="flex min-h-0 flex-col gap-5">
        <section className="ui-panel flex flex-1 flex-col p-5 sm:p-8" aria-labelledby="active-question">
          <div className="flex flex-wrap items-center justify-between gap-3"><span className="ui-tag text-[var(--primary)]">{currentPlan?.type === 'followup' ? t('Câu hỏi mở rộng', 'Follow-up question') : t('Câu hỏi chính', 'Main question')}{current ? ` · ${current}${total ? ` / ${total}` : ''}` : ''}</span><div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold tabular-nums ${isTimeWarning && connected ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200' : 'bg-[var(--surface-muted)]'}`}><Clock aria-hidden="true" className="h-4 w-4" /><span aria-label={t('Thời gian câu hỏi còn lại', 'Question time remaining')}>{currentPlan ? `${Math.floor(questionCountdown / 60).toString().padStart(2, '0')}:${(questionCountdown % 60).toString().padStart(2, '0')}` : '—:—'}</span></div></div>
          <h2 id="active-question" className="my-8 whitespace-pre-wrap text-xl font-semibold leading-relaxed tracking-tight sm:my-12 sm:text-2xl">{currentPlan?.content || t('Câu hỏi sẽ hiển thị tại đây khi giám khảo AI sẵn sàng.', 'Your question will appear here when the AI examiner is ready.')}</h2>
          {isTimeWarning && connected && <p role="status" className="mb-5 text-sm text-amber-700 dark:text-amber-300">{t('Thời gian trả lời sắp hết. Hãy hoàn tất ý chính của bạn.', 'Time is running low. Bring your main point to a conclusion.')}</p>}
          <div className="mt-auto rounded-xl border border-[var(--line)] bg-[var(--canvas)] p-4 sm:p-5"><div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">{isAiSpeaking ? <Volume2 aria-hidden="true" className="h-5 w-5" /> : <AudioLines aria-hidden="true" className="h-5 w-5" />}</span><div><p className="text-sm font-semibold">{connected ? isAiSpeaking ? t('Giám khảo AI đang nói', 'The AI examiner is speaking') : isMicMuted ? t('Micro đang tắt', 'Your microphone is muted') : t('Đang lắng nghe bạn', 'Listening to your answer') : connectionLabel}</p><p className="mt-1 text-xs text-[var(--muted)]">{connected ? isMicMuted ? t('Bật micro khi bạn sẵn sàng trả lời.', 'Unmute when you are ready to answer.') : t('Trả lời tự nhiên, rõ ràng và đúng trọng tâm.', 'Speak naturally, clearly, and stay on topic.') : t('Trạng thái thu âm phụ thuộc vào kết nối phòng thi.', 'Audio capture depends on the examination connection.')}</p></div></div></div>
          {errorMsg && status !== 'ERROR' && <p role="alert" className="mt-4 text-sm text-rose-700 dark:text-rose-300">{errorMsg}</p>}
        </section>
        <div className="ui-panel flex flex-wrap items-center justify-between gap-3 p-4"><Button variant={isMicMuted ? 'secondary' : 'primary'} onClick={toggleMic} disabled={!connected} aria-pressed={!isMicMuted}>{isMicMuted ? <MicOff aria-hidden="true" className="h-4 w-4" /> : <Mic aria-hidden="true" className="h-4 w-4" />}{isMicMuted ? t('Bật micro', 'Unmute microphone') : t('Tắt micro', 'Mute microphone')}</Button><div className="flex flex-wrap gap-2"><Button onClick={() => setShowTranscript(value => !value)} aria-expanded={showTranscript} aria-controls="live-transcript"><FileText aria-hidden="true" className="h-4 w-4" />{showTranscript ? t('Ẩn hội thoại', 'Hide transcript') : t('Xem hội thoại', 'Show transcript')}</Button><Button id="finish-viva-exam-now-btn" data-testid="finish-viva-exam-now-btn" variant="danger" disabled={!connected} onClick={() => setConfirm('finish')}>{t('Kết thúc ca thi', 'Finish examination')}</Button></div></div>
        <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-[var(--muted)]"><ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" />{t('Điểm AI là đề xuất tham khảo. Điểm chính thức do giảng viên thẩm định.', 'AI scores are advisory. Official grades are determined by your lecturer.')}</p>
      </div>
      {showTranscript && <section id="live-transcript" className="ui-panel relative flex min-h-[320px] flex-col overflow-hidden lg:min-h-0"><div className="border-b border-[var(--line)] p-5"><h2 className="flex items-center gap-2 text-sm font-semibold"><FileText aria-hidden="true" className="h-4 w-4 text-[var(--primary)]" />{t('Nội dung hội thoại', 'Conversation transcript')}</h2><p className="mt-2 text-xs text-[var(--muted)]">{t('Nội dung nhận dạng giọng nói có thể có sai sót.', 'Speech recognition may contain inaccuracies.')}</p></div><div ref={scrollRef} onScroll={event => { const element = event.currentTarget; followRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 60; if (followRef.current) setNewContent(false); }} className="max-h-[480px] flex-1 space-y-5 overflow-y-auto p-5 lg:max-h-none">
        {transcripts.length === 0 ? <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 text-center text-sm leading-relaxed text-[var(--muted)]"><AudioLines aria-hidden="true" className="h-8 w-8 opacity-50" /><p className="max-w-xs">{t('Lời thoại của bạn và giám khảo sẽ xuất hiện trong quá trình vấn đáp.', 'Your conversation with the examiner will appear as the examination progresses.')}</p></div> : transcripts.map((item, index) => <div key={item.id || index}><p className={`mb-2 text-xs font-semibold ${item.role === 'user' ? 'text-[var(--primary)]' : 'text-[var(--muted)]'}`}>{item.role === 'user' ? t('Bạn', 'You') : t('Giám khảo AI', 'AI examiner')}</p><div className={`whitespace-pre-wrap break-words rounded-xl p-4 text-sm leading-7 ${item.role === 'user' ? 'bg-[var(--primary-soft)]' : 'bg-[var(--surface-muted)]'}`}>{item.text}</div></div>)}
      </div>{newContent && <div className="absolute bottom-4 left-0 flex w-full justify-center"><Button onClick={() => { followRef.current = true; if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; setNewContent(false); }}><ArrowDown aria-hidden="true" className="h-4 w-4" />{t('Nội dung mới nhất', 'Latest messages')}</Button></div>}</section>}
    </main>
    {status === 'IDLE' && <Dialog title={t('Bắt đầu kết nối phòng thi', 'Connect to your examination')} onClose={() => void exit()} closeLabel={t('Về lịch thi', 'Back to schedules')}><p className="text-sm leading-7 text-[var(--muted)]">{t('Ca thi đã được bắt đầu. Bật micro để kết nối với giám khảo AI. Đeo tai nghe và giữ trang này mở trong quá trình thi.', 'Your examination has started. Enable your microphone to connect with the AI examiner. Use headphones and keep this page open during the examination.')}</p><Button id="start-viva-exam-btn" data-testid="start-viva-exam-btn" variant="primary" onClick={startRoom}><Mic aria-hidden="true" className="h-4 w-4" />{t('Bật micro & Kết nối', 'Enable microphone & connect')}</Button></Dialog>}
    {status === 'EVALUATING' && <div role="status" className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--canvas)]/95 p-5"><div className="ui-panel max-w-md space-y-5 p-8 text-center"><Loader2 aria-hidden="true" className="mx-auto h-9 w-9 animate-spin text-[var(--primary)]" /><h2 className="text-xl font-semibold">{t('Đang xử lý kết quả', 'Processing your results')}</h2><p className="text-sm leading-7 text-[var(--muted)]">{t('Hệ thống đang phân tích câu trả lời. Vui lòng giữ trang này mở; thời gian xử lý phụ thuộc vào dịch vụ AI.', 'The system is analyzing your answers. Please keep this page open; processing time depends on the AI service.')}</p><Button onClick={() => setConfirm('exit')}>{t('Rời phòng thi', 'Leave room')}</Button></div></div>}
    {status === 'COMPLETED' && <Dialog title={t('Bạn đã hoàn thành ca thi', 'Your examination is complete')} onClose={() => void exit(true)} closeLabel={t('Về lịch thi', 'Back to schedules')}>
      <div className="text-center">
        <CheckCircle2 aria-hidden="true" className="mx-auto mb-4 h-10 w-10 text-[var(--primary)]" />
        {evaluationReport?.total_score != null && <><p className="text-sm text-[var(--muted)]">{t('Điểm AI đề xuất', 'AI-suggested score')}</p><p className="my-3 text-4xl font-semibold tabular-nums">{evaluationReport.total_score}<span className="ml-1 text-lg text-[var(--muted)]">/{evaluationReport.scale || 10}</span></p></>}
        <p className="text-sm leading-7 text-[var(--muted)]">{t('Giảng viên sẽ thẩm định kết quả. Đây chưa phải thông báo công bố điểm chính thức.', 'Your lecturer will review the results. This is not a publication of your official grade.')}</p>
      </div>
      {evaluationReport?.summary && <div className="rounded-xl bg-[var(--surface-muted)] p-4 text-sm leading-7"><h3 className="mb-2 font-semibold">{t('Nhận xét từ AI', 'AI feedback')}</h3>{evaluationReport.summary}</div>}
      {Array.isArray(evaluationReport?.criteria) && evaluationReport.criteria.length > 0 && <section className="space-y-3">
        <h3 className="text-sm font-semibold">{t('Đánh giá theo Rubric', 'Rubric assessment')}</h3>
        {evaluationReport.criteria.map((criterion: { name: string; score?: number; weight?: number; rationale?: string; improvement?: string; evidence?: { quote?: string }[] }, index: number) => <article key={index} className="rounded-xl border border-[var(--line)] p-4 text-sm leading-7">
          <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="font-semibold">{criterion.name}</h4>{criterion.score != null && <span className="ui-tag">AI: {criterion.score}</span>}</div>
          {criterion.weight != null && <p className="mt-1 text-xs text-[var(--muted)]">{t('Trọng số', 'Weight')}: {criterion.weight}%</p>}
          {criterion.rationale && <p className="mt-3 whitespace-pre-wrap text-[var(--muted)]">{criterion.rationale}</p>}
          {criterion.improvement && <p className="mt-3 whitespace-pre-wrap"><strong>{t('Gợi ý cải thiện:', 'Suggested improvement:')}</strong> {criterion.improvement}</p>}
          {criterion.evidence?.filter(item => item.quote).map((item, quoteIndex) => <blockquote key={quoteIndex} className="mt-3 border-l-2 border-[var(--primary)] pl-3 text-[var(--muted)]">{item.quote}</blockquote>)}
        </article>)}
      </section>}
      <Button variant="primary" className="w-full" onClick={() => void exit(true)}>{t('Về lịch thi của tôi', 'Back to my examinations')}</Button>
    </Dialog>}
    {(status === 'ERROR' || status === 'DISCONNECTED') && <Dialog title={t('Chưa thể tiếp tục kết nối', 'Unable to continue the connection')} onClose={() => setConfirm('exit')} closeLabel={t('Rời phòng thi', 'Leave room')}><p role="alert" className="text-sm leading-7">{errorMsg || t('Kết nối đã bị gián đoạn. Trạng thái lưu câu trả lời cần được xác nhận từ máy chủ.', 'The connection was interrupted. Answer persistence must be confirmed by the server.')}</p><p className="text-sm leading-7 text-[var(--muted)]">{t('Quay về lịch thi để kiểm tra trạng thái ca thi. Nếu sự cố tiếp diễn, liên hệ giảng viên trước khi thao tác tiếp.', 'Return to your schedules to check the examination status. If the issue persists, contact your lecturer before proceeding.')}</p><Button onClick={() => void exit()}>{t('Về lịch thi', 'Back to schedules')}</Button></Dialog>}
    {confirm && <Dialog title={confirm === 'finish' ? t('Kết thúc ca thi?', 'Finish your examination?') : t('Rời phòng thi?', 'Leave the examination room?')} onClose={() => setConfirm(null)} closeLabel={t('Đóng', 'Close')}><p className="text-sm leading-7 text-[var(--muted)]">{confirm === 'finish' ? t('Phiên đối thoại sẽ dừng và các câu trả lời đã thực hiện sẽ được gửi để AI đánh giá. Bạn không thể tiếp tục trả lời sau khi kết thúc.', 'The conversation will end and your answers will be submitted for AI evaluation. You cannot continue answering after finishing.') : t('Kết nối micro sẽ đóng. Rời trang không đồng nghĩa với đã nộp bài hoặc đã lưu đầy đủ; hãy kiểm tra lại trạng thái ca thi và liên hệ giảng viên khi cần.', 'Your microphone connection will close. Leaving does not confirm submission or that all answers were saved. Check your examination status and contact your lecturer if needed.')}</p><div className="flex flex-wrap justify-end gap-2"><Button onClick={() => setConfirm(null)}>{t('Ở lại', 'Stay here')}</Button><Button variant="danger" id={confirm === 'finish' ? 'confirm-finish-viva-btn' : undefined} data-testid={confirm === 'finish' ? 'confirm-finish-viva-btn' : undefined} onClick={() => { const action = confirm; setConfirm(null); if (action === 'finish') void finishExamNow(); else void exit(); }}>{confirm === 'finish' ? t('Xác nhận kết thúc', 'Confirm finish') : t('Xác nhận rời phòng', 'Leave room')}</Button></div></Dialog>}
  </div>;
}
