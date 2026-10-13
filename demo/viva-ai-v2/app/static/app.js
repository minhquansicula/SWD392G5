"use strict";
const $ = (id) => document.getElementById(id);
const state = {courseId: localStorage.getItem("viva.course") || "", courses: [], docs: [], rubrics: [],
  session: null, uploading: false, creating: false, loading: false, importing: false, health: null};

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
  const locked = state.loading || state.uploading || state.creating || state.importing;
  $("start-button").disabled = locked || !state.courseId || !state.docs.length || !state.rubrics.length || !state.health?.gemini_configured;
  $("document-input").disabled = locked || !state.courseId || !state.health?.gemini_configured;
  $("import-rubric").disabled = locked || !state.courseId;
  $("manual-rubric").disabled = locked || !state.courseId;
  $("course-select").disabled = locked;
  $("new-course").disabled = locked || !state.health?.database;
  $("rubric-select").disabled = locked || !state.rubrics.length;
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
function weightTotal() {
  const total = [...document.querySelectorAll(".criterion-weight")]
    .reduce((sum, input) => sum + Number(input.value), 0);
  $("weight-total").textContent = `Tổng: ${total}%`;
  $("weight-total").className = total === 100 ? "" : "form-error";
}
function addCriterion(c = {}) {
  if ($("criteria-editor").children.length >= 10) return;
  const row = el("div", "", "criterion-editor");
  row.dataset.id = c.id || `c_${crypto.randomUUID().slice(0, 8)}`;
  const head = el("div", "", "criterion-editor-head");
  const nameLabel = el("label", "Tiêu chí");
  const name = el("input", "", "criterion-name");
  name.required = true; name.minLength = 2; name.maxLength = 120; name.value = c.name || "";
  nameLabel.append(name);
  const weightLabel = el("label", "% điểm");
  const weight = el("input", "", "criterion-weight");
  weight.type = "number"; weight.min = 1; weight.max = 100; weight.required = true;
  weight.value = c.weight || 10; weight.addEventListener("input", weightTotal); weightLabel.append(weight);
  const remove = el("button", "×", "icon-button");
  remove.type = "button"; remove.setAttribute("aria-label", "Xóa tiêu chí");
  remove.addEventListener("click", () => { row.remove(); weightTotal(); });
  head.append(nameLabel, weightLabel, remove);
  const description = el("textarea", "", "criterion-description");
  description.value = c.description || ""; description.required = true;
  description.minLength = 10; description.maxLength = 2500;
  description.placeholder = "Nội dung cần đánh giá và mô tả các mức điểm…";
  description.setAttribute("aria-label", "Mô tả và mức đạt của tiêu chí");
  row.append(head, description); $("criteria-editor").append(row); weightTotal();
}
function openRubricEditor(rubric) {
  $("rubric-title").value = rubric.title || "Rubric mới";
  $("criteria-editor").replaceChildren(); $("rubric-error").textContent = "";
  (rubric.criteria || []).forEach(addCriterion);
  if (!rubric.criteria?.length) addCriterion();
  $("rubric-dialog").showModal();
}
function showReport(report) {
  $("report-content").replaceChildren();
  const score = el("div", "", "report-score");
  const value = el("strong", String(report.total_score ?? "—"));
  value.append(el("small", " / 10")); score.append(value, el("p", report.summary || ""));
  $("report-content").append(score);
  for (const criterion of report.criteria || []) {
    const row = el("article", "", "report-criterion");
    const title = el("h3", `${criterion.name} · ${criterion.weight}%`);
    title.append(el("span", criterion.assessed ? `${criterion.score}/10` : "Chưa đủ dữ liệu"));
    row.append(title, el("p", criterion.rationale || ""));
    for (const evidence of criterion.evidence || []) row.append(el("blockquote", `“${evidence.quote}”`));
    row.append(el("p", `Gợi ý cải thiện: ${criterion.improvement || "—"}`));
    $("report-content").append(row);
  }
  $("report-content").append(el("p", report.notice || "", "report-notice"));
  if (!$("report-dialog").open) $("report-dialog").showModal();
}
function downloadSession() {
  const id = state.session?.id;
  if (!id) return;
  const link = el("a"); link.href = `/api/v1/sessions/${id}/export`;
  link.download = `viva-${id}.json`; link.click();
}
async function loadCourse() {
  const id = state.courseId;
  localStorage.setItem("viva.course", id);
  $("course-name").textContent = state.courses.find(c => c.id === id)?.name || "Bắt đầu một môn học";
  state.loading = true; state.docs = []; state.rubrics = []; updateControls();
  try {
    if (id) {
      const [docs, rubrics] = await Promise.all([
        api(`/api/v1/courses/${id}/documents`), api(`/api/v1/courses/${id}/rubrics`)
      ]);
      if (id !== state.courseId) return;
      state.docs = docs; state.rubrics = rubrics;
    }
    fillSelect($("rubric-select"), state.rubrics, "Chưa có rubric", "title");
    renderDocuments(); renderRubric();
  } finally { state.loading = false; updateControls(); }
}
async function openSession(id) {
  const detail = await api(`/api/v1/sessions/${id}`);
  if (detail.mode === 'voice') {
    location.href = `/static/voice.html?v=voice-only-20261008-1&id=${encodeURIComponent(id)}`;
    return;
  }
  state.session = detail;
  if (detail.report) showReport(detail.report);
  else notice('Đây là phiên text cũ. Giao diện mới chỉ phỏng vấn bằng giọng nói. Về Chuẩn bị buổi học để tạo phiên mới; dữ liệu cũ vẫn được giữ.');
}
async function loadHistory() {
  $('history-list').replaceChildren();
  if (!state.courseId) { $('history-list').append(el('p', 'Chọn môn học để xem lịch sử.', 'history-empty')); return; }
  const course = state.courseId;
  const sessions = await api(`/api/v1/sessions?course_id=${encodeURIComponent(course)}`);
  if (course !== state.courseId) return;
  if (!sessions.length) $('history-list').append(el('p', 'Chưa có buổi phỏng vấn nào.', 'history-empty'));
  for (const s of sessions) {
    const row = el('article', '', 'history-item');
    const info = el('div', '', 'history-detail');
    info.append(el('h3', s.student_name), el('p', `${new Date(s.created_at).toLocaleString('vi-VN')} · ${statusLabel(s.status)}`));
    const open = el('button', s.report ? 'Xem kết quả ↗' : 'Mở phiên ↗', 'secondary');
    open.addEventListener('click', guarded(() => openSession(s.id)));
    const download = el('a', 'Tải dữ liệu', 'text-button');
    download.href = `/api/v1/sessions/${s.id}/export`; download.download = `viva-${s.id}.json`;
    row.append(el('span', '◉', 'history-icon'), info);
    if (s.report) row.append(el('span', `${s.report.total_score}/10`, 'history-score'));
    row.append(open, download); $('history-list').append(row);
  }
}

