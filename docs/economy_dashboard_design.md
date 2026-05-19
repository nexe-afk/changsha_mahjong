# 📊 可视化经济模拟工具 UI / 报告模板设计说明

## 一、设计目标
- 货币供应量实时追踪
- Faucets / Sinks 流量分析
- 通胀/通缩预警
- 玩家分层 LTV 统计
- 支付网关运行状态

## 二、工具选型
| 组件 | 推荐 |
|------|------|
| 前端 | Vue 3 / React 18 |
| 图表 | ECharts 5 / Chart.js 4 |
| 数据源 | PostgreSQL + Redis |
| 后端 | Node.js Express |
| 替代 | Grafana (告警+权限管理) |

## 三、UI 布局

### 概览面板 (Top Row)
```
┌──────────────────────────────────────────────────────────────┐
│ 📊 经济系统仪表板                          最后更新: 22:30    │
├─────────┬──────────┬──────────┬──────────┬──────────────────┤
│ 💰 总充值 │ 👥 活跃   │ 🪙 软通货 │ 💎 硬通货 │ 📈 通胀率        │
│ $12,345  │ 1,234    │ 1.23M    │ 92K      │ 8.2% ✅          │
│ ↑12%     │ ↓3%      │ +8.1%    │ +8.2%    │ 目标<10%         │
└─────────┴──────────┴──────────┴──────────┴──────────────────┘
```

### 图表区域 (Middle)
```
┌──────────────────────────────┬──────────────────────────────┐
│ 货币供应量趋势 (7日)          │ Faucets vs Sinks            │
│  📈 SoftCoin 1.2M→1.3M      │  ████ Faucets: 50K          │
│  📈 PremiumGem 85K→92K      │  █████████ Sinks: 62K       │
│                              │  比率: 0.81 ✅              │
├──────────────────────────────┼──────────────────────────────┤
│ 玩家分层 LTV                 │ 支付成功率 (24h)            │
│  Whale(5%): ████████████     │  ✅ 98.5%                   │
│  Dolphin(15%): ██████        │  ❌ 0.3% 失败               │
│  Minnow(30%): ███            │  ⏳ 1.2% 待确认             │
│  Free(50%): █                │                              │
└──────────────────────────────┴──────────────────────────────┘
```

### 交易日志 + 预警 (Bottom)
```
┌──────────────────────────────────────────────────────────────┐
│ 📋 最近交易记录                                               │
├──────────┬─────────┬──────────┬───────┬────────┬───────────┤
│ 22:28    │ user_01 │ payment  │ +5000 │ GEM    │ ✅ done   │
│ 22:25    │ user_02 │ faucet   │ +200  │ COIN   │ ✅        │
│ 22:20    │ user_03 │ sink     │ -1000 │ COIN   │ ✅        │
├──────────┴─────────┴──────────┴───────┴────────┴───────────┤
│ ⚠️ 预警: GEM 基尼 0.72 > 0.7 → 建议增加中小额 Gem 奖励       │
│ 🟢 支付成功率 98.5% → 正常                                   │
│ 🔴 通胀趋势 8.2%→9.1% → 接近阈值, 关注                        │
└──────────────────────────────────────────────────────────────┘
```

## 四、核心指标

### 货币供应量
- M0 = 所有钱包 SoftCoin + PremiumGem
- M1 = M0 + 未领取奖励
- M2 = M1 + 已消耗累计
- 通胀率 = (M0_today - M0_yesterday) / M0_yesterday × 100%

### Faucets/Sinks 健康判断
| 比率 | 状态 | 措施 |
|------|------|------|
| < 0.7 | 通货紧缩 | 增加 Faucets |
| 0.7-0.9 | 🟢 健康 | 保持 |
| 0.9-1.0 | 🟡 注意 | 观察 |
| > 1.0 | 🔴 通胀 | 减少产出/增加 Sinks |

## 五、ECharts 配置示例

### 货币供应量趋势
```javascript
const supplyChart = {
  xAxis: { type: 'time' },
  yAxis: { type: 'value', name: '供应量' },
  series: [
    { name: 'SoftCoin', type: 'line', smooth: true, areaStyle: { opacity: 0.1 },
      data: supplyHistory.map(d => [d.date, d.softCoin]) },
    { name: 'PremiumGem', type: 'line', smooth: true, areaStyle: { opacity: 0.1 },
      data: supplyHistory.map(d => [d.date, d.premiumGem]) }
  ]
};
```

### Faucets vs Sinks
```javascript
const flowChart = {
  xAxis: { type: 'category', data: ['Faucets', 'Sinks'] },
  yAxis: { type: 'value' },
  series: [{
    type: 'bar',
    data: [
      { value: faucets, itemStyle: { color: '#4CAF50' } },
      { value: sinks, itemStyle: { color: '#FF5722' } }
    ],
    label: { show: true, position: 'top' }
  }]
};
```

## 六、数据 API

```javascript
GET /api/economy/metrics
Response:
{
  "timestamp": "2026-05-19T22:30:00Z",
  "totalSupply": { "softCoin": 1234567, "premiumGem": 92345 },
  "dailyFlow": {
    "faucets": { "softCoin": 50000, "premiumGem": 2000 },
    "sinks": { "softCoin": 62000, "premiumGem": 1500 }
  },
  "playerMetrics": { "dau": 1234, "purchasers": 62, "arpdau": 0.52 },
  "paymentMetrics": { "totalDeposits": 12345.67, "successRate": 0.985 }
}
```

## 七、模拟工具使用场景

| 场景 | 输入 | 输出 | 用途 |
|------|------|------|------|
| 新增 Faucets | +5000 Coin/日 | 30天 M0 曲线 | 评估奖励影响 |
| 调整 Sinks | 皮肤+20% | 消耗量模拟 | 调价预测 |
| 新增道具 | 5000 Gem | 回收量+市场影响 | 投放决策 |
| 赛季奖励 | 10000 Gem 奖金池 | 分布+通胀影响 | 赛季设计 |
| 汇率调整 | 1Gem=120Coin | 消耗变化 | 汇率优化 |
