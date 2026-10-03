# AIVES SYSTEM FLOWS (FINAL)

---

## FLOW 1: QUẢN LÝ KỲ THI & LỊCH THI

### Bước 1: Lecturer tạo kỳ thi (Exam Creation)
* **Actor:** Lecturer (`LECTURER`)
* **Chức năng:** Exam Management
* **Hành động:**
  1. Đăng nhập hệ thống $\rightarrow$ Vào màn hình **Exam List** $\rightarrow$ Chọn **Create Exam**.
  2. Chọn môn học (`Course`) tổ chức thi vấn đáp.
  3. Nhập thông tin kỳ thi: Tên kỳ thi, Môn học, Số câu hỏi chính tối đa, Số câu hỏi follow-up tối đa, Thời gian tối đa mỗi câu, thời gian mỗi lượt thi.
  4. Kiểm tra lại thông tin.
  5. Xác nhận tạo kỳ thi.
* **Hệ thống xử lý:**
  * Kiểm tra quyền tạo kỳ thi của Lecturer, sự tồn tại của Course.
  * Lưu cấu hình giới hạn (câu hỏi, thời gian) và tạo kỳ thi gắn với môn học.

---

### Bước 2: Lecturer thiết lập danh sách thí sinh & lịch thi
* **Actor:** Lecturer
* **Chức năng:** Schedule Management
* **Hành động:** Mở kỳ thi $\rightarrow$ Import/chọn danh sách Student $\rightarrow$ Thiết lập ngày thi, khung giờ cho từng Student hoặc nhiều Student cùng lúc.
* **Hệ thống hiển thị:**
  * `Student A` $\rightarrow$ `08:00 - 08:15`
  * `Student B` $\rightarrow$ `08:15 - 08:30`
  * `Student C` $\rightarrow$ `08:30 - 08:45`
* **Hệ thống xử lý:** Kiểm tra Student thuộc danh sách dự thi $\rightarrow$ Kiểm tra timeslot không overlap $\rightarrow$ Tạo lịch thi riêng (`ExamSchedule`) cho từng Student.

---

### Bước 2.1: Sinh viên xem lịch thi
* **Actor:** Student (`STUDENT`)
* **Chức năng:** Exam Schedule
* **Hành động:** Đăng nhập $\rightarrow$ Mở **My Exam / Exam Schedule**.
* **Hệ thống hiển thị:** Môn thi, Tên kỳ thi, Ngày thi, Thời gian bắt đầu/kết thúc, Trạng thái kỳ thi.

---

### Bước 3: Kỳ thi sẵn sàng
* **Actor:** System
* **Hành động:** 
  * Kiểm tra: Đã có Course, danh sách Student có timeslot, đủ câu hỏi và đã cấu hình giới hạn.
  * Tự động đưa kỳ thi vào trạng thái sẵn sàng.

---

## FLOW 2: AI VIRTUAL VIVA — THỰC HIỆN THI VẤN ĐÁP

### Bước 1: Student vào phòng thi
* **Actor:** Student (`STUDENT`)
* **Chức năng:** Viva Room
* **Hành động:** Đăng nhập $\rightarrow$ Chọn kỳ thi đang đến giờ $\rightarrow$ Nhấn **Start Interview**.
* **Hệ thống kiểm tra:** Student thuộc `ExamSchedule`, thời điểm hiện tại nằm trong timeslot, trạng thái cho phép bắt đầu và chưa hoàn thành session.

---

### Bước 2: AI đặt câu hỏi chính
* **Actor:** AI Examiner
* **Chức năng:** Question Delivery / TTS
* **Hành động:** chọn câu hỏi ngẫu nhiên $\rightarrow$ Gửi nội dung đến **TTS Provider** chuyển Text $\rightarrow$ Audio $\rightarrow$ Server gửi câu hỏi + audio qua **STOMP** đến browser của Student.

---

### Bước 3: Student trả lời bằng giọng nói
* **Actor:** Student
* **Chức năng:** Voice Answer
* **Hành động:** Nhấn **Record** $\rightarrow$ Trả lời qua microphone $\rightarrow$ Nhấn **Submit Answer** hoặc hết giờ (timeout).
* **Frontend:** Truyền audio chunk về ( nói tới đâu dịch tới đó ), khi bấm submit hoặc hết giờ thì front end gửi một request về để báo cho back end biết để xử lí tiếp

(có thể dùng streaming, nói tới đâu dịch tới đó)

---

