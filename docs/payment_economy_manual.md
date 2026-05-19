# 📗 麻将平台 支付系统 & 经济体系 集成规范手册

---

## 🔗 一、系统总览

本系统结合三大模块：
1. **加密货币支付网关** — BTC/ETH/USDT 充值入口
2. **游戏内虚拟经济模块** — 软通货/硬通货/消耗品分层管理
3. **安全验证与反作弊机制** — 签名校验+幂等性+日志审计

### 架构层次

```
┌─────────────────────────────────────────────────────┐
│                   玩家客户端 (PixiJS)                  │
├──────────────────────┬──────────────────────────────┤
│              游戏后端 (Node.js Express)               │
│  ├─ 支付模块: 订单创建 / 查询                       │
│  ├─ 经济模块: 货币管理 / 交易记录                   │
│  └─ 安全模块: 签名验证 / 防重放 / 审计日志          │
├──────┬─────────────────────────────┬────────────────┤
│ REST API                    │ Webhook            │
├──────┴─────────┐         ├────────┴──────────────┤
│ 加密支付网关     │         │ 区块链确认 (on-chain) │
│ (CloudPaya /    │         │ BTC / ETH / USDT      │
│  TokenCore)     │         │ 确认数: 3/12/12       │
└────────────────┘         └───────────────────────┘
```

---

## ⚙️ 二、支付模块设计

### 2.1 支持币种与网络

| 币种 | 网络 | 最小确认数 | 地址格式 |
|------|------|-----------|---------|
| BTC | Bitcoin Mainnet | 3 | bc1... / 1... / 3... |
| ETH | Ethereum | 12 | 0x... (40 hex chars) |
| USDT | ERC-20 | 12 | 0x... (同 ETH 地址) |
| USDT | TRC-20 | 12 | T... (34 chars) |
| SOL | Solana | 1 | 32-44 base58 chars |

### 2.2 核心 API 端点

#### 创建支付订单
```
POST /api/payments/create
Headers: X-API-Key, X-Signature, Content-Type: application/json
Body: { userId, amount, fiatCurrency, cryptoCurrency, description, webhookUrl }
→ Response: { paymentId, address, network, cryptoAmount, qrCodeUrl, exchangeRate, expiresAt, status }
```

#### 查询订单状态
```
GET /api/payments/{paymentId}
→ Response: { paymentId, status, confirmations, requiredConfirmations, amountPaid, currency, txId, paidAt }
```

#### Webhook 回调
```
POST {webhookUrl}
Headers: X-Signature, X-Event, X-Timestamp, X-Nonce
Body: { paymentId, orderId, status, amount, currency, txId, confirmations, paidAt, metadata }
→ Response: 200 { status: "ok" | "duplicate" | "pending_confirmations" }
```

### 2.3 Webhook 处理流程

```
收到回调
  ├─ 1. 验证签名 (HMAC-SHA256)         失败 → 401
  ├─ 2. 防重放 (Nonce)                重复 → 200 duplicate
  ├─ 3. 时间戳检查 (5分钟内)           超时 → 400
  ├─ 4. 检查链上确认数                 不足 → 200 pending
  ├─ 5. 幂等性检查                    已处 → 200 already_processed
  └─ 6. 更新订单 + 充值 + 审计日志      成功 → 200 ok
```

---

## 💰 三、虚拟经济模型

### 3.1 货币种类

| 层级 | 名称 | 来源 | 用途 |
|------|------|------|------|
| 软通货 | SoftCoin | 对局/任务/签到/广告 | 基础道具/房卡/服务 |
| 硬通货 | PremiumGem | 充值/成就/赛季 | 皮肤/VIP/限定商品 |
| 消耗品 | Items | 购买/合成 | 外观/功能增强 |

### 3.2 汇率
- 1 PremiumGem = 100 SoftCoin (官方汇率)
- 反向兑换: ❌ 不支持 (防硬通货贬值)

### 3.3 充值兑换表

