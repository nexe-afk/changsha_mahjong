# 长沙红中麻将 · 3 天极速开发技术文档

## 📅 时间线

| 天 | 任务 | 产出 |
|---|------|------|
| Day 1 | 核心算法 + 牌型逻辑 | 胡牌判定、AI 出牌、测试 |
| Day 2 | 游戏框架 + UI | 完整可玩的单机版 |
| Day 3 | 打磨 + 多端适配 | 发布到 Web/小游戏 |

---

## 三、技术栈

```
前端: HTML + CSS + JavaScript (纯静态，不依赖框架)
渲染: Canvas (牌面绘制)
打包: 单 HTML 文件，或托管 GitHub Pages
```

**为什么选纯前端？**
- 3 天内不需要后端联机，省去服务器时间
- 单 HTML 可直接运行，零部署成本
- 日后可快速迁移到微信小游戏

---

## 四、项目结构

```
majiang/
├── index.html          ← 入口（单页面）
├── css/
│   └── style.css       ← 布局、牌面、动画
├── js/
│   ├── core.js         ← 核心：牌定义、牌墙、洗牌
│   ├── hu.js           ← 胡牌判定算法（最重要！）
│   ├── ai.js           ← AI 出牌逻辑
│   ├── rule.js         ← 长沙红中规则
│   └── game.js         ← 游戏流程控制
└── assets/
    └── tiles/          ← 牌面图片（可svg自绘）
```

---

## 五、核心数据结构

### 3.1 牌定义

```javascript
// 条=0, 筒=1, 万=2, 风=3, 中=4
// value: 1-9 (条筒万), 1-4 (东南西北), 1 (红中)
const TILES = {
  SUIT: ['tiao', 'tong', 'wan'],
  WIND: ['dong', 'nan', 'xi', 'bei'],
  ZHONG: 'zhong'
}

// 每张牌用数字编码：suit*10 + value
// 条1 = 1, 条2 = 2, ..., 条9 = 9
// 筒1 = 11, ..., 筒9 = 19
// 万1 = 21, ..., 万9 = 29
// 中 = 40
const HONGZHONG = 40;
```

### 3.2 游戏状态

```javascript
const gameState = {
  wall: [],             // 牌墙（已洗牌）
  players: [
    { hand: [], melds: [], discards: [], isHuman: true },
    { hand: [], melds: [], discards: [], isHuman: false },
    { hand: [], melds: [], discards: [], isHuman: false },
    { hand: [], melds: [], discards: [], isHuman: false },
  ],
  currentPlayer: 0,
  turnPhase: 'draw',   // draw | play | hu
  lastDiscard: null,
  zhongCount: 4,       // 剩余红中数量
}
```

### 3.3 明牌/暗牌/碰杠

```javascript
// meld 类型
const MELD_TYPE = {
  PENG: 'peng',       // 碰
  MING_GANG: 'mgang', // 明杠
  AN_GANG: 'angang',  // 暗杠
  BU_GANG: 'bugang',  // 补杠
  CHI: 'chi',         // 吃（长沙红中不吃）
}
```

---

## 六、🏆 胡牌算法（Day 1 最核心）

### 4.1 算法设计

长沙红中麻将有三种胡牌型：

```
血战到底，红中可当万能牌
1. 标准胡: 4个面子(顺子/刻子) + 1个将眼
2. 七小对: 7个对子
3. 碰碰胡: 4个刻子 + 1个将眼（所有面子都是刻子）
```

### 4.2 标准胡判定（回溯法）

```javascript
// hand: 已排序的手牌数组, zhong: 可用红中数量
function canWin(hand, zhong) {
  // 1. 优先检测七小对
  if (checkSevenPairs(hand, zhong)) return true;

  // 2. 标准胡（含碰碰胡）
  // 遍历所有可能的将眼
  const pairs = findPairs(hand);
  for (let pair of pairs) {
    let remain = removePair(hand, pair);
    if (canFormMelds(remain, zhong)) return true;
  }

  return false;
}

// 检查能否组成 N 个面子
function canFormMelds(hand, zhong) {
  if (hand.length === 0 && zhong >= 0) return true;
  if (hand.length === 0) return false;

  // 如果有红中，尝试用红中补位
  // 策略: 优先用真牌，万不得已才用红中

  const first = hand[0];

  // 尝试刻子（AAA）
  if (countInHand(hand, first) >= 3) {
    const newHand = remove3(hand, first);
    if (canFormMelds(newHand, zhong)) return true;
  }

  // 尝试顺子（ABC），只有条筒万能组顺子
  if (isSuit(first) && hasSequential(hand, first)) {
    const newHand = removeSeq(hand, first);
    if (canFormMelds(newHand, zhong)) return true;
  }

  // 尝试用红中当 wild card
  if (zhong > 0) {
    // 红中代替第一张形成刻子/顺子
    if (canFormMelds(hand.slice(1), zhong - 1)) return true;
  }

  // 如果第一张是红中，跳过
  if (first === HONGZHONG) {
    if (canFormMelds(hand.slice(1), zhong - 1)) return true;
  }

  return false;
}
```

