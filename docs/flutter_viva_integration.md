# 📱 HƯỚNG DẪN TÍCH HỢP FLUTTER MOBILE VỚI AIVES VIVA BRIDGE (PURE AUDIO MODE)

Tài liệu này hướng dẫn lập trình viên Flutter tích hợp màn hình thi vấn đáp trực tuyến hiệu năng cao với độ trễ thấp (< 300ms) kết nối tới **AIVES Viva Bridge Server** chế độ âm thanh thuần (Pure Audio Mode).

---

## 1. Cài Đặt Thư Viện Trong `pubspec.yaml`

Thêm các package sau vào ứng dụng Flutter (không cần camera hay WebRTC):

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Kết nối WebSocket
  web_socket_channel: ^3.0.1

  # Thu âm PCM 16-bit 16kHz từ Microphone
  record: ^5.1.2

  # Phát luồng âm thanh PCM 24kHz từ Giám khảo AI
  audioplayers: ^6.0.0

  # Quản lý State & HTTP
  http: ^1.2.1
  flutter_secure_storage: ^9.0.0
```

---

## 2. Luồng Trao Đổi Dữ Liệu Qua WebSocket

* **WebSocket URL:** `ws://<SERVER_IP>:8000/ws/viva/{scheduleId}`
  * Với Android Emulator: `ws://10.0.2.2:8000/ws/viva/{scheduleId}`
  * Với Thiết bị thật / iOS Simulator: `ws://<LAN_IP>:8000/ws/viva/{scheduleId}`
* **Giao thức:**
  1. **Binary Frame (Mobile $\rightarrow$ Server):** Dữ liệu âm thanh Raw PCM 16-bit, 16000Hz, Mono từ micro của thí sinh (chunk 100ms - 200ms).
  2. **Binary Frame (Server $\rightarrow$ Mobile):** Dữ liệu âm thanh Raw PCM 16-bit, 24000Hz, Mono từ Giám khảo AI phát ra loa thí sinh.
  3. **JSON Text Frame (Mobile $\rightarrow$ Server):**
     - Báo kết thúc thi / nộp bài: `{"event": "finish_exam"}`
     - Tương tác điều khiển: `{"type": "submit_answer", "question_id": "...", "transcript": "..."}`
  4. **JSON Text Frame (Server $\rightarrow$ Mobile):**
     - Thông tin ca thi: `{"event": "exam_info", "data": {"schedule_id": "...", "course_name": "...", "student_name": "..."}}`
     - Giám khảo AI sẵn sàng: `{"event": "examiner_ready"}`
     - Phụ đề chữ chạy thời gian thực: `{"event": "subtitle_delta", "role": "EXAMINER"|"STUDENT", "text": "...", "is_interim": boolean}`
     - AI đọc xong câu hỏi: `{"event": "turn_complete"}`
     - AI bị ngắt lời (Barge-in): `{"event": "interrupted"}`
     - Bảng điểm & nhận xét cuối cùng: `{"event": "exam_completed", "schedule_id": "...", "result": {"overall_score": 8.8, "summary": "..."}}`

---

## 3. Mẫu Code Dịch Vụ WebSocket (`viva_websocket_service.dart`)

