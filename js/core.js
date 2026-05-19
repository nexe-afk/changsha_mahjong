// ===== 长沙红中麻将 - 核心数据 =====

const SUITS = {
  TIAO: 0,
  TONG: 1,
  WAN: 2,
};

const SUIT_NAMES = { 0: '条', 1: '筒', 2: '万' };
const SUIT_SYMBOLS = { 0: '🀐', 1: '🀙', 2: '🀇' };

const HONGZHONG = 40;
const TILES_PER_SUIT = 9;  // 1-9
const WINDS = ['东', '南', '西', '北'];

// 牌编码: suit*10 + value
// 条1=1 ~ 条9=9, 筒1=11 ~ 筒9=19, 万1=21 ~ 万9=29, 中=40
function encodeTile(suit, value) {
  if (suit === 'zhong') return HONGZHONG;
  return suit * 10 + value;
}

function decodeTile(code) {
  if (code === HONGZHONG) return { suit: 'zhong', value: '中', name: '中' };
  const suit = Math.floor(code / 10);
  const value = code % 10;
  return { suit, value, name: `${value}${SUIT_NAMES[suit]}` };
}

function isZhong(code) { return code === HONGZHONG; }
function getSuit(code) {
  if (code === HONGZHONG) return 'zhong';
  return Math.floor(code / 10);
}
function getValue(code) {
  if (code === HONGZHONG) return 0;
  return code % 10;
}
function isSuit(code) { return code !== HONGZHONG; }

// 获取所有有效牌（不重复，用于听牌检测）
function getAllValidTiles() {
  const tiles = [];
  for (let s = 0; s < 3; s++) {
    for (let v = 1; v <= 9; v++) {
      tiles.push(s * 10 + v);
    }
  }
  tiles.push(HONGZHONG);
  return tiles;
}

// ===== 牌墙 =====

function createWall() {
  let wall = [];
  // 每种花色的 1-9，每个4张
  for (let s = 0; s < 3; s++) {
    for (let v = 1; v <= 9; v++) {
      for (let i = 0; i < 4; i++) {
        wall.push(s * 10 + v);
      }
    }
  }
  // 4张红中
  for (let i = 0; i < 4; i++) {
    wall.push(HONGZHONG);
  }
  return wall;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 发牌: 每人13张
function deal(wall) {
  const hands = [[], [], [], []];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 13; j++) {
      hands[i].push(wall.pop());
    }
    hands[i].sort((a, b) => a - b);
  }
  return hands;
}

// ===== 工具函数 =====

function countInHand(hand, tile) {
  return hand.filter(t => t === tile).length;
}

function getCountMap(hand) {
  const map = {};
  for (const t of hand) {
    map[t] = (map[t] || 0) + 1;
  }
  return map;
}

function removeTiles(hand, tiles) {
  const result = [...hand];
  for (const t of tiles) {
    const idx = result.indexOf(t);
    if (idx !== -1) result.splice(idx, 1);
  }
  return result;
}

function removeN(hand, tile, n) {
  const result = [...hand];
  for (let i = 0; i < n; i++) {
    const idx = result.indexOf(tile);
    if (idx === -1) break;
    result.splice(idx, 1);
  }
  return result;
}

function hasSequential(hand, tile) {
  if (!isSuit(tile)) return false;
  const v = getValue(tile);
  if (v > 7) return false;  // 8,9不能起顺子
  const s = getSuit(tile);
  return hand.includes(s * 10 + v + 1) && hand.includes(s * 10 + v + 2);
}

function removeSeq(hand, tile) {
  if (!isSuit(tile)) return hand;
  const v = getValue(tile);
  const s = getSuit(tile);
  return removeTiles(hand, [tile, s * 10 + v + 1, s * 10 + v + 2]);
}

// 计算手牌中红中数量
function countZhong(hand) {
  return hand.filter(t => t === HONGZHONG).length;
}

// 排序
function sortHand(hand) {
  return [...hand].sort((a, b) => a - b);
}

// 获取手牌中的对子
function findPairs(hand) {
  const count = getCountMap(hand);
  const pairs = [];
  for (const [tile, cnt] of Object.entries(count)) {
    if (cnt >= 2) pairs.push(parseInt(tile));
  }
  return pairs;
}

// ===== 游戏全局状态 =====

const gameState = {
  wall: [],
  players: [
    { hand: [], melons: [], discards: [], score: 0, isHuman: true },
    { hand: [], melons: [], discards: [], score: 0, isHuman: false },
    { hand: [], melons: [], discards: [], score: 0, isHuman: false },
    { hand: [], melons: [], discards: [], score: 0, isHuman: false },
  ],
  currentPlayer: 0,
  lastDiscard: null,
  lastDiscardPlayer: -1,
  isProcessing: false,
  turnPhase: 'idle',
  selectedTile: null,
  gameOver: false,
  huCount: 0,
  huPlayers: [],
  zhongCount: 4,
};
