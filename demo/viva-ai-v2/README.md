# Viva AI Live — Phỏng vấn sinh viên bằng giọng nói

Bản 0.2 · Python FastAPI + Gemini Live + Gemini Embedding + PostgreSQL/pgvector + HTML/CSS/JS.

Sinh viên vào phòng, bấm **Bắt đầu**, cho phép dùng mic, nghe AI đặt câu hỏi và trả lời bằng giọng nói. Không cần nút gửi mỗi câu. Bấm **Kết thúc & chấm điểm** để nhận nhận xét theo rubric.

## Đọc trước khi chạy

- Đây là demo local, chưa có đăng nhập/phân quyền nhiều người dùng. Chạy ở `127.0.0.1`.
- Cần Python 3.11 trở lên (môi trường kiểm thử: Python 3.12), Gemini API key có quyền dùng model Live và embedding.
- Cần Internet để gọi Gemini. Upload tài liệu tạo embedding và buổi phỏng vấn tiêu thụ quota theo tài khoản.
- Có thể dùng Docker Desktop để chạy PostgreSQL đã có pgvector. Python chạy trực tiếp trên máy.
- Dùng Chrome/Edge hiện đại tại `http://127.0.0.1:8000`; tai nghe giúp tránh tiếng AI lọt vào mic.
- Model gọi bằng API key của bạn cần được kiểm tra bằng `scripts.check_live`. Chưa có API key/mic thật trong môi trường bàn giao nên không khẳng định đã chạy thành công một buổi phỏng vấn Gemini thật.

## 1. Setup trên Windows PowerShell

Giải nén, mở terminal trong thư mục `viva-ai` chứa README này:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

Không cần activate venv; dùng đường dẫn Python như trên tránh lỗi ExecutionPolicy của PowerShell.

Điền API key và kiểm tra các giá trị:

```dotenv
GEMINI_API_KEY=YOUR_API_KEY
GEMINI_LIVE_MODEL=gemini-3.8-live
GEMINI_MODEL=gemini-3.8-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
DATABASE_URL=postgresql+psycopg://viva:viva_local@127.0.0.1:5433/viva
LIVE_SILENCE_MS=1000
LIVE_MAX_MINUTES=45
```

`GEMINI_MODEL` dùng trích rubric/chấm điểm JSON; `GEMINI_LIVE_MODEL` dùng âm thanh. Không đổi cả hai thành cùng một model Live. Tên model phải tồn tại và được cấp quyền cho API key; xem mục xử lý lỗi.

Mở Docker Desktop rồi chạy:

