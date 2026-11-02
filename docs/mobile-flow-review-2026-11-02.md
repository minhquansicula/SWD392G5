# Rà soát luồng mobile — 02/11/2026

> Các phát hiện dưới đây là hiện trạng tại thời điểm rà soát. Bản sửa sau rà soát được mô tả trong [mobile-flow-fixes-2026-11-02.md](mobile-flow-fixes-2026-11-02.md).

Phạm vi: đăng nhập/khôi phục phiên/đăng xuất, lịch thi, điều kiện dự thi, bắt đầu/thoát/vào lại phòng thi, WebSocket và âm thanh, câu chính/câu phụ, nộp câu/nộp bài, kết quả và công bố điểm. Đối chiếu `mobile/lib`, Spring Boot trong `back-end`, và Python AI trong `python/app`.

Đây là báo cáo kiểm tra, chưa sửa thêm code chạy thực tế. Bản sửa backend cho lỗi 403 từ lượt trước vẫn giữ nguyên. Các kết luận về phần cứng, mạng thật và vận hành trên điện thoại cần kiểm thử thiết bị; không có phiên thi thật hoặc dữ liệu production nào được tạo trong lần kiểm tra này.

## Bằng chứng kiểm thử

- Chạy `flutter test --no-pub`: 136 test hiện có pass.
- Thêm và chạy `flutter test --no-pub test/flow_audit_repro_test.dart`: 5 test tái hiện đều xác nhận hành vi lỗi hiện tại.
- Các test tái hiện kiểm tra **hành vi đang lỗi**, không phải khẳng định nghiệp vụ đã đúng. Cần chuyển chúng thành regression test cho hành vi mong muốn khi sửa.
- Thư mục `mobile/test/` được `.gitignore` loại khỏi Git theo cấu hình có sẵn của repo.
- Chưa chạy E2E trên Android/iOS thật, cuộc gọi Gemini thật, kiểm thử mạng di động hoặc kiểm thử âm thanh vật lý.

## Các lỗi cần xử lý

### 1. P1 — Nút “Nộp câu” gửi sự kiện Python không hỗ trợ

**Vị trí:** `mobile/lib/features/viva_session/providers/viva_session_provider.dart:260`; `python/app/live_interview.py:285`.

Mobile dừng mic/loa, chuyển sang `processing`, gửi `{"type":"submit_answer","question_id":...}`. `VoiceRoom.browser_reader()` chỉ xử lý `finish` và `ping` trong nhánh JSON. Lệnh `submit_answer` bị bỏ qua và không có xác nhận gửi về. Mobile cũng không kiểm tra giá trị trả về của `sendControlMessage()`.

**Tái hiện:** vào phòng → bấm “Nộp câu”, đặc biệt trước khi gửi đủ tiếng nói để Gemini tự kết thúc lượt. UI chuyển sang xử lý nhưng server không nhận được tín hiệu kết thúc câu. Việc có tiến tiếp hay không phụ thuộc hoạt động độc lập của Gemini, không phải nút nộp.

**Hướng sửa:** thống nhất giao thức kết thúc lượt với Python/Gemini; xác nhận thành công hoặc báo lỗi và phục hồi thao tác. Không dùng việc gửi được frame để suy ra đã nộp thành công.

### 2. P1 — Sau khi thi xong, màn hình kết quả vẫn dùng trạng thái cũ

**Vị trí:** `mobile/lib/features/viva_session/screens/viva_room_screen.dart:166`; `mobile/lib/features/report/screens/exam_result_report_screen.dart:28`; `mobile/lib/features/report/providers/report_provider.dart:35`.

Sau sự kiện `report`, provider lưu `finalEvaluationReport`, nhưng UI không chuyển dữ liệu đó sang report provider hoặc tải lại lịch thi. Khi mở bảng điểm, nó truyền lại `widget.exam` trước khi thi. `isPendingOrNoScore` dựa hoàn toàn vào đối tượng cũ này và chặn hiển thị kết quả, kể cả khi report provider đã có đúng báo cáo mới.

Ngoài ra, `fetchReportForExam()` và `setReportFromExam()` không được gọi ở luồng UI hiện tại; `fromExam()` chỉ tạo tổng điểm, các danh sách rubric/nhận xét/câu trả lời đều rỗng. Vì vậy quay lại từ danh sách sau khi refresh cũng chưa có báo cáo chi tiết dù Python đã lưu chúng.

