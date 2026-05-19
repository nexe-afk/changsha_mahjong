// ===== 渲染桥接 =====

class GameRenderer {
  constructor(app, scene) {
    this.app = app;
    this.scene = scene;
  }

  render() {
    // 由 game_engine 的 ticker 接管
  }
}
