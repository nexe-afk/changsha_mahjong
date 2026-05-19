// ===== 长沙红中麻将 - 游戏主流程 =====

const gameState = {
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
  huCount: 0,       // 已胡人数
  huPlayers: [],     // 已胡玩家
};

// ===== 游戏启动 =====

function startGame() {
  // 重置状态
  for (let i = 0; i < 4; i++) {
    gameState.players[i].hand = [];
    gameState.players[i].melons = [];
    gameState.players[i].discards = [];
  }
  gameState.wall = shuffle(createWall());
  gameState.currentPlayer = 0;
  gameState.lastDiscard = null;
  gameState.lastDiscardPlayer = -1;
  gameState.isProcessing = false;
  gameState.turnPhase = 'idle';
  gameState.gameOver = false;
  gameState.huCount = 0;
  gameState.huPlayers = [];

  // 发牌
  const hands = deal(gameState.wall);
  for (let i = 0; i < 4; i++) {
    gameState.players[i].hand = hands[i];
  }

  // 玩家1多摸一张（庄家）
  gameState.players[0].hand.push(gameState.wall.pop());
  gameState.players[0].hand.sort((a, b) => a - b);

  updateUI();
  setStatus('游戏开始！你的回合');

  // 检测天胡
  checkTianHu(0);

  // 开始第一个回合
  gameState.currentPlayer = 0;
  enableActions([]);
  selectTile(0); // 选中玩家1的某张牌
}

// ===== 回合控制 =====

async function playerDraw(playerIdx) {
  if (gameState.wall.length === 0) {
    setStatus('流局！没人胡牌');
    endGame();
    return;
  }

  const tile = gameState.wall.pop();
  gameState.players[playerIdx].hand.push(tile);
  gameState.players[playerIdx].hand.sort((a, b) => a - b);

  updateUI();

  if (playerIdx === 0) {
    // 玩家摸牌后检测自摸
    if (checkZiMo(playerIdx)) return;
    setStatus('你的回合，选牌打出');
    enableActions([]);
  } else {
    // AI 摸牌后出牌
    setTimeout(() => aiDraw(playerIdx), 500);
  }
}

function checkZiMo(playerIdx) {
  const player = gameState.players[playerIdx];
  if (canWin(player.hand, countZhong(player.hand))) {
    // 检测是否缺一色
    if (checkQueYiSe(player.hand)) {
      setStatus('自摸！');
      showHuModal(playerIdx, '自摸');
      return true;
    }
  }
  return false;
}

// ===== 天胡检测 =====
function checkTianHu(playerIdx) {
  const player = gameState.players[playerIdx];
  // 天胡：发完牌第一圈就胡
  if (canWin(player.hand, countZhong(player.hand))) {
    if (checkQueYiSe(player.hand)) {
      setStatus('天胡！！');
      showHuModal(playerIdx, '天胡');
      return true;
    }
  }
  return false;
}

// ===== 玩家出牌 =====

function selectTile(playerIdx) {
  if (gameState.currentPlayer !== 0) return;

  const hand = gameState.players[0].hand;
  const handArea = document.getElementById('hand-area');
  handArea.innerHTML = '';

  for (let i = 0; i < hand.length; i++) {
    const tile = hand[i];
    const el = document.createElement('div');
    el.className = 'tile';
    if (tile === HONGZHONG) el.classList.add('zhong');
    el.textContent = decodeTile(tile).name;

    el.addEventListener('click', () => {
      if (gameState.currentPlayer !== 0) return;
      if (gameState.isProcessing) return;

      if (gameState.selectedTile === i) {
        // 点击两次 = 出牌
        playTile(0, i);
      } else {
        // 取消之前的选中
        document.querySelectorAll('#hand-area .tile').forEach(t => t.classList.remove('selected'));
        gameState.selectedTile = i;
        el.classList.add('selected');
      }
    });

    handArea.appendChild(el);
  }
}