```dart
import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:record/record.dart';

class VivaWebSocketService {
  WebSocketChannel? _channel;
  final AudioRecorder _audioRecorder = AudioRecorder();
  StreamSubscription<Uint8List>? _recordSubscription;

  // Callbacks
  Function(Uint8List audioBytes)? onAudioReceived;
  Function(String textDelta, String role)? onSubtitleDelta;
  Function()? onTurnComplete;
  Function(Map<String, dynamic> results)? onExamCompleted;

  bool get isConnected => _channel != null;

  /// Bắt đầu phiên thi vấn đáp
  Future<void> startExam({
    required String serverWsUrl,
  }) async {
    // 1. Mở kết nối WebSocket
    _channel = WebSocketChannel.connect(Uri.parse(serverWsUrl));

    // Lắng nghe dữ liệu từ Server
    _channel!.stream.listen(
      (message) {
        if (message is Uint8List) {
          // Nhận âm thanh PCM 24kHz từ Giám khảo AI
          onAudioReceived?.call(message);
        } else if (message is String) {
          final data = jsonDecode(message);
          final event = data['event'];
          if (event == 'subtitle_delta') {
            onSubtitleDelta?.call(data['text'] ?? '', data['role'] ?? 'EXAMINER');
          } else if (event == 'turn_complete') {
            onTurnComplete?.call();
          } else if (event == 'exam_completed') {
            onExamCompleted?.call(data['result'] ?? {});
            stopExam();
          }
        }
      },
      onError: (err) => print('Lỗi WebSocket: $err'),
      onDone: () => print('Đóng kết nối WebSocket'),
    );

    // 2. Bắt đầu thu âm PCM 16kHz từ Microphone và gửi Binary Frames
    if (await _audioRecorder.hasPermission()) {
      final recordStream = await _audioRecorder.startStream(
        const RecordConfig(
          encoder: AudioEncoder.pcm16bits,
          sampleRate: 16000,
          numChannels: 1,
          echoCancel: true,
          noiseSuppress: true,
          autoGain: true,
        ),
      );

      _recordSubscription = recordStream.listen((chunk) {
        if (_channel != null) {
          _channel!.sink.add(chunk); // Gửi binary chunk
        }
      });
    }
  }

  /// Kết thúc ca thi và yêu cầu chấm điểm
  void finishExam() {
    if (_channel != null) {
      _channel!.sink.add(jsonEncode({'event': 'finish_exam'}));
    }
  }

  /// Dọn dẹp tài nguyên
  Future<void> stopExam() async {
    await _recordSubscription?.cancel();
    _recordSubscription = null;
    await _audioRecorder.stop();

    await _channel?.sink.close();
    _channel = null;
  }
}
```

---

## 4. Tích hợp với Java Spring Boot Backend

Quy trình hoạt động toàn diện của Mobile:
1. Khi sinh viên vào màn hình ca thi, gọi API Spring Boot:
   `POST /api/mobile/viva/{scheduleId}/start`
2. Backend Java chuyển trạng thái ca thi sang `IN_PROGRESS` và trả về URL của WebSocket:
   ```json
   {
     "success": true,
     "data": {
       "scheduleId": "e2a1b3c4-...",
       "wsUrl": "ws://192.168.1.100:8000/ws/viva/e2a1b3c4-..."
     }
   }
   ```
3. Flutter kết nối tới `wsUrl` bằng `VivaWebSocketService`.
4. Sau khi kết thúc, Python Agent tự động gọi `gemini-2.5-flash` chấm điểm và nộp về Spring Boot:
   `POST /api/internal/viva/{scheduleId}/results`
5. Spring Boot cập nhật PostgreSQL và Flutter hiển thị điểm số cùng nhận xét của Giám khảo AI.

---

## 5. Trải Nghiệm Người Dùng & Quản Lý Trạng Thái Trên Mobile

### 5.1. Mô Hình State Management (`VivaSessionProvider`)
* **AudioPulseOrb Holographic Visualizer:** Quả cầu âm thanh 3D đổi màu theo trạng thái:
  * `aiSpeaking`: Gradient tím-cyan tỏa sáng khi Giám khảo AI đặt câu hỏi.
  * `listening`: Gradient cyan-xanh lá phản ứng theo biên độ âm thanh (`audioLevel`) micro của thí sinh.
  * `processing`: Xoay đều biểu thị AI đang chấm điểm Rubric.
  * `idle`: Trạng thái tĩnh sau khi kết thúc.
* **Đồng hồ đếm ngược:** Đếm lùi tự động giới hạn thời gian ca thi (15 phút).
* **Live Speech-to-Text Stream:** Hiển thị trực tiếp câu trả lời của thí sinh theo thời gian thực dưới dạng hội thoại bong bóng (Chat bubbles).

### 5.2. Chế Độ Mock Fallback Thông Minh (Offline Testing)
* Khi khởi động app trong môi trường phát triển chưa bật Python WebSocket Server, `VivaWebSocketService` tự động chuyển sang chế độ **Intelligent Mock Mode**.
* Đảm bảo đội ngũ Frontend/Mobile có thể kiểm thử toàn bộ luồng UX (chọn ca thi $\rightarrow$ vào phòng thi $\rightarrow$ trả lời câu hỏi $\rightarrow$ xem kết quả đánh giá) mà không phụ thuộc vào hạ tầng mạng.

