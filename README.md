# 长沙麻将网络版 — v2.0

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-gold?style=flat-square&label=版本" alt="Version"/>
  <img src="https://img.shields.io/badge/Flutter-3.27-blue?style=flat-square&logo=flutter&label=Flutter" alt="Flutter"/>
  <img src="https://img.shields.io/badge/Node.js-20-green?style=flat-square&logo=node.js&label=Node" alt="Node"/>
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&label=TS" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Android-14-34A853?style=flat-square&logo=android&label=Android" alt="Android"/>
  <img src="https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker" alt="Docker"/>
  <img src="https://img.shields.io/badge/license-MIT-orange?style=flat-square" alt="License"/>
  <img src="https://img.shields.io/badge/PR-welcome-brightgreen?style=flat-square" alt="PR"/>
</p>

基于 **Flutter + Node.js (Express)** 构建的多人在线长沙麻将手机游戏，支持实时联机对战与 AI 对战。2.0 版本在 UI/UX、游戏规则、AI 系统和视觉特效方面进行了全面升级。

## 技术栈

| 层级 | 技术 |
|------|------|
| 客户端 | Flutter 3.27 (Dart) · Material 3 · Android |
| 服务端 | Node.js · Express · TypeScript · Socket.io |
| 数据库 | MySQL 8.0 · Redis 7 |
| 部署 | Docker Compose · GitHub |

---

## 版本 2.0 核心更新（2026-05-21）

### 🎨 UI/UX 全面升级
- **中式麻将主题**：青绿渐变背景、金色点缀、米白牌面配色方案
- **Material 3 设计语言**：卡片化界面、圆角组件、动态色彩
- **启动页动画**：旋转的中发 logo + 缩放淡入
- **登录页**：金色边框卡片、图标输入框、毛玻璃效果
- **大厅页**：三种模式卡片化（快速匹配 / 好友房 / AI 练习）
- **3D 麻将牌组件**：渐变牌面、中文数字标识、花色配色
- **Google Fonts**：思源宋体（标题）+ 思源黑体（正文）

### 🀄 长沙麻将规则完整实现

| 功能 | 说明 |
|------|------|
| 定庄 | 掷两颗骰子，逆时针数点定庄，附带座位轮转动画 |
| 发牌 | 庄家 14 张，闲家 13 张 |
| 碰杠吃胡 | 完整碰、明杠/暗杠/补杠、吃牌、自摸/点炮 |
| 胡牌牌型 | 七小对、碰碰胡、将将胡、清一色、基本胡 |
| 起手胡 | 四喜、板板胡、缺一色、六六顺 |
| 扎鸟 | 胡牌后翻 2 张墙牌，中鸟番数翻倍，含翻牌动画 |
| 流局 | 牌墙摸完自动结算，无鸟牌 |
| 海底捞月 | 墙牌只剩一张时摸牌胡牌 |
| 再来一局 | 自动重新加入 AI 对局 |

### 🤖 AI 系统
- **三个 AI 对手**：自动加入对局、智能决策
- **AI 出牌算法**：基于牌价值评估的选牌策略
- **AI 动作决策**：吃/碰/杠/胡自动选择（带随机扰动）
- **托管模式**：玩家可开启自动托管，AI 代打

### ✨ 动画与特效
- **定庄摇号**：四个座位循环高亮，减速定格庄家
- **胡牌特效**：弹性缩放 + 金色大字 + 阴影淡出
- **扎鸟翻牌**：牌面翻转动画（背面向正面翻转）
- **结算动画**：渐进式展示鸟牌、分数、比赛结果

---

## 长沙麻将规则

### 基础
- 108 张牌：万、条、筒各 1-9，每种 4 张
- 小胡：2 / 5 / 8 做将

### 特殊胡型
- 天胡 / 地胡 / 碰碰胡 / 将将胡
- 清一色 / 七小对 / 全求人 / 海底捞月 / 杠上开花

### 起手胡
- 四喜 / 板板胡 / 缺一色 / 六六顺

### 扎鸟
- 胡牌后翻 2 张鸟牌，命中则番数翻倍

---

## 项目结构

