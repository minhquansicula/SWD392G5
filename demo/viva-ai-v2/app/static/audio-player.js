export class PCMPlayer {
  constructor(context, onState = () => {}) {
    this.context = context; this.onState = onState; this.nodes = new Set(); this.next = 0;
  }
  push(bytes, rate = 24000) {
    if (bytes.byteLength % 2) throw new Error('Audio PCM bị thiếu byte.');
    if (this.next - this.context.currentTime > 12) throw new Error('Audio phát không kịp. Kiểm tra thiết bị loa rồi kết nối lại.');
    const input = new DataView(bytes);
    const buffer = this.context.createBuffer(1, bytes.byteLength / 2, rate);
    const floats = buffer.getChannelData(0);
    for (let i = 0; i < floats.length; i++) floats[i] = input.getInt16(i * 2, true) / 32768;
    const node = this.context.createBufferSource(); node.buffer = buffer; node.connect(this.context.destination);
    this.next = Math.max(this.next, this.context.currentTime + 0.025);
    this.nodes.add(node); this.onState(true);
    node.onended = () => { node.disconnect(); this.nodes.delete(node); if (!this.nodes.size) this.onState(false); };
    node.start(this.next); this.next += buffer.duration;
  }
  clear() {
    for (const node of this.nodes) { node.onended = null; try { node.stop(); } catch {} node.disconnect(); }
    this.nodes.clear(); this.next = 0; this.onState(false);
  }
}
