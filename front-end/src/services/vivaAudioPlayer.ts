/**
 * PCMPlayer: Manages playback of raw 16-bit linear PCM audio buffers (24kHz default from Gemini Live).
 * Uses Web Audio API AudioBufferSourceNode with jitter buffer scheduling.
 */
export class PCMPlayer {
  private context: AudioContext;
  private onState: (speaking: boolean) => void;
  private nodes: Set<AudioBufferSourceNode>;
  private nextTime: number;

  constructor(context: AudioContext, onState: (speaking: boolean) => void = () => {}) {
    this.context = context;
    this.onState = onState;
    this.nodes = new Set();
    this.nextTime = 0;
  }

  push(bytes: ArrayBuffer, rate: number = 24000): void {
    if (bytes.byteLength % 2 !== 0) {
      console.warn('PCM audio chunk has odd byte length');
      return;
    }
    if (this.nextTime - this.context.currentTime > 12) {
      throw new Error('Audio phát không kịp. Hãy kiểm tra thiết bị loa rồi kết nối lại.');
    }

    const input = new DataView(bytes);
    const sampleCount = bytes.byteLength / 2;
    const buffer = this.context.createBuffer(1, sampleCount, rate);
    const floats = buffer.getChannelData(0);

    for (let i = 0; i < floats.length; i++) {
      floats[i] = input.getInt16(i * 2, true) / 32768;
    }

    const node = this.context.createBufferSource();
    node.buffer = buffer;
    node.connect(this.context.destination);

    this.nextTime = Math.max(this.nextTime, this.context.currentTime + 0.025);
    this.nodes.add(node);
    this.onState(true);

    node.onended = () => {
      node.disconnect();
      this.nodes.delete(node);
      if (this.nodes.size === 0) {
        this.onState(false);
      }
    };

    node.start(this.nextTime);
    this.nextTime += buffer.duration;
  }

  clear(): void {
    for (const node of this.nodes) {
      node.onended = null;
      try {
        node.stop();
      } catch {
        // ignore already stopped
      }
      node.disconnect();
    }
    this.nodes.clear();
    this.nextTime = 0;
    this.onState(false);
  }
}
