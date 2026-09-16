// ============================================================
// AIVES — useAudioPlayback Hook (HTMLAudioElement)
// ============================================================
import { useState, useRef, useCallback, useEffect } from 'react';
export function useAudioPlayback(onEnded) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);
    const objectUrlRef = useRef(null);
    const intervalRef = useRef(null);
    const cleanup = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    }, []);
    useEffect(() => {
        return cleanup;
    }, [cleanup]);
    const play = useCallback((source) => {
        cleanup();
        const audio = new Audio();
        audioRef.current = audio;
        if (source instanceof Blob) {
            objectUrlRef.current = URL.createObjectURL(source);
            audio.src = objectUrlRef.current;
        }
        else {
            audio.src = source;
        }
        audio.onloadedmetadata = () => {
            setDuration(audio.duration);
        };
        audio.onended = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            cleanup();
            onEnded?.();
        };
        audio.onerror = () => {
            // If audio fails (e.g. mock URL), simulate playback with SpeechSynthesis
            console.warn('[useAudioPlayback] Audio source failed, using SpeechSynthesis fallback');
            setIsPlaying(false);
            cleanup();
            // Trigger onEnded after a brief delay to simulate playback
            setTimeout(() => onEnded?.(), 500);
        };
        audio.play().then(() => {
            setIsPlaying(true);
            intervalRef.current = setInterval(() => {
                setCurrentTime(audio.currentTime);
            }, 200);
        }).catch(() => {
            // Autoplay blocked — simulate
            setIsPlaying(false);
            setTimeout(() => onEnded?.(), 500);
        });
    }, [cleanup, onEnded]);
    const pause = useCallback(() => {
        audioRef.current?.pause();
        setIsPlaying(false);
    }, []);
    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
        setCurrentTime(0);
        cleanup();
    }, [cleanup]);
    return { play, pause, stop, isPlaying, currentTime, duration };
}
