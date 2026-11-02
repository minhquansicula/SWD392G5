# Bản sửa luồng mobile — 02/11/2026

Thay đổi gồm mobile Flutter, Spring Boot và Python AI. Cần triển khai cả ba thành phần cùng nhau. Không cần thêm bảng hoặc migration database.

## Các luồng đã sửa

| Phát hiện | Thay đổi |
|---|---|
| Nộp câu không được Python xử lý | Python nhận `submit_answer`, kiểm tra `plan_id`, kết thúc luồng audio/lượt trả lời với Gemini và gửi `answer_submitted`. Gửi lại cùng plan không tạo thêm lượt. Mobile có timeout và thao tác thử lại. |
| Kết quả dùng model trước khi thi | Màn hình kết quả tải lại lịch thi, dùng trạng thái mới và lấy báo cáo chi tiết từ Python. Điểm rubric/câu hỏi chưa được đánh giá giữ là thiếu dữ liệu, không thay bằng 0. |
| Vào lại gọi start lần hai | Backend trả lại ca IN_PROGRESS trong cửa sổ thi, giữ nguyên actualStartTime và đề đã gán. Mobile cập nhật lịch thi từ response. |
| Không phục hồi tiến độ | Python lưu chỉ số câu, số followup, kế hoạch hiện tại và deadline trong `ai_voice_sessions.state`; tải lại tiến độ và hội thoại gần nhất khi nối lại. Không reset hạn trả lời để tăng thời gian thi. |
| Mất mạng khi đang thu | Mobile nghe trạng thái socket, dừng microphone/loa khi mất kết nối và cung cấp nút kết nối lại/kiểm tra kết quả. |
| Kết thúc lỗi khóa thao tác | Lần chắc chắn chưa gửi được có thể thử lại. Với kết quả chưa rõ, mobile đối soát qua HTTP. Finish mặc định có tính idempotent khi đã có báo cáo thành công; chấm lại chủ động dùng `?regrade=true` và chỉ cho người quản lý. |
| Đọc đề trước giờ | Spring Boot chặn STUDENT đọc assigned questions của ca chưa bắt đầu. Python cũng chặn đọc chi tiết ca PENDING để tránh đi vòng qua API AI. Quyền sở hữu và quyền giảng viên/admin vẫn được kiểm tra. |
| Sai ID/cờ câu chính và followup | Mobile ánh xạ câu chính theo số câu; followup có plan ID và câu cha ổn định. Plan lặp không thêm followup trùng. Nội dung câu phụ cập nhật từ lời giám khảo thực tế. |
| Đồng hồ không theo từng câu | Python gửi deadline theo plan và kiểm tra hết hạn ở server; mobile tính thời gian còn lại từ deadline, dừng mic khi nhận xác nhận nộp do hết giờ. Hết cửa sổ ca thi kích hoạt kết thúc. |
| Điểm AI bị gọi là điểm đã duyệt | DTO có `scorePublished`, chỉ true khi có tổng điểm giảng viên và không pending. Mobile ẩn tổng điểm chưa công bố; rubric và điểm từng câu từ AI được ghi là tham khảo. |
| Checklist báo đạt giả | Kiểm tra danh tính bằng `/auth/me`, sức khỏe AI bằng `/health`, quyền mic thật và cửa sổ lịch thi. Nội quy mặc định chưa đồng ý. Nút kiểm tra mic ở hồ sơ thực sự mở recorder và chờ dữ liệu. |
| Dữ liệu tồn tại sau đổi tài khoản | Vùng provider và navigator được tạo lại theo danh tính/token; dispose provider cũ vô hiệu hóa response đang chờ. 401 của token hiện tại xóa phiên, 401 từ token cũ không xóa token mới. Mobile từ chối tài khoản ngoài STUDENT. |

Giờ ca thi được đổi sang múi giờ thiết bị trước khi hiển thị. Phím back trong phòng thi đi qua xác nhận rời phòng.

## Giao thức và vận hành

- Sự kiện `plan` bổ sung `plan_id`, `question_id`, `deadline`, `answer_submitted`. Deadline là timestamp có múi giờ.
- Client gửi `{"type":"submit_answer","plan_id":"...","question_id":"..."}`; chỉ xác nhận nhận được khi có `answer_submitted` từ server.
- `POST /api/v1/sessions/{id}/finish` dùng lại kết quả chấm thành công đã lưu. Giảng viên tạo kỳ thi/admin muốn chấm lại chủ động phải dùng `?regrade=true`.
- Tiếp tục ca IN_PROGRESS vẫn phải trong cửa sổ thi ở backend. Ca đã COMPLETED cần mở báo cáo; không khởi động lại bài.
- Đề và bản ghi của ca PENDING không được mở cho sinh viên qua API Java hoặc Python.

## Chức năng chưa có tích hợp

PDF, chia sẻ và nhắc lịch tự động chưa được triển khai trong bản sửa này. Nút PDF/công tắc nhắc lịch được vô hiệu hóa và ghi rõ chưa hỗ trợ; bỏ nút chia sẻ vốn chỉ hiển thị thông báo giả. Đây là các tính năng bổ sung riêng, không nên được trình bày như đã hoạt động.

## Kiểm chứng

- Mobile: **149 test pass** khi chạy toàn bộ `flutter test --no-pub`, gồm test provider, widget, HTTP và WebSocket cục bộ cùng regression test của các luồng sửa.
- Phân tích Dart: `dart analyze lib` không có lỗi/cảnh báo.
- Backend: **12 test pass**, build thành công; gồm quyền đọc đề, công bố điểm và start idempotent. 14 integration test PostgreSQL đã được skip do chưa có `EXAM_TEST_DATABASE_URL`.
- Python: **73 pass, 36 skip** khi chạy toàn bộ pytest; các test tích hợp cần PostgreSQL/dịch vụ ngoài được skip theo cấu hình.
- Theo cấu hình có sẵn của repo, test trong `mobile/test`, `back-end/src/test`, `python/tests` chỉ lưu cục bộ qua `.gitignore`.
- Chưa có phiên Gemini thật hoặc kiểm thử microphone/loa trên điện thoại thật trong lần sửa này; cần smoke test trên thiết bị sau khi triển khai ba thành phần.
