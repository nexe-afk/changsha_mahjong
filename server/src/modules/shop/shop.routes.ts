import { Router, Request, Response } from 'express';

const router = Router();

router.get('/items', async (_req: Request, res: Response) => {
  const items = [
    { id: 1, name: '6000金币', type: 'coins', price_coins: 0, price_diamond: 6, description: '6元充值包' },
    { id: 2, name: '30000金币', type: 'coins', price_coins: 0, price_diamond: 28, description: '28元充值包' },
    { id: 3, name: '头像框-金龙', type: 'avatar_frame', price_coins: 2000, price_diamond: 0, description: '金龙头像框' },
    { id: 4, name: '表情包-麻将大师', type: 'emoji', price_coins: 1500, price_diamond: 0, description: '麻将大师表情包' },
    { id: 5, name: '牌桌皮肤-翡翠绿', type: 'table_skin', price_coins: 3000, price_diamond: 0, description: '翡翠绿牌桌' },
  ];
  res.json({ success: true, data: items });
});

export default router;