```
changsha-mahjong/
├── client/                  # Flutter 客户端
│   └── lib/
│       ├── config/          # 主题、路由、常量
│       ├── pages/           # 页面组件
│       │   ├── splash/      # 启动页（动画）
│       │   ├── login/       # 登录/注册
│       │   ├── lobby/       # 大厅（模式选择）
│       │   ├── room/        # 好友房等待
│       │   ├── game/        # 游戏主页面
│       │   └── result/      # 结算页面
│       ├── services/        # 音频、Socket 服务
│       └── widgets/         # 麻将牌 UI 组件
├── server/                  # Node.js 服务端
│   └── src/
│       ├── modules/
│       │   ├── game/        # 游戏引擎
│       │   │   ├── engine.ts             # 核心引擎
│       │   │   ├── turn-manager.ts       # 回合管理
│       │   │   ├── tile-manager.ts       # 牌墙管理
│       │   │   ├── win-detector.ts       # 胡牌检测
│       │   │   ├── score-calculator.ts   # 分数计算
│       │   │   ├── action-validator.ts   # 动作验证
│       │   │   ├── ai-player.ts          # AI 决策
│       │   │   └── replay-recorder.ts    # 回放记录
│       │   ├── auth/        # 注册/登录/JWT
│       │   ├── room/        # 房间创建与管理
│       │   └── friend/      # 好友系统
│       ├── models/          # TypeORM 实体
│       └── middleware/      # JWT 认证中间件
├── shared/                  # 前后端共享常量与协议定义
└── docker-compose.yml       # 一键启动（MySQL + Redis + Server）
```

---

## 快速开始

### 方式一：Docker Compose（推荐）

```bash
docker compose up -d
```

服务启动后监听 `3000` 端口，数据库和缓存均自动就绪。

### 方式二：本地开发

#### 服务端

```bash
cd server
npm install
cp .env.example .env  # 填写 MySQL / Redis 连接信息
npm run dev
```

#### 客户端

```bash
cd client
flutter pub get
flutter build apk --debug --dart-define=SERVER_URL=http://10.0.2.2:3000
adb install -r build/app/outputs/flutter-apk/app-debug.apk
```

### Android 模拟器连接

| 配置 | 值 |
|------|-----|
| AVD | Pixel_6 (arm64-v8a) |
| API | android-34 |
| 服务端地址 | `http://10.0.2.2:3000` |
| 调试工具 | scrcpy 窗口镜像 |

---

## 通信协议

采用 **socket.io** 实现实时双向通信：

| 方向 | 事件 | 说明 |
|------|------|------|
| → 客户端 | `game:dice` | 掷骰子信息 |
| → 客户端 | `game:start` | 游戏开始，包含手牌 |
| → 客户端 | `game:turn` | 当前出牌玩家 |
| → 客户端 | `game:tile_drawn` | 摸牌 |
| → 客户端 | `game:tile_discarded` | 出牌 |
| → 客户端 | `game:action_prompt` | 动作提示 |
| → 客户端 | `game:action_result` | 动作结果 |
| → 客户端 | `game:bird_reveal` | 扎鸟翻牌 |
| → 客户端 | `game:result` | 结算结果 |
| 客户端 → | `game:action` | 玩家操作 |

---

## Bug 修复记录（v2.0）

| Bug | 问题 | 修复 |
|-----|------|------|
| Docker 网络断连 | server 容器未绑定 bridge 网络 | 重建容器，挂载 `changsha-mahjong-master_default` |
| 结算页崩溃 | `_playerName` 数组 `['下家','对家','上家']` 索引越界 | 改用 4 元素数组 + `(seat - mySeatIndex + 4) % 4` |
| 流局崩溃 | `cast<int>()` 遇到 double 类型 | 改用 `(e as num).toInt()` |
| 吃牌无反应 | 客户端读 `tileIds`，服务端发 `tiles` | 对齐数据格式 |
| AI 出牌卡死 | 计时器竞态条件 | 增强 phase/seat 校验，避免过期 timer 触发 |
| AI 房间进不去 | `room:joinAI` 无 `roomType` | 大厅直接跳转 `/game` |
| 再来一局转圈 | 跳到已销毁的 `/room` | 先 `room:leave` 再 `room:joinAI` |

---

## 后续规划

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 局域网对战 | 高 | mDNS 发现 + P2P WebSocket |
| 好友对战 | 中 | 房号搜索、密码保护 |
| 排行榜 | 中 | 胜场、积分、段位 |
| 牌局回放 | 低 | 基于 replay-recorder |
| 音效增强 | 低 | 更多麻将操作音效 |
| 离线单机 | 低 | 不依赖服务器的单机模式 |

---

*项目地址：https://github.com/nexe-afk/changsha_mahjong*
*版本：2.0.0 | 2026-05-21*
