"use strict";
const $ = (id) => document.getElementById(id);
const state = {courseId: localStorage.getItem("viva.course") || "", courses: [], docs: [], rubrics: [],
  sessions: [], session: null, socket: null, socketGeneration: 0, busy: false, uploading: false,
  pending: null, streamNode: null, retryTimer: null, retryDelay: 1000, autoStart: false, health: null};

function el(tag, text = "", cls = "") {
  const node = document.createElement(tag);
  if (text !== "") node.textContent = text;
  if (cls) node.className = cls;
  return node;
}
function notice(message, type = "") {
  $("notice").textContent = message;
  $("notice").className = `notice ${type}`;
  $("notice").hidden = !message;
}
async function api(path, options = {}) {
  const opts = {...options};
  if (opts.body && !(opts.body instanceof FormData)) {
    opts.headers = {...opts.headers, "Content-Type": "application/json"};
    opts.body = JSON.stringify(opts.body);
  }
  const response = await fetch(path, opts);
  const data = await response.json();
  if (!response.ok) {
    let message = data.detail || "Không thực hiện được yêu cầu.";
    if (data.issues) message += " " + data.issues.map((i) => i.message).join("; ");
    throw new Error(message);
  }
  return data;
}
function guarded(fn) {
  return async (...args) => {
    try { await fn(...args); }
    catch (error) { notice(error.message || "Có lỗi xảy ra. Hãy thử lại.", "error"); }
  };
}
function showView(name) {
  for (const section of document.querySelectorAll(".view")) section.hidden = section.id !== `view-${name}`;
  for (const button of document.querySelectorAll(".nav")) button.classList.toggle("active", button.dataset.view === name);
  if (name === "history") guarded(loadHistory)();
}
function statusLabel(status) {
  return {new: "Chưa bắt đầu", active: "Đang phỏng vấn", awaiting_finish: "Chờ đánh giá", completed: "Đã hoàn thành"}[status] || status;
}
function fillSelect(node, values, emptyText, labelKey = "name", selected = "") {
  node.replaceChildren();
  if (!values.length) node.append(new Option(emptyText, ""));
  for (const value of values) node.append(new Option(value[labelKey], value.id));
  if (values.some((v) => v.id === selected)) node.value = selected;
}
function updateControls() {
  const s = state.session;
  const connected = state.socket?.readyState === WebSocket.OPEN;
  const canAnswer = connected && s?.status === "active" && !state.busy && !state.pending;
  $("answer-input").disabled = !canAnswer;
  $("send-button").disabled = !canAnswer || !$("answer-input").value.trim();
  $("cancel-button").hidden = !state.busy;
  $("retry-row").hidden = !state.pending || state.busy;
  $("retry-button").disabled = !connected || state.busy;
  $("finish-button").disabled = !s || state.busy || (!s.report && (!connected || s.answers_count < 1));
  $("finish-button").textContent = s?.report ? "Xem lại đánh giá" : "Kết thúc & xem đánh giá";
  $("export-button").disabled = !s;
  $("start-button").disabled = !state.courseId || !state.docs.length || !state.rubrics.length || state.uploading || state.busy;
  $("document-input").disabled = !state.courseId || state.uploading;
  $("import-rubric").disabled = !state.courseId;
  $("manual-rubric").disabled = !state.courseId;
}
function renderDocuments() {
  $("doc-count").textContent = `${state.docs.length} file`;
  $("document-list").replaceChildren();
  for (const doc of state.docs) {
    const li = el("li");
    li.append(el("span", doc.filename.split(".").pop().toUpperCase(), "file-glyph"));
    const info = el("div", doc.filename, "file-name");
    info.append(el("span", `${doc.chunk_count} đoạn · sẵn sàng sử dụng`, "file-meta"));
    li.append(info, el("span", "✓", "file-check"));
    $("document-list").append(li);
  }
}
function renderRubric() {
  const rubric = state.rubrics.find((r) => r.id === $("rubric-select").value);
  $("rubric-summary").replaceChildren();
  if (!rubric) $("rubric-summary").append(el("p", "Thêm rubric để định hướng buổi phỏng vấn.", "empty-small"));
  for (const criterion of rubric?.criteria || []) {
    const row = el("div", "", "rubric-row");
    row.append(el("span", criterion.name), el("strong", `${criterion.weight}%`));
    row.title = criterion.description;
    $("rubric-summary").append(row);
  }
  if (rubric) {
    $("max-questions").min = rubric.criteria.length;
    if (Number($("max-questions").value) < rubric.criteria.length) $("max-questions").value = rubric.criteria.length;
  }
  updateControls();
}
async function loadCourse() {
  const id = state.courseId;
  localStorage.setItem("viva.course", id);
  $("course-name").textContent = state.courses.find((c) => c.id === id)?.name || "Bắt đầu một môn học";
  if (!id) { state.docs = []; state.rubrics = []; }
  else {
    const [docs, rubrics] = await Promise.all([
      api(`/api/v1/courses/${id}/documents`), api(`/api/v1/courses/${id}/rubrics`),
    ]);
    if (id !== state.courseId) return;
    state.docs = docs; state.rubrics = rubrics;
  }
  const selected = $("rubric-select").value;
  fillSelect($("rubric-select"), state.rubrics, "Chưa có rubric", "title", selected);
  renderDocuments(); renderRubric();
}
function closeSocket() {
  state.socketGeneration++;
  clearTimeout(state.retryTimer);
  if (state.socket) state.socket.close();
  state.socket = null;
  state.busy = false;
}
function renderMessage(message) {
  const wrapper = el("article", "", `message ${message.role}`);
  wrapper.append(el("div", message.role === "user" ? "Bạn" : "Giám khảo AI", "message-label"));
  wrapper.append(el("div", message.text, "message-body"));
  if (message.sources?.length) {
    const details = el("details", "", "sources");
    details.append(el("summary", `${message.sources.length} đoạn tài liệu được tham khảo`));
    for (const source of message.sources) {
      const item = el("div", "", "source-item");
      item.append(el("strong", source.filename + (source.page ? ` · trang ${source.page}` : "")));
      item.append(el("p", source.text));
      details.append(item);
    }
    wrapper.append(details);
  }
  $("messages").append(wrapper);
  return wrapper;
}
function scrollChat() { $("messages").scrollTop = $("messages").scrollHeight; }
function renderSession(session) {
  state.session = session;
  let outbox = null;
  try { outbox = JSON.parse(localStorage.getItem(`viva.outbox.${session.id}`)); } catch { /* Invalid local draft. */ }
  state.pending = session.pending || (session.status !== "completed" ? outbox : null);
  state.streamNode = null;
  $("messages").replaceChildren();
  for (const message of session.messages || []) renderMessage(message);
  if (!session.messages?.length) $("messages").append(el("p", "Đang chuẩn bị câu hỏi đầu tiên…", "empty-small"));
  if (session.status === "awaiting_finish") $("messages").append(el("p", "Bạn đã hoàn thành phần hỏi đáp. Chọn “Kết thúc & xem đánh giá” để nhận phản hồi theo rubric.", "empty-small"));
  if (session.status === "completed") $("messages").append(el("p", "Buổi phỏng vấn đã hoàn thành. Bạn có thể xem lại đánh giá hoặc xuất toàn bộ hội thoại.", "empty-small"));
  $("question-counter").textContent = `${session.questions_asked}/${session.max_questions} câu tối đa`;
  $("chat-subtitle").textContent = `${statusLabel(session.status)} · ${session.model}`;
  $("session-student").textContent = session.student_name;
  $("session-progress").textContent = `Đã trả lời ${session.answers_count} câu`;
  $("progress-fill").style.width = `${Math.min(100, 100 * session.answers_count / session.max_questions)}%`;
  const covered = new Set((session.messages || []).filter((m) => m.role === "user").map((m) => m.criterion_id));
  $("criteria-progress").replaceChildren();
  session.rubric.criteria.forEach((c, index) => {
    const current = index === session.criterion_index && session.status === "active";
    const row = el("div", "", `criterion-progress ${current ? "current" : covered.has(c.id) ? "covered" : ""}`);
    row.append(el("span", current ? "●" : covered.has(c.id) ? "✓" : "○"), el("span", c.name));
    $("criteria-progress").append(row);
  });
  updateControls(); scrollChat();
}
async function refreshSession(id = state.session?.id) {
  if (!id) return;
  const session = await api(`/api/v1/sessions/${id}`);
  if (state.session?.id === id) renderSession(session);
}
function setSocketBadge(message, ready = false) {
  $("socket-badge").replaceChildren(el("i"), document.createTextNode(message));
  $("socket-badge").className = `badge ${ready ? "ready" : "warn"}`;
}
function openSocket(id) {
  closeSocket();
  const generation = state.socketGeneration;
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(`${protocol}//${location.host}/ws/sessions/${id}`);
  state.socket = socket;
  setSocketBadge("Đang kết nối");
  socket.onopen = () => {
    if (generation !== state.socketGeneration) return;
    state.retryDelay = 1000; setSocketBadge("Đã kết nối", true); updateControls();
  };
  socket.onmessage = async ({data}) => {
    if (generation !== state.socketGeneration) return;
    try {
      const event = JSON.parse(data);
      if (event.type === "snapshot") {
        renderSession(event.session);
        $("stream-status").textContent = "";
        if (state.autoStart && event.session.status === "new") {
          state.autoStart = false;
          sendTurn({request_id: crypto.randomUUID(), action: "start", text: ""});
        } else if (event.session.status === "new" && !state.pending) {
          state.pending = {request_id: crypto.randomUUID(), action: "start", text: ""};
          updateControls();
        }
      } else if (event.type === "status") {
        $("stream-status").textContent = event.message;
      } else if (event.type === "delta") {
        if (!state.streamNode) {
          state.streamNode = renderMessage({role: "assistant", text: ""});
          state.streamNode.classList.add("streaming");
        }
        state.streamNode.querySelector(".message-body").append(document.createTextNode(event.text));
        scrollChat();
      } else if (event.type === "done") {
        localStorage.removeItem(`viva.outbox.${id}`);
        state.busy = false; state.pending = null;
        $("stream-status").textContent = "";
        await refreshSession(id);
      } else if (event.type === "report") {
        localStorage.removeItem(`viva.outbox.${id}`);
        state.busy = false; state.pending = null;
        $("stream-status").textContent = "";
        await refreshSession(id); showReport(event.report);
      } else if (event.type === "error") {
        state.busy = false;
        $("stream-status").textContent = "";
        notice(event.message, "error");
        await refreshSession(id);
        if (state.session?.status === "new" && !state.pending) {
          state.pending = {request_id: crypto.randomUUID(), action: "start", text: ""};
        }
      } else if (event.type === "busy") notice(event.message);
      updateControls();
    } catch (error) { state.busy = false; updateControls(); notice(error.message, "error"); }
  };
  socket.onclose = () => {
    if (generation !== state.socketGeneration) return;
    state.busy = false;
    setSocketBadge("Đang kết nối lại");
    $("stream-status").textContent = "Kết nối gián đoạn. Đang khôi phục phiên đã lưu…";
    updateControls();
    state.retryTimer = setTimeout(() => {
      if (state.session?.id === id) openSocket(id);
    }, state.retryDelay);
    state.retryDelay = Math.min(state.retryDelay * 2, 15000);
  };
  socket.onerror = () => setSocketBadge("Kết nối gián đoạn");
}
function sendTurn(body, retry = false) {
  if (state.socket?.readyState !== WebSocket.OPEN) throw new Error("Đang kết nối lại. Vui lòng chờ.");
  if (state.busy) return;
  notice(""); state.busy = true; state.pending = body; state.streamNode = null;
  localStorage.setItem(`viva.outbox.${state.session.id}`, JSON.stringify(body));
  $("stream-status").textContent = "Đang gửi…";
  if (body.action === "answer" && !retry) renderMessage({role: "user", text: body.text});
  state.socket.send(JSON.stringify({type: "turn", ...body}));
  updateControls(); scrollChat();
}
async function selectSession(id, autoStart = false) {
  closeSocket();
  const session = await api(`/api/v1/sessions/${id}`);
  state.autoStart = autoStart;
  localStorage.setItem("viva.session", id);
  renderSession(session); showView("interview");
  if (session.status !== "completed") openSocket(id);
  else setSocketBadge("Phiên đã kết thúc");
}
async function loadHistory() {
  $("history-list").replaceChildren();
  if (!state.courseId) { $("history-list").append(el("p", "Tạo hoặc chọn môn học để xem lịch sử.", "history-empty")); return; }
  const id = state.courseId;
  state.sessions = await api(`/api/v1/sessions?course_id=${id}`);
  if (id !== state.courseId) return;
  if (!state.sessions.length) $("history-list").append(el("p", "Buổi phỏng vấn đầu tiên của bạn sẽ xuất hiện ở đây.", "history-empty"));
  for (const s of state.sessions) {
    const card = el("article", "", "history-item");
    const detail = el("div", "", "history-detail");
    detail.append(el("h3", s.student_name));
    detail.append(el("p", `${new Date(s.created_at).toLocaleString("vi-VN")} · ${s.answers_count} câu trả lời · ${statusLabel(s.status)}`));
    const button = el("button", s.report ? "Xem kết quả ↗" : "Tiếp tục ↗", "secondary");
    button.addEventListener("click", guarded(async () => { await selectSession(s.id); if (s.report) showReport(s.report); }));
    card.append(el("span", "✳", "history-icon"), detail);
    if (s.report) card.append(el("span", `${s.report.total_score}/10`, "history-score"));
    card.append(button); $("history-list").append(card);
  }
}
function weightTotal() {
  const total = [...document.querySelectorAll(".criterion-weight")].reduce((sum, input) => sum + Number(input.value), 0);
  $("weight-total").textContent = `Tổng: ${total}%`;
  $("weight-total").className = total === 100 ? "" : "form-error";
}
function addCriterion(c = {}) {
  if ($("criteria-editor").children.length >= 10) return;
  const row = el("div", "", "criterion-editor");
  row.dataset.id = c.id || `c_${crypto.randomUUID().slice(0, 8)}`;
  const head = el("div", "", "criterion-editor-head");
  const nameLabel = el("label", "Tiêu chí");
  const name = el("input", "", "criterion-name"); name.required = true; name.minLength = 2; name.maxLength = 120; name.value = c.name || "";
  nameLabel.append(name);
  const weightLabel = el("label", "% điểm");
  const weight = el("input", "", "criterion-weight"); weight.type = "number"; weight.min = 1; weight.max = 100; weight.required = true; weight.value = c.weight || 10;
  weight.addEventListener("input", weightTotal); weightLabel.append(weight);
  const remove = el("button", "×", "icon-button"); remove.type = "button"; remove.setAttribute("aria-label", "Xóa tiêu chí");
  remove.addEventListener("click", () => { row.remove(); weightTotal(); });
  head.append(nameLabel, weightLabel, remove);
  const description = el("textarea", "", "criterion-description"); description.value = c.description || "";
  description.placeholder = "Nội dung cần đánh giá và mô tả các mức điểm…"; description.required = true; description.minLength = 10; description.maxLength = 2500;
  description.setAttribute("aria-label", "Mô tả và mức đạt của tiêu chí");
  row.append(head, description); $("criteria-editor").append(row); weightTotal();
}
function openRubricEditor(rubric) {
  $("rubric-title").value = rubric.title;
  $("criteria-editor").replaceChildren(); $("rubric-error").textContent = "";
  rubric.criteria.forEach(addCriterion);
  $("rubric-dialog").showModal();
}
function showReport(report) {
  $("report-content").replaceChildren();
  const hero = el("div", "", "report-score");
  const score = el("strong", String(report.total_score)); score.append(el("small", " / 10"));
  hero.append(score, el("p", report.summary)); $("report-content").append(hero);
  if (report.ended_early) $("report-content").append(el("p", "Buổi phỏng vấn kết thúc sớm. Những tiêu chí chưa có bằng chứng được ghi rõ bên dưới.", "notice"));
  for (const c of report.criteria) {
    const row = el("article", "", "report-criterion");
    const title = el("h3", `${c.name} · ${c.weight}%`); title.append(el("span", c.assessed ? `${c.score}/10` : "Chưa đủ dữ liệu"));
    row.append(title, el("p", c.rationale));
    for (const evidence of c.evidence) row.append(el("blockquote", `“${evidence.quote}”`));
    row.append(el("p", `Gợi ý cải thiện: ${c.improvement}`)); $("report-content").append(row);
  }
  $("report-content").append(el("p", report.notice, "report-notice"));
  if (!$("report-dialog").open) $("report-dialog").showModal();
}
function downloadSession() {
  if (state.session) {
    const link = el("a"); link.href = `/api/v1/sessions/${state.session.id}/export`;
    link.download = `viva-${state.session.id}.json`; link.click();
  }
}