### 4.3 听牌检测

```javascript
function getTingCards(hand, zhong) {
  const tingList = [];
  const allCards = getAllValidTiles();

  for (let card of allCards) {
    let testHand = [...hand, card];
    if (canWin(testHand, zhong)) {
      tingList.push(card);
    }
  }

  return tingList;
}
```

### 4.4 七小对检测

```javascript
function checkSevenPairs(hand, zhong) {
  const pairs = [];
  const counts = getCountMap(hand);

  for (let [card, count] of counts) {
    pairs.push(Math.floor(count / 2));
  }

  const pairCount = pairs.reduce((a, b) => a + b, 0);
  const remain = hand.length - pairCount * 2;

  // 需要 7 对，缺的用红中补
  return pairCount + zhong >= 7;
}
```

---

## 七、🤖 AI 策略（Day 1 下午）

### 5.1 出牌策略

```javascript
function aiDiscard(hand, melds, zhongCount) {
  // 1. 计算每张牌的"价值分数"
  // 2. 分数最低的牌最可能被打出

  const scores = {};
  for (let tile of hand) {
    let score = 0;
    score += pairValue(tile, hand);     // 成对价值
    score += seqValue(tile, hand);      // 成顺价值
    score += dangerValue(tile);         // 危险度（可能点炮）
    score += meldValue(tile, melds);    // 配合已有面子
    scores[tile] = score;
  }

  // 3. 红中永远不打
  delete scores[HONGZHONG];

  // 4. 选分数最低的出
  return minScoreTile(scores);
}
```

### 5.2 碰/杠决策

```javascript
function shouldPeng(tile, hand, melds) {
  // 碰了之后还有好牌型的就碰
  const testHand = removeFromHand(hand, tile, tile); // 去掉两张
  return canWin(testHand, countZhong(hand))
      || getTingCards(testHand, countZhong(hand)).length > 0;
}
```

---

## 八、🕹️ 游戏流程（Day 2）

```
发牌 ──→ 出牌 ──→ 检测碰/杠/胡 ──→ 摸牌 ──→ ...

每个回合:
  1. 当前玩家摸牌
  2. 检测自摸
  3. 玩家出牌
  4. 检测其他玩家胡/碰/杠
  5. 优先级: 胡 > 杠 > 碰
  6. 切换到下一个玩家
```

### 6.1 回合控制

```javascript
async function nextTurn(playerIdx) {
  gameState.currentPlayer = playerIdx;

  if (playerIdx === 0) {
    // 人类玩家 - 等待点击
    await humanTurn();
  } else {
    // AI 回合
    await aiTurn(playerIdx);
  }
}
```

### 6.2 胡牌检测时机

```javascript
// 每次出牌后检测
function checkAllPlayersHu(tile) {
  for (let i = 1; i < 4; i++) {
    const idx = (currentPlayer + i) % 4;
    const player = players[idx];
    if (canWin([...player.hand, tile], player.zhong)) {
      return idx; // 有人胡了！
    }
  }
  return -1;
}
```

---

## 九、🎨 UI 设计（Day 2）

### 7.1 布局

```
┌─────────────────────────────────┐
│   玩家3 (AI, 上家)              │
│   ┌───┐  ┌───┐  ┌───┐  ...    │
│   │牌 │  │牌 │  │牌 │  (背面)   │
│   └───┘  └───┘  └───┘          │
│                                 │
│ 玩家4    中心区域     玩家2      │
│ (AI)   ┌──────┐    (AI)        │
│  ┌─┐   │ 出牌区│     ┌─┐       │
│  │牌│   │      │     │牌│       │
│  └─┘   └──────┘     └─┘       │
│                                 │
│    玩家1 (你)                   │
│    ┌──┐ ┌──┐ ┌──┐ ...  ┌──┐   │
│    │牌│ │牌│ │牌│       │牌│   │
│    └──┘ └──┘ └──┘       └──┘   │
│     碰/杠/胡 按钮区             │
└─────────────────────────────────┘
```

### 7.2 关键UI组件

- **手牌区**：点击选牌→点击出牌区打出
- **碰/杠/胡 按钮**：有操作时弹出
- **听牌提示**：自动高亮可听的牌
- **扎鸟动画**：胡牌后翻牌动画
- **分数面板**：实时显示分数

---

## 十、📦 长沙红中特殊规则

