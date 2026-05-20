// ===== 麻将牌渲染（真实图片版）=====
// 普通牌使用 PNG 图片，红中保留 PixiJS 绘制

// 真实图片尺寸: 65×99，按 0.8x 缩放作为标准尺寸
const TILE = {
  BIG_W:   52,   // 65 * 0.8
  BIG_H:   79,   // 99 * 0.8
  SMALL_W: 36,   // 52 * 0.7
  SMALL_H: 55,   // 79 * 0.7
  MINI_W:  24,
  MINI_H:  37,
};

// 牌码 → 图片路径（条/筒/万）
function getTileImagePath(tileCode) {
  const suit  = Math.floor(tileCode / 10);   // 0=条 1=筒 2=万
  const value = tileCode % 10;
  const ch    = ['b', 't', 'w'][suit];
  return `assets/myCard/${ch}${value}.png`;
}

/**
 * 创建麻将牌精灵
 * - 普通牌：PIXI.Sprite（真实PNG）
 * - 红中：  PixiJS 矢量绘制
 */
function createProTile(tileCode, scale = 1) {
  const w = TILE.BIG_W * scale;
  const h = TILE.BIG_H * scale;

  const container = new PIXI.Container();
  container.eventMode = 'static';
  container.cursor    = 'pointer';

  if (tileCode === HONGZHONG) {
    _drawZhong(container, w, h);
  } else {
    const sprite = PIXI.Sprite.from(getTileImagePath(tileCode));
    sprite.width  = w;
    sprite.height = h;
    container.addChild(sprite);
  }

  container.tileCode  = tileCode;
  container.isZhong   = (tileCode === HONGZHONG);
  container.baseScale = scale;
  container._oriY     = 0;
  return container;
}

/**
 * 红中：红底金字，矢量绘制
 */
function _drawZhong(container, w, h) {
  const r = 5 * (w / TILE.BIG_W);

  // 底色（红）
  const bg = new PIXI.Graphics();
  bg.roundRect(0, 0, w, h, r);
  bg.fill({ color: 0xb71c1c });
  container.addChild(bg);

  // 内框（亮红）
  const inner = new PIXI.Graphics();
  inner.roundRect(2, 2, w - 4, h - 4, r - 1);
  inner.fill({ color: 0xe53935 });
  container.addChild(inner);

  // 高光
  const hl = new PIXI.Graphics();
  hl.roundRect(3, 3, w - 6, (h - 6) * 0.45, r - 2);
  hl.fill({ color: 0xffffff, alpha: 0.14 });
  container.addChild(hl);

  // 中字
  const fontSize = w * 0.62;
  const text = new PIXI.Text({
    text: '中',
    style: {
      fontFamily: 'STKaiti, KaiTi, serif',
      fontSize,
      fontWeight: 'bold',
      fill: 0xffd700,
      stroke: { color: 0x7f0000, width: fontSize * 0.05 },
    },
  });
  text.anchor.set(0.5);
  text.x = w / 2;
  text.y = h / 2;
  container.addChild(text);
}

/**
 * 牌背面：使用真实 bm.png（金色花纹）
 */
function createProTileBack(scale = 1) {
  const w = TILE.BIG_W * scale;
  const h = TILE.BIG_H * scale;

  const container = new PIXI.Container();
  const sprite = PIXI.Sprite.from('assets/cardBack/bm.png');
  sprite.width  = w;
  sprite.height = h;
  container.addChild(sprite);
  return container;
}