### Bước 5: AI chuyển giọng nói thành Transcript
* **Actor:** AI / STT Provider
* **Chức năng:** Speech-to-Text
* **Hành động:** Hệ thống nhận `audio` $\rightarrow$ Gửi audio đến STT Provider (Whisper / Google STT) $\rightarrow$ Nhận `Transcript` sau đó đưa text cho LLM để phân tích

---

### Bước 6: AI phân tích câu trả lời
* **Actor:** AI / LLM
* **Chức năng:** Adaptive Answer Evaluation
* **Hành động:** Gửi dữ liệu (Original Question, Student Transcript, Exam constraints, Current follow-up count) cho LLM $\rightarrow$ Phân tích tính chính xác, độ mơ hồ, mâu thuẫn $\rightarrow$ Trả về quyết định: `FOLLOWUP` hoặc `ADVANCE`.

---

### Bước 6.1: AI cần hỏi xoáy — FOLLOW-UP
* **Condition:** `LLM decision = FOLLOWUP` AND `followUpCount < maxFollowUp` AND `remainingTime > 0`.
* **Hành động:** LLM sinh câu hỏi đào sâu $\rightarrow$ TTS chuyển text $\rightarrow$ audio $\rightarrow$ Gửi `FOLLOWUP_QUESTION` qua STOMP cho Student.


---

### Bước 6.2: AI không cần hỏi thêm — ADVANCE
* **Condition:** `LLM decision = ADVANCE` OR `followUpCount >= maxFollowUp` OR `time limit exceeded`.
* **Hành động:** Kết thúc câu hỏi hiện tại $\rightarrow$ Chuyển câu hỏi tiếp theo hoặc chuyển sang **Bước 7** nếu đã hết câu hỏi chính.

---

### Bước 7: Kết thúc buổi vấn đáp
* **Actor:** System
* **Chức năng:** Interview Session Completion
* **Condition:** Hoàn thành số câu hỏi chính / Hết thời gian / Đạt giới hạn follow-up.
* **Hành động:** Gửi `SESSION_COMPLETE` đến Student và kết thúc bài thi.

---

### Bước 8: AI chấm điểm sơ bộ
* **Actor:** AI / LLM
* **Chức năng:** AI Scoring
* **Hành động:** Phân tích toàn bộ session (Câu hỏi, Transcript, Follow-up chain, Rubric) để tạo `aiSuggestedScore`, `AI feedback` và `per-question evaluation`.
* **Lưu ý:** `aiSuggestedScore` chỉ là đề xuất (Human-in-the-Loop); Lecturer mới là người quyết định điểm cuối.

---

## FLOW 3: PHẢN HỒI, CHẤM ĐIỂM & BÁO CÁO

### Bước 1: Lecturer mở hàng đợi chấm
* **Actor:** Lecturer
* **Chức năng:** Grading Queue
* **Hành động:** Vào Grading Queue $\rightarrow$ Chọn một Student đã hoàn thành $\rightarrow$ Xem toàn bộ bằng chứng (`ExamSchedule`, `InterviewSession`, `Questions`, `Transcripts`, `QuestionResults`, AI feedback, AI suggested score).

---

### Bước 2: Lecturer review kết quả AI
* **Actor:** Lecturer
* **Chức năng:** Grade Review
* **Hành động:** Đọc transcript, xem nhận xét và điểm AI đề xuất $\rightarrow$ Đánh giá lại theo rubric $\rightarrow$ Giữ nguyên hoặc điều chỉnh điểm/nhận xét.

---

### Bước 3: Lecturer xác nhận điểm cuối
* **Actor:** Lecturer
* **Chức năng:** Finalize Grade
* **Hành động:** Nhập/chọn điểm chính thức $\rightarrow$ Nhấn **Finalize / Submit Grade**.

---

### Bước 4: Student xem kết quả cá nhân
* **Actor:** Student (`STUDENT`)
* **Chức năng:** Student Results
* **Condition:** Lecturer đã finalize grade.
* **Hành động:** Vào **My Results / Student Results** $\rightarrow$ Xem Overall Score và chi tiết từng câu (Question, Transcript, Score, Feedback của bản thân, không xem được của người khác).

---

### Bước 5: Lecturer xuất bảng điểm
* **Actor:** Lecturer
* **Chức năng:** Export Report
* **Hành động:** Chọn kỳ thi $\rightarrow$ Nhấn **Export Grade Report** $\rightarrow$ Chọn format (`CSV` / `PDF`).
* **Hệ thống xử lý:** Sử dụng điểm cuối đã finalize (không lấy `aiSuggestedScore`) $\rightarrow$ Xuất báo cáo theo chuẩn của trường gồm Student ID, Name, Course, Exam, Score,...