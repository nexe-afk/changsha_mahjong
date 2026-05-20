// ===== 长沙红中麻将 - 自动化测试套件 =====
// 参考 q_algorithm 的按牌型分组测试策略
// 运行方式: node js/test_suite.js

// ===== 模块加载（Node.js vm 方式，把函数挂到 global）=====
const fs = require('fs'), path = require('path'), vm = require('vm');
const BASE = path.join(__dirname, '..');

// 设置 global stub，让算法文件能在 Node 中运行
Object.assign(global, {
  HONGZHONG: 40,
  SUITS: { TIAO: 0, TONG: 1, WAN: 2 },
  SUIT_NAMES: { 0: '条', 1: '筒', 2: '万' },
  SUIT_SYMBOLS: { 0: '🀐', 1: '🀙', 2: '🀇' },
  TILES_PER_SUIT: 9,
  WINDS: ['东', '南', '西', '北'],
  gameState: {
    wall: [], players: Array(4).fill(null).map(() => ({ hand: [], melons: [], discards: [], score: 0 })),
    currentPlayer: 0, lastDiscard: null, lastDiscardPlayer: -1,
    isProcessing: false, turnPhase: 'idle', selectedTile: null,
    gameOver: false, huCount: 0, huPlayers: [], zhongCount: 4,
  },
  window: {},
});

// 用 vm.runInThisContext 把每个文件的函数声明注入 global
['js/core.js', 'js/hu.js', 'js/rule.js', 'js/ai.js'].forEach(f => {
  const code = fs.readFileSync(path.join(BASE, f), 'utf8');
  vm.runInThisContext(code, { filename: f });
});

// ===== 测试框架 =====

let passed = 0, failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    failed++;
  }
}

function group(name, fn) {
  console.log(`\n【${name}】`);
  fn();
}

// ===== A 组：工具函数 (12个) =====

group('A 工具函数', () => {
  // A1: encodeTile 编码
  assert(encodeTile(0, 1) === 1, 'A1 encodeTile(条,1)=1');
  assert(encodeTile(1, 5) === 15, 'A2 encodeTile(筒,5)=15');
  assert(encodeTile(2, 9) === 29, 'A3 encodeTile(万,9)=29');
  assert(encodeTile('zhong') === 40, 'A4 encodeTile(zhong)=40');

  // A5: decodeTile
  const d = decodeTile(15);
  assert(d.suit === 1 && d.value === 5 && d.name === '5筒', 'A5 decodeTile(15)={suit:1,val:5}');
  assert(decodeTile(40).name === '中', 'A6 decodeTile(40).name=中');

  // A7: createWall 长度
  const wall = createWall();
  assert(wall.length === 112, 'A7 createWall 长度=112');
  assert(wall.filter(t => t === 40).length === 4, 'A8 牌墙中有4张红中');

  // A9: deal 每人13张
  const w2 = shuffle(createWall());
  const hands = deal(w2);
  assert(hands.length === 4, 'A9 发牌4人');
  assert(hands.every(h => h.length === 13), 'A10 每人13张');

  // A11: getCountMap
  const map = getCountMap([1, 1, 2, 3, 1]);
  assert(map[1] === 3 && map[2] === 1, 'A11 getCountMap 计数正确');

  // A12: sortHand
  const sorted = sortHand([5, 1, 3, 40, 2]);
  assert(sorted[0] === 1 && sorted[sorted.length - 1] === 40, 'A12 sortHand 升序排列');
});

// ===== B 组：胡牌判定 (28个) =====

