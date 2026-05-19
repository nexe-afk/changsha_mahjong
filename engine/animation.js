// ===== 🎬 专业动画（Pomax 风格） =====
// 参考 Pomax/mahjong 的方向性丢弃动画

class Anim {
  static ease = {
    outCubic: t => 1 - Math.pow(1 - t, 3),
    outBack: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
    outElastic: t => {
      if (t === 0 || t === 1) return t;
      return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
    },
    outBounce: t => {
      if (t < 1 / 2.75) return 7.5625 * t * t;
      if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
      if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    },
    inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  };

  static tween(obj, props, duration = 300, easing = 'outCubic') {
    return new Promise(resolve => {
      const start = {};
      for (const key of Object.keys(props)) start[key] = obj[key];
      const startTime = performance.now();
      const easeFn = Anim.ease[easing] || Anim.ease.outCubic;
      const tick = () => {
        const t = Math.min((performance.now() - startTime) / duration, 1);
        const e = easeFn(t);
        for (const [key, endVal] of Object.entries(props)) {
          obj[key] = start[key] + (endVal - start[key]) * e;
        }
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      tick();
    });
  }

  /** 🃏 Pomax 风格：方向性丢弃动画
   *  玩家0(底)→向上飞，玩家1(右)→向左飞
   *  玩家2(顶)→向下飞，玩家3(左)→向右飞
   */
  static async discardTile(tile, playerIdx, centerX, centerY, tileW, tileH) {
    // 按玩家方向计算初始位置
    const offsets = {
      0: { x: 0, y: 120 },  // 底部 → 向上
      1: { x: -100, y: 0 }, // 右侧 → 向左
      2: { x: 0, y: -100 }, // 顶部 → 向下
      3: { x: 100, y: 0 },  // 左侧 → 向右
    };
    const off = offsets[playerIdx] || offsets[0];
    const startX = centerX + off.x;
    const startY = centerY + off.y;

    tile.x = startX;
    tile.y = startY;
    tile.scale.set(1.1);
    tile.alpha = 1;
    tile.zIndex = 999;

    sound.discard();

    const startTime = performance.now();
    const duration = 350;

    return new Promise(resolve => {
      const tick = () => {
        const t = Math.min((performance.now() - startTime) / duration, 1);
        const e = Anim.ease.outCubic(t);
        tile.x = startX + (centerX - startX) * e;
        tile.y = startY + (centerY - startY) * e - Math.sin(t * Math.PI) * 15;
        tile.scale.set(1.1 - Math.sin(t * Math.PI) * 0.15);
        tile.rotation = Math.sin(t * Math.PI * 2) * 0.03;

        if (t < 1) requestAnimationFrame(tick);
        else {
          tile.x = centerX;
          tile.y = centerY;
          tile.scale.set(1);
          tile.rotation = 0;
          tile.zIndex = 0;
          resolve();
        }
      };
      tick();
    });
  }

  /** ✋ 碰牌聚集动画 */
  static async collect(tiles, targetX, targetY) {
    sound.peng();
    const promises = tiles.map((tile, i) =>
      Anim.tween(tile, {
        x: targetX + i * (TILE.SMALL_W - 3),
        y: targetY,
      }, 200, 'outBack')
    );
    await Promise.all(promises);
  }

  /** 📢 杠牌聚集 */
  static async collectGang(tiles, targetX, targetY) {
    sound.gang();
    const promises = tiles.map((tile, i) =>
      Anim.tween(tile, {
        x: targetX + i * (TILE.SMALL_W - 3),
        y: targetY,
      }, 250, 'outBack')
    );
    await Promise.all(promises);
  }

  /** 🎆 胡牌粒子效果（加强版） */
  static celebrate(container, x, y) {
    sound.hu();

    const colors = [0xf1c40f, 0xe74c3c, 0x3498db, 0x2ecc71, 0xe67e22, 0x9b59b6, 0x1abc9c, 0xff6b6b];

    for (let i = 0; i < 40; i++) {
      const isStar = Math.random() > 0.6;
      const p = new PIXI.Graphics();

      if (isStar) {
        p.poly([
          0, -6, 2, -2, 6, -2, 3, 1, 4, 6,
          0, 3, -4, 6, -3, 1, -6, -2, -2, -2,
        ]);
      } else if (Math.random() > 0.5) {
        p.circle(0, 0, 2 + Math.random() * 4);
      } else {
        p.rect(-3, -3, 6, 6);
      }

      p.fill({ color: colors[Math.floor(Math.random() * colors.length)], alpha: 0.9 });
      p.x = x;
      p.y = y;
      p.scale.set(0);
      container.addChild(p);

      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 250;
      const duration = 500 + Math.random() * 1000;
      const startTime = performance.now();

      const tick = () => {
        const t = Math.min((performance.now() - startTime) / duration, 1);
        const e = Anim.ease.outCubic(t);

        p.x = x + Math.cos(angle) * speed * e;
        p.y = y + Math.sin(angle) * speed * e - 100 * t * (1 - t) * 3;
        p.alpha = 1 - e * 0.6;
        p.scale.set(Math.min(1.5, e * 3) * (1 - e * 0.4));
        p.rotation += (Math.random() - 0.5) * 0.2;

        if (t < 1) requestAnimationFrame(tick);
        else {
          container.removeChild(p);
          p.destroy();
        }
      };
      tick();
    }
  }

  /** 💡 选中脉冲发光（Pomax box-shadow风格） */
  static glowPulse(tile) {
    const w = TILE.BIG_W;
    const h = TILE.BIG_H;

    const glow = new PIXI.Graphics();
    glow.roundRect(-4, -4, w + 8, h + 8, TILE_STYLE.R + 3);
    glow.fill({ color: 0xf1c40f, alpha: 0 });
    glow.name = 'glow';

    tile.addChildAt(glow, 0);

    const startTime = performance.now();
    const tick = () => {
      if (!glow.parent) return;
      const t = (Math.sin(performance.now() / 250) + 1) / 2;
      glow.alpha = 0.1 + t * 0.3;
      requestAnimationFrame(tick);
    };
    tick();
    return glow;
  }

  /** ✨ 建议高亮（AI建议的牌） */
  static suggestHighlight(tile) {
    const mark = new PIXI.Graphics();
    const w = TILE.BIG_W, h = TILE.BIG_H;
    mark.roundRect(-2, -2, w + 4, h + 4, TILE_STYLE.R + 2);
    mark.stroke({ width: 2, color: 0x9b59b6 });
    mark.fill({ color: 0x9b59b6, alpha: 0.08 });
    mark.name = 'suggestion';

    tile.addChildAt(mark, 1);

    const startTime = performance.now();
    const tick = () => {
      if (!mark.parent) return;
      const t = (Math.sin(performance.now() / 400) + 1) / 2;
      mark.alpha = 0.3 + t * 0.7;
      requestAnimationFrame(tick);
    };
    tick();

    return mark;
  }

  /** 💫 分数飘字 */
  static scorePopup(container, x, y, text, color = 0xf1c40f) {
    const t = new PIXI.Text({
      text,
      style: { fontFamily: 'PingFang SC, sans-serif', fontSize: 24, fontWeight: 'bold', fill: color }
    });
    t.anchor.set(0.5);
    t.x = x;
    t.y = y;
    container.addChild(t);

    const startTime = performance.now();
    const duration = 800;

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const p = Math.min(elapsed / duration, 1);
      const e = Anim.ease.outCubic(p);
      t.y = y - 50 * e;
      t.alpha = 1 - e;
      t.scale.set(1 + e * 0.3);

      if (p < 1) requestAnimationFrame(tick);
      else {
        container.removeChild(t);
        t.destroy();
      }
    };
    tick();
  }

  /** ⏱ 倒计时条 */
  static timerBar(g, maxWidth, duration = 8000) {
    const startTime = performance.now();
    const tick = () => {
      if (!g.parent) return;
      const elapsed = performance.now() - startTime;
      const ratio = Math.max(0, 1 - elapsed / duration);

      g.clear();
      g.roundRect(0, 0, maxWidth * ratio, 5, 2.5);
      if (ratio > 0.4) g.fill({ color: 0xf1c40f });
      else if (ratio > 0.15) g.fill({ color: 0xe67e22 });
      else g.fill({ color: 0xe74c3c });

      if (ratio > 0) requestAnimationFrame(tick);
    };
    tick();
  }

  static sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}