```powershell
docker compose up -d --wait db
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Mở http://127.0.0.1:8000. Giữ terminal chạy. `Ctrl+C` để dừng backend. Có thể thêm `--reload` khi sửa code, nhưng mỗi lần reload sẽ ngắt phòng thi đang mở.

Tắt DB mà giữ dữ liệu:

```powershell
docker compose stop db
```

## 2. Setup trên macOS/Linux hoặc Git Bash

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
# Mở .env bằng editor và điền key
docker compose up -d --wait db
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Riêng Git Bash trên Windows, tạo môi trường bằng `py -m venv .venv`, activate bằng `source .venv/Scripts/activate`.

## 3. Nếu đã có PostgreSQL và database cũ

Có thể dùng nguyên DB từ bản text cũ: giữ `DATABASE_URL`, giữ model embedding và vector 768 chiều. Không xóa bảng/chunk cũ.

Backend chạy `CREATE EXTENSION IF NOT EXISTS vector`, tạo các bảng còn thiếu bằng SQLAlchemy. Bản 0.2 thêm bảng `voice_sessions` tham chiếu `interviews`; không đổi cột trong bảng cũ. Trạng thái/metadata giọng nói nằm trong JSONB của bảng mới. Phiên text cũ vẫn xem được trong lịch sử; phiên mới tạo từ giao diện là voice.

- Python không tự tạo database PostgreSQL. Bạn tạo database trước, hoặc để Docker Compose khởi tạo `viva` trong container mới.
- PostgreSQL server phải cài pgvector. `CREATE EXTENSION` chỉ bật extension đã cài.
- Tài khoản cần quyền bật extension và tạo bảng. Nếu thiếu quyền, nhờ tài khoản quản trị chạy phần này trước.
- Container từ Compose có pgvector sẵn; không cài pgvector vào bản PostgreSQL Windows đang tồn tại.
- Python trên máy gọi container DB bằng `127.0.0.1:5433`; cổng bên trong container là `5432`.
- Trong pgAdmin trên máy: host `127.0.0.1`, port `5433`, DB/user `viva`, password `viva_local` (cấu hình demo).
- Nếu mật khẩu URL chứa ký tự đặc biệt, phải URL-encode phần mật khẩu.

## 4. Chạy thử bằng bộ tài liệu Spring Boot

1. Tạo/chọn môn **Spring Boot** trên trang đầu. Chưa chọn môn thì ô upload bị khóa.
2. Upload `app/examples/spring-boot-kien-thuc.md` vào **Tài liệu môn học**.
3. Import `app/examples/spring-boot-rubric.md` vào **Rubric**. Kiểm tra 6 tiêu chí, tổng 100%, rồi lưu.
4. Có thể dùng `app/examples/spring-boot-rubric.json` thay thế: cùng rubric nhưng đọc trực tiếp, không cần gọi AI để trích cấu trúc.
5. Chọn 12 câu tối đa, 1 câu hỏi sâu mỗi tiêu chí, nhập tên rồi chọn **Vào phòng thi giọng nói**.
6. Trong phòng, bấm **Bắt đầu**, cho phép microphone. AI chủ động nói câu đầu.
7. Trả lời tự nhiên. Đợi trạng thái mic mở khi kết nối lại; đoạn nói trong lúc mất kết nối không được tự phát lại.
8. Bấm **Kết thúc & chấm điểm**. Chờ chốt transcript và kết quả; không đóng tab ngay.

Tài liệu/rubric được lưu theo môn để dùng lại. Không upload rubric vào ô tài liệu môn học. Điểm mỗi tiêu chí 0–10; tổng có trọng số hiển thị trên thang 10 (8/10 tương đương 80/100).

Định dạng tài liệu: PDF có text, DOCX, TXT, MD; tối đa 10 MB/file. Không có OCR cho PDF scan. Chỉ import tài liệu bạn muốn dùng trong môn đã chọn.

## 5. Kiểm tra Gemini trước khi dùng mic

Windows:

```powershell
.\.venv\Scripts\python.exe -m scripts.list_models
.\.venv\Scripts\python.exe -m scripts.check_live
```

macOS/Linux hoặc venv đã activate:

```bash
python -m scripts.list_models
python -m scripts.check_live
```

`check_live` gọi API thật, có dùng quota. Nó yêu cầu model nói một câu ngắn, ghi `live-check.wav` (PCM mono 24 kHz) để nghe thử. Script chỉ kiểm tra quyền truy cập/model/audio đầu ra, không thay thế kiểm tra mic/RAG hai chiều. File WAV không được đưa vào gói mã nguồn.

Để kiểm tra embedding và model text: `python -m scripts.check_gemini` (cũng gọi API thật).

## 6. Cấu trúc và class

| File / class | Trách nhiệm |
|---|---|
| `app/config.py` / `Settings` | Đọc .env, model, DB, giới hạn tải file, độ im lặng VAD |
| `app/database.py` / `Database` | SQLAlchemy async session, bật vector, tạo bảng thiếu |
| `app/models.py` | Course, Document, Chunk, Rubric, Interview, Message, Operation, VoiceSession |
| `app/documents.py` / `IngestionService` | Đọc file, chia đoạn, embedding, lưu atomic và chống trùng file |
| `app/gemini.py` / `GeminiGateway` | Client Gemini; embed, JSON structured, luồng text cũ |
| `app/retrieval.py` / `RetrievalService` | Query embedding + cosine search; lọc course/document/model trước xếp hạng |
| `app/interview.py` / `InterviewService` | Tạo phiên, đọc lịch sử, khóa phiên, scheduler, chấm điểm và kiểm chứng trích dẫn |
| `app/live_gemini.py` / `live_config` | Cấu hình Live, VAD, transcription, RAG function, resumption/compression |
| `app/live_interview.py` / `VoiceRoom` | Kết nối duplex, điều phối tool, ghép transcript, checkpoint, reconnect và finish |
| `app/main.py` | HTTP API, upload, route WebSocket text/voice, static assets |
| `app/static/app.js` | Chuẩn bị môn học/tài liệu/rubric, lịch sử và giao diện text cũ |
| `app/static/voice.js` | Phòng thi speech, mic, WebSocket, phụ đề và báo cáo |
| `app/static/audio-capture-worklet.js` / `MicCapture` | Mono PCM16 ở 16 kHz, frame 40 ms, flush trước kết thúc |
| `app/static/audio-player.js` / `PCMPlayer` | Phát PCM 24 kHz đúng thứ tự, dừng/xóa audio khi bị ngắt lời |

Chi tiết luồng và giao thức: `docs/LIVE.md`. Tài liệu API/architecture cũ được đánh dấu phần text legacy; các HTTP upload/rubric/report vẫn dùng chung.

## 7. Xử lý lỗi thường gặp

| Hiện tượng | Cách kiểm tra |
|---|---|
| Không mở được hộp chọn tài liệu | Tạo/chọn môn trước. Mở trang qua server, không double-click HTML bằng file:// |
| Chưa kết nối PostgreSQL | Mở `/health`; kiểm tra `docker compose ps`, DATABASE_URL, pgvector; restart backend sau khi DB sẵn sàng |
| 404/model not found hoặc không mở được Live | Kiểm tra GEMINI_LIVE_MODEL, quyền API key và `scripts.check_live` |
| 429/quota | Kiểm tra quota/billing của project Google; retry sau khi có quota |
| Mic bị chặn | Cho phép microphone trong trình duyệt; dùng localhost hoặc HTTPS; kiểm tra đúng thiết bị OS |
| AI nghe chính giọng nó | Dùng tai nghe; không mở hai tab phòng thi cùng lúc |
| AI ngắt khi đang suy nghĩ | Tăng LIVE_SILENCE_MS, ví dụ 1500, restart backend; im lặng vẫn là tín hiệu kết thúc lượt theo VAD |
| Không nghe tiếng | Kiểm tra loa/âm lượng tab; bấm Bắt đầu để mở AudioContext; chạy check_live để tách lỗi model và browser |
| Model không gọi RAG | Backend chặn audio và yêu cầu model thử lại tối đa 2 lần; nếu vẫn lỗi, xem model có hỗ trợ function calling và đổi model tương thích |
| Kết nối ngắt | Backend thử resumption; browser thử nối lại tối đa 4 lần. Chờ mic mở rồi nhắc lại đoạn cuối nếu bị mất |
| Lỗi chấm điểm sau khi đã nói | Transcript vẫn lưu. Khi socket đã đóng, nút Kết thúc gọi HTTP finish để thử chấm lại |
| Phiên báo đang xử lý | Có tab khác giữ khóa phiên, hoặc lần chấm trước chưa xong. Đóng tab trùng/chờ tác vụ hoàn tất |

## 8. Kiểm thử và giới hạn

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q
python -m ruff check app scripts tests
# Nếu có Node.js:
node qa/audio_test.cjs
```

