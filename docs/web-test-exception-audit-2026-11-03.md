# Kiểm tra unit test và xử lý ngoại lệ web — 2026-11-03

## Cập nhật sau sửa lỗi

Các phát hiện trong phần audit bên dưới mô tả **trước khi sửa**. Đã sửa B1/B2/B3 và F1/F2/F3/F4:

- Backend không trả exception message nội bộ cho lỗi 500; giữ status/header chuẩn cho HTTP exceptions, gồm 405 và 415.
- Validate cấu trúc rubric trước khi render và khi refresh sau lưu; hiển thị lỗi có thể thử lại, không tự tạo điểm thay cho dữ liệu sai.
- Thêm AppErrorBoundary bao quanh ứng dụng, chỉ hiển thị thông báo chung và nút tải lại do người dùng chủ động chọn.
- Bắt lỗi callback WebSocket/clear audio/finish, bỏ qua lỗi disconnect của audio node đã tách; không tự gửi lại mutation.
- Từ chối report có `grading_failed: true` dù điểm là số hay null.
- Tách lifetime của lịch sử chấm điểm theo schedule và bỏ qua response sau abort.

Kiểm tra sau sửa:

| Kiểm tra | Kết quả |
| --- | --- |
| Frontend unit | 55 đạt |
| Frontend UI, gồm regression mới | 132 đạt, 14 file |
| Backend JDK 21, gồm 6 regression HTTP không cần DB | 152 đạt, 69 bỏ qua; 0 failures/errors |
| Typecheck ứng dụng và test | Đạt |
| Production build | Đạt; vẫn còn cảnh báo kích thước bundle |
| Audio QA | Đạt |
| Lint | Exit 0; còn warnings ngoài phạm vi sửa |

Regression: `front-end/tests/ui/exceptionRegression.test.tsx`, các case bổ sung trong `front-end/tests/ui/results.test.tsx`, `back-end/src/test/java/com/backend/api/ExceptionHandlingRegressionTest.java`. Các thư mục test vẫn bị `.gitignore` loại trừ theo cấu hình sẵn có; chưa thay đổi chính sách này.

Backend được chạy với output tách biệt tại `C:/Users/LENOVO/AppData/Local/Temp/opencode/aives-web-fix-20261103` để tránh tranh chấp với IDE; đường dẫn tạm trong POM đã được gỡ sau kiểm tra. Không thay đổi Neon, schema hoặc dữ liệu nghiệp vụ. Chưa chạy integration/E2E hay kiểm tra audio trên thiết bị thật.

---

## Phạm vi và nguyên tắc

- Web React, backend Spring Boot và dịch vụ Python AI mà web sử dụng; không bao gồm mobile.
- Chạy các test hiện có, typecheck, lint, production build, kiểm tra audio và thêm test chẩn đoán cho các nhánh ngoại lệ chưa được bao phủ.
- Không sửa logic ứng dụng, không gửi mail thật, không gọi Gemini thật và không dùng database nghiệp vụ.
- Test đạt không đồng nghĩa đã kiểm chứng mọi ngoại lệ. Không có số liệu coverage dòng/nhánh trong lần kiểm tra này.

## Kết quả bộ test hiện có

| Phần | Lệnh | Kết quả |
| --- | --- | --- |
| Frontend unit | `npm run test:unit` | 55 đạt, 0 lỗi |
| Frontend UI | `npm run test:ui` | 120 đạt, 13 file đạt |
| TypeScript ứng dụng | `npm run typecheck` | Đạt |
| TypeScript test | `npm run typecheck:test` | Đạt |
| Frontend lint | `npm run lint` | Exit 0, còn warnings; gồm cả `src_backup` |
| Frontend build | `npm run build` | Đạt; bundle JS khoảng 1.45 MB, gzip 433 KB, cảnh báo chunk >500 KB |
| Backend hiện có, JDK 21, build tách biệt | Maven test, loại riêng probe mới | 146 đạt, 69 bỏ qua; tổng 215 test hiện có |
| Python | `.venv/Scripts/python.exe -m pytest -q -ra` | 73 đạt, 36 bỏ qua, 6 warnings |
| Audio | `node qa/audio_test.cjs` trong `python` | Đạt: resampling 16/44.1/48 kHz, flush, PCM, thứ tự phát, ngắt phát, frame sai |

