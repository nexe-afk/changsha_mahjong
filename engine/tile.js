// ===== PixiJS 麻将块渲染 =====

/**
 * 创建一张麻将牌的 Graphics 对象
 * @param {number} tileCode - 牌编码
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @param {number} fontSize - 字体大小
 * @returns {PIXI.Container}
 */
function createTileGraphic(tileCode, w = 38, h = 52, fontSize = 14) {
  const container = new PIXI.Container();
  container.eventMode = 'static';
  container.cursor = 'pointer';

  const info = decodeTile(tileCode);
  const isZhong = tileCode === HONGZHONG;
  const r = 4; // 圆角

  // 牌面底色
  const bg = new PIXI.Graphics();
  if (isZhong) {
    bg.roundRect(0, 0, w, h, r);
    bg.fill({ color: 0xe74c3c });
    bg.stroke({ width: 1.5, color: 0xc0392b });
  } else {
    bg.roundRect(0, 0, w, h, r);
    bg.fill({ color: 0xf8f4e8 });
    bg.stroke({ width: 1.5, color: 0xc4a86a });
  }
  container.addChild(bg);

  // 内框（浅色）
  if (!isZhong) {
    const inner = new PIXI.Graphics();
    inner.roundRect(3, 3, w - 6, h - 6, r - 1);
    inner.fill({ color: 0xfcfcfc });
    container.addChild(inner);
  }

  // 文字
  const text = new PIXI.Text({
    text: info.name,
    style: {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: fontSize,
      fontWeight: 'bold',
      fill: isZhong ? 0xffffff : 0x2c3e50,
      align: 'center',
    }
  });
  text.anchor.set(0.5);
  text.x = w / 2;
  text.y = h / 2;
  container.addChild(text);

  // 花色小图标（非红中）
  if (!isZhong) {
    const symbol = new PIXI.Text({
      text: SUIT_SYMBOLS[info.suit] || '',
      style: {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: 8,
        fill: 0x666666,
      }
    });
    symbol.anchor.set(0.5);
    symbol.x = w / 2;
    symbol.y = h - 6;
    container.addChild(symbol);
  }

  // 数据
  container.tileCode = tileCode;
  container.isZhong = isZhong;
  container.tileW = w;
  container.tileH = h;

  // 交互反馈
  container.on('pointerover', () => {
    if (!container.draggable) return;
    container.scale.set(1.05);
  });
  container.on('pointerout', () => {
    container.scale.set(1);
  });

  return container;
}

/**
 * 创建牌背面
 */
function createTileBack(w = 38, h = 52) {
  const g = new PIXI.Graphics();
  g.roundRect(0, 0, w, h, 4);
  g.fill({ color: 0x2c5f2d });
  g.stroke({ width: 1.5, color: 0x0d2b0d });

  // 背面纹理花纹
  const pattern = new PIXI.Graphics();
  pattern.rect(w / 2 - 6, h / 2 - 6, 12, 12);
  pattern.fill({ color: 0x1a3a1a });
  g.addChild(pattern);

  g.eventMode = 'none';
  return g;
}

/**
 * 创建碰/杠组的显示块
 */
function createMelonRow(melons) {
  const container = new PIXI.Container();
  let x = 0;
  for (const m of melons) {
    for (const t of m.tiles) {
      const tile = createTileGraphic(t, 22, 30, 10);
      tile.x = x;
      tile.y = 0;
      tile.eventMode = 'none';
      tile.cursor = 'default';
      container.addChild(tile);
      x += 18;
    }
    x += 6; // 组间距
  }
  return container;
}

/**
 * 创建弃牌显示
 */
function createDiscardRow(tiles, maxShow = 10) {
  const container = new PIXI.Container();
  const recent = tiles.slice(-maxShow);
  let x = 0;
  for (const t of recent) {
    const tile = createTileGraphic(t, 20, 28, 9);
    tile.x = x;
    tile.y = 0;
    tile.eventMode = 'none';
    tile.cursor = 'default';
    container.addChild(tile);
    x += 14;
  }
  return container;
}
