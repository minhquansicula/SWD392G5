// ============================================================
// AIVES — Interview State Machine Store (Zustand)
// ============================================================
import { create } from 'zustand';
import { InterviewState, InterviewEventType, TranscriptRole, } from '../types';
const initialState = {
    state: InterviewState.IDLE,
    scheduleId: null,
    currentQuestion: '',
    currentQuestionId: '',
    questionIndex: 0,
    totalQuestions: 0,
    followupCount: 0,
    maxFollowups: 0,
    transcripts: [],
    timeRemaining: 120,
    maxTime: 120,
    lastAudioUploadId: null,
};
export const useInterviewStore = create((set, get) => ({
    ...initialState,
    initSession: (scheduleId, totalQ, maxF) => {
        set({
            ...initialState,
            scheduleId,
            totalQuestions: totalQ,
            maxFollowups: maxF,
            state: InterviewState.WAITING_FOR_QUESTION,
        });
    },
    onQuestionDelivered: (payload) => {
        const entry = {
            id: `t-${Date.now()}`,
            role: TranscriptRole.AI,
            text: payload.questionContent,
            timestamp: new Date().toISOString(),
            isFollowup: false,
        };
        set({
            state: InterviewState.PLAYING_QUESTION,
            currentQuestion: payload.questionContent,
            currentQuestionId: payload.questionId,
            questionIndex: payload.questionIndex,
            totalQuestions: payload.totalQuestions,
            followupCount: 0,
            maxFollowups: payload.maxFollowups,
            timeRemaining: 120,
            transcripts: [...get().transcripts, entry],
        });
    },
    onFollowupQuestion: (payload) => {
        const entry = {
            id: `t-${Date.now()}`,
            role: TranscriptRole.AI,
            text: payload.questionContent,
            timestamp: new Date().toISOString(),
            isFollowup: true,
        };
        set({
            state: InterviewState.PLAYING_QUESTION,
            currentQuestion: payload.questionContent,
            followupCount: payload.followupCount,
            timeRemaining: 120,
            transcripts: [...get().transcripts, entry],
        });
    },
    onPlaybackEnded: () => {
        set({ state: InterviewState.RECORDING_ANSWER });
    },
    onRecordingComplete: (transcriptText) => {
        const entry = {
            id: `t-${Date.now()}`,
            role: TranscriptRole.STUDENT,
            text: transcriptText ?? '(Đang xử lý...)',
            timestamp: new Date().toISOString(),
            isFollowup: false,
        };
        set({
            transcripts: [...get().transcripts, entry],
        });
    },
    onUploadStart: () => {
        set({ state: InterviewState.UPLOADING_AUDIO });
    },
    onUploadComplete: (audioUploadId) => {
        set({
            state: InterviewState.PROCESSING,
            lastAudioUploadId: audioUploadId,
        });
    },
    onProcessing: () => {
        set({ state: InterviewState.PROCESSING });
    },
    onSessionComplete: (_payload) => {
        set({ state: InterviewState.SESSION_COMPLETE });
    },
    handleEvent: (event) => {
        const store = get();
        switch (event.type) {
            case InterviewEventType.QUESTION_DELIVERED:
                store.onQuestionDelivered(event.payload);
                break;
            case InterviewEventType.FOLLOWUP_QUESTION:
                store.onFollowupQuestion(event.payload);
                break;
            case InterviewEventType.SESSION_COMPLETE:
                store.onSessionComplete(event.payload);
                break;
            case InterviewEventType.SESSION_RESTORED:
                // Simplified restore — just re-deliver the current question
                set({ state: InterviewState.RESTORING });
                setTimeout(() => {
                    set({ state: InterviewState.WAITING_FOR_QUESTION });
                }, 500);
                break;
            default:
                break;
        }
    },
    setTimeRemaining: (time) => {
        set({ timeRemaining: time });
    },
    reset: () => {
        set({ ...initialState });
    },
}));