| 规则 | 实现 |
|------|------|
| **红中万能** | 红中=40，canWin中作为wildcard |
| **血战到底** | 第一个胡牌不结束，其他人继续打 |
| **扎鸟** | 胡牌后从牌墙翻牌，翻到中几个就×2^N |
| **缺一色** | 胡牌时不能三门都有 |
| **七小对** | 允许红中代替 |
| **天胡/地胡** | 第一圈胡牌特殊判定 |
| **抢杠胡** | 别人补杠时检测胡 |
| **海底捞月** | 最后一张牌摸牌胡 |

---

## 十一、扎鸟算法

```javascript
function drawBirds(count = 4) {
  const birds = [];
  for (let i = 0; i < count; i++) {
    birds.push(wall.pop());  // 从牌墙翻鸟
  }
  // 中鸟 = 红中或1/5/9牌或筒/条/万各1/5/9
  const hits = birds.filter(b =>
    b === HONGZHONG || b % 10 === 1 || b % 10 === 5 || b % 10 === 9
  );
  return hits.length;  // 倍数: 2^hits
}
```

---

## 十二、三日作战计划（详细）

### Day 1 — 算法地狱（10h）

```
上午 (4h):
  ├── 数据结构定义 (types.js)         30min
  ├── 牌墙/洗牌/发牌                    30min
  ├── 标准胡判定 (回溯法)              2h
  └── 单元测试                         1h

下午 (4h):
  ├── 七小对 + 碰碰胡                   1h
  ├── 听牌计算                         1h
  ├── AI 出牌逻辑                      1h
  └── AI 碰杠决策                      1h

晚上 (2h):
  ├── 红中万能牌逻辑                    1h
  └── 规则集成测试（缺一色/扎鸟）         1h
```

### Day 2 — UI + 游戏流程（10h）

```
上午 (4h):
  ├── HTML 骨架 + CSS 布局              1h
  ├── 牌面绘制 (Canvas/SVG)            2h
  └── 手牌操作（点击选牌）              1h

下午 (4h):
  ├── 游戏流程控制                      1.5h
  ├── 碰/杠/胡 交互                    1.5h
  └── AI 自动出牌动画                   1h

晚上 (2h):
  ├── 出牌区/弃牌堆显示                  1h
  └── 玩家分数面板                      1h
```

### Day 3 — 打磨 + 发布（8h）

```
上午 (4h):
  ├── 扎鸟动画                         1h
  ├── 血战到底逻辑（多人胡牌）          1h
  ├── 天胡/地胡/海底捞月              1h
  └── 异常/边缘情况处理                1h

下午 (4h):
  ├── UI 美化（配色 + 字体）          1h
  ├── 响应式适配（手机+PC）          1h
  ├── 打包单 HTML 文件                 1h
  └── 部署 GitHub Pages               1h
```

---

## 十三、测试验证

### 胡牌测试用例

```javascript
// 标准胡 AABBBCCCDDDEEE
const test1 = [1,1, 2,2,2, 3,3,3, 4,4,4, 5,5,5];
assert(canWin(test1, 0) === true);

// 七小对
const test2 = [1,1, 2,2, 3,3, 4,4, 5,5, 6,6, 7,7];
assert(canWin(test2, 0) === true);

// 碰碰胡
const test3 = [1,1, 2,2,2, 3,3,3, 4,4,4, 5,5];
assert(canWin(test3, 0) === true);

// 缺一色（只有筒）
const test4 = [11,11, 12,12,12, 13,13,13];
// 全是筒，可以胡

// 红中万能
const test5 = [1,1, 2,2, 3,3, 40];  // 红中当一对
assert(canWin(test5, 0) === true);
```

---

## 十四、可选的扩展方向

- **音效**：碰、杠、胡的音效反馈
- **联机版**：WebSocket 对打
- **战绩统计**：胜率、自摸率
- **回放功能**：record 每一局
- **微信小游戏**：用 Cocos Creator 移植

---

> **3 天够吗？** 如果你是 JS 熟手，Day 1 算法 + Day 2 界面，Day 3 修 bug，**完全来得及**。

---

## 二、玩法介绍 🀄

### 游戏概览

长沙红中麻将是湖南地区流行的麻将变种，**4 人游戏**，使用 **112 张牌**：

- 条（1-9）× 4 = 36 张
- 筒（1-9）× 4 = 36 张
- 万（1-9）× 4 = 36 张
- **红中** × 4 = 4 张

### 核心特色

#### 1️⃣ 红中万能牌

红中可以**代替任何一张牌**，组合面子时自动补位。
- 有红中等于多了张万能牌，胡牌概率大增
- 出牌时**不要轻易打红中**（AI 也永不弃红中）

#### 2️⃣ 血战到底

第一个胡牌后**游戏不结束**，其他人继续打，直到 **3 人胡牌** 或 **牌墙摸完** 为止。

