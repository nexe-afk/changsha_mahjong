# 长沙麻将网络版

基于 Flutter + Node.js 构建的多人在线长沙麻将手机游戏，支持实时联机对战。

## 技术栈

|层级|技术|
|---|---|
|客户端|Flutter (Dart) · Android / iOS|
|服务端|Node.js · Express · TypeScript|
|实时通信|Socket.io (WebSocket)|
|数据库|MySQL 8 (TypeORM) · Redis 7|
|部署|Docker Compose · Google Cloud Engine|

## 项目结构

```
changsha-mahjong/
├── client/                  # Flutter 客户端
│   └── lib/
│       ├── config/          # 主题、路由、常量
│       ├── game_engine/     # 客户端本地游戏逻辑
│       ├── pages/           # 页面（登录/大厅/房间/游戏/结算/商城/好友/排行/局域网/个人）
│       ├── services/        # HTTP、Socket、音效服务
│       └── widgets/         # 麻将牌等 UI 组件
├── server/                  # Node.js 服务端
│   └── src/
│       ├── modules/
│       │   ├── game/        # 游戏引擎（engine / tile-manager / turn-manager /
│       │   │                #           win-detector / score-calculator /
│       │   │                #           action-validator / ai-player / replay-recorder）
│       │   ├── auth/        # 注册 / 登录 / JWT
│       │   ├── room/        # 房间创建与管理
│       │   ├── friend/      # 好友系统
│       │   ├── shop/        # 金币商城
│       │   └── ranking/     # 排行榜
│       ├── models/          # TypeORM 实体
│       ├── middleware/      # JWT 认证中间件
│       └── config/          # 数据库连接配置
├── shared/                  # 前后端共享常量与协议定义
├── docker-compose.yml       # 一键启动（MySQL + Redis + Server）
└── deploy-gce.sh            # GCE 部署脚本
```

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
# 复制并编辑 .env（填写 MySQL / Redis 连接信息）
cp .env.example .env
npm run dev
```

#### 客户端

```bash
cd client
flutter pub get
flutter run          # 连接设备/模拟器调试
flutter build apk --release   # 构建 Android APK
```

## 主要功能

- **游戏引擎** — 完整的长沙麻将规则，含所有特殊胡型与扎鸟
- **实时联机** — Socket.io 驱动的四人实时对战
- **AI 托管** — 玩家掉线后由 AI 自动接管
- **账号系统** — 注册 / 登录 / 游客模式
- **金币 & 商城** — 内置金币体系与道具商城
- **好友系统** — 添加好友、邀请入局
- **排行榜** — 全服积分排名
- **音效** — 出牌、胡牌等场景音效
- **复盘录像** — 对局记录与回放
