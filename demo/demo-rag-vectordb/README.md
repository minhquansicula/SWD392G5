# Viva — Phòng luyện vấn đáp với AI

Bản demo local: sinh viên import tài liệu môn học và rubric, sau đó trao đổi bằng văn bản với giám khảo AI. Gemini đặt câu hỏi tiếp nối theo câu trả lời; nội dung hiện dần trên giao diện. PostgreSQL lưu phiên, lịch sử và điểm; pgvector lưu embedding tài liệu.

**Backend:** Python + FastAPI. **Frontend:** HTML/CSS/JavaScript thuần. **LLM:** Gemini. **Embedding:** `gemini-embedding-001`, 768 chiều. **Vector DB:** PostgreSQL + pgvector.

Ứng dụng dùng Google Gen AI SDK trực tiếp cho model và dùng LangChain Text Splitters để chia tài liệu. Không cần LangChain Agent hoặc LangGraph cho luồng tuần tự này. Có API HTTP/SSE riêng để Spring gọi lại sau này.

## 1. Chức năng

- Tạo không gian môn học; tài liệu, rubric và phiên được tách theo môn.
- Import PDF có lớp chữ, DOCX, TXT UTF-8, MD. Chia đoạn, tạo embedding Gemini và lưu pgvector.
- Chống import trùng bằng SHA-256. Một file được đưa vào DB cùng toàn bộ chunks trong một transaction.
- Import rubric từ JSON hoặc từ PDF/DOCX/TXT/MD qua Gemini. Xem và sửa tiêu chí/trọng số trước khi lưu.
- Rubric có tổng trọng số 100%, tối đa 10 tiêu chí. Các mức đạt nằm trong phần mô tả.
- Tạo phiên với tên sinh viên, số câu tối đa và giới hạn hỏi sâu mỗi tiêu chí.
- Chat streaming, mỗi lượt một câu hỏi. Câu hỏi sâu bám theo câu trả lời; backend bảo đảm ngân sách câu hỏi cho các tiêu chí còn lại.
- Xem các đoạn tài liệu đã được đưa vào ngữ cảnh tạo câu hỏi. Đây là **nguồn được truy xuất**, không phải chứng nhận mọi phát biểu của model đều đúng.
- Lưu toàn bộ lịch sử, phục hồi khi reload hoặc mất mạng; retry cùng `request_id` không ghi trùng câu trả lời.
- Dừng sinh câu hỏi; câu hỏi dang dở không được tính là câu hoàn chỉnh.
- Kết thúc sớm hoặc hết phần hỏi đáp; chấm từng tiêu chí, đưa bằng chứng trích từ câu trả lời và gợi ý cải thiện.
- Backend kiểm tra ID/đoạn trích có thật và tự tính tổng điểm có trọng số.
- Xem lịch sử, mở lại phiên và tải JSON chứa hội thoại, rubric, nguồn, báo cáo.
- Hai transport: WebSocket cho giao diện hiện tại, HTTP SSE cho client/Spring khác.

## 2. Chuẩn bị

