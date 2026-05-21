import 'package:audioplayers/audioplayers.dart';

class AudioService {
  static final AudioService _instance = AudioService._internal();
  factory AudioService() => _instance;
  AudioService._internal();

  final AudioPlayer _player = AudioPlayer();
  bool _enabled = true;

  bool get enabled => _enabled;

  void setEnabled(bool value) {
    _enabled = value;
  }

  Future<void> playDiscard() async {
    if (!_enabled) return;
    try {
      await _player.play(AssetSource('audio/discard.mp3'));
    } catch (_) {}
  }

  Future<void> playPong() async {
    if (!_enabled) return;
    try {
      await _player.play(AssetSource('audio/pong.mp3'));
    } catch (_) {}
  }

  Future<void> playKong() async {
    if (!_enabled) return;
    try {
      await _player.play(AssetSource('audio/kong.mp3'));
    } catch (_) {}
  }

  Future<void> playWin() async {
    if (!_enabled) return;
    try {
      await _player.play(AssetSource('audio/win.mp3'));
    } catch (_) {}
  }

  Future<void> playDraw() async {
    if (!_enabled) return;
    try {
      await _player.play(AssetSource('audio/draw.mp3'));
    } catch (_) {}
  }

  Future<void> playBirdReveal() async {
    if (!_enabled) return;
    try {
      await _player.play(AssetSource('audio/bird.mp3'));
    } catch (_) {}
  }

  Future<void> playBgm() async {
    if (!_enabled) return;
    try {
      await _player.setReleaseMode(ReleaseMode.loop);
      await _player.setVolume(0.3);
      await _player.play(AssetSource('audio/bgm.mp3'));
    } catch (_) {}
  }

  Future<void> stopBgm() async {
    await _player.stop();
  }

  void dispose() {
    _player.dispose();
  }
}
