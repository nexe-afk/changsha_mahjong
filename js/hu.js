// ===== 长沙红中麻将 - 胡牌判定算法 =====

/**
 * 核心胡牌判定
 * @param {number[]} hand - 手牌数组
 * @param {number} zhong - 可用红中数量（已包含在手牌中的）
 * @returns {boolean} 是否能胡
 */
function canWin(hand, zhong) {
  // 移除手牌中的红中，单独计数
  const realHand = hand.filter(t => t !== HONGZHONG);
  const zhCnt = zhong + (hand.length - realHand.length);

  // 1. 检测七小对（可以嵌套七小对胡牌）
  if (checkSevenPairs(realHand, zhCnt)) return true;

  // 2. 标准胡: N个面子 + 1个将眼
  return checkStandardWin(realHand, zhCnt);
}

/**
 * 标准胡判定 (回溯法)
 */
function checkStandardWin(hand, zhong) {
  if (hand.length === 0) return zhong >= 2; // 全部用红中当将

  // 对红中数量做限制，避免过度使用
  if (zhong < 0) return false;
  if (hand.length === 0 && zhong >= 0) return true;
  if (hand.length > 0 && zhong + hand.length / 3 < 0) return false;

  // 尝试所有可能的将眼
  const possibilities = getAllPossiblePairs(hand, zhong);

  for (const p of possibilities) {
    const { remaining, usedZhong } = p;
    if (canFormAllMelds(remaining, zhong - usedZhong)) return true;
  }

  return false;
}

/**
 * 获取所有可能的将眼组合
 */
function getAllPossiblePairs(hand, zhong) {
  const results = [];
  const counts = getCountMap(hand);

  for (const [tile, cnt] of Object.entries(counts)) {
    const t = parseInt(tile);
    if (cnt >= 2) {
      results.push({ remaining: removeN(hand, t, 2), usedZhong: 0 });
    }
  }

  // 用红中当代替将眼: 取手牌第一张作为将（用红中补第二张）
  if (zhong >= 1 && hand.length >= 1) {
    // 用红中当一张，搭任何一张牌做将
    // 跳过那些已经有真实对子的，只试单独的牌
    for (const [tile, cnt] of Object.entries(counts)) {
      if (cnt === 1) {
        results.push({ remaining: removeN(hand, parseInt(tile), 1), usedZhong: 1 });
      }
    }
  }

  // 如果全用红中作将
  if (zhong >= 2) {
    results.push({ remaining: [...hand], usedZhong: 2 });
  }

  return results;
}

/**
 * 检查能否组成 N 个面子（刻子或顺子）
 */
function canFormAllMelds(hand, zhong) {
  if (hand.length === 0) return true;

  // 每3张牌组成一个面子，多余的用红中补
  const meldCount = Math.ceil(hand.length / 3);
  const neededZhong = meldCount * 3 - hand.length;

  if (neededZhong > zhong) return false;
  if (neededZhong < 0) return false;

  // 对剩余手牌排序
  const sorted = [...hand].sort((a, b) => a - b);

  // 尝试所有可能的组合
  return tryFormMelds(sorted, zhong);
}

