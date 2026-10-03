# Các class, hàm và trách nhiệm

## Cấu hình, lỗi, persistence

| Class | File | Vai trò và method chính |
|---|---|---|
| `Settings` | `app/config.py` | Đọc `.env`/environment, validate timeout/top-k; API key dùng SecretStr. `get_settings()` cache cấu hình. |
| `AppError` | `app/errors.py` | Lỗi có `message`, HTTP `status`, `code`; thông báo an toàn cho UI, không trả nguyên exception SDK/SQL chứa dữ liệu nhạy cảm. |
| `Database` | `app/database.py` | Tạo async SQLAlchemy engine/session factory. `initialize()` tạo extension/bảng còn thiếu, `ping()` kiểm tra kết nối, `close()` trả tài nguyên. |
| `Base` | `app/models.py` | Declarative base cho ORM metadata. |
| `Course` | `app/models.py` | Một môn học; FK gốc để phân vùng dữ liệu. |
| `Document` | `app/models.py` | Tài liệu đã index, hash, model embedding; unique theo course/hash/model. |
| `Chunk` | `app/models.py` | Đoạn nội dung + vector 768 chiều + trang/vị trí; FK đến document/course. |
| `Rubric` | `app/models.py` | Bản rubric được người dùng xem và lưu. |
| `Interview` | `app/models.py` | Phiên vấn đáp: student, document IDs, rubric snapshot, model, tiến độ, report. |
| `Message` | `app/models.py` | Lời user hoặc AI. Sequence duy nhất trong phiên, nguồn tài liệu cho câu hỏi. |
| `Operation` | `app/models.py` | Chống ghi trùng: cùng session/request ID chỉ có một operation; giữ payload và kết quả replay. |

## Hợp đồng dữ liệu Pydantic

| Class | Vai trò |
|---|---|
| `StrictModel` | Base schema, cấm field thừa, strip whitespace. |
| `CourseCreate` | Validate tên môn học. |
| `Criterion` | ID ASCII, tên, description và weight của một tiêu chí. |
| `RubricData` | Tối đa 10 tiêu chí; `check_weights()` kiểm tra tổng 100 và ID không trùng. |
| `SessionCreate` | Course/rubric UUID, tên sinh viên, max_questions và max_followups. |
| `TurnRequest` | Request UUID, action start/answer, text tối đa 4.000 ký tự. `validate_action()` cấm answer rỗng/start có câu trả lời. |
| `Evidence` | Message UUID và quote nguyên văn. |
| `CriterionGrade` | Điểm, lý do, evidence, gợi ý cải thiện cho một tiêu chí. |
| `GradeDraft` | Structured output từ model, kiểm tra IDs không trùng. Chưa phải báo cáo được chấp nhận. |

## Dịch vụ AI/RAG

| Class | Method | Chức năng |
|---|---|---|
| `GeminiGateway` | constructor | Tạo SDK client dùng chung; cấu hình timeout, connection pool và tắt retry tự động để tránh lặp partial output. |
| | `require_key()` | Trả lỗi rõ ràng khi thiếu key. |
| | `embed()` | Tạo document/query embeddings, kiểm tra số vector, chuẩn hóa L2 và dimension. |
| | `stream_text()` | Async generator trả text delta, bỏ thought parts, kiểm tra STOP/truncation, đóng stream khi thoát. |
| | `structured()` | Sinh JSON theo Pydantic JSON schema, validate kết quả. |
| | `close()` | Đóng SDK async/sync clients ở shutdown. |
| `DocumentParser` | `parse()` | Đọc PDF/DOCX/TXT/MD từ bytes; giữ trang PDF, giới hạn tài liệu, không OCR. |
| | `chunks()` | LangChain RecursiveCharacterTextSplitter, 1.400/200 ký tự. |
| `IngestionService` | `ingest()` | Validate môn/hash, parse/chunk, embed theo batch rồi ghi atomic Document + Chunks. |
| `RetrievalService` | `retrieve()` | Embed query; lọc đúng phạm vi phiên trước xếp hạng cosine bằng pgvector. |
| `InterviewService` | `lock()` | Async context manager PostgreSQL advisory transaction lock theo session. |
| | `create()` | Kiểm tra môn/rubric/tài liệu, snapshot và tạo phiên. |
| | `detail()` | Trả phiên, full transcript và operation pending cần retry. |
| | `turn()` | Idempotency, lưu answer, kế hoạch, retrieval, stream question, commit state. |
| | `finish()` | Chấm rubric bằng structured output, validate evidence, tự tính tổng điểm, persist report. |

## Các hàm quan trọng

| Hàm | Vai trò |
|---|---|
| `next_plan()` | Quyết định hỏi sâu/chuyển tiêu chí, không để hết ngân sách trước khi đi qua tiêu chí còn lại. |
| `validate_report()` | Kiểm tra bằng chứng thực, đủ rubric và tính tổng điểm phía server. |
| `normalized_vector()` | Cấm vector sai chiều, NaN/Infinity hoặc zero vector, chuẩn hóa L2. |
| `provider_error()` | Chuyển lỗi Google/HTTP/timeout thành AppError có thể xử lý ở UI. |
| `message_dict()`, `interview_dict()` | Serialize ORM thành dữ liệu API; UUID/datetime thành chuỗi. |
| `create_app()` | FastAPI factory, dependency wiring, lifecycle và routes. Cho phép inject gateway giả trong test. |
| `safe_events()` | Biến lỗi trong stream thành event error; chỉ phát terminal event sau khi giải phóng khóa service. |

## Frontend

`app/static/app.js` dùng function và một object state, không dùng framework hoặc class UI. `api()` gọi HTTP; `openSocket()` quản lý kết nối và reconnect; `sendTurn()` ghi outbox và gửi UUID; `renderSession()` phục hồi từ server; `showReport()` hiển thị điểm/bằng chứng. Nội dung file/user/model được render bằng `textContent`, không ghép trực tiếp thành HTML.

`tests/fakes.py` có `FakeGateway`, chỉ phục vụ kiểm thử. App chính không import nó và không âm thầm chuyển sang câu trả lời giả khi Gemini lỗi.