Khi chạy cả probe backend: tổng 221 test, 149 đạt, 3 thất bại, 69 bỏ qua, 0 execution errors. Cả 3 thất bại đều là test chẩn đoán mới; các test hiện có không thất bại.

Test chẩn đoán frontend: 6/6 thất bại khi đòi hỏi xử lý an toàn các trường hợp mô tả bên dưới. Trong đó có 2 test cấp component được giảm mức ưu tiên vì trang gọi hiện đã remount theo schedule, và 1 test dùng payload chấm điểm mâu thuẫn không phải payload lỗi thông thường của Python.

### Vấn đề môi trường backend

1. Maven mặc định dùng Java 8, không tải được JUnit yêu cầu Java 17: chưa chạy test nào.
2. Chạy lại `clean test` bằng JDK 17: biên dịch thành công, nhưng runtime xuất hiện nhiều `ClassNotFoundException`/`NoClassDefFoundError`, kể cả những class vừa được biên dịch. Các lỗi này chưa được coi là lỗi nghiệp vụ. Máy có tiến trình Java language server của IDE đang chạy; có khả năng thư mục `target` bị build khác tác động.
3. Kiểm tra tiếp bằng JDK 21 và thư mục build riêng trong `C:/Users/LENOVO/AppData/Local/Temp/opencode/aives-web-audit-20261103`: các lỗi thiếu class không còn xuất hiện. Thay đổi đường dẫn trong POM chỉ phục vụ chẩn đoán và được hoàn nguyên sau kiểm tra.

## Ngoại lệ phát hiện bằng test bổ sung

Các test chẩn đoán kiểm tra hành vi mong đợi, nên thất bại khi tái hiện được lỗi; không gộp chúng vào số test hiện có đã đạt.

### B1 — Backend trả nguyên thông điệp exception nội bộ (ưu tiên cao)

- Vị trí: `back-end/src/main/java/com/backend/shared/exception/GlobalExceptionHandler.java:94-103`, đặc biệt `.message(ex.getMessage())`.
- Tái hiện độc lập DB bằng MockMvc + AuthController thật + GlobalExceptionHandler thật, mock AuthService ném `IllegalStateException("database password=INTERNAL_SECRET SQL select private_column")` khi login với request hợp lệ.
- Kết quả: HTTP 500 chứa nguyên chuỗi trên trong JSON `message`.
- Đây là bằng chứng cơ chế lộ exception message, không phải khẳng định đã thấy mật khẩu thật trong phản hồi của hệ thống.
- Đề xuất: trả thông điệp 500 chung, log exception nội bộ với request/correlation ID; không gửi SQL, cấu hình hay credential về client.

### B2 — Sai HTTP method trả 500 thay vì 405 (ưu tiên vừa)

- Vị trí: generic handler `GlobalExceptionHandler.java:94-103`.
- Request: `PATCH /api/auth/login`, body `{}`, `Content-Type: application/json`.
- Mong đợi 405 Method Not Allowed; thực tế 500.
- Nguyên nhân: exception HTTP của Spring rơi vào handler `Exception.class`, mất status/header chuẩn.
- Đề xuất: xử lý riêng hoặc kế thừa cơ chế xử lý lỗi MVC để giữ đúng status và header `Allow`.

### B3 — Content-Type không hỗ trợ trả 500 thay vì 415 (ưu tiên vừa)

- Vị trí: generic handler `GlobalExceptionHandler.java:94-103`.
- Request: `POST /api/auth/login`, `Content-Type: text/plain`, body `not-json`.
- Mong đợi 415 Unsupported Media Type; thực tế 500.
- Đề xuất: bảo toàn mã lỗi chuẩn của Spring cho `HttpMediaTypeNotSupportedException`.
- Probe đi kèm cho malformed JSON, missing body và unsupported Accept đều đạt (400, 400 và 406); không kết luận mọi HTTP exception đều sai.
- Bộ `HttpContractEdgeCasesTest` hiện có kiểm tra 405/415 nhưng bị skip do phụ thuộc DB. Probe mới chạy standalone không cần DB đã xác nhận lỗi.

