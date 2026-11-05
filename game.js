'use strict';

/* =========================================================
   KONFIGURASI
   (nanti bisa diganti dari data master tim / localStorage)
   ========================================================= */
const CONFIG = {
  COLS: 12,            // kolom lapangan (x = 1..12, x = 0 & 13 adalah gawang)
  ROWS: 5,             // baris lapangan (y = 0..4)
  GOAL_ROWS: [1, 2, 3],// baris mulut gawang (3 kotak tengah)
  MAX_MOVE: 3,         // maksimal langkah pemain (horizontal / vertikal)
  MAX_DIAG: 1,         // maksimal langkah diagonal
  // Lambung otomatis: peluang bola melewati lawan di jalurnya, makin jauh makin kecil.
  // jarak <= FULL : peluang penuh (BASE); turun linear sampai 0% di jarak >= ZERO
  OVER_BASE: 0.50, OVER_FULL: 2, OVER_ZERO: 9,   // melewati pemain lapangan lawan
  GK_BASE: 0.40,   GK_FULL: 2,   GK_ZERO: 8,     // menembus kiper yang tepat di jalur bola
  GK_DIVE_BASE: 0.60, GK_DIVE_ZERO: 9,           // lolos dari tepisan kiper (bola tidak lurus ke kiper)
  // Menembak dari depan gawang (kotak penalti): peluang gol lebih tinggi
  GK_BOX_LINE: 0.60,   // menembus kiper yang tepat di jalur bola
  GK_BOX_DIVE: 0.80,   // lolos dari tepisan kiper
  // Tembakan ke sisi gawang yang jauh dari kiper (beda >= 2 baris): kiper tidak terjangkau,
  // gagal hanya karena kena tiang / melenceng; tetap turun jika menembak dari jauh
  GK_OPEN_BASE: 0.95, GK_OPEN_FULL: 3, GK_OPEN_ZERO: 13,
  // Tendangan jauh bisa berhenti di tengah jalan
  REACH_SAFE: 4,       // sampai jarak ini bola pasti sampai tujuan
  REACH_DROP: 0.10,    // tiap 1 kotak lebih jauh, peluang sampai turun 10%
  REACH_MIN: 0.25,     // peluang sampai paling kecil
  // Energi giliran
  ENERGY: 12,          // energi tiap giliran (sisa hangus di akhir giliran)
  COST_MOVE_BASE: 1,   // biaya mengaktifkan pemain tanpa bola
  COST_STEP: 1,        // gerak lurus per kotak
  COST_DIAG: 2,        // gerak diagonal
  COST_DRIBBLE: 2,     // giring lurus per kotak
  COST_DRIBBLE_DIAG: 3,// giring diagonal
  COST_STEAL: 2,       // tambahan saat merebut bola
  COST_PASS: [2, 3, 4],// oper/tendang: <= 3 kotak, <= 6 kotak, lebih jauh
  COST_SHOT: 3,        // tembak ke gawang (+1 jika lebih dari 6 kotak)
  FOUL_CHANCE: 0.25,   // peluang pelanggaran saat merebut bola
  // Kartu saat pelanggaran (sisanya = hanya peringatan)
  CARD_YELLOW: 0.35,
  CARD_RED: 0.10,
  PEN_SAVE: 0.20,      // peluang kiper menahan penalti
  TURN_SECONDS: 15,    // waktu per giliran
  HALF_SECONDS: 150,   // 2,5 menit per babak (total 5 menit)
  WALL_SIZE: 2,        // jumlah pemain pagar betis saat tendangan bebas
};

// Nama & warna tim diatur pemain di layar awal
const TEAMS = {
  home: { name: 'Tim Biru', color: '#2f7cf6' },
  away: { name: 'Tim Merah', color: '#ef4444' },
};

const PALETTE = [
  ['Biru', '#2f7cf6'], ['Merah', '#ef4444'], ['Kuning', '#facc15'], ['Ungu', '#8b5cf6'],
  ['Oranye', '#f97316'], ['Pink', '#ec4899'], ['Cyan', '#06b6d4'], ['Hitam', '#1f2937'], ['Putih', '#f1f5f9'],
];

// Formasi 1-2-2-1 untuk tim yang bermain di sisi KIRI.
// Tim sisi kanan dicerminkan otomatis. kx = posisi x penyerang saat kick off.
const FORMATION = [
  { role: 'GK', num: 1,  x: 1, y: 2 },
  { role: 'DF', num: 2,  x: 3, y: 1 },
  { role: 'DF', num: 4,  x: 3, y: 3 },
  { role: 'MF', num: 7,  x: 5, y: 0 },
  { role: 'MF', num: 11, x: 5, y: 4 },
  { role: 'FW', num: 9,  x: 5, y: 2, kx: 6 },
];

const DIRS4 = [[1,0],[-1,0],[0,1],[0,-1]];
const DIRS8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

/* =========================================================
   STATE
   ========================================================= */
const S = {
  phase: 'toss',      // setup | toss | play | animating | penalty | goal | break | over
  vs: 'pvp',          // pvp = player vs player, pvc = player vs komputer
  bots: new Set(),    // tim yang dijalankan komputer (kosong jika pvp)
  speed: 1,           // kecepatan permainan (mode tonton komputer)
  match: null,        // konteks pertandingan liga/piala: { onEnd(home, away, events), knockout }
  events: [],         // kejadian pertandingan (gol + assist) untuk statistik liga
  lastPass: null,     // operan terakhir { from, to } untuk menentukan assist
  turnId: 0,          // bertambah tiap giliran baru (dipakai bot)
  paused: false,
  half: 1,
  clock: CONFIG.HALF_SECONDS,
  turnTime: CONFIG.TURN_SECONDS,
  turn: 'home',
  firstKickoff: 'home',
  score: { home: 0, away: 0 },
  players: [],
  ball: { x: 6, y: 2 },
  selected: null,
  mode: 'move',       // move | kick
  energy: CONFIG.ENERGY, // energi giliran tersisa
  used: new Set(),    // id pemain yang sudah bergerak/menggiring giliran ini (maks 1x per pemain)
  action: 'kick',     // pilihan pembawa bola: kick | dribble
  pickOther: false,   // pembawa bola memilih menggerakkan pemain lain
  aim: null,          // titik bidik (koordinat kotak, desimal) saat mode tendang
  kickLen: 0,         // panjang tendangan pilihan pemain (kotak); 0 = otomatis sampai titik bidik
  cards: {},          // id pemain -> jumlah kartu kuning
  sentOff: new Set(), // id pemain yang dikartu merah
  setPiece: null,     // null | 'free' (tendangan bebas sedang berlangsung)
  walls: [],          // id pemain pagar betis saat tendangan bebas
  penalty: null,      // { taker, def } saat fase penalti
  targets: [],
  hint: '',
};

const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms / (S.speed || 1)));
const other = t => (t === 'home' ? 'away' : 'home');
const leftTeam = () => (S.half === 1 ? 'home' : 'away');
const sideOf = t => (t === leftTeam() ? 'left' : 'right');
const mirrorX = x => CONFIG.COLS + 1 - x;
const inField = (x, y) => x >= 1 && x <= CONFIG.COLS && y >= 0 && y < CONFIG.ROWS;
const playerAt = (x, y) => S.players.find(p => p.x === x && p.y === y);
const holder = () => playerAt(S.ball.x, S.ball.y);
const getSel = () => S.players.find(p => p.id === S.selected);
// Area kiper: kolom paling depan di depan mulut gawang. Hanya kiper yang boleh berada di sini.
const isGkArea = (x, y) => (x === 1 || x === CONFIG.COLS) && CONFIG.GOAL_ROWS.includes(y);
const teamName = t => TEAMS[t].name;
// nama pemain (jika tim punya daftar nama), selain itu nomor punggung
const pl = p => (p && p.name) ? p.name : `#${p ? p.num : '?'}`;
const isBotTurn = () => S.bots.has(S.turn);
const humanTeam = () => ['home', 'away'].find(t => !S.bots.has(t)) || null;

/* =========================================================
   ATURAN
   ========================================================= */
// Tempatkan semua pemain di posisi formasi. kickTeam = tim yang kick off (penyerangnya maju ke bola).
function placeFormation(kickTeam = null) {
  S.players = [];
  for (const t of ['home', 'away']) {
    const left = sideOf(t) === 'left';
    for (const f of FORMATION) {
      if (S.sentOff.has(t + f.num)) continue; // pemain kartu merah tidak kembali
      let x = (f.kx && t === kickTeam) ? f.kx : f.x;
      if (!left) x = mirrorX(x);
      const name = TEAMS[t].squad ? TEAMS[t].squad[f.num] : null;
      S.players.push({ id: t + f.num, team: t, num: f.num, role: f.role, x, y: f.y, name });
    }
  }
}

function setupKickoff(team) {
  placeFormation(team);
  S.lastPass = null;
  S.ball = { x: sideOf(team) === 'left' ? 6 : 7, y: 2 };
  S.setPiece = null;
  S.penalty = null;
  newTurn(team);
  S.phase = 'play';
  refresh();
}

// Mulai giliran baru untuk tim t: waktu & energi penuh
function newTurn(t) {
  S.turnId++;
  S.turn = t;
  S.turnTime = CONFIG.TURN_SECONDS;
  S.energy = CONFIG.ENERGY;
  S.used = new Set();
  S.selected = null;
  S.action = 'kick';
  S.pickOther = false;
  S.aim = null;
  S.setPiece = null;
  S.walls = [];
}

// Target gerak: lurus 4 arah (kiper hanya naik/turun di area gawang).
// Kotak lawan yang membawa bola boleh dituju = rebut bola.
function moveTargets(p) {
  const res = [];
  // [dx, dy, maksLangkah]: lurus maks 3, diagonal maks 1
  const dirs = p.role === 'GK'
    ? [[0, 1, CONFIG.MAX_MOVE], [0, -1, CONFIG.MAX_MOVE]]
    : [...DIRS4.map(d => [...d, CONFIG.MAX_MOVE]), ...DIRS8.slice(4).map(d => [...d, CONFIG.MAX_DIAG])];
  const dribbling = S.ball.x === p.x && S.ball.y === p.y;
  for (const [dx, dy, max] of dirs) {
    const diag = dx !== 0 && dy !== 0;
    for (let s = 1; s <= max; s++) {
      const nx = p.x + dx * s, ny = p.y + dy * s;
      if (!inField(nx, ny)) break;
      if (p.role === 'GK' && !CONFIG.GOAL_ROWS.includes(ny)) break;
      if (p.role !== 'GK' && isGkArea(nx, ny)) break; // area kiper terlarang
      const cost = dribbling
        ? (diag ? CONFIG.COST_DRIBBLE_DIAG : CONFIG.COST_DRIBBLE * s)
        : CONFIG.COST_MOVE_BASE + (diag ? CONFIG.COST_DIAG : CONFIG.COST_STEP * s);
      const q = playerAt(nx, ny);
      if (q) {
        const isHolder = S.ball.x === nx && S.ball.y === ny;
        // bola tidak bisa direbut dari kiper
        if (q.team !== p.team && isHolder && !dribbling && q.role !== 'GK') {
          const push = pushCell(q, p);
          if (push) res.push({ x: nx, y: ny, steal: q, push, cost: cost + CONFIG.COST_STEAL });
        }
        break;
      }
      res.push({ x: nx, y: ny, cost });
    }
  }
  return res;
}