#### 3️⃣ 扎鸟

胡牌后从牌墙翻 **4 张牌**：
- 翻到**红中**或**1/5/9 数字**的牌 = 中鸟
- 每个中鸟 **×2 倍**
- 中 4 个鸟 = ×16 倍！

#### 4️⃣ 缺一色

胡牌时**不能三门牌都有**（条筒万最多占两门），这是长沙红中的硬性条件。

#### 5️⃣ 天胡 / 地胡

- **天胡**：庄家发完牌直接胡（第一圈）
- **地胡**：第一轮点炮胡

### 胡牌牌型

| 牌型 | 说明 | 倍数 |
|------|------|------|
| **平胡** | N个面子 + 1个将眼（标准胡） | ×1 |
| **七小对** | 7个对子（红中可以替代） | ×2 |
| **碰碰胡** | 全是刻子 + 将对 | ×2 |
| **清一色** | 全部同一门花色（红中不计） | ×4 |
| **天胡** | 发牌即胡 | ×8 |

> 以上牌型可以叠加，例如清一色七小对 = ×8

### 基本流程

```
1. 洗牌发牌 ─── 每人13张，庄家14张
       │
2. 庄家出牌 ─── 点选手牌→点击打出
       │
3. 检测操作 ─── 其他玩家可胡/碰/杠
       ├── 胡 → 结算分数，继续血战
       ├── 碰 → 拿牌，碰者出牌
       ├── 杠 → 拿牌，补一张，杠者出牌
       └── 过 → 轮到下家摸牌
       │
4. 摸牌出牌 ─── 循环直到有人胡或流局
       │
5. 扎鸟结算 ─── 胡牌后翻牌决定倍数
       │
6. 血战继续 ─── 直到3人胡牌或牌墙空
```

### 操作说明

```
🖱️ 出牌：点击手牌选中 → 再次点击打出
🖱️ 碰：一键碰（自动组刻子）
🖱️ 杠：手上有3张同牌时可杠
🖱️ 胡：胡牌按钮点亮时点击
🖱️ 过：放弃操作
```

### 计分规则

```
基础分 × 牌型倍数 × 扎鸟倍数 = 最终得分

例：平胡（×1）+ 扎鸟中2个（×4）= 4分
    清一色七小对（×8）+ 扎鸟中3个（×8）= 64分
```

---

## 三、核心技术栈
>
> 核心要啃的是 **胡牌回溯算法**，把这个搞定了其他都是拼图。

---

## 十五、项目管理 🧭

### 团队分工

| 角色 | 成员 | 专长 |
|------|------|------|
| **项目经理** 🧭 | NAVI | 排期、协调、风险管理 |
| **架构师** 📐 | GPT | 系统设计、文档、规则验证 |
| **后端开发** 🛠️ | Codex | 算法实现、游戏逻辑、调试 |
| **视觉设计** 🎨 | GPTImage2 | 牌面 UI、配色、动效、CSS |

### AI 提示词库

以下是给每个 AI 成员的系统提示词和任务提示词，调用时直接使用。

---

#### 📐 GPT（架构师）— System Prompt

```markdown
你是 GPT，长沙红中麻将项目的架构师。

## 你的职责
- 设计整体系统架构和数据结构
- 编写技术文档和开发规范
- 验证胡牌算法正确性
- 编写测试用例覆盖所有牌型
- 部署和文档归档

## 工作要求
- 输出的架构方案必须清晰、模块化、可维护
- 所有文档用中文编写
- 测试用例需要覆盖：标准胡、七小对、碰碰胡、清一色、
  缺一色、天胡/地胡、各种红中万能组合
- 部署优先选择 GitHub Pages（免费静态托管）

## 项目背景
项目名「长沙红中麻将」，纯前端 JS 单页应用，
112张牌（条筒万各36 + 4张红中），
红中万能牌、血战到底、扎鸟、缺一色等特色规则。
```

---

#### 🛠️ Codex（后端开发）— System Prompt

```markdown
你是 Codex，长沙红中麻将项目的核心开发者。

## 你的职责
- 实现所有游戏核心逻辑
- 编写和优化胡牌算法（回溯法）
- 实现 AI 出牌策略
- 确保游戏流程完整跑通

## 技术约束
- 纯 JavaScript，ES6+
- 不使用任何第三方框架/库
- 所有代码在浏览器中直接运行
- 不能有跨域或服务端依赖

## 项目代码结构
- core.js: 牌定义、牌墙生成、洗牌发牌、工具函数
- hu.js: 胡牌判定（canWin、七小对、听牌检测、扎鸟）
- ai.js: AI 出牌决策（评分策略、碰杠决策）
- rule.js: 长沙规则（缺一色、清一色、碰碰胡、倍数计算）
- game.js: 游戏主流程（回合控制、玩家交互、碰杠胡处理）

## 胡牌算法规范
- canWin(hand, zhong) 返回 bool
- 优先检测七小对，再用回溯法检测标准胡
- 红中作为万能牌，在回溯过程中自动匹配
- 听牌检测遍历所有有效牌

## 工作要求
- 每个函数写中文注释说明用途
- 输出完整可运行的代码，不要省略或 TODO
- 优先保证胡牌算法的正确性
```