function tryFormMelds(hand, zhong) {
  if (hand.length === 0) return true;
  if (zhong < 0) return false;

  // 剩余需要的面子数
  const meldsNeeded = Math.ceil(hand.length / 3);

  // 取第一张牌
  const first = hand[0];
  let found = false;

  // 1. 尝试刻子 (AAA)
  if (countInHand(hand, first) >= 3) {
    const newHand = removeN(hand, first, 3);
    if (tryFormMelds(newHand, zhong)) return true;
    found = true;
  }

  // 2. 尝试顺子 (ABC) - 只有条筒万
  if (isSuit(first) && getValue(first) <= 7) {
    const s = getSuit(first);
    const v = getValue(first);
    const next1 = s * 10 + v + 1;
    const next2 = s * 10 + v + 2;
    if (hand.includes(next1) && hand.includes(next2)) {
      const newHand = removeTiles(hand, [first, next1, next2]);
      if (tryFormMelds(newHand, zhong)) return true;
      found = true;
    }
  }

  // 3. 尝试用红中代替 - 刻子 (AA + 红中 = AAA)
  if (zhong >= 1 && countInHand(hand, first) >= 2) {
    const newHand = removeN(hand, first, 2);
    if (tryFormMelds(newHand, zhong - 1)) return true;
  }

  // 4. 尝试用红中代替 - 顺子 (A + 红中 = 当B或C)
  if (zhong >= 1 && isSuit(first) && getValue(first) <= 8) {
    const s = getSuit(first);
    const v = getValue(first);
    // 红中当第二个
    if (v <= 7 && hand.includes(s * 10 + v + 2)) {
      const newHand = removeTiles(hand, [first, s * 10 + v + 2]);
      if (tryFormMelds(newHand, zhong - 1)) return true;
    }
    // 红中当第三个
    if (v <= 7 && hand.includes(s * 10 + v + 1)) {
      const newHand = removeTiles(hand, [first, s * 10 + v + 1]);
      if (tryFormMelds(newHand, zhong - 1)) return true;
    }
  }

  // 5. 用红中当第一个位置（跳过第一张，用红中做面子的一部分）
  // 实际上第一张牌无法和红中形成面子，尝试用2个红中补齐
  if (zhong >= 2) {
    const newHand = [...hand];
    const removed = newHand.shift();
    if (tryFormMelds(newHand, zhong - 2)) return true;
  }

  return false;
}

/**
 * 七小对检测
 */
function checkSevenPairs(hand, zhong) {
  const counts = getCountMap(hand);
  let pairs = 0;
  let singles = 0;

  for (const [, cnt] of Object.entries(counts)) {
    pairs += Math.floor(cnt / 2);
    singles += cnt % 2;
  }

  // 每个单张需要1个红中配对（不同牌的单张不能互相配对）
  if (singles > zhong) return false;
  const remainZhong = zhong - singles;
  return pairs + singles + Math.floor(remainZhong / 2) >= 7;
}

/**
 * 碰碰胡检测（所有面子都是刻子）
 */
function checkPengPengHu(hand, zhong) {
  // 先通过标准胡
  if (!checkStandardWin(hand, zhong)) return false;

  const realHand = [...hand];
  // 这部分比较复杂，先使用标准胡 + 后续判断面子类型
  return true; // 在rule.js中细化
}

/**
 * 听牌检测
 * @returns {number[]} 听的牌列表
 */
function getTingCards(hand) {
  const zhong = countZhong(hand);
  const realHand = hand.filter(t => t !== HONGZHONG);
  const tingList = [];
  const allCards = getAllValidTiles();

  for (const card of allCards) {
    const testHand = [...realHand, card].sort((a, b) => a - b);
    if (canWin(testHand, zhong)) {
      tingList.push(card);
    }
  }

  return tingList;
}

/**
 * 缺一色检测：胡牌时不能三门全有
 */
function checkQueYiSe(hand) {
  const suits = new Set();
  for (const t of hand) {
    if (t !== HONGZHONG) {
      suits.add(getSuit(t));
    }
  }
  return suits.size <= 2; // 最多两门
}

/**
 * 扎鸟：胡牌后翻牌计算倍数
 */
function drawBirds(wall, count = 4) {
  const birds = [];
  for (let i = 0; i < count; i++) {
    if (wall.length === 0) break;
    birds.push(wall.pop());
  }
  // 中鸟规则：红中，或1/5/9数字
  const hits = birds.filter(b => {
    if (b === HONGZHONG) return true;
    const v = getValue(b);
    return v === 1 || v === 5 || v === 9;
  });
  return { birds, multiplier: Math.pow(2, hits.length), hits: hits.length };
}
