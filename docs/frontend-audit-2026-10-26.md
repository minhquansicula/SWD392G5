# Kiểm tra frontend — 26/10/2026

## Cập nhật sau sửa lỗi

- Đã sửa tải lại dữ liệu: các màn hình tài khoản, môn học, câu hỏi, kỳ thi, lịch thi và kết quả yêu cầu GET no-cache. Kết thúc vấn đáp cũng xóa cache Spring Boot trong tab hiện tại.
- Đã sửa lưu chuỗi rỗng khi xóa chủ đề/đáp án mẫu của câu hỏi.
- Đã thêm Bearer token cho HTTP AI và xác thực thông điệp đầu tiên cho WebSocket (token không nằm trong URL). AI xác minh `/auth/me` qua Spring Boot, kiểm tra quyền môn học/ca thi; từ chối truy cập khi không xác minh được. Chặn ca PENDING mở/kết thúc trực tiếp qua AI để không bỏ qua kiểm tra bắt đầu thi của Spring Boot.
- Cấu hình CORS của AI mặc định chỉ cho phép hai origin phát triển cổng 5173. Có `BACKEND_API_URL`, `CORS_ORIGINS` và `front-end/.env.example`; hướng dẫn đúng service trong `front-end/README.md`.
- Frontend và AI service phải được triển khai cùng phiên bản có handshake xác thực. Client cũ không gửi thông điệp xác thực đầu tiên sẽ bị từ chối.
- Mẫu cấu hình AI không còn chứa chuỗi kết nối database từ xa kèm thông tin đăng nhập. Nếu thông tin mẫu cũ là thật, chủ sở hữu cần thay mật khẩu vì nó đã xuất hiện trong repository/lịch sử Git.
- Chưa thêm API/luồng duyệt, chốt, công bố điểm hoặc xuất CSV/PDF. Đây là chức năng còn thiếu, không phải lỗi có thể sửa chỉ bằng giao diện.

### Kiểm tra sau sửa

- Frontend: 47 unit/service test + 89 UI/hook test đạt (136 tổng).
- TypeScript và build đạt. Lint không lỗi; cảnh báo mã có sẵn và chunk lớn vẫn còn.
- AI: 35 test bảo mật HTTP/WebSocket mới + 3 test gateway đạt. Test giả lập authority/DB/AI, không sử dụng dữ liệu thật.
- Chạy toàn bộ test Python hiện bị lỗi collection ở test cũ: `tests/test_domain.py` import `next_plan` đã không còn trong `app.interview`; `tests/test_live.py` import `Interview`/`VoiceSession` không còn trong `app.models`. Không bỏ qua hoặc sửa giả các test này để báo xanh.
- Chưa kiểm chứng E2E với Spring Boot, PostgreSQL, Gemini và microphone thật. Những phần dưới đây là ghi nhận **trước khi sửa**, không phải danh sách lỗi vẫn còn nguyên.

## Kết luận

**Chưa thể xác nhận tất cả chức năng hoạt động tốt.** Các kiểm tra tự động hiện có đều đạt, nhưng phát hiện lỗi cache khi làm mới, lỗi xóa nội dung tùy chọn của câu hỏi và vấn đề phân quyền ở dịch vụ AI mà frontend gọi trực tiếp.

Đây là kiểm tra mã nguồn và chạy bộ test, không phải chứng nhận E2E trên trình duyệt với hệ thống thật. Không sửa mã chức năng trong lần kiểm tra này; các thay đổi có sẵn của người dùng được giữ nguyên.

## Kết quả chạy thực tế

| Kiểm tra | Kết quả |
| --- | --- |
| `npm test` | 45 unit/service test + 83 UI/hook test đạt; không test nào thất bại |
| `npm run typecheck` | Đạt, cả ứng dụng và test |
| `npm run build` | Đạt; JS chính 1.431,42 kB, gzip 428,23 kB; có cảnh báo chunk >500 kB |
| `npm run lint` | Không lỗi; còn các cảnh báo unused imports, effect dependencies, refs và set-state-in-effect, bao gồm mã cũ/backup |
| Môi trường chạy | Có listener cổng 5173; không có listener cổng 8080, 8000, 5432 tại thời điểm kiểm tra |