// Kotak kosong terdekat untuk pemain yang bolanya direbut,
// diutamakan mundur ke arah gawangnya sendiri.
function pushCell(victim, mover) {
  const ownGoalX = sideOf(victim.team) === 'left' ? 0 : CONFIG.COLS + 1;
  const free = (x, y) => inField(x, y) && !isGkArea(x, y) && !(x === mover.x && y === mover.y ? false : playerAt(x, y));
  const cands = victim.role === 'GK'
    ? [[0, 1], [0, -1]].map(([dx, dy]) => ({ x: victim.x + dx, y: victim.y + dy }))
        .filter(c => CONFIG.GOAL_ROWS.includes(c.y))
    : DIRS8.map(([dx, dy]) => ({ x: victim.x + dx, y: victim.y + dy }));
  const ok = cands.filter(c => free(c.x, c.y));
  ok.sort((a, b) => Math.abs(a.x - ownGoalX) - Math.abs(b.x - ownGoalX)
                 || Math.abs(a.y - 2) - Math.abs(b.y - 2));
  return ok[0] || null;
}

// Kotak penalti sisi 'left' / 'right' (2 kolom terdepan x 3 baris tengah)
function inBox(x, y, side) {
  if (!CONFIG.GOAL_ROWS.includes(y)) return false;
  return side === 'left' ? x >= 1 && x <= 2 : x >= CONFIG.COLS - 1 && x <= CONFIG.COLS;
}

const isGoalCell = (x, y) => (x === 0 || x === CONFIG.COLS + 1) && CONFIG.GOAL_ROWS.includes(y);
const falloff = (d, base, full, zero) => base * Math.max(0, Math.min(1, (zero - d) / (zero - full)));

// Peluang lambung otomatis melewati lawan p, bergantung jarak tendangan d (kotak)
// close = ditendang dari depan gawang (kotak penalti lawan)
// gap = selisih baris antara kiper & titik tujuan di gawang (untuk tepisan)
function overChance(p, d, dive = false, close = false, gap = 1) {
  if (dive && gap === 0) return close ? CONFIG.GK_BOX_LINE : falloff(d, CONFIG.GK_BASE, CONFIG.GK_FULL, CONFIG.GK_ZERO);
  if (dive && gap >= 2) return close ? CONFIG.GK_OPEN_BASE : falloff(d, CONFIG.GK_OPEN_BASE, CONFIG.GK_OPEN_FULL, CONFIG.GK_OPEN_ZERO);
  if (dive) return close ? CONFIG.GK_BOX_DIVE : falloff(d, CONFIG.GK_DIVE_BASE, CONFIG.GK_FULL, CONFIG.GK_DIVE_ZERO);
  if (p.role === 'GK') return close ? CONFIG.GK_BOX_LINE : falloff(d, CONFIG.GK_BASE, CONFIG.GK_FULL, CONFIG.GK_ZERO);
  return falloff(d, CONFIG.OVER_BASE, CONFIG.OVER_FULL, CONFIG.OVER_ZERO);
}

// Peluang bola benar-benar sampai ke tujuan (tendangan jauh bisa berhenti di tengah)
function reachChance(d) {
  if (d <= CONFIG.REACH_SAFE) return 1;
  return Math.max(CONFIG.REACH_MIN, 1 - (d - CONFIG.REACH_SAFE) * CONFIG.REACH_DROP);
}

// Kotak-kotak yang dilewati garis dari tengah kotak 'from' ke titik (tx, ty), berurutan.
function lineCells(from, tx, ty) {
  const ax = from.x + 0.5, ay = from.y + 0.5;
  const steps = Math.max(1, Math.ceil(Math.hypot(tx - ax, ty - ay) / 0.04));
  const runs = [];
  let cur = { x: from.x, y: from.y, n: 0 };
  for (let i = 1; i <= steps; i++) {
    const cx = Math.floor(ax + (tx - ax) * i / steps);
    const cy = Math.floor(ay + (ty - ay) * i / steps);
    if (cx === cur.x && cy === cur.y) { cur.n++; continue; }
    cur = { x: cx, y: cy, n: 1 };
    runs.push(cur);
  }
  // kotak yang hanya terserempet sudutnya (< ~0.1 kotak) diabaikan, kecuali kotak tujuan
  return runs.filter((r, i) => r.n >= 3 || i === runs.length - 1).map(({ x, y }) => ({ x, y }));
}

// Rencana tendangan bebas arah ke titik bidik (aim). Bola melaju lurus ke kotak tujuan:
//  - lewat teman          -> bola terus (teman membiarkan bola lewat)
//  - lewat lawan / kiper  -> lambung otomatis, diundi lolos (peluang turun sesuai jarak)
//  - tujuan = teman       -> operan
//  - tujuan = gawang      -> tembakan
//  - garis keluar lapangan-> bola berhenti di kotak terakhir di lapangan
// Tendangan jauh punya peluang berhenti di tengah jalan.
// Titik tujuan tendangan: arah dari titik bidik, panjang dari pengaturan (jika diatur).
function kickPoint(k, aim, kickLen = S.kickLen) {
  if (!kickLen) return aim;
  const ax = k.x + 0.5, ay = k.y + 0.5;
  const len = Math.hypot(aim.x - ax, aim.y - ay);
  if (len < 0.01) return aim;
  return { x: ax + (aim.x - ax) / len * kickLen, y: ay + (aim.y - ay) / len * kickLen };
}

function planKick(k, aim, kickLen = S.kickLen) {
  const from = { x: k.x, y: k.y };
  const path = [];
  let goal = null;
  const pt = kickPoint(k, aim, kickLen);
  for (const c of lineCells(from, pt.x, pt.y)) {
    if (isGoalCell(c.x, c.y)) { path.push(c); goal = c.x === 0 ? 'left' : 'right'; break; }
    if (!inField(c.x, c.y)) break;
    path.push(c);
  }
  if (!path.length) return null;
  const end = path[path.length - 1];
  const d = Math.hypot(end.x - from.x, end.y - from.y);
  const blockers = [];
  let receiver = null;
  // tembakan ke gawang: peluang melewati kiper ditentukan selisih baris kiper & titik tujuan
  const gk = goal ? S.players.find(p => p.role === 'GK' && sideOf(p.team) === goal) : null;
  let gkAt = -1;
  path.forEach((c, i) => {
    const p = playerAt(c.x, c.y);
    if (!p) return;
    if (i === path.length - 1) { receiver = p; return; }
    if (p.team === k.team) return;
    if (p === gk) { gkAt = i; return; }
    const close = p.role === 'GK' && inBox(from.x, from.y, sideOf(p.team));
    blockers.push({ at: i, p, chance: overChance(p, d, false, close) });
  });
  if (gk) {
    const gap = Math.abs(gk.y - end.y);
    blockers.push({ at: gkAt >= 0 ? gkAt : path.length - 1, p: gk, dive: gap > 0, gap,
      chance: overChance(gk, d, true, inBox(from.x, from.y, goal), gap) });
    blockers.sort((a, b) => a.at - b.at);
  }
  const reach = reachChance(d);
  const success = blockers.reduce((a, b) => a * b.chance, reach);
  const plan = { from, path, goal, d, blockers, receiver, reach, success };
  plan.cost = kickCost(plan);
  return plan;
}

// Biaya energi tendangan (tendangan bebas gratis: energi berlaku setelah bola dimainkan)
function kickCost(plan) {
  if (S.setPiece === 'free') return 0;
  if (plan.goal) return CONFIG.COST_SHOT + (plan.d > 6 ? 1 : 0);
  const [a, b, c] = CONFIG.COST_PASS;
  return plan.d <= 3 ? a : plan.d <= 6 ? b : c;
}

// Undi hasil tendangan sebenarnya
function simulateKick(plan) {
  const len = plan.path.length;
  let stop = len - 1, short = false;
  if (Math.random() > plan.reach && len >= 2) {
    const lo = Math.max(0, Math.ceil(len * 0.4) - 1), hi = len - 2;
    stop = lo + Math.floor(Math.random() * (hi - lo + 1));
    short = true;
  }
  const events = [];
  let receiver = null;
  for (const b of plan.blockers) {
    if (b.at > stop) break;
    if (short && b.at === stop) { receiver = b.p; break; } // bola habis tenaga tepat di kaki lawan
    const through = Math.random() < b.chance;
    events.push({ ...b, through });
    if (!through) { stop = b.at; receiver = b.p; break; }
  }
  const path = plan.path.slice(0, stop + 1);
  const end = path[path.length - 1];
  const goal = !receiver && !short && plan.goal ? plan.goal : null;
  if (!goal && !receiver) receiver = playerAt(end.x, end.y) || null;
  return { path, goal, receiver, events, short };
}