function playTile(playerIdx, handIdx) {
  gameState.isProcessing = true;
  const player = gameState.players[playerIdx];
  const tile = player.hand.splice(handIdx, 1)[0];

  player.discards.push(tile);
  gameState.lastDiscard = tile;
  gameState.lastDiscardPlayer = playerIdx;

  gameState.selectedTile = null;
  updateUI();
  setStatus(`玩家${playerIdx + 1}打出 ${decodeTile(tile).name}`);

  // 检测其他玩家是否胡/碰/杠
  const actions = detectActions(playerIdx, tile);

  if (actions.length > 0 && playerIdx !== 0) {
    // AI 玩家决策
    setTimeout(() => {
      for (const pIdx of Object.keys(actions)) {
        const aiAction = aiDecideAction(parseInt(pIdx), tile, actions[pIdx]);
        if (aiAction === 'hu') {
          handleHu(parseInt(pIdx), tile);
          return;
        }
      }
      // 没人要，轮到下家摸牌
      nextTurn((playerIdx + 1) % 4);
    }, 800);
  } else if (actions.length > 0 && playerIdx === 0) {
    // 显示操作按钮给玩家（对家碰杠胡）
    showPlayerActions(actions, tile);
  } else {
    // 没人要，轮到下家
    setTimeout(() => nextTurn((playerIdx + 1) % 4), 300);
  }
}

// ===== 检测操作 =====

function detectActions(discardPlayer, tile) {
  const possibleActions = {};

  for (let i = 1; i <= 3; i++) {
    const pIdx = (discardPlayer + i) % 4;
    if (gameState.huPlayers.includes(pIdx)) continue; // 已胡跳过
    const player = gameState.players[pIdx];
    const actions = [];

    // 胡
    if (canWin([...player.hand, tile], countZhong(player.hand) + 1)) {
      if (checkQueYiSe([...player.hand, tile])) {
        actions.push('hu');
      }
    }

    // 杠（明杠：手上有3张）
    if (countInHand(player.hand, tile) >= 3) {
      actions.push('gang');
    }

    // 碰
    if (countInHand(player.hand, tile) >= 2) {
      actions.push('peng');
    }

    if (actions.length > 0) {
      possibleActions[pIdx] = actions;
    }
  }

  return possibleActions;
}

// ===== 玩家操作按钮 =====

function showPlayerActions(actions, tile) {
  const btnHu = document.getElementById('btn-hu');
  const btnPeng = document.getElementById('btn-peng');
  const btnGang = document.getElementById('btn-gang');
  const btnPass = document.getElementById('btn-pass');

  btnHu.disabled = true;
  btnPeng.disabled = true;
  btnGang.disabled = true;
  btnPass.disabled = true;

  for (const [pIdx, acts] of Object.entries(actions)) {
    if (acts.includes('hu')) btnHu.disabled = false;
    if (acts.includes('peng')) btnPeng.disabled = false;
    if (acts.includes('gang')) btnGang.disabled = false;
  }

  btnPass.disabled = false;

  btnHu.onclick = () => handleHu(parseInt(Object.keys(actions)[0]), tile);
  btnPeng.onclick = () => handlePeng(parseInt(Object.keys(actions)[0]), tile);
  btnGang.onclick = () => handleGang(parseInt(Object.keys(actions)[0]), tile);
  btnPass.onclick = () => {
    disableAllActions();
    nextTurn((gameState.currentPlayer + 1) % 4);
  };
}

function enableActions(actionList) {
  const ids = ['btn-hu', 'btn-peng', 'btn-gang', 'btn-pass'];
  ids.forEach(id => document.getElementById(id).disabled = true);
}

function disableAllActions() {
  const ids = ['btn-hu', 'btn-peng', 'btn-gang', 'btn-pass'];
  ids.forEach(id => document.getElementById(id).disabled = true);
}

