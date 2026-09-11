// ============================================================
// AIVES — Module 3: Viva Room (Core Interview Interface)
// ============================================================
import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, Square, Loader2, AlertCircle, Video, CheckCircle2 } from 'lucide-react';
import { InterviewState } from '../types';
import { useInterviewStore } from '../store/interviewStore';
import { useInterviewWebSocket } from '../hooks/useInterviewWebSocket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useAudioUploader } from '../hooks/useAudioUploader';
import { TimerBar, TranscriptBubble } from '../components/ui';
export default function VivaRoom() {
    const { scheduleId } = useParams();
    const navigate = useNavigate();
    // Store & Hooks
    const store = useInterviewStore();
    const ws = useInterviewWebSocket(scheduleId);
    const recorder = useAudioRecorder();
    const uploader = useAudioUploader(scheduleId);
    // Audio Playback with speech synthesis fallback for mock mode
    useAudioPlayback(() => {
        store.onPlaybackEnded();
    });
    // Local state
    const scrollRef = useRef(null);
    const initError = false;
    // ---------- Auto-scroll transcript ----------
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [store.transcripts]);
    // ---------- Mock Start / Restore ----------
    useEffect(() => {
        if (!ws.isConnected)
            return;
        if (store.state === InterviewState.IDLE) {
            // Initialize state for mock demo (normally backend provides these limits)
            store.initSession(scheduleId, 3, 2);
            ws.startSession(3, 2);
        }
        else if (store.state === InterviewState.RESTORING) {
            ws.resumeSession();
        }
    }, [ws.isConnected, store.state, scheduleId]);
    // ---------- TTS Auto-play (Mock) ----------
    useEffect(() => {
        if (store.state === InterviewState.PLAYING_QUESTION) {
            // In a real app, we'd play the `ttsAudioUrl` from the event payload.
            // For this mock demo, we use SpeechSynthesis API to read the text.
            const text = store.currentQuestion;
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'vi-VN';
                utterance.onend = () => store.onPlaybackEnded();
                // Add a slight delay to feel natural
                setTimeout(() => window.speechSynthesis.speak(utterance), 500);
            }
            else {
                // Fallback simulated delay
                setTimeout(() => store.onPlaybackEnded(), 3000);
            }
        }
        return () => {
            if ('speechSynthesis' in window)
                window.speechSynthesis.cancel();
        };
    }, [store.state, store.currentQuestion]);
    // ---------- Timer Tick ----------
    useEffect(() => {
        if (store.state === InterviewState.RECORDING_ANSWER) {
            const timer = setInterval(() => {
                if (store.timeRemaining > 0) {
                    store.setTimeRemaining(store.timeRemaining - 1);
                }
                else {
                    // Time up — auto stop recording
                    handleStopRecording();
                }
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [store.state, store.timeRemaining]);
    // ---------- Handlers ----------
    const handleStartRecording = async () => {
        await recorder.startRecording();
    };
    const handleStopRecording = async () => {
        const blob = await recorder.stopRecording();
        if (blob) {
            store.onUploadStart();
            try {
                const uploadId = await uploader.upload(blob);
                store.onUploadComplete(uploadId);
                // Optionally mock transcript generation for demo
                store.onRecordingComplete(`(Audio uploaded: ${uploadId.substring(0, 8)}...)`);
                // Signal backend
                ws.sendAnswerSubmitted(uploadId);
            }
            catch (err) {
                console.error('Upload failed', err);
                // Handle error...
            }
        }
    };
    // ---------- Render Helpers ----------
    if (initError) {
        return (<div className="h-screen bg-surface-950 flex items-center justify-center">
        <div className="glass rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-danger-500 mx-auto mb-4"/>
          <h2 className="text-xl font-bold text-surface-100 mb-2">Failed to Join Room</h2>
          <p className="text-surface-200/60 text-sm mb-6">Could not establish connection to the interview server.</p>
          <button onClick={() => navigate('/my-schedules')} className="px-6 py-2 rounded-xl bg-surface-800 text-surface-100 font-medium">Return</button>
        </div>
      </div>);
    }
    return (<div className="h-screen w-full bg-surface-950 flex flex-col overflow-hidden fixed inset-0 z-50">
      
      {/* Top Bar */}
      <header className="h-14 glass border-b border-surface-800 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-danger-500/10 border border-danger-500/20 text-danger-400 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-danger-500 animate-pulse"/>
            Live Viva
          </div>
          <span className="text-sm font-medium text-surface-200/60 border-l border-surface-800 pl-3">
            Exam ID: {scheduleId?.split('-')[1]}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          {!ws.isConnected && (<span className="text-xs text-warning-400 animate-pulse flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin"/>
              Reconnecting...
            </span>)}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left/Center: Camera & Controls */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
          
          {/* Question Display overlaying the background */}
          <div className="absolute top-8 left-8 right-8 z-10 animate-fade-in">
            <div className="glass-light rounded-2xl p-6 border-l-4 border-l-primary-500 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-primary-400 uppercase tracking-widest">
                  Question {store.questionIndex + 1} / {store.totalQuestions}
                </span>
                {store.followupCount > 0 && (<span className="px-3 py-1 rounded-full bg-accent-500/20 text-accent-400 text-xs font-bold border border-accent-500/30">
                    Follow-up {store.followupCount} / {store.maxFollowups}
                  </span>)}
              </div>
              <h2 className="text-xl md:text-2xl font-semibold text-surface-100 leading-relaxed">
                {store.currentQuestion || "Waiting for question..."}
              </h2>
            </div>
          </div>

          {/* Center visualizer / User Camera placeholder */}
          <div className="w-full max-w-2xl aspect-video rounded-3xl bg-surface-900 border border-surface-800 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl my-auto">
            
            {store.state === InterviewState.RECORDING_ANSWER ? (<>
                <div className="absolute inset-0 bg-primary-500/5 animate-pulse-ring rounded-full w-64 h-64 mx-auto my-auto"/>
                <Mic className="w-16 h-16 text-primary-400 animate-pulse relative z-10"/>
                <p className="mt-4 text-surface-100 font-medium relative z-10">Recording Answer...</p>
              </>) : store.state === InterviewState.PLAYING_QUESTION ? (<>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(i => (<div key={i} className="w-2 bg-accent-500 rounded-full animate-pulse" style={{ height: `${20 + Math.random() * 40}px`, animationDelay: `${i * 0.1}s` }}/>))}
                </div>
                <p className="mt-6 text-surface-200/60 font-medium">AI is speaking...</p>
              </>) : store.state === InterviewState.UPLOADING_AUDIO || store.state === InterviewState.PROCESSING ? (<div className="flex flex-col items-center">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4"/>
                <p className="text-surface-100 font-medium">{store.state === InterviewState.UPLOADING_AUDIO ? 'Uploading Audio...' : 'AI is processing your answer...'}</p>
                {store.state === InterviewState.UPLOADING_AUDIO && (<div className="w-48 h-1.5 bg-surface-800 rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${uploader.progress}%` }}/>
                  </div>)}
              </div>) : (<Video className="w-16 h-16 text-surface-800"/>)}
            
            <div className="absolute bottom-6 left-6 right-6">
              <TimerBar remaining={store.timeRemaining} total={store.maxTime}/>
            </div>
          </div>

          {/* Controls */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 z-10">
            {store.state === InterviewState.RECORDING_ANSWER ? (<button onClick={handleStopRecording} className="flex items-center gap-2 px-8 py-4 rounded-full bg-danger-500 text-white font-bold hover:bg-danger-600 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-fade-in">
                <Square className="w-5 h-5 fill-current"/>
                Submit Answer
              </button>) : store.state === InterviewState.WAITING_FOR_QUESTION || store.state === InterviewState.PLAYING_QUESTION || store.state === InterviewState.PROCESSING ? (<button disabled className="flex items-center gap-2 px-8 py-4 rounded-full bg-surface-800/80 text-surface-200/40 font-bold backdrop-blur-md cursor-not-allowed">
                <Mic className="w-5 h-5"/>
                Please wait...
              </button>) : (<button onClick={handleStartRecording} className="flex items-center gap-2 px-8 py-4 rounded-full bg-primary-600 text-white font-bold hover:bg-primary-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                <Mic className="w-5 h-5"/>
                Start Speaking
              </button>)}
          </div>
        </div>

        {/* Right Sidebar: Transcript History */}
        <div className="w-full md:w-96 glass border-l border-surface-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-surface-800">
            <h3 className="font-semibold text-surface-100">Live Transcript</h3>
            <p className="text-xs text-surface-200/50 mt-1">Conversational history</p>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
            {store.transcripts.length === 0 ? (<p className="text-center text-xs text-surface-200/40 mt-10">Transcription will appear here</p>) : (store.transcripts.map((t) => (<TranscriptBubble key={t.id} role={t.role} text={t.text} isFollowup={t.isFollowup}/>)))}
          </div>
        </div>
      </div>

      {/* Session Complete Overlay */}
      {store.state === InterviewState.SESSION_COMPLETE && (<div className="absolute inset-0 bg-surface-950/90 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
          <div className="glass rounded-3xl p-10 max-w-lg w-full text-center shadow-2xl border-primary-500/20">
            <div className="w-20 h-20 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-primary-400"/>
            </div>
            <h2 className="text-3xl font-bold text-surface-100 mb-2">Examination Complete</h2>
            <p className="text-surface-200/70 mb-8">
              You have successfully completed all {store.totalQuestions} questions. The AI will now finalize your evaluation.
            </p>
            <button onClick={() => {
                store.reset();
                navigate('/my-schedules');
            }} className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold text-lg hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg">
              Return to Dashboard
            </button>
          </div>
        </div>)}
    </div>);
}