// Hitung mode giliran, target & petunjuk
function refresh() {
  S.targets = [];
  S.mode = 'move';
  if (S.phase !== 'play') return;
  const h = holder();
  const ownHolder = h && h.team === S.turn ? h : null;
  const afford = t => t.cost <= S.energy;

  // Tim sendiri membawa bola: pembawa bola terpilih otomatis
  if (ownHolder && !S.selected && !S.pickOther) S.selected = ownHolder.id;
  const sel = getSel();

  if (sel && sel === ownHolder) {
    if (S.action === 'dribble' && !S.used.has(sel.id) && !S.setPiece) {
      S.targets = moveTargets(sel).filter(afford);
      S.hint = `<b>${pl(sel)}</b> <b>menggiring</b> bola: klik kotak tujuan (${CONFIG.COST_DRIBBLE} energi/kotak, diagonal ${CONFIG.COST_DRIBBLE_DIAG}).`;
      return;
    }
    S.action = 'kick';
    S.mode = 'kick';
    S.hint = S.setPiece === 'free'
      ? `<b>TENDANGAN BEBAS</b> ${pl(sel)}: bidik ke arah mana saja lalu klik untuk menendang (tanpa energi).${S.walls.length ? ' Pagar betis lawan ditandai.' : ''}`
      : `<b>${pl(sel)}</b> membawa bola: bidik <b>ke mana saja</b> lalu klik untuk menendang` +
        (S.used.has(sel.id) ? '.' : ', atau ganti aksi di kanan.');
    return;
  }
  if (sel && sel.team === S.turn && !S.used.has(sel.id)) {
    S.targets = moveTargets(sel).filter(afford);
    const steal = S.targets.some(t => t.steal);
    S.hint = (sel.role === 'GK'
      ? `Kiper <b>${pl(sel)}</b>: klik kotak tujuan (naik/turun di area kiper)`
      : `Klik kotak tujuan untuk <b>${pl(sel)}</b>, angka = biaya energi`) +
      (steal ? `. Lingkaran merah = <b>rebut bola</b>.` : `, atau pilih pemain lain.`);
    if (!S.targets.length) S.hint = `<b>${pl(sel)}</b> tidak bisa bergerak (energi kurang / terhalang). Pilih pemain lain.`;
    return;
  }
  S.selected = null;
  S.aim = null;
  S.hint = `Pilih pemain untuk digerakkan (tiap pemain maks 1x per giliran).`;
  if (ownHolder) S.hint += ` Klik <b>${pl(ownHolder)}</b> untuk menendang/menggiring.`;
  else if (h) S.hint += ` Dekati pembawa bola lawan untuk <b>merebut</b> bola.`;
  else S.hint += ` Gerak ke kotak bola untuk <b>menguasai</b> bola.`;
}

// Masih ada aksi yang bisa dilakukan dengan sisa energi?
function canAct() {
  const minKick = Math.min(...CONFIG.COST_PASS, CONFIG.COST_SHOT);
  const h = holder();
  if (h && h.team === S.turn && S.energy >= minKick) return true;
  return S.players.some(p => p.team === S.turn && !S.used.has(p.id) &&
    moveTargets(p).some(t => t.cost <= S.energy));
}

// Setelah satu aksi selesai: lanjut giliran, atau akhiri jika energi tidak cukup lagi
function continueTurn() {
  S.phase = 'play';
  S.aim = null;
  if (!canAct()) {
    addLog(`Energi ${teamName(S.turn)} habis, giliran berganti`, S.turn, 'info');
    endTurn();
    return;
  }
  refresh();
  render();
}

function endTurn() {
  if (S.clock <= 0) { endHalf(); return; }
  newTurn(other(S.turn));
  S.phase = 'play';
  refresh();
  render();
}

function setAction(act) {
  if (S.phase !== 'play' || S.paused || isBotTurn()) return;
  if (S.setPiece) return; // tendangan bebas harus ditendang dulu
  const h = holder();
  if (!h || h.team !== S.turn) return;
  if (act === 'dribble' && S.used.has(h.id)) return; // sudah bergerak/menggiring giliran ini
  S.aim = null;
  if (act === 'other') {
    // pembawa bola diam, pilih pemain lain untuk digerakkan
    S.selected = null;
    S.pickOther = true;
    S.action = 'kick';
  } else {
    S.selected = h.id;
    S.pickOther = false;
    S.action = act;
  }
  refresh();
  render();
}

/* =========================================================
   AKSI
   ========================================================= */
function onPlayerClick(id) {
  if (S.phase !== 'play' || S.paused || S.setPiece || isBotTurn()) return;
  const p = S.players.find(q => q.id === id);
  if (!p || p.team !== S.turn) return;
  const isHolder = holder() === p;
  if (!isHolder && S.used.has(p.id)) return; // pemain ini sudah bergerak giliran ini
  S.aim = null;
  if (isHolder && S.selected === id) {
    // klik pembawa bola lagi = ganti aksi: Tendang <-> Giring
    S.action = S.action === 'kick' && !S.used.has(p.id) ? 'dribble' : 'kick';
  } else {
    S.selected = S.selected === id ? null : id;
    S.pickOther = !S.selected && holder() && holder().team === S.turn;
    S.action = 'kick';
  }
  refresh();
  render();
}

async function onTargetClick(t) {
  if (S.phase !== 'play' || S.paused || isBotTurn()) return;
  if (S.mode === 'move') await performMove(getSel(), t);
}

// Gerakkan / giring pemain p ke target t (dipakai pemain & komputer)
async function performMove(p, t) {
  {
    if (!p || t.cost > S.energy) return;
    S.energy -= t.cost;
    S.used.add(p.id);
    if (t.steal && Math.random() < CONFIG.FOUL_CHANCE) {
      await handleFoul(p, t.steal, t);
      return;
    }
    S.phase = 'animating';
    const dribble = S.ball.x === p.x && S.ball.y === p.y;
    if (t.steal) { t.steal.x = t.push.x; t.steal.y = t.push.y; }
    p.x = t.x; p.y = t.y;
    if (dribble) { S.ball = { x: t.x, y: t.y }; els.ball.classList.add('dribble'); }
    S.targets = [];
    render();
    const got = S.ball.x === p.x && S.ball.y === p.y;
    // assist: operan ke ruang kosong lalu diambil teman
    if (t.steal) S.lastPass = null;
    else if (got && !dribble) {
      const lp = S.lastPass;
      const from = lp && S.players.find(q => q.id === lp.from);
      if (lp && !lp.to && from && from.team === p.team && from !== p) lp.to = p.id;
      else S.lastPass = null;
    }
    if (t.steal) addLog(`${teamName(p.team)} ${pl(p)} merebut bola dari ${pl(t.steal)}!`, p.team);
    else if (dribble) addLog(`${teamName(p.team)} ${pl(p)} menggiring bola`, p.team);
    else addLog(`${teamName(p.team)} ${pl(p)} bergerak${got ? ' & menguasai bola' : ''}`, p.team);
    await sleep(320);
    els.ball.classList.remove('dribble');
    if (got) {
      // menguasai bola: pemain ini terpilih untuk menendang
      S.selected = p.id;
      S.pickOther = false;
    } else {
      // lanjut menggerakkan pemain lain
      S.selected = null;
      S.pickOther = true;
    }
    S.action = 'kick';
    continueTurn();
  }
}

/* =========================================================
   PELANGGARAN, PENALTI & TENDANGAN BEBAS
   ========================================================= */
async function handleFoul(fouler, victim, t) {
  S.phase = 'animating';
  S.targets = [];
  S.selected = null;
  // animasi: pelanggar menerjang lalu kembali ke posisi asal
  const back = { x: fouler.x, y: fouler.y };
  fouler.x = t.x - Math.sign(t.x - back.x) * 0.45;
  fouler.y = t.y - Math.sign(t.y - back.y) * 0.45;
  render();
  await sleep(300);
  fouler.x = back.x; fouler.y = back.y;
  popup(victim, 'PELANGGARAN!', 'bad');
  render();
  const defSide = sideOf(fouler.team);
  const pen = inBox(S.ball.x, S.ball.y, defSide);
  addLog(`Pelanggaran ${teamName(fouler.team)} ${pl(fouler)} terhadap ${pl(victim)}${pen ? ' di kotak penalti!' : ''}`, fouler.team, 'info');
  await giveCard(fouler);
  await flash(pen ? 'PENALTI!' : 'TENDANGAN BEBAS', `Pelanggaran ${pl(fouler)} · ${teamName(victim.team)}`, TEAMS[victim.team].color);
  if (pen) setupPenalty(victim, fouler.team);
  else setupFreeKick(victim, fouler.team);
}

// Wasit memutuskan: peringatan, kartu kuning, atau kartu merah langsung.
// Kuning kedua = merah.
async function giveCard(p) {
  const r = Math.random();
  let card = r < CONFIG.CARD_RED ? 'red' : r < CONFIG.CARD_RED + CONFIG.CARD_YELLOW ? 'yellow' : 'warn';
  if (card === 'yellow') {
    S.cards[p.id] = (S.cards[p.id] || 0) + 1;
    if (S.cards[p.id] >= 2) card = 'second';
  }
  const who = `${teamName(p.team)} ${pl(p)}`;
  const info = {
    warn:   { title: 'PERINGATAN',         cls: 'warn',   log: `Wasit memberi peringatan kepada ${who}` },
    yellow: { title: 'KARTU KUNING',       cls: 'yellow', log: `Kartu kuning untuk ${who}` },
    second: { title: 'KUNING KEDUA → MERAH', cls: 'second', log: `Kartu kuning kedua untuk ${who}, kartu merah! Keluar lapangan` },
    red:    { title: 'KARTU MERAH',        cls: 'red',    log: `Kartu merah langsung untuk ${who}! Keluar lapangan` },
  }[card];
  addLog(info.log, p.team, 'info');
  showModal(`<div class="ref-card ${info.cls}"></div>
    <div class="goal-text small">${info.title}</div>
    <p class="goal-sub" style="color:${TEAMS[p.team].color}">${who}</p>`, true);
  await sleep(1700);
  hideModal();
  if (card === 'red' || card === 'second') {
    S.sentOff.add(p.id);
    S.players = S.players.filter(q => q.id !== p.id);
    render();
  }
}

// Pengumuman besar singkat di tengah layar
async function flash(title, sub, color) {
  showModal(`<div class="goal-text small">${title}</div><p class="goal-sub" style="color:${color}">${sub}</p>`, true);
  await sleep(1500);
  hideModal();
}

function setupPenalty(victim, defTeam) {
  const defSide = sideOf(defTeam);
  placeFormation(null);                       // semua pemain ke posisi formasi (di luar kotak)
  const taker = S.players.find(p => p.id === victim.id);
  taker.x = defSide === 'left' ? 2 : CONFIG.COLS - 1;   // titik penalti
  taker.y = 2;
  const gk = S.players.find(p => p.team === defTeam && p.role === 'GK');
  if (gk) gk.y = 2;                             // kiper di tengah gawang (jika masih ada)
  S.ball = { x: taker.x, y: taker.y };
  newTurn(victim.team);
  S.selected = taker.id;
  S.penalty = { taker: taker.id, def: defTeam };
  S.phase = 'penalty';
  S.targets = [];
  render();
}

async function takePenalty() {
  if (S.phase !== 'penalty') return;
  const taker = S.players.find(p => p.id === S.penalty.taker);
  const def = S.penalty.def;
  const gk = S.players.find(p => p.team === def && p.role === 'GK');
  const dx = sideOf(def) === 'left' ? -1 : 1;
  S.phase = 'animating';
  S.penalty = null;
  render();
  const goalX = dx < 0 ? 0 : CONFIG.COLS + 1;
  const lastX = gk ? gk.x : goalX - dx;
  for (let x = taker.x + dx; x !== lastX + dx; x += dx) {
    S.ball = { x, y: 2 };
    renderBall();
    await sleep(140);
  }
  if (gk && Math.random() < CONFIG.PEN_SAVE) {
    popup(gk, 'DITAHAN!', 'bad');
    addLog(`Penalti ${pl(taker)} ditahan kiper ${teamName(def)} ${pl(gk)}!`, def, 'info');
    renderBall();
    await sleep(700);
    endTurn(); // giliran pindah ke tim kiper yang memegang bola
    return;
  }
  if (gk) popup(gk, 'TEMBUS!', 'ok');
  S.ball = { x: goalX, y: 2 };
  renderBall();
  await sleep(200);
  await handleGoal(dx < 0 ? 'left' : 'right', taker, true);
}