1. Python **3.11 trở lên**, khuyến nghị Python 3.12 để giống môi trường kiểm thử.
2. Docker Desktop đang chạy, có Docker Compose. Trên Windows cần backend Linux containers/WSL2 của Docker Desktop.
3. Gemini API key từ [Google AI Studio](https://aistudio.google.com/apikey), có quyền gọi model và quota cần thiết.
4. Internet để tải thư viện và gọi Gemini. “Local” nghĩa là ứng dụng/database chạy trên máy bạn; LLM và embedding vẫn gọi API Google.

Giải nén source, mở terminal tại thư mục `viva-ai` chứa `pyproject.toml` và `compose.yaml`.

## 3. Setup và chạy trên Windows PowerShell

Không bắt buộc activate virtualenv; dùng trực tiếp Python trong `.venv` để tránh vướng execution policy.

```powershell
cd D:\duong-dan\viva-ai
py --version
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

Điền API key trong `.env` rồi lưu file:

```dotenv
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.8-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
DATABASE_URL=postgresql+psycopg://viva:viva_local@127.0.0.1:5433/viva
MODEL_TIMEOUT_SECONDS=120
RETRIEVAL_TOP_K=5
```

Tên model mặc định dựa trên tài liệu Google được kiểm tra ngày 03/10/2026. Quyền truy cập phụ thuộc API key; có thể đổi `GEMINI_MODEL` sang model text tương thích trong tài khoản. Không tự đổi embedding model trong bản demo vì sẽ thay đổi không gian vector và cách gọi API.

```powershell
docker compose up -d --wait db
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Mở **http://127.0.0.1:8000**. API docs: http://127.0.0.1:8000/docs. Health: http://127.0.0.1:8000/health.

Nếu máy không có lệnh `py`, dùng `python` đã trỏ tới Python >=3.11. Muốn activate: `.\.venv\Scripts\Activate.ps1`, sau đó có thể gọi `python ...` thay đường dẫn đầy đủ.

## 4. Setup trên Git Bash / macOS / Linux

### Windows Git Bash

```bash
cd /d/duong-dan/viva-ai
python -m venv .venv
source .venv/Scripts/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
# Mở .env bằng editor, điền GEMINI_API_KEY rồi lưu.
docker compose up -d --wait db
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### macOS / Linux

```bash
cd /duong-dan/viva-ai
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
# Mở .env bằng editor, điền GEMINI_API_KEY rồi lưu.
docker compose up -d --wait db
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Giữ terminal server chạy. `--reload` tiện khi sửa code; lúc trình diễn có thể bỏ để tránh restart giữa phiên.

## 5. Dùng thử từ đầu đến cuối

1. Tạo môn **Kiến trúc hệ thống**.
2. Import `app/examples/course-notes.txt`, hoặc tài liệu môn học của bạn.
3. Chọn **Import rubric**, tải `app/examples/rubric.json`; hoặc **Tạo thủ công**. Kiểm tra rồi lưu.
4. Điền tên, chọn tối đa 8 câu và tối đa 2 lượt hỏi sâu mỗi tiêu chí.
5. Bấm **Bắt đầu phỏng vấn**. Gemini hỏi câu đầu tiên và truyền từng phần văn bản lên màn hình.
6. Trả lời rồi bấm gửi hoặc Ctrl+Enter. Có thể mở nguồn tài liệu dưới câu hỏi.
7. Hết phần hỏi đáp, hoặc muốn dừng sớm, bấm **Kết thúc & xem đánh giá**.
8. Xem điểm từng tiêu chí, bằng chứng từ lời bạn và gợi ý cải thiện. Tải kết quả nếu cần.
9. Vào **Lịch sử & kết quả** để tiếp tục phiên đang làm hoặc mở lại kết quả.

“Tối đa số câu” là giới hạn trên, không phải cam kết hỏi đủ số đó. Ví dụ 4 tiêu chí, không hỏi sâu thì có 4 câu dù giới hạn đặt là 8. Số câu tối đa phải ít nhất bằng số tiêu chí. Theo dõi tiêu chí đã trả lời không đồng nghĩa đã đạt tiêu chí đó.

Nếu stream bị lỗi hoặc bạn bấm Dừng, dùng **Thử lại**: backend tiếp tục xử lý cùng request, không thêm lần nữa câu trả lời đã lưu. Browser giữ outbox của lượt chưa nhận xác nhận trong localStorage; sau khi nhận kết quả hoặc báo cáo thì xóa outbox.

## 6. Kết nối và trí nhớ của AI

- **Trình duyệt ↔ FastAPI:** một WebSocket trong thời gian mở phiên; có ping/pong và reconnect.
- **FastAPI ↔ Gemini:** `generate_content_stream` tạo một request HTTP streaming cho mỗi câu hỏi. Dùng lại một SDK client trong vòng đời ứng dụng và connection pool; không tạo client mới theo lượt.
- **Không có WebSocket Gemini Live thường trực trong bản này.** Reuse client không bảo đảm cùng một TCP connection sống mãi; server/provider có thể đóng kết nối idle. Muốn Gemini Live là một thay đổi transport/model riêng, không phải chỉ bật `stream=True`.
- **Trí nhớ:** toàn bộ câu hỏi và câu trả lời hoàn chỉnh nằm trong PostgreSQL. Backend gửi transcript có cấu trúc cùng rubric, kế hoạch lượt hỏi và nguồn RAG ở mỗi lần gọi. Không phụ thuộc chat object giữ trong RAM.
- Hội thoại giới hạn 20 câu, tối đa 4.000 ký tự cho mỗi câu trả lời; bản demo gửi lại đầy đủ lịch sử trong giới hạn này, **chưa triển khai tóm tắt bộ nhớ**. Vì vậy những lượt sau có thể tốn thêm input token và thời gian xử lý.
- Rubric và danh sách tài liệu được chụp lại khi tạo phiên. Import thêm tài liệu chỉ ảnh hưởng phiên mới.

## 7. Kiểm tra Gemini thật

Sau khi cấu hình key, có thể chạy các lệnh sau từ thư mục dự án. Lệnh smoke test gửi nội dung mẫu và sử dụng quota API.

```powershell
.\.venv\Scripts\python.exe -m scripts.list_models
.\.venv\Scripts\python.exe -m scripts.check_gemini
```

Trên Git Bash/macOS/Linux với virtualenv đang active:

```bash
python -m scripts.list_models
python -m scripts.check_gemini
```

Smoke test kiểm tra embedding document/query 768 chiều, stream text và structured JSON. API key không được in ra console.

## 8. Dừng và chạy lại

Ctrl+C để dừng FastAPI. Dừng database mà giữ dữ liệu:

```bash
docker compose stop db
```

Chạy lại bằng `docker compose up -d --wait db`, sau đó lệnh uvicorn ở trên. Named volume `viva_data` giữ dữ liệu qua các lần restart. `docker compose down` cũng giữ volume; không dùng `down -v` nếu muốn giữ các phiên cũ.

Muốn xem database:

```bash
docker compose exec db psql -U viva -d viva
```

Trong psql dùng `\dt` xem bảng, `SELECT extversion FROM pg_extension WHERE extname = 'vector';` xem extension, `\q` để thoát.

## 9. Kiểm thử

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q
python -m ruff check app scripts tests
```

Không có `VIVA_TEST_DATABASE_URL`: chỉ chạy unit tests, integration tests được skip rõ ràng. Tests dùng model giả lập và không cần API key.

Muốn chạy integration bằng database test riêng trong container:

```bash
docker compose exec db createdb -U viva viva_test
```

PowerShell:

```powershell
$env:VIVA_TEST_DATABASE_URL="postgresql+psycopg://viva:viva_local@127.0.0.1:5433/viva_test"
.\.venv\Scripts\python.exe -m pytest -q
```

Bash:

```bash
VIVA_TEST_DATABASE_URL=postgresql+psycopg://viva:viva_local@127.0.0.1:5433/viva_test python -m pytest -q
```

`createdb` chỉ chạy lần đầu. Database test phải có tên kết thúc bằng `_test`. Test tạo các bản ghi riêng, không xóa dữ liệu database chính. Xem [docs/TESTING.md](docs/TESTING.md) để biết phạm vi đã kiểm chứng khi bàn giao.

## 10. Cấu trúc và tài liệu

| Đường dẫn | Nội dung |
|---|---|
| `app/main.py` | FastAPI routes, WebSocket, HTTP SSE, lifecycle |
| `app/config.py`, `app/database.py` | Settings và kết nối PostgreSQL |
| `app/models.py`, `app/schemas.py` | ORM tables và hợp đồng dữ liệu Pydantic |
| `app/gemini.py` | Gọi Gemini text/embedding/JSON, timeout, kiểm tra stream |
| `app/documents.py`, `app/retrieval.py` | Parse/chunk/index và tìm kiếm pgvector |
| `app/interview.py`, `app/prompts.py` | Tiến trình phỏng vấn, lịch sử, idempotency, chấm điểm |
| `app/static/` | HTML/CSS/JS, không cần npm hoặc build frontend |
| `app/examples/` | Tài liệu và rubric mẫu |
| `scripts/` | Kiểm tra API thật và liệt kê model |
| `tests/` | Unit và integration tests |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Luồng dữ liệu và các quyết định thiết kế |
| [docs/CLASSES.md](docs/CLASSES.md) | Trách nhiệm từng class và method chính |
| [docs/API.md](docs/API.md) | HTTP/WebSocket/SSE contract |
| [docs/SPRING_INTEGRATION.md](docs/SPRING_INTEGRATION.md) | Spring AI hay Python service, ví dụ WebClient |

## 11. Lỗi thường gặp

| Biểu hiện | Cách xử lý |
|---|---|
| Chưa kết nối PostgreSQL | `docker compose ps`; kiểm tra database healthy, `.env` đúng port 5433; restart FastAPI sau khi DB sẵn sàng. |
| Docker chưa chạy / không có lệnh | Mở/cài Docker Desktop, đợi engine hoạt động rồi chạy lại Compose. |
| Port 5433 đã dùng | Đổi phía host trong `compose.yaml` và port trong `DATABASE_URL` cho khớp. |
| Port 8000 đã dùng | Chạy `--port 8001`, mở đúng địa chỉ 8001. |
| Missing key | Điền `GEMINI_API_KEY` vào `.env` ở thư mục đang chạy lệnh, restart server. |
| Model 404/403 | Chạy `scripts.list_models`, kiểm tra quyền/quota và chỉnh `GEMINI_MODEL`. |
| 429 | Quota hoặc rate limit của Google; chờ hoặc điều chỉnh quota, rồi retry lượt hiện tại. |
| PDF không có chữ | OCR bên ngoài trước; bản demo không OCR ảnh scan. |
| Rubric JSON lỗi | Xem file mẫu: ID tiêu chí duy nhất, description đủ dài, tổng weight bằng 100. |
| Stream kết thúc sớm / MAX_TOKENS | Dùng Thử lại. Model có thể dùng output budget cho suy luận; điều chỉnh giới hạn trong gateway nếu cần. |
| Import lâu | File được index đồng bộ trong request; thử file nhỏ và kiểm tra quota embedding. |
| Đổi cấu trúc ORM nhưng bảng không đổi | `create_all` chỉ tạo bảng còn thiếu, không migrate bảng có sẵn. Dùng migration Alembic khi phát triển tiếp. |

## 12. Phạm vi bản demo

Chưa có đăng nhập, phân quyền, OCR, giọng nói, queue xử lý file, migration schema hay lịch sử phiên phân trang quá 100 mục mỗi môn. RAG dùng exact cosine search, chưa thêm HNSW, reranker hoặc bước đo độ liên quan để loại nguồn yếu. Chỉ dùng local trên loopback; các ID hiện chưa có kiểm tra quyền sở hữu theo user.

Prompt hướng dẫn AI chỉ hỏi một câu và không nghe lệnh đổi vai trong tài liệu; đây không phải bảo đảm tuyệt đối về hành vi của model. Bằng chứng được kiểm tra là có thật trong transcript; kiểm tra này **không chứng minh điểm số hoặc nhận xét luôn đúng**. Đánh giá quan trọng cần người dạy xem lại và bộ đánh giá chất lượng riêng.

File `.env` không được đưa vào source zip. Không cần gửi API key trong chat.

## Nguồn kỹ thuật

- [Google Gen AI Python SDK](https://googleapis.github.io/python-genai/)
- [Gemini text generation / Generate Content](https://ai.google.dev/gemini-api/docs/generate-content/text-generation)
- [Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings)
- [Danh sách model](https://ai.google.dev/gemini-api/docs/models)
- [Spring AI Google GenAI](https://docs.spring.io/spring-ai/reference/api/chat/google-genai-chat.html)
- [Spring AI pgvector](https://docs.spring.io/spring-ai/reference/api/vectordbs/pgvector.html)