Không khởi động backend/AI, không tạo tài khoản, gửi email, bắt đầu ca thi hay thay đổi dữ liệu thật.

## Các vấn đề cần xử lý

### 1. Cao — Dịch vụ AI chưa bảo vệ dữ liệu/ca thi theo người dùng

- Frontend gọi AI trực tiếp qua Axios không gắn JWT: `front-end/src/services/aiService.ts:5`.
- WebSocket phòng thi và HTTP kết thúc cũng không gửi thông tin xác thực: `front-end/src/hooks/useVivaVoiceRoom.ts:132`, `:196`.
- Dịch vụ tương ứng nhận UUID rồi đọc chi tiết, kết thúc ca thi hoặc mở phòng mà không xác thực danh tính/quyền sở hữu: `demo/viva-ai-v2/app/main.py:352`, `:377`, `:382`; `demo/viva-ai-v2/app/interview.py:115`.
- Việc frontend chỉ hiển thị ca thi được phép xem không bảo vệ các endpoint này. Với cấu hình mã nguồn hiện tại, người biết UUID có thể gọi trực tiếp ngoài giao diện. Chưa gửi request khai thác trên server thật.
- Cần bảo vệ ở server: xác thực JWT hoặc vé phòng thi ngắn hạn, kiểm tra chủ sở hữu/giảng viên được phép, áp dụng cho cả đọc dữ liệu và thao tác thay đổi trạng thái. Chỉ thêm header ở frontend là chưa đủ.

### 2. Trung bình — Nút Làm mới vẫn lấy dữ liệu cũ từ cache

- `front-end/src/services/apiClient.ts:16` cache GET 60 giây; chỉ bỏ qua khi có header no-cache hoặc cache được xóa.
- Các nút làm mới chỉ gọi lại hàm tải/tăng reload, không xóa cache. Ví dụ: `front-end/src/components/exams/student/StudentScheduleList.tsx:108`, `front-end/src/components/exams/lecturer/LecturerExamManagement.tsx:46`, `front-end/src/components/analytics/ResultAnalyticsView.tsx:104`.
- `mySchedules`, danh sách/chi tiết kỳ thi không yêu cầu no-cache.
- Đã tái hiện bằng harness hiện có với interceptor thật và server giả lập: lần đầu trả PENDING; đổi server sang COMPLETED; GET lại vẫn PENDING; GET có no-cache mới trả COMPLETED.
- Ảnh hưởng: sinh viên/giảng viên bấm làm mới nhưng trạng thái thi, điểm hoặc thay đổi từ tài khoản khác chưa cập nhật. Hoàn tất thi qua dịch vụ AI cũng không tự xóa cache Spring Boot trong tab hiện tại.
- Nên có tùy chọn force refresh ở service và dùng cho thao tác làm mới/quay về sau khi thi.

### 3. Trung bình — Không xóa được chủ đề/đáp án mẫu đã lưu

- Khi sửa câu hỏi, frontend chuyển chuỗi rỗng thành undefined: `front-end/src/components/questions/QuestionBankPage.tsx:229`–`:230`.
- JSON sẽ bỏ các trường undefined. Backend chỉ cập nhật khi trường khác null: `back-end/src/main/java/com/backend/module/exam/core/service/QuestionServiceImpl.java:123`–`:127`.
- Tái hiện theo luồng mã: sửa câu hỏi đang có chủ đề/đáp án mẫu → xóa trắng → lưu → mở lại, dữ liệu cũ vẫn còn.
- Cần thống nhất quy ước xóa trường; với backend hiện tại có thể gửi chuỗi rỗng thay vì bỏ trường.
- Xác nhận qua đối chiếu mã hai phía, chưa chạy thao tác này với database thật.

### 4. Điều kiện tích hợp — Hai Python server không cùng API

- Frontend yêu cầu `/api/v1/courses`, `/api/v1/sessions/...` và `/ws/live/sessions/...`; các route này có trong `demo/viva-ai-v2/app/main.py`.
- `python/server.py:47` chỉ cung cấp phòng thi `/ws/viva/{schedule_id}` với giao thức khác (`event`, `examiner_ready`, `finish_exam`, `exam_completed`).
- Nếu chạy `python server.py` theo `python/README.md`, frontend hiện tại không tương thích: học liệu/rubric/kết quả gặp route thiếu, phòng thi không kết nối đúng endpoint. Chỉ đổi URL WebSocket không đủ vì định dạng sự kiện cũng khác.
- Cần tài liệu triển khai frontend chỉ rõ dịch vụ AI cần chạy và `VITE_AI_API_URL` phù hợp. Đây không phải khẳng định lỗi nếu hệ thống thực tế đã dùng đúng service demo v2.