**Tái hiện:** hoàn tất thi → chọn “Xem Bảng Điểm & Nhận Xét” → thấy trạng thái chưa có điểm do dữ liệu cũ. **Đã tái hiện bằng widget test** với cùng schedule: report mới 8.0 nhưng UI vẫn không hiện điểm.

**Hướng sửa:** tải trạng thái mới theo schedule ID và dùng nguồn dữ liệu đó để quyết định hiển thị; kết nối API báo cáo chi tiết. Phân biệt kết quả AI và điểm đã công bố.

### 3. P1 — Thoát rồi vào lại có thể bị chặn bởi `/start` lần hai

**Vị trí:** `mobile/lib/features/viva_session/screens/viva_room_screen.dart:52`; `back-end/src/main/java/com/backend/module/exam/core/service/ExamScheduleServiceImpl.java:175`.

API start đổi trạng thái backend sang `IN_PROGRESS`, nhưng mobile không cập nhật model/provider lịch thi. Thoát phòng rồi vào lại từ checklist/lịch thi chưa refresh vẫn thấy model `upcoming`, nên gọi lại `/start`. Backend yêu cầu `PENDING`, trả `SCHEDULE_NOT_PENDING` và mobile dừng vào phòng.

**Tái hiện:** từ ca PENDING → vào thi thành công → rời phòng → vào lại ngay, không refresh lịch.

**Hướng sửa:** cập nhật model bằng response start, đọc trạng thái mới trước khi vào lại và chỉ start ca PENDING. Không bỏ qua mọi lỗi start.

**Vấn đề tiếp tục thi ở Python:** `VoiceRoom.__init__()` đặt chỉ số câu và bộ đếm followup về 0; `load()` lấy voice state nhưng không phục hồi tiến độ từ state. Sau khi xử lý được `/start`, kết nối mới vẫn có thể hỏi lại từ đầu thay vì tiếp tục câu đang thi. Không thể cam kết “tiếp tục thi” chỉ bằng sửa mobile.

### 4. P1 — Mất WebSocket giữa bài không được provider xử lý

**Vị trí:** `mobile/lib/features/viva_session/services/viva_websocket_service.dart:31`; `mobile/lib/features/viva_session/providers/viva_session_provider.dart:145`.

WebSocket service phát thay đổi qua `statusStream` khi lỗi/đóng kết nối, nhưng provider chỉ nghe `messageStream`. Không có xử lý dừng mic, thông báo lỗi qua provider hoặc chuyển sang trạng thái phục hồi khi socket mất sau khi đã authenticated. Các chunk mic tiếp tục đi tới `sendBinaryPcmChunk()` rồi bị bỏ qua vì socket không còn authenticated. Banner chỉ có thể đọc trạng thái mới khi có một lần rebuild khác; đây không phải cơ chế phục hồi bài thi.

**Tái hiện cần thiết bị/mạng:** đang trả lời → tắt mạng hoặc đóng socket phía server → mic có thể vẫn thu trong khi câu trả lời không được gửi.

**Hướng sửa:** nghe trạng thái kết nối trong provider, dừng thu khi mất đường truyền, thông báo rõ và cho phục hồi theo trạng thái server. Khôi phục tiến độ phải phối hợp với mục 3.

### 5. P1 — Gửi kết thúc thất bại làm khóa toàn bộ thao tác tiếp theo

**Vị trí:** `mobile/lib/features/viva_session/providers/viva_session_provider.dart:275`.

`_finishing` được đặt `true` trước khi gửi. Nếu `finishExam()` trả `false`, hàm chỉ báo lỗi và giữ nguyên `_finishing`; các lần gọi finish sau, bật mic và nộp câu đều bị guard chặn. Khi đã gửi nhưng timeout, cũng không có bước đối soát trạng thái/báo cáo qua HTTP để biết server đã chấm xong hay chưa. UI hiện chỉ kích hoạt finish tự động từ `questions_complete`, không có thao tác phục hồi nộp bài riêng.

**Tái hiện:** lần gửi đầu thất bại → kết nối hoạt động lại → gọi finish lần nữa → không có lần gửi thứ hai. **Đã tái hiện bằng test.**