Tại lần đóng gói này: 40 Python tests đạt; 4 integration tests PostgreSQL không chạy vì chưa có DB test khả dụng. Các kiểm tra JS về resampling 16/44.1/48 kHz, flush, thứ tự phát và ngắt audio đã đạt. Chưa kiểm tra end-to-end bằng mic thật, browser audio thật và Gemini trả phí. Xem `docs/TESTING.md`.

RAG giảm thiếu ngữ cảnh nhưng không bảo đảm AI luôn hỏi/chấm đúng. Backend bảo đảm có một plan/RAG hợp lệ trước khi chuyển audio; không chứng minh từng câu nói của model được nguồn hỗ trợ. Phụ đề có thể nghe sai thuật ngữ; điểm là gợi ý luyện tập, không phải kết quả thi chính thức. Bộ chấm hiện đánh giá nội dung từ transcript, không đánh giá phát âm/giọng nói.

Chưa lưu file ghi âm. Transcript đang nói được checkpoint theo nhịp khoảng 0,75 giây; crash có thể làm mất phần chưa lưu. Gián đoạn mạng không có cam kết audio exactly-once. Công cụ RAG có thể tăng độ trễ. Giới hạn mặc định 45 phút áp dụng cho một lần mở phòng; mỗi lần mở lại đọc lịch sử DB. Cần đo lại chi phí và độ trễ trên tài liệu thật trước khi dùng lớp học.
