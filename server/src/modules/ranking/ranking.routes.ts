import { Router, Request, Response } from 'express';

const router = Router();

router.get('/:period', async (req: Request, res: Response) => {
  const period = req.params.period;
  const limit = parseInt(req.query.limit as string) || 100;
  const rankings = Array.from({ length: Math.min(limit, 20) }, (_, i) => ({
    rank: i + 1,
    userId: (i + 1) * 137 % 999,
    nickname: `玩家 ${(i + 1) * 137 % 999}`,
    coins: 10000 - i * 200,
    winCount: 50 - i,
    period,
  }));
  res.json({ success: true, data: rankings });
});

export default router;
