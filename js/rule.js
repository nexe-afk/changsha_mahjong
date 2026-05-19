// ===== 长沙红中麻将 - 规则 =====

const RULES = {
  // 基本规则
  INITIAL_TILES: 13,
  TOTAL_TILES: 112,   // (9×3+4)×4 = 112
  MAX_PLAYERS: 4,

  // 胡牌类型
  HU_TYPES: {
    PING_HU: 'pinghu',         // 平胡
    QI_XIAO_DUI: 'qixiaodui',  // 七小对
    PENG_PENG_HU: 'pengpenghu',// 碰碰胡
    QING_YI_SE: 'qingyise',    // 清一色
    TIAN_HU: 'tianhu',         // 天胡
    DI_HU: 'dihu',             // 地胡
  },

  // 扎鸟
  BIRD_COUNT: 4,
  BIRD_WIN_CARDS: [1, 5, 9],  // 中鸟数字
};

// 胡牌类型检测
function getHuType(hand, melons) {
  const realHand = hand.filter(t => t !== HONGZHONG);
  const zhong = hand.filter(t => t === HONGZHONG).length;

  const types = [];

  // 七小对
  if (checkSevenPairs(realHand, zhong)) types.push(RULES.HU_TYPES.QI_XIAO_DUI);

  // 清一色
  if (checkQingYiSe(hand)) types.push(RULES.HU_TYPES.QING_YI_SE);

  // 碰碰胡：所有面子都是刻子
  if (checkPengPengHu(hand)) types.push(RULES.HU_TYPES.PENG_PENG_HU);

  // 缺一色（长沙特色）
  if (!checkQueYiSe(hand)) {
    // 缺一色是必要条件，不满足不能胡
    return [];
  }

  // 平胡（默认）
  if (types.length === 0) types.push(RULES.HU_TYPES.PING_HU);

  return types;
}

// 清一色检测
function checkQingYiSe(hand) {
  const suits = new Set();
  for (const t of hand) {
    if (t !== HONGZHONG) {
      suits.add(getSuit(t));
    }
  }
  // 红中不算花色，所以如果只有一种花色+红中就算清一色
  return suits.size === 1;
}

// 碰碰胡检测
function checkPengPengHu(hand) {
  const realHand = hand.filter(t => t !== HONGZHONG).sort((a, b) => a - b);
  const zhong = hand.filter(t => t === HONGZHONG).length;

  // 从标准胡检测出发，但验证所有面子是刻子
  // 尝试所有将眼
  const pairs = findPairs(hand);
  for (const pair of pairs) {
    let testHand = removeN(realHand, pair, 2);
    // 检查剩下的能否全组成刻子
    if (canFormAllKes(testHand, zhong)) return true;
  }

  // 用红中作将
  if (zhong >= 2) {
    if (canFormAllKes(realHand, zhong - 2)) return true;
  }

  return false;
}

// 检查能否全组成刻子（用于碰碰胡）
function canFormAllKes(hand, zhong) {
  if (hand.length === 0) return true;

  const sorted = [...hand].sort((a, b) => a - b);
  const first = sorted[0];

  // 刻子 AAA
  if (countInHand(sorted, first) >= 3) {
    const remain = removeN(sorted, first, 3);
    if (canFormAllKes(remain, zhong)) return true;
  }

  // 用红中补刻子 AA + H = AAA
  if (zhong >= 1 && countInHand(sorted, first) >= 2) {
    const remain = removeN(sorted, first, 2);
    if (canFormAllKes(remain, zhong - 1)) return true;
  }

  // 用两个红中补 A + HH = AAA
  if (zhong >= 2) {
    const remain = [...sorted];
    remain.shift();
    if (canFormAllKes(remain, zhong - 2)) return true;
  }

  return false;
}

// 计算倍数
function calcMultiplier(huTypes, zhongCount, birdMultiplier) {
  let base = 1;

  for (const type of huTypes) {
    switch (type) {
      case RULES.HU_TYPES.PING_HU:
        base *= 1;
        break;
      case RULES.HU_TYPES.QI_XIAO_DUI:
        base *= 2;
        break;
      case RULES.HU_TYPES.PENG_PENG_HU:
        base *= 2;
        break;
      case RULES.HU_TYPES.QING_YI_SE:
        base *= 4;
        break;
      case RULES.HU_TYPES.TIAN_HU:
        base *= 8;
        break;
      case RULES.HU_TYPES.DI_HU:
        base *= 4;
        break;
    }
  }

  // 扎鸟倍数
  return base * birdMultiplier;
}
