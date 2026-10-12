/* Pure Node tests for actual AudioWorklet and player sources. No packages needed. */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../app/static');
for (const rate of [16000, 44100, 48000]) {
  let Processor;
  const frames = [];
  const sandbox = {sampleRate:rate, Int16Array, AudioWorkletProcessor:class {
    constructor(){this.port={postMessage:(x)=>frames.push(x)};}
  },registerProcessor:(name, klass)=>{Processor=klass;}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'audio-capture-worklet.js'),'utf8'),sandbox);
  const p = new Processor();
  let remaining = rate;
  while (remaining) {
    const count = Math.min(128,remaining);
    p.process([[new Float32Array(count).fill(0.5)]],[[new Float32Array(count)]]);
    remaining -= count;
  }
  p.port.onmessage({data:'flush'});
  const total = frames.filter(x=>x instanceof ArrayBuffer).reduce((n,x)=>n+x.byteLength/2,0);
  assert.equal(total,16000,`one second at ${rate}Hz must yield 16000 samples`);
  assert.equal(frames.at(-1),'flushed');
  for(const f of frames.filter(x=>x instanceof ArrayBuffer)) {
    assert(f.byteLength <= 1280); assert(new Int16Array(f).every(x=>Math.abs(x-16384)<=1));
  }
}
let Player;
const sandbox = {DataView, Set};
vm.runInNewContext(fs.readFileSync(path.join(root,'audio-player.js'),'utf8').replace('export class PCMPlayer','globalThis.PCMPlayer = class PCMPlayer'),sandbox);
Player=sandbox.PCMPlayer;
const created=[];
const ctx={currentTime:1,destination:{},createBuffer:(channels,len,rate)=>({duration:len/rate,getChannelData:()=>new Float32Array(len)}),
  createBufferSource:()=>{const n={connect(){},disconnect(){},start(t){this.at=t},stop(){this.stopped=true}};created.push(n);return n;}};
const player=new Player(ctx);
player.push(new ArrayBuffer(4800));player.push(new ArrayBuffer(4800));
assert(created[1].at>created[0].at);
player.clear();assert(created.every(n=>n.stopped));assert.equal(player.nodes.size,0);
assert.throws(()=>player.push(new ArrayBuffer(3)));
console.log('PASS: 16/44.1/48kHz resampling, flush, PCM sample values, playback ordering, interruption, invalid frame');
