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
  StreamSubscription<dynamic>? _subscription;
  bool _disposed = false;
  int _generation = 0;
  Completer<void>? _authentication;
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
    if (_disposed) return;
    disconnect();
    final generation = _generation;
    if (token.trim().isEmpty || examId.trim().isEmpty) {
      _status = WsConnectionStatus.error;
      _statusController.add(_status);
      return;
    }
    _status = WsConnectionStatus.connecting;
    _statusController.add(_status);

    try {
      // Endpoint format in demo/viva-ai-v2: ws://<host>:8000/ws/live/sessions/{scheduleId}
      String targetUrl = wsUrl.trim();
      if (targetUrl.contains('{scheduleId}') ||
          targetUrl.contains('{schedule_id}')) {
        targetUrl = targetUrl
            .replaceAll('{scheduleId}', examId)
            .replaceAll('{schedule_id}', examId);
      } else if (targetUrl.endsWith('/')) {
        targetUrl = '$targetUrl$examId';
      } else if (!targetUrl.endsWith('/$examId')) {
        targetUrl = '$targetUrl/$examId';
      }

      final uri = Uri.parse(targetUrl);
      if (!const ['ws', 'wss'].contains(uri.scheme) ||
          uri.host.isEmpty ||
          uri.queryParameters.containsKey('token')) {
        throw const FormatException('Invalid WebSocket URL');
      }
      debugPrint('[VivaWebSocketService] Connecting to viva-ai-v2 at: $uri');
      _channel = WebSocketChannel.connect(uri);

      // Chờ socket mở thành công (timeout 5 giây)
      final authenticated = Completer<void>();
      _authentication = authenticated;
      _subscription = _channel!.stream.listen(
        (data) {
          if (_disposed || generation != _generation) return;
          if (data is String) {
            try {
              final jsonMsg = jsonDecode(data) as Map<String, dynamic>;
              final type = jsonMsg['type']?.toString();

              if (type == 'ready') {
                if (!authenticated.isCompleted) authenticated.complete();
                _status = WsConnectionStatus.authenticated;
                _statusController.add(_status);
                debugPrint(
                  '[VivaWebSocketService] Authenticated with viva-ai-v2: ${jsonMsg['exam_title']}',
                );
                _startHeartbeat();
              }

              _messageController.add(jsonMsg);
            } catch (e) {
              debugPrint(
                '[VivaWebSocketService] Error parsing incoming text: $e',
              );
            }
          } else if (data is Uint8List &&
              _status == WsConnectionStatus.authenticated) {
            // Nhận luồng âm thanh PCM 24kHz từ Gemini Live
            _messageController.add({'type': 'audio_chunk', 'data': data});
          } else if (data is List<int> &&
              _status == WsConnectionStatus.authenticated) {
            _messageController.add({
              'type': 'audio_chunk',
              'data': Uint8List.fromList(data),
            });
          }
        },
        onError: (err) {
          if (_disposed || generation != _generation) return;
          _stopHeartbeat();
          if (!authenticated.isCompleted) authenticated.complete();
          debugPrint('[VivaWebSocketService] WebSocket error: $err');
          _status = WsConnectionStatus.error;
          _statusController.add(_status);
        },
        onDone: () {
          if (_disposed || generation != _generation) return;
          if (!authenticated.isCompleted) authenticated.complete();
          debugPrint('[VivaWebSocketService] WebSocket closed.');
          _stopHeartbeat();
          _status = WsConnectionStatus.disconnected;
          _statusController.add(_status);
        },
      );
      await _channel!.ready.timeout(const Duration(seconds: 5));
      if (_disposed || generation != _generation) return;

      _status = WsConnectionStatus.connected;
      _statusController.add(_status);
      debugPrint(
        '[VivaWebSocketService] WebSocket opened. Sending authentication frame...',
      );

      // 1. Gửi khung xác thực Authentication Handshake (bắt buộc trong 10s đầu theo quy chuẩn viva-ai-v2)
      sendControlMessage({'type': 'authenticate', 'token': token});

      // 2. Lắng nghe dữ liệu phản hồi từ server
      await authenticated.future.timeout(const Duration(seconds: 10));
    } catch (e) {
      if (_disposed || generation != _generation) return;
      disconnect();
      debugPrint('[VivaWebSocketService] Connection failed: $e');
      _status = WsConnectionStatus.error;
      _statusController.add(_status);
    }
  }

  /// Gửi binary chunk audio PCM 16kHz từ microphone thí sinh lên viva-ai-v2
  void sendBinaryPcmChunk(Uint8List chunk) {
    if (!_disposed &&
        _status == WsConnectionStatus.authenticated &&
        chunk.isNotEmpty &&
        chunk.length.isEven &&
        _channel != null) {
      try {
        _channel!.sink.add(chunk);
      } catch (e) {
        debugPrint('[VivaWebSocketService] Error sending binary chunk: $e');
      }
    }
  }

  /// Gửi JSON control message (authenticate, finish, ping)
  bool sendControlMessage(Map<String, dynamic> message) {
    if (_disposed ||
        (message['type'] != 'authenticate' &&
            _status != WsConnectionStatus.authenticated)) {
      return false;
    }
    if (_channel != null) {
      try {
        _channel!.sink.add(jsonEncode(message));
        return true;
      } catch (e) {
        debugPrint('[VivaWebSocketService] Error sending control message: $e');
      }
    }
    return false;
  }

  /// Yêu cầu nộp bài và kích hoạt chấm điểm Rubric tự động trên viva-ai-v2
  bool finishExam() {
    debugPrint(
      '[VivaWebSocketService] Requesting finish exam to viva-ai-v2...',
    );
    return sendControlMessage({'type': 'finish'});
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
    _generation++;
    if (_authentication != null && !_authentication!.isCompleted) {
      _authentication!.complete();
    }
    _authentication = null;
    _stopHeartbeat();
    _subscription?.cancel();
    _subscription = null;
    _channel?.sink.close();
    _channel = null;
    _status = WsConnectionStatus.disconnected;
    if (!_disposed) _statusController.add(_status);
  }

  void dispose() {
    if (_disposed) return;
    disconnect();
    _disposed = true;
    _statusController.close();
    _messageController.close();
  }
}
