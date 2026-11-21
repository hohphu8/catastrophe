// Deterministic gameplay rules. Canvas and GyosJS are deliberately kept out of this file.
export const WIDTH = 1000;
export const HEIGHT = 560;
export const DURATION = 72;

const prop = (id, name, emoji, x, y, value, kind = 'small') =>
  ({ id, name, emoji, x, y, value, kind });

export const ROOMS = [
  {
    id: 'living', name: 'Phòng khách', subtitle: 'The living room', number: '01',
    tagline: 'Mọi thứ ở đây đều rất… dễ vỡ.',
    accent: '#fcad78', sky: '#fbe9d8',
    things: [
      prop('fern', 'Chậu cây vô tội', '🪴', 128, 318, 130),
      prop('cup', 'Ly cà phê của sen', '☕', 305, 354, 95),
      prop('vase', 'Bình hoa gia truyền', '🏺', 435, 273, 180),
      prop('lamp', 'Đèn ngủ sang chảnh', '💡', 640, 341, 145),
      prop('books', 'Sách chưa bao giờ đọc', '📚', 777, 259, 110),
      prop('frame', 'Khung ảnh cưới', '🖼️', 862, 183, 200),
      prop('snack', 'Bánh quy mới mua', '🍪', 470, 357, 85),
      prop('bear', 'Gấu bông đáng ngờ', '🧸', 567, 431, 80),
      prop('remote', 'Điều khiển TV', '🎮', 342, 431, 90),
      prop('fish', 'Bể cá của sen', '🐠', 822, 353, 220)
    ]
  },
  {
    id: 'kitchen', name: 'Nhà bếp', subtitle: 'The kitchen', number: '02',
    tagline: 'Nếu không được ăn pate thì không ai được ăn.',
    accent: '#c8dca0', sky: '#e4f0d9',
    things: [
      prop('bread', 'Bánh mì nóng hổi', '🥖', 170, 337, 85),
      prop('glass', 'Ly thủy tinh', '🥛', 297, 337, 115),
      prop('cake', 'Bánh sinh nhật', '🎂', 421, 333, 180),
      prop('pot', 'Nồi canh của sen', '🍲', 545, 331, 140),
      prop('fruit', 'Rổ trái cây', '🍎', 670, 337, 95),
      prop('plates', 'Bát đĩa sứ', '🍽️', 786, 253, 180),
      prop('mug', 'Cốc trà sữa', '🧋', 891, 338, 110),
      prop('spoon', 'Muỗng mạ vàng', '🥄', 347, 428, 80),
      prop('jar', 'Hũ dưa muối', '🫙', 742, 432, 135),
      prop('herb', 'Cây húng quế', '🌿', 157, 247, 85)
    ]
  },
  {
    id: 'studio', name: 'Góc làm việc', subtitle: 'The home office', number: '03',
    tagline: 'Deadline là gì? Mèo chỉ biết đạp bàn phím.',
    accent: '#b7b6ee', sky: '#e3e5f9',
    things: [
      prop('keyboard', 'Bàn phím cơ', '⌨️', 274, 355, 150),
      prop('monitor', 'Màn hình 4K', '🖥️', 426, 286, 250),
      prop('coffee', 'Cà phê đêm', '☕', 566, 356, 100),
      prop('papers', 'Hợp đồng quan trọng', '📄', 693, 353, 125),
      prop('trophy', 'Cúp nhân viên tốt', '🏆', 788, 229, 170),
      prop('plant', 'Cây cảnh công sở', '🪴', 169, 335, 105),
      prop('router', 'Cục Wi-Fi', '📡', 901, 345, 175),
      prop('lamp', 'Đèn học', '💡', 124, 240, 115),
      prop('headphones', 'Tai nghe chống ồn', '🎧', 704, 435, 125),
      prop('fish', 'Đồ ăn của mèo', '🥫', 468, 436, 75)
    ]
  }
];

export function createGame(roomIndex = 0) {
  if (!Number.isInteger(roomIndex) || roomIndex < 0 || roomIndex >= ROOMS.length)
    throw new RangeError('Unknown room');
  return {
    roomIndex, phase: 'ready', score: 0, suspicion: 0, timeLeft: DURATION,
    combo: 0, comboTimer: 0, bestCombo: 0, attacks: 0,
    hiding: 0, hideCooldown: 0, outcome: null,
    props: ROOMS[roomIndex].things.map(p => ({
      ...p, originX: p.x, originY: p.y, state: 'idle',
      vx: 0, vy: 0, spin: 0, angle: 0, hitGround: false
    }))
  };
}

export function startRound(game) {
  if (game.phase !== 'ready') return false;
  game.phase = 'playing';
  return true;
}

export function endRound(game, reason) {
  if (game.phase !== 'playing') return;
  game.phase = 'ended';
  game.outcome = reason;
}

export function swat(game, id, chain = false) {
  if (game.phase !== 'playing' || (!chain && game.hiding > 0)) return null;
  const item = game.props.find(p => p.id === id && p.state === 'idle');
  if (!item) return null;
  game.combo = game.comboTimer > 0 ? Math.min(game.combo + 1, 9) : 1;
  game.bestCombo = Math.max(game.bestCombo, game.combo);
  game.comboTimer = 3.1;
  const gain = item.value * game.combo;
  game.score += gain;
  game.attacks++;
  game.suspicion = Math.min(100, game.suspicion + (chain ? 6 : 17));
  item.state = 'flying';
  item.vx = (chain ? 120 : 175) * (game.attacks % 2 ? 1 : -1);
  item.vy = -240 - (game.attacks % 4) * 26;
  item.spin = (game.attacks % 2 ? 1 : -1) * (2.6 + game.attacks % 3);
  if (game.props.every(p => p.state !== 'idle')) endRound(game, 'clean');
  else if (game.suspicion >= 100) endRound(game, 'caught');
  return { item, gain, combo: game.combo, chain };
}

export function hide(game) {
  if (game.phase !== 'playing' || game.hiding > 0 || game.hideCooldown > 0 ||
      game.suspicion < 1 || game.timeLeft <= 2) return false;
  game.suspicion = Math.max(0, game.suspicion - 48);
  game.hiding = 1.25;
  game.hideCooldown = 9;
  game.timeLeft = Math.max(0, game.timeLeft - 2);
  return true;
}

export function tick(game, seconds) {
  if (game.phase !== 'playing') return;
  const dt = Math.min(0.05, Math.max(0, Number(seconds) || 0));
  game.timeLeft = Math.max(0, game.timeLeft - dt);
  if (game.timeLeft < 0.000001) game.timeLeft = 0; // Avoid floating-point remnants after 72 seconds.
  game.hideCooldown = Math.max(0, game.hideCooldown - dt);
  game.hiding = Math.max(0, game.hiding - dt);
  game.comboTimer = Math.max(0, game.comboTimer - dt);
  if (game.comboTimer === 0) game.combo = 0;
  game.suspicion = Math.max(0, game.suspicion - dt * 4.6);
  if (game.timeLeft <= 0) endRound(game, 'time');
}

export function roomProgress(game) {
  return game.props.filter(p => p.state !== 'idle').length;
}
