// ===== 游戏场景（真实资源版）=====

class GameScene {
  constructor(app) {
    this.app = app;
    this.W = app.screen.width;
    this.H = app.screen.height;

    this.layers = {
      bg:        new PIXI.Container(),
      table:     new PIXI.Container(),
      tiles:     new PIXI.Container(),
      fg:        new PIXI.Container(),
      ui:        new PIXI.Container(),
      modal:     new PIXI.Container(),
      particles: new PIXI.Container(),
    };

    Object.values(this.layers).forEach((l, i) => { l.zIndex = i * 10; });
    for (const l of Object.values(this.layers)) app.stage.addChild(l);
    app.stage.sortableChildren = true;

    this._buildTable();
    this._buildUI();
  }

  // ===== 牌桌背景 =====
  _buildTable() {
    const w = this.W, h = this.H;

    // 真实桌面图片
    const bg = PIXI.Sprite.from('assets/ui/table.png');
    bg.width  = w;
    bg.height = h;
    this.layers.bg.addChild(bg);

    // 玩家座位标签
    this._seatLabels = {};
    const seats = [
      { id: 0, text: '你',   x: w / 2,     y: h - 16, avatar: 'assets/avatar/avatar.png'  },
      { id: 1, text: '下家', x: w - 28,    y: h / 2,  avatar: 'assets/avatar/avatar2.png' },
      { id: 2, text: '对家', x: w / 2,     y: 16,     avatar: 'assets/avatar/avatar3.png' },
      { id: 3, text: '上家', x: 28,        y: h / 2,  avatar: 'assets/avatar/avatar4.png' },
    ];

    for (const s of seats) {
      const label = new PIXI.Text({
        text: s.text,
        style: {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize:   13,
          fill:       0xd4e8d4,
          fontWeight: 'bold',
          dropShadow: { color: 0x000000, blur: 3, distance: 1, alpha: 0.6 },
        },
      });
      label.anchor.set(0.5);
      label.x = s.x;
      label.y = s.y;
      this.layers.ui.addChild(label);
      this._seatLabels[s.id] = label;
    }
  }

  // ===== 状态栏 =====
  _buildUI() {
    const pill = new PIXI.Graphics();
    pill.roundRect(0, 0, 320, 28, 14);
    pill.fill({ color: 0x000000, alpha: 0.45 });
    pill.x = this.W / 2 - 160;
    pill.y = this.H / 2 - 135;
    this.layers.ui.addChild(pill);
    this._statusPill = pill;

    this._statusText = new PIXI.Text({
      text: '',
      style: {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize:   13,
        fill:       0xf0f0f0,
      },
    });
    this._statusText.anchor.set(0.5);
    this._statusText.x = this.W / 2;
    this._statusText.y = this.H / 2 - 121;
    this.layers.ui.addChild(this._statusText);
  }

  // ===== 渲染手牌 =====
  renderHand(playerIdx, hand, isHuman, selectedIdx) {
    const key = `hand_${playerIdx}`;
    const old = this.layers.tiles.getChildByName(key);
    if (old) { this.layers.tiles.removeChild(old); old.destroy({ children: true }); }
    if (!hand || hand.length === 0) return;

    const n = Math.min(hand.length, 18);
    const container = new PIXI.Container();
    container.name = key;

    if (isHuman) {
      // 底部横排
      const gap   = TILE.BIG_W - 1;
      const totalW = gap * (n - 1) + TILE.BIG_W;
      const startX = (this.W - totalW) / 2;
      const y      = this.H - TILE.BIG_H - 10;

      for (let i = 0; i < n; i++) {
        const tile = createProTile(hand[i], 1);
        tile.x = startX + i * gap;
        tile.y = (i === selectedIdx) ? y - 12 : y;
        tile.tileIndex = i;
        tile.draggable = true;

        // 选中高亮：金框
        if (i === selectedIdx) {
          const glow = new PIXI.Graphics();
          glow.roundRect(-2, -2, TILE.BIG_W + 4, TILE.BIG_H + 4, 6);
          glow.stroke({ width: 3, color: 0xf1c40f, alpha: 1 });
          tile.addChildAt(glow, 0);
        }
        container.addChild(tile);
      }

    } else {
      // AI：牌背面
      const sc  = 0.72;
      const bw  = TILE.BIG_W * sc;
      const bh  = TILE.BIG_H * sc;
      const gap = bw - 1;
      const n2  = Math.min(hand.length, 14);

      if (playerIdx === 2) {
        // 对家：顶部横排
        const totalW = gap * (n2 - 1) + bw;
        const sx = (this.W - totalW) / 2;
        for (let i = 0; i < n2; i++) {
          const back = createProTileBack(sc);
          back.x = sx + i * gap;
          back.y = 28;
          container.addChild(back);
        }
      } else if (playerIdx === 1) {
        // 下家：右侧竖排
        const totalH = (bh - 1) * (n2 - 1) + bh;
        const sy = (this.H - totalH) / 2;
        for (let i = 0; i < n2; i++) {
          const back = createProTileBack(sc);
          back.x = this.W - bw - 12;
          back.y = sy + i * (bh - 1);
          container.addChild(back);
        }
      } else if (playerIdx === 3) {
        // 上家：左侧竖排
        const totalH = (bh - 1) * (n2 - 1) + bh;
        const sy = (this.H - totalH) / 2;
        for (let i = 0; i < n2; i++) {
          const back = createProTileBack(sc);
          back.x = 12;
          back.y = sy + i * (bh - 1);
          container.addChild(back);
        }
      }
    }

    this.layers.tiles.addChild(container);
  }