function setupFreeKick(victim, defTeam) {
  const ball = { ...S.ball };
  const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const defSide = sideOf(defTeam);
  const defGoalX = defSide === 'left' ? 0 : CONFIG.COLS + 1;

  // 1) lawan dalam radius 1 kotak digeser menjauh (min 2 kotak dari bola)
  for (const q of S.players.filter(p => p.team === defTeam && cheb(p, ball) <= 1)) {
    const c = freeCellNear(q, c => cheb(c, ball) >= 2, defGoalX);
    if (c) { q.x = c.x; q.y = c.y; }
  }

  // 2) pagar betis jika pelanggaran di area lawan (setengah lapangan yang diserang)
  const walls = [];
  const inAttackHalf = defSide === 'left' ? ball.x <= CONFIG.COLS / 2 : ball.x > CONFIG.COLS / 2;
  if (inAttackHalf) {
    for (const spot of wallSpots(ball, defTeam)) {
      let w = playerAt(spot.x, spot.y);
      if (!isDefField(w, defTeam)) {
        // pemain bertahan terdekat (bukan kiper, belum jadi pagar) berdiri di titik pagar
        w = S.players.filter(p => isDefField(p, defTeam) && !walls.includes(p))
          .sort((a, b) => cheb(a, spot) - cheb(b, spot))[0];
        if (!w) break;
        w.x = spot.x; w.y = spot.y;
      }
      walls.push(w);
    }
  }

  S.lastPass = null;
  newTurn(victim.team);       // energi penuh, berlaku setelah tendangan bebas
  S.selected = victim.id;
  S.used.add(victim.id);      // penendang langsung menendang (tanpa giring)
  S.setPiece = 'free';
  S.walls = walls.map(w => w.id);
  S.phase = 'play';
  refresh();
  render();
  addLog(`Tendangan bebas ${teamName(victim.team)} ${pl(victim)}` +
    (walls.length ? `, pagar betis ${teamName(defTeam)} ${walls.map(w => '#' + w.num).join(' & ')}` : ''), victim.team, 'info');
}

// Titik pagar betis: 2 kotak di depan penendang (ke arah gawang), dua pemain bersebelahan
// (atas-bawah) menutup garis tembak ke tengah gawang. Jika kolom itu area kiper / luar lapangan,
// pagar maju 1 kotak lebih dekat ke bola.
function wallSpots(ball, defTeam) {
  const dx = sideOf(defTeam) === 'left' ? -1 : 1;           // arah ke gawang yang dibela
  const gx = sideOf(defTeam) === 'left' ? 0.5 : CONFIG.COLS + 1.5;
  const ok = c => {
    if (!inField(c.x, c.y) || isGkArea(c.x, c.y) || (c.x === ball.x && c.y === ball.y)) return false;
    const p = playerAt(c.x, c.y);
    return !p || isDefField(p, defTeam);
  };
  for (const dist of [2, 1]) {
    const x = ball.x + dx * dist;
    // baris tempat garis tembak ke tengah gawang memotong kolom x
    const t = (x + 0.5 - (ball.x + 0.5)) / (gx - (ball.x + 0.5));
    const yc = ball.y + 0.5 + (2.5 - (ball.y + 0.5)) * t;
    const y1 = clamp(Math.floor(yc), 0, CONFIG.ROWS - 1);
    // pasangan bersebelahan: baris garis tembak + tetangga ke arah tengah gawang (atau sebaliknya)
    const toward = yc - y1 >= 0.5 ? 1 : -1;
    const pref = y1 + (y1 < 2 ? 1 : y1 > 2 ? -1 : toward);
    const pairs = [[y1, pref], [y1, 2 * y1 - pref], [pref, pref + (pref - y1)]];
    for (const [a, b] of pairs) {
      const A = { x, y: a }, B = { x, y: b };
      if (ok(A) && ok(B)) return [A, B];
    }
  }
  return [];
}

const isDefField = (p, team) => p && p.team === team && p.role !== 'GK';

// Kotak kosong terdekat dari pemain q yang memenuhi syarat ok(c); kiper tetap di garis gawang.
function freeCellNear(q, ok, ownGoalX) {
  const cells = [];
  for (let y = 0; y < CONFIG.ROWS; y++)
    for (let x = 1; x <= CONFIG.COLS; x++) {
      if (q.role === 'GK' && (x !== q.x || !CONFIG.GOAL_ROWS.includes(y))) continue;
      if (q.role !== 'GK' && isGkArea(x, y)) continue;
      if (playerAt(x, y) || (S.ball.x === x && S.ball.y === y) || !ok({ x, y })) continue;
      cells.push({ x, y });
    }
  const d = c => Math.max(Math.abs(c.x - q.x), Math.abs(c.y - q.y));
  cells.sort((a, b) => d(a) - d(b) || Math.abs(a.x - ownGoalX) - Math.abs(b.x - ownGoalX));
  return cells[0] || null;
}

async function doKick(plan) {
  const k = holder();
  if (plan.cost > S.energy) return;
  S.energy -= plan.cost;
  S.setPiece = null;
  S.walls = [];
  S.phase = 'animating';
  S.targets = [];
  S.selected = null;
  S.aim = null;
  render();
  // hasil sebenarnya diundi di sini
  const sim = simulateKick(plan);
  const evAt = new Map(sim.events.map(e => [e.at, e]));
  // bola melambung di kotak sebelum & saat melewati lawan
  const air = new Set();
  for (const e of sim.events) if (e.through) { air.add(e.at); air.add(e.at - 1); }
  for (let i = 0; i < sim.path.length; i++) {
    const c = sim.path[i];
    S.ball = { x: c.x, y: c.y };
    els.ball.classList.toggle('air', air.has(i));
    renderBall();
    const e = evAt.get(i);
    if (e) {
      const gk = e.p.role === 'GK';
      if (e.through) {
        popup(c, gk ? 'TEMBUS!' : 'LOLOS!', 'ok');
        addLog(gk ? `Tembakan ${pl(k)} menembus kiper ${pl(e.p)}!` : `Bola melambung melewati ${teamName(e.p.team)} ${pl(e.p)}`, k.team);
      } else {
        popup(c, e.dive ? 'DITEPIS!' : gk ? 'DITANGKAP' : 'DIPOTONG', 'bad');
      }
    }
    await sleep(air.has(i) ? 150 : 110);
  }
  els.ball.classList.remove('air');
  if (sim.goal) {
    await handleGoal(sim.goal, k);
    return;
  }
  if (sim.short) {
    popup(S.ball, 'KURANG JAUH', 'bad');
    addLog(`Tendangan ${pl(k)} terlalu jauh, bola berhenti di tengah jalan`, k.team);
  }
  const r = sim.receiver;
  if (r) S.ball = { x: r.x, y: r.y }; // bola dikuasai penerima (mis. kiper yang menepis)
  const ownPass = r && r.team === k.team && r !== k;
  S.lastPass = ownPass ? { from: k.id, to: r.id } : !r ? { from: k.id, to: null } : null;
  if (!r || r === k) { if (!sim.short) addLog(`${teamName(k.team)} ${pl(k)} menendang bola`, k.team); }
  else if (ownPass) addLog(`${teamName(k.team)} ${pl(k)} mengoper ke ${pl(r)}`, k.team);
  else if (r.role === 'GK') addLog(`Kiper ${teamName(r.team)} ${pl(r)} menangkap tendangan ${pl(k)}`, r.team);
  else addLog(`Tendangan ${pl(k)} dipotong ${teamName(r.team)} ${pl(r)}`, r.team);
  renderBall();
  await sleep(150);
  if (r && !ownPass) {
    // bola berhenti di lawan: sisa energi hangus, giliran berganti
    endTurn();
    return;
  }
  // operan sukses / bola di ruang kosong: sisa energi masih bisa dipakai
  S.selected = ownPass ? r.id : null;
  S.pickOther = false;
  S.action = 'kick';
  continueTurn();
}

async function handleGoal(side, kicker, penalty = false) {
  const conceding = side === 'left' ? leftTeam() : other(leftTeam());
  const scorer = other(conceding);
  const own = kicker.team === conceding;
  // assist: pemain yang terakhir mengoper ke pencetak gol (bukan penalti / gol bunuh diri)
  const lp = S.lastPass;
  const assist = !own && !penalty && lp && lp.to === kicker.id && lp.from !== kicker.id
    ? S.players.find(q => q.id === lp.from) : null;
  S.events.push({ type: 'goal', team: scorer, scorer: own ? null : kicker.num, assist: assist ? assist.num : null, own });
  S.lastPass = null;
  S.score[scorer]++;
  S.phase = 'goal';
  renderHud();
  addLog(`GOL! ${teamName(scorer)}${own ? ` (gol bunuh diri ${pl(kicker)})` : ` (${pl(kicker)}${penalty ? ', penalti' : ''}${assist ? `, assist ${pl(assist)}` : ''})`}`, scorer, 'goal');
  showModal(`
    <div class="goal-text">GOOOL!</div>
    <p class="goal-sub" style="color:${TEAMS[scorer].color}">${teamName(scorer)}${own ? ` · gol bunuh diri ${pl(kicker)}` : ` · ${pl(kicker)}${penalty ? ' (penalti)' : ''}`}</p>
    ${assist ? `<p class="goal-sub small">Assist: ${pl(assist)}</p>` : ''}
    <p class="goal-sub">${S.score.home} : ${S.score.away}</p>`, true);
  await sleep(2300);
  hideModal();
  if (S.clock <= 0) { endHalf(); return; }
  setupKickoff(conceding);
  addLog(`Kick off ${teamName(conceding)}`, conceding, 'info');
  render();
}