---

#### 🎨 GPTImage2（视觉设计）— System Prompt

```markdown
你是 GPTImage2，长沙红中麻将项目的视觉设计师。

## 你的职责
- 设计游戏 UI 布局和色彩方案
- 实现 CSS 样式和动画效果
- 确保响应式适配（PC + 手机）

## 色彩规范
- 桌面背景: #1a472a 到 #2d5a3d 渐变（绿色麻将桌）
- 牌面底色: #f8f4e8（米白色）
- 牌面边框: #c4a86a（金色边框）
- 红中牌: 红色底 #e74c3c + 白色中字
- 背面牌: 深绿渐变 #2c5f2d → #1a3a1a
- 文字: #ecf0f1（浅色）/ #2c3e50（深色）

## 布局要求
- 四家固定位置：
  - 底部：玩家1（你）- 手牌横排展示
  - 顶部：玩家3（上家）+ 玩家4（对家）- 牌背面
  - 左侧：玩家2（下家）- 牌背面竖排
- 中间区域：操作按钮、倒计时条、出牌显示
- 使用 CSS Grid 布局

## 动效要求
- 牌选中: translateY(-10px) + 金色阴影
- 按钮: hover scale(1.05)
- 胡牌弹窗: fade in 动画
- 倒计时: 进度条 width 线性变化

## 牌面尺寸
- 桌面端: 38×52px（1u标准牌）
- 手机端: 30×42px（响应式缩放）
- 碰/杠组: 22×30px（缩小展示）

## 工作要求
- 输出完整的 CSS 代码
- 不能使用图片资源，全部纯 CSS 绘制
- 优先保证 PC 端体验
```

---

#### 🧭 NAVI（项目经理）— System Prompt（备用）

```markdown
你是 NAVI，长沙红中麻将项目的项目经理。

## 你的职责
- 拆解任务分配给 GPT/Codex/GPTImage2
- 把控项目进度（3天排期）
- 协调团队成员之间的接口对接
- 风险管理：算法 bug、进度延期、UI 适配问题

## 决策原则
- P0（必须完成）: 胡牌算法、游戏流程、可玩
- P1（尽量完成）: AI 优化、血战到底、扎鸟
- P2（锦上添花）: 音效、高级动效、回放
- 时间不够时砍 P2 保 P0

## 沟通风格
- 简洁直接，不废话
- 用数据说话（代码行数、测试通过率）
- 出现问题时先给解决方案再汇报
```

---

### 调用模板

当需要召唤某个 AI 成员执行任务时：

```
[系统提示词]

[项目代码文件内容]

[任务说明]
请完成以下任务：
1. ...
2. ...
3. ...
```

例如调用 Codex 修复胡牌算法：
```
[Codex System Prompt]

# 当前项目代码
[粘贴 hu.js / game.js 等文件内容]

# 任务
胡牌算法在以下情况会误判：
1. [具体bug]
2. [具体bug]

请修复 bug 并输出完整的 hu.js。
```

### 项目排期甘特图

```
Day 1        ████████████████░░░░░░░░░░░░░░░░
  GPT        ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  架构设计 ✅
  Codex      ████████████████░░░░░░░░░░░░░░░░  核心算法 ✅
  GPTImage2  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  视觉概念 🟡

Day 2        ░░░░░░░░░░░░████████████████████
  Codex      ░░░░░░░░░░░░████████████░░░░░░░░  游戏流程
  GPTImage2  ░░░░░░░░░░░░████████████░░░░░░░░  UI 实现
  GPT        ░░░░░░░░░░░░░░░░░█████░░░░░░░░░░  测试用例

Day 3        ░░░░░░░░░░░░░░░░░░░░░░░░████████
  Codex      ░░░░░░░░░░░░░░░░░░░░░░░░██████░░  Bug修复
  GPTImage2  ░░░░░░░░░░░░░░░░░░░░░░░░████░░░░  动效打磨
  GPT        ░░░░░░░░░░░░░░░░░░░░░░░░░░███░░░  部署上线
```

### 每日交付物

#### Day 1（核心引擎）

**GPT — 架构设计** ✅
| 任务 | 状态 | 交付 |
|------|------|------|
| 数据结构定义 | ✅ | `core.js` |
| 胡牌算法流程图 | ✅ | 回溯法方案 |
| AI 策略文档 | ✅ | 评分策略 |
| 扎鸟规则定义 | ✅ | 翻牌倍率 |

