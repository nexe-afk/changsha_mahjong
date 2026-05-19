# 长沙红中麻将 🀄

> **零基础 → 完整 PixiJS 游戏项目 + 49 条 AI 提示词全家桶**
>
> 纯前端 JavaScript，单 HTML 页面，零依赖。
> 覆盖从游戏开发 → 盈利变现 → 加密支付 → 经济体系 → 全栈管线的完整闭环。

[![GitHub](https://img.shields.io/badge/GitHub-changsha_mahjong-181717?logo=github)](https://github.com/nexe-afk/changsha_mahjong)
![GitHub last commit](https://img.shields.io/github/last-commit/nexe-afk/changsha_mahjong)

---

## 🎮 玩法介绍

长沙红中麻将，**4人游戏**，112张牌（条筒万各36张 + 4张红中）。

### 核心规则

| 特色 | 说明 |
|------|------|
| 🀄 **红中万能** | 红中可以代替任何牌，组合面子用 |
| 🩸 **血战到底** | 第一个胡牌不结束，直到3人胡牌 |
| 🐦 **扎鸟** | 胡牌后翻4张牌，中1/5/9或红中=×2倍 |
| 🈳 **缺一色** | 胡牌时不能三门全有（最多两门） |
| 🌞 **天胡/地胡** | 第一圈直接胡或点炮，倍率最高 |

### 胡牌牌型

| 牌型 | 倍数 |
|------|------|
| 平胡（标准胡） | ×1 |
| 七小对 | ×2 |
| 碰碰胡 | ×2 |
| 清一色 | ×4 |
| 天胡 | ×8 |

> 牌型可叠加，例如 清一色七小对 = ×8

### 操作方式

1. **出牌**：点击手牌选中 → 再点击打出
2. **碰/杠/胡**：按钮亮起时点击即可
3. **过**：跳过当前操作
4. **AI 对手**：自动行动，无需操作

---

## 🚀 快速开始

```bash
# 直接用浏览器打开
open index.html

# 或启动本地服务器
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

## 📦 项目结构

```
changsha_mahjong/
│
├── index.html              (80行)  入口文件
├── README.md                       项目说明
├── SUMMARY.md                      全流程汇总
├── DEVELOPMENT.md                  开发文档
│
├── js/                → 🧠 算法层（纯逻辑，不依赖引擎）
│   ├── core.js        (180行)  牌定义、牌墙、洗牌
│   ├── hu.js          (244行)  胡牌判定算法（核心）
│   ├── ai.js          ( 96行)  AI 出牌策略
│   └── rule.js        (144行)  长沙红中规则
│
├── engine/             → 🎮 引擎层（PixiJS WebGL）
│   ├── sound.js       ( 89行)  音效系统
│   ├── tile.js        (209行)  3D浮雕麻将牌
│   ├── animation.js   (263行)  动画系统
│   ├── renderer.js    ( 12行)  渲染桥接
│   ├── scenes.js      (500行)  游戏场景
│   ├── flow.js        (214行)  游戏流程
│   └── game_engine.js (272行)  引擎主控
│
├── engine/prompts/  → 📜 49条 AI 提示词全家桶
│   ├── prompts.json                 (6条)  原始开发
│   ├── prompts_v2.json              (10条) 高级开发
│   ├── monetization_prompts.json    (10条) 盈利模式
│   ├── crypto_payment_prompts.json  ( 7条) 加密支付
│   ├── economy_system_prompts.json  ( 5条) 经济体系
│   └── fullstack_prompts.json       (11条) 全栈流程
│
└── docs/              → 📄 运营文档
    ├── payment_economy_manual.md    支付+经济手册
    └── economy_dashboard_design.md  经济仪表板设计
```

---

## 📜 AI 提示词体系（49条）

| 分类 | 条数 | 覆盖范围 |
|------|------|---------|
| 🎮 **游戏开发** | 10 | 新手引导 / 核心规则 / AI策略 / DDA / 奖励 / 社交 / 测试 / 游戏感 / 日志 / Meta |
| 💰 **盈利变现** | 10 | IAP / 广告 / 会员 / 推荐 / 任务 / 赛事 / 社交激励 / LTV / DDA联动 / Meta |
| 🔗 **加密支付** | 7 | 通用 SDK / 订单创建 / Webhook / 多链多币种 / 安全反欺诈 / 多语言 / DevOps |
| 🏦 **经济体系** | 5 | 货币设计 / 来源消耗 / 虚拟市场 / 奖励曲线 / 监控仪表板 |
| 🏗️ **全栈流程** | 11 | 需求 / 架构 / UI原型 / 前端 / 后端 / 支付集成 / 经济 / 美术 / 部署 / 测试 / 文档 |

每条包含: **Role → Task → Context → Requirements → I/O Contract → Output Format → Verification Plan**

---

## 🎯 长沙红中特色

- ✅ 红中万能牌
- ✅ 血战到底
- ✅ 扎鸟（翻牌倍率 ×2^N）
- ✅ 缺一色
- ✅ 天胡/地胡

---

## 🛠 技术栈

| 层 | 技术 |
|----|------|
| 引擎 | PixiJS 8 (WebGL 2D) |
| 语言 | JavaScript ES6+ |
| 音效 | Web Audio API（零文件依赖） |
| 动画 | 自建缓动系统（easeOutBack） |
| 存储 | localStorage |
| 部署 | Docker + Nginx + Certbot |

---

## 📑 文档

- [SUMMARY.md](SUMMARY.md) — 全开发流程汇总
- [DEVELOPMENT.md](DEVELOPMENT.md) — 开发文档（含 AI 提示词说明）
- [docs/payment_economy_manual.md](docs/payment_economy_manual.md) — 支付+经济运营手册
- [docs/economy_dashboard_design.md](docs/economy_dashboard_design.md) — 经济仪表板设计
- [engine/prompts/](engine/prompts/) — 49 条 AI 提示词全家桶

---

## 📜 License

MIT