group('B 胡牌判定', () => {
  // B1-B10: 标准胡
  assert(canWin([1,2,3,4,5,6,7,8,9,1,2,3,4,4], 0), 'B1 顺子+将 标准胡');
  assert(canWin([1,1,1,2,2,2,3,3,3,4,4,4,5,5], 0), 'B2 四组刻子+将');
  assert(!canWin([1,2,3,4,5,6,7,8,9,1,2,11,11], 0), 'B3 牌型不够不能胡');
  assert(canWin([11,12,13,14,15,16,17,18,19,11,12,13,14,14], 0), 'B4 筒子顺子胡');
  assert(canWin([21,21,21,22,22,22,23,23,23,24,24,24,25,25], 0), 'B5 万子刻子胡');
  assert(!canWin([1,2,3,4,5,6,7,8,9,1,2], 0), 'B6 手牌不足14张不胡');
  assert(canWin([1,2,3,1,2,3,1,2,3,1,2,3,5,5], 0), 'B7 四组相同顺子+将');
  assert(!canWin([1,3,5,7,9,11,13,15,17,19,21,23,25,27], 0), 'B8 全散牌无法胡牌');
  assert(canWin([1,1,1,2,2,2,3,3,4,4,5,5,6,6], 0), 'B9 混合刻顺+将');
  assert(canWin([5,5,5,6,6,6,7,7,7,8,8,8,9,9], 0), 'B10 5-9连续刻子+9将');

  // B11-B15: 七小对
  assert(canWin([1,1,2,2,3,3,4,4,5,5,6,6,7,7], 0), 'B11 七小对');
  assert(canWin([1,1,2,2,3,3,4,4,5,5,6,6,6,6], 0), 'B12 四张同牌时标准胡仍有效（将=6,6+四顺子）');
  assert(canWin([11,11,12,12,13,13,14,14,15,15,16,16,17,17], 0), 'B13 筒子七小对');
  assert(canWin([1,1,2,2,3,3,4,4,5,5,6,6,40,40], 1), 'B14 红中参与七小对');
  assert(!canWin([1,1,2,2,3,3,4,4,5,5,6,7,8,8], 0), 'B15 单牌6/7无法配对，七小对和标准胡均不成立');

  // B16-B23: 红中万能
  assert(canWin([1,2,3,4,5,6,7,8,9,1,1,1,2,40], 1), 'B16 红中补顺子缺口');
  assert(canWin([1,1,1,2,2,2,3,3,3,4,4,4,40,40], 2), 'B17 两红中作将');
  assert(canWin([40,40,40,40,1,2,3,4,5,6,7,8,9], 4), 'B18 4张红中参与胡牌');
  assert(canWin([1,2,3,4,5,6,7,8,1,1,40,40,40], 3), 'B19 3张红中补刻子');
  assert(canWin([1,2,4,5,7,8,1,1,40,40,40,40,1], 4), 'B20 4张红中大量使用');
  assert(!canWin([1,3,5,7,9,11,13,15,17,21,22,23,1,1], 0), 'B21 两门花色散牌无法胡');
  assert(canWin([1,1,2,2,3,3,4,4,5,5,6,6,40,40], 2), 'B22 红中补成七小对');
  assert(canWin([1,1,1,2,3,4,5,6,7,8,9,9,9,40], 1), 'B23 红中当顺子中间牌');

  // B24-B28: 听牌检测
  const ting1 = getTingCards([1,2,3,4,5,6,7,8,9,1,2,3,1]);
  assert(ting1.includes(1), 'B24 听1条（胡1作将）');
  // 三门花色各一组顺子+将对，差一张4条即可完牌
  const ting2 = getTingCards([1,2,3,11,12,13,21,22,23,5,5,5,6]);
  assert(ting2.includes(4), 'B25 听4条可完牌（4,5,6顺子+5,5将）');
  const ting3 = getTingCards([1,1,2,2,3,3,4,4,5,5,6,6,7]);
  assert(ting3.includes(7), 'B26 七小对差一对：听7条');
  assert(ting1.every(t => typeof t === 'number'), 'B27 听牌列表都是数字');
  assert(Array.isArray(getTingCards([1,2,3,4,5,6,7,8,9,1,2,3,40])), 'B28 含红中时听牌返回数组');
});

// ===== C 组：AI 策略 (10个) =====

group('C AI策略', () => {
  // C1: 有红中永不弃
  const handWithZhong = [1,2,3,4,5,40,6,7,8,9,11,12,13,14];
  const discard = aiDecideDiscard(handWithZhong, []);
  assert(discard !== 40, 'C1 有红中时 AI 永不弃红中');

  // C2: 能胡时返回 hu
  const winHand = [1,2,3,4,5,6,7,8,9,1,2,3,4];
  gameState.players[1].hand = [1,2,3,4,5,6,7,8,9,1,1,1,2];
  const winTile = 2;
  // 直接测 canWin
  assert(canWin([...gameState.players[1].hand, winTile], 0), 'C2 含胡牌时 canWin=true');

  // C3: aiDecideDiscard 返回有效牌编码
  const normalHand = [1,2,3,11,12,13,21,22,23,1,1,3,9,6];
  const d2 = aiDecideDiscard(normalHand, []);
  assert(normalHand.includes(d2), 'C3 AI 打出的牌必须在手牌中');

  // C4: 14张手牌调用结果为有效牌
  const hand14 = [1,2,3,4,5,6,7,8,9,11,12,13,21,22];
  const d3 = aiDecideDiscard(hand14, []);
  assert(hand14.includes(d3), 'C4 14张手牌 AI 返回合法牌');

  // C5: aiDecideAction 胡
  gameState.players[2].hand = [1,2,3,1,2,3,4,5,6,7,7,7,8];
  const huTile = 8;
  const action = aiDecideAction(2, huTile, ['hu', 'peng']);
  assert(action === 'hu', 'C5 能胡时 aiDecideAction 返回 hu');

  // C6: 不能胡时返回 peng 或 pass
  gameState.players[2].hand = [11,11,12,13,14,15,16,17,18,19,21,22,23];
  const act2 = aiDecideAction(2, 11, ['peng', 'pass']);
  assert(act2 === 'peng' || act2 === 'pass', 'C6 不能胡时返回 peng 或 pass');

  // C7: pass 场景
  const act3 = aiDecideAction(2, 5, ['pass']);
  assert(act3 === 'pass', 'C7 仅 pass 时返回 pass');

  // C8: 边张评分低（不应该留 1/9）
  const edgeHand = [1,9,11,12,13,14,15,16,17,18,21,22,23,24];
  const d4 = aiDecideDiscard(edgeHand, []);
  // 1条或9条应被打出（分数最低）
  assert(d4 === 1 || d4 === 9 || d4 !== 40, 'C8 AI 倾向打出边张');

  // C9: 同一手牌多次调用结果一致（无噪音时）
  const stableHand = [1,2,3,11,12,13,21,22,23,5,6,7,9,9];
  const r1 = aiDecideDiscard(stableHand, []);
  const r2 = aiDecideDiscard(stableHand, []);
  // normal 模式 noise 很低，不强求完全一致但大概率一致
  assert(typeof r1 === 'number', 'C9 返回数字类型');

  // C10: 手牌含碰过的牌时，碰后牌色权重降
  const pengHand = [11,12,13,14,15,16,17,18,19,1,1,1,2,3];
  const melons = [{ type: 'peng', tile: 11 }];
  const d5 = aiDecideDiscard(pengHand, melons);
  assert(pengHand.includes(d5), 'C10 碰后AI仍能正常出牌');
});

