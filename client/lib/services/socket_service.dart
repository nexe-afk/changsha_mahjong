import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketService {
  IO.Socket? socket;
  final String serverUrl;
  bool _connected = false;

  SocketService({required this.serverUrl});

  bool get isConnected => _connected;

  void connect(String token) {
    socket = IO.io(serverUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
      'auth': {'token': token},
    });

    socket!.on('connect', (_) {
      _connected = true;
      _flushPendingEmits();
    });
    socket!.on('disconnect', (_) {
      _connected = false;
    });
    socket!.on('error', (data) => print('Socket error: $data'));
    socket!.connect();
  }

  final List<void Function(String, dynamic)> _pendingEmits = [];

  void _flushPendingEmits() {
    for (final cb in _pendingEmits) {
      cb('', null);
    }
    _pendingEmits.clear();
  }

  void emit(String event, [dynamic data]) {
    if (!_connected) {
      _pendingEmits.add((_, __) => socket?.emit(event, data));
      return;
    }
    socket?.emit(event, data);
  }

  void on(String event, Function(dynamic) callback) {
    socket?.on(event, callback);
  }

  void off(String event) {
    socket?.off(event);
  }

  void disconnect() {
    _connected = false;
    _pendingEmits.clear();
    socket?.disconnect();
  }
}