function endHalf() {
  if (S.phase === 'break' || S.phase === 'over') return;
  S.targets = [];
  S.selected = null;
  if (S.half === 1) {
    S.phase = 'break';
    render();
    addLog('Babak pertama selesai', null, 'info');
    const k = other(S.firstKickoff);
    showModal(`
      <h2>Turun Minum</h2>
      <div class="final">${S.score.home} : ${S.score.away}</div>
      <p>Babak 2: kedua tim <b>bertukar gawang</b>.<br><b style="color:${TEAMS[k].color}">${teamName(k)}</b> kick off.</p>
      <div class="btns"><button class="btn primary" id="btnHalf2">Mulai Babak 2</button></div>`);
    $('btnHalf2').onclick = () => {
      if (S.phase !== 'break') return;
      hideModal();
      S.half = 2;
      S.clock = CONFIG.HALF_SECONDS;
      setupKickoff(k);
      addLog(`Babak kedua dimulai, kick off ${teamName(k)}`, k, 'info');
      render();
    };
    if (!humanTeam()) setTimeout(() => $('btnHalf2') && $('btnHalf2').click(), 2000 / S.speed);
  } else {
    S.phase = 'over';
    render();
    addLog('Pertandingan selesai', null, 'info');
    const { home, away } = S.score;
    const res = home === away ? 'Hasil Imbang' : `${teamName(home > away ? 'home' : 'away')} Menang!`;
    const col = home === away ? 'var(--gold)' : TEAMS[home > away ? 'home' : 'away'].color;
    const m = S.match;
    showModal(`
      <h2>Full Time</h2>
      <div class="final">${home} : ${away}</div>
      <p style="font-size:20px;font-weight:800;color:${col}">${res}</p>
      ${m && m.knockout && home === away ? '<p>Imbang di laga sistem gugur: lanjut <b>adu penalti</b>.</p>' : ''}
      <div class="btns"><button class="btn primary" id="btnAgain">${m ? 'Lanjut' : 'Main Lagi'}</button></div>`);
    $('btnAgain').onclick = () => {
      hideModal();
      if (m) { S.match = null; S.speed = 1; m.onEnd(home, away, S.events.slice()); }
      else resetGame();
    };
  }
}

function resetGame() {
  S.half = 1;
  S.clock = CONFIG.HALF_SECONDS;
  S.score = { home: 0, away: 0 };
  S.cards = {};
  S.sentOff = new Set();
  S.paused = false;
  $('log').innerHTML = '';
  setupKickoff('home');
  S.phase = 'setup';
  refresh();
  render();
  showSetup();
}

/* =========================================================
   LEMPAR KOIN
   ========================================================= */
function showToss() {
  S.phase = 'toss';
  render();
  // yang menebak: tim pemain (mode vs komputer) atau Tim 1; tanpa pemain manusia = otomatis
  const g = humanTeam() === 'away' ? 'away' : 'home';
  const btnStyle = `style="background:${TEAMS[g].color};color:${inkFor(TEAMS[g].color)};border-color:${TEAMS[g].color}"`;
  showModal(`
    <h2>Lempar Koin</h2>
    <p><b style="color:${TEAMS[g].color}">${esc(teamName(g))}</b> menebak sisi koin.<br>
       Benar: ${esc(teamName(g))} kick off. Salah: ${esc(teamName(other(g)))} kick off.</p>
    <div class="coin-stage"><div class="coin" id="coin">
      <div class="face head">HEAD</div><div class="face tail">TAIL</div>
    </div></div>
    <p id="tossResult">Pilih tebakanmu</p>
    <div class="btns" id="tossBtns">
      <button class="btn" ${btnStyle} data-guess="head">HEAD</button>
      <button class="btn" ${btnStyle} data-guess="tail">TAIL</button>
    </div>`);
  document.querySelectorAll('[data-guess]').forEach(b => {
    b.onclick = () => {
      const guess = b.dataset.guess;
      const result = Math.random() < 0.5 ? 'head' : 'tail';
      $('tossBtns').innerHTML = '';
      $('tossResult').textContent = 'Koin dilempar...';
      $('coin').style.transform = `rotateY(${5 * 360 + (result === 'tail' ? 180 : 0)}deg)`;
      setTimeout(() => {
        const correct = guess === result;
        const k = correct ? g : other(g);
        S.firstKickoff = k;
        $('tossResult').innerHTML =
          `Hasil: <b>${result.toUpperCase()}</b>, tebakan ${correct ? 'benar' : 'salah'}!<br>` +
          `<b style="color:${TEAMS[k].color}">${esc(teamName(k))}</b> kick off lebih dulu.`;
        $('tossBtns').innerHTML = `<button class="btn primary" id="btnStart">Mulai Pertandingan</button>`;
        $('btnStart').onclick = () => {
          hideModal();
          setupKickoff(k);
          addLog(`Kick off! ${teamName(k)} memulai`, k, 'info');
          render();
        };
      }, 1900);
    };
  });
  if (!humanTeam()) {
    setTimeout(() => document.querySelector('[data-guess=head]').click(), 600);
    const auto = setInterval(() => {
      if ($('btnStart')) { clearInterval(auto); setTimeout(() => $('btnStart') && $('btnStart').click(), 900); }
    }, 200);
  }
}

/* =========================================================
   RENDER
   ========================================================= */
const els = { pieces: {}, ball: null, targets: null, pieceLayer: null, aim: null };

function div(cls) { const d = document.createElement('div'); d.className = cls; return d; }
function place(el, x, y) { el.style.setProperty('--x', x); el.style.setProperty('--y', y); }

function buildPitch() {
  const pitch = $('pitch');
  pitch.innerHTML = '';
  const field = div('field');
  for (let y = 0; y < CONFIG.ROWS; y++)
    for (let x = 1; x <= CONFIG.COLS; x++) field.appendChild(div('cell' + (x % 2 ? ' alt' : '')));
  field.append(div('line outline'), div('line halfway'), div('line circle'),
               div('line spot'), div('line box left'), div('line box right'));
  els.targets = div('layer');
  els.pieceLayer = div('layer');
  const ballLayer = div('layer');
  els.ball = div('at ball');
  els.ball.innerHTML = '<span>⚽</span>';
  ballLayer.appendChild(els.ball);
  pitch.append(field, div('goal-net left'), div('goal-net right'), els.pieceLayer, els.targets, ballLayer);
}

function renderPieces() {
  const h = holder();
  // pemain yang dikartu merah dihapus dari lapangan
  for (const id of Object.keys(els.pieces)) {
    if (!S.players.some(p => p.id === id)) { els.pieces[id].remove(); delete els.pieces[id]; }
  }
  for (const p of S.players) {
    let el = els.pieces[p.id];
    if (!el) {
      el = div('at player');
      el.innerHTML = `<span class="token">${p.num}${p.role === 'GK' ? '<span class="tag">GK</span>' : ''}</span>`;
      el.onclick = () => onPlayerClick(p.id);
      els.pieceLayer.appendChild(el);
      els.pieces[p.id] = el;
    }
    place(el, p.x, p.y);
    let nm = el.querySelector('.pname');
    if (p.name) {
      if (!nm) { nm = document.createElement('span'); nm.className = 'pname'; el.appendChild(nm); }
      if (nm.textContent !== p.name) nm.textContent = p.name;
      nm.classList.toggle('top', p.y === CONFIG.ROWS - 1); // baris paling bawah: nama di atas lingkaran
    } else if (nm) nm.remove();
    const playing = S.phase === 'play' || S.phase === 'animating';
    el.className = 'at player ' + p.team +
      (p.role === 'GK' ? ' gk' : '') +
      (S.selected === p.id ? ' selected' : '') +
      (h === p ? ' holder' : '') +
      (S.phase === 'play' && !S.setPiece && p.team === S.turn && (h === p || !S.used.has(p.id)) ? ' can-select' : '') +
      (S.phase === 'play' && p.team === S.turn && S.used.has(p.id) && h !== p ? ' used' : '') +
      (playing && p.team !== S.turn ? ' inactive' : '') +
      (S.walls.includes(p.id) ? ' wall' : '') +
      (S.cards[p.id] ? ' booked' : '') +
      (S.phase === 'penalty' && S.penalty && S.penalty.taker === p.id ? ' selected' : '');
    el.title = `${teamName(p.team)} #${p.num}${p.name ? ' ' + p.name : ''} (${p.role})${S.cards[p.id] ? ' · kartu kuning' : ''}`;
  }
}

function renderBall() {
  place(els.ball, S.ball.x, S.ball.y);
  els.ball.classList.toggle('held', !!holder());
}

function renderTargets() {
  const layer = els.targets;
  layer.innerHTML = '';
  els.aim = null;
  if (S.paused || isBotTurn()) return;
  if (S.mode === 'kick' && S.phase === 'play') { buildAim(layer); return; }
  for (const t of S.targets) {
    const b = document.createElement('button');
    place(b, t.x, t.y);
    b.onclick = () => onTargetClick(t);
    b.className = 'at target ' + (t.steal ? 'steal' : 'move');
    b.innerHTML = `<span class="cost">${t.cost}</span>`;
    b.setAttribute('aria-label', t.steal ? `Rebut bola dari ${pl(t.steal)}` : `Kotak ${t.x},${t.y + 1}`);
    if (t.steal) b.title = `Rebut bola dari ${pl(t.steal)}`;
    layer.appendChild(b);
  }
}

/* ---------- bidik tendangan bebas arah ---------- */
const SVGNS = 'http://www.w3.org/2000/svg';
function buildAim(layer) {
  const aim = div('aim');
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${CONFIG.COLS + 2} ${CONFIG.ROWS}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  const line = document.createElementNS(SVGNS, 'line');
  svg.appendChild(line);
  aim.appendChild(svg);
  const label = div('at aim-label hidden');
  aim.appendChild(label);
  layer.appendChild(aim);
  els.aim = { aim, line, label };

  const toGrid = e => {
    const r = $('pitch').getBoundingClientRect();
    const cell = r.width / (CONFIG.COLS + 2);
    return { x: (e.clientX - r.left) / cell, y: (e.clientY - r.top) / cell };
  };
  const sameCell = (a, b) => a && b && Math.floor(a.x) === Math.floor(b.x) && Math.floor(a.y) === Math.floor(b.y);

  aim.onpointermove = e => { if (e.pointerType === 'mouse') { S.aim = toGrid(e); drawAim(); } };
  aim.onpointerleave = e => { if (e.pointerType === 'mouse') { S.aim = null; drawAim(); } };
  // scroll di lapangan = atur panjang tendangan
  aim.onwheel = e => {
    e.preventDefault();
    const h = holder();
    let base = S.kickLen;
    if (!base && h && S.aim) base = Math.round(Math.hypot(S.aim.x - h.x - 0.5, S.aim.y - h.y - 0.5));
    setKickLen((base || 1) + (e.deltaY < 0 ? 1 : -1));
  };
  aim.onpointerup = e => {
    if (S.phase !== 'play' || S.paused || isBotTurn()) return;
    const g = toGrid(e);
    const h = holder();
    if (h && Math.floor(g.x) === h.x && Math.floor(g.y) === h.y) {
      // klik pembawa bola = ganti ke giring (jika masih boleh)
      setAction('dribble');
      return;
    }
    // sentuh: ketuk pertama = pratinjau, ketuk lagi di kotak sama = tendang
    if (e.pointerType !== 'mouse' && !sameCell(g, S.aim)) { S.aim = g; drawAim(); return; }
    const plan = h && planKick(h, g);
    if (plan && plan.cost <= S.energy) doKick(plan);
  };
  drawAim();
}

