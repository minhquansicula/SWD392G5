import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useVivaVoiceRoom } from '../../src/hooks/useVivaVoiceRoom';
import { deferred, FakeSocket, installAudio } from './helpers';

const player = vi.hoisted(() => ({ push: vi.fn(), clear: vi.fn() }));
vi.mock('../../src/services/vivaAudioPlayer', () => ({ PCMPlayer: class { push = player.push; clear = player.clear; } }));
const report = { total_score: 7.5, scale: 10, summary: 'Actual feedback', criteria: [] };

describe('voice-room lifecycle and exceptions', () => {
  let audio: ReturnType<typeof installAudio>;
  beforeEach(() => {
    localStorage.setItem('accessToken', 'voice-test-token');
    vi.useFakeTimers(); audio = installAudio(); FakeSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeSocket); vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => report }));
    player.push.mockReset(); player.clear.mockReset();
  });
  async function connect() {
    const callbacks = { onFinish: vi.fn(), onError: vi.fn() };
    const view = renderHook(() => useVivaVoiceRoom({ scheduleId: 'schedule-1', ...callbacks }));
    await act(async () => { await view.result.current.startRoom(); });
    const socket = FakeSocket.instances[0];
    act(() => { socket.open(); });
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'authenticate', token: 'voice-test-token' }));
    expect(socket.url).not.toContain('voice-test-token');
    socket.send.mockClear();
    act(() => { socket.message({ type: 'ready', total_questions: 2 }); });
    return { ...view, socket, ...callbacks };
  }
  it('reports unsupported browsers without acquiring a microphone', async () => {
    vi.stubGlobal('AudioWorkletNode', undefined);
    const { result } = renderHook(() => useVivaVoiceRoom({ scheduleId: 's' }));
    await act(async () => result.current.startRoom());
    expect(result.current.status).toBe('ERROR'); expect(audio.media).not.toHaveBeenCalled();
  });
  it('requires a session before requesting microphone access', async () => {
    localStorage.removeItem('accessToken');
    const { result } = renderHook(() => useVivaVoiceRoom({ scheduleId: 's' }));
    await act(async () => result.current.startRoom());
    expect(result.current.status).toBe('ERROR');
    expect(audio.media).not.toHaveBeenCalled(); expect(FakeSocket.instances).toHaveLength(0);
  });
  it('authenticates before sending audio and waits for server readiness', async () => {
    const { result } = renderHook(() => useVivaVoiceRoom({ scheduleId: 's' }));
    await act(async () => result.current.startRoom());
    const socket = FakeSocket.instances[0]; act(() => socket.open());
    audio.worklets[0].port.onmessage?.({ data: new ArrayBuffer(4) });
    expect(socket.send.mock.calls).toEqual([[JSON.stringify({ type: 'authenticate', token: 'voice-test-token' })]]);
    expect(result.current.status).toBe('CONNECTING');
  });
  it('cleans the context on microphone denial', async () => {
    audio.media.mockRejectedValue(new DOMException('Microphone denied', 'NotAllowedError'));
    const { result } = renderHook(() => useVivaVoiceRoom({ scheduleId: 's' }));
    await act(async () => result.current.startRoom());
    expect(result.current.status).toBe('ERROR'); expect(audio.contexts[0].close).toHaveBeenCalled(); expect(FakeSocket.instances).toHaveLength(0);
  });
  it('deduplicates simultaneous start calls before React can rerender', async () => {
    const pending = deferred<MediaStream>(); audio.media.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useVivaVoiceRoom({ scheduleId: 's' }));
    let first!: Promise<void>; let second!: Promise<void>;
    act(() => { first = result.current.startRoom(); second = result.current.startRoom(); });
    await act(async () => { pending.resolve(audio.stream); await Promise.all([first, second]); });
    expect(audio.media).toHaveBeenCalledTimes(1); expect(FakeSocket.instances).toHaveLength(1);
  });
  it('stops a microphone granted after unmount and never opens a late socket', async () => {
    const pending = deferred<MediaStream>(); audio.media.mockReturnValue(pending.promise);
    const view = renderHook(() => useVivaVoiceRoom({ scheduleId: 's' }));
    let start!: Promise<void>; await act(async () => { start = view.result.current.startRoom(); });
    view.unmount(); await act(async () => { pending.resolve(audio.stream); await start; });
    expect(audio.tracks[0].stop).toHaveBeenCalled(); expect(FakeSocket.instances).toHaveLength(0);
  });
  it('mute drops audio frames and unmute restores transmission', async () => {
    const { result, socket } = await connect(); const data = new ArrayBuffer(4);
    audio.worklets[0].port.onmessage?.({ data }); expect(socket.send).toHaveBeenCalledTimes(1);
    act(() => result.current.toggleMic()); audio.worklets[0].port.onmessage?.({ data }); expect(socket.send).toHaveBeenCalledTimes(1);
    act(() => result.current.toggleMic()); audio.worklets[0].port.onmessage?.({ data }); expect(socket.send).toHaveBeenCalledTimes(2);
  });
  it('does not send audio during reconnection', async () => {
    const { socket } = await connect(); act(() => socket.message({ type: 'reconnecting' }));
    audio.worklets[0].port.onmessage?.({ data: new ArrayBuffer(4) }); expect(socket.send).not.toHaveBeenCalled();
  });
  it('releases hardware when the WebSocket closes unexpectedly', async () => {
    const { result, socket } = await connect(); act(() => socket.onclose?.());
    expect(result.current.status).toBe('DISCONNECTED'); expect(audio.tracks[0].stop).toHaveBeenCalled();
  });
  it('turns a playback exception into a recoverable error instead of throwing from onmessage', async () => {
    const { result, socket } = await connect(); player.push.mockImplementationOnce(() => { throw new Error('Audio backlog'); });
    expect(() => act(() => socket.onmessage?.({ data: new ArrayBuffer(4) }))).not.toThrow();
    expect(result.current.status).toBe('ERROR'); expect(audio.tracks[0].stop).toHaveBeenCalled();
  });
  it('rejects malformed event payloads without crashing', async () => {
    const { result, socket } = await connect();
    expect(() => act(() => socket.onmessage?.({ data: '{invalid JSON' }))).not.toThrow();
    expect(result.current.status).toBe('CONNECTED');
  });
  it('preserves zero follow-up limits and clamps invalid countdowns', async () => {
    const { result, socket } = await connect();
    act(() => socket.message({ type: 'ready', max_followups_per_main: 0 }));
    expect(result.current.metadata?.maxFollowupsPerMain).toBe(0);
    act(() => socket.message({ type: 'plan', kind: 'main', time_limit_seconds: -1 }));
    expect(result.current.questionCountdown).toBeGreaterThan(0);
  });
  it('sends finish through the connected socket only and completes once', async () => {
    const { result, socket, onFinish } = await connect();
    await act(async () => { void result.current.finishExamNow(); void result.current.finishExamNow(); });
    expect(socket.send).toHaveBeenCalledTimes(1); expect(fetch).not.toHaveBeenCalled();
    act(() => socket.message({ type: 'report', data: report }));
    expect(result.current.status).toBe('COMPLETED'); expect(onFinish).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(180000)); expect(fetch).not.toHaveBeenCalled();
  });
  it('fails a finish timeout without automatically resubmitting an uncertain request', async () => {
    const { result } = await connect(); await act(async () => { void result.current.finishExamNow(); });
    await act(async () => vi.advanceTimersByTimeAsync(180000));
    expect(result.current.status).toBe('ERROR'); expect(fetch).not.toHaveBeenCalled(); expect(audio.tracks[0].stop).toHaveBeenCalled();
  });
  it('uses one HTTP finish request when no socket remains and exposes 503', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 503, json: async () => ({ detail: 'AI unavailable' }) } as Response);
    const { result, socket } = await connect(); act(() => socket.onclose?.());
    await act(async () => result.current.finishExamNow());
    expect(fetch).toHaveBeenCalledTimes(1); expect(result.current.status).toBe('ERROR'); expect(result.current.errorMsg).toContain('AI unavailable');
    expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer voice-test-token' });
  });
  it('cancels pending HTTP grading on unmount and ignores its late result', async () => {
    const pending = deferred<Response>(); vi.mocked(fetch).mockReturnValue(pending.promise);
    const view = await connect(); act(() => view.socket.onclose?.());
    let finish!: Promise<void>; act(() => { finish = view.result.current.finishExamNow(); });
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    view.unmount(); expect(signal?.aborted).toBe(true);
    await act(async () => { pending.resolve({ ok: true, json: async () => report } as Response); await finish; });
    expect(view.onFinish).not.toHaveBeenCalled();
  });
  it('times out a socket that never becomes ready and releases the microphone', async () => {
    const { result } = renderHook(() => useVivaVoiceRoom({ scheduleId: 's' }));
    await act(async () => result.current.startRoom()); await act(async () => vi.advanceTimersByTimeAsync(45000));
    expect(result.current.status).toBe('ERROR'); expect(audio.tracks[0].stop).toHaveBeenCalled();
  });
  it('server errors terminate capture rather than leaving a false listening state', async () => {
    const { result, socket } = await connect(); act(() => socket.message({ type: 'error', message: 'Session not found' }));
    expect(result.current.status).toBe('ERROR'); expect(audio.tracks[0].stop).toHaveBeenCalled();
  });
});