| USDT | PremiumGem | 赠送 SoftCoin | 首充额外 |
|------|-----------|--------------|---------|
| 1 | 10 | 500 | - |
| 5 | 60 (+20%) | 3000 | - |
| 10 | 130 (+30%) | 6000 | 限定皮肤 |
| 50 | 750 (+50%) | 30000 | 限定称号 |

### 3.4 Faucets & Sinks

| 类型 | 示例 | 频率 | 数量级 |
|------|------|------|-------|
| Faucets | 签到/对局/胡牌/成就/赛季/广告 | 每日 | 100-5000 |
| Sinks | 皮肤/VIP/赛事/合成/房卡 | 单次 | 100-5000 |

### 3.5 防通胀策略
1. 每日 Faucets 产出上限
2. 新增 Sinks > 新增 Faucets
3. 硬通货→软通货: 单向兑换
4. 限量道具拍卖回收货币
5. 实时监控 M0/M1/M2

---

## 🔐 四、安全与防护

### 4.1 签名验证
```javascript
function verifySignature(body, signature, secret) {
  const computed = crypto.createHmac('sha256', secret)
    .update(JSON.stringify(body)).digest('hex');
  return timingSafeEqual(computed, signature);
}
```

### 4.2 防重放
```javascript
// Nonce + 时间戳 (5min TTL)
async function validateNonce(nonce, timestamp) {
  if (Math.abs(Date.now()/1000 - timestamp) > 300) return false;
  return await redis.set(`nonce:${nonce}`, '1', 'EX', 300, 'NX');
}
```

### 4.3 审计日志表
```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  action VARCHAR(50), order_id VARCHAR(64), user_id VARCHAR(64),
  amount NUMERIC(20,8), currency VARCHAR(10), tx_id VARCHAR(128),
  ip_address INET, previous_status VARCHAR(20), new_status VARCHAR(20),
  metadata JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📊 五、数据监控指标

| 指标 | 说明 | 目标 |
|------|------|------|
| ARPDAU | 日活平均收入 | > ¥0.50 |
| ARPPU | 付费用户平均 | > ¥50 |
| 付费转化率 | 付费用户/DAU | > 5% |
| F/S 比率 | 产出/消耗 | < 0.8 |
| 通胀率 | M0月增长率 | < 10% |

---

## 📦 六、数据库 Schema

### 玩家钱包
```sql
CREATE TABLE player_wallets (
  user_id VARCHAR(64) PRIMARY KEY,
  soft_coin BIGINT DEFAULT 0,
  premium_gem BIGINT DEFAULT 0,
  total_deposited NUMERIC(20,2) DEFAULT 0,
  CONSTRAINT positive_coin CHECK (soft_coin >= 0),
  CONSTRAINT positive_gem CHECK (premium_gem >= 0)
);
```

### 交易记录
```sql
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  tx_id VARCHAR(64) UNIQUE,
  user_id VARCHAR(64),
  type VARCHAR(20), currency VARCHAR(20), amount BIGINT,
  balance_before BIGINT, balance_after BIGINT,
  source VARCHAR(50), reference_id VARCHAR(64),
  metadata JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 七、部署

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports: ["443:443"]
    env_file: .env.production
    depends_on: [db, redis]
    healthcheck: { test: ["CMD", "wget", "--spider", "https://localhost/health"] }
  db:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine
    volumes: [redisdata:/data]
volumes: { pgdata:, redisdata: }
```

### 环境变量
```bash
PAYMENT_API_KEY=sk_live_xxxxx
PAYMENT_SECRET=whsec_xxxxx
ENCRYPTION_KEY=hex_32_bytes
DATABASE_URL=postgresql://user:pass@localhost:5432/game_economy
REDIS_URL=redis://localhost:6379
```

---

## 📋 八、合规说明
1. 不涉及真实赌博/下注
2. 不提供提现/兑现
3. 遵循 GDPR / 个人信息保护法
4. 仅限 18+ 用户充值
5. 交易记录保存至少 5 年
