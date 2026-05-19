// ===== 游戏流程（引擎版） =====

// 游戏状态移到 core.js 里
if (typeof gameState === 'undefined') {
  var gameState = {
    wall: [],
    players: [
      { hand: [], melons: [], discards: [], score: 0, isHuman: true },
      { hand: [], melons: [], discards: [], score: 0, isHuman: false },
      { hand: [], melons: [], discards: [], score: 0, isHuman: false },
      { hand: [], melons: [], discards: [], score: 0, isHuman: false },
    ],
    currentPlayer: 0,
    lastDiscard: null,
    lastDiscardPlayer: -1,
    isProcessing: false,
    turnPhase: 'idle',
    selectedTile: null,
    gameOver: false,
    huCount: 0,
    huPlayers: [],
  };
}

// ===== 回合控制 =====

function playerDraw(playerIdx) {
  if (gameState.wall.length === 0) {
    setStatus('流局！');
    endGame();
    return;
  }

  const tile = gameState.wall.pop();
  gameState.players[playerIdx].hand.push(tile);
  gameState.players[playerIdx].hand.sort((a, b) => a - b);

  if (playerIdx === 0) {
    if (checkZiMo(playerIdx)) return;
    setStatus('你的回合，选牌打出');
    gameState.turnPhase = 'idle';
  } else {
    setStatus(`AI 玩家${playerIdx + 1} 摸牌`);
    setTimeout(() => aiDraw(playerIdx), 500);
  }
}

function checkZiMo(playerIdx) {
  const player = gameState.players[playerIdx];
  if (canWin(player.hand, countZhong(player.hand))) {
    if (checkQueYiSe(player.hand)) {
      setStatus('自摸！');
      showHuModal(playerIdx, '自摸');
      return true;
    }
  }
  return false;
}

function checkTianHu(playerIdx) {
  const player = gameState.players[playerIdx];
  if (canWin(player.hand, countZhong(player.hand))) {
    if (checkQueYiSe(player.hand)) {
      setStatus('天胡！！');
      showHuModal(playerIdx, '天胡');
      return true;
    }
  }
  return false;
}

// ===== 出牌 =====

function playTile(playerIdx, handIdx) {
  gameState.isProcessing = true;
  const player = gameState.players[playerIdx];
  const tile = player.hand.splice(handIdx, 1)[0];

  player.discards.push(tile);
  gameState.lastDiscard = tile;
  gameState.lastDiscardPlayer = playerIdx;
  gameState.selectedTile = null;

  setStatus(`玩家${playerIdx + 1}打出 ${decodeTile(tile).name}`);

  const actions = detectActions(playerIdx, tile);

  if (Object.keys(actions).length > 0) {
    if (playerIdx !== 0) {
      setTimeout(() => {
        for (const pIdx of Object.keys(actions)) {
          const aiAction = aiDecideAction(parseInt(pIdx), tile, actions[pIdx]);
          if (aiAction === 'hu') {
            handleHu(parseInt(pIdx), tile);
            return;
          }
        }
        nextTurn((playerIdx + 1) % 4);
      }, 800);
    } else {
      gameState.turnPhase = 'waiting_action';
      showPlayerActions(actions, tile);
    }
  } else {
    setTimeout(() => nextTurn((playerIdx + 1) % 4), 300);
  }
}

// ===== 检测操作 =====

function detectActions(discardPlayer, tile) {
  const possibleActions = {};
  for (let i = 1; i <= 3; i++) {
    const pIdx = (discardPlayer + i) % 4;
    if (gameState.huPlayers.includes(pIdx)) continue;
    const player = gameState.players[pIdx];
    const actions = [];

    if (canWin([...player.hand, tile], countZhong(player.hand) + 1)) {
      if (checkQueYiSe([...player.hand, tile])) {
        actions.push('hu');
      }
    }
    if (countInHand(player.hand, tile) >= 3) {
      actions.push('gang');
    }
    if (countInHand(player.hand, tile) >= 2) {
      actions.push('peng');
    }
    if (actions.length > 0) {
      possibleActions[pIdx] = actions;
    }
  }
  return possibleActions;
}

// ===== 胡/碰/杠 =====

function handleHu(playerIdx, tile) {
  const player = gameState.players[playerIdx];
  player.hand.push(tile);
  player.hand.sort((a, b) => a - b);
  showHuModal(playerIdx, '点炮');
}

function handlePeng(playerIdx, tile) {
  const player = gameState.players[playerIdx];
  player.hand = removeN(player.hand, tile, 2);
  player.melons.push({ type: 'peng', tile, tiles: [tile, tile, tile] });

  disableAllActions();
  setStatus(`玩家${playerIdx + 1}碰了 ${decodeTile(tile).name}`);

  gameState.currentPlayer = playerIdx;
  gameState.isProcessing = false;
  if (playerIdx === 0) {
    setStatus('碰！出牌');
  } else {
    setTimeout(() => aiDraw(playerIdx), 500);
  }
}

function handleGang(playerIdx, tile) {
  const player = gameState.players[playerIdx];
  player.hand = removeN(player.hand, tile, 3);
  player.melons.push({ type: 'gang', tile, tiles: [tile, tile, tile, tile] });

  disableAllActions();
  setStatus(`玩家${playerIdx + 1}杠了 ${decodeTile(tile).name}`);

  setTimeout(() => {
    const extraTile = gameState.wall.pop();
    player.hand.push(extraTile);
    player.hand.sort((a, b) => a - b);

    gameState.currentPlayer = playerIdx;
    gameState.isProcessing = false;
    if (playerIdx === 0) {
      if (checkZiMo(0)) return;
      setStatus('杠后补牌，出牌');
    } else {
      setTimeout(() => aiDraw(playerIdx), 500);
    }
  }, 600);
}

// ===== AI 回合 =====

function aiDraw(playerIdx) {
  const player = gameState.players[playerIdx];
  gameState.isProcessing = true;

  if (checkZiMo(playerIdx)) return;

  setTimeout(() => {
    const tileToDiscard = aiDecideDiscard(player.hand, player.melons);
    const handIdx = player.hand.indexOf(tileToDiscard);
    playTile(playerIdx, handIdx);
  }, 600);
}

// ===== 切换回合 =====

function nextTurn(playerIdx) {
  gameState.currentPlayer = playerIdx;
  gameState.isProcessing = false;

  if (gameState.huCount >= 3 || gameState.wall.length === 0) {
    endGame();
    return;
  }

  playerDraw(playerIdx);
}