### F1 — Trang kết quả có thể crash khi rubric sai cấu trúc (ưu tiên cao)

- Vị trí: `front-end/src/components/analytics/ResultAnalyticsView.tsx:154`.
- Hai payload đã kiểm chứng: `ai_report.criteria = {}` và `ai_report.criteria = [null]`.
- Hiện tại gọi `.map()` trực tiếp và truy cập thuộc tính của phần tử mà chưa kiểm tra cấu trúc. Cả hai test đều bắt được lỗi render bằng Error Boundary chẩn đoán.
- `front-end/src/main.tsx` chưa bọc ứng dụng bằng Error Boundary. Khi lỗi render không được chặn, có nguy cơ mất giao diện thay vì hiển thị lỗi có thể thử lại.
- Đề xuất: validate dữ liệu AI trước khi đưa vào state, kiểm tra `Array.isArray` và từng phần tử; thêm Error Boundary cho khu vực trang/ứng dụng.

### F2 — Lỗi khi clear audio thoát khỏi WebSocket callback (ưu tiên vừa)

- Vị trí: `front-end/src/hooks/useVivaVoiceRoom.ts:172-175`; xem thêm `:195`.
- Tái hiện: đang CONNECTED, player `clear()` ném lỗi, nhận sự kiện `{ type: 'clear_audio' }`.
- Test xác nhận callback ném lỗi ra ngoài thay vì chuyển sang trạng thái ERROR và cleanup có kiểm soát.
- `PCMPlayer.clear()` đã bắt lỗi `stop()` nhưng chưa bắt lỗi `disconnect()`; nhánh phát PCM (`push`) đã có bảo vệ, nhánh clear chưa tương đương.
- Đề xuất: bắt lỗi tại ranh giới callback/finish; bảo đảm giải phóng microphone, timer và socket dù thiết bị audio lỗi.
- Đây là fault injection, chưa kiểm tra trên thiết bị âm thanh vật lý.

### F3 — Chấp nhận report có cờ grading_failed nếu total_score là số (hardening)

- Vị trí: `front-end/src/hooks/useVivaVoiceRoom.ts:90-95`.
- Payload chẩn đoán: `{ total_score: 0, scale: 10, criteria: [], grading_failed: true }`.
- Hiện tại chuyển COMPLETED; mong đợi không công nhận kết quả chấm thành công khi cờ lỗi đã bật.
- Cờ `grading_failed` chỉ được xét ở nhánh `total_score === null`.
- Lưu ý: nhánh chấm thất bại hiện tại của Python trả `total_score: null` (`python/app/interview.py:332-347`), nên chưa chứng minh lỗi này xảy ra trên payload lỗi thông thường của server. Đây là kiểm tra tính nhất quán khi phản hồi sai/mâu thuẫn.
- Đề xuất: kiểm tra cờ lỗi độc lập với giá trị điểm trước khi chấp nhận report.

### F4 — GradingHistory giữ state của schedule trước khi tái sử dụng component (ưu tiên thấp)

- Vị trí: `front-end/src/components/analytics/GradingHistory.tsx:8-14`.
- Test 1: schedule A tải thất bại; đổi sang B tải thành công, thông báo lỗi A vẫn còn.
- Test 2: A có lịch sử; đổi sang B chưa tải xong, lịch sử A vẫn hiển thị.
- Nguyên nhân: effect không reset `items`/`error` và success callback không kiểm tra request đã bị abort.
- Giới hạn: trang `ResultAnalyticsView` hiện có key bao gồm schedule ID (`:183`), nên thường remount component khi đổi schedule. Hai test này phát hiện lỗi khi tái sử dụng component trực tiếp, không khẳng định trang hiện tại chắc chắn hiển thị nhầm lịch sử.
- Đề xuất: reset state theo schedule, bỏ qua response cũ sau abort, xóa error khi tải thành công.

## Các nhóm ngoại lệ đã có test hiện hữu

- Đăng nhập sai, thiếu email, token/identity không hợp lệ; lỗi mạng/5xx không bị quy thành sai mật khẩu.
- 401 xóa session phù hợp; response muộn của phiên cũ không xóa phiên mới hoặc ghi cache cũ.
- Phân quyền truy cập lịch/câu hỏi/kết quả; không suy diễn quyền sở hữu từ quyền đọc môn.
- Ngày giờ không hợp lệ, năm nhuận, khoảng thời gian đảo, biên giờ bắt đầu/kết thúc, sinh viên trùng.
- Điểm 0, giới hạn điểm, số lẻ không hợp lệ, mất mạng khi lưu, giữ bản nháp, chặn thao tác khi đang gửi.
- Không có quyền microphone, trình duyệt không hỗ trợ, kết nối phòng thi timeout, WebSocket đóng, audio push lỗi, finish timeout và không tự gửi lặp yêu cầu chưa rõ kết quả.
- Thiếu dữ liệu kết quả, AI unavailable, response sai schedule, response đến muộn sau khi đổi schedule.
- Import/export Excel: tên sheet không hợp lệ/trùng, bảo toàn MSSV, nội dung giống công thức không thực thi.
- Python: xác thực HTTP/WebSocket, phân quyền, lỗi authority, giới hạn hỏi xoáy, ghi transcript và grading validation bằng fake/mock.

## Chưa kiểm chứng / không được tính là đạt

- Database integration và migration: chưa có cấu hình DB test; Docker daemon không chạy.
- Python bỏ qua 36 test: 32 liên quan luồng legacy đã thay thế và 4 integration test cần `VIVA_TEST_DATABASE_URL`.
- Các integration test Python cũ dùng route/payload legacy; cần rà lại trước khi bật, không nên chỉ bật biến môi trường rồi coi đó là kiểm thử luồng mới.
- Chưa chạy end-to-end browser với React + Spring + Python + PostgreSQL cùng hoạt động.
- Chưa kiểm tra SMTP/Gemini thật, microphone/loa thật, mất mạng thực tế, tải đồng thời hoặc mọi race condition.
- Warnings Python gồm dependency/event-loop deprecation và một lỗi ghi cache pytest; không làm các test đang chạy thất bại.
- Có các test/config đang bị `.gitignore` loại trừ; kết quả phản ánh workspace này, không bảo đảm CI/máy khác có cùng bộ test.

## Thứ tự xử lý đề xuất

1. Ngăn lộ thông tin lỗi nội bộ và sửa mã lỗi HTTP 405/415 của backend (đã được probe xác nhận).
2. Validate dữ liệu AI và bổ sung Error Boundary.
3. Bảo vệ mọi callback audio/finish và xử lý report lỗi nhất quán.
4. Làm sạch state/request cũ của GradingHistory.
5. Chuẩn bị DB test tách biệt, chạy integration/E2E và đo coverage trước khi kết luận đủ điều kiện nghiệm thu.

## Bằng chứng và test chẩn đoán

- Báo cáo Surefire của lần chạy có probe nằm tại `C:/Users/LENOVO/AppData/Local/Temp/opencode/aives-web-audit-20261103/surefire-reports`. Lần chạy lại test hiện hữu cập nhật các báo cáo tương ứng.
- Nguồn probe được lưu riêng trong `C:/Users/LENOVO/AppData/Local/Temp/opencode/aives-web-audit-probes-20261103`, không để các probe cố ý thất bại trong bộ test mặc định.
- Để tái chạy frontend probe: chép file về `front-end/tests/ui/`, chạy `npm run test:ui -- tests/ui/auditProbe.test.tsx tests/ui/auditPayloadProbe.test.tsx`.
- Để tái chạy backend probe: chép `ExceptionAuditProbeTest.java` về `back-end/src/test/java/com/backend/api/`, dùng JDK 21 chạy `mvnw.cmd -Dtest=ExceptionAuditProbeTest test`. Nếu IDE đang build cùng thư mục `target`, dùng output directory riêng.
- Không sửa source ứng dụng hoặc giữ lại thay đổi POM. Báo cáo này là kết quả audit, không phải bản sửa lỗi.
