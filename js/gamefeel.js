// ===== 长沙红中麻将 - 游戏感增强 =====
// 参考 majiang(Laya) Tween 链式缓动风格，用 PixiJS 8 + requestAnimationFrame 实现

const GameFeel = {
  // ===== 选牌高亮 =====

  /**
   * 选中牌时缩放 1.1 + 金色描边
   * @param {PIXI.Container} tileContainer
   */
  selectHighlight(tileContainer) {
    if (!tileContainer) return;
    Anim.tween(tileContainer.scale, { x: 1.12, y: 1.12 }, 100, 'outBack');
    Anim.tween(tileContainer, { y: tileContainer.y - 8 }, 100, 'outBack');
    // 金色描边效果（给已有 Graphics 补一个 outline）
    const glow = new PIXI.Graphics();
    glow.roundRect(-2, -2, 48, 64, 7);
    glow.stroke({ width: 2.5, color: 0xf1c40f, alpha: 0.9 });
    glow.label = '__select_glow__';
    tileContainer.addChild(glow);
  },

  /** 取消选中高亮 */
  deselect(tileContainer) {
    if (!tileContainer) return;
    Anim.tween(tileContainer.scale, { x: 1, y: 1 }, 80, 'outCubic');
    Anim.tween(tileContainer, { y: tileContainer.y + 8 }, 80, 'outCubic');
    const glow = tileContainer.children?.find(c => c.label === '__select_glow__');
    if (glow) tileContainer.removeChild(glow);
  },

  // ===== 出牌抛物线动画 =====

  /**
   * 打出牌时的抛物线 + alpha 渐隐
   * @param {PIXI.Container} tileSprite
   * @param {number} targetX
   * @param {number} targetY
   * @param {Function} [onDone]
   */
  discardFly(tileSprite, targetX, targetY, onDone) {
    if (!tileSprite) return;
    const startX = tileSprite.x;
    const startY = tileSprite.y;
    const arcHeight = 12 + Math.random() * 8; // 随机抛物线高度 12~20px
    const duration = 280;
    const start = performance.now();

    const tick = () => {
      const t = Math.min((performance.now() - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 2); // easeOutQuad
      tileSprite.x = startX + (targetX - startX) * e;
      tileSprite.y = startY + (targetY - startY) * e - Math.sin(t * Math.PI) * arcHeight;
      tileSprite.alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        tileSprite.alpha = 0;
        onDone?.();
      }
    };
    tick();
  },

  // ===== 碰/杠 闪光 =====

  /**
   * 碰杠时短暂白色闪光 100ms
   * @param {PIXI.Container} parent - 粒子层
   * @param {number} x
   * @param {number} y
   */
  pengFlash(parent, x, y) {
    if (!parent) return;
    const flash = new PIXI.Graphics();
    flash.roundRect(-30, -20, 60, 40, 8);
    flash.fill({ color: 0xffffff, alpha: 0.7 });
    flash.x = x;
    flash.y = y;
    parent.addChild(flash);
    let elapsed = 0;
    const fade = () => {
      elapsed += 16;
      flash.alpha = Math.max(0, 0.7 - elapsed / 100 * 0.7);
      if (elapsed < 100) requestAnimationFrame(fade);
      else parent.removeChild(flash);
    };
    requestAnimationFrame(fade);
  },

  // ===== 胡牌全屏闪 + 大字弹出 =====

  /**
   * 胡牌时全屏闪+大字弹出（easeOutBack）
   * @param {PIXI.Container} uiLayer
   * @param {number} W - 屏幕宽
   * @param {number} H - 屏幕高
   * @param {string} label - '自摸！' '胡了！' 等
   */
  huCelebrate(uiLayer, W, H, label = '胡！') {
    if (!uiLayer) return;

    // 全屏金色闪光
    const flash = new PIXI.Graphics();
    flash.rect(0, 0, W, H);
    flash.fill({ color: 0xf1c40f, alpha: 0.25 });
    uiLayer.addChild(flash);
    Anim.tween(flash, { alpha: 0 }, 500, 'outCubic').then(() => uiLayer.removeChild(flash));

    // 大字弹出
    const text = new PIXI.Text({
      text: label,
      style: {
        fontSize: 80,
        fontWeight: 'bold',
        fill: 0xf1c40f,
        dropShadow: true,
        dropShadowColor: 0x000000,
        dropShadowBlur: 8,
        dropShadowDistance: 4,
      },
    });
    text.anchor.set(0.5);
    text.x = W / 2;
    text.y = H / 2 - 60;
    text.scale.set(0.3);
    text.alpha = 0;
    uiLayer.addChild(text);

    Anim.tween(text.scale, { x: 1.1, y: 1.1 }, 350, 'outBack');
    Anim.tween(text, { alpha: 1 }, 200, 'outCubic');
    setTimeout(() => {
      Anim.tween(text, { alpha: 0 }, 400, 'outCubic').then(() => uiLayer.removeChild(text));
    }, 1200);
  },

  // ===== 中鸟金色闪光 =====

  /**
   * 扎鸟中鸟时金色粒子闪光
   * @param {PIXI.Container} particleLayer
   * @param {number} x
   * @param {number} y
   */
  birdHitFlash(particleLayer, x, y) {
    if (!particleLayer) return;
    const COUNT = 8;
    for (let i = 0; i < COUNT; i++) {
      const dot = new PIXI.Graphics();
      dot.circle(0, 0, 3 + Math.random() * 4);
      dot.fill({ color: 0xf1c40f, alpha: 0.9 });
      dot.x = x;
      dot.y = y;
      particleLayer.addChild(dot);

      const angle = (i / COUNT) * Math.PI * 2;
      const dist = 40 + Math.random() * 30;
      const tx = x + Math.cos(angle) * dist;
      const ty = y + Math.sin(angle) * dist;
      Anim.tween(dot, { x: tx, y: ty, alpha: 0 }, 500 + Math.random() * 200, 'outCubic')
        .then(() => particleLayer.removeChild(dot));
    }

    // 金色文字
    const txt = new PIXI.Text({
      text: '🐦 中鸟！',
      style: { fontSize: 28, fontWeight: 'bold', fill: 0xf1c40f },
    });
    txt.anchor.set(0.5);
    txt.x = x;
    txt.y = y - 20;
    txt.alpha = 0;
    particleLayer.addChild(txt);
    Anim.tween(txt, { y: y - 60, alpha: 1 }, 300, 'outBack');
    setTimeout(() => {
      Anim.tween(txt, { alpha: 0 }, 300, 'outCubic').then(() => particleLayer.removeChild(txt));
    }, 900);
  },

  // ===== 摸牌弹起动画 =====

  /**
   * 摸到新牌时短暂弹起提示
   * @param {PIXI.Container} tile
   */
  drawBounce(tile) {
    if (!tile) return;
    const origY = tile.y;
    Anim.tween(tile, { y: origY - 16 }, 120, 'outBack')
      .then(() => Anim.tween(tile, { y: origY }, 200, 'outBounce'));
  },

  // ===== 无效操作抖动 =====

  /**
   * 无效操作（如未选牌就打牌）时水平抖动
   * @param {PIXI.Container} target
   */
  shake(target) {
    if (!target) return;
    const origX = target.x;
    const steps = [8, -8, 6, -6, 4, -4, 0];
    let i = 0;
    const next = () => {
      if (i >= steps.length) return;
      Anim.tween(target, { x: origX + steps[i] }, 40, 'outCubic').then(() => {
        i++;
        next();
      });
    };
    next();
  },
};
