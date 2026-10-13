# Gemini Live: kiến trúc và giao thức bản 0.2

## Luồng chính

Browser thu mic bằng getUserMedia + AudioWorklet, chuyển PCM16 mono 16 kHz, gửi frame 40 ms (1280 bytes). Python giữ WebSocket với Gemini Live. Audio model PCM16 mono 24 kHz được chuyển về browser ngay; PCMPlayer phát liên tục. Input/output transcription được lưu vào Message để chấm điểm bằng model text riêng.

Mic gửi độc lập với consumer xử lý RAG, tránh để truy xuất tài liệu chặn luồng upload. Consumer duy nhất quản lý metadata/phát ngôn/plan. Hàng đợi server event giới hạn 256; gửi xuống browser timeout 10 giây; browser phát tối đa khoảng 12 giây audio đang chờ rồi báo lỗi nếu không theo kịp. Browser không tự replay audio cũ.

## API

Các HTTP endpoint cũ giữ nguyên. `POST /api/v1/sessions` nhận thêm `mode: "voice" | "text"` (mặc định text cho tương thích API cũ). Giao diện chuẩn bị môn học luôn tạo voice.

`GET /api/v1/sessions/{id}` có thêm `mode`, `live_model`, `voice_state`. Voice state gồm plan hiện tại, tham chiếu câu trả lời đã dùng lập plan và metadata transcript. Không chứa API key hoặc resumption token.

`GET /static/voice.html?id=<uuid>` mở phòng thi.

`WS /ws/live/sessions/{id}`:

| Hướng | Loại frame | Nội dung |
|---|---|---|
| Browser → server | binary | Raw PCM16 LE mono 16 kHz, tối đa 6400 bytes/frame |
| Browser → server | JSON | `{"type":"ping"}` hoặc `{"type":"finish"}` |
| Server → browser | binary | Raw PCM16 LE mono 24 kHz |
| Server → browser | JSON snapshot | `session`: phiên và transcript đã lưu |
| Server → browser | JSON ready | `sample_rate: 24000`, bắt đầu gửi mic |
| Server → browser | JSON transcript | `id`, `role`, `text` toàn bộ phát ngôn đến hiện tại, `final` |
| Server → browser | JSON plan | `number`, `max`, `criterion`, `sources` |
| Server → browser | JSON clear_audio | Dừng và xóa mọi audio model đang chờ |
| Server → browser | JSON turn_complete | Model kết thúc lượt sinh; không có nghĩa loa đã phát xong |
| Server → browser | JSON reconnecting | Tạm dừng gửi mic, hiển thị reconnect |
| Server → browser | JSON questions_complete | Không còn lượt hỏi; người dùng bấm Kết thúc |
| Server → browser | JSON finishing | Chốt transcript, ngừng mic/phát audio |
| Server → browser | JSON report | `data`: cùng schema report của bản text |
| Server → browser | JSON error | `message`: lỗi có thể hiển thị |

Một socket phục vụ đúng một phiên. API key chỉ ở backend. Origin được kiểm tra. Đây vẫn là demo local không có auth; không đưa ra Internet nguyên trạng.

## RAG và tiến độ

Live gọi function `prepare_next_question(query, repeat?)` ở chế độ blocking. Backend chọn criterion, giới hạn số câu và lấy nguồn trong course/document snapshot của phiên. Model không được cung cấp SQL, course ID hoặc document ID tùy ý. Rubric giữ nguyên trong snapshot; upload tài liệu mới không tự thêm vào phiên đang chạy.

Plan được cấp trước khi AI hỏi. Gọi lại cùng tool call ID trả kết quả cache. Khi chưa có lời trả lời mới hoặc repeat=true, backend trả lại plan hiện tại. Plan reservation tăng bộ đếm; nếu audio chưa kịp phát vì gián đoạn, lần mở lại vẫn có thể nhắc lại plan đang có. Không có bộ phân loại ngữ nghĩa bảo đảm mọi phát ngôn là câu hỏi hợp lệ.

Audio bị chặn nếu needs_plan=true. Nếu model nói mà bỏ công cụ, khi hết lượt backend yêu cầu gọi công cụ và nói lại, tối đa 2 lần. Đây là kiểm tra quy trình truy xuất; không phải kiểm chứng tự động mọi nội dung model phát ra.

Giới hạn số câu bao gồm câu chính và câu xoáy. Scheduler ưu tiên giữ ít nhất một slot cho mỗi tiêu chí chưa đi qua. `answers_count` trong voice đếm các phát ngôn user có text, có thể bao gồm lời yêu cầu nhắc lại; không luôn bằng số câu chuyên môn đã trả lời.

## Transcript và chấm điểm

Mỗi fragment Gemini được ghép vào Message đang mở theo role; event gửi browser mang toàn bộ text hiện có để cập nhật theo ID. DB merge theo UUID không tạo bản sao mỗi checkpoint. Metadata final/interrupted nằm ở VoiceSession.state. Event có nhiều trường được xử lý đầy đủ.

Thứ tự ASR/audio không được giả định đồng bộ tuyệt đối: fragment muộn sau turn boundary có thể thành message riêng. Metadata hỗ trợ xem lại nhưng không thay thế bản ghi âm gốc. Bản demo không lưu WAV buổi thi.

Kết thúc: client flush frame còn lại → ngừng track mic → gửi finish → backend audio_stream_end → đợi tối đa khoảng 4 giây để nhận phần đuôi → lưu transcript → đóng Live → thả khóa phòng → gọi InterviewService.finish. Đuôi ASR đến chậm hơn cửa sổ này có thể không được lưu; cần kiểm tra độ trễ trên tài khoản thực tế.

Bộ chấm gọi GEMINI_MODEL, không dùng Live model. Quote phải khớp lời user đã lưu; backend tính trọng số. Nếu không có lời user thì báo chưa đủ dữ liệu. Bấm Kết thúc khi socket đã đóng dùng HTTP finish để retry. Không chấm phát âm từ transcript.

## Kết nối lại

Vòng receive của SDK được gọi lặp qua nhiều lượt; không thoát cả phòng khi turn_complete. Bật context window compression và session resumption. Handle giữ trong bộ nhớ phòng; không gửi client/ghi log. Khi GoAway hoặc upstream disconnect, thử lại tối đa 4 lần và xóa audio cũ.

Browser websocket mất: tab thử kết nối lại, backend khôi phục từ DB và tạo phiên Gemini mới nếu không còn handle của phòng trước. Đây không phải khôi phục nguyên vẹn trạng thái âm thanh giữa chừng. Các frame không được xác nhận không replay để tránh lặp lời. UI yêu cầu chờ mic mở rồi nhắc lại phần cuối khi cần.

Khóa PostgreSQL advisory theo interview ID ngăn hai tab điều khiển cùng phiên. Demo giữ một connection DB cho khóa trong thời gian phòng mở; cần thiết kế lease/session manager khác nếu triển khai đông người. Grading lấy khóa sau khi khóa voice đã nhả.

## Tài liệu chính thức đã đối chiếu

- https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk
- https://ai.google.dev/gemini-api/docs/live-api/capabilities
- https://ai.google.dev/gemini-api/docs/live-api/tools
- https://ai.google.dev/gemini-api/docs/live-api/session-management
- https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

Các API Live có thể thay đổi; dependencies khóa google-genai 2.28.0. Kiểm tra quyền model bằng script trước khi sử dụng dữ liệu thật.
