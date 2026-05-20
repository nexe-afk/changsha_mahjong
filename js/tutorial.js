// ===== 长沙红中麻将 - 新手引导 & 交互反馈 =====
// 参考 majiang(Laya) 三层渐进式引导：选牌→出牌→碰杠胡

const TUTORIAL_KEY = 'mj_tutorial_done';

// ===== TutorialManager =====

const TutorialManager = {
  _step: 0,
  _overlay: null,
  _arrow: null,
  _bubble: null,
  _active: false,

  STEPS: [
    {
      title: '👆 选择要打出的牌',
      desc: '点击手牌中的一张，牌会上移高亮表示选中',
      highlight: 'hand0',
    },
    {
      title: '🃏 再次点击打出',
      desc: '再点一次已选中的牌，或按 Enter / 空格 打出',
      highlight: 'hand0',
    },
    {
      title: '✅ 碰 / 杠 / 胡',
      desc: '当别人出牌后，若有可操作按钮亮起，点击即可碰/杠/胡',
      highlight: 'actions',
    },
  ],

  /** 首次运行时启动引导 */
  maybeStart() {
    if (localStorage.getItem(TUTORIAL_KEY)) return;
    this.start();
  },

  start() {
    this._active = true;
    this._step = 0;
    this._showStep();
  },

  _showStep() {
    this._clearOverlay();
    if (this._step >= this.STEPS.length) {
      this._finish();
      return;
    }
    const step = this.STEPS[this._step];
    this._buildOverlay(step);
  },

  _buildOverlay(step) {
    // 遮罩层（半透明黑色背景）
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,0.55);z-index:9000;
      display:flex;align-items:center;justify-content:center;
    `;
    this._overlay = overlay;

    // 提示卡片
    const card = document.createElement('div');
    card.style.cssText = `
      background:#1a472a;border:2px solid #f1c40f;border-radius:16px;
      padding:24px 32px;max-width:360px;text-align:center;
      box-shadow:0 8px 32px rgba(0,0,0,0.6);
      font-family:'PingFang SC','Microsoft YaHei',sans-serif;color:#fff;
    `;

    const num = document.createElement('div');
    num.style.cssText = 'font-size:12px;color:#f1c40f;margin-bottom:8px;';
    num.textContent = `第 ${this._step + 1} / ${this.STEPS.length} 步`;

    const title = document.createElement('div');
    title.style.cssText = 'font-size:22px;font-weight:bold;margin-bottom:12px;';
    title.textContent = step.title;

    const desc = document.createElement('div');
    desc.style.cssText = 'font-size:15px;line-height:1.6;color:#ccc;margin-bottom:20px;';
    desc.textContent = step.desc;

    const btn = document.createElement('button');
    btn.style.cssText = `
      background:#f1c40f;color:#0d1f0d;border:none;border-radius:8px;
      padding:10px 28px;font-size:16px;font-weight:bold;cursor:pointer;
    `;
    btn.textContent = this._step < this.STEPS.length - 1 ? '下一步 →' : '开始游戏！';
    btn.onclick = () => {
      this._step++;
      this._showStep();
    };

    // 跳过按钮
    const skip = document.createElement('button');
    skip.style.cssText = `
      background:transparent;color:#888;border:1px solid #555;border-radius:6px;
      padding:6px 16px;font-size:12px;cursor:pointer;margin-left:10px;
    `;
    skip.textContent = '跳过引导';
    skip.onclick = () => this._finish();

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;';
    btnRow.appendChild(btn);
    btnRow.appendChild(skip);

    card.append(num, title, desc, btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  },

  _clearOverlay() {
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
    }
  },

  _finish() {
    this._clearOverlay();
    this._active = false;
    try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch {}
  },

  reset() {
    try { localStorage.removeItem(TUTORIAL_KEY); } catch {}
  },
};

// ===== FeedbackManager =====
// 交互反馈：抖动提示、AI 回合状态

const FeedbackManager = {
  _aiIndicator: null,

  /**
   * 非法操作时在屏幕顶部显示短暂提示
   * @param {string} msg
   */
  showHint(msg) {
    const existing = document.getElementById('__mj_hint__');
    if (existing) existing.remove();

    const hint = document.createElement('div');
    hint.id = '__mj_hint__';
    hint.style.cssText = `
      position:fixed;top:20px;left:50%;transform:translateX(-50%);
      background:rgba(231,76,60,0.92);color:#fff;border-radius:8px;
      padding:8px 20px;font-size:15px;z-index:9999;pointer-events:none;
      font-family:'PingFang SC','Microsoft YaHei',sans-serif;
    `;
    hint.textContent = msg;
    document.body.appendChild(hint);
    setTimeout(() => hint.remove(), 1800);
  },

  /**
   * 正向提示（绿色）
   * @param {string} msg
   */
  showSuccess(msg) {
    const hint = document.createElement('div');
    hint.style.cssText = `
      position:fixed;top:20px;left:50%;transform:translateX(-50%);
      background:rgba(39,174,96,0.92);color:#fff;border-radius:8px;
      padding:8px 20px;font-size:15px;z-index:9999;pointer-events:none;
      font-family:'PingFang SC','Microsoft YaHei',sans-serif;
    `;
    hint.textContent = msg;
    document.body.appendChild(hint);
    setTimeout(() => hint.remove(), 1500);
  },

  /**
   * AI 回合时在屏幕角落显示小图标
   * @param {number} playerIdx
   */
  showAIThinking(playerIdx) {
    this.hideAIThinking();
    const div = document.createElement('div');
    div.id = '__mj_ai_thinking__';
    div.style.cssText = `
      position:fixed;bottom:16px;right:16px;
      background:rgba(0,0,0,0.6);color:#f1c40f;border-radius:8px;
      padding:6px 14px;font-size:13px;z-index:8000;pointer-events:none;
      font-family:'PingFang SC','Microsoft YaHei',sans-serif;
    `;
    div.textContent = `🤖 玩家${playerIdx + 1} 思考中...`;
    document.body.appendChild(div);
    this._aiIndicator = div;
  },

  hideAIThinking() {
    const el = document.getElementById('__mj_ai_thinking__');
    if (el) el.remove();
    this._aiIndicator = null;
  },
};

// ===== 触摸设备适配 =====

const TouchAdapter = {
  _longPressTimer: null,
  LONG_PRESS_MS: 500,

  init(canvas) {
    if (!canvas) return;
    // 双击出牌
    let lastTap = 0;
    canvas.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTap < 300) {
        // 双击：触发 Enter 键逻辑
        const evt = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        document.dispatchEvent(evt);
      }
      lastTap = now;
    }, { passive: true });

    // 长按显示牌名浮窗（500ms）
    canvas.addEventListener('touchstart', (e) => {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = setTimeout(() => {
        const touch = e.touches[0];
        this._showTileTooltip(touch.clientX, touch.clientY);
      }, this.LONG_PRESS_MS);
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      clearTimeout(this._longPressTimer);
      this._hideTooltip();
    }, { passive: true });
    canvas.addEventListener('touchmove', () => {
      clearTimeout(this._longPressTimer);
    }, { passive: true });
  },

  _showTileTooltip(x, y) {
    this._hideTooltip();
    // 通过 gameState 获取当前选中牌名
    if (typeof gameState === 'undefined' || gameState.selectedTile === null) return;
    const tile = gameState.players[0]?.hand?.[gameState.selectedTile];
    if (tile === undefined) return;
    const name = typeof decodeTile !== 'undefined' ? decodeTile(tile).name : tile;

    const tip = document.createElement('div');
    tip.id = '__mj_tooltip__';
    tip.style.cssText = `
      position:fixed;left:${x - 30}px;top:${y - 55}px;
      background:rgba(0,0,0,0.8);color:#f1c40f;border-radius:6px;
      padding:5px 12px;font-size:18px;z-index:9999;pointer-events:none;
    `;
    tip.textContent = name;
    document.body.appendChild(tip);
  },

  _hideTooltip() {
    const el = document.getElementById('__mj_tooltip__');
    if (el) el.remove();
  },
};