// ===== 胡/碰/杠处理 =====

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
  updateUI();
  setStatus(`玩家${playerIdx + 1}碰了 ${decodeTile(tile).name}`);

  gameState.currentPlayer = playerIdx;
  if (playerIdx === 0) {
    selectTile(0);
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
  updateUI();
  setStatus(`玩家${playerIdx + 1}杠了 ${decodeTile(tile).name}`);

  // 杠后补牌
  setTimeout(() => {
    const extraTile = gameState.wall.pop();
    player.hand.push(extraTile);
    player.hand.sort((a, b) => a - b);
    updateUI();

    gameState.currentPlayer = playerIdx;
    if (playerIdx === 0) {
      if (checkZiMo(0)) return;
      selectTile(0);
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

  // AI 摸牌（已经在 playerDraw 里摸过了）
  if (checkZiMo(playerIdx)) return;

  // AI 出牌
  const tileToDiscard = aiDecideDiscard(player.hand, player.melons);
  const handIdx = player.hand.indexOf(tileToDiscard);
  playTile(playerIdx, handIdx);
}

// ===== 切换回合 =====

function nextTurn(playerIdx) {
  gameState.currentPlayer = playerIdx;
  gameState.isProcessing = false;

  // 检查游戏是否结束
  if (gameState.huCount >= 3 || gameState.wall.length === 0) {
    endGame();
    return;
  }

  if (playerIdx === 0) {
    playerDraw(0);
  } else {
    playerDraw(playerIdx);
  }
}

// ===== 胡牌弹窗 =====

function showHuModal(playerIdx, type) {
  gameState.huCount++;
  gameState.huPlayers.push(playerIdx);

  const player = gameState.players[playerIdx];
  const zhong = countZhong(player.hand);
  const huTypes = getHuType(player.hand, player.melons);
  const birds = drawBirds(gameState.wall, RULES.BIRD_COUNT);
  const multiplier = calcMultiplier(huTypes, zhong, birds.multiplier);

  player.score += multiplier;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'hu-modal';
  overlay.innerHTML = `
    <div class="modal">
      <h2>🀄 ${type}！</h2>
      <p>玩家${playerIdx + 1}</p>
      <p>胡牌类型: ${huTypes.map(t => huTypeName(t)).join(' + ') || '平胡'}</p>
      <p>扎鸟: [${birds.birds.map(b => decodeTile(b).name).join(', ')}]</p>
      <p>中鸟: ${birds.hits} 张 (×${birdMultiplierText(birds)})</p>
      <p style="font-size:24px;color:#e74c3c;">得 ${multiplier} 分</p>
      <button class="btn" onclick="closeHuModal(${playerIdx})">继续</button>
    </div>
  `;
  document.body.appendChild(overlay);

  updateUI();

  if (gameState.huCount >= 3) {
    setTimeout(() => endGame(), 2000);
  }
}

function huTypeName(type) {
  const names = {
    'pinghu': '平胡',
    'qixiaodui': '七小对',
    'pengpenghu': '碰碰胡',
    'qingyise': '清一色',
    'tianhu': '天胡',
    'dihu': '地胡',
  };
  return names[type] || type;
}

function birdMultiplierText(birds) {
  if (birds.hits === 0) return '无中';
  return '×' + Math.pow(2, birds.hits);
}

function closeHuModal(playerIdx) {
  const modal = document.getElementById('hu-modal');
  if (modal) modal.remove();
  gameState.isProcessing = false;

  // 血战到底：已胡玩家不再参与，其他人继续
  // 找下一个未胡的玩家
  let next = gameState.currentPlayer;
  for (let i = 1; i <= 3; i++) {
    const candidate = (next + i) % 4;
    if (!gameState.huPlayers.includes(candidate)) {
      nextTurn(candidate);
      return;
    }
  }
  endGame();
}

// ===== 游戏结束 =====

function endGame() {
  gameState.gameOver = true;
  setStatus('游戏结束！');

  setTimeout(() => {
    const scores = gameState.players.map((p, i) =>
      `玩家${i + 1}${i === 0 ? '(你)' : ''}: ${p.score}分`
    ).join('\n');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h2>🏆 游戏结束</h2>
        <pre style="margin:16px 0;font-size:16px;line-height:1.8;">${scores}</pre>
        <button class="btn" onclick="this.closest('.modal-overlay').remove(); startGame();">再来一局</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }, 500);
}

// ===== UI 更新 =====

function updateUI() {
  // 玩家1（你）
  selectTile(0);
  updateMelons(0);
  updateScore(0);

  // AI 玩家
  for (let i = 1; i < 4; i++) {
    updateAIHand(i);
    updateMelons(i);
    updateScore(i);
    updateDiscards(i);
  }

  updateLastDiscard();
  updateWallCount();
}

function updateAIHand(playerIdx) {
  const handEl = document.getElementById(`player${playerIdx + 1}-hand`);
  if (!handEl) return;
  handEl.innerHTML = '';
  const count = gameState.players[playerIdx].hand.length;
  for (let i = 0; i < count; i++) {
    const back = document.createElement('div');
    back.className = 'tile-back';
    handEl.appendChild(back);
  }
}

function updateMelons(playerIdx) {
  const melonEl = document.getElementById(`player${playerIdx + 1}-melons`);
  if (!melonEl) return;
  melonEl.innerHTML = '';
  const player = gameState.players[playerIdx];
  for (const m of player.melons) {
    const group = document.createElement('div');
    group.style.display = 'inline-flex';
    group.style.marginRight = '4px';
    for (const t of m.tiles) {
      const el = document.createElement('div');
      el.className = 'tile';
      el.style.width = '22px';
      el.style.height = '30px';
      el.style.fontSize = '10px';
      el.style.margin = '-1px';
      if (t === HONGZHONG) el.classList.add('zhong');
      el.textContent = decodeTile(t).name;
      group.appendChild(el);
    }
    melonEl.appendChild(group);
  }
}

function updateScore(playerIdx) {
  const scoreEl = document.querySelector(`#player${playerIdx + 1}-info .player-score`);
  if (scoreEl) {
    scoreEl.textContent = gameState.players[playerIdx].score;
  }
}

function updateDiscards(playerIdx) {
  const discEl = document.getElementById(`player${playerIdx + 1}-discards`);
  if (!discEl) return;
  discEl.innerHTML = '';
  const discards = gameState.players[playerIdx].discards;
  // 只显示最近几张
  const recent = discards.slice(-8);
  for (const t of recent) {
    const el = document.createElement('div');
    el.className = 'tile';
    el.style.width = '20px';
    el.style.height = '28px';
    el.style.fontSize = '8px';
    el.style.margin = '-1px';
    if (t === HONGZHONG) el.classList.add('zhong');
    el.textContent = decodeTile(t).name;
    discEl.appendChild(el);
  }
}

function updateLastDiscard() {
  const area = document.getElementById('last-discard-area');
  if (!area) return;
  area.innerHTML = '';
  if (gameState.lastDiscard !== null) {
    const el = document.createElement('div');
    el.className = 'tile';
    if (gameState.lastDiscard === HONGZHONG) el.classList.add('zhong');
    el.textContent = decodeTile(gameState.lastDiscard).name;
    el.style.fontSize = '18px';
    el.style.width = '48px';
    el.style.height = '64px';
    area.appendChild(el);
  }
}

function updateWallCount() {
  const status = document.getElementById('game-status');
  // count is shown via setStatus
}

function setStatus(msg) {
  const status = document.getElementById('game-status');
  if (status) {
    status.textContent = `${msg} | 余牌: ${gameState.wall.length}`;
  }
}

// ===== 启动游戏 =====

window.onload = function() {
  startGame();
};
