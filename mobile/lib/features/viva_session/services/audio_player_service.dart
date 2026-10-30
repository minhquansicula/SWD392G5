import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_sound/flutter_sound.dart';

/// Dịch vụ phát âm thanh thời gian thực (PCM 24kHz Mono 16-bit)
/// Nhận các luồng byte âm thanh từ Gemini Live qua WebSocket và phát ra loa thiết bị.
class AudioPlayerService {
  FlutterSoundPlayer? _player;
  bool _isPlayerInitialized = false;
  bool _isPlaying = false;
  // Guard flag: ngăn nhiều lần gọi startPlayerFromStream đồng thời
  bool _isStarting = false;

  // Hàng đợi lưu các chunk đến trong khi stream đang mở hoặc khởi động
  final List<Uint8List> _chunkQueue = [];

  bool get isPlaying => _isPlaying;

  /// Khởi tạo audio session cho bộ phát
  Future<bool> init() async {
    if (_isPlayerInitialized && _player != null) return true;

    try {
      if (kIsWeb) {
        _isPlayerInitialized = true;
        return true;
      }

      _player = FlutterSoundPlayer();
      await _player!.openPlayer();
      _isPlayerInitialized = true;
      debugPrint('[AudioPlayerService] FlutterSoundPlayer initialized successfully.');
      return true;
    } catch (e) {
      debugPrint('[AudioPlayerService] Error initializing player: $e');
      _isPlayerInitialized = false;
      return false;
    }
  }

  /// Bắt đầu mở kênh stream nhận PCM byte (mặc định 24,000Hz từ Gemini Live)
  Future<void> startStreamPlayer({int sampleRate = 24000, int numChannels = 1}) async {
    // Nếu đang start hoặc đã playing → bỏ qua để tránh race condition
    if (_isStarting || _isPlaying) return;

    if (_player == null || !_isPlayerInitialized) {
      await init();
    }
    if (_player == null) return;

    _isStarting = true;
    try {
      await _player!.startPlayerFromStream(
        codec: Codec.pcm16,
        numChannels: numChannels,
        sampleRate: sampleRate,
        interleaved: true,
        bufferSize: 8192,
      );
      _isPlaying = true;
      debugPrint('[AudioPlayerService] Started PCM stream player ($sampleRate Hz, $numChannels ch).');
    } catch (e) {
      debugPrint('[AudioPlayerService] Error starting player stream: $e');
      _isPlaying = false;
    } finally {
      _isStarting = false;
    }
  }

  /// Nạp các byte PCM nhị phân nhận được từ WebSocket vào buffer loa ngoài
  Future<void> feedPcmChunk(Uint8List chunk) async {
    if (_player == null || !_isPlayerInitialized || chunk.isEmpty) return;

    // Nếu stream đã mở và uint8ListSink sẵn sàng -> đẩy trực tiếp qua Sink
    // StreamSink của flutter_sound tự quản lý hàng đợi và pause stream trong khi _feed
    // đang thực thi trên native, loại bỏ hoàn toàn race condition trong FeedThread của AudioTrack.
    if (_isPlaying && _player?.uint8ListSink != null) {
      try {
        _player!.uint8ListSink!.add(chunk);
      } catch (e) {
        debugPrint('[AudioPlayerService] Error writing to uint8ListSink: $e');
      }
      return;
    }

    // Nếu stream chưa mở hoặc đang khởi động -> đưa chunk vào hàng đợi
    _chunkQueue.add(chunk);

    if (!_isPlaying && !_isStarting) {
      await startStreamPlayer();

      // Sau khi stream đã mở thành công, xả toàn bộ chunk trong hàng đợi vào sink
      if (_isPlaying && _player?.uint8ListSink != null) {
        while (_chunkQueue.isNotEmpty) {
          final queued = _chunkQueue.removeAt(0);
          try {
            _player!.uint8ListSink!.add(queued);
          } catch (e) {
            debugPrint('[AudioPlayerService] Error draining queued chunk: $e');
            break;
          }
        }
      }
    }
  }

  /// Dừng phát âm thanh (Ví dụ: khi thí sinh ngắt lời AI - barge-in)
  Future<void> stop() async {
    _isStarting = false;
    _chunkQueue.clear();

    if (_player != null && _isPlaying) {
      _isPlaying = false;
      try {
        // Chờ 50ms để FeedThread trên Android kịp hoàn tất vòng ghi hiện tại
        // trước khi stopPlayer() giải phóng AudioTrack (ngăn lỗi SIGSEGV releaseBuffer)
        await Future.delayed(const Duration(milliseconds: 50));
        await _player!.stopPlayer();
      } catch (e) {
        debugPrint('[AudioPlayerService] Error stopping player: $e');
      }
    }
  }

  /// Xóa sạch buffer âm thanh đang phát dở (Barge-in / Interrupt)
  /// KHÔNG tự restart stream — chunk tiếp theo từ AI sẽ tự trigger start
  Future<void> clearAudioBuffer() async {
    await stop();
    debugPrint('[AudioPlayerService] Audio buffer cleared, ready for next AI turn.');
  }

  /// Giải phóng tài nguyên âm thanh
  Future<void> dispose() async {
    await stop();
    if (_player != null) {
      try {
        await _player!.closePlayer();
      } catch (e) {
        debugPrint('[AudioPlayerService] Error closing player: $e');
      }
      _player = null;
      _isPlayerInitialized = false;
    }
  }
}
