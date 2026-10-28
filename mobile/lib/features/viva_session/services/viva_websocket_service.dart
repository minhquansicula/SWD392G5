import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

enum WsConnectionStatus {
  disconnected,
  connecting,
  connected,
  authenticated,
  error,
}

/// WebSocket Service kết nối trực tiếp với demo/viva-ai-v2 (VoiceRoom Engine)
/// Endpoint: `ws://<host>:8000/ws/live/sessions/{scheduleId}`
class VivaWebSocketService {
  WebSocketChannel? _channel;
  WsConnectionStatus _status = WsConnectionStatus.disconnected;

  final StreamController<WsConnectionStatus> _statusController =
      StreamController<WsConnectionStatus>.broadcast();
  final StreamController<Map<String, dynamic>> _messageController =
      StreamController<Map<String, dynamic>>.broadcast();

  Timer? _heartbeatTimer;

  Stream<WsConnectionStatus> get statusStream => _statusController.stream;
  Stream<Map<String, dynamic>> get messageStream => _messageController.stream;
  WsConnectionStatus get currentStatus => _status;

  /// Kết nối WebSocket tới demo/viva-ai-v2 và gửi authentication handshake
  Future<void> connect({
    required String wsUrl,
    required String examId,
    required String token,
  }) async {
    _status = WsConnectionStatus.connecting;
    _statusController.add(_status);

    try {
      // Endpoint format in demo/viva-ai-v2: ws://<host>:8000/ws/live/sessions/{scheduleId}
      String targetUrl = wsUrl.trim();
      if (targetUrl.contains('{scheduleId}') || targetUrl.contains('{schedule_id}')) {
        targetUrl = targetUrl
            .replaceAll('{scheduleId}', examId)
            .replaceAll('{schedule_id}', examId);
      } else if (targetUrl.endsWith('/')) {
        targetUrl = '$targetUrl$examId';
      } else if (!targetUrl.endsWith('/$examId')) {
        targetUrl = '$targetUrl/$examId';
      }

      final uri = Uri.parse(targetUrl);
      debugPrint('[VivaWebSocketService] Connecting to viva-ai-v2 at: $uri');
      _channel = WebSocketChannel.connect(uri);

      // Chờ socket mở thành công (timeout 5 giây)
      await _channel!.ready.timeout(const Duration(seconds: 5));

      _status = WsConnectionStatus.connected;
      _statusController.add(_status);
      debugPrint('[VivaWebSocketService] WebSocket opened. Sending authentication frame...');

      // 1. Gửi khung xác thực Authentication Handshake (bắt buộc trong 10s đầu theo quy chuẩn viva-ai-v2)
      sendControlMessage({
        'type': 'authenticate',
        'token': token,
      });

      // 2. Lắng nghe dữ liệu phản hồi từ server
      _channel!.stream.listen(
        (data) {
          if (data is String) {
            try {
              final jsonMsg = jsonDecode(data) as Map<String, dynamic>;
              final type = jsonMsg['type']?.toString();

              if (type == 'ready') {
                _status = WsConnectionStatus.authenticated;
                _statusController.add(_status);
                debugPrint('[VivaWebSocketService] Authenticated with viva-ai-v2: ${jsonMsg['exam_title']}');
                _startHeartbeat();
              }

              _messageController.add(jsonMsg);
            } catch (e) {
              debugPrint('[VivaWebSocketService] Error parsing incoming text: $e');
            }
          } else if (data is Uint8List) {
            // Nhận luồng âm thanh PCM 24kHz từ Gemini Live
            _messageController.add({
              'type': 'audio_chunk',
              'data': data,
            });
          } else if (data is List<int>) {
            _messageController.add({
              'type': 'audio_chunk',
              'data': Uint8List.fromList(data),
            });
          }
        },
        onError: (err) {
          debugPrint('[VivaWebSocketService] WebSocket error: $err');
          _status = WsConnectionStatus.error;
          _statusController.add(_status);
        },
        onDone: () {
          debugPrint('[VivaWebSocketService] WebSocket closed.');
          _stopHeartbeat();
          _status = WsConnectionStatus.disconnected;
          _statusController.add(_status);
        },
      );
    } catch (e) {
      debugPrint('[VivaWebSocketService] Connection failed: $e');
      _status = WsConnectionStatus.error;
      _statusController.add(_status);
    }
  }

  /// Gửi binary chunk audio PCM 16kHz từ microphone thí sinh lên viva-ai-v2
  void sendBinaryPcmChunk(Uint8List chunk) {
    if ((_status == WsConnectionStatus.connected || _status == WsConnectionStatus.authenticated) &&
        _channel != null) {
      try {
        _channel!.sink.add(chunk);
      } catch (e) {
        debugPrint('[VivaWebSocketService] Error sending binary chunk: $e');
      }
    }
  }

  /// Gửi JSON control message (authenticate, finish, ping)
  void sendControlMessage(Map<String, dynamic> message) {
    if (_channel != null) {
      try {
        _channel!.sink.add(jsonEncode(message));
      } catch (e) {
        debugPrint('[VivaWebSocketService] Error sending control message: $e');
      }
    }
  }

  /// Yêu cầu nộp bài và kích hoạt chấm điểm Rubric tự động trên viva-ai-v2
  void finishExam() {
    debugPrint('[VivaWebSocketService] Requesting finish exam to viva-ai-v2...');
    sendControlMessage({'type': 'finish'});
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 15), (t) {
      if (_status == WsConnectionStatus.authenticated) {
        sendControlMessage({'type': 'ping'});
      }
    });
  }

  void _stopHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }

  void disconnect() {
    _stopHeartbeat();
    _channel?.sink.close();
    _channel = null;
    _status = WsConnectionStatus.disconnected;
    _statusController.add(_status);
  }

  void dispose() {
    disconnect();
    _statusController.close();
    _messageController.close();
  }
}
