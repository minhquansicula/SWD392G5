// ============================================================
// AIVES — Module 3: Viva Room (Core Interview Interface)
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, Square, Loader2, AlertCircle, Video, CheckCircle2, ChevronRight, Waves } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InterviewState } from '../types';
import { useInterviewStore } from '../store/interviewStore';
import { useInterviewWebSocket } from '../hooks/useInterviewWebSocket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useAudioUploader } from '../hooks/useAudioUploader';
import { TimerBar, TranscriptBubble } from '../components/ui';
import { cn } from '../lib/utils';

// --- Audio Visualizer Component ---
function AudioWaveVisualizer({ active, colorClass }) {
    return (
        <div className="flex items-center justify-center gap-1.5 h-16">
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    animate={{
                        height: active ? [16, 48 + Math.random() * 32, 16] : 4,
                    }}
                    transition={{
                        duration: active ? 0.8 + Math.random() * 0.4 : 0.3,
                        repeat: active ? Infinity : 0,
                        ease: "easeInOut",
                        delay: active ? i * 0.1 : 0
                    }}
                    className={cn("w-2 rounded-full", colorClass)}
                />
            ))}
        </div>
    );
}

export default function VivaRoom() {
    const { scheduleId } = useParams();
    const navigate = useNavigate();
    const store = useInterviewStore();
    const ws = useInterviewWebSocket(scheduleId);
    const recorder = useAudioRecorder();
    const uploader = useAudioUploader(scheduleId);
    
    useAudioPlayback(() => {
        store.onPlaybackEnded();
    });
    
    const scrollRef = useRef(null);
    const initError = false;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [store.transcripts]);

    useEffect(() => {
        if (!ws.isConnected) return;
        if (store.state === InterviewState.IDLE) {
            store.initSession(scheduleId, 3, 2);
            ws.startSession(3, 2);
        } else if (store.state === InterviewState.RESTORING) {
            ws.resumeSession();
        }
    }, [ws.isConnected, store.state, scheduleId]);

    useEffect(() => {
        if (store.state === InterviewState.PLAYING_QUESTION) {
            const text = store.currentQuestion;
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'vi-VN';
                utterance.onend = () => store.onPlaybackEnded();
                setTimeout(() => window.speechSynthesis.speak(utterance), 500);
            } else {
                setTimeout(() => store.onPlaybackEnded(), 3000);
            }
        }
        return () => {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        };
    }, [store.state, store.currentQuestion]);

    useEffect(() => {
        if (store.state === InterviewState.RECORDING_ANSWER) {
            const timer = setInterval(() => {
                if (store.timeRemaining > 0) {
                    store.setTimeRemaining(store.timeRemaining - 1);
                } else {
                    handleStopRecording();
                }
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [store.state, store.timeRemaining]);

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
                store.onRecordingComplete(`(Audio uploaded: ${uploadId.substring(0, 8)}...)`);
                ws.sendAnswerSubmitted(uploadId);
            } catch (err) {
                console.error('Upload failed', err);
            }
        }
    };

    if (initError) {
        return (
            <div className="h-screen bg-surface-950 flex items-center justify-center">
                <div className="glass rounded-3xl p-8 max-w-md text-center border-danger-500/20">
                    <AlertCircle className="w-12 h-12 text-danger-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Failed to Join Room</h2>
                    <p className="text-surface-400 text-sm mb-8">Could not establish connection to the interview server.</p>
                    <button onClick={() => navigate('/my-schedules')} className="w-full px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-surface-200 transition-colors shadow-lg">Return to Dashboard</button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-surface-950 flex flex-col overflow-hidden fixed inset-0 z-50">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-500/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Top Bar */}
            <header className="h-16 flex items-center justify-between px-8 shrink-0 z-20 relative">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger-500/10 border border-danger-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-danger-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                        <span className="text-danger-400 text-[10px] font-bold uppercase tracking-widest">Live Viva</span>
                    </div>
                    <span className="text-xs font-semibold text-surface-500 uppercase tracking-widest px-4 border-l border-white/10">
                        Exam ID: {scheduleId?.split('-')[1]}
                    </span>
                </div>
                
                <div className="flex items-center gap-4">
                    {!ws.isConnected && (
                        <span className="text-xs font-bold text-warning-400 uppercase tracking-widest flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reconnecting
                        </span>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10 px-6 pb-6 gap-6">
                
                {/* Left/Center: Camera & Controls */}
                <div className="flex-1 flex flex-col items-center justify-center relative rounded-3xl border border-white/5 bg-surface-900/40 backdrop-blur-3xl shadow-2xl overflow-hidden">
                    
                    {/* Immersive Question Display */}
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={store.currentQuestion}
                            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                            className="absolute top-12 left-12 right-12 z-20 max-w-3xl mx-auto text-center"
                        >
                            <div className="mb-4 flex items-center justify-center gap-3">
                                <span className="text-[10px] font-bold text-primary-400 uppercase tracking-[0.2em]">
                                    Question {store.questionIndex + 1} / {store.totalQuestions}
                                </span>
                                {store.followupCount > 0 && (
                                    <span className="px-2.5 py-0.5 rounded-full bg-accent-500/10 text-accent-400 text-[10px] font-bold uppercase tracking-widest border border-accent-500/20">
                                        Follow-up {store.followupCount}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-2xl md:text-4xl font-semibold text-white leading-tight tracking-tight">
                                {store.currentQuestion || "Initializing exam..."}
                            </h2>
                        </motion.div>
                    </AnimatePresence>

                    {/* Central Visualizer */}
                    <div className="w-full flex-1 flex flex-col items-center justify-center relative mt-32">
                        <AnimatePresence mode="wait">
                            {store.state === InterviewState.RECORDING_ANSWER ? (
                                <motion.div 
                                    key="recording"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex flex-col items-center"
                                >
                                    <div className="relative w-32 h-32 flex items-center justify-center mb-8">
                                        <div className="absolute inset-0 bg-danger-500/20 rounded-full animate-pulse-ring" />
                                        <div className="absolute inset-2 bg-danger-500/20 rounded-full animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
                                        <div className="w-16 h-16 bg-danger-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)] relative z-10">
                                            <Mic className="w-8 h-8 text-white" />
                                        </div>
                                    </div>
                                    <AudioWaveVisualizer active={true} colorClass="bg-danger-400" />
                                    <p className="mt-6 text-sm font-bold text-danger-400 uppercase tracking-widest animate-pulse">Recording Answer</p>
                                </motion.div>
                            ) : store.state === InterviewState.PLAYING_QUESTION ? (
                                <motion.div 
                                    key="playing"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex flex-col items-center"
                                >
                                    <div className="w-32 h-32 rounded-full border border-primary-500/30 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(59,130,246,0.15)] bg-primary-500/5">
                                        <AudioWaveVisualizer active={true} colorClass="bg-primary-500" />
                                    </div>
                                    <p className="text-sm font-bold text-primary-400 uppercase tracking-widest animate-pulse">AI is speaking</p>
                                </motion.div>
                            ) : store.state === InterviewState.UPLOADING_AUDIO || store.state === InterviewState.PROCESSING ? (
                                <motion.div 
                                    key="processing"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center"
                                >
                                    <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-6" />
                                    <p className="text-sm font-bold text-white uppercase tracking-widest">
                                        {store.state === InterviewState.UPLOADING_AUDIO ? 'Uploading Audio' : 'Processing Answer'}
                                    </p>
                                    {store.state === InterviewState.UPLOADING_AUDIO && (
                                        <div className="w-64 h-1 bg-surface-800 rounded-full mt-6 overflow-hidden border border-white/5">
                                            <motion.div 
                                                className="h-full bg-primary-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" 
                                                animate={{ width: `${uploader.progress}%` }} 
                                            />
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div key="idle" className="flex flex-col items-center opacity-30">
                                    <Video className="w-16 h-16 text-white mb-4" />
                                    <p className="text-sm font-bold text-white uppercase tracking-widest">Camera Standby</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    
                    {/* Time limit indicator */}
                    {store.state === InterviewState.RECORDING_ANSWER && (
                        <div className="absolute top-12 right-12 w-48 z-20">
                            <TimerBar remaining={store.timeRemaining} total={store.maxTime} />
                        </div>
                    )}

                    {/* Bottom Controls */}
                    <div className="absolute bottom-12 left-0 right-0 flex justify-center z-20">
                        <AnimatePresence mode="popLayout">
                            {store.state === InterviewState.RECORDING_ANSWER ? (
                                <motion.button 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    onClick={handleStopRecording} 
                                    className="flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-bold hover:bg-surface-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                                >
                                    <Square className="w-5 h-5 fill-current" />
                                    <span>Submit Answer</span>
                                </motion.button>
                            ) : store.state === InterviewState.WAITING_FOR_QUESTION || store.state === InterviewState.PLAYING_QUESTION || store.state === InterviewState.PROCESSING ? (
                                <motion.button 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    disabled 
                                    className="flex items-center gap-3 px-8 py-4 rounded-full bg-surface-800 text-surface-500 font-bold border border-white/5 cursor-not-allowed"
                                >
                                    <Mic className="w-5 h-5 opacity-50" />
                                    <span>Please Wait</span>
                                </motion.button>
                            ) : (
                                <motion.button 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    onClick={handleStartRecording} 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-3 px-8 py-4 rounded-full bg-primary-600 text-white font-bold hover:bg-primary-500 shadow-[0_0_30px_rgba(37,99,235,0.4)]"
                                >
                                    <Mic className="w-5 h-5" />
                                    <span>Start Speaking</span>
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right Sidebar: Transcript History */}
                <div className="w-full md:w-96 rounded-3xl border border-white/5 bg-surface-900/40 backdrop-blur-3xl flex flex-col shrink-0 overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Live Transcript</h3>
                    </div>
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                        {store.transcripts.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-40">
                                <Waves className="w-8 h-8 mb-4 text-surface-400" />
                                <p className="text-xs font-semibold text-surface-400 uppercase tracking-widest text-center">Transcript will appear here</p>
                            </div>
                        ) : (
                            <AnimatePresence initial={false}>
                                {store.transcripts.map((t) => (
                                    <TranscriptBubble key={t.id} role={t.role} text={t.text} isFollowup={t.isFollowup} />
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>

            {/* Session Complete Overlay */}
            <AnimatePresence>
                {store.state === InterviewState.SESSION_COMPLETE && (
                    <motion.div 
                        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                        animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
                        className="absolute inset-0 bg-surface-950/80 z-50 flex items-center justify-center"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="bg-surface-900 border border-white/10 rounded-3xl p-12 max-w-xl w-full text-center shadow-2xl shadow-black relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-50" />
                            
                            <div className="w-24 h-24 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-8 relative">
                                <div className="absolute inset-0 rounded-full border border-primary-500/30 animate-ping opacity-20" />
                                <CheckCircle2 className="w-12 h-12 text-primary-400" />
                            </div>
                            
                            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Examination Complete</h2>
                            <p className="text-surface-400 mb-10 text-lg leading-relaxed">
                                You have successfully completed all {store.totalQuestions} questions. The AI will now finalize your evaluation.
                            </p>
                            
                            <button 
                                onClick={() => {
                                    store.reset();
                                    navigate('/my-schedules');
                                }} 
                                className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg hover:bg-surface-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2 group"
                            >
                                Return to Dashboard
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
