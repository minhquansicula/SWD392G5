// ============================================================
// AIVES — Mock STOMP Client (Simulates Interview WebSocket Events)
// ============================================================
import { InterviewEventType, } from '../types';
import { mockQuestions } from './data';
/**
 * MockStompClient simulates the STOMP signaling layer for the interview flow.
 * It drives the entire viva examination sequence locally:
 *
 *   1. On startSession → delivers first question after 1s
 *   2. On answerSubmitted → evaluates (1.5s delay), then either:
 *      a) Sends FOLLOWUP_QUESTION (if followup count < max)
 *      b) Sends next QUESTION_DELIVERED
 *      c) Sends SESSION_COMPLETE (if all questions done)
 */
export class MockStompClient {
    callback = null;
    questionPool = [];
    currentQuestionIdx = 0;
    followupCount = 0;
    maxQuestions = 3;
    maxFollowups = 2;
    connected = false;
    timers = [];
    connect(onEvent) {
        this.callback = onEvent;
        this.connected = true;
        console.log('[MockStomp] Connected');
    }
    disconnect() {
        this.connected = false;
        this.callback = null;
        this.timers.forEach(clearTimeout);
        this.timers = [];
        console.log('[MockStomp] Disconnected');
    }
    isConnected() {
        return this.connected;
    }
    /** Called when student clicks "Start Exam" */
    startSession(scheduleId, maxQ, maxF) {
        console.log(`[MockStomp] Starting session for schedule: ${scheduleId}`);
        this.maxQuestions = maxQ;
        this.maxFollowups = maxF;
        this.currentQuestionIdx = 0;
        this.followupCount = 0;
        // Pick random questions from the SWD392 pool
        const courseQuestions = mockQuestions.filter((q) => q.courseId === 'crs-001');
        this.questionPool = this.shuffleArray(courseQuestions.map((q) => q.id)).slice(0, this.maxQuestions);
        // Deliver first question after 1s
        this.scheduleEvent(1000, () => this.deliverCurrentQuestion());
    }
    /** Called when student has uploaded audio and sent AnswerSubmittedSignal */
    answerSubmitted(_scheduleId, _audioUploadId) {
        console.log('[MockStomp] Answer submitted, processing...');
        // Simulate AI processing delay
        this.scheduleEvent(1500, () => {
            // Decide: followup or advance?
            if (this.followupCount < this.maxFollowups && Math.random() > 0.4) {
                // 60% chance of follow-up (if quota allows)
                this.followupCount++;
                this.deliverFollowup();
            }
            else {
                // Advance to next question
                this.currentQuestionIdx++;
                this.followupCount = 0;
                if (this.currentQuestionIdx >= this.maxQuestions) {
                    // All questions done
                    this.deliverSessionComplete();
                }
                else {
                    this.deliverCurrentQuestion();
                }
            }
        });
    }
    /** Called on reconnect to restore session */
    resumeSession(_scheduleId) {
        console.log('[MockStomp] Resume session — re-delivering current question');
        this.scheduleEvent(500, () => this.deliverCurrentQuestion());
    }
    // ---------- Private helpers ----------
    deliverCurrentQuestion() {
        const questionId = this.questionPool[this.currentQuestionIdx];
        const question = mockQuestions.find((q) => q.id === questionId);
        if (!question)
            return;
        const payload = {
            questionIndex: this.currentQuestionIdx,
            totalQuestions: this.maxQuestions,
            questionId: question.id,
            questionContent: question.content,
            followupCount: 0,
            maxFollowups: this.maxFollowups,
        };
        this.emit({ type: InterviewEventType.QUESTION_DELIVERED, payload });
    }
    deliverFollowup() {
        const followupTexts = [
            'Bạn có thể giải thích rõ hơn về điểm vừa đề cập không?',
            'Vậy trong trường hợp thực tế, bạn sẽ áp dụng điều này như thế nào?',
            'Hãy cho một ví dụ cụ thể để minh họa ý kiến của bạn.',
            'Bạn đã đề cập một khía cạnh thú vị. Có trade-off nào cần cân nhắc không?',
            'So sánh cách tiếp cận này với một phương pháp thay thế khác?',
        ];
        const payload = {
            questionContent: followupTexts[this.followupCount % followupTexts.length],
            followupCount: this.followupCount,
            maxFollowups: this.maxFollowups,
        };
        this.emit({ type: InterviewEventType.FOLLOWUP_QUESTION, payload });
    }
    deliverSessionComplete() {
        const payload = {
            totalQuestionsAnswered: this.maxQuestions,
            message: 'Phiên thi vấn đáp đã hoàn thành. Cảm ơn bạn đã tham gia!',
        };
        this.emit({ type: InterviewEventType.SESSION_COMPLETE, payload });
    }
    emit(event) {
        if (this.callback && this.connected) {
            this.callback(event);
        }
    }
    scheduleEvent(ms, fn) {
        const timer = setTimeout(() => {
            if (this.connected)
                fn();
        }, ms);
        this.timers.push(timer);
    }
    shuffleArray(arr) {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}
// Singleton instance
export const mockStompClient = new MockStompClient();
