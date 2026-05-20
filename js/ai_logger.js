// ===== 长沙红中麻将 - AI 决策日志 =====
// 参考 mahjong-helper 的 console.table 调试输出格式
// 通过 window.AI_DEBUG = true 开启

/**
 * 单次出牌决策的评分明细
 */
class DecisionScoreCard {
  constructor(tileCode) {
    this.tile = tileCode;
    this.tileName = '';
    this.factors = {};    // 评分因素 key→value
    this.totalScore = 0;
    this.tingCards = [];
    this.selected = false;
  }

  addFactor(name, value) {
    this.factors[name] = value;
    this.totalScore += value;
  }
}

// ===== AILogger =====

const AILogger = {
  _history: [],
  MAX_HISTORY: 50,

  /**
   * 记录一次 AI 出牌决策
   * @param {number} playerIdx
   * @param {number[]} hand
   * @param {number} chosen - 选中打出的牌编码
   * @param {DecisionScoreCard[]} scorecards - 所有候选牌的评分
   * @param {number[]} tingCards - 打出 chosen 后的听牌列表
   */
  logDecision(playerIdx, hand, chosen, scorecards, tingCards) {
    if (!window.AI_DEBUG) return;

    const entry = {
      ts: new Date().toLocaleTimeString(),
      player: `玩家${playerIdx + 1}`,
      hand: hand.map(t => (typeof decodeTile !== 'undefined' ? decodeTile(t).name : t)).join(' '),
      chosen: typeof decodeTile !== 'undefined' ? decodeTile(chosen).name : chosen,
      tingCount: tingCards.length,
      tingCards: tingCards.map(t => (typeof decodeTile !== 'undefined' ? decodeTile(t).name : t)).join(' '),
    };

    this._history.push(entry);
    if (this._history.length > this.MAX_HISTORY) this._history.shift();

    this.formatScoreTable(entry.player, scorecards);
  },

  /**
   * 以 console.table 格式输出评分表（参考 mahjong-helper 四列风格）
   */
  formatScoreTable(label, scorecards) {
    if (!window.AI_DEBUG || !scorecards.length) return;

    const rows = scorecards.map(card => {
      const row = {
        '手牌': card.tileName || card.tile,
        '总分': card.totalScore,
        '听牌数': card.tingCards.length,
        '推荐': card.selected ? '✅' : '',
      };
      // 展开评分因素
      for (const [k, v] of Object.entries(card.factors)) {
        row[k] = v > 0 ? `+${v}` : `${v}`;
      }
      return row;
    }).sort((a, b) => b['总分'] - a['总分']);

    console.group(`[AI决策] ${label}`);
    console.table(rows);
    console.groupEnd();
  },

  /** 返回最近 n 条决策记录 */
  getHistory(n = 10) {
    return this._history.slice(-n);
  },

  clear() {
    this._history = [];
  },
};

// 暴露开关到全局，方便调试时 window.AI_DEBUG = true
if (typeof window !== 'undefined') {
  window.AI_DEBUG = false;
  window.AILogger = AILogger;
}
