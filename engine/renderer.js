// ===== PixiJS 渲染器 - 负责更新画面 =====

class GameRenderer {
  constructor(app, scene) {
    this.app = app;
    this.scene = scene;
  }

  render() {
    const gs = gameState;

    // 更新玩家手牌
    for (let i = 0; i < 4; i++) {
      this.scene.renderPlayerHand(
        i,
        gs.players[i].hand,
        i === 0,
        i === 0 ? gs.selectedTile : -1
      );
      this.scene.renderMelons(i, gs.players[i].melons);
    }

    // 更新中心出牌
    this.scene.renderCenterDiscard(gs.lastDiscard);

    // 更新状态文字
    const statusMsg = this.getStatusMessage();
    this.scene.setStatus(statusMsg);
  }

  getStatusMessage() {
    const gs = gameState;
    if (gs.gameOver) return '游戏结束 🏆';
    if (gs.turnPhase === 'waiting_action') return '选择操作：胡/碰/杠/过';
    const current = gs.currentPlayer;
    if (current === 0) return '你的回合，点击选牌→再点击打出';
    return `AI 玩家${current + 1} 思考中...`;
  }
}
