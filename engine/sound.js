// ===== 音效系统（真实 MP3 文件）=====

class SoundFX {
  constructor() {
    this.enabled = true;
    this.bgMusic = null;
  }

  _play(path, volume = 0.7) {
    if (!this.enabled) return;
    const a = new Audio(path);
    a.volume = volume;
    a.play().catch(() => {});
  }

  discard() { this._play('assets/sound/出牌音效.mp3', 0.65); }
  peng()    { this._play('assets/sound/碰音效.mp3',   0.7);  }
  gang()    { this._play('assets/sound/杠音效.mp3',   0.7);  }
  hu()      { this._play('assets/sound/胡音效.mp3',   0.8);  }
  draw()    { this._play('assets/sound/发牌音效.mp3', 0.5);  }
  click()   { this._play('assets/sound/牌点击音效.mp3', 0.45); }
  error()   { this._play('assets/sound/牌点击音效.mp3', 0.2); }

  startBGM() {
    if (!this.enabled) return;
    if (this.bgMusic) return;
    this.bgMusic = new Audio('assets/sound/背景音乐.mp3');
    this.bgMusic.loop   = true;
    this.bgMusic.volume = 0.18;
    this.bgMusic.play().catch(() => {});
  }

  stopBGM() {
    if (this.bgMusic) { this.bgMusic.pause(); this.bgMusic = null; }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) this.stopBGM();
    return this.enabled;
  }
}

const sound = new SoundFX();
