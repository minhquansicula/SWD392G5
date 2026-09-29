import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

enum WsConnectionStatus {
  disconnected,
  connecting,
  connected,
  mockActive,
  error,
}

class VivaWebSocketService {
  WebSocketChannel? _channel;
  WsConnectionStatus _status = WsConnectionStatus.disconnected;

  final StreamController<WsConnectionStatus> _statusController =
      StreamController<WsConnectionStatus>.broadcast();
  final StreamController<Map<String, dynamic>> _messageController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<WsConnectionStatus> get statusStream => _statusController.stream;
  Stream<Map<String, dynamic>> get messageStream => _messageController.stream;
  WsConnectionStatus get currentStatus => _status;

  bool _isMockMode = false;
  bool get isMockMode => _isMockMode;

  Future<void> connect({
    required String wsUrl,
    required String examId,
    required String studentId,
  }) async {
    _status = WsConnectionStatus.connecting;
    _statusController.add(_status);

    try {
      final uri = Uri.parse('$wsUrl?examId=$examId&studentId=$studentId');
      _channel = WebSocketChannel.connect(uri);

      // Timeout connection check
      await _channel!.ready.timeout(const Duration(seconds: 4));

      _status = WsConnectionStatus.connected;
      _isMockMode = false;
      _statusController.add(_status);
      debugPrint('[VivaWebSocketService] Connected to backend WebSocket: $uri');

      _channel!.stream.listen(
        (data) {
          if (data is String) {
            try {
              final jsonMsg = jsonDecode(data) as Map<String, dynamic>;
              _messageController.add(jsonMsg);
            } catch (e) {
              debugPrint('[VivaWebSocketService] Error parsing incoming text: $e');
            }
          } else if (data is Uint8List) {
            // Audio response from TTS if streamed as binary
            _messageController.add({
              'type': 'tts_audio_chunk',
              'data': data,
            });
          }
        },
        onError: (err) {
          debugPrint('[VivaWebSocketService] WebSocket error: $err');
          _fallbackToMock('Lỗi kết nối WebSocket ($err). Chuyển sang mô phỏng thông minh.');
        },
        onDone: () {
          debugPrint('[VivaWebSocketService] WebSocket closed.');
          _status = WsConnectionStatus.disconnected;
          _statusController.add(_status);
        },
      );
    } catch (e) {
      debugPrint('[VivaWebSocketService] Connection failed: $e. Activating intelligent mock mode.');
      _fallbackToMock('Không thể kết nối WebSocket server. Chuyển sang chế độ demo tương tác.');
    }
  }

  void _fallbackToMock(String reason) {
    _isMockMode = true;
    _status = WsConnectionStatus.mockActive;
    _statusController.add(_status);
  }

  /// Sends raw binary PCM audio chunk (100ms - 200ms) to backend
  void sendBinaryPcmChunk(Uint8List chunk) {
    if (_status == WsConnectionStatus.connected && _channel != null) {
      try {
        _channel!.sink.add(chunk);
      } catch (e) {
        debugPrint('[VivaWebSocketService] Error sending binary chunk: $e');
      }
    } else if (_isMockMode) {
      // In mock mode, we silently consume the chunk
    }
  }

  /// Sends JSON control messages (start question, submit answer, request question repeat)
  void sendControlMessage(Map<String, dynamic> message) {
    if (_status == WsConnectionStatus.connected && _channel != null) {
      try {
        _channel!.sink.add(jsonEncode(message));
      } catch (e) {
        debugPrint('[VivaWebSocketService] Error sending control message: $e');
      }
    } else if (_isMockMode) {
      // Handle control mock interactions
      _handleMockControl(message);
    }
  }

  void _handleMockControl(Map<String, dynamic> message) {
    final type = message['type']?.toString();
    if (type == 'submit_answer') {
      // Simulate backend AI analyzing answer and triggering follow-up or completion
      Future.delayed(const Duration(milliseconds: 1400), () {
        _messageController.add({
          'type': 'ai_analysis_complete',
          'confidence': 0.968,
        });
      });
    }
  }

  void disconnect() {
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
