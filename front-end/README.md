# AIVES frontend

## Chạy local

Yêu cầu Node.js 24, Spring Boot và PostgreSQL đã cấu hình.

```powershell
Copy-Item .env.example .env.local
npm ci
npm run dev
```

- Frontend: `http://localhost:5173`.
- Spring Boot: `http://localhost:8080/api` — đăng nhập, xác minh JWT, tài khoản, môn học, kỳ thi và lịch thi.
- **AI cho React: `demo/viva-ai-v2`**, chạy cổng 8000. Không dùng `python/server.py`: đó là bridge có route/giao thức khác cho mobile.

Từ thư mục `demo/viva-ai-v2`, tạo môi trường Python theo `pyproject.toml`, cài dependencies rồi chạy:

```powershell
Copy-Item .env.example .env
# Cấu hình DATABASE_URL, GEMINI_API_KEY, BACKEND_API_URL trong .env
python run.py
```

Nếu Windows không nhận lệnh `python`, dùng `py`. Hai backend phải truy cập cùng database/schema. Không chạy test tích hợp trên database dữ liệu thật.

## Xác thực và phân quyền AI

- HTTP AI nhận `Authorization: Bearer <accessToken>`. AI gọi `/api/auth/me` của Spring Boot để xác minh danh tính hiện tại; không tin role do browser cung cấp và không có anonymous fallback khi backend lỗi.
- Sinh viên chỉ đọc/kết thúc ca thi của mình. Giảng viên đọc theo quyền kỳ thi của Spring Boot, nhưng chỉ người tạo kỳ thi hoặc admin được thay đổi ca thi. Phòng thi chỉ nhận ca đã được bắt đầu qua Spring Boot.
- Học liệu, rubric và sinh câu hỏi chỉ dành cho admin/giảng viên và môn học được phân công, lấy từ `/api/lecturer/my-courses`.
- WebSocket `/ws/live/sessions/{scheduleId}` nhận thông điệp đầu tiên `{"type":"authenticate","token":"<accessToken>"}` trong 10 giây. Server kiểm tra quyền trước khi mở phòng AI. Không truyền token qua query string hoặc lưu vào log.
- Cần deploy frontend và AI service cùng phiên bản hỗ trợ handshake này. Client cũ không gửi thông điệp xác thực sẽ bị từ chối.

## Cấu hình triển khai

- `VITE_API_URL`: địa chỉ Spring Boot mà trình duyệt truy cập được, gồm `/api`.
- `VITE_AI_API_URL`: địa chỉ AI service mà trình duyệt truy cập được; không có `/api/v1` ở cuối.
- AI `BACKEND_API_URL`: địa chỉ nội bộ AI gọi tới Spring Boot, gồm `/api`.
- AI `CORS_ORIGINS`: JSON array các origin frontend được phép, ví dụ `["https://exam.example.edu"]`. Mặc định chỉ localhost/127.0.0.1 cổng 5173.
- Khi deploy HTTPS, dùng HTTPS cho cả hai API; WebSocket tự dùng WSS. Microphone yêu cầu HTTPS hoặc localhost. Server SPA phải fallback về `index.html` cho các URL frontend.
- Không đưa khóa Gemini, mật khẩu database hoặc JWT secret vào biến `VITE_*`.

## Kiểm tra

```powershell
npm test
npm run typecheck
npm run build
npm run lint
```

Test frontend giả lập API/audio. Xem `tests/README.md` để biết phạm vi. Test bảo mật HTTP/WebSocket phía AI: `python -m pytest tests/test_auth.py -q` từ `demo/viva-ai-v2` sau khi cài dev dependencies. Không cần database/AI thật cho test bảo mật này.

Nút tải lại danh sách và màn hình kết quả yêu cầu dữ liệu mới thay vì dùng cache 60 giây. Hoàn tất vấn đáp cũng xóa cache Spring Boot trong tab hiện tại.

## Chưa triển khai

Duyệt/chốt/công bố điểm và xuất CSV/PDF chưa có API/luồng hoàn chỉnh ở màn hình kết quả hiện tại. Không coi điểm AI là điểm chính thức và không tạo nút báo thành công giả.