  // ===== 渲染碰/杠区 =====
  renderMelons(playerIdx, melons) {
    const key = `melons_${playerIdx}`;
    const old = this.layers.tiles.getChildByName(key);
    if (old) { this.layers.tiles.removeChild(old); old.destroy({ children: true }); }
    if (!melons || melons.length === 0) return;

    const sc  = 0.58;
    const tw  = TILE.BIG_W * sc;
    const container = new PIXI.Container();
    container.name = key;

    let x = 16, y;
    if      (playerIdx === 0) y = this.H - TILE.BIG_H - 10 - TILE.BIG_H * sc - 8;
    else if (playerIdx === 2) y = 28 + TILE.BIG_H * 0.72 + 8;
    else                      y = this.H / 2 - TILE.BIG_H * sc / 2;

    for (const m of melons) {
      for (const t of m.tiles) {
        const tile = createProTile(t, sc);
        tile.x = x;
        tile.y = y;
        tile.eventMode = 'none';
        container.addChild(tile);
        x += tw - 1;
      }
      x += 6;
    }
    this.layers.tiles.addChild(container);
  }

  // ===== 中心弃牌 =====
  _centerTile = null;

  renderCenterDiscard(tileCode) {
    if (this._centerTile) {
      this.layers.tiles.removeChild(this._centerTile);
      this._centerTile.destroy({ children: true });
      this._centerTile = null;
    }
    if (tileCode == null) return;

    const sc   = 1.5;
    const tile = createProTile(tileCode, sc);
    tile.x = this.W / 2 - TILE.BIG_W * sc / 2;
    tile.y = this.H / 2 - TILE.BIG_H * sc / 2;
    tile.eventMode = 'none';
    this.layers.tiles.addChild(tile);
    this._centerTile = tile;
  }

  // ===== 操作按钮（真实图片）=====
  _actionButtons = [];

  showActions(availableActions, callback) {
    this.hideActions();

    const BTN_DEFS = [
      { key: 'hu',   img: 'assets/operate/option_hu.png'   },
      { key: 'peng', img: 'assets/operate/option_peng.png' },
      { key: 'gang', img: 'assets/operate/option_gang.png' },
      { key: 'pass', img: 'assets/operate/option_guo.png'  },
    ];

    const BW = 90, BH = 75, GAP = 12;
    const active = BTN_DEFS.filter(b => b.key === 'pass' || availableActions.includes(b.key));
    const totalW = active.length * BW + (active.length - 1) * GAP;
    let sx = this.W / 2 - totalW / 2;
    const y  = this.H - TILE.BIG_H - BH - 18;

    for (const b of active) {
      const sprite = PIXI.Sprite.from(b.img);
      sprite.width  = BW;
      sprite.height = BH;
      sprite.x = sx;
      sprite.y = y;
      sprite.alpha      = 1;
      sprite.eventMode  = 'static';
      sprite.cursor     = 'pointer';

      sprite.on('pointerover',  () => { sprite.scale.set(1.08); sprite.x = sx - BW * 0.04; sprite.y = y - BH * 0.04; });
      sprite.on('pointerout',   () => { sprite.scale.set(1);    sprite.x = sx;             sprite.y = y;             });
      sprite.on('pointerdown',  () => {
        this.hideActions();
        if (callback) callback(b.key);
      });

      this.layers.ui.addChild(sprite);
      this._actionButtons.push(sprite);
      sx += BW + GAP;
    }
  }

  hideActions() {
    for (const btn of this._actionButtons) {
      this.layers.ui.removeChild(btn);
      btn.destroy({ children: true });
    }
    this._actionButtons = [];
  }

  // ===== 状态文字 =====
  setStatus(msg) {
    const full = `${msg}  |  余牌 ${gameState.wall.length}`;
    this._statusText.text = full;
    // 动态调整胶囊宽度
    const pw = this._statusText.width + 32;
    this._statusPill.clear();
    this._statusPill.roundRect(0, 0, pw, 28, 14);
    this._statusPill.fill({ color: 0x000000, alpha: 0.45 });
    this._statusPill.x = this.W / 2 - pw / 2;
  }

  // ===== 得分 =====
  _scoreTexts = {};

