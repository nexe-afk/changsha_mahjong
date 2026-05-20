// ===== 长沙红中麻将 - 动态难度调整系统 =====
// 参考 archer 的多层决策因子权重思路

const DDA_THRESHOLDS = {
  WIN_STREAK_UP: 3,     // 连胜 N 局升难度
  LOSE_STREAK_DOWN: 3,  // 连败 N 局降难度
  AVG_SCORE_HIGH: 20,   // 平均分 > N 升难度
  AVG_SCORE_LOW: 5,     // 平均分 < N 降难度
  HISTORY_SIZE: 5,      // 参考最近 N 局
};

const DIFFICULTY_LEVELS = ['easy', 'normal', 'hard'];

// ===== PlayerTracker =====

class PlayerTracker {
  /**
   * 追踪玩家近期表现，持久化到 localStorage
   * @param {string} storageKey
   */
  constructor(storageKey = 'mj_player_tracker') {
    this.key = storageKey;
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(this.key);
      this._data = raw ? JSON.parse(raw) : { games: [], level: 'normal' };
    } catch {
      this._data = { games: [], level: 'normal' };
    }
  }

  _save() {
    try { localStorage.setItem(this.key, JSON.stringify(this._data)); } catch {}
  }

  /** 记录一局结果 */
  recordGame({ score, isWin, duration }) {
    this._data.games.push({ score: score || 0, isWin: !!isWin, duration: duration || 0, ts: Date.now() });
    // 只保留最近 20 局
    if (this._data.games.length > 20) this._data.games = this._data.games.slice(-20);
    this._save();
  }

  /** 获取最近 n 局 */
  getRecentGames(n = 5) {
    return this._data.games.slice(-n);
  }

  /** 最近 n 局胜率 */
  getWinRate(n = 5) {
    const games = this.getRecentGames(n);
    if (games.length === 0) return 0;
    return games.filter(g => g.isWin).length / games.length;
  }

  /** 最近 n 局平均分 */
  getAvgScore(n = 5) {
    const games = this.getRecentGames(n);
    if (games.length === 0) return 0;
    return games.reduce((s, g) => s + g.score, 0) / games.length;
  }

  /**
   * 连胜/连败数（正=连胜，负=连败）
   */
  getStreak() {
    const games = this._data.games;
    if (games.length === 0) return 0;
    const last = games[games.length - 1].isWin;
    let streak = 0;
    for (let i = games.length - 1; i >= 0; i--) {
      if (games[i].isWin === last) streak++;
      else break;
    }
    return last ? streak : -streak;
  }

  get currentLevel() { return this._data.level || 'normal'; }
  set currentLevel(v) { this._data.level = v; this._save(); }

  reset() {
    this._data = { games: [], level: 'normal' };
    this._save();
  }
}

// ===== 难度调整逻辑（纯函数）=====

/**
 * 根据表现决定新难度
 * @param {string} currentLevel - 'easy' | 'normal' | 'hard'
 * @param {PlayerTracker} tracker
 * @returns {'easy' | 'normal' | 'hard'}
 */
function adjustDifficulty(currentLevel, tracker) {
  const streak = tracker.getStreak();
  const avgScore = tracker.getAvgScore(DDA_THRESHOLDS.HISTORY_SIZE);
  const idx = DIFFICULTY_LEVELS.indexOf(currentLevel);

  const shouldUp =
    streak >= DDA_THRESHOLDS.WIN_STREAK_UP ||
    avgScore > DDA_THRESHOLDS.AVG_SCORE_HIGH;

  const shouldDown =
    streak <= -DDA_THRESHOLDS.LOSE_STREAK_DOWN ||
    avgScore < DDA_THRESHOLDS.AVG_SCORE_LOW;

  if (shouldUp && idx < DIFFICULTY_LEVELS.length - 1) return DIFFICULTY_LEVELS[idx + 1];
  if (shouldDown && idx > 0) return DIFFICULTY_LEVELS[idx - 1];
  return currentLevel;
}

// ===== DDAManager =====

const DDAManager = {
  tracker: null,

  init() {
    this.tracker = new PlayerTracker('mj_dda');
    this.applyParams();
    console.log(`[DDA] 初始难度: ${this.tracker.currentLevel}`);
  },

  applyParams() {
    if (typeof getDifficultyParams !== 'undefined') {
      window.difficultyParams = getDifficultyParams(this.tracker.currentLevel);
    } else {
      // 内置默认参数（与 ai.js 一致）
      const presets = {
        easy:   { discardNoise: 0.3,  pengThreshold: 5, huBlindChance: 0.3 },
        normal: { discardNoise: 0.05, pengThreshold: 3, huBlindChance: 0.05 },
        hard:   { discardNoise: 0,    pengThreshold: 1, huBlindChance: 0 },
      };
      window.difficultyParams = presets[this.tracker.currentLevel] || presets.normal;
    }
  },

  /** 每局结束调用 */
  onGameEnd({ score, isWin, duration } = {}) {
    if (!this.tracker) return;
    this.tracker.recordGame({ score: score || 0, isWin: !!isWin, duration: duration || 0 });
    const newLevel = adjustDifficulty(this.tracker.currentLevel, this.tracker);
    if (newLevel !== this.tracker.currentLevel) {
      console.log(`[DDA] 难度调整: ${this.tracker.currentLevel} → ${newLevel}`);
      this.tracker.currentLevel = newLevel;
    }
    this.applyParams();
  },
};
