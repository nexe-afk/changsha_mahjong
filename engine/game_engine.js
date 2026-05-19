// ===== 🎮 游戏引擎主控（专业版） =====

class GameEngine {
  constructor(app) {
    this.app = app;
    this.scene = null;
  }

  init() {
    this.scene = new GameScene(this.app);
    window._engine = this;
  }

  start() {
    startGame();
    this.app.ticker.add(() => {
      this.scene.renderScores();
      this.scene.highlightPlayer(gameState.currentPlayer);
    });
  }
}

window._engine = null;

// ===== 渲染 =====
function updateUI() {
  const scene = window._engine?.scene;
  if (!scene) return;
  scene.cleanTiles();
  for (let i = 0; i < 4; i++) {
    scene.renderHand(i, gameState.players[i].hand, i === 0, i === 0 ? gameState.selectedTile : -1);
    scene.renderMelons(i, gameState.players[i].melons);
  }
  scene.renderCenterDiscard(gameState.lastDiscard);
}

function selectTile(playerIdx) {
  if (playerIdx !== 0 || gameState.isProcessing) return;
  const scene = window._engine?.scene;
  if (scene) scene.renderHand(0, gameState.players[0].hand, true, gameState.selectedTile);
}

function setStatus(msg) {
  const scene = window._engine?.scene;
  if (scene) scene.setStatus(msg);
}

function enableActions() {}
function disableAllActions() {
  const scene = window._engine?.scene;
  if (scene) scene.hideActions();
}

function showPlayerActions(actions, tile) {
  const scene = window._engine?.scene;
  if (!scene) return;
  const allActions = [];
  for (const [, acts] of Object.entries(actions)) allActions.push(...acts);
  const unique = [...new Set(allActions)];
  sound.click();
  scene.showActions(unique, (action) => {
    gameState.turnPhase = 'idle';
    const targetIdx = parseInt(Object.keys(actions)[0]);
    sound.click();
    switch (action) {
      case 'hu':   handleHu(targetIdx, tile); break;
      case 'peng': handlePeng(targetIdx, tile); break;
      case 'gang': handleGang(targetIdx, tile); break;
      case 'pass': nextTurn((gameState.currentPlayer + 1) % 4); break;
    }
  });
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

  const scene = window._engine?.scene;
  if (scene) {
    Anim.celebrate(scene.layers.particles, scene.W / 2, scene.H / 2);
    setTimeout(() => Anim.celebrate(scene.layers.particles, scene.W * 0.3, scene.H * 0.3), 400);
    setTimeout(() => Anim.celebrate(scene.layers.particles, scene.W * 0.7, scene.H * 0.7), 800);
    Anim.scorePopup(scene.layers.particles, scene.W / 2, scene.H / 2 - 140, `+${multiplier}`, 0xf1c40f);
    scene.showModal(
      `🎉 ${type}！`,
      [
        `玩家${playerIdx + 1}${playerIdx === 0 ? ' (你)' : ''}`,
        `胡牌: ${huTypes.map(t => huTypeName(t)).join(' + ') || '平胡'}`,
        `扎鸟: [${birds.birds.map(b => decodeTile(b).name).join(', ')}]`,
        `中 ${birds.hits} 鸟 → ×${Math.pow(2, birds.hits)}`,
        `🏆 得分: ${multiplier}`,
      ],
      '继续 ▶',
      () => {
        if (gameState.huCount >= 3) { endGame(); return; }
        let n = gameState.currentPlayer;
        for (let i = 1; i <= 3; i++) {
          const c = (n + i) % 4;
          if (!gameState.huPlayers.includes(c)) { nextTurn(c); return; }
        }
        endGame();
      }
    );
  }
}

function endGame() {
  gameState.gameOver = true;
  setStatus('🏆 游戏结束！');
  const scene = window._engine?.scene;
  if (scene) {
    for (let i = 0; i < 3; i++)
      setTimeout(() => Anim.celebrate(scene.layers.particles, scene.W * (0.2 + 0.6 * Math.random()), scene.H * (0.2 + 0.6 * Math.random())), i * 400);
    setTimeout(() => {
      const scores = gameState.players.map((p, i) => `玩家${i + 1}${i === 0 ? ' (你)' : ''}: ${p.score} 分`);
      scene.showModal('🏆 游戏结束', scores, '再来一局', () => { scene.cleanTiles(); startGame(); });
    }, 1500);
  }
}

// ===== 启动 =====
function startGame() {
  for (const p of gameState.players) {
    p.hand = []; p.melons = []; p.discards = []; p.score = 0;
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
  gameState.selectedTile = null;

  const hands = deal(gameState.wall);
  for (let i = 0; i < 4; i++) gameState.players[i].hand = hands[i];
  gameState.players[0].hand.push(gameState.wall.pop());
  gameState.players[0].hand.sort((a, b) => a - b);

  updateUI();
  setStatus('🎯 长沙红中麻将 · 点击选牌打出');
  checkTianHu(0);
  gameState.currentPlayer = 0;
  bindTileClicks();
  bindKeyboard();
}

// ===== 键鼠绑定 =====
function bindTileClicks() {
  const scene = window._engine?.scene;
  if (!scene) return;
  const layer = scene.layers.tiles;
  layer.eventMode = 'static';
  layer.removeAllListeners('pointerdown');
  layer.on('pointerdown', (e) => {
    if (gameState.currentPlayer !== 0 || gameState.isProcessing) return;
    let target = e.target;
    while (target && (target.tileIndex === undefined || !target.draggable)) target = target.parent;
    if (!target || target.tileIndex === undefined) return;
    if (gameState.selectedTile === target.tileIndex) {
      playTile(0, target.tileIndex);
    } else {
      gameState.selectedTile = target.tileIndex;
      sound.click();
      updateUI();
    }
  });
}

function bindKeyboard() {
  document.removeEventListener('keydown', handleKeyDown);
  document.addEventListener('keydown', handleKeyDown);
}

function handleKeyDown(e) {
  if (gameState.currentPlayer !== 0 || gameState.isProcessing) return;
  const hand = gameState.players[0].hand;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (gameState.selectedTile !== null) playTile(0, gameState.selectedTile);
    return;
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    gameState.selectedTile = Math.max(0, (gameState.selectedTile || 0) - 1);
    updateUI();
    return;
  }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    gameState.selectedTile = Math.min(hand.length - 1, (gameState.selectedTile || 0) + 1);
    updateUI();
    return;
  }
}
