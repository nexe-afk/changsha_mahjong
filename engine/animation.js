// ===== PixiJS 动画系统 =====

class TileAnimation {
  /**
   * 缓动移动
   * @param {PIXI.Container} target
   * @param {number} toX
   * @param {number} toY
   * @param {number} duration - 毫秒
   * @param {Function} onComplete
   */
  static moveTo(target, toX, toY, duration = 300, onComplete = null) {
    const startX = target.x;
    const startY = target.y;
    const startTime = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - t, 3);
      target.x = startX + (toX - startX) * ease;
      target.y = startY + (toY - startY) * ease;

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        target.x = toX;
        target.y = toY;
        if (onComplete) onComplete();
      }
    };
    tick();
  }

  /**
   * 牌飞出效果（出牌动画）
   */
  static discardFly(tile, fromX, fromY, toX, toY, onComplete) {
    tile.x = fromX;
    tile.y = fromY;
    tile.alpha = 1;
    tile.scale.set(1);

    const startTime = performance.now();
    const duration = 250;

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      tile.x = fromX + (toX - fromX) * ease;
      tile.y = fromY + (toY - fromY) * ease - Math.sin(t * Math.PI) * 20; // 抛物线
      tile.scale.set(1 + Math.sin(t * Math.PI) * 0.15);

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        tile.x = toX;
        tile.y = toY;
        tile.scale.set(1);
        if (onComplete) onComplete();
      }
    };
    tick();
  }

  /**
   * 碰牌收集动画（多张牌飞向碰的位置）
   */
  static collectTo(tiles, toX, toY, duration = 200, onComplete) {
    let completed = 0;
    const total = tiles.length;
    for (const t of tiles) {
      this.moveTo(t, toX, toY, duration, () => {
        completed++;
        if (completed === total && onComplete) onComplete();
      });
    }
  }

  /**
   * 闪烁效果
   */
  static blink(target, times = 3, interval = 200) {
    let count = 0;
    const tick = () => {
      if (count >= times * 2) {
        target.alpha = 1;
        return;
      }
      target.alpha = count % 2 === 0 ? 0.3 : 1;
      count++;
      setTimeout(tick, interval);
    };
    tick();
  }

  /**
   * 胡牌庆祝（简单粒子效果）
   */
  static celebrate(container, x, y) {
    const colors = [0xf1c40f, 0xe74c3c, 0x3498db, 0x2ecc71, 0xe67e22];
    for (let i = 0; i < 20; i++) {
      const particle = new PIXI.Graphics();
      particle.circle(0, 0, 3 + Math.random() * 4);
      particle.fill({ color: colors[Math.floor(Math.random() * colors.length)] });
      particle.x = x;
      particle.y = y;
      container.addChild(particle);

      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      const startTime = performance.now();
      const duration = 800 + Math.random() * 600;

      const tick = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        particle.x = x + Math.cos(angle) * speed * t;
        particle.y = y + Math.sin(angle) * speed * t - 100 * t * (1 - t);
        particle.alpha = 1 - t;
        particle.scale.set(1 - t * 0.5);

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          container.removeChild(particle);
          particle.destroy();
        }
      };
      tick();
    }
  }
}