document.querySelectorAll('.nav').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => $(b.dataset.close).close()));
$('new-course').addEventListener('click', () => { $('course-dialog').showModal(); $('new-course-name').focus(); });
$('course-form').addEventListener('submit', guarded(async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try {
    const course = await api('/api/v1/courses', {method:'POST',body:{name:$('new-course-name').value.trim()}});
    state.courses.unshift(course); state.courseId = course.id;
    fillSelect($('course-select'), state.courses, 'Chọn môn học', 'name', course.id);
    await loadCourse(); $('course-dialog').close(); $('new-course-name').value = ''; showView('setup'); notice('');
  } finally { button.disabled = false; }
}));
$('course-select').addEventListener('change', guarded(async () => {
  state.courseId = $('course-select').value; state.session = null; notice('');
  await loadCourse(); showView('setup');
}));
$('rubric-select').addEventListener('change', renderRubric);
$('document-input').addEventListener('change', guarded(async () => {
  const files = Array.from($('document-input').files); if (!files.length) return;
  state.uploading = true; updateControls(); $('document-zone').classList.add('busy');
  try {
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name}: giới hạn 10 MB/file.`);
      $('upload-status').textContent = `Đang đọc và lập chỉ mục: ${file.name}…`;
      const form = new FormData(); form.append('file', file);
      await api(`/api/v1/courses/${state.courseId}/documents`, {method:'POST',body:form});
    }
    notice(`Đã xử lý ${files.length} tài liệu.`, 'success');
  } finally {
    state.uploading = false; $('document-input').value = ''; $('upload-status').textContent = '';
    $('document-zone').classList.remove('busy'); await loadCourse();
  }
}));
$('import-rubric').addEventListener('click', () => $('rubric-input').click());
$('rubric-input').addEventListener('change', guarded(async () => {
  const file = $('rubric-input').files[0]; if (!file) return;
  state.importing = true; updateControls(); $('rubric-status').textContent = 'Đang trích xuất rubric…';
  try {
    const form = new FormData(); form.append('file', file);
    openRubricEditor(await api('/api/v1/rubrics/preview', {method:'POST',body:form}));
  } finally { state.importing = false; $('rubric-input').value = ''; $('rubric-status').textContent = ''; updateControls(); }
}));
$('manual-rubric').addEventListener('click', () => openRubricEditor({title:'Rubric mới',criteria:[
  {id:'knowledge',name:'Kiến thức môn học',weight:100,description:'Đánh giá mức độ chính xác, giải thích cơ chế và vận dụng vào tình huống thực tế.'}
]}));
$('add-criterion').addEventListener('click', () => addCriterion());
$('rubric-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try {
    const criteria = [...$('criteria-editor').children].map(row => ({id:row.dataset.id,
      name:row.querySelector('.criterion-name').value.trim(),weight:Number(row.querySelector('.criterion-weight').value),
      description:row.querySelector('.criterion-description').value.trim()}));
    if (!criteria.length || criteria.reduce((n,c) => n+c.weight,0) !== 100) throw new Error('Tổng trọng số phải bằng 100%.');
    const saved = await api(`/api/v1/courses/${state.courseId}/rubrics`,{method:'POST',body:{title:$('rubric-title').value.trim(),criteria}});
    await loadCourse(); $('rubric-select').value = saved.id; renderRubric(); $('rubric-dialog').close(); notice('Đã lưu rubric.', 'success');
  } catch(e) { $('rubric-error').textContent = e.message; }
  finally { button.disabled = false; }
});
$('session-form').addEventListener('submit', guarded(async event => {
  event.preventDefault(); if (state.creating) return;
  state.creating = true; updateControls(); notice('Đang tạo phòng thi giọng nói…');
  try {
    const created = await api('/api/v1/sessions', {method:'POST',body:{
      mode:'voice',course_id:state.courseId,rubric_id:$('rubric-select').value,
      student_name:$('student-name').value.trim() || 'Sinh viên',
      max_questions:Number($('max-questions').value),max_followups:Number($('max-followups').value)
    }});
    const detail = await api(`/api/v1/sessions/${created.id}`);
    if (detail.mode !== 'voice') throw new Error('Backend đang chạy bản text cũ. Cần backend Live 0.2 có /ws/live/sessions/{id}. Thư mục static không thể tự bổ sung API Live.');
    location.href = `/static/voice.html?v=voice-only-20261008-1&id=${encodeURIComponent(created.id)}`;
  } finally { state.creating = false; updateControls(); }
}));
$('refresh-history').addEventListener('click', guarded(loadHistory));
$('download-report').addEventListener('click', downloadSession);

guarded(async () => {
  updateControls();
  state.health = await api('/health');
  const ready = state.health.database && state.health.gemini_configured;
  $('health-badge').textContent = ready ? 'Sẵn sàng · Voice' : 'Cần hoàn tất thiết lập';
  $('health-badge').className = `badge ${ready ? 'ready' : 'warn'}`;
  if (!state.health.database) { notice('Chưa kết nối PostgreSQL. Khởi động DB rồi restart backend.', 'error'); return; }
  if (!state.health.gemini_configured) notice('Backend chưa đọc được GEMINI_API_KEY. Kiểm tra .env và restart backend.', 'error');
  state.courses = await api('/api/v1/courses');
  if (!state.courses.some(c => c.id === state.courseId)) state.courseId = state.courses[0]?.id || '';
  fillSelect($('course-select'),state.courses,'Chọn môn học','name',state.courseId);
  await loadCourse();
  // Never restore the old text screen or its pending outbox from localStorage.
  localStorage.removeItem('viva.session');
})();
