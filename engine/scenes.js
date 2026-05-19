// ===== PixiJS 场景布局 =====

/**
 * 游戏场景 - 管理所有游戏元素的位置和渲染
 */
class GameScene {
  constructor(app) {
    this.app = app;
    this.stage = app.stage;

    // 层
    this.tableLayer = new PIXI.Container();
    this.tileLayer = new PIXI.Container();
    this.uiLayer = new PIXI.Container();
    this.animLayer = new PIXI.Container();
    this.modalLayer = new PIXI.Container();

    this.stage.addChild(this.tableLayer);
    this.stage.addChild(this.tileLayer);
    this.stage.addChild(this.uiLayer);
    this.stage.addChild(this.animLayer);
    this.stage.addChild(this.modalLayer);

    // 尺寸常量
    this.W = app.screen.width;
    this.H = app.screen.height;
    this.TILE_W = 38;
    this.TILE_H = 52;
    this.BACK_W = 30;
    this.BACK_H = 42;

    // 区域位置
    this.layers = {
      player0: this.tileLayer,  // 底部 - 你
      player1: this.tileLayer,  // 右侧 - 下家
      player2: this.tileLayer,  // 顶部 - 对家
      player3: this.tileLayer,  // 左侧 - 上家
    };

    this.drawTable();
  }

  drawTable() {
    // 桌面背景
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, this.W, this.H);
    bg.fill({ color: 0x1a472a });
    this.tableLayer.addChild(bg);

    // 中心区域 - 暗色圆角矩形
    const center = new PIXI.Graphics();
    center.roundRect(this.W / 2 - 180, this.H / 2 - 100, 360, 200, 20);
    center.fill({ color: 0x0f3320, alpha: 0.5 });
    this.tableLayer.addChild(center);

