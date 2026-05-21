import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/list', async (_req: Request, res: Response) => {
  res.json({ success: true, data: [] });
});

router.post('/add', async (req: AuthRequest, res: Response) => {
  const { friendId } = req.body;
  if (!friendId) {
    res.status(400).json({ success: false, message: 'friendId is required' });
    return;
  }
  res.json({ success: true, message: `Friend request sent to ${friendId}` });
});

router.post('/accept', async (req: AuthRequest, res: Response) => {
  const { friendId } = req.body;
  if (!friendId) {
    res.status(400).json({ success: false, message: 'friendId is required' });
    return;
  }
  res.json({ success: true, message: `Accepted friend ${friendId}` });
});

router.delete('/:friendId', async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: `Removed friend ${req.params.friendId}` });
});

export default router;
