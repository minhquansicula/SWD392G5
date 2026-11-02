import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:flutter_sound/flutter_sound.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../core/constants/app_constants.dart';

class AudioRecorderService {
  FlutterSoundRecorder? _recorder;
  bool _isRecorderInitialized = false;
  bool _isRecording = false;
  bool _disposed = false;

  final StreamController<Uint8List> _audioChunkController =
      StreamController<Uint8List>.broadcast();
  final StreamController<double> _amplitudeController =
      StreamController<double>.broadcast();

  Stream<Uint8List> get audioChunkStream => _audioChunkController.stream;
  Stream<double> get amplitudeStream => _amplitudeController.stream;

  bool get isRecording => _isRecording;

  // Buffer for cutting into 100ms - 200ms chunks (Default: 150ms = 4800 bytes @ 16kHz 16-bit Mono)
  // 16000 samples/sec * 2 bytes/sample = 32000 bytes/sec
  // 150ms chunk = 32000 * 0.15 = 4800 bytes
  static const int _targetChunkSize =
      (AppConstants.audioSampleRate * 2 * AppConstants.audioChunkMs) ~/ 1000;
  final List<int> _pcmBuffer = [];

  StreamSubscription? _recordingDataSubscription;
  StreamController<Uint8List>? _recordingController;

  Future<bool> init() async {
    if (_disposed) return false;
    try {
      if (kIsWeb) {
        return false;
      }

      final status = await Permission.microphone.request();
      if (_disposed) return false;
      if (status != PermissionStatus.granted) {
        debugPrint(
          '[AudioRecorderService] Microphone permission not granted: $status',
        );
        _isRecorderInitialized = false;
        return false;
      }

      _recorder = FlutterSoundRecorder();
      await _recorder!.openRecorder();
      if (_disposed) {
        await _recorder?.closeRecorder();
        return false;
      }
      _isRecorderInitialized = true;
      debugPrint('[AudioRecorderService] FlutterSoundRecorder initialized.');
      return true;
    } catch (e) {
      debugPrint('[AudioRecorderService] Error initializing recorder: $e');
      _isRecorderInitialized = false;
      return false;
    }
  }

  Future<void> startRecording() async {
    if (_disposed) throw StateError('Recorder disposed');
    if (_isRecording) return;
    _pcmBuffer.clear();

    if (_recorder != null && _isRecorderInitialized) {
      try {
        final streamSink = StreamController<Uint8List>();
        _recordingController = streamSink;
        _recordingDataSubscription = streamSink.stream.listen((Uint8List data) {
          _handleIncomingRawBytes(data);
        });

        await _recorder!.startRecorder(
          toStream: streamSink.sink,
          codec: Codec.pcm16,
          numChannels: AppConstants.audioChannels,
          sampleRate: AppConstants.audioSampleRate,
        );

        _isRecording = true;
        debugPrint(
          '[AudioRecorderService] Started recording Raw PCM 16kHz Mono.',
        );
        return;
      } catch (e) {
        await _recordingDataSubscription?.cancel();
        _recordingDataSubscription = null;
        await _recordingController?.close();
        _recordingController = null;
        debugPrint('[AudioRecorderService] Native recorder start failed: $e.');
      }
    }

    throw StateError('Không thể ghi âm. Kiểm tra quyền microphone và thử lại.');
  }

  void _handleIncomingRawBytes(Uint8List newBytes) {
    if (_disposed) return;
    _pcmBuffer.addAll(newBytes);

    // Calculate real-time amplitude / decibel for waveform
    _calculateAndEmitAmplitude(newBytes);

    // Cut into 100ms - 200ms chunks (4800 bytes each) and emit as raw binary
    while (_pcmBuffer.length >= _targetChunkSize) {
      final chunk = Uint8List.fromList(_pcmBuffer.sublist(0, _targetChunkSize));
      _pcmBuffer.removeRange(0, _targetChunkSize);
      _audioChunkController.add(chunk);
    }
  }

  void _calculateAndEmitAmplitude(Uint8List bytes) {
    if (bytes.length < 2) return;
    double sumSquares = 0.0;
    final sampleCount = bytes.length ~/ 2;

    for (int i = 0; i < bytes.length - 1; i += 2) {
      // 16-bit signed PCM
      int sample = bytes[i] | (bytes[i + 1] << 8);
      if (sample >= 32768) sample -= 65536;
      sumSquares += sample * sample;
    }

    final rms = math.sqrt(sumSquares / sampleCount);
    // Normalize RMS to 0.0 - 1.0 range
    final normalized = (rms / 32768.0 * 3.5).clamp(0.05, 1.0);
    _amplitudeController.add(normalized);
  }

  Future<void> stopRecording() async {
    if (_amplitudeController.isClosed) return;
    _isRecording = false;

    if (_recorder != null && _isRecorderInitialized) {
      try {
        await _recorder!.stopRecorder();
        await _recordingDataSubscription?.cancel();
        _recordingDataSubscription = null;
      } catch (e) {
        debugPrint('[AudioRecorderService] Error stopping recorder: $e');
      }
    }
    await _recordingDataSubscription?.cancel();
    _recordingDataSubscription = null;
    await _recordingController?.close();
    _recordingController = null;

    // Flush any remaining buffer if any
    if (_pcmBuffer.isNotEmpty) {
      _audioChunkController.add(Uint8List.fromList(_pcmBuffer));
      _pcmBuffer.clear();
    }

    if (!_amplitudeController.isClosed) _amplitudeController.add(0.0);
    debugPrint('[AudioRecorderService] Stopped recording.');
  }

  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    await stopRecording();
    await _recorder?.closeRecorder();
    _recorder = null;
    await _audioChunkController.close();
    await _amplitudeController.close();
  }
}
