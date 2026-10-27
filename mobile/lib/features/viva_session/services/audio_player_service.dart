import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_sound/flutter_sound.dart';

/// Dịch vụ phát âm thanh thời gian thực (PCM 24kHz Mono 16-bit)
/// Nhận các luồng byte âm thanh từ Gemini Live qua WebSocket và phát ra loa thiết bị.
class AudioPlayerService {
  FlutterSoundPlayer? _player;
  bool _isPlayerInitialized = false;
  bool _isPlaying = false;

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
    if (_player == null || !_isPlayerInitialized) {
      await init();
    }
    if (_player == null) return;

    try {
      if (!_isPlaying) {
        await _player!.startPlayerFromStream(
          codec: Codec.pcm16,
          numChannels: numChannels,
          sampleRate: sampleRate,
          interleaved: true,
          bufferSize: 8192,
        );
        _isPlaying = true;
        debugPrint('[AudioPlayerService] Started PCM stream player ($sampleRate Hz, $numChannels ch).');
      }
    } catch (e) {
      debugPrint('[AudioPlayerService] Error starting player stream: $e');
    }
  }

  /// Nạp các byte PCM nhị phân nhận được từ WebSocket vào buffer loa ngoài
  Future<void> feedPcmChunk(Uint8List chunk) async {
    if (_player == null || !_isPlayerInitialized) return;

    try {
      if (!_isPlaying) {
        await startStreamPlayer();
      }
      await _player!.feedUint8FromStream(chunk);
    } catch (e) {
      debugPrint('[AudioPlayerService] Error feeding PCM chunk: $e');
    }
  }

  /// Dừng phát âm thanh (Ví dụ: khi thí sinh ngắt lời AI - barge-in)
  Future<void> stop() async {
    if (_player != null && _isPlaying) {
      try {
        await _player!.stopPlayer();
      } catch (e) {
        debugPrint('[AudioPlayerService] Error stopping player: $e');
      } finally {
        _isPlaying = false;
      }
    }
  }

  /// Xóa sạch buffer âm thanh đang phát dở (Barge-in / Interrupt)
  Future<void> clearAudioBuffer() async {
    await stop();
    // Khởi động lại stream sẵn sàng cho lượt nói tiếp theo
    await startStreamPlayer();
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