function setKickLen(v) {
  S.kickLen = Math.max(0, Math.min(CONFIG.COLS + 1, Math.round(v)));
  renderPower();
  drawAim();
}

function renderPower() {
  $('power').value = S.kickLen;
  $('powerVal').textContent = S.kickLen ? S.kickLen + ' kotak' : 'Otomatis';
}

function drawAim() {
  if (!els.aim) return;
  clearPath();
  const { line, label } = els.aim;
  const h = holder();
  const plan = S.aim && h ? planKick(h, S.aim) : null;
  if (!plan) {
    line.setAttribute('visibility', 'hidden');
    label.classList.add('hidden');
    return;
  }
  line.setAttribute('visibility', 'visible');
  line.setAttribute('x1', h.x + 0.5); line.setAttribute('y1', h.y + 0.5);
  // garis sampai titik tujuan; jika keluar lapangan, sampai kotak terakhir
  const pt = kickPoint(h, S.aim);
  const end = plan.path[plan.path.length - 1];
  const inside = Math.floor(pt.x) === end.x && Math.floor(pt.y) === end.y;
  line.setAttribute('x2', inside ? pt.x : end.x + 0.5);
  line.setAttribute('y2', inside ? pt.y : end.y + 0.5);
  showPath(plan);

  const r = plan.receiver;
  const pct = v => Math.round(v * 100) + '%';
  const what = plan.goal ? 'Tembakan'
    : r && r.team === h.team ? `Oper ke ${pl(r)}`
    : r ? `Ke lawan ${pl(r)}!`
    : 'Tendang ke ruang kosong';
  const parts = [`<b>${what}</b> · ⚡${plan.cost} · jarak ${plan.d.toFixed(1)}`];
  const poor = plan.cost > S.energy;
  if (poor) parts.push('<b>energi kurang</b>');
  if (!inside && !plan.goal) parts.push('mentok batas lapangan');
  if (plan.reach < 1) parts.push(`sampai ${pct(plan.reach)}`);
  const over = plan.blockers.filter(b => b.p.role !== 'GK'), gk = plan.blockers.find(b => b.p.role === 'GK');
  if (over.length) parts.push(`lambung lolos ${over.map(b => pct(b.chance)).join(' × ')}`);
  if (gk) parts.push(`lolos kiper ${pct(gk.chance)}`);
  if (!(r && r.team !== h.team)) parts.push(`<b>berhasil ${pct(plan.success)}</b>`);
  label.innerHTML = parts.join(' · ');
  label.classList.remove('hidden');
  label.classList.toggle('bad', poor || !!(r && r.team !== h.team) || plan.success < 0.15);
  place(label, end.x, end.y);
  label.classList.toggle('below', end.y === 0);
}

function showPath(plan) {
  const last = plan.path.length - 1;
  const bAt = new Map(plan.blockers.map(b => [b.at, b]));
  plan.path.forEach((c, i) => {
    const isEnd = i === last;
    const b = bAt.get(i);
    const foe = (isEnd && plan.receiver && plan.receiver.team !== S.turn) || !!b;
    const d = div('at pathdot' + (b ? ' air' : '') + (foe ? ' foe' : '') +
      (isEnd ? ' end' + (plan.goal ? ' goal' : plan.receiver ? ' recv' : '') : ''));
    if (b) d.dataset.pct = Math.round(b.chance * 100) + '% lolos';
    place(d, c.x, c.y);
    els.targets.prepend(d);
  });
}
function clearPath() { els.targets.querySelectorAll('.pathdot').forEach(d => d.remove()); }

// teks melayang singkat di atas lapangan
function popup(cell, text, cls) {
  const d = div('at popup ' + cls);
  d.textContent = text;
  place(d, cell.x, cell.y);
  $('pitch').appendChild(d);
  setTimeout(() => d.remove(), 1100);
}

function fmt(sec) {
  const t = Math.max(0, Math.ceil(sec));
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
}

function renderHud() {
  $('sbHomeName').textContent = teamName('home');
  $('sbAwayName').textContent = teamName('away');
  $('sbHomeBadge').style.background = TEAMS.home.color;
  $('sbAwayBadge').style.background = TEAMS.away.color;
  $('sbHomeDir').textContent = sideOf('home') === 'left' ? 'Menyerang →' : '← Menyerang';
  $('sbAwayDir').textContent = sideOf('away') === 'left' ? 'Menyerang →' : '← Menyerang';
  $('scoreHome').textContent = S.score.home;
  $('scoreAway').textContent = S.score.away;
  $('halfLabel').textContent = `Babak ${S.half}`;
  $('clock').textContent = fmt(S.clock);

  const active = S.phase === 'play' || S.phase === 'animating';
  document.documentElement.style.setProperty('--team', TEAMS[S.turn].color);
  document.documentElement.style.setProperty('--team-ink', inkFor(TEAMS[S.turn].color));
  const bot = isBotTurn();
  const pen = S.phase === 'penalty';
  $('turnPill').textContent = pen ? `Penalti ${teamName(S.turn)}`
    : active ? `Giliran ${teamName(S.turn)}${bot ? ' 🤖' : ''}` : (S.phase === 'over' ? 'Selesai' : 'Menunggu');
  $('btnPenalty').classList.toggle('hidden', !pen || bot);
  const sec = Math.max(0, Math.ceil(S.turnTime));
  const low = active && sec <= 5;
  $('turnSec').textContent = active ? sec + 's' : '';
  $('turnSec').classList.toggle('low', low);
  $('timerFill').style.width = (active ? (Math.max(0, S.turnTime) / CONFIG.TURN_SECONDS) * 100 : 0) + '%';
  $('timerFill').classList.toggle('low', low);
  const showE = active || pen;
  $('energy').classList.toggle('dim', !showE);
  $('energyVal').textContent = `${showE ? S.energy : CONFIG.ENERGY}/${CONFIG.ENERGY}`;
  const pips = $('energyPips');
  if (pips.childElementCount !== CONFIG.ENERGY)
    pips.innerHTML = '<i></i>'.repeat(CONFIG.ENERGY);
  [...pips.children].forEach((d, i) => d.classList.toggle('on', i < (showE ? S.energy : CONFIG.ENERGY)));
  $('hint').innerHTML = (active || pen) && bot ? `🤖 <b>Komputer</b> (${teamName(S.turn)}) sedang bermain...`
    : S.phase === 'play' ? S.hint
    : pen ? (() => {
        const tk = S.players.find(p => p.id === S.penalty.taker);
        return `<b>PENALTI</b>: ${pl(tk)} menendang lurus ke tengah gawang. Peluang kiper menahan <b>${Math.round(CONFIG.PEN_SAVE * 100)}%</b>.`;
      })()
    : S.phase === 'animating' ? '...'
    : S.phase === 'toss' ? 'Lempar koin untuk menentukan kick off.'
    : S.phase === 'setup' ? 'Atur pertandingan baru.' : '';

  $('btnPause').disabled = !active;
  $('btnRestart').classList.toggle('hidden', !!S.match);
  $('btnMenu').classList.toggle('hidden', !!S.match);
  $('speedBox').classList.toggle('hidden', !!humanTeam());
  document.querySelectorAll('[data-speed]').forEach(b => b.classList.toggle('on', +b.dataset.speed === S.speed));
  $('btnPause').textContent = S.paused ? '▶ Lanjut' : '⏸ Pause';
  $('btnSkip').disabled = S.phase !== 'play' || S.paused || bot;
  const h = holder();
  const showAct = S.phase === 'play' && !S.paused && !bot && h && h.team === S.turn && !S.setPiece;
  $('holderActions').classList.toggle('hidden', !showAct);
  document.querySelector('[data-act="dribble"]').classList.toggle('hidden', !!(h && S.used.has(h.id)));
  $('powerBox').classList.toggle('hidden', !(S.phase === 'play' && !S.paused && !bot && S.mode === 'kick'));
  const cur = S.selected === (h && h.id) ? S.action : 'other';
  document.querySelectorAll('[data-act]').forEach(b => b.classList.toggle('on', b.dataset.act === cur));
  const spent = S.energy < CONFIG.ENERGY;
  $('btnSkip').textContent = spent ? '✓ Selesai Giliran' : '⏭ Lewati Giliran';
  $('btnSkip').classList.toggle('primary', spent);
}

function render() { renderPieces(); renderBall(); renderTargets(); renderHud(); }

/* ---------- log ---------- */
function addLog(text, team, cls = '') {
  const elapsed = (S.half - 1) * CONFIG.HALF_SECONDS + (CONFIG.HALF_SECONDS - S.clock);
  const li = document.createElement('li');
  if (cls) li.className = cls;
  li.innerHTML = `<span class="t">${fmt(elapsed)}</span><span class="dot ${team || ''}"></span><span></span>`;
  li.lastChild.textContent = text;
  $('log').prepend(li);
}

/* ---------- modal ---------- */
function showModal(html, goal = false) {
  const m = $('modal');
  m.className = 'modal' + (goal ? ' goal-modal' : '');
  m.innerHTML = html;
  $('overlay').classList.remove('hidden');
}
function hideModal() { $('overlay').classList.add('hidden'); }

/* =========================================================
   KONTROL & LOOP WAKTU
   ========================================================= */
function togglePause() {
  if (S.phase !== 'play' && S.phase !== 'animating') return;
  S.paused = !S.paused;
  if (S.paused) {
    showModal(`<h2>Pause</h2><p>Permainan dihentikan sementara.</p>
      <div class="btns"><button class="btn primary" id="btnResume">▶ Lanjut</button></div>`);
    $('btnResume').onclick = togglePause;
  } else hideModal();
  render();
}

