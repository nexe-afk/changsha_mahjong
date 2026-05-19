// ===== 🎬 专业级动画系统 =====

class Anim {
  // ===== 缓动函数库 =====
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

  // ===== 通用缓动 =====
  static tween(obj, props, duration = 300, easing = 'outCubic') {
    return new Promise(resolve => {
      const start = {};
      for (const key of Object.keys(props)) {
        start[key] = obj[key];
      }
      const startTime = performance.now();
      const easeFn = Anim.ease[easing] || Anim.ease.outCubic;

      const tick = () => {
        const t = Math.min((performance.now() - startTime) / duration, 1);
        const e = easeFn(t);
        for (const [key, endVal] of Object.entries(props)) {
          obj[key] = start[key] + (endVal - start[key]) * e;
        }
        if (t < 1) requestAnimationFrame(tick);
        else { resolve(); }
      };
      tick();
    });
  }

  // ===== 🃏 发牌动画（牌从中心飞到各玩家位置） =====
  static async dealTiles(stage, playerPositions) {
    const promises = [];
    for (let p = 0; p < 4; p++) {
      const hand = gameState.players[p].hand;
      const [cx, cy] = playerPositions[p] || [0, 0];

      for (let i = 0; i < hand.length; i++) {
        // 在中心创建牌，然后飞到玩家位置
        // 实际由 GameScene 的 dealAnimation 实现
        await Anim.sleep(40);
      }
    }
  }

  static sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // ===== 🃏 出牌抛物线动画 =====
  static async discardFly(tile, fromX, fromY, toX, toY) {
    tile.x = fromX;
    tile.y = fromY;
    tile.alpha = 1;
    tile.scale.set(0.9);
    tile.zIndex = 999;

    const startTime = performance.now();
    const duration = 280;

    return new Promise(resolve => {
      const tick = () => {
        const t = Math.min((performance.now() - startTime) / duration, 1);
        const e = Anim.ease.outCubic(t);
        tile.x = fromX + (toX - fromX) * e;
        tile.y = fromY + (toY - fromY) * e - Math.sin(t * Math.PI) * 25;
        tile.scale.set(0.9 + Math.sin(t * Math.PI) * 0.15);
        tile.rotation = Math.sin(t * Math.PI * 2) * 0.04;

        if (t < 1) requestAnimationFrame(tick);
        else {
          tile.x = toX;
          tile.y = toY;
          tile.scale.set(1);
          tile.rotation = 0;
          tile.zIndex = 0;
          resolve();
        }
      };
      tick();
    });
  }

  // ===== ✋ 碰牌收集动画 =====
  static async collectPung(tiles, targetX, targetY) {
    const promises = tiles.map((tile, i) => {
      const tx = targetX + i * (TILE.SMALL_W - 3);
      const ty = targetY;
      return Anim.tween(tile, { x: tx, y: ty }, 200, 'outBack');
    });
    await Promise.all(promises);
  }

  // ===== 🎆 胡牌粒子庆祝 =====
  static celebrate(container, x, y) {
    const colors = [0xf1c40f, 0xe74c3c, 0x3498db, 0x2ecc71, 0xe67e22, 0x9b59b6, 0x1abc9c];

    for (let i = 0; i < 30; i++) {
      const isStar = Math.random() > 0.7;
      const p = new PIXI.Graphics();

      if (isStar) {
        // 星星
        p.poly([
          0, -5, 1.5, -1.5, 5, -1.5, 2, 1, 3, 5,
          0, 3, -3, 5, -2, 1, -5, -1.5, -1.5, -1.5,
        ]);
      } else {
        p.circle(0, 0, 2 + Math.random() * 4);
      }

      p.fill({
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.9,
      });
      p.x = x;
      p.y = y;
      p.scale.set(0);
      container.addChild(p);

      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 200;
      const duration = 600 + Math.random() * 800;
      const rotSpeed = (Math.random() - 0.5) * 0.3;
      const startTime = performance.now();

      const tick = () => {
        const t = Math.min((performance.now() - startTime) / duration, 1);
        const ease = Anim.ease.outCubic(t);

        p.x = x + Math.cos(angle) * speed * ease;
        p.y = y + Math.sin(angle) * speed * ease - 120 * t * (1 - t) * 2;
        p.alpha = 1 - ease * 0.7;
        p.scale.set(Math.min(1.5, ease * 3) * (1 - ease * 0.4));
        p.rotation += rotSpeed;

        if (t < 1) requestAnimationFrame(tick);
        else {
          container.removeChild(p);
          p.destroy();
        }
      };
      tick();
    }
  }

  // ===== ✨ 选牌发光 =====
  static selectGlow(tile) {
    const glow = new PIXI.Graphics();
    const w = TILE_STYLE.W * (tile.baseScale || 1);
    const h = TILE_STYLE.H * (tile.baseScale || 1);
    glow.roundRect(-3, -3, w + 6, h + 6, TILE_STYLE.R + 2);
    glow.fill({ color: 0xf1c40f, alpha: 0 });

    tile.addChildAt(glow, 0);

    // 脉冲动画
    const startTime = performance.now();
    const tick = () => {
      if (!glow.parent) return; // 已被移除
      const t = (Math.sin(performance.now() / 200) + 1) / 2;
      glow.alpha = 0.15 + t * 0.25;
      requestAnimationFrame(tick);
    };
    tick();

    return glow;
  }

  // ===== 💫 缓动上移（分数变化等） =====
  static async floatUp(text, startY, distance = -40) {
    const startTime = performance.now();
    const duration = 600;

    return new Promise(resolve => {
      const tick = () => {
        const t = Math.min((performance.now() - startTime) / duration, 1);
        const e = Anim.ease.outCubic(t);
        text.y = startY + distance * e;
        text.alpha = 1 - e;

        if (t < 1) requestAnimationFrame(tick);
        else {
          if (text.parent) {
            text.parent.removeChild(text);
            text.destroy();
          }
          resolve();
        }
      };
      tick();
    });
  }

  // ===== ⏱️ 倒计时条动画 =====
  static timerBar(graphics, maxWidth, duration = 8000) {
    const startTime = performance.now();
    const tick = () => {
      if (!graphics.parent) return;
      const elapsed = performance.now() - startTime;
      const ratio = Math.max(0, 1 - elapsed / duration);

      graphics.clear();
      graphics.roundRect(0, 0, maxWidth * ratio, 6, 3);
      if (ratio > 0.3) {
        graphics.fill({ color: 0xf1c40f });
      } else if (ratio > 0.1) {
        graphics.fill({ color: 0xe67e22 });
      } else {
        graphics.fill({ color: 0xe74c3c });
      }

      if (ratio > 0) requestAnimationFrame(tick);
    };
    tick();
  }

  // ===== 🔥 牌面辉光效果 =====
  static glowEffect(tile, color = 0xf1c40f) {
    const w = TILE_STYLE.W * (tile.baseScale || 1);
    const h = TILE_STYLE.H * (tile.baseScale || 1);

    const filter = new PIXI.BlurFilter();
    filter.blur = 4;

    const glow = new PIXI.Graphics();
    glow.roundRect(-2, -2, w + 4, h + 4, TILE_STYLE.R + 2);
    glow.fill({ color, alpha: 0.5 });
    glow.filters = [filter];
    glow.alpha = 0;

    tile.addChildAt(glow, 0);

    Anim.tween(glow, { alpha: 1 }, 200).then(() => {
      Anim.tween(glow, { alpha: 0.4 }, 500);
    });

    return glow;
  }
}
