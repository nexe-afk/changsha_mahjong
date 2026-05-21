import 'dart:async';
import 'dart:convert';
import 'dart:io';

/// Represents a LAN room discovered via UDP broadcast.
class LanRoom {
  final String roomId;
  final String roomName;
  final String host;
  final String ip;
  final int port;
  final int playerCount;
  DateTime lastSeen;

  LanRoom({
    required this.roomId,
    required this.roomName,
    required this.host,
    required this.ip,
    required this.port,
    required this.playerCount,
    required this.lastSeen,
  });
}

/// UDP-broadcast-based LAN discovery.
///
/// Host side: call [startBroadcast] to advertise the room every second.
/// Client side: call [startListening] and subscribe to [roomsStream].
class LanDiscovery {
  static const int _port = 9877;

  RawDatagramSocket? _socket;
  Timer? _broadcastTimer;
  Timer? _cleanupTimer;
  final Map<String, LanRoom> _rooms = {};
  final StreamController<List<LanRoom>> _controller =
      StreamController<List<LanRoom>>.broadcast();

  Stream<List<LanRoom>> get roomsStream => _controller.stream;
  List<LanRoom> get currentRooms => List.unmodifiable(_rooms.values.toList());

  // ── host ──────────────────────────────────────────────────────────────────

  Future<void> startBroadcast({
    required String roomId,
    required String roomName,
    required String host,
    required int gamePort,
    int playerCount = 1,
  }) async {
    _socket = await RawDatagramSocket.bind(InternetAddress.anyIPv4, 0);
    _socket!.broadcastEnabled = true;

    void sendBeacon() {
      final payload = utf8.encode(jsonEncode({
        'type': 'csmahjong_room',
        'roomId': roomId,
        'roomName': roomName,
        'host': host,
        'port': gamePort,
        'playerCount': playerCount,
      }));
      try {
        _socket?.send(payload, InternetAddress('255.255.255.255'), _port);
      } catch (_) {}
    }

    sendBeacon();
    _broadcastTimer = Timer.periodic(const Duration(seconds: 1), (_) => sendBeacon());
  }

  void updatePlayerCount(int count) {
    // Beacon payload is rebuilt every tick, so no extra action needed here —
    // but callers can restart broadcast with the new count if needed.
  }

  // ── client ────────────────────────────────────────────────────────────────

  Future<void> startListening() async {
    _socket = await RawDatagramSocket.bind(InternetAddress.anyIPv4, _port,
        reuseAddress: true, reusePort: true);

    _socket!.listen((event) {
      if (event == RawSocketEvent.read) {
        final dg = _socket?.receive();
        if (dg != null) _handleDatagram(dg);
      }
    });

    // Remove rooms not seen for 4 seconds.
    _cleanupTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      final cutoff = DateTime.now().subtract(const Duration(seconds: 4));
      final before = _rooms.length;
      _rooms.removeWhere((_, r) => r.lastSeen.isBefore(cutoff));
      if (_rooms.length != before) _notify();
    });
  }

  void _handleDatagram(Datagram dg) {
    try {
      final data = jsonDecode(utf8.decode(dg.data)) as Map<String, dynamic>;
      if (data['type'] != 'csmahjong_room') return;

      final roomId = data['roomId'] as String;
      final existing = _rooms[roomId];
      if (existing != null) {
        existing.lastSeen = DateTime.now();
        existing.lastSeen = DateTime.now();
      } else {
        _rooms[roomId] = LanRoom(
          roomId: roomId,
          roomName: data['roomName'] as String? ?? roomId,
          host: data['host'] as String? ?? '?',
          ip: dg.address.address,
          port: data['port'] as int? ?? 9876,
          playerCount: data['playerCount'] as int? ?? 1,
          lastSeen: DateTime.now(),
        );
      }
      _notify();
    } catch (_) {}
  }

  void _notify() {
    if (!_controller.isClosed) {
      _controller.add(List.unmodifiable(_rooms.values.toList()));
    }
  }

  // ── shared ────────────────────────────────────────────────────────────────

  void stop() {
    _broadcastTimer?.cancel();
    _cleanupTimer?.cancel();
    _socket?.close();
    _socket = null;
    if (!_controller.isClosed) _controller.close();
  }
}
