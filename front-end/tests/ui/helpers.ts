import { vi } from 'vitest';

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

export function installAudio() {
  const tracks = [{ stop: vi.fn(), enabled: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }];
  const stream = { getTracks: () => tracks, getAudioTracks: () => tracks } as unknown as MediaStream;
  const media = vi.fn().mockResolvedValue(stream);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: media } });
  const contexts: FakeAudioContext[] = [];
  class FakeAudioContext {
    state = 'running';
    currentTime = 0;
    destination = {};
    resume = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockImplementation(async () => { this.state = 'closed'; });
    audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
    createMediaStreamSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }));
    createAnalyser = vi.fn(() => ({ fftSize: 256, getByteTimeDomainData: (data: Uint8Array) => data.fill(128) }));
    createGain = vi.fn(() => ({ gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn() }));
    createOscillator = vi.fn(() => ({ type: 'sine', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null }));
    constructor() { contexts.push(this); }
  }
  const worklets: FakeWorklet[] = [];
  class FakeWorklet {
    port = { onmessage: null as ((event: { data: ArrayBuffer }) => void) | null };
    connect = vi.fn();
    disconnect = vi.fn();
    constructor() { worklets.push(this); }
  }
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('AudioWorkletNode', FakeWorklet);
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  return { tracks, stream, media, contexts, worklets };
}

export class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 0;
  binaryType = '';
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string | ArrayBuffer }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => { this.readyState = 3; });
  constructor(public url: string) { FakeSocket.instances.push(this); }
  open() { this.readyState = 1; this.onopen?.(); }
  message(data: object) { this.onmessage?.({ data: JSON.stringify(data) }); }
}