$('btnPause').onclick = togglePause;
$('btnPenalty').onclick = takePenalty;
$('power').max = CONFIG.COLS + 1;
$('power').oninput = e => setKickLen(+e.target.value);
renderPower();
document.querySelectorAll('[data-act]').forEach(b => { b.onclick = () => setAction(b.dataset.act); });
$('btnSkip').onclick = () => {
  if (S.phase !== 'play' || S.paused || isBotTurn()) return;
  if (S.energy >= CONFIG.ENERGY) addLog(`${teamName(S.turn)} melewati giliran`, S.turn);
  endTurn();
};
$('btnRestart').onclick = () => {
  if (confirm('Ulang pertandingan dari awal?')) { hideModal(); resetGame(); }
};
$('btnMenu').onclick = () => {
  if (S.phase === 'play' || S.phase === 'animating' || S.phase === 'penalty') {
    if (!confirm('Keluar ke menu utama? Pertandingan ini tidak disimpan.')) return;
  }
  hideModal();
  showMainMenu();
};
document.querySelectorAll('[data-speed]').forEach(b => { b.onclick = () => { S.speed = +b.dataset.speed; renderHud(); }; });

/* =========================================================
   MENU UTAMA & PERTANDINGAN DARI LUAR (LIGA / PIALA)
   ========================================================= */
// Hentikan pertandingan yang sedang berjalan (tanpa hasil)
function stopMatch() {
  S.phase = 'idle';
  S.paused = false;
  S.match = null;
  S.speed = 1;
  S.bots = new Set();
}

function showMainMenu() {
  stopMatch();
  if (typeof League !== 'undefined') League.hideHub();
  render();
  const hasCareer = typeof League !== 'undefined' && League.hasSave();
  showModal(`
    <h2>Mini Football</h2>
    <p>Pilih mode permainan</p>
    <div class="menu-list">
      <button class="menu-btn" id="mQuick"><span>⚽</span><b>Pertandingan Cepat</b><small>Player vs Player / vs Komputer</small></button>
      <button class="menu-btn" id="mLeague"><span>🏆</span><b>Mode Liga</b><small>${hasCareer ? 'Lanjutkan karier' : '16 tim, liga & piala'}</small></button>
      ${hasCareer ? '<button class="menu-btn" id="mNewCareer"><span>✨</span><b>Karier Baru</b><small>Mulai dari musim 2026/2027</small></button>' : ''}
    </div>`);
  $('mQuick').onclick = () => { hideModal(); resetGame(); };
  $('mLeague').onclick = () => { hideModal(); League.open(); };
  if (hasCareer) $('mNewCareer').onclick = () => {
    if (!confirm('Mulai karier baru? Karier & riwayat juara yang tersimpan akan dihapus.')) return;
    hideModal(); League.newCareer();
  };
}

// Mulai pertandingan dari mode liga. opt = { home:{name,color}, away:{name,color}, bots:[...], onEnd, knockout, label }
function startMatch(opt) {
  if (typeof League !== 'undefined') League.hideHub();
  TEAMS.home = { name: opt.home.name, color: opt.home.color, squad: opt.home.squad || null };
  TEAMS.away = { name: opt.away.name, color: opt.away.color, squad: opt.away.squad || null };
  S.events = [];
  applyTeamColors();
  S.half = 1;
  S.clock = CONFIG.HALF_SECONDS;
  S.score = { home: 0, away: 0 };
  S.cards = {};
  S.sentOff = new Set();
  S.paused = false;
  S.bots = new Set(opt.bots);
  S.speed = S.bots.size === 2 ? 3 : 1;
  S.match = { onEnd: opt.onEnd, knockout: !!opt.knockout };
  $('log').innerHTML = '';
  setupKickoff('home');
  S.phase = 'toss';
  refresh();
  render();
  addLog(`${opt.label ? opt.label + ': ' : ''}${teamName('home')} vs ${teamName('away')}`, null, 'info');
  showToss();
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && S.phase === 'play' && S.mode === 'move' && S.selected) {
    const h = holder();
    S.pickOther = !!(h && h.team === S.turn);
    S.selected = null; refresh(); render();
  }
  if (e.key === 'p' || e.key === 'P') togglePause();
});

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.25, (now - last) / 1000) * S.speed;
  last = now;
  if (!S.paused && (S.phase === 'play' || S.phase === 'animating')) {
    S.clock = Math.max(0, S.clock - dt);
    if (S.phase === 'play') {
      S.turnTime -= dt;
      if (S.clock <= 0) endHalf();
      else if (S.turnTime <= 0) {
        addLog(`Waktu habis, giliran ${teamName(S.turn)} dilewati`, S.turn);
        endTurn();
      }
    }
    renderHud();
  }
  if (!S.paused && !botBusy && S.bots.has(S.turn)) {
    if (S.phase === 'play') runBot();
    else if (S.phase === 'penalty') runBotPenalty();
  }
  requestAnimationFrame(tick);
}

/* =========================================================
   WARNA TIM
   ========================================================= */
const esc = str => String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function shade(hex, amt) { // amt > 0 lebih terang, < 0 lebih gelap
  const n = parseInt(hex.slice(1), 16);
  const to = amt < 0 ? 0 : 255, p = Math.abs(amt);
  const ch = v => Math.round((to - v) * p + v);
  const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function inkFor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.62 ? '#0b1220' : '#ffffff';
}
function applyTeamColors() {
  const st = document.documentElement.style;
  for (const t of ['home', 'away']) {
    const c = TEAMS[t].color;
    const gk = shade(c, -0.45);
    st.setProperty(`--${t}`, c);
    st.setProperty(`--${t}-light`, shade(c, 0.45));
    st.setProperty(`--${t}-dark`, shade(c, -0.4));
    st.setProperty(`--${t}-ink`, inkFor(c));
    st.setProperty(`--${t}-gk`, gk);
    st.setProperty(`--${t}-gk-light`, shade(c, 0.1));
    st.setProperty(`--${t}-gk-dark`, shade(c, -0.7));
    st.setProperty(`--${t}-gk-ink`, inkFor(gk));
  }
}

/* =========================================================
   LAYAR AWAL: MODE, NAMA & WARNA TIM
   ========================================================= */
const SETUP_KEY = 'minififa.setup';
function loadSetup() {
  const def = { vs: 'pvp', side: 'home', home: { ...TEAMS.home }, away: { ...TEAMS.away } };
  try {
    const v = JSON.parse(localStorage.getItem(SETUP_KEY));
    if (v && v.home && v.away) return { ...def, ...v };
  } catch (e) { /* abaikan */ }
  return def;
}
function saveSetup(v) { try { localStorage.setItem(SETUP_KEY, JSON.stringify(v)); } catch (e) { /* abaikan */ } }