### 5. Chức năng chưa có trên giao diện đang được sử dụng

- `front-end/src/components/analytics/ResultAnalyticsView.tsx` hiện cho xem điểm, hội thoại và phân bố điểm.
- Chưa có thao tác giảng viên duyệt/chốt/công bố điểm hoặc xuất CSV/PDF trong màn hình đang được `App.tsx` sử dụng.
- Các chức năng này được nêu trong README dự án, nhưng không nên coi là đã hoạt động chỉ vì tồn tại component analytics cũ. Màn hình hiện tại cũng ghi rõ chưa có trạng thái duyệt/công bố từ API.

## Ma trận phạm vi chức năng

| Nhóm chức năng hiện tại | Bằng chứng đã có | Chưa xác minh thực tế |
| --- | --- | --- |
| Đăng nhập, xác minh phiên, đăng xuất, phân quyền điều hướng | Test service và component đạt, bao gồm 401/network/stale session | JWT enforcement của server đang chạy, đăng nhập thật theo ba vai trò |
| Quên/thiết lập mật khẩu | Test form, token hết hạn, retry và validation đạt | SMTP, email thực nhận, hoàn tất link thật |
| Tài khoản admin và Excel/batch import | Test dữ liệu email/MSSV, batch errors, lỗi tải/tạo đồng thời đạt | CRUD đầy đủ, mail và import trên database thật |
| Môn học và phân công giảng viên | Rà service/route; test lỗi tải và tạo đồng thời đạt | CRUD/phân công/thu hồi quyền thật |
| Kỳ thi, lịch, gán câu hỏi | Test utility thời gian, quyền, duplicate enrollment và confirmation đạt | Trọn luồng tạo/sửa/xóa/lập lịch/gán câu hỏi với server thật |
| Lịch thi sinh viên và vào phòng | Test tải lỗi, device check, start/resume đạt | Cửa sổ thi và tranh chấp trạng thái thật giữa nhiều người dùng |
| Phòng thi giọng nói | Test hook về mic, socket, timeout, finish và cleanup đạt | Mic/loa thật, chất lượng audio, AI, mất mạng/resume và lưu tiến độ |
| Ngân hàng câu hỏi | Test tải/tìm kiếm/hủy request/lỗi sinh AI đạt; phát hiện lỗi xóa trường | CRUD, batch, AI generation và lưu câu hỏi thật |
| Học liệu và rubric | Test fallback, stale requests, file type/size, lỗi xóa đạt | Upload/embedding/parse rubric, lưu/xóa với AI/database thật |
| Kết quả và analytics | Test zero score, thiếu dữ liệu, mismatch schedule và late response đạt | Điểm/transcript thật sau thi; duyệt/chốt/xuất chưa có trên màn hình hiện tại |
| Điều hướng, giao diện, theme/ngôn ngữ | Test điều hướng, lưu preferences và dialog ở jsdom; build đạt | Responsive, contrast, focus native dialog/fullscreen và đa trình duyệt |

## Thứ tự đề xuất

1. Chốt dịch vụ AI triển khai và bảo vệ quyền truy cập API/WebSocket.
2. Sửa force refresh và xóa trắng trường câu hỏi; thêm regression test cho hai lỗi này.
3. Chuẩn bị tài khoản ADMIN/LECTURER/STUDENT và dữ liệu thử riêng, chạy Spring Boot + AI + PostgreSQL.
4. Chạy E2E từ tạo môn/tài khoản → tạo kỳ thi → xếp lịch/gán câu hỏi → sinh viên thi → xem điểm/hội thoại; thử thêm mất mạng, refresh, hết hạn JWT và truy cập trái quyền.
5. Kiểm tra trình duyệt thật, thiết bị âm thanh, màn hình nhỏ và tối ưu bundle.