**Codex — 核心算法** ✅
| 任务 | 工时 | 行数 |
|------|------|------|
| 牌定义 & 牌墙 & 洗牌 | 1h | `core.js` 158行 |
| 标准胡回溯判定 | 3h | `hu.js` 120行 |
| 七小对 + 碰碰胡 | 2h | `hu.js` 80行 |
| 听牌计算 | 1h | `hu.js` 44行 |
| 缺一色/清一色检测 | 1h | `rule.js` |

**GPTImage2 — 视觉概念** 🟡
| 任务 | 说明 |
|------|------|
| 色彩方案 | 绿色桌面 #1a472a，牌面米白 #f8f4e8 |
| 红中牌面设计 | 红色 #e74c3c + 白色中字 |
| 背面牌纹理 | 渐变色仿麻将背 |

#### Day 2（游戏框架 & UI）

**Codex — 游戏主流程**（6h）
| 任务 | 工时 | 优先级 |
|------|------|--------|
| 回合控制 摸牌→出牌→检测→切换 | 1.5h | P0 |
| 碰/杠/胡交互 玩家操作按钮链 | 1.5h | P0 |
| AI 自动回合 延时出牌动画 | 1h | P0 |
| 血战到底逻辑 多人依次胡牌 | 1h | P1 |
| 扎鸟动画 翻牌效果 | 1h | P1 |

**GPTImage2 — UI 实现**（6h）
| 任务 | 工时 | 优先级 |
|------|------|--------|
| 牌面 CSS 设计 1:1 仿真麻将牌 | 1.5h | P0 |
| 布局 Grid 系统 上下左右四家 | 1.5h | P0 |
| 碰杠胡按钮样式 各色按钮 | 1h | P0 |
| 响应式适配 手机+PC | 1h | P1 |
| 胡牌弹窗动画 fade in/out | 1h | P1 |

**GPT — 规则验证**（2h）
| 任务 | 说明 |
|------|------|
| 胡牌测试用例编写 | 覆盖各种牌型 |
| 边缘情况检查 | 流局/天胡/抢杠 |

#### Day 3（收尾 & 发布）

**Codex — 打磨 & Bug 修复**（4h）
| 任务 | 优先级 |
|------|--------|
| 胡牌算法集成测试 | P0 |
| AI 决策调优 | P1 |
| 边缘情况修复 | P0 |
| 音效系统（可选） | P2 |

**GPTImage2 — 视觉打磨**（2h）
| 任务 |
|------|
| 出牌动画缓动 牌飞出效果 |
| 听牌高亮闪烁 摸到听牌时发光 |
| 胡牌庆祝动效 🎆 简单粒子 |

**GPT — 部署文档**（2h）
| 任务 |
|------|
| GitHub Pages 配置 settings → Pages |
| README 更新 截图+玩法说明 |
| 开发文档归档 docs/ 目录 |

### 风险管理

| 风险 | 概率 | 影响 | 预案 |
|------|------|------|------|
| 胡牌算法有 bug | 中 | 高 | 单元测试先行，每个用例先跑 |
| AI 太笨 | 中 | 中 | Day 3 留时间调参数 |
| 响应式布局乱 | 低 | 中 | 先保 PC 版，手机版后续 |
| 3 天来不及 | 中 | 高 | P2 功能砍掉（音效/高级动效） |

### 每日站会

每天早 10:00：
1. **GPT**：架构/文档进度
2. **Codex**：代码完成行数、测试通过率
3. **GPTImage2**：UI 设计交付

---

## 十六、任务提示词库（按模块分类）

### 🎨 界面模块 — GPTImage2 任务提示词

```markdown
### 任务：完成 PixiJS 游戏界面渲染

#### 现有代码说明
- 引擎基于 PixiJS 8（WebGL 2D）
- 牌面使用 PIXI.Graphics 纯代码绘制（零图片）
- 场景分层：bg → tiles → ui → modal → particles
- 牌尺寸常量见 `engine/tile.js` 中的 `TILE_STYLE` / `TILE`

#### 当前状态
- index.html 已加载 PixiJS CDN
- scenes.js 已有基础布局（牌桌、手牌、碰杠区、按钮、弹窗）
- animation.js 有完整动画系统
- tile.js 有 3D 浮雕牌面渲染

#### 需要完成

**1. 界面布局修复**
- 场景居中 + 自适应窗口大小
- 四家手牌位置准确（底部你、右侧下家、顶部对家、左侧上家）
- 中心出牌区位置：屏幕正中心
- 按钮栏：屏幕下方手牌上方
- 弹窗：居中弹出

**2. 牌面渲染优化**
- 普通牌：象牙白 #faf6ee + 金色边框 #c4a86a
- 红中牌：红色 #e74c3c + 金色「中」字
- 背面牌：深绿 #1a4a2a + 菱形花纹
- 碰/杠区：用缩小版牌面（scale=0.55）
- 弃牌：最右边显示少量

**3. 动画效果**
- 出牌：从各玩家方向抛物线飞向中心（用 Anim.discardTile）
- 选牌：黄色呼吸脉冲 + 上移（用 Anim.glowPulse）
- 胡牌：40粒子庆祝（用 Anim.celebrate）
- 分数变化：数字上浮淡出（用 Anim.scorePopup）

**4. 状态显示**
- 顶部状态栏：当前回合信息
- 每位玩家名称 + 分数
- 牌墙剩余张数
- 当前玩家高亮

**5. 输出格式**
- 输出完整的 scenes.js 文件（替换现有）
- 不要修改 core.js / hu.js / ai.js / rule.js
- 确保所有函数有中文注释
```

