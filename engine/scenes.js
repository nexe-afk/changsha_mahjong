// ===== 🏟️ 专业游戏场景 =====

class GameScene {
  constructor(app) {
    this.app = app;
    this.W = app.screen.width;
    this.H = app.screen.height;

    // 渲染层级（Z-order）
    this.layers = {
      bg: new PIXI.Container(),
      table: new PIXI.Container(),
      tiles: new PIXI.Container(),
      fg: new PIXI.Container(),
      ui: new PIXI.Container(),
      modal: new PIXI.Container(),
      particles: new PIXI.Container(),
    };

    // 排序
    Object.values(this.layers).forEach((l, i) => l.zIndex = i * 10);
    for (const l of Object.values(this.layers)) {
      app.stage.addChild(l);
    }
    app.stage.sortableChildren = true;

    this._buildTable();
    this._buildUI();
  }

  // ===== 牌桌 =====
  _buildTable() {
    const w = this.W, h = this.H;

    // 桌面毛毡纹理（纯代码模拟）
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, w, h);
    bg.fill({ color: 0x1a472a });
    this.layers.bg.addChild(bg);

    // 桌布纹理线
    for (let i = 0; i < 60; i++) {
      const line = new PIXI.Graphics();
      line.moveTo(Math.random() * w, Math.random() * h);
      line.lineTo(Math.random() * w, Math.random() * h);
      line.stroke({ width: 0.5, color: 0x1f5433, alpha: 0.2 });
      this.layers.bg.addChild(line);
    }

    // 中心圆盘
    const center = new PIXI.Graphics();
    center.roundRect(w / 2 - 200, h / 2 - 110, 400, 220, 30);
    center.fill({ color: 0x0f3320, alpha: 0.6 });
    center.stroke({ width: 1, color: 0x2d5a3d, alpha: 0.3 });
    this.layers.bg.addChild(center);

    // 内圈装饰
    const ring = new PIXI.Graphics();
    ring.roundRect(w / 2 - 160, h / 2 - 75, 320, 150, 20);
    ring.stroke({ width: 0.5, color: 0xf1c40f, alpha: 0.08 });
    this.layers.bg.addChild(ring);

    // 中央 LOGO
    const logo = new PIXI.Text({
      text: '🀄',
      style: { fontSize: 32, fill: 0x2d5a3d, alpha: 0.3 }
    });
    logo.anchor.set(0.5);
    logo.x = w / 2;
    logo.y = h / 2;
    this.layers.bg.addChild(logo);

    // 座位标签
    this._seatLabels = {};
    const seats = [
      { id: 0, text: '🧑 你', x: w / 2, y: h - 8 },
      { id: 1, text: '🤖 下家', x: w - 8, y: h / 2 },
      { id: 2, text: '🤖 对家', x: w / 2, y: 8 },
      { id: 3, text: '🤖 上家', x: 8, y: h / 2 },
    ];

