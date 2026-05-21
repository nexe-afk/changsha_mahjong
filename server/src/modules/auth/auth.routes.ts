import { Router, Request, Response } from 'express';
import { AuthService } from './auth.service';

const router = Router();
const authService = new AuthService();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, nickname } = req.body;
    const { user, token } = await authService.register(username, password, nickname || '新玩家');
    res.json({ success: true, data: { user: { id: user.id, nickname: user.nickname, coins: user.coins }, token } });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, message: '用户名和密码不能为空' });
      return;
    }
    const { user, token } = await authService.login(username, password);
    res.json({ success: true, data: { user: { id: user.id, nickname: user.nickname, coins: user.coins }, token } });
  } catch (err: any) {
    res.status(401).json({ success: false, message: err.message });
  }
});

router.post('/guest', async (_req: Request, res: Response) => {
  try {
    const { user, token } = await authService.guestLogin();
    res.json({ success: true, data: { user: { id: user.id, nickname: user.nickname, coins: user.coins }, token } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