    // 座位标签
    this.drawSeatLabel('🧑 你', this.W / 2, this.H - 20);
    this.drawSeatLabel('🤖 下家', this.W - 20, this.H / 2);
    this.drawSeatLabel('🤖 对家', this.W / 2, 20);
    this.drawSeatLabel('🤖 上家', 20, this.H / 2);
  }

  drawSeatLabel(text, x, y) {
    const label = new PIXI.Text({
      text,
      style: {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: 13,
        fill: 0xecf0f1,
        fontWeight: 'bold',
      }
    });
    label.anchor.set(0.5);
    label.x = x;
    label.y = y;
    this.tableLayer.addChild(label);
  }

  // ===== 玩家手牌渲染 =====

  renderPlayerHand(playerIdx, hand, isHuman, selectedIdx = -1) {
    const container = new PIXI.Container();
    container.name = `hand-p${playerIdx}`;

    // 清除旧的手牌
    const old = this.tileLayer.getChildByName(`hand-p${playerIdx}`);
    if (old) { this.tileLayer.removeChild(old); old.destroy({ children: true }); }

    if (hand.length === 0) return;

    if (isHuman) {
      // 底部：横排，牌面朝上
      const maxShow = Math.min(hand.length, 18);
      const totalW = (this.TILE_W - 2) * maxShow;
      const startX = (this.W - totalW) / 2 + this.TILE_W / 2;
      const y = this.H - 80;

      for (let i = 0; i < maxShow; i++) {
        const tile = hand[i];
        const g = createTileGraphic(tile, this.TILE_W, this.TILE_H, 14);
        g.x = startX + i * (this.TILE_W - 2);
        g.y = y;
        g.tileIndex = i;
        g.draggable = true;

        // 选中效果
        if (i === selectedIdx) {
          g.y -= 12;
          const glow = new PIXI.Graphics();
          glow.roundRect(-2, -2, this.TILE_W + 4, this.TILE_H + 4, 6);
          glow.fill({ color: 0xf1c40f, alpha: 0.3 });
          g.addChildAt(glow, 0);
        }

        container.addChild(g);
      }
    } else {
      // AI：顶部/侧边，牌背面
      const maxShow = Math.min(hand.length, 16);
      let startX, startY;

      if (playerIdx === 2) {
        // 对家 - 顶部横排
        const totalW = (this.BACK_W - 2) * maxShow;
        startX = (this.W - totalW) / 2 + this.BACK_W / 2;
        startY = 40;
        for (let i = 0; i < maxShow; i++) {
          const g = createTileBack(this.BACK_W, this.BACK_H);
          g.x = startX + i * (this.BACK_W - 2);
          g.y = startY;
          container.addChild(g);
        }
      } else if (playerIdx === 1) {
        // 下家 - 右侧竖排
        const totalH = (this.BACK_H - 2) * maxShow;
        startX = this.W - 40;
        startY = (this.H - totalH) / 2 + this.BACK_H / 2;
        for (let i = 0; i < maxShow; i++) {
          const g = createTileBack(this.BACK_W, this.BACK_H);
          g.x = startX;
          g.y = startY + i * (this.BACK_H - 2);
          container.addChild(g);
        }
      } else if (playerIdx === 3) {
        // 上家 - 左侧竖排
        const totalH = (this.BACK_H - 2) * maxShow;
        startX = 40;
        startY = (this.H - totalH) / 2 + this.BACK_H / 2;
        for (let i = 0; i < maxShow; i++) {
          const g = createTileBack(this.BACK_W, this.BACK_H);
          g.x = startX;
          g.y = startY + i * (this.BACK_H - 2);
          container.addChild(g);
        }
      }
    }

    this.tileLayer.addChild(container);
  }

  // ===== 碰/杠区 =====

  renderMelons(playerIdx, melons) {
    const container = new PIXI.Container();
    container.name = `melons-p${playerIdx}`;

    const old = this.tileLayer.getChildByName(`melons-p${playerIdx}`);
    if (old) { this.tileLayer.removeChild(old); old.destroy({ children: true }); }

    if (melons.length === 0) return;

    let x = 0, y = 0;
    if (playerIdx === 0) {
      x = 20;
      y = this.H - 150;
    } else if (playerIdx === 2) {
      x = 20;
      y = 60;
    } else if (playerIdx === 1) {
      x = this.W - 85;
      y = this.H / 2 + 20;
    } else {
      x = 80;
      y = this.H / 2 + 20;
    }

    const row = createMelonRow(melons);
    row.x = x;
    row.y = y;
    container.addChild(row);
    this.tileLayer.addChild(container);
  }

  // ===== 弃牌区 =====

  renderDiscards(playerIdx, discards) {
    // 只渲染最近的一些，位置在对应玩家附近
  }

  // ===== 中心出牌区 =====

  centerDiscard = null;

  renderCenterDiscard(tile) {
    if (this.centerDiscard) {
      this.tileLayer.removeChild(this.centerDiscard);
      this.centerDiscard.destroy({ children: true });
      this.centerDiscard = null;
    }
    if (tile === null) return;

    const g = createTileGraphic(tile, 48, 64, 18);
    g.x = this.W / 2;
    g.y = this.H / 2;
    g.anchor = { set: () => { g.x = this.W / 2; g.y = this.H / 2; } };
    g.eventMode = 'none';
    this.centerDiscard = g;
    this.tileLayer.addChild(g);
  }

  // ===== 操作按钮 =====

  actionButtons = [];

  showActionButtons(actions, onAction) {
    this.hideActionButtons();

    const buttons = [
      { key: 'hu', label: '胡 🀄', color: 0xe74c3c, enabled: actions.includes('hu') },
      { key: 'peng', label: '碰 ✋', color: 0x3498db, enabled: actions.includes('peng') },
      { key: 'gang', label: '杠 📢', color: 0x9b59b6, enabled: actions.includes('gang') },
      { key: 'pass', label: '过 👋', color: 0x2ecc71, enabled: true },
    ];

    const startX = this.W / 2 - (buttons.length * 70) / 2;
    const y = this.H / 2 + 60;

    buttons.forEach((btn, i) => {
      const bg = new PIXI.Graphics();
      const w = 60, h = 36;
      bg.roundRect(0, 0, w, h, 8);
      bg.fill({ color: btn.enabled ? btn.color : 0x555555 });

      const text = new PIXI.Text({
        text: btn.label,
        style: { fontFamily: 'PingFang SC, sans-serif', fontSize: 13, fill: 0xffffff, fontWeight: 'bold' }
      });
      text.anchor.set(0.5);
      text.x = w / 2;
      text.y = h / 2;

      const container = new PIXI.Container();
      container.addChild(bg);
      container.addChild(text);
      container.x = startX + i * 70;
      container.y = y;
      container.eventMode = btn.enabled ? 'static' : 'none';
      container.alpha = btn.enabled ? 1 : 0.3;
      container.cursor = btn.enabled ? 'pointer' : 'default';
      container.btnKey = btn.key;

      if (btn.enabled) {
        container.on('pointerdown', () => {
          onAction(btn.key);
          this.hideActionButtons();
        });
        container.on('pointerover', () => container.scale.set(1.05));
        container.on('pointerout', () => container.scale.set(1));
      }

      this.uiLayer.addChild(container);
      this.actionButtons.push(container);
    });
  }

  hideActionButtons() {
    for (const btn of this.actionButtons) {
      this.uiLayer.removeChild(btn);
      btn.destroy({ children: true });
    }
    this.actionButtons = [];
  }

  // ===== 状态文字 =====

  statusText = null;

  setStatus(msg) {
    if (this.statusText) {
      this.uiLayer.removeChild(this.statusText);
      this.statusText.destroy();
    }
    this.statusText = new PIXI.Text({
      text: `${msg} | 余牌: ${gameState.wall.length}`,
      style: {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: 14,
        fill: 0xecf0f1,
        backgroundColor: 0x000000,
        padding: 6,
      }
    });
    this.statusText.anchor.set(0.5);
    this.statusText.x = this.W / 2;
    this.statusText.y = this.H / 2 - 80;
    this.uiLayer.addChild(this.statusText);
  }

  // ===== 弹窗 =====

  showModal(title, lines, buttonText, onButton) {
    const overlay = new PIXI.Container();
    overlay.name = 'modal';

    // 遮罩
    const mask = new PIXI.Graphics();
    mask.rect(0, 0, this.W, this.H);
    mask.fill({ color: 0x000000, alpha: 0.6 });
    mask.eventMode = 'static';
    overlay.addChild(mask);

    // 弹窗背景
    const modalW = 320, modalH = 250;
    const bg = new PIXI.Graphics();
    bg.roundRect(this.W / 2 - modalW / 2, this.H / 2 - modalH / 2, modalW, modalH, 16);
    bg.fill({ color: 0xffffff });
    overlay.addChild(bg);

    // 标题
    const titleText = new PIXI.Text({
      text: title,
      style: { fontFamily: 'PingFang SC, sans-serif', fontSize: 22, fill: 0xe74c3c, fontWeight: 'bold' }
    });
    titleText.anchor.set(0.5);
    titleText.x = this.W / 2;
    titleText.y = this.H / 2 - modalH / 2 + 30;
    overlay.addChild(titleText);

    // 内容行
    let lineY = this.H / 2 - modalH / 2 + 65;
    for (const line of lines) {
      const t = new PIXI.Text({
        text: line,
        style: { fontFamily: 'PingFang SC, sans-serif', fontSize: 14, fill: 0x2c3e50 }
      });
      t.anchor.set(0.5);
      t.x = this.W / 2;
      t.y = lineY;
      overlay.addChild(t);
      lineY += 24;
    }

    // 按钮
    const btnBg = new PIXI.Graphics();
    btnBg.roundRect(this.W / 2 - 50, this.H / 2 + modalH / 2 - 55, 100, 36, 8);
    btnBg.fill({ color: 0xe74c3c });
    const btnText = new PIXI.Text({
      text: buttonText,
      style: { fontFamily: 'PingFang SC, sans-serif', fontSize: 14, fill: 0xffffff, fontWeight: 'bold' }
    });
    btnText.anchor.set(0.5);
    btnText.x = this.W / 2;
    btnText.y = this.H / 2 + modalH / 2 - 37;
    overlay.addChild(btnBg);
    overlay.addChild(btnText);

    btnBg.eventMode = 'static';
    btnBg.cursor = 'pointer';
    btnBg.on('pointerdown', () => {
      this.hideModal();
      if (onButton) onButton();
    });

    this.modalLayer.addChild(overlay);
  }

  hideModal() {
    const modal = this.modalLayer.getChildByName('modal');
    if (modal) {
      this.modalLayer.removeChild(modal);
      modal.destroy({ children: true });
    }
  }
}