    for (const s of seats) {
      const label = new PIXI.Text({
        text: s.text,
        style: {
          fontFamily: 'PingFang SC, sans-serif',
          fontSize: 12,
          fill: 0x7f8c8d,
          letterSpacing: 1,
        }
      });
      label.anchor.set(0.5);
      label.x = s.x;
      label.y = s.y;
      this.layers.bg.addChild(label);
      this._seatLabels[s.id] = label;
    }
  }

  // ===== UI =====
  _buildUI() {
    // 状态文字
    this._statusText = new PIXI.Text({
      text: '',
      style: {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: 13,
        fill: 0xbdc3c7,
        letterSpacing: 1,
      }
    });
    this._statusText.anchor.set(0.5);
    this._statusText.x = this.W / 2;
    this._statusText.y = this.H / 2 - 90;
    this.layers.ui.addChild(this._statusText);

    // 计时条
    this._timerBar = new PIXI.Graphics();
    this._timerBar.x = this.W / 2 - 80;
    this._timerBar.y = this.H / 2 - 70;
    this.layers.ui.addChild(this._timerBar);
  }

  // ===== 渲染手牌 =====
  renderHand(playerIdx, hand, isHuman, selectedIdx) {
    const key = `hand_${playerIdx}`;
    const old = this.layers.tiles.getChildByName(key);
    if (old) { this.layers.tiles.removeChild(old); old.destroy({ children: true }); }

    if (!hand || hand.length === 0) return;
    const n = Math.min(hand.length, 18);

    if (isHuman) {
      // ===== 玩家：底部横排，专业展示 =====
      const totalW = (TILE.BIG_W - 1) * n;
      const startX = (this.W - totalW) / 2 + TILE.BIG_W / 2;
      const y = this.H - 80;

      const container = new PIXI.Container();
      container.name = key;

      for (let i = 0; i < n; i++) {
        const tile = createProTile(hand[i], 1);
        tile.x = startX + i * (TILE.BIG_W - 1);
        tile.y = y;
        tile.tileIndex = i;
        tile.draggable = true;
        container.addChild(tile);
      }
      this.layers.tiles.addChild(container);
      this._playerHandContainer = container;

    } else {
      // ===== AI 玩家：牌背面 =====
      const backScale = 0.65;
      const bw = TILE.BIG_W * backScale - 1;
      const bh = TILE.BIG_H * backScale;
      const n2 = Math.min(hand.length, 14);
      const container = new PIXI.Container();
      container.name = key;

      let startX, startY;
      if (playerIdx === 2) {
        // 对家 - 顶部
        const totalW = bw * n2;
        startX = (this.W - totalW) / 2 + bw / 2;
        startY = 30;
        for (let i = 0; i < n2; i++) {
          const back = createProTileBack(backScale);
          back.x = startX + i * bw;
          back.y = startY;
          container.addChild(back);
        }
      } else if (playerIdx === 1) {
        // 下家 - 右侧竖排
        const totalH = bh * n2;
        startX = this.W - 35;
        startY = (this.H - totalH) / 2 + bh / 2;
        for (let i = 0; i < n2; i++) {
          const back = createProTileBack(backScale);
          back.x = startX;
          back.y = startY + i * (bh - 1);
          container.addChild(back);
        }
      } else if (playerIdx === 3) {
        // 上家 - 左侧竖排
        const totalH = bh * n2;
        startX = 35;
        startY = (this.H - totalH) / 2 + bh / 2;
        for (let i = 0; i < n2; i++) {
          const back = createProTileBack(backScale);
          back.x = startX;
          back.y = startY + i * (bh - 1);
          container.addChild(back);
        }
      }
      this.layers.tiles.addChild(container);
    }
  }

  // ===== 渲染碰/杠区 =====
  renderMelons(playerIdx, melons) {
    const key = `melons_${playerIdx}`;
    const old = this.layers.tiles.getChildByName(key);
    if (old) { this.layers.tiles.removeChild(old); old.destroy({ children: true }); }

    if (!melons || melons.length === 0) return;

    const container = new PIXI.Container();
    container.name = key;
    let x = 15, y;

    if (playerIdx === 0) y = this.H - 155;
    else if (playerIdx === 2) y = 75;
    else if (playerIdx === 1) y = this.H / 2 + 60;
    else y = this.H / 2 + 60;

    for (const m of melons) {
      for (const t of m.tiles) {
        const tile = createProTile(t, 0.55);
        tile.x = x;
        tile.y = y;
        tile.eventMode = 'none';
        tile.cursor = 'default';
        container.addChild(tile);
        x += TILE.SMALL_W - 2;
      }
      x += 6;
    }
    this.layers.tiles.addChild(container);
  }

  // ===== 最后打出的牌（中心大牌） =====
  _centerTile = null;

  renderCenterDiscard(tileCode) {
    if (this._centerTile) {
      this.layers.tiles.removeChild(this._centerTile);
      this._centerTile.destroy({ children: true });
      this._centerTile = null;
    }
    if (tileCode === null || tileCode === undefined) return;

    const tile = createProTile(tileCode, 1.4);
    tile.x = this.W / 2 - TILE.BIG_W * 1.4 / 2;
    tile.y = this.H / 2 - TILE.BIG_H * 1.4 / 2;
    tile.eventMode = 'none';
    tile.cursor = 'default';
    this.layers.tiles.addChild(tile);
    this._centerTile = tile;
  }

  // ===== 操作按钮 =====
  _actionButtons = [];
  _onActionCallback = null;

  showActions(availableActions, callback) {
    this.hideActions();
    this._onActionCallback = callback;

    const buttons = [
      { key: 'hu', label: '胡', color: 0xe74c3c, active: availableActions.includes('hu') },
      { key: 'peng', label: '碰', color: 0x3498db, active: availableActions.includes('peng') },
      { key: 'gang', label: '杠', color: 0x9b59b6, active: availableActions.includes('gang') },
      { key: 'pass', label: '过', color: 0x7f8c8d, active: true },
    ];

    const btnW = 64, btnH = 38, gap = 10;
    const totalW = buttons.length * btnW + (buttons.length - 1) * gap;
    const startX = this.W / 2 - totalW / 2;
    const y = this.H / 2 + 70;

    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      const x = startX + i * (btnW + gap);

      const bg = new PIXI.Graphics();
      bg.roundRect(0, 0, btnW, btnH, 10);
      bg.fill({ color: b.active ? b.color : 0x555555, alpha: b.active ? 1 : 0.4 });

      // 按钮高光
      const hl = new PIXI.Graphics();
      hl.roundRect(2, 2, btnW - 4, btnH / 2 - 2, 8);
      hl.fill({ color: 0xffffff, alpha: 0.15 });

      const text = new PIXI.Text({
        text: b.label,
        style: { fontFamily: 'PingFang SC, sans-serif', fontSize: 15, fill: 0xffffff, fontWeight: 'bold' }
      });
      text.anchor.set(0.5);
      text.x = btnW / 2;
      text.y = btnH / 2;

      const container = new PIXI.Container();
      container.addChild(bg);
      container.addChild(hl);
      container.addChild(text);
      container.x = x;
      container.y = y;
      container.eventMode = b.active ? 'static' : 'none';
      container.cursor = b.active ? 'pointer' : 'default';
      container.alpha = b.active ? 1 : 0.3;

      if (b.active) {
        container.on('pointerdown', () => {
          this.hideActions();
          if (callback) callback(b.key);
        });
        container.on('pointerover', () => {
          bg.scale.set(0.95);
          bg.x = 2; bg.y = 2;
        });
        container.on('pointerout', () => {
          bg.scale.set(1);
          bg.x = 0; bg.y = 0;
        });
      }

      this.layers.ui.addChild(container);
      this._actionButtons.push(container);
    }
  }

  hideActions() {
    for (const btn of this._actionButtons) {
      this.layers.ui.removeChild(btn);
      btn.destroy({ children: true });
    }
    this._actionButtons = [];
  }

  // ===== 设置状态文字 =====
  setStatus(msg) {
    this._statusText.text = msg + `  |  余牌 ${gameState.wall.length}`;
  }

  // ===== 得分显示 =====
  _scoreTexts = {};

  renderScores() {
    for (let i = 0; i < 4; i++) {
      const key = `score_${i}`;
      if (this._scoreTexts[key]) {
        this.layers.ui.removeChild(this._scoreTexts[key]);
        this._scoreTexts[key].destroy();
      }

      const score = gameState.players[i].score;
      const text = new PIXI.Text({
        text: `${score}`,
        style: {
          fontFamily: 'monospace',
          fontSize: 18,
          fontWeight: 'bold',
          fill: score > 0 ? 0xf1c40f : 0x7f8c8d,
        }
      });

      let x, y;
      switch (i) {
        case 0: x = this.W / 2 + 80; y = this.H - 30; break;
        case 1: x = this.W - 30; y = this.H / 2 + 40; break;
        case 2: x = this.W / 2 + 80; y = 30; break;
        case 3: x = 80; y = this.H / 2 + 40; break;
      }
      text.x = x;
      text.y = y;
      this.layers.ui.addChild(text);
      this._scoreTexts[key] = text;
    }
  }

  // ===== 弹窗系统 =====
  showModal(title, lines, buttonText, onButton) {
    this.hideModal();

    const mw = 340, mh = 280;
    const x = this.W / 2 - mw / 2, y = this.H / 2 - mh / 2;

    const modal = new PIXI.Container();
    modal.name = 'modal';

    // 遮罩
    const mask = new PIXI.Graphics();
    mask.rect(0, 0, this.W, this.H);
    mask.fill({ color: 0x000000, alpha: 0.55 });
    mask.eventMode = 'static';
    modal.addChild(mask);

    // 弹窗背景
    const bg = new PIXI.Graphics();
    bg.roundRect(x, y, mw, mh, 20);
    bg.fill({ color: 0xffffff });
    bg.shadow = { color: 0x000000, blur: 20, offsetX: 0, offsetY: 5, alpha: 0.3 };
    modal.addChild(bg);

    // 装饰顶部色条
    const bar = new PIXI.Graphics();
    bar.roundRect(x + 20, y + 20, mw - 40, 4, 2);
    bar.fill({ color: 0xe74c3c });
    modal.addChild(bar);

    // 标题
    const titleText = new PIXI.Text({
      text: title,
      style: { fontFamily: 'PingFang SC, sans-serif', fontSize: 22, fill: 0x2c3e50, fontWeight: 'bold' }
    });
    titleText.anchor.set(0.5);
    titleText.x = this.W / 2;
    titleText.y = y + 50;
    modal.addChild(titleText);

    // 内容
    let ly = y + 85;
    for (const line of lines) {
      const t = new PIXI.Text({
        text: line,
        style: { fontFamily: 'PingFang SC, sans-serif', fontSize: 14, fill: 0x555555 }
      });
      t.anchor.set(0.5);
      t.x = this.W / 2;
      t.y = ly;
      modal.addChild(t);
      ly += 28;
    }

    // 按钮
    const btnW = 100, btnH = 38;
    const btnBg = new PIXI.Graphics();
    btnBg.roundRect(this.W / 2 - btnW / 2, y + mh - 65, btnW, btnH, 10);
    btnBg.fill({ color: 0xe74c3c });

    const btnHl = new PIXI.Graphics();
    btnHl.roundRect(this.W / 2 - btnW / 2 + 2, y + mh - 63, btnW - 4, btnH / 2 - 2, 8);
    btnHl.fill({ color: 0xffffff, alpha: 0.15 });

    const btnText = new PIXI.Text({
      text: buttonText,
      style: { fontFamily: 'PingFang SC, sans-serif', fontSize: 15, fill: 0xffffff, fontWeight: 'bold' }
    });
    btnText.anchor.set(0.5);
    btnText.x = this.W / 2;
    btnText.y = y + mh - 46;

    modal.addChild(btnBg);
    modal.addChild(btnHl);
    modal.addChild(btnText);

    btnBg.eventMode = 'static';
    btnBg.cursor = 'pointer';
    btnBg.on('pointerdown', () => {
      this.hideModal();
      if (onButton) onButton();
    });

    this.layers.modal.addChild(modal);

    // 淡入动画
    modal.alpha = 0;
    Anim.tween(modal, { alpha: 1 }, 200);
  }

  hideModal() {
    const modal = this.layers.modal.getChildByName('modal');
    if (modal) {
      this.layers.modal.removeChild(modal);
      modal.destroy({ children: true });
    }
  }

  // ===== 当前玩家高亮指示 =====
  highlightPlayer(playerIdx) {
    for (let i = 0; i < 4; i++) {
      const label = this._seatLabels[i];
      if (!label) continue;
      if (i === playerIdx) {
        label.style.fill = 0xf1c40f;
        label.style.fontWeight = 'bold';
      } else {
        label.style.fill = 0x7f8c8d;
        label.style.fontWeight = 'normal';
      }
    }
  }

  // ===== 清理 =====
  cleanTiles() {
    const keys = ['hand_0', 'hand_1', 'hand_2', 'hand_3',
                  'melons_0', 'melons_1', 'melons_2', 'melons_3'];
    for (const k of keys) {
      const c = this.layers.tiles.getChildByName(k);
      if (c) { this.layers.tiles.removeChild(c); c.destroy({ children: true }); }
    }
    if (this._centerTile) {
      this.layers.tiles.removeChild(this._centerTile);
      this._centerTile.destroy({ children: true });
      this._centerTile = null;
    }
  }
}
