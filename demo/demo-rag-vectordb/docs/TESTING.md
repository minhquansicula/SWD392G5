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