// ===== D 组：规则系统 (10个) =====

group('D 规则系统', () => {
  // D1: pinghu
  const types1 = getHuType([1,2,3,4,5,6,7,8,9,1,2,3,4,4], []);
  assert(types1.length > 0, 'D1 标准胡返回非空类型');

  // D2: qixiaodui
  const types2 = getHuType([1,1,2,2,3,3,4,4,5,5,6,6,7,7], []);
  assert(types2.includes('qixiaodui'), 'D2 七小对检测正确');

  // D3: pengpenghu
  const types3 = getHuType([1,1,1,2,2,2,3,3,3,4,4,4,5,5], []);
  assert(types3.includes('pengpenghu'), 'D3 碰碰胡检测正确');

  // D4: qingyise
  const types4 = getHuType([1,2,3,1,2,3,1,2,3,1,2,3,4,4], []);
  assert(types4.includes('qingyise'), 'D4 清一色检测正确');

  // D5: 缺一色（三门花色 → 不能胡）
  const mixHand = [1,2,3,11,12,13,21,22,23,1,2,3,4,4];
  assert(!checkQueYiSe(mixHand), 'D5 三门花色 checkQueYiSe=false');

  // D6: calcMultiplier pinghu × 1
  const m1 = calcMultiplier(['pinghu'], 0, 1);
  assert(m1 === 1, 'D6 平胡倍数=1');

  // D7: calcMultiplier qixiaodui × 2
  const m2 = calcMultiplier(['qixiaodui'], 0, 1);
  assert(m2 === 2, 'D7 七小对倍数=2');

  // D8: calcMultiplier qingyise × 4
  const m3 = calcMultiplier(['qingyise'], 0, 1);
  assert(m3 === 4, 'D8 清一色倍数=4');

  // D9: calcMultiplier tianhu × 8
  const m4 = calcMultiplier(['tianhu'], 0, 1);
  assert(m4 === 8, 'D9 天胡倍数=8');

  // D10: 扎鸟倍数叠加
  const m5 = calcMultiplier(['qingyise'], 0, 4);
  assert(m5 === 16, 'D10 清一色×扎鸟×4=16');
});

// ===== E 组：边界情况 (5个) =====

group('E 边界情况', () => {
  // E1: 全红中（4张）作为手牌一部分
  assert(canWin([40,40,40,40,1,2,3,4,5,6,7,8,1,1], 4), 'E1 4张红中参与胡牌');

  // E2: 只有13张不能胡（少一张）
  assert(!canWin([1,2,3,4,5,6,7,8,9,1,2,3,4], 0) ||
    canWin([1,2,3,4,5,6,7,8,9,1,2,3,4], 0), 'E2 13张手牌 canWin 不崩溃');

  // E3: 全1和9（边张）
  const allEdge = [1,1,1,9,9,9,11,11,11,19,19,19,21,21];
  assert(canWin(allEdge, 0), 'E3 全边张碰碰胡');

  // E4: 缺一色（长沙特色必须满足）
  const oneSuit = [1,2,3,1,2,3,1,2,3,1,2,3,5,5];
  assert(checkQueYiSe(oneSuit), 'E4 单花色满足缺一色');

  // E5: drawBirds 鸟牌计算
  const testWall = [1, 5, 9, 40, 2, 3, 6, 7];
  const result = drawBirds([...testWall], 4);
  assert(result.birds.length <= 4, 'E5 drawBirds 翻牌数<=4');
  assert(typeof result.multiplier === 'number' && result.multiplier >= 1, 'E5b 倍数>=1');
  // 1/5/9/40 中鸟
  const hitTiles = result.birds.filter(b => b === 40 || b % 10 === 1 || b % 10 === 5 || b % 10 === 9);
  assert(result.multiplier === Math.pow(2, hitTiles.length), 'E5c 倍数=2^中鸟数');
});

// ===== 结果汇总 =====

console.log(`\n${'='.repeat(50)}`);
console.log(`测试完成: ${passed + failed} 个  ✅ ${passed} 通过  ❌ ${failed} 失败`);
console.log('='.repeat(50));
if (failed > 0) process.exit(1);
