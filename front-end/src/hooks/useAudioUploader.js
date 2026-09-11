// ============================================================
// AIVES — useAudioUploader Hook (REST Multipart Upload)
// ============================================================
import { useState, useCallback } from 'react';
import { apiUploadAudio } from '../mocks/mockApi';
export function useAudioUploader(scheduleId) {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [audioUploadId, setAudioUploadId] = useState(null);
    const upload = useCallback(async (blob) => {
        setIsUploading(true);
        setProgress(0);
        setError(null);
        try {
            // Simulate upload progress
            const progressTimer = setInterval(() => {
                setProgress((p) => Math.min(p + 20, 90));
            }, 150);
            const response = await apiUploadAudio(scheduleId, blob);
            clearInterval(progressTimer);
            setProgress(100);
            setAudioUploadId(response.audioUploadId);
            setIsUploading(false);
            return response.audioUploadId;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Upload failed';
            setError(msg);
            setIsUploading(false);
            throw err;
        }
    }, [scheduleId]);
    return { upload, isUploading, progress, error, audioUploadId };
}
