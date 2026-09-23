# TestSTT — Module Thử Nghiệm Speech-to-Text (STT) với Groq Whisper

Dự án mẫu Spring Boot độc lập dùng để kiểm thử toàn diện chức năng **Speech-to-Text (STT)** bằng **Groq Cloud API (`whisper-large-v3` / `whisper-large-v3-turbo`)** cho hệ thống phỏng vấn AI (SWD392).

---

## 🎯 Mục đích dự án

- **Độc lập & An toàn:** Chạy trên port `8081` (không xung đột port `8080` của dự án chính `back-end`), không phụ thuộc PostgreSQL hay JWT để có thể kiểm thử ngay lập tức.
- **Mô phỏng chính xác:** Triển khai theo đúng kiến trúc và hợp đồng dữ liệu trong `HUONG_DAN_IMPLEMENT_NHOM_3_RECORD_UPLOAD_AUDIO.md`.
- **Giao diện trực quan:** Tích hợp sẵn Web UI cho phép thu âm bằng micro hoặc kéo thả file để chuyển thành văn bản tức thì.

---

## 🚀 Khởi động nhanh

### 1. Chuẩn bị API Key (Miễn phí)
1. Đăng ký tài khoản và tạo API Key tại: [Groq Console Keys](https://console.groq.com/keys).
2. (Tùy chọn) Đặt biến môi trường `GROQ_API_KEY`:
   - **Windows PowerShell:**
     ```powershell
     $env:GROQ_API_KEY="gsk_xxxxxxxxxxxxxxxxxxxx"
     ```
   - **Windows CMD:**
     ```cmd
     set GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
     ```
   *(Nếu chưa đặt biến môi trường, ứng dụng vẫn khởi động bình thường và bạn có thể nhập Key trực tiếp trên Web UI).*

### 2. Chạy ứng dụng
Mở terminal tại thư mục `TestSTT`:
```powershell
./mvnw.cmd spring-boot:run
```

Sau khi console báo `Started TestSttApplication`, mở trình duyệt truy cập:
👉 **[http://localhost:8081](http://localhost:8081)**

---

## 🖥️ Hướng dẫn sử dụng Web UI

Khi mở [http://localhost:8081](http://localhost:8081), bạn có thể:
1. **Kiểm tra trạng thái:** Đèn xanh `Groq STT Sẵn sàng` (hoặc đèn vàng nếu chưa nhập Key). Nếu chưa có Key, click mở phần **⚙️ Cấu hình API Key** và dán Key vào bấm **Lưu Key**.
2. **Tab 🎤 Thu âm trực tiếp:**
   - Bấm nút đỏ để bắt đầu nói tiếng Việt (hệ thống hiển thị sóng âm thật và bộ đếm thời gian).
   - Bấm nút dừng để hoàn tất thu âm.
   - Nghe lại bài nói trong trình phát Audio.
3. **Tab 📁 Tải tệp lên:**
   - Kéo thả hoặc chọn file audio (`.webm`, `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac`).
4. **Tùy chọn nâng cao:**
   - **Model:** Chọn `whisper-large-v3` (chính xác nhất) hoặc `whisper-large-v3-turbo` (siêu nhanh).
   - **Prompt IT Context:** Điền các từ khóa gợi ý như `Spring Boot, Transaction, ACID, REST API, Microservices...` để Whisper nhận diện thuật ngữ kỹ thuật tiếng Anh lẫn tiếng Việt không bị sai.
   - **Phương thức:** Chọn giữa `upload-and-transcribe` (lưu trữ đĩa + hash SHA-256 + link nghe lại) hoặc `transcribe` (xử lý trực tiếp).
5. **Bấm "Chuyển đổi thành văn bản":** Xem text tiếng Việt hiển thị, thời gian xử lý (latency tính bằng mili-giây), mã băm SHA-256 và nghe lại audio từ server.

---

## 📡 Danh sách REST Endpoints

| Phương thức | Endpoint | Chức năng | Body / Params |
|---|---|---|---|
| `GET` | `/api/test/stt/health` | Kiểm tra tình trạng cấu hình Groq | Không |
| `POST` | `/api/test/stt/config` | Cập nhật API Key hoặc Model lúc runtime | JSON: `{"apiKey":"...", "sttModel":"..."}` |
| `POST` | `/api/test/stt/transcribe` | Upload audio → STT trực tiếp (xóa file sau khi xử lý) | Multipart `audio` + param `prompt`, `model`, `language` |
| `POST` | `/api/test/stt/upload-and-transcribe` | Upload audio → Lưu đĩa + SHA-256 + STT + trả metadata | Multipart `audio` + param `prompt`, `model`, `language` |
| `GET` | `/api/test/stt/audio` | Stream và phát lại file audio đã lưu | Param `?key=uploads/...` |

### Ví dụ gọi cURL:

```bash
curl -X POST "http://localhost:8081/api/test/stt/transcribe" \
  -H "X-Groq-Api-Key: gsk_xxxxx" \
  -F "audio=@answer.webm;type=audio/webm" \
  -F "prompt=Spring Boot, PostgreSQL, Transaction"
```

---

## 📦 Hướng dẫn chuyển giao sang dự án chính (`back-end`)

Khi đã thử nghiệm xong và hài lòng với chất lượng nhận dạng, copy các thành phần sau vào dự án chính:

| File trong `TestSTT` | Thư mục đích trong `back-end` | Ghi chú |
|---|---|---|
| `config/GroqProperties.java` | `com.backend.config.GroqProperties` | Đổi package sang `com.backend.config` |
| `config/SttConfig.java` | `com.backend.config.InterviewConfig` | Gộp Bean `groqSttRestClient` |
| `storage/StoredAudio.java` | `com.backend.module.interview.service.StoredAudio` | Record metadata audio |
| `storage/AudioStorageService.java` | `com.backend.module.interview.service.AudioStorageService` | Service lưu trữ và tính SHA-256 |
| `stt/SttProvider.java` | `com.backend.ai.stt.SttProvider` | Interface STT |
| `stt/GroqSttProvider.java` | `com.backend.ai.stt.GroqSttProvider` | Service gọi Groq API |
| `stt/SttException.java` | `com.backend.ai.stt.SttException` | Xử lý mã lỗi STT |
| `stt/SttRequestOptions.java` | `com.backend.ai.stt.SttRequestOptions` | DTO tùy chọn prompt & model |

### Các điểm cần lưu ý khi tích hợp vào dự án chính:
1. **Bảo mật:** Dự án chính sẽ gắn `@PreAuthorize` hoặc lọc JWT vào các endpoint của interview; chỉ endpoint stream audio của buổi thi được sinh viên sở hữu mới được truy cập.
2. **Xử lý bất đồng bộ (Worker):** Trong luồng chính, API upload sẽ trả `202 Accepted` ngay sau khi lưu file; `GroqSttProvider.transcribe()` sẽ được gọi trong background worker (`InterviewWorker`).