**Hướng sửa:** tách trạng thái chắc chắn chưa gửi và trạng thái chưa biết kết quả. Cho thử lại khi chắc chắn chưa gửi; với kết quả chưa biết, truy vấn server trước khi quyết định gửi lại.

### 6. P1 — Sinh viên có thể đọc đề được gán trước giờ thi

**Vị trí:** `back-end/src/main/java/com/backend/module/exam/core/service/ExamScheduleServiceImpl.java:157` và `:191`.

**Đây là điểm còn thiếu trong bản sửa 403 vừa thực hiện.** Quyền hiện tại xác nhận đúng sinh viên sở hữu ca thi, nhưng không kiểm tra trạng thái/thời gian được phép đọc câu hỏi. Nếu giảng viên đã gán đề cho ca PENDING, sinh viên có thể gọi trực tiếp GET `assigned-questions` trước giờ thi. Nút vào phòng trên mobile không phải hàng rào bảo vệ API.

**Hướng sửa:** bổ sung quy tắc đọc đề cho STUDENT ở backend, tối thiểu gắn với ca đã bắt đầu; thống nhất thêm yêu cầu với ca hết giờ/đã hoàn tất. Giữ quyền xem phục vụ quản lý của lecturer/admin tách biệt. Cần test ca PENDING đã gán đề bị chặn, ca IN_PROGRESS của mình được đọc, ca người khác bị chặn.

### 7. P2 — Câu chính mới giữ ID/cờ câu phụ của câu trước

**Vị trí:** `mobile/lib/features/viva_session/providers/viva_session_provider.dart:321`.

Khi nhận `plan(kind=main, number=2)`, code sửa nội dung tại `_currentQuestionIndex` hiện tại mà không chuyển đến câu chính số 2. Không có followup thì nội dung câu 2 ghi đè câu 1 nhưng giữ ID câu 1; có followup thì câu chính tiếp theo ghi đè followup, vẫn giữ ID sinh tạm và `isAdaptiveFollowUp=true`. Câu phụ thực tế từ Python cũng không chứa `content`; UI dùng câu mẫu chung thay vì câu hỏi phụ thật đang được AI đọc.

**Tác động:** nhãn/tiến độ/cờ câu phụ bị sai và `question_id` trong lệnh nộp không tương ứng câu đang hiển thị. Python hiện chưa xử lý lệnh đó nên chưa kết luận lỗi này đã ghi nhầm điểm vào database.

**Đã tái hiện bằng 2 test**: chuyển thẳng câu chính và chuyển từ followup sang câu chính.

**Hướng sửa:** giữ danh sách câu chính ổn định, ánh xạ plan bằng thứ tự/ID từ server; quản lý followup gắn với câu cha và xóa cờ followup khi chuyển câu chính.

### 8. P2 — Đồng hồ không đổi theo câu hỏi và không xử lý hết giờ

**Vị trí:** `mobile/lib/features/viva_session/providers/viva_session_provider.dart:176`, `:314`, `:321`; `python/app/live_interview.py:231` và `:270`.

Mobile chỉ đặt đồng hồ một lần từ `ready.main_answer_time_limit_seconds`. Các plan tiếp theo gửi `time_limit_seconds` cho từng câu chính/câu phụ nhưng bị bỏ qua. Câu phụ được server cấp 60 giây vẫn hiện thời gian cũ 120 giây. Khi về 0, timer chỉ dừng trừ; không kết thúc lượt hay đồng bộ trạng thái. Python hiện cũng chưa có cưỡng chế deadline cho từng câu trong VoiceRoom.

**Đã tái hiện bằng test** việc câu phụ 60 giây vẫn giữ 120 giây.

**Hướng sửa:** xác định rõ deadline theo câu và thời điểm bắt đầu tính giờ; cập nhật từ server, đồng bộ khi app chạy nền/vào lại, và thực thi hết giờ ở phía server thay vì chỉ giảm số trên UI.

### 9. P2 — Điểm AI bị gắn nhãn “Đã duyệt điểm”

**Vị trí:** `mobile/lib/features/exam/screens/exam_schedule_screen.dart:171` và `:224`; `back-end/src/main/java/com/backend/module/exam/core/service/ExamDtoMapper.java:71`; `python/app/interview.py:361`.

