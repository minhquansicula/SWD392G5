import {PCMPlayer} from './audio-player.js?v=voice-only-20261008-1';
const $ = (id) => document.getElementById(id);
const id = new URLSearchParams(location.search).get('id');
let session, ws, ctx, player, stream, mic, source, silence;
let active = false, finishing = false, ready = false, retries = 0, retryTimer, generation = 0, ping;
let flushResolve, sampleRate = 24000;
const nodes = new Map();
function error(message = '') { $('error').textContent = message; $('error').hidden = !message; }
function label(text) { $('connection').textContent = text; }
function activity(speaking) {
  $('orb').classList.toggle('speaking', speaking);
  $('orb').classList.toggle('listening', ready && !speaking && !finishing);
  if (ready && !finishing) $('activity').textContent = speaking ? 'Giám khảo đang nói' : 'Đang lắng nghe bạn';
}
function message(item) {
  let node = nodes.get(item.id);
  if (!node) {
    node = document.createElement('article'); node.className = `voice-message ${item.role}`;
    const name = document.createElement('strong'); name.textContent = item.role === 'user' ? 'BẠN' : 'GIÁM KHẢO AI';
    node.append(name, document.createElement('p')); $('transcript').append(node); nodes.set(item.id, node);
  }
  node.querySelector('p').textContent = item.text;
  $('transcript').scrollTop = $('transcript').scrollHeight;
}
async function api(path, options) {
  const r = await fetch(path, options); const body = await r.json();
  if (!r.ok) throw new Error(body.detail || 'Không thực hiện được yêu cầu.');
  return body;
}
function report(data) {
  $('report').hidden = false; const root = $('report-content'); root.replaceChildren();
  const total = document.createElement('h3'); total.textContent = `${data.total_score}/${data.scale} điểm`;
  const summary = document.createElement('p'); summary.textContent = data.summary; root.append(total, summary);
  for (const c of data.criteria) {
    const row = document.createElement('article');
    for (const [tag, text] of [['h3',`${c.name}: ${c.score}/10 · ${c.weight}%`],['p',c.rationale],['p',`Cải thiện: ${c.improvement}`]]) {
      const node = document.createElement(tag); node.textContent = text; row.append(node);
    }
    for (const e of c.evidence) { const q = document.createElement('blockquote'); q.textContent = e.quote; row.append(q); }
    root.append(row);
  }
  const note = document.createElement('p'); note.textContent = data.notice; root.append(note);
}
async function cleanup() {
  active = ready = false; generation++; clearTimeout(retryTimer); clearInterval(ping);
  if (ws) { ws.onclose = null; ws.close(); ws = null; }
  stream?.getTracks().forEach(t => t.stop()); stream = null;
  mic?.disconnect(); source?.disconnect(); silence?.disconnect(); player?.clear();
  if (ctx && ctx.state !== 'closed') await ctx.close();
  ctx = mic = source = silence = null;
  $('start').disabled = session?.status === 'completed'; $('finish').disabled = true;
  activity(false);
}
async function fail(e) {
  error(e.message || String(e)); label('Đã ngắt kết nối'); $('activity').textContent = 'Có thể mở lại phiên để tiếp tục';
  finishing = false; await cleanup();
  $('finish').disabled = !session || session.status === 'completed';
}
async function capture() {
  ctx = new AudioContext(); await ctx.resume(); player = new PCMPlayer(ctx, activity);
  stream = await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  await ctx.audioWorklet.addModule('/static/audio-capture-worklet.js?v=voice-only-20261008-1');
  source = ctx.createMediaStreamSource(stream); mic = new AudioWorkletNode(ctx, 'mic-capture');
  silence = ctx.createGain(); silence.gain.value = 0;
  source.connect(mic); mic.connect(silence); silence.connect(ctx.destination);
  mic.port.onmessage = ({data}) => {
    if (data === 'flushed') { flushResolve?.(); return; }
    if (!ready || ws?.readyState !== WebSocket.OPEN) return;
    if (ws.bufferedAmount > 128000) { void fail(new Error('Mạng gửi audio quá chậm. Hãy kết nối lại.')); return; }
    ws.send(data);
  };
}
function connect() {
  const epoch = ++generation;
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/live/sessions/${id}`);
  ws.binaryType = 'arraybuffer'; label(retries ? 'Đang kết nối lại…' : 'Đang kết nối…');
  ws.onmessage = ({data}) => {
    if (epoch !== generation) return;
    try {
      if (data instanceof ArrayBuffer) { if (!finishing) player.push(data, sampleRate); return; }
      const event = JSON.parse(data);
      if (event.type === 'snapshot') {
        session = event.session;
        for (const item of session.messages) message(item);
        $('progress').textContent = `${session.questions_asked}/${session.max_questions} câu`;
      }
      if (event.type === 'ready') {
        ready = true; sampleRate = event.sample_rate; label('Đã kết nối · Mic mở');
        $('finish').disabled = false; activity(false);
        $('hint').textContent = 'Trả lời bằng giọng nói. Bạn có thể ngắt lời AI để làm rõ câu hỏi. Không cần bấm nút gửi.';
      }
      if (event.type === 'transcript') message(event);
      if (event.type === 'clear_audio') player.clear();
      if (event.type === 'reconnecting') {
        ready = false; player.clear(); label('Gemini đang kết nối lại…');
        $('activity').textContent = 'Tạm dừng nói trong lúc nối lại';
        $('hint').textContent = 'Âm thanh trong thời gian mất kết nối không được gửi. Hãy nhắc lại đoạn cuối khi mic mở lại.';
      }
      if (event.type === 'plan') {
        $('progress').textContent = `${event.number}/${event.max} câu`; $('topic').textContent = event.criterion;
        $('sources').replaceChildren();
        for (const s of event.sources) { const p = document.createElement('p'); p.textContent = `${s.filename}: ${s.text}`; $('sources').append(p); }
      }
      if (event.type === 'questions_complete') { $('hint').textContent = 'Đã hết phần hỏi đáp. Bấm Kết thúc để xem đánh giá.'; }
      if (event.type === 'finishing') {
        finishing = true; ready = false; stream?.getTracks().forEach(t => t.stop()); player.clear();
        $('activity').textContent = 'Đang chốt hội thoại và chấm điểm…'; label('Đang đánh giá'); $('finish').disabled = true;
      }
      if (event.type === 'report') {
        session.status = 'completed'; session.report = event.data; report(event.data);
        void cleanup(); label('Đã hoàn thành'); $('activity').textContent = 'Buổi phỏng vấn đã kết thúc';
      }
      if (event.type === 'error') void fail(new Error(event.message));
    } catch (e) { void fail(e); }
  };
  ws.onclose = () => {
    if (epoch !== generation || !active) return;
    ready = false; player.clear();
    if (finishing) { void fail(new Error('Kết nối đóng khi chấm điểm. Bấm Kết thúc để thử chấm lại.')); return; }
    if (++retries > 4) { void fail(new Error('Không nối lại được. Transcript đã nhận vẫn được lưu.')); return; }
    label('Mất kết nối · đang thử lại'); $('activity').textContent = 'Tạm dừng nói trong lúc nối lại';
    retryTimer = setTimeout(connect, Math.min(1000 * retries, 4000));
  };
  ws.onerror = () => {}; // onclose performs bounded retry.
}
$('start').addEventListener('click', async () => {
  if (active) return;
  error(); $('start').disabled = true; finishing = false; retries = 0;
  try {
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode) throw new Error('Dùng Chrome/Edge trên localhost hoặc HTTPS để mở mic.');
    await capture(); active = true; connect();
    ping = setInterval(() => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({type:'ping'})); }, 20000);
  } catch (e) { await fail(e); }
});
$('finish').addEventListener('click', async () => {
  if (finishing) return;
  $('finish').disabled = true; finishing = true; error();
  try {
    if (active && ws?.readyState === WebSocket.OPEN) {
      await Promise.race([new Promise(resolve => { flushResolve = resolve; mic.port.postMessage('flush'); }), new Promise(resolve => setTimeout(resolve, 500))]);
      ready = false; stream?.getTracks().forEach(t => t.stop()); player.clear();
      ws.send(JSON.stringify({type:'finish'})); $('activity').textContent = 'Đang chốt hội thoại và chấm điểm…';
    } else {
      const result = await api(`/api/v1/sessions/${id}/finish`, {method:'POST'});
      session.status = 'completed'; session.report = result; report(result); await cleanup(); label('Đã hoàn thành');
    }
  } catch (e) { await fail(e); }
});
$('export').addEventListener('click', async () => {
  try {
    const data = await api(`/api/v1/sessions/${id}/export`);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = `viva-${id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  } catch(e) { error(e.message); }
});
window.addEventListener('beforeunload', () => { stream?.getTracks().forEach(t => t.stop()); ws?.close(); });
(async () => {
  try {
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Thiếu mã phòng. Quay lại trang môn học để tạo phiên.');
    session = await api(`/api/v1/sessions/${id}`);
    if (session.mode !== 'voice') throw new Error('Đây là phiên text cũ. Hãy tạo phiên giọng nói mới.');
    $('student').textContent = `${session.student_name} · ${session.live_model}`;
    for (const item of session.messages) message(item);
    $('progress').textContent = `${session.questions_asked}/${session.max_questions} câu`;
    $('start').disabled = session.status === 'completed';
    $('finish').disabled = !session.answers_count;
    if (session.report) { report(session.report); $('start').disabled = true; $('finish').disabled = true; label('Đã hoàn thành'); }
  } catch(e) { error(e.message); $('start').disabled = true; }
})();