  renderScores() {
    for (let i = 0; i < 4; i++) {
      const key = `score_${i}`;
      if (this._scoreTexts[key]) {
        this.layers.ui.removeChild(this._scoreTexts[key]);
        this._scoreTexts[key].destroy();
      }
      const score = gameState.players[i].score;
      const t = new PIXI.Text({
        text: `${score > 0 ? '+' : ''}${score}`,
        style: {
          fontFamily: 'monospace',
          fontSize:   17,
          fontWeight: 'bold',
          fill:       score > 0 ? 0xf1c40f : score < 0 ? 0xff6b6b : 0xaabbaa,
          dropShadow: { color: 0x000000, blur: 2, distance: 1, alpha: 0.7 },
        },
      });
      const pos = [
        { x: this.W / 2 + 90, y: this.H - 22 },
        { x: this.W - 22,     y: this.H / 2 + 50 },
        { x: this.W / 2 + 90, y: 22 },
        { x: 70,              y: this.H / 2 + 50 },
      ][i];
      t.x = pos.x; t.y = pos.y;
      this.layers.ui.addChild(t);
      this._scoreTexts[key] = t;
    }
  }

  // ===== 弹窗 =====
  showModal(title, lines, buttonText, onButton) {
    this.hideModal();

    const mw = 360, mh = Math.max(280, 120 + lines.length * 30);
    const mx = this.W / 2 - mw / 2;
    const my = this.H / 2 - mh / 2;

    const modal = new PIXI.Container();
    modal.name = 'modal';

    // 遮罩
    const mask = new PIXI.Graphics();
    mask.rect(0, 0, this.W, this.H);
    mask.fill({ color: 0x000000, alpha: 0.6 });
    mask.eventMode = 'static';
    modal.addChild(mask);

    // 弹窗背景
    const bg = new PIXI.Graphics();
    bg.roundRect(mx, my, mw, mh, 20);
    bg.fill({ color: 0x1a3a1a });
    bg.stroke({ width: 2, color: 0x4caf50, alpha: 0.6 });
    modal.addChild(bg);

    // 顶部色条
    const bar = new PIXI.Graphics();
    bar.roundRect(mx + 16, my + 14, mw - 32, 4, 2);
    bar.fill({ color: 0xf1c40f });
    modal.addChild(bar);

    // 标题
    const titleT = new PIXI.Text({
      text: title,
      style: {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize:   24,
        fontWeight: 'bold',
        fill:       0xf1c40f,
        dropShadow: { color: 0x000000, blur: 4, distance: 2, alpha: 0.6 },
      },
    });
    titleT.anchor.set(0.5);
    titleT.x = this.W / 2;
    titleT.y = my + 46;
    modal.addChild(titleT);

    // 内容行
    let ly = my + 82;
    for (const line of lines) {
      const t = new PIXI.Text({
        text: line,
        style: {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize:   15,
          fill:       0xddeedd,
        },
      });
      t.anchor.set(0.5);
      t.x = this.W / 2;
      t.y = ly;
      modal.addChild(t);
      ly += 30;
    }

    // 按钮
    const btnY = my + mh - 56;
    const btnW = 120, btnH = 40;
    const btnBg = new PIXI.Graphics();
    btnBg.roundRect(this.W / 2 - btnW / 2, btnY, btnW, btnH, 12);
    btnBg.fill({ color: 0xf1c40f });

    const btnText = new PIXI.Text({
      text: buttonText,
      style: {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize:   16,
        fontWeight: 'bold',
        fill:       0x1a3a1a,
      },
    });
    btnText.anchor.set(0.5);
    btnText.x = this.W / 2;
    btnText.y = btnY + btnH / 2;

    modal.addChild(btnBg);
    modal.addChild(btnText);
    btnBg.eventMode = 'static';
    btnBg.cursor    = 'pointer';
    btnBg.on('pointerdown', () => { this.hideModal(); if (onButton) onButton(); });
    btnBg.on('pointerover',  () => { btnBg.scale.set(1.04); });
    btnBg.on('pointerout',   () => { btnBg.scale.set(1); });

    this.layers.modal.addChild(modal);
    modal.alpha = 0;
    Anim.tween(modal, { alpha: 1 }, 220);
  }

  hideModal() {
    const m = this.layers.modal.getChildByName('modal');
    if (m) { this.layers.modal.removeChild(m); m.destroy({ children: true }); }
  }

  // ===== 当前玩家高亮 =====
  highlightPlayer(playerIdx) {
    for (let i = 0; i < 4; i++) {
      const label = this._seatLabels[i];
      if (!label) continue;
      label.style.fill       = (i === playerIdx) ? 0xf1c40f : 0xd4e8d4;
      label.style.fontWeight = (i === playerIdx) ? 'bold'   : 'normal';
    }
  }

  // ===== 清理牌面 =====
  cleanTiles() {
    const keys = ['hand_0','hand_1','hand_2','hand_3',
                  'melons_0','melons_1','melons_2','melons_3'];
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