Mobile coi `COMPLETED && finalScore != null` là đã duyệt. Backend trả `lecturerTotalScore` nếu có, nhưng fallback sang điểm AI `finalScore` nếu chưa có. Python chỉ bật `lecturer_total_pending` khi đã tồn tại điểm giảng viên; ca chấm AI lần đầu có thể có finalScore và pending=false dù chưa được giảng viên duyệt. UI vì thế gắn nhãn đã duyệt cho điểm AI.

**Yêu cầu nghiệp vụ cần thống nhất:** phần quy chế và quy trình công bố trong app nói phải có giảng viên chốt điểm. Nếu đó là quy tắc chính thức thì cần trạng thái duyệt/công bố riêng từ backend; không suy ra phê duyệt từ việc có một con điểm. Nếu cho phép công bố AI trực tiếp thì phải đổi nhãn và nội dung quy chế tương ứng.

### 10. P2 — Kiểm tra trước thi báo đạt mà chưa thực sự kiểm tra

**Vị trí:** `mobile/lib/features/exam/screens/exam_detail_checklist_screen.dart:37`, `:69`, `:72`, `:143`; `mobile/lib/features/profile/screens/profile_settings_screen.dart:69`.

Checklist đợi 600 ms rồi gán kết nối server=true, gán xác minh hồ sơ=true và mặc định đã đồng ý quy chế. Không gọi API health/auth để xác nhận. `canEnter` cũng không xét cửa sổ thời gian thi. Backend vẫn chặn start sai giờ, nhưng UI báo đủ điều kiện và cho bấm trước khi bị từ chối. Nút test microphone ở trang hồ sơ chỉ hiện thông báo microphone hoạt động tốt mà không thử phần cứng; màn hình checklist có luồng thu thử thật riêng.

**Hướng sửa:** kiểm tra thật các điều kiện được hiển thị, phân biệt quyền mic và mic hoạt động, để người dùng chủ động đồng ý nội quy, lấy thời gian/trạng thái ca thi để hiển thị khả năng vào phòng chính xác.

## Các điểm bổ sung

- **Dữ liệu theo tài khoản chưa được reset khi logout:** provider lịch thi/report/session sống ở cấp ứng dụng (`mobile/lib/main.dart:40`), trong khi `AuthProvider.logout()` chỉ xóa auth/token. Các request lịch thi đang chờ không bị invalidated bởi logout. Khi đăng nhập tài khoản khác, lịch thi cũ có thể còn hiện trong lúc refresh; không nên giữ dữ liệu sinh viên trước trong provider dùng chung. Cần reset theo phiên và ngăn response của phiên cũ cập nhật phiên mới.
- **Giới hạn role mobile chưa được áp dụng:** `AuthProvider.login(role: 'STUDENT')` nhận tham số nhưng không dùng; `_validUser()` chấp nhận cả ADMIN/LECTURER. Tài khoản giảng viên/admin vào được giao diện sinh viên rồi lỗi khi gọi `/student/my-schedules`. Backend vẫn bảo vệ role, nhưng mobile cần từ chối role không hỗ trợ hoặc điều hướng phù hợp.
- **PDF/chia sẻ/thông báo thi chưa hoàn thiện:** xuất PDF hiện thông báo chưa triển khai; chia sẻ chỉ snackbar; công tắc thông báo chỉ cập nhật biến trong widget. Đây là chức năng còn thiếu, không phải đã có tích hợp hoàn chỉnh.
- **JWT hết hạn khi đang dùng app:** ApiClient trả lỗi 401 nhưng không phát sự kiện hết phiên cho AuthProvider. Việc xóa phiên khi 401 hiện chỉ có ở restoreSession; cần điều hướng đăng nhập lại và xử lý bài thi đang dở theo quy tắc rõ ràng.

## Thứ tự sửa đề xuất

1. Đóng khoảng trống đọc đề trước giờ; thống nhất giao thức nộp câu và kết thúc bài.
2. Sửa trạng thái bắt đầu/vào lại, mất mạng và đối soát kết quả khi nộp bài chưa biết thành công.
3. Đồng bộ plan câu chính/câu phụ, thời gian và dữ liệu báo cáo mới.
4. Thống nhất điểm AI/điểm công bố; hoàn thiện checklist và vòng đời dữ liệu theo tài khoản.
