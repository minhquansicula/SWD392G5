# Kết quả kiểm thử bản Live 0.2

- 40 Python tests đạt (28 tests nền và 12 tests Live).
- 4 tests tích hợp PostgreSQL bị skip: chưa có DB test khả dụng trong lần đóng gói này.
- Test JS thật của resampler/player chạy bằng Node: 16/44.1/48 kHz → 16 kHz, sample values (sai số lượng tử 1 đơn vị), flush, thứ tự phát, xóa hàng đợi khi interrupt, frame lẻ byte bị từ chối.
- Python compile và Ruff; JS syntax check.
- Chưa chạy Chromium end-to-end (runtime chưa có browser binary và không tải được browser), mic/loa thật hoặc Gemini Live trả phí. Không tuyên bố đã đạt những kiểm tra này.

Các tests Live kiểm tra config SDK; PCM; plan idempotency; giữ slot cho rubric; event nhiều trường; gate RAG; cancel tool; interruption; nhiều lượt receive; mic tiếp tục trong khi RAG chờ; checkpoint không nhân bản; question budget; nhận transcript cuối trước grading; nhả khóa trước grading; không ghi đè phiên đã hoàn thành.

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q
python -m ruff check app scripts tests
node qa/audio_test.cjs
```

## Kiểm tra thủ công bắt buộc trên máy có mic và key

1. Chạy scripts.check_live; nghe live-check.wav.
2. Upload tài liệu, import rubric JSON; bắt đầu phiên 6–12 câu.
3. Kiểm tra câu hỏi có nguồn; trả lời 3 lượt liên tiếp không bấm nút.
4. Đang AI nói, ngắt lời: âm thanh cũ phải dừng, không phát tiếp phần đã xếp hàng.
5. Tạm ngừng nói 0,5–1 giây giữa câu; điều chỉnh VAD nếu AI cắt lời quá sớm.
6. Ngắt mạng ngắn: xem trạng thái reconnect; sau khi mic mở, nhắc lại đoạn cuối.
7. Bấm Kết thúc ngay sau khi nói: xem export có phần đuôi transcript, mic OS không còn bật.
8. Thử hai tab cùng interview ID: tab thứ hai nhận busy, không có hai AI nói đồng thời.
9. Reload backend giữa phiên, mở lại từ lịch sử; kiểm tra nguồn và transcript cũ.
10. Kiểm tra báo cáo/quote bằng mắt; không dùng điểm làm kết quả học vụ chính thức.

## Bộ kiểm thử text và DB được giữ lại

# Phạm vi kiểm thử đã bàn giao

Chạy:

```bash
python -m pytest -q
python -m ruff check app scripts tests
```

Đã kiểm tra bằng unit tests:

- Scheduler đi qua đủ tiêu chí khi số câu tối đa đủ; giới hạn hỏi sâu không vượt cấu hình.
- Rubric tổng trọng số và ID trùng bị từ chối.
- Vector sai dimension, zero, NaN/Infinity bị từ chối; vector hợp lệ được chuẩn hóa.
- PDF scan không có text bị từ chối; TXT được chia đoạn và giữ metadata.
- Báo cáo chấm điểm từ chối quote bịa hoặc quote lấy từ câu hỏi AI; tổng điểm được tính ở backend.
- `TurnRequest` từ chối answer rỗng.
- Gemini streaming bỏ thought parts, phát text delta, phát hiện stream không có STOP và MAX_TOKENS.

Integration tests dùng PostgreSQL/pgvector riêng và `FakeGateway`, không gọi Gemini:

- Import tài liệu, tạo rubric, tạo session, retrieval lọc đúng course.
- WebSocket stream nhiều delta, replay cùng request ID, chấm điểm và export.
- Lỗi generation giữ answer một lần và operation pending; retry tiếp tục; nội dung khác cùng request ID bị từ chối.
- Cancel giải phóng operation để retry; HTTP SSE trả các event tương đương.
- Preview rubric JSON; rubric không thuộc course bị từ chối; Origin khác bị từ chối.

Để chạy integration:

```bash
docker compose exec db createdb -U viva viva_test
VIVA_TEST_DATABASE_URL=postgresql+psycopg://viva:viva_local@127.0.0.1:5433/viva_test python -m pytest -q
```

Test database phải kết thúc bằng `_test`. Test không kiểm tra chất lượng học thuật của Gemini thật; `scripts/check_gemini.py` là smoke test opt-in riêng vì nó sử dụng quota.

## Những kiểm tra nên làm trước production

- Test với tài liệu thật của từng môn, PDF nhiều cột, DOCX dài và ngôn ngữ Việt.
- Đo time-to-first-token, latency p95, token cost, quota/rate limit và lỗi reconnect.
- Đánh giá câu hỏi xoáy bằng giáo viên/người chấm độc lập; đo citation faithfulness và rubric agreement.
- Kiểm tra prompt injection trong tài liệu, transcript và rubric; thêm auth, tenant isolation, rate limits, audit log và secret management.
- Thêm Alembic migrations, HNSW/partitioning nếu corpus lớn; không dùng `create_all` như migration production.
