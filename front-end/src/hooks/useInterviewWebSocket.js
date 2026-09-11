// ============================================================
// AIVES — useInterviewWebSocket Hook (Mock STOMP)
// ============================================================
import { useEffect, useRef, useCallback, useState } from 'react';
import { mockStompClient } from '../mocks/mockStomp';
import { useInterviewStore } from '../store/interviewStore';
export function useInterviewWebSocket(scheduleId) {
    const [isConnected, setIsConnected] = useState(false);
    const heartbeatRef = useRef(null);
    const handleEvent = useInterviewStore((s) => s.handleEvent);
    useEffect(() => {
        // Connect
        const onEvent = (event) => {
            console.log('[WS] Received event:', event.type);
            handleEvent(event);
        };
        mockStompClient.connect(onEvent);
        setIsConnected(true);
        // Heartbeat every 15s
        heartbeatRef.current = setInterval(() => {
            if (mockStompClient.isConnected()) {
                console.log('[WS] Heartbeat sent');
            }
        }, 15000);
        return () => {
            mockStompClient.disconnect();
            setIsConnected(false);
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current);
            }
        };
    }, [scheduleId, handleEvent]);
    const startSession = useCallback((maxQ, maxF) => {
        mockStompClient.startSession(scheduleId, maxQ, maxF);
    }, [scheduleId]);
    const sendAnswerSubmitted = useCallback((audioUploadId) => {
        mockStompClient.answerSubmitted(scheduleId, audioUploadId);
    }, [scheduleId]);
    const resumeSession = useCallback(() => {
        mockStompClient.resumeSession(scheduleId);
    }, [scheduleId]);
    return { isConnected, startSession, sendAnswerSubmitted, resumeSession };
}
