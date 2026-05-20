# 长沙红中麻将

> 纯前端 JavaScript 实现的长沙红中麻将，单 HTML 文件，无后端依赖。
> PixiJS 8 渲染 + 完整算法层 + AI 对手 + 动态难度。

[![GitHub](https://img.shields.io/badge/GitHub-changsha_mahjong-181717?logo=github)](https://github.com/nexe-afk/changsha_mahjong)
![GitHub last commit](https://img.shields.io/github/last-commit/nexe-afk/changsha_mahjong)

---

## 快速开始

```bash
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

或者直接双击 `index.html`（部分浏览器需要本地服务器才能加载 PixiJS CDN）。

---

## 玩法规则

4人游戏，112张牌（条/筒/万各36张 + 红中4张）。

### 长沙特色规则

| 规则 | 说明 |
| ---- | ---- |
| 红中万能 | 红中可替代任意一张牌，用于组成面子或将眼 |
| 血战到底 | 第一人胡牌后继续，直到3人胡牌才结束 |
| 缺一色 | 胡牌时手牌最多只能有两门花色 |
| 扎鸟 | 每次胡牌后翻4张牌，翻到1/5/9/红中各×2倍 |
| 天胡 | 发牌后直接胡，倍率×8 |

### 胡牌牌型与倍数

| 牌型 | 倍数 | 说明 |
| ---- | ---- | ---- |
| 平胡 | ×1 | 标准 4面子+1将 |
| 七小对 | ×2 | 7个对子 |
| 碰碰胡 | ×2 | 所有面子均为刻子 |
| 清一色 | ×4 | 手牌只含一门花色（红中不算） |
| 天胡 | ×8 | 起手即胡 |

牌型可叠加相乘，例如清一色七小对 = ×8，再扎2鸟 = ×32。单局上限 1024 分。

### 操作

- 点击手牌选中（牌会上移高亮）→ 再次点击或按 `Enter`/`Space` 打出
- `←` `→` 方向键切换选中牌
- 碰/杠/胡按钮亮起时点击即可；点"过"跳过
- 首次打开会有3步新手引导

---

## 项目结构

```
changsha_mahjong/
│
├── index.html                     入口（89行）
│
├── js/                            算法层 — 纯逻辑，无 DOM/引擎依赖
│   ├── core.js        (180行)     牌编码、牌墙、发牌、工具函数、gameState
│   ├── hu.js          (240行)     胡牌判定（标准胡/七小对/红中万能）、听牌检测、扎鸟
│   ├── rule.js        (144行)     牌型检测（清一色/碰碰胡）、倍数计算
│   ├── ai.js          (107行)     AI 出牌评分、碰/杠/胡决策、三档难度参数
│   ├── difficulty.js  (152行)     PlayerTracker、adjustDifficulty、DDAManager
│   ├── ai_logger.js   ( 95行)     AI 决策日志，window.AI_DEBUG=true 开启
│   ├── game-feel.js   (213行)     选牌高亮、出牌抛物线、碰杠闪光、胡牌特效、中鸟粒子
│   ├── tutorial.js    (265行)     新手引导（3步遮罩）、操作反馈、触屏适配
│   └── test_suite.js  (266行)     67个断言测试，node js/test_suite.js 可直接运行
│
├── engine/                        引擎层 — PixiJS 8 渲染
│   ├── tile.js        (209行)     3D 浮雕麻将牌（阴影/光晕/红中特殊样式）
│   ├── animation.js   (263行)     Tween 缓动系统（easeOutBack/Elastic/Bounce）
│   ├── scenes.js      (500行)     牌桌、手牌布局、弹窗、分数渲染
│   ├── flow.js        (214行)     回合控制、出牌、碰/杠/胡逻辑
│   ├── game_engine.js (204行)     引擎主控、键鼠绑定、UI 更新
│   ├── sound.js       ( 89行)     Web Audio API 音效（零文件依赖）
│   └── renderer.js    ( 12行)     渲染桥接占位
│
├── claude_prompts/                Claude 4.7 开发提示词（13个模块）
├── docs/                          运营文档（支付手册、经济仪表板设计）
└── engine/prompts/                历史 Codex 提示词存档（49条）
```

---

## 技术实现

### 算法层

- 胡牌判定采用「先七小对 O(n) → 再标准胡回溯」两阶段策略，参考 [q_algorithm](https://github.com/yuanfengyun/q_algorithm) 的优化思路
- 红中万能牌在回溯中作为通配符展开：补刻子(AA+H)、补顺子(A+H+C / AB+H)
- 七小对算法修正了「不同花色单张不可互相配对」的逻辑错误
- 听牌检测：遍历28种牌逐张插入后调用 `canWin`

### AI 策略

参考 [mahjong-helper](https://github.com/EndlessCheng/mahjong-helper) 的评分体系：

- 出牌：对每张手牌计算「成对+20 / 两面搭+15 / 听牌+30 / 边张-5」综合分，取最低分打出
- 红中永不打出（分值 -9999）
- 决策优先级：能胡必胡 > 有利则碰/杠 > pass

### 动态难度（DDA）

连胜 ≥3 局或平均分 >20 自动升级；连败 ≥3 局或平均分 <5 自动降级。数据持久化到 `localStorage`，刷新后保持。

| 难度 | 随机出牌率 | 碰牌阈值 | 盲胡概率 |
| ---- | ---- | ---- | ---- |
| easy | 30% | 5 | 30% |
| normal | 5% | 3 | 5% |
| hard | 0% | 1 | 0% |

### 技术栈

| 层 | 方案 |
| ---- | ---- |
| 渲染 | PixiJS 8 (WebGL 2D) CDN |
| 语言 | JavaScript ES6+，无构建工具 |
| 音效 | Web Audio API，零音频文件 |
| 动画 | 自建 Tween（easeOutBack/Elastic/Bounce） |
| 持久化 | localStorage |

---

## 调试

```javascript
// 浏览器控制台开启 AI 决策日志（console.table 格式）
window.AI_DEBUG = true

// 重置新手引导
TutorialManager.reset()

// 重置难度记录
DDAManager.tracker.reset()
```

### 运行测试（需 Node.js）

```bash
node js/test_suite.js
# 测试完成: 67 个  ✅ 67 通过  ❌ 0 失败
```

---

## License

MIT
