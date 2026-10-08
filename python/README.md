# 🎙️ AIVES Viva - High-Performance Gemini Live Bridge

Dự án AI Giám khảo Thi Vấn Đáp Trực Tuyến hiệu năng cao dành cho ứng dụng **Flutter Mobile** và hệ thống backend **Java Spring Boot**, sử dụng trực tiếp **Google Gemini 3.8 Live (`models/gemini-3.8-live`)**.

---

## 🌟 Ưu Điểm Vượt Trội So Với LiveKit WebRTC

1. **Độ trễ đối đáp cực thấp (~180ms – 280ms):**
   - Không qua LiveKit SFU hay nhiều chặng mạng trung gian.
   - Luồng âm thanh hai chiều kết nối trực tiếp TLS WebSocket tới Google Gemini Live (`bidiGenerateContent`).
2. **Xử lý ngắt lời tự nhiên (Native Barge-in):**
   - Khi thí sinh cất tiếng nói, Gemini Live tự động nhận diện và cắt lời của AI tức thì mà không cần cài VAD cục bộ nặng nề.
3. **App Flutter Mobile siêu nhẹ (< 1MB thư viện):**
   - Không cần nhúng `livekit_client` (chứa binary C++ WebRTC nặng 35MB).
   - Chỉ sử dụng các thư viện chuẩn Dart: `web_socket_channel`, `record`, `audioplayers`.
4. **Tích hợp Giám sát Camera (AI Proctoring):**
   - Camera gửi định kỳ 1 frame JPEG/giây qua WebSocket. Giám khảo AI vừa nghe vừa nhìn thấy thí sinh để nhắc nhở nếu nhìn lệch màn hình.
5. **Chấm điểm Rubric tự động:**
   - Sau khi kết thúc buổi thi, toàn bộ cây hội thoại được gửi tới `gemini-2.5-flash` để chấm điểm chi tiết 10.0 và lưu kết quả vào PostgreSQL qua Spring Boot.

---

## 🛠️ Cài Đặt Môi Trường

Trong thư mục `python`:

```powershell
# Kích hoạt virtual environment
.\.venv\Scripts\activate

# Cài đặt thư viện (nếu thiết lập mới)
uv pip install -r requirements.txt
```

Đảm bảo file `.env` đã có API Key của Google:
```env
GEMINI_API_KEY=AIzaSy...
MODEL_LIVE=models/gemini-3.8-live
MODEL_LIVE_FALLBACK=models/gemini-2.5-flash-native-audio-preview-12-2025
MODEL_GRADING=models/gemini-2.5-flash
LIVE_VOICE=Puck
```

---

## 🚀 Cách Chạy & Kiểm Thử

Hệ thống hỗ trợ 2 chế độ chạy:

### Chế độ 1: WebSocket Server cho Flutter Mobile & Web Client (Khuyên dùng)

Khởi động server:
```powershell
python server.py
```
Server sẽ chạy tại `http://localhost:8000`.

#### Cách test ngay trên Trình Duyệt Web (Không cần code Flutter trước):
1. Mở trình duyệt (Google Chrome / Edge) và truy cập:
   👉 **`http://localhost:8000`**
2. Cấp quyền **Microphone** và **Webcam**.
3. Bấm **"Bắt đầu Thi Vấn Đáp"**.
4. Giám khảo AI sẽ lập tức chào mừng và đọc Câu hỏi số 1.
5. Bạn bật mic trả lời thử, xem chữ phụ đề chạy thời gian thực và camera giám sát hoạt động.
6. Bấm **"Kết thúc & Chấm điểm"** để xem bảng điểm Rubric và nhận xét chi tiết.

---

### Chế độ 2: Desktop Standalone Examiner CLI (Chạy bằng Terminal)

Nếu muốn đàm thoại trực tiếp trên máy tính qua micro, loa và camera bằng OpenCV & PyAudio:
```powershell
python desktop_agent.py
```
- Nếu máy không có webcam:
  ```powershell
  python desktop_agent.py --no-camera
  ```
- Nhấn `q` và bấm Enter để kết thúc ca thi và xem kết quả chấm điểm.

---

## 📱 Kết Nối Với Flutter Mobile

Trên Flutter Mobile, kết nối tới WebSocket:
```text
ws://<IP_MAY_TINH>:8000/ws/viva/{scheduleId}
```
Chi tiết mẫu code Dart và cấu hình xem tại: [`docs/flutter_viva_integration.md`](../docs/flutter_viva_integration.md).

---

## 🧠 Định Hướng Tích Hợp RAG & PGvector Cho Core AI (Architecture Roadmap)

Nhằm đảm bảo Giám khảo AI luôn bám sát 100% giáo trình chính thức, triệt tiêu hiện tượng ảo giác (anti-hallucination) và hỗ trợ đặt câu hỏi đào sâu (adaptive follow-up) đúng theo chuẩn đầu ra (Bloom's Taxonomy), hệ thống định hướng tích hợp **RAG (Retrieval-Augmented Generation) dựa trên PostgreSQL `pgvector`**:

1. **Vector hóa tri thức môn học:** Nạp Đề cương (Syllabus), Slide bài giảng và Tiêu chí chuẩn đầu ra vào PostgreSQL với extension `pgvector`, sử dụng Google `models/text-embedding-004` (768 chiều vector, HNSW cosine index).
2. **Grounding thời gian thực cho Gemini Live 3.8:** Khi bắt đầu ca thi, context tri thức môn học liên quan được truy vấn xấp xỉ siêu tốc qua toán tử `<=>` và inject trực tiếp vào System Prompt của Giám khảo AI để phản hồi giọng nói với độ trễ thấp (< 300ms).
3. **Chấm điểm Rubric chuẩn xác:** Cung cấp tài liệu chuẩn cho `grader_service.py` đối chiếu câu trả lời của thí sinh với tiêu chuẩn kiến thức của bộ môn, đảm bảo tính công bằng và minh bạch.

> 📖 **Tài liệu hướng dẫn kỹ thuật chi tiết (DDL SQL, Ingestion Pipeline, Prompt Grounding & Tùy biến cho Giảng viên):**  
> Xem tại: [`docs/rag_pgvector_integration.md`](../docs/rag_pgvector_integration.md) *(Lưu ý: Định hướng tài liệu thiết kế kiến trúc, tuân thủ nguyên tắc không can thiệp code)*.

