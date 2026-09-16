// ============================================================
// AIVES — useAudioRecorder Hook (MediaRecorder API)
// ============================================================
import { useState, useRef, useCallback } from 'react';
export function useAudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const startTimeRef = useRef(0);
    const timerRef = useRef(null);
    const resolveStopRef = useRef(null);
    const startRecording = useCallback(async () => {
        try {
            setError(null);
            setAudioBlob(null);
            setDuration(0);
            chunksRef.current = [];
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Try webm/opus first, fall back to default
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';
            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                setAudioBlob(blob);
                setIsRecording(false);
                // Stop all tracks
                stream.getTracks().forEach((t) => t.stop());
                // Clear timer
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                // Resolve the stop promise
                if (resolveStopRef.current) {
                    resolveStopRef.current(blob);
                    resolveStopRef.current = null;
                }
            };
            recorder.start();
            setIsRecording(true);
            startTimeRef.current = Date.now();
            // Duration timer
            timerRef.current = setInterval(() => {
                setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 500);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Microphone access denied';
            setError(msg);
            console.error('[useAudioRecorder] Error:', msg);
        }
    }, []);
    const stopRecording = useCallback(async () => {
        return new Promise((resolve) => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                resolveStopRef.current = resolve;
                mediaRecorderRef.current.stop();
            }
            else {
                resolve(null);
            }
        });
    }, []);
    return { startRecording, stopRecording, isRecording, audioBlob, duration, error };
}
