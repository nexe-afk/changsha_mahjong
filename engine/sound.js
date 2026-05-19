// ===== 🎵 Web Audio 音效系统 =====
// 纯代码合成音效，零文件依赖

class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  _init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.enabled = false;
    }
  }

  _play(freq, duration, type = 'sine', volume = 0.15) {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  /** 🃏 出牌 */
  discard() {
    this._play(600, 0.08, 'square', 0.08);
    setTimeout(() => this._play(400, 0.05, 'square', 0.05), 50);
  }

  /** ✋ 碰 */
  peng() {
    this._play(300, 0.15, 'triangle', 0.12);
    setTimeout(() => this._play(500, 0.15, 'triangle', 0.12), 100);
    setTimeout(() => this._play(700, 0.2, 'triangle', 0.12), 200);
  }

  /** 📢 杠 */
  gang() {
    this._play(200, 0.2, 'sawtooth', 0.1);
    setTimeout(() => this._play(300, 0.2, 'sawtooth', 0.1), 150);
    setTimeout(() => this._play(400, 0.2, 'sawtooth', 0.1), 300);
    setTimeout(() => this._play(500, 0.3, 'sawtooth', 0.1), 450);
  }

  /** 🀄 胡 */
  hu() {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this._play(400 + i * 200, 0.15, 'sine', 0.12);
      }, i * 100);
    }
  }

  /** 🎯 摸牌 */
  draw() {
    this._play(800, 0.06, 'sine', 0.06);
  }

  /** ✅ 按钮点击 */
  click() {
    this._play(1000, 0.04, 'square', 0.05);
  }

  /** ❌ 错误 */
  error() {
    this._play(200, 0.3, 'sawtooth', 0.1);
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

const sound = new SoundFX();