document.querySelectorAll(".nav").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => $(b.dataset.close).close()));
$("new-course").addEventListener("click", () => { $("course-dialog").showModal(); $("new-course-name").focus(); });
$("course-form").addEventListener("submit", guarded(async (event) => {
  event.preventDefault();
  const button = event.submitter; button.disabled = true;
  try {
    const course = await api("/api/v1/courses", {method: "POST", body: {name: $("new-course-name").value.trim()}});
    state.courses.unshift(course); state.courseId = course.id;
    closeSocket(); state.session = null; state.pending = null;
    fillSelect($("course-select"), state.courses, "Chọn môn học", "name", course.id);
    await loadCourse(); $("course-dialog").close(); $("new-course-name").value = ""; showView("setup"); notice("");
  } finally { button.disabled = false; }
}));
$("course-select").addEventListener("change", guarded(async () => {
  closeSocket(); state.session = null; state.pending = null;
  state.courseId = $("course-select").value; localStorage.removeItem("viva.session");
  $("messages").replaceChildren(el("p", "Bắt đầu một phiên mới hoặc chọn phiên trong lịch sử của môn học này.", "empty-small"));
  $("session-student").textContent = "Chưa chọn phiên"; $("criteria-progress").replaceChildren();
  $("session-progress").textContent = "Tiến độ sẽ xuất hiện tại đây."; $("progress-fill").style.width = "0";
  $("question-counter").textContent = "Chưa bắt đầu"; setSocketBadge("Chưa kết nối");
  await loadCourse(); showView("setup"); notice("");
}));
$("rubric-select").addEventListener("change", renderRubric);
$("document-input").addEventListener("change", guarded(async () => {
  state.uploading = true; $("document-zone").classList.add("busy"); updateControls();
  const files = Array.from($("document-input").files); const course = state.courseId;
  try {
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name}: giới hạn 10 MB mỗi file.`);
      $("upload-status").textContent = `Đang đọc và lập chỉ mục: ${file.name}…`;
      const form = new FormData(); form.append("file", file);
      await api(`/api/v1/courses/${course}/documents`, {method: "POST", body: form});
    }
    notice(`Đã xử lý ${files.length} tài liệu. File trùng sẽ được dùng lại.`, "success");
  } finally {
    state.uploading = false; $("document-input").value = "";
    $("upload-status").textContent = ""; $("document-zone").classList.remove("busy");
    await loadCourse(); updateControls();
  }
}));
$("import-rubric").addEventListener("click", () => $("rubric-input").click());
$("rubric-input").addEventListener("change", guarded(async () => {
  const file = $("rubric-input").files[0]; if (!file) return;
  $("rubric-status").textContent = "Đang đọc các tiêu chí trong rubric…"; $("import-rubric").disabled = true;
  try {
    const form = new FormData(); form.append("file", file);
    openRubricEditor(await api("/api/v1/rubrics/preview", {method: "POST", body: form}));
  } finally { $("rubric-input").value = ""; $("rubric-status").textContent = ""; updateControls(); }
}));
$("manual-rubric").addEventListener("click", guarded(async () => openRubricEditor(await api("/examples/rubric.json"))));
$("add-criterion").addEventListener("click", () => addCriterion());
$("rubric-form").addEventListener("submit", async (event) => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try {
    const criteria = [...$("criteria-editor").children].map((row) => ({id: row.dataset.id,
      name: row.querySelector(".criterion-name").value.trim(), weight: Number(row.querySelector(".criterion-weight").value),
      description: row.querySelector(".criterion-description").value.trim()}));
    if (!criteria.length || criteria.reduce((sum, c) => sum + c.weight, 0) !== 100) throw new Error("Cần ít nhất một tiêu chí và tổng trọng số bằng 100%.");
    const rubric = await api(`/api/v1/courses/${state.courseId}/rubrics`, {method: "POST", body: {title: $("rubric-title").value.trim(), criteria}});
    await loadCourse(); $("rubric-select").value = rubric.id; renderRubric(); $("rubric-dialog").close(); notice("Đã lưu rubric. Bạn có thể bắt đầu phỏng vấn.", "success");
  } catch (error) { $("rubric-error").textContent = error.message; }
  finally { button.disabled = false; }
});
$("session-form").addEventListener("submit", guarded(async (event) => {
  event.preventDefault(); $("start-button").disabled = true;
  try {
    const session = await api("/api/v1/sessions", {method: "POST", body: {
      course_id: state.courseId, rubric_id: $("rubric-select").value,
      student_name: $("student-name").value.trim() || "Sinh viên",
      max_questions: Number($("max-questions").value), max_followups: Number($("max-followups").value),
    }});
    notice(""); await selectSession(session.id, true);
  } finally { updateControls(); }
}));
$("answer-input").addEventListener("input", () => { $("char-count").textContent = $("answer-input").value.length; updateControls(); });
$("answer-input").addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); if (!$("send-button").disabled) $("answer-form").requestSubmit(); }
});
$("answer-form").addEventListener("submit", guarded(async (event) => {
  event.preventDefault(); const text = $("answer-input").value.trim(); if (!text) return;
  sendTurn({request_id: crypto.randomUUID(), action: "answer", text});
  $("answer-input").value = ""; $("char-count").textContent = "0";
}));
$("retry-button").addEventListener("click", guarded(async () => { if (state.pending) sendTurn(state.pending, true); }));
$("cancel-button").addEventListener("click", () => { if (state.socket?.readyState === WebSocket.OPEN) state.socket.send(JSON.stringify({type: "cancel"})); });
$("finish-button").addEventListener("click", guarded(async () => {
  if (state.session?.report) { showReport(state.session.report); return; }
  if (state.socket?.readyState !== WebSocket.OPEN || state.busy) return;
  state.busy = true; notice(""); updateControls();
  state.socket.send(JSON.stringify({type: "finish"}));
}));
$("export-button").addEventListener("click", downloadSession);
$("download-report").addEventListener("click", downloadSession);
$("refresh-history").addEventListener("click", guarded(loadHistory));
$("go-setup").addEventListener("click", () => showView("setup"));
setInterval(() => { if (state.socket?.readyState === WebSocket.OPEN) state.socket.send(JSON.stringify({type: "ping"})); }, 20000);

guarded(async () => {
  updateControls();
  state.health = await api("/health");
  const ready = state.health.database && state.health.gemini_configured;
  $("health-badge").replaceChildren(el("i"), document.createTextNode(ready ? "Hệ thống sẵn sàng" : "Cần hoàn tất thiết lập"));
  $("health-badge").className = `badge ${ready ? "ready" : "warn"}`;
  if (!state.health.database) { notice("Chưa kết nối PostgreSQL. Xem bước khởi động database trong README, sau đó khởi động lại server."); return; }
  if (!state.health.gemini_configured) notice("Chưa cấu hình Gemini API key. Bạn có thể tạo môn và rubric; thêm key vào .env rồi khởi động lại để dùng AI.");
  state.courses = await api("/api/v1/courses");
  if (!state.courses.some((c) => c.id === state.courseId)) state.courseId = state.courses[0]?.id || "";
  fillSelect($("course-select"), state.courses, "Chọn môn học", "name", state.courseId);
  await loadCourse();
  const previous = localStorage.getItem("viva.session");
  if (previous) {
    try {
      const session = await api(`/api/v1/sessions/${previous}`);
      if (session.course_id === state.courseId && session.status !== "completed") await selectSession(previous);
    } catch { localStorage.removeItem("viva.session"); }
  }
})();