---

### 🛠️ 后台模块 — Codex 任务提示词

```markdown
### 任务：完善游戏逻辑与AI

#### 项目概述
长沙红中麻将，纯前端 JS，PixiJS 8 引擎
- 112张牌：条筒万各36张 + 4张红中
- 红中万能牌、血战到底、扎鸟、缺一色
- 4人游戏，1人类 + 3AI

#### 现有代码
- js/core.js — 牌定义、牌墙、工具函数、gameState
- js/hu.js — canWin(hand,zhong) 胡牌判定
- js/ai.js — aiDecideDiscard(hand,melons) 出牌决策
- js/rule.js — 胡牌类型检测、扎鸟、倍数计算
- engine/flow.js — 游戏流程（回合、碰杠胡处理）

#### 需要完成

**1. 胡牌算法修复**
- [ ] 标准胡回溯法：N面子 + 1将眼
- [ ] 七小对：7对子（红中可替代）
- [ ] 红中万能：在回溯中尝试替代任何牌
- [ ] 缺一色：胡牌时不能三门全有
- [ ] 听牌检测：getTingCards(hand) 返回可胡牌列表
- [ ] 避免无限递归，限制回溯深度

**2. AI 策略优化**
- [ ] 出牌评分：成对+20、成顺+10、边张-5、听牌+30
- [ ] 碰决策：碰后听牌才碰
- [ ] 杠决策：杠后补牌
- [ ] 胡决策：能胡必胡
- [ ] 红中策略：永不弃红中

**3. 游戏流程**
- [ ] 发牌：每人13张，庄家14张
- [ ] 回合：摸牌→出牌→检测胡碰杠→切换
- [ ] 操作优先级：胡 > 杠 > 碰 > 过
- [ ] 血战到底：3人胡牌才结束
- [ ] 流局：牌墙空无人胡
- [ ] 天胡/地胡检测

**4. 输出格式**
- 输出完整的 core.js / hu.js / ai.js / rule.js / engine/flow.js
- 用 // ==== 区域分隔 ==== 组织代码
- 中文注释，每个函数说明用途
- 避免全局变量污染（gameState 已定义）
```

---

### 🕹️ 游戏模块 — Codex + GPT 任务提示词

```markdown
### 任务：完成游戏引擎集成

#### 代码接口约定

引擎层（engine/）调用算法层（js/）的函数：
- canWin(hand, zhong) → bool
- countZhong(hand) → number
- detectActions(discardPlayer, tile) → { playerIdx: [actions] }
- aiDecideDiscard(hand, melons) → tileCode
- aiDecideAction(playerIdx, tile, actions) → 'hu'|'peng'|'gang'|'pass'
- drawBirds(wall, count) → { birds, multiplier }
- createWall() → []
- shuffle(arr) → []
- deal(wall) → [hand0, hand1, hand2, hand3]

游戏流程层（engine/flow.js / engine/game_engine.js）提供：
- startGame() — 重置 + 发牌 + 启动
- playTile(playerIdx, handIdx) — 出牌
- nextTurn(playerIdx) — 切换回合
- handleHu/Peng/Gang — 操作处理
- updateUI() — 刷新画面
- setStatus(msg) — 状态文字

#### 需要检查
- [ ] 所有函数调用链完整无缺
- [ ] gameState 变量路径正确
- [ ] 事件绑定（点击、键盘）可用
- [ ] AI 自动回合无阻塞
- [ ] HTML 加载顺序正确
- [ ] PixiJS CDN 可用
- [ ] 无 JS 控制台报错
- [ ] 游戏可完整玩一局

#### 输出
- 列出所有缺失函数和修复方案
- 不要重写整个文件，只输出需要改的部分
```

---

### 👤 注册模块 — GPT 任务提示词

