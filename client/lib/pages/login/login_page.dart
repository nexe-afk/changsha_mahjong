import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../config/theme.dart';
import '../../config/constants.dart';
import '../../services/api_service.dart';
import '../../services/game_state.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _nicknameCtrl = TextEditingController();
  final _api = ApiService(baseUrl: serverUrl);
  bool _loading = false;
  bool _isRegister = false;

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    _nicknameCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final username = _usernameCtrl.text.trim();
    final password = _passwordCtrl.text;
    final nickname = _nicknameCtrl.text.trim();
    if (username.isEmpty || password.isEmpty) {
      _showError('请输入用户名和密码');
      return;
    }
    if (username.length < 3) {
      _showError('用户名至少3个字符');
      return;
    }
    if (password.length < 6) {
      _showError('密码至少6个字符');
      return;
    }
    setState(() => _loading = true);
    try {
      final ok = _isRegister
          ? await _api.register(username, password, nickname.isNotEmpty ? nickname : '新玩家')
          : await _api.login(username, password);
      if (ok && mounted) {
        appState.connectSocket(socketUrl);
        Navigator.pushReplacementNamed(context, '/lobby');
      } else {
        _showError(_isRegister ? '注册失败，用户名可能已存在' : '登录失败，请检查用户名和密码');
      }
    } catch (e) {
      _showError('网络错误: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _guestLogin() async {
    setState(() => _loading = true);
    try {
      final ok = await _api.guestLogin();
      if (ok && mounted) {
        appState.connectSocket(socketUrl);
        Navigator.pushReplacementNamed(context, '/lobby');
      }
    } catch (e) {
      _showError('网络错误: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppTheme.bgGradient),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              children: [
                const SizedBox(height: 40),
                _buildLogo().animate().fadeIn(duration: 600.ms).slideY(begin: -0.2, end: 0),
                const SizedBox(height: 32),
                _buildFormCard().animate().fadeIn(duration: 500.ms, delay: 200.ms).slideY(begin: 0.2, end: 0),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLogo() {
    return Column(
      children: [
        Container(
          width: 80,
          height: 104,
          decoration: BoxDecoration(
            color: AppTheme.tileFace,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppTheme.gold, width: 2),
            boxShadow: [
              BoxShadow(color: AppTheme.gold.withOpacity(0.2), blurRadius: 16, spreadRadius: 1),
            ],
          ),
          child: const Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('長', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: AppTheme.deepRed)),
              SizedBox(height: 4),
              Text('沙', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppTheme.tongGreen)),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Text('長沙麻將', style: GoogleFonts.notoSerifSc(
          color: AppTheme.gold, fontSize: 34, fontWeight: FontWeight.bold, letterSpacing: 6,
          shadows: const [Shadow(color: Colors.black38, blurRadius: 4, offset: Offset(1, 1))],
        )),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          decoration: BoxDecoration(
            color: AppTheme.gold.withOpacity(0.15),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppTheme.gold.withOpacity(0.3)),
          ),
          child: Text(
            _isRegister ? '注册新账号' : '登录你的账号',
            style: TextStyle(color: AppTheme.gold.withOpacity(0.8), fontSize: 14, letterSpacing: 2),
          ),
        ),
      ],
    );
  }

  Widget _buildFormCard() {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            TextField(
              controller: _usernameCtrl,
              decoration: const InputDecoration(
                hintText: '用户名',
                prefixIcon: Icon(Icons.person_outline, color: AppTheme.gold),
              ),
              style: GoogleFonts.notoSansSc(color: Colors.white, fontSize: 16),
            ),
            const SizedBox(height: 16),
            if (_isRegister) ...[
              TextField(
                controller: _nicknameCtrl,
                decoration: const InputDecoration(
                  hintText: '昵称（选填）',
                  prefixIcon: Icon(Icons.face_outlined, color: AppTheme.gold),
                ),
                style: GoogleFonts.notoSansSc(color: Colors.white, fontSize: 16),
              ),
              const SizedBox(height: 16),
            ],
            TextField(
              controller: _passwordCtrl,
              obscureText: true,
              decoration: const InputDecoration(
                hintText: '密码',
                prefixIcon: Icon(Icons.lock_outline, color: AppTheme.gold),
              ),
              style: GoogleFonts.notoSansSc(color: Colors.white, fontSize: 16),
            ),
            const SizedBox(height: 28),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: AppTheme.primaryGreen))
                    : Text(_isRegister ? '注 册' : '登 录',
                        style: GoogleFonts.notoSansSc(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 4)),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              decoration: BoxDecoration(border: Border(top: BorderSide(color: Colors.white.withOpacity(0.1)))),
              padding: const EdgeInsets.only(top: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  TextButton(
                    onPressed: () => setState(() => _isRegister = !_isRegister),
                    child: Text(
                      _isRegister ? '已有账号？去登录' : '没有账号？去注册',
                      style: GoogleFonts.notoSansSc(color: AppTheme.gold, fontSize: 14, letterSpacing: 1),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: _loading ? null : _guestLogin,
              icon: const Icon(Icons.person_outline, size: 18, color: Colors.white54),
              label: Text('游客登录', style: GoogleFonts.notoSansSc(color: Colors.white54, fontSize: 14)),
            ),
          ],
        ),
      ),
    );
  }
}
