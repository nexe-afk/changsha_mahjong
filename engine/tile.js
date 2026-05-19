// ===== 🎨 专业级麻将牌渲染 =====

const TILE_STYLE = {
  W: 44,
  H: 60,
  R: 5,           // 圆角
  FONT_SIZE: 16,
  FONT_SMALL: 9,
  GAP: -1,        // 牌间距（负=重叠）
  SHADOW_OFFSET: 2,
  SHADOW_COLOR: 0x1a1a1a,
  SHADOW_ALPHA: 0.25,
};

/**
 * 创建专业级麻将牌
 * - 3D 浮雕效果（三层叠加）
 * - 阴影 + 光晕
 * - 精美字体
 */
function createProTile(tileCode, scale = 1) {
  const w = TILE_STYLE.W * scale;
  const h = TILE_STYLE.H * scale;
  const r = TILE_STYLE.R * scale;
  const fs = TILE_STYLE.FONT_SIZE * scale;
  const fsm = TILE_STYLE.FONT_SMALL * scale;

  const container = new PIXI.Container();
  container.eventMode = 'static';
  container.cursor = 'pointer';

  const info = decodeTile(tileCode);
  const isZhong = tileCode === HONGZHONG;

  // ===== 1. 阴影层 =====
  const shadow = new PIXI.Graphics();
  shadow.roundRect(TILE_STYLE.SHADOW_OFFSET * scale, TILE_STYLE.SHADOW_OFFSET * scale, w, h, r);
  shadow.fill({ color: TILE_STYLE.SHADOW_COLOR, alpha: TILE_STYLE.SHADOW_ALPHA });
  container.addChild(shadow);

  if (isZhong) {
    // ===== 红中：华丽红色 =====
    const bg = new PIXI.Graphics();
    // 外框
    bg.roundRect(0, 0, w, h, r);
    bg.fill({ color: 0xc0392b });
    container.addChild(bg);

    // 内框（稍亮）
    const inner = new PIXI.Graphics();
    inner.roundRect(2 * scale, 2 * scale, w - 4 * scale, h - 4 * scale, r - 1 * scale);
    inner.fill({ color: 0xe74c3c });
    container.addChild(inner);

    // 高光（上半部分渐变）
    const highlight = new PIXI.Graphics();
    highlight.roundRect(3 * scale, 3 * scale, w - 6 * scale, h / 2 - 3 * scale, r - 2 * scale);
    highlight.fill({ color: 0xffffff, alpha: 0.12 });
    container.addChild(highlight);

    // 中字
    const text = new PIXI.Text({
      text: '中',
      style: {
        fontFamily: 'STKaiti, KaiTi, serif',
        fontSize: fs * 1.5,
        fontWeight: 'bold',
        fill: 0xffd700,
        stroke: { color: 0x8b0000, width: 1 },
      }
    });
    text.anchor.set(0.5);
    text.x = w / 2;
    text.y = h / 2 - 2 * scale;
    container.addChild(text);

  } else {
    // ===== 普通牌：象牙白浮雕 =====
    const color = getSuitColor(info.suit);

    // 外框深色边
    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, w, h, r);
    bg.fill({ color: 0xc4a86a });
    container.addChild(bg);

    // 主体象牙白
    const body = new PIXI.Graphics();
    body.roundRect(1.5 * scale, 1.5 * scale, w - 3 * scale, h - 3 * scale, r - 0.5 * scale);
    body.fill({ color: 0xfaf6ee });
    container.addChild(body);

    // 高光（左上）
    const hlight = new PIXI.Graphics();
    hlight.roundRect(2.5 * scale, 2.5 * scale, w - 5 * scale, (h - 5 * scale) * 0.5, r - 1 * scale);
    hlight.fill({ color: 0xffffff, alpha: 0.35 });
    container.addChild(hlight);

    // 数字
    const val = getValue(tileCode);
    const text = new PIXI.Text({
      text: `${val}`,
      style: {
        fontFamily: 'STKaiti, KaiTi, serif',
        fontSize: fs * 1.2,
        fontWeight: 'bold',
        fill: color,
      }
    });
    text.anchor.set(0.5);
    text.x = w / 2;
    text.y = h / 2 - 4 * scale;
    container.addChild(text);

    // 花色符号
    const symbol = new PIXI.Text({
      text: SUIT_SYMBOLS[info.suit] || '',
      style: {
        fontFamily: 'sans-serif',
        fontSize: fsm * 1.3,
        fill: color,
      }
    });
    symbol.anchor.set(0.5);
    symbol.x = w / 2;
    symbol.y = h - 6 * scale;
    container.addChild(symbol);
  }

  // 存储元数据
  container.tileCode = tileCode;
  container.isZhong = isZhong;
  container.baseScale = scale;
  container._oriY = 0;

  return container;
}

/**
 * 花色颜色
 */
function getSuitColor(suit) {
  const colors = {
    0: 0x27ae60,  // 条 = 绿色
    1: 0x2980b9,  // 筒 = 蓝色
    2: 0xc0392b,  // 万 = 红色
  };
  return colors[suit] || 0x2c3e50;
}

/**
 * 创建牌背面（专业版）
 */
function createProTileBack(scale = 1) {
  const w = TILE_STYLE.W * scale;
  const h = TILE_STYLE.H * scale;
  const r = TILE_STYLE.R * scale;

  const container = new PIXI.Container();

  // 阴影
  const shadow = new PIXI.Graphics();
  shadow.roundRect(1.5 * scale, 1.5 * scale, w, h, r);
  shadow.fill({ color: TILE_STYLE.SHADOW_COLOR, alpha: TILE_STYLE.SHADOW_ALPHA / 2 });
  container.addChild(shadow);

  // 背面底色
  const bg = new PIXI.Graphics();
  bg.roundRect(0, 0, w, h, r);
  bg.fill({ color: 0x1a4a2a });
  bg.stroke({ width: 1.5 * scale, color: 0x0d2b0d });
  container.addChild(bg);

  // 花纹（菱形网格）
  const pattern = new PIXI.Graphics();
  const cx = w / 2, cy = h / 2;
  // 菱形
  pattern.moveTo(cx, cy - 8 * scale);
  pattern.lineTo(cx + 6 * scale, cy);
  pattern.lineTo(cx, cy + 8 * scale);
  pattern.lineTo(cx - 6 * scale, cy);
  pattern.closePath();
  pattern.fill({ color: 0x0f3320 });

  // 四个小点
  const dotPositions = [
    [cx - 10 * scale, cy - 10 * scale],
    [cx + 10 * scale, cy - 10 * scale],
    [cx - 10 * scale, cy + 10 * scale],
    [cx + 10 * scale, cy + 10 * scale],
  ];
  for (const [dx, dy] of dotPositions) {
    pattern.circle(dx, dy, 2 * scale);
    pattern.fill({ color: 0x0f3320 });
  }

  container.addChild(pattern);
  return container;
}

// 常用牌尺寸常量
const TILE = {
  BIG_W: 44,
  BIG_H: 60,
  SMALL_W: 28,
  SMALL_H: 38,
  MINI_W: 20,
  MINI_H: 28,
};
