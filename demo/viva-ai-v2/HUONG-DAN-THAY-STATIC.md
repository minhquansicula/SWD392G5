# Thay toàn bộ thư mục static — Viva Voice 0.2.1

Gói này chỉ chứa frontend, dùng với backend Live 0.2 đã gửi trong viva-ai-demo.zip.
Không còn phòng chat nhập text, nút gửi text, text WebSocket hoặc tự khôi phục phòng text cũ.
Phụ đề giọng nói vẫn hiển thị để theo dõi nội dung AI nghe được.

## Cài vào project của bạn

1. Dừng backend bằng Ctrl+C.
2. Đổi tên thư mục `app/static` hiện có thành `app/static-backup` để giữ bản sao.
3. Copy thư mục `static` trong gói này vào `app/`.
4. Kết quả phải là `app/static/index.html`, `app/static/voice.html`, v.v. Không đặt thành `app/static/static/index.html`.
5. Chạy lại backend từ thư mục gốc project:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

6. Mở http://127.0.0.1:8000 và nhấn Ctrl+Shift+R.
7. Chọn môn + rubric đã lưu → Vào phòng thi giọng nói → Bắt đầu → cho phép mic.

Không thay file .env, không xóa DB và không cần upload lại tài liệu.
Tất cả phiên tạo từ giao diện gửi `mode: "voice"`. Trước khi chuyển phòng, frontend kiểm tra backend xác nhận đây là phiên voice. Nếu không, thông báo cần chạy backend Live 0.2.

## Những phần còn lại trên giao diện

- Trang chuẩn bị: tạo/chọn môn, upload tài liệu, import/sửa rubric, tạo phiên voice.
- Phòng thi giọng nói: Bắt đầu/Kết thúc, trạng thái mic/AI, phụ đề, nguồn RAG, báo cáo.
- Lịch sử: mở phiên voice, xem báo cáo, tải dữ liệu. Phiên text cũ không thể tiếp tục chat; nếu chưa chấm, tạo phiên voice mới. Không chuyển mode của phiên cũ trong DB.
- Các ô nhập tên môn, tên sinh viên, mô tả rubric vẫn giữ vì là thông tin chuẩn bị, không phải câu trả lời chat.

## Tám file trong thư mục static

- index.html
- app.js
- style.css
- voice.html
- voice.js
- voice.css
- audio-capture-worklet.js
- audio-player.js

Asset URLs có mã phiên bản voice-only-20261008-1 để tránh cache JS/CSS cũ.
Backend phải cung cấp POST /api/v1/sessions với mode voice và WS /ws/live/sessions/{id}.
Frontend này không thể tự bổ sung endpoint Live vào backend bản text.

## Phạm vi kiểm tra

Đã kiểm tra cú pháp JS, ID HTML khớp JS, đường dẫn asset, tạo payload voice, chuyển đúng phòng voice, chặn backend/phiên text cũ. Bộ xử lý audio được giữ từ bản 0.2. Chưa thử mic/Gemini thật trong môi trường bàn giao; dùng API key của bạn để kiểm tra thực tế.