function showSetup() {
  const cfg = loadSetup();
  const swatches = t => PALETTE.map(([n, c]) =>
    `<button type="button" class="swatch" data-team="${t}" data-color="${c}" title="${n}" style="background:${c}"></button>`).join('');
  showModal(`
    <h2>Pertandingan Baru</h2>
    <div class="setup">
      <div class="mode-pick">
        <button type="button" class="mode-btn" data-vs="pvp"><span>👤 vs 👤</span><small>Player vs Player</small></button>
        <button type="button" class="mode-btn" data-vs="pvc"><span>👤 vs 🤖</span><small>Player vs Komputer</small></button>
      </div>
      ${['home', 'away'].map((t, i) => `
        <div class="team-cfg">
          <div class="team-head"><span class="team-dot" id="dot-${t}"></span><b>Tim ${i + 1}</b> <span class="who" id="who-${t}"></span></div>
          <input class="team-name" id="name-${t}" maxlength="16" value="${esc(cfg[t].name)}" placeholder="Nama tim ${i + 1}">
          <div class="swatches">${swatches(t)}</div>
        </div>`).join('')}
      <div class="side-pick" id="sidePick">
        <span>Kamu bermain sebagai:</span>
        <div class="seg"><button type="button" data-side="home"></button><button type="button" data-side="away"></button></div>
      </div>
      <p class="setup-err" id="setupErr"></p>
    </div>
    <div class="btns"><button class="btn primary" id="btnSetupOk">Lanjut ke Lempar Koin</button></div>`);

  const sync = () => {
    for (const t of ['home', 'away']) {
      cfg[t].name = $('name-' + t).value;
      $('dot-' + t).style.background = cfg[t].color;
      const label = cfg[t].name.trim() || (t === 'home' ? 'Tim 1' : 'Tim 2');
      document.querySelector(`[data-side="${t}"]`).textContent = label;
      $('who-' + t).textContent = cfg.vs === 'pvc' ? (cfg.side === t ? '(Kamu)' : '(Komputer 🤖)') : '';
    }
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('on', b.dataset.vs === cfg.vs));
    document.querySelectorAll('[data-side]').forEach(b => b.classList.toggle('on', b.dataset.side === cfg.side));
    $('sidePick').classList.toggle('hidden', cfg.vs !== 'pvc');
    document.querySelectorAll('.swatch').forEach(b => {
      const t = b.dataset.team;
      b.classList.toggle('on', cfg[t].color === b.dataset.color);
      b.disabled = cfg[other(t)].color === b.dataset.color; // warna tidak boleh sama
    });
  };
  document.querySelectorAll('.mode-btn').forEach(b => { b.onclick = () => { cfg.vs = b.dataset.vs; sync(); }; });
  document.querySelectorAll('[data-side]').forEach(b => { b.onclick = () => { cfg.side = b.dataset.side; sync(); }; });
  document.querySelectorAll('.swatch').forEach(b => { b.onclick = () => { cfg[b.dataset.team].color = b.dataset.color; sync(); }; });
  ['home', 'away'].forEach(t => { $('name-' + t).oninput = sync; });
  if (cfg.home.color === cfg.away.color) cfg.away.color = PALETTE.find(([, c]) => c !== cfg.home.color)[1];
  sync();

  $('btnSetupOk').onclick = () => {
    const clean = v => v.replace(/[<>&"']/g, '').trim(); // nama ikut tampil sebagai HTML
    const n1 = clean(cfg.home.name) || 'Tim 1', n2 = clean(cfg.away.name) || 'Tim 2';
    if (n1.toLowerCase() === n2.toLowerCase()) { $('setupErr').textContent = 'Nama kedua tim tidak boleh sama.'; return; }
    cfg.home.name = n1; cfg.away.name = n2;
    saveSetup(cfg);
    TEAMS.home = { name: cfg.home.name, color: cfg.home.color, squad: null };
    TEAMS.away = { name: cfg.away.name, color: cfg.away.color, squad: null };
    S.events = [];
    S.vs = cfg.vs;
    S.bots = cfg.vs === 'pvc' ? new Set([other(cfg.side)]) : new Set();
    S.match = null;
    S.speed = 1;
    applyTeamColors();
    hideModal();
    const bot = [...S.bots][0];
    addLog(bot ? `${teamName(other(bot))} vs ${teamName(bot)} (Komputer)` : `${teamName('home')} vs ${teamName('away')}`, null, 'info');
    showToss();
  };
}

/* =========================================================
   KOMPUTER (BOT) — tanpa layanan AI, murni aturan & perhitungan.
   Tiap langkah: coba semua aksi yang mungkin, beri nilai, pilih yang terbaik.
   ========================================================= */
const BOT = {
  STEP_MS: 700,       // jeda antar aksi agar terlihat
  GOAL_V: 40,         // nilai sebuah gol
  COST_W: 0.02,       // penalti kecil per energi (sisa energi toh hangus)
  MARGIN: 0.3,        // aksi bola harus lebih baik dari menahan bola minimal segini
};
let botBusy = false;
let botTouched = new Set(); // pemain bot yang sudah memegang bola giliran ini

async function botWait(ms) {
  await sleep(ms);
  while (S.paused) await sleep(150);
}
const dirOf = t => (sideOf(t) === 'left' ? 1 : -1);
const attackGoalX = t => (sideOf(t) === 'left' ? CONFIG.COLS + 1 : 0);
const progress = (x, t) => (sideOf(t) === 'left' ? x : CONFIG.COLS + 1 - x) / (CONFIG.COLS + 1);
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Tekanan lawan di sekitar kotak c (lawan dekat = bola mudah direbut giliran berikutnya)
function pressure(c, t) {
  let p = 0;
  for (const q of S.players) {
    if (q.team === t || q.role === 'GK') continue;
    const d = cheb(q, c);
    p += d <= 1 ? 1 : d === 2 ? 0.5 : d === 3 ? 0.2 : 0;
  }
  return p;
}
// Nilai posisi pembawa bola untuk tim t
function holdValue(c, t) {
  return 14 * progress(c.x, t) + (CONFIG.GOAL_ROWS.includes(c.y) ? 0.6 : 0) - 1.5 * pressure(c, t);
}
// Kerugian jika bola hilang di kotak c (makin dekat gawang sendiri makin buruk)
const lossValue = (c, t) => -(4 + 6 * (1 - progress(c.x, t)));

function kickAct(own, plan) {
  return async () => {
    S.selected = own.id;
    render();
    showPath(plan);
    await botWait(450);
    clearPath();
    if (S.phase === 'play' && holder() === own) await doKick(plan);
  };
}
function moveAct(p, t) {
  return async () => {
    S.selected = p.id;
    render();
    await botWait(250);
    if (S.phase === 'play') await performMove(p, t);
  };
}

// Pilihan untuk pembawa bola: tembak, oper, giring
function holderOptions(own) {
  const t = own.team, opts = [];
  // tembakan: coba beberapa titik di mulut gawang
  const gx = attackGoalX(t) + 0.5;
  let bestShot = null;
  for (let gy = 1.15; gy < 3.9; gy += 0.3) {
    const plan = planKick(own, { x: gx, y: gy }, 0);
    if (!plan || !plan.goal || plan.cost > S.energy) continue;
    if (!bestShot || plan.success > bestShot.success) bestShot = plan;
  }
  if (bestShot) opts.push({ ev: bestShot.success * BOT.GOAL_V - (1 - bestShot.success), cost: bestShot.cost, run: kickAct(own, bestShot) });

  // operan ke teman: coba beberapa titik di kotak teman
  for (const r of S.players) {
    if (r.team !== t || r === own) continue;
    let best = null;
    for (const [ox, oy] of [[0.5, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
      const plan = planKick(own, { x: r.x + ox, y: r.y + oy }, 0);
      if (!plan || plan.receiver !== r || plan.cost > S.energy) continue;
      if (!best || plan.success > best.success) best = plan;
    }
    if (!best) continue;
    const lose = best.blockers[0] ? best.path[best.blockers[0].at] : best.path[Math.floor(best.path.length / 2)];
    // penerima yang lebih maju & masih bisa menggiring sedikit lebih bernilai;
    // operan balik ke pemain yang sudah pegang bola giliran ini dihindari (tidak bolak-balik)
    let gain = holdValue(r, t);
    if (!S.used.has(r.id) && progress(r.x, t) > progress(own.x, t)) gain += 0.4;
    if (botTouched.has(r.id)) gain -= 3;
    opts.push({ ev: best.success * gain + (1 - best.success) * lossValue(lose, t), cost: best.cost, run: kickAct(own, best) });
  }

  // giring
  if (!S.used.has(own.id) && !S.setPiece) {
    for (const m of moveTargets(own)) {
      if (m.cost > S.energy) continue;
      opts.push({ ev: holdValue(m, t), cost: m.cost, run: moveAct(own, m) });
    }
  }
  return opts;
}

// Posisi ideal tiap pemain (tanpa bola)
function desiredCell(p, t, attacking) {
  const dir = dirOf(t), ball = S.ball;
  const ownBoxX = sideOf(t) === 'left' ? 2 : CONFIG.COLS - 1;
  const oppBoxX = sideOf(t) === 'left' ? CONFIG.COLS - 1 : 2;
  const lane = p.num === 2 || p.num === 7 ? -1 : 1;
  if (p.role === 'GK') return { x: p.x, y: clamp(ball.y, 1, 3) };
  if (attacking) {
    if (p.role === 'FW') return { x: oppBoxX, y: 2 };
    if (p.role === 'MF') return { x: clamp(ball.x + 2 * dir, 2, CONFIG.COLS - 1), y: 2 + lane };
    return { x: clamp(ball.x - 3 * dir, 2, CONFIG.COLS - 1), y: 2 + lane };
  }
  const h = holder();
  if (p.role === 'FW' && h) return { x: clamp(h.x + dir, 1, CONFIG.COLS), y: h.y };     // tekan pembawa bola
  if (p.role === 'MF') {
    // jaga lawan terdekat (selain pembawa bola), dari sisi gawang sendiri
    const opp = S.players.filter(q => q.team !== t && q.role !== 'GK' && q !== h)
      .sort((a, b) => cheb(a, p) - cheb(b, p))[0];
    if (opp) return { x: clamp(opp.x - dir, 2, CONFIG.COLS - 1), y: opp.y };
  }
  // bek: di antara bola dan gawang sendiri
  const x = sideOf(t) === 'left' ? Math.max(ownBoxX, ball.x - 2) : Math.min(ownBoxX, ball.x + 2);
  return { x, y: clamp(ball.y + lane, 0, CONFIG.ROWS - 1) };
}

// Gerakan tanpa bola terbaik (mengatur posisi menyerang / bertahan)
function bestPositionMove(t, own, reserve) {
  const attacking = !!own;
  let best = null;
  for (const p of S.players) {
    if (p.team !== t || p === own || S.used.has(p.id)) continue;
    const T = desiredCell(p, t, attacking);
    const d0 = Math.hypot(p.x - T.x, p.y - T.y);
    for (const m of moveTargets(p)) {
      if (m.steal || m.cost > S.energy - reserve) continue;
      const d1 = Math.hypot(m.x - T.x, m.y - T.y);
      let gain = d0 - d1;
      if (attacking) gain += 0.8 * (pressure(p, t) - pressure(m, t)); // cari ruang terbuka
      const score = gain - 0.15 * m.cost;
      if (gain >= 0.7 && (!best || score > best.score)) best = { score, run: moveAct(p, m) };
    }
  }
  return best && best.run;
}

function botDecide() {
  const t = S.turn, h = holder();
  const own = h && h.team === t ? h : null;
  if (own) {
    const opts = holderOptions(own);
    const stay = S.setPiece ? -Infinity : holdValue(own, t);
    let best = null;
    for (const o of opts) if (!best || o.ev - BOT.COST_W * o.cost > best.ev - BOT.COST_W * best.cost) best = o;
    if (best && best.ev - BOT.COST_W * best.cost > stay + BOT.MARGIN) return best.run;
    if (S.setPiece && best) return best.run;
  } else if (!h) {
    // bola lepas: pemain dengan biaya termurah mengambil bola
    let grab = null;
    for (const p of S.players) {
      if (p.team !== t || S.used.has(p.id)) continue;
      for (const m of moveTargets(p))
        if (m.x === S.ball.x && m.y === S.ball.y && m.cost <= S.energy && (!grab || m.cost < grab.m.cost)) grab = { p, m };
    }
    if (grab) return moveAct(grab.p, grab.m);
  } else {
    // lawan membawa bola: rebut jika sepadan dengan risiko pelanggaran
    const box = inBox(h.x, h.y, sideOf(t));
    const ev = (1 - CONFIG.FOUL_CHANCE) * (3 + 0.5 * holdValue(h, h.team)) + CONFIG.FOUL_CHANCE * (box ? -18 : -2);
    if (ev > 0) {
      let st = null;
      for (const p of S.players) {
        if (p.team !== t || S.used.has(p.id)) continue;
        for (const m of moveTargets(p)) if (m.steal && m.cost <= S.energy && (!st || m.cost < st.m.cost)) st = { p, m };
      }
      if (st) return moveAct(st.p, st.m);
    }
  }
  // sisihkan energi untuk tendangan jika masih membawa bola
  const reserve = own ? CONFIG.COST_SHOT : 0;
  const ball = !h ? { x: S.ball.x, y: S.ball.y } : null;
  if (ball) {
    // bola lepas tapi belum terjangkau: pemain terdekat mendekat
    let best = null;
    for (const p of S.players) {
      if (p.team !== t || S.used.has(p.id) || p.role === 'GK') continue;
      for (const m of moveTargets(p)) {
        if (m.cost > S.energy) continue;
        const gain = cheb(p, ball) - cheb(m, ball);
        if (gain > 0 && (!best || gain - 0.1 * m.cost > best.s)) best = { s: gain - 0.1 * m.cost, run: moveAct(p, m) };
      }
    }
    if (best) return best.run;
  }
  return bestPositionMove(t, own, reserve);
}

async function runBot() {
  botBusy = true;
  const id = S.turnId;
  const alive = () => S.turnId === id && S.phase === 'play' && S.bots.has(S.turn);
  botTouched = new Set();
  try {
    await botWait(BOT.STEP_MS);
    for (let i = 0; i < 40 && alive(); i++) {
      const hh = holder();
      if (hh && hh.team === S.turn) botTouched.add(hh.id);
      const act = botDecide();
      if (!act) {
        addLog(`${teamName(S.turn)} mengakhiri giliran`, S.turn);
        endTurn();
        break;
      }
      await act();
      await botWait(BOT.STEP_MS);
    }
  } finally {
    botBusy = false;
  }
}

async function runBotPenalty() {
  botBusy = true;
  try {
    await botWait(1200);
    if (S.phase === 'penalty' && S.bots.has(S.turn)) await takePenalty();
  } finally {
    botBusy = false;
  }
}

/* ---------- start ---------- */
buildPitch();
applyTeamColors();
render();
// menu utama dibuka setelah semua skrip (termasuk league.js) dimuat
window.addEventListener('load', showMainMenu);
requestAnimationFrame(tick);
