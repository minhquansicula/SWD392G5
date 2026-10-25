/* Mono PCM16, 16 kHz; weighted area resampling preserves fractional sample phase.
   The input's real sampleRate is used, not an assumed hardware rate. */
class MicCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.remaining = sampleRate / 16000;
    this.ratio = this.remaining;
    this.sum = 0;
    this.buffer = new Int16Array(640);
    this.index = 0;
    this.active = true;
    this.port.onmessage = ({ data }) => {
      if (data === 'flush') {
        if (this.index) this.port.postMessage(this.buffer.slice(0, this.index).buffer);
        this.index = 0;
        this.active = false;
        this.port.postMessage('flushed');
      }
    };
  }

  process(inputs, outputs) {
    // Output stays silent: never connect microphone audio directly to the speakers.
    for (const channel of outputs[0] || []) channel.fill(0);
    if (!this.active) return true;
    const input = inputs[0]?.[0];
    if (!input) return true;
    for (const sample of input) {
      let available = 1;
      while (available > 1e-8) {
        const taken = Math.min(available, this.remaining);
        this.sum += sample * taken;
        this.remaining -= taken;
        available -= taken;
        if (this.remaining < 1e-8) {
          const value = Math.max(-1, Math.min(1, this.sum / this.ratio));
          this.buffer[this.index++] = Math.round(value * (value < 0 ? 32768 : 32767));
          this.sum = 0;
          this.remaining = this.ratio;
          if (this.index === this.buffer.length) {
            this.port.postMessage(this.buffer.buffer, [this.buffer.buffer]);
            this.buffer = new Int16Array(640);
            this.index = 0;
          }
        }
      }
    }
    return true;
  }
}

registerProcessor('mic-capture', MicCapture);