```markdown
### 任务：添加用户注册/登录系统

#### 背景
目前的游戏是纯单机版，需要增加用户系统支持：
- 战绩保存（localStorage）
- 用户昵称
- 对局历史

#### 需要创建的文件

**js/account.js** — 用户账户管理
```javascript
// ===== 用户系统（localStorage 持久化） =====

function initAccount() {
  // 检查 localStorage 是否有用户数据
  // 如果没有，引导用户输入昵称
  // 返回当前用户对象
}

function getCurrentUser() {
  // 返回 { nickname, totalGames, wins, bestScore, history[] }
}

function saveGameRecord(score, huType, isWin) {
  // 保存一局记录到 localStorage
}

function getHistory(limit = 10) {
  // 返回最近 N 局记录
}

function setNickname(name) {
  // 设置/修改昵称
}
```

#### UI 需求
- 新用户弹窗：首次打开提示输入昵称
- 顶部显示用户昵称 + 胜率
- 游戏结束后显示战绩面板

#### 数据库
- 使用浏览器 localStorage
- 数据格式：
```json
{
  "nickname": "玩家",
  "totalGames": 0,
  "wins": 0,
  "bestScore": 0,
  "history": [
    { "date": "2026-05-19", "score": 16, "huType": "qixiaodui", "isWin": true }
  ]
}
```

#### 输出
- 输出完整的 js/account.js
- 给出 index.html 需要插入的代码
- 给出 game_engine.js 需要修改的部分

```

---

### 🧪 测试模块 — GPT 任务提示词

```markdown
### 任务：编写完整测试用例

#### 测试目标
验证长沙红中麻将胡牌算法的正确性。

#### 测试环境
纯 Node.js 环境，使用 console.assert()，无需框架。
运行方式：
```bash
node test_hu.js
```

#### 测试用例覆盖

**1. 标准胡（没有红中）**
- [ ] 3个顺子 + 1个对子 → true
- [ ] 3个刻子 + 1个对子 → true
- [ ] 2个顺子 + 1个刻子 + 1个对子 → true
- [ ] 混搭顺子和刻子 → true
- [ ] 不能胡的牌型 → false
- [ ] 缺少将眼 → false
- [ ] 多一张牌 → false

**2. 七小对**
- [ ] 7个对子 → true
- [ ] 6个对子 + 2个单张 → false
- [ ] 5个对子 + 4张 = 不能胡 → false

**3. 红中万能**
- [ ] 1个红中 + 缺1张 = 补位成胡 → true
- [ ] 2个红中 + 缺2张 = 补位成胡 → true
- [ ] 4个红中 + 其他 = 万能牌型 → true
- [ ] 1个红中但缺太多 → false

**4. 碰碰胡**
- [ ] 4个刻子 + 对子 → true
- [ ] 有顺子的 → 不算碰碰胡

**5. 清一色**
- [ ] 全部条 + 红中 → true
- [ ] 条和筒混合 → false

**6. 缺一色**
- [ ] 只有条和筒 → true
- [ ] 条筒万都有 → false

**7. 听牌**
- [ ] 标准听牌 → 返回可胡牌列表
- [ ] 已胡牌不能听 → 空列表
- [ ] 红中万能听牌 → 包含红中

**8. 边界情况**
- [ ] 空手牌 → false
- [ ] 全部红中 → 可胡
- [ ] 14张牌直接胡（天胡） → true
- [ ] 只有一门花色 → 缺一色 + 清一色

#### 测试代码结构
```javascript
// 按模块分组
// 每个测试用例有实际牌型数组和预期结果
// 输出格式：✓ 测试名 ✅ 或 ✗ 测试名 ❌

function test(name, fn) {
  try {
    console.assert(fn(), name);
    console.log('✓', name);
  } catch(e) {
    console.log('✗', name, '-', e.message);
  }
}

// 1. 标准胡测试
const hand1 = [1,1, 2,2,2, 3,3,3, 4,4,4, 5,5];
test('标准胡-刻刻刻顺+将对', () => canWin(hand1, 0) === true);

// ...更多用例
```

#### 输出
- 输出完整的 test_hu.js 文件（>50个测试用例）
- 可直接在 Node.js 中运行
- 每个测试独立，不互相依赖
```

---

### 📦 一键调用（项目管理用）

当需要分配完整任务链时，使用以下调用顺序：

```
Step 1 → Codex: 修复胡牌算法
Step 2 → Codex: 完善游戏流程
Step 3 → GPTImage2: 渲染游戏界面
Step 4 → GPT: 编写测试用例
Step 5 → Codex: 修复测试发现的bug
Step 6 → GPT: 添加用户注册 + 部署
```

每个步骤之间的输入是上一个步骤的输出文件，
参考 `engine/` 和 `js/` 目录的代码调用约定。
