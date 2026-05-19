// ===== 游戏引擎主控 - PixiJS 版 =====

class GameEngine {
  constructor(app) {
    this.app = app;
    this.scene = null;
    this.renderer = null;
  }

  init() {
    this.scene = new GameScene(this.app);
    this.renderer = new GameRenderer(this.app, this.scene);
  }

  start() {
    startGame();
    this.app.ticker.add(() => this.tick());
  }

  tick() {
    this.renderer.render();
  }
}

// ===== 覆盖 UI 函数为 PixiJS 版本 =====

function updateUI() {
  const gs = gameState;
  const scene = window._engine?.scene;
  if (!scene) return;

  for (let i = 0; i < 4; i++) {
    scene.renderPlayerHand(i, gs.players[i].hand, i === 0, i === 0 ? gs.selectedTile : -1);
    scene.renderMelons(i, gs.players[i].melons);
  }
  scene.renderCenterDiscard(gs.lastDiscard);
}

function selectTile(playerIdx) {
  if (playerIdx !== 0 || gameState.currentPlayer !== 0) return;
  const scene = window._engine?.scene;
  if (scene) scene.renderPlayerHand(0, gameState.players[0].hand, true, gameState.selectedTile);
}

function setStatus(msg) {
  const scene = window._engine?.scene;
  if (scene) scene.setStatus(msg);
}

function enableActions(list) {}
function disableAllActions() {
  const scene = window._engine?.scene;
  if (scene) scene.hideActionButtons();
}

function showPlayerActions(actions, tile) {
  const scene = window._engine?.scene;
  if (!scene) return;

  const allActions = [];
  for (const [, acts] of Object.entries(actions)) {
    allActions.push(...acts);
  }
  const unique = [...new Set(allActions)];

  scene.showActionButtons(unique, (action) => {
    const targetIdx = parseInt(Object.keys(actions)[0]);
    switch (action) {
      case 'hu':  handleHu(targetIdx, tile); break;
      case 'peng': handlePeng(targetIdx, tile); break;
      case 'gang': handleGang(targetIdx, tile); break;
      case 'pass':
        disableAllActions();
        nextTurn((gameState.currentPlayer + 1) % 4);
        break;
    }
  });
}

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
    const lines = [
      `玩家${playerIdx + 1}${playerIdx === 0 ? ' (你)' : ''}`,
      `胡牌: ${huTypes.map(t => huTypeName(t)).join(' + ') || '平胡'}`,
      `扎鸟: [${birds.birds.map(b => decodeTile(b).name).join(', ')}]`,
      `中 ${birds.hits} 鸟 → ×${Math.pow(2, birds.hits)}`,
      `🏆 得分: ${multiplier}`,
    ];
    scene.showModal(`${type}！`, lines, '继续', () => {
      if (gameState.huCount >= 3) { endGame(); return; }
      let next = gameState.currentPlayer;
      for (let i = 1; i <= 3; i++) {
        const c = (next + i) % 4;
        if (!gameState.huPlayers.includes(c)) { nextTurn(c); return; }
      }
      endGame();
    });
  }
}

function endGame() {
  gameState.gameOver = true;
  setStatus('游戏结束！');
  setTimeout(() => {
    const scores = gameState.players.map((p, i) => `玩家${i + 1}${i === 0 ? '(你)' : ''}: ${p.score}分`);
    const scene = window._engine?.scene;
    if (scene) scene.showModal('🏆 游戏结束', scores, '再来一局', () => startGame());
  }, 500);
}

// ===== 重写 playTile（加出牌动画） =====
const __playTile = playTile;
playTile = function(playerIdx, handIdx) {
  gameState.isProcessing = true;
  const player = gameState.players[playerIdx];
  const tile = player.hand.splice(handIdx, 1)[0];

  player.discards.push(tile);
  gameState.lastDiscard = tile;
  gameState.lastDiscardPlayer = playerIdx;
  gameState.selectedTile = null;

  setStatus(`玩家${playerIdx + 1}打出 ${decodeTile(tile).name}`);
  updateUI();

  const actions = detectActions(playerIdx, tile);

  if (Object.keys(actions).length > 0) {
    if (playerIdx !== 0) {
      setTimeout(() => {
        for (const pIdx of Object.keys(actions)) {
          if (aiDecideAction(parseInt(pIdx), tile, actions[pIdx]) === 'hu') {
            handleHu(parseInt(pIdx), tile); return;
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
};

// ===== 重写 startGame =====
const __startGame = startGame;
startGame = function() {
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
  setStatus('游戏开始！你的回合，点击选牌再点击打出');
  checkTianHu(0);
  gameState.currentPlayer = 0;

  // 绑定手牌点击
  setupTileClickHandler();
};

function setupTileClickHandler() {
  const scene = window._engine?.scene;
  if (!scene) return;

  scene.tileLayer.eventMode = 'static';
  scene.tileLayer.on('pointerdown', (e) => {
    if (gameState.currentPlayer !== 0 || gameState.isProcessing) return;

    let target = e.target;
    while (target && (target.tileIndex === undefined || !target.draggable)) {
      target = target.parent;
    }
    if (!target || target.tileIndex === undefined) return;

    if (gameState.selectedTile === target.tileIndex) {
      playTile(0, target.tileIndex);
    } else {
      gameState.selectedTile = target.tileIndex;
      updateUI();
    }
  });
}

// ===== 初始化 =====
window._engine = null;
const __init = GameEngine.prototype.init;
GameEngine.prototype.init = function() {
  __init.call(this);
  window._engine = this;
};
