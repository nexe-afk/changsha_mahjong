// ===== 长沙红中麻将 - AI 逻辑 =====

// 三档难度参数（供 difficulty.js 的 DDAManager 使用）
function getDifficultyParams(level) {
  const presets = {
    easy:   { discardNoise: 0.3,  pengThreshold: 5, huBlindChance: 0.3 },
    normal: { discardNoise: 0.05, pengThreshold: 3, huBlindChance: 0.05 },
    hard:   { discardNoise: 0,    pengThreshold: 1, huBlindChance: 0 },
  };
  return presets[level] || presets.normal;
}


/**
 * AI 出牌决策
 */
function aiDecideDiscard(hand, melons) {
  const zhong = countZhong(hand);
  const realHand = hand.filter(t => t !== HONGZHONG);

  // 红中永远不打
  if (realHand.length === 0) return HONGZHONG; // 只有红中...

  // 计算每张牌的价值分数
  const scores = {};
  for (const tile of realHand) {
    let score = 0;

    // 1. 成对价值 +20
    if (countInHand(realHand, tile) >= 2) score += 20;

    // 2. 成顺价值
    if (isSuit(tile)) {
      const v = getValue(tile);
      const s = getSuit(tile);

      // 左右的搭子
      if (v > 1 && realHand.includes(s * 10 + v - 1)) score += 10;
      if (v < 9 && realHand.includes(s * 10 + v + 1)) score += 10;
      if (v > 1 && v < 9 &&
          realHand.includes(s * 10 + v - 1) &&
          realHand.includes(s * 10 + v + 1)) {
        score += 15; // 一进一听的好牌
      }
    }

    // 3. 边张分值低
    if (isSuit(tile)) {
      const v = getValue(tile);
      if (v === 1 || v === 9) score -= 5;
    }

    // 4. 听牌检查
    const testHand = [...realHand];
    const idx = testHand.indexOf(tile);
    testHand.splice(idx, 1);
    const tingCards = getTingCards([...testHand, ...hand.filter(t => t === HONGZHONG)]);
    if (tingCards.length > 0) score += 30 + tingCards.length * 5;

    // 5. 正在碰的牌不留（如果已经碰了某张牌）
    for (const m of melons || []) {
      if (m.tile === tile) score -= 10;
    }

    scores[tile] = score;
  }

  // 选分数最低的牌出
  let minScore = Infinity;
  let bestTile = realHand[0];
  for (const [tile, score] of Object.entries(scores)) {
    if (score < minScore) {
      minScore = score;
      bestTile = parseInt(tile);
    }
  }

  return bestTile;
}

/**
 * AI 碰/杠/胡决策
 */
function aiDecideAction(playerIdx, tile, actions) {
  const player = gameState.players[playerIdx];

  // 能胡一定胡
  if (actions.includes('hu') && canWin([...player.hand, tile], countZhong(player.hand) + 1)) {
    return 'hu';
  }

  // 能杠看情况
  if (actions.includes('gang')) {
    // 明杠/补杠: 如果杠后牌型还好的话
    return 'gang';
  }

  // 能碰看是否有利于凑胡
  if (actions.includes('peng')) {
    const testHand = removeTiles(player.hand, [tile, tile]);
    const ting = getTingCards(testHand);
    if (ting.length > 0) return 'peng';
    return 'pass'; // AI 碰的意愿较低
  }

  return 'pass';
}
