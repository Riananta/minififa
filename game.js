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
  PASS_THROUGH: 0.30,  // peluang bola lolos saat kena pemain lapangan lawan
  GK_BOX: 0.40,        // peluang tembakan menembus kiper, ditendang dari dalam kotak penalti
  GK_FAR: 0.15,        // peluang tembakan menembus kiper, ditendang dari luar kotak penalti
  CHIP_FLIGHT: 2,      // tendangan lambung: jumlah kotak awal yang melayang di atas pemain
  FOUL_CHANCE: 0.25,   // peluang pelanggaran saat merebut bola
  PEN_SAVE: 0.20,      // peluang kiper menahan penalti
  TURN_SECONDS: 30,    // waktu per giliran
  HALF_SECONDS: 300,   // 5 menit per babak
};

const TEAMS = {
  home: { name: 'Tim Biru', color: '#2f7cf6' },
  away: { name: 'Tim Merah', color: '#ef4444' },
};

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
  phase: 'toss',      // toss | play | animating | goal | break | over
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
  moved: null,        // id pemain yang barusan bergerak/menerima bola (boleh langsung tendang)
  action: 'kick',     // pilihan pembawa bola: kick | chip | dribble
  setPiece: null,     // null | 'free' (tendangan bebas sedang berlangsung)
  wall: null,         // id pemain pagar saat tendangan bebas
  penalty: null,      // { taker, def } saat fase penalti
  targets: [],
  hint: '',
};

const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const other = t => (t === 'home' ? 'away' : 'home');
const leftTeam = () => (S.half === 1 ? 'home' : 'away');
const sideOf = t => (t === leftTeam() ? 'left' : 'right');
const mirrorX = x => CONFIG.COLS + 1 - x;
const inField = (x, y) => x >= 1 && x <= CONFIG.COLS && y >= 0 && y < CONFIG.ROWS;
const playerAt = (x, y) => S.players.find(p => p.x === x && p.y === y);
const holder = () => playerAt(S.ball.x, S.ball.y);
const getSel = () => S.players.find(p => p.id === S.selected);
const teamName = t => TEAMS[t].name;

/* =========================================================
   ATURAN
   ========================================================= */
// Tempatkan semua pemain di posisi formasi. kickTeam = tim yang kick off (penyerangnya maju ke bola).
function placeFormation(kickTeam = null) {
  S.players = [];
  for (const t of ['home', 'away']) {
    const left = sideOf(t) === 'left';
    for (const f of FORMATION) {
      let x = (f.kx && t === kickTeam) ? f.kx : f.x;
      if (!left) x = mirrorX(x);
      S.players.push({ id: t + f.num, team: t, num: f.num, role: f.role, x, y: f.y });
    }
  }
}

function setupKickoff(team) {
  placeFormation(team);
  S.ball = { x: sideOf(team) === 'left' ? 6 : 7, y: 2 };
  S.setPiece = null;
  S.penalty = null;
  S.turn = team;
  S.turnTime = CONFIG.TURN_SECONDS;
  S.selected = null;
  S.moved = null;
  S.action = 'kick';
  S.phase = 'play';
  refresh();
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
    for (let s = 1; s <= max; s++) {
      const nx = p.x + dx * s, ny = p.y + dy * s;
      if (!inField(nx, ny)) break;
      if (p.role === 'GK' && !CONFIG.GOAL_ROWS.includes(ny)) break;
      const q = playerAt(nx, ny);
      if (q) {
        const isHolder = S.ball.x === nx && S.ball.y === ny;
        if (q.team !== p.team && isHolder && !dribbling) {
          const push = pushCell(q, p);
          if (push) res.push({ x: nx, y: ny, steal: q, push });
        }
        break;
      }
      res.push({ x: nx, y: ny });
    }
  }
  return res;
}

// Kotak kosong terdekat untuk pemain yang bolanya direbut,
// diutamakan mundur ke arah gawangnya sendiri.
function pushCell(victim, mover) {
  const ownGoalX = sideOf(victim.team) === 'left' ? 0 : CONFIG.COLS + 1;
  const free = (x, y) => inField(x, y) && !(x === mover.x && y === mover.y ? false : playerAt(x, y));
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

// Peluang bola lolos saat mengenai pemain p (0 = pasti berhenti / diterima)
function passChance(p, kicker, from) {
  if (p.team === kicker.team) return 0; // kena teman = operan
  if (p.role === 'GK') return inBox(from.x, from.y, sideOf(p.team)) ? CONFIG.GK_BOX : CONFIG.GK_FAR;
  return CONFIG.PASS_THROUGH;
}

// Simulasi tendangan lurus ke arah (dx,dy). Bola melaju tanpa batas jarak sampai:
//  - kena teman            -> operan, dikuasai teman
//  - kena lawan            -> diundi: lolos (terus melaju) atau dikuasai lawan
//  - masuk gawang          -> GOL
//  - kena batas / tiang    -> berhenti di kotak terakhir
// Lambung (chip): CHIP_FLIGHT kotak pertama melayang di atas pemain lapangan (kiper tetap bisa menghadang).
// roll(chance) -> true jika lolos. Untuk preview dipakai roll yang selalu false.
function simulateKick(kicker, dx, dy, chip, roll) {
  const from = { ...S.ball };
  const path = [], events = [];
  let goal = null, receiver = null;
  for (let s = 1; ; s++) {
    const nx = from.x + dx * s, ny = from.y + dy * s;
    if ((nx === 0 || nx === CONFIG.COLS + 1) && CONFIG.GOAL_ROWS.includes(ny)) {
      path.push({ x: nx, y: ny });
      goal = nx === 0 ? 'left' : 'right';
      break;
    }
    if (!inField(nx, ny)) break;
    const air = chip && s <= CONFIG.CHIP_FLIGHT;
    path.push({ x: nx, y: ny, air });
    const p = playerAt(nx, ny);
    if (!p) continue;
    if (air && p.role !== 'GK') continue; // melayang di atas pemain
    const chance = passChance(p, kicker, from);
    if (chance > 0) {
      const through = roll(chance);
      events.push({ p, chance, through, at: path.length - 1 });
      if (through) continue;
    }
    receiver = p;
    break;
  }
  // bola berhenti di batas tepat di kotak seorang pemain -> pemain itu menguasai bola
  if (!goal && !receiver && path.length) {
    const end = path[path.length - 1];
    const p = playerAt(end.x, end.y);
    if (p) receiver = p;
  }
  return { path, goal, receiver, events };
}

function kickTargets(chip = false) {
  const res = [];
  const k = holder();
  if (!k) return res;
  for (const [dx, dy] of DIRS8) {
    const sim = simulateKick(k, dx, dy, chip, () => false);
    if (!sim.path.length) continue; // langsung keluar lapangan, arah tidak valid
    const block = sim.events[0];
    res.push({
      x: k.x + dx, y: k.y + dy, dx, dy, chip,
      path: sim.path, goal: sim.goal, receiver: sim.receiver,
      chance: block ? block.chance : 0,
    });
  }
  return res;
}

// Hitung mode giliran, target & petunjuk
function refresh() {
  S.targets = [];
  S.mode = 'move';
  if (S.phase !== 'play') return;
  const h = holder();
  const ownHolder = h && h.team === S.turn ? h : null;

  // Sudah bergerak ke kotak bola giliran ini: boleh langsung menendang
  if (S.moved) {
    if (S.action === 'dribble') S.action = 'kick';
    S.mode = 'kick';
    S.selected = S.moved;
    S.targets = kickTargets(S.action === 'chip');
    S.hint = S.setPiece === 'free'
      ? `<b>TENDANGAN BEBAS</b> #${h.num}: klik panah untuk ${S.action === 'chip' ? 'tendangan lambung' : 'menendang'}.${S.wall ? ' Pagar lawan ditandai.' : ''}`
      : `<b>#${h.num}</b> menguasai bola. Klik panah untuk <b>langsung ${S.action === 'chip' ? 'melambungkan' : 'menendang'}</b>, atau tekan <b>Selesai Giliran</b>.`;
    return;
  }

  // Tim sendiri membawa bola: pembawa bola terpilih otomatis
  if (ownHolder && !S.selected) S.selected = ownHolder.id;
  const sel = getSel();

  if (sel && sel === ownHolder) {
    if (S.action === 'dribble') {
      S.targets = moveTargets(sel);
      S.hint = `<b>#${sel.num}</b> <b>menggiring</b> bola: klik kotak tujuan (lurus maks ${CONFIG.MAX_MOVE}, diagonal maks ${CONFIG.MAX_DIAG}).`;
      return;
    }
    S.mode = 'kick';
    S.targets = kickTargets(S.action === 'chip');
    S.hint = (S.targets.length
      ? `<b>#${sel.num}</b> membawa bola: klik panah untuk <b>${S.action === 'chip' ? 'tendangan lambung' : 'menendang'}</b>`
      : `<b>#${sel.num}</b> terkepung, tidak bisa menendang`) +
      `, ganti aksi di kanan, atau klik pemain lain.`;
    return;
  }
  if (sel && sel.team === S.turn) {
    S.targets = moveTargets(sel);
    const steal = S.targets.some(t => t.steal);
    S.hint = (sel.role === 'GK'
      ? `Kiper <b>#${sel.num}</b>: klik kotak tujuan (naik/turun di area gawang)`
      : `Klik kotak tujuan untuk <b>#${sel.num}</b> (lurus maks ${CONFIG.MAX_MOVE}, diagonal maks ${CONFIG.MAX_DIAG})`) +
      (steal ? `. Lingkaran merah = <b>rebut bola</b>.` : `, atau pilih pemain lain.`);
    return;
  }
  S.selected = null;
  S.hint = `Pilih <b>1 pemain</b> untuk digerakkan (lurus maks ${CONFIG.MAX_MOVE} kotak, diagonal maks ${CONFIG.MAX_DIAG}).`;
  if (h) S.hint += ` Dekati pembawa bola lawan untuk <b>merebut</b> bola.`;
}

function endTurn() {
  if (S.clock <= 0) { endHalf(); return; }
  S.turn = other(S.turn);
  S.turnTime = CONFIG.TURN_SECONDS;
  S.selected = null;
  S.moved = null;
  S.action = 'kick';
  S.setPiece = null;
  S.wall = null;
  S.phase = 'play';
  refresh();
  render();
}

function setAction(act) {
  if (S.phase !== 'play' || S.paused) return;
  if (S.moved && act === 'dribble') return; // setelah bergerak/menerima operan tidak bisa menggiring lagi
  const h = holder();
  if (!h || h.team !== S.turn) return;
  S.selected = h.id;
  S.action = act;
  refresh();
  render();
}

/* =========================================================
   AKSI
   ========================================================= */
function onPlayerClick(id) {
  if (S.phase !== 'play' || S.paused || S.moved) return;
  const p = S.players.find(q => q.id === id);
  if (!p || p.team !== S.turn) return;
  const isHolder = holder() === p;
  if (isHolder && S.selected === id) {
    // klik pembawa bola lagi = ganti aksi: Tendang -> Lambung -> Giring
    S.action = { kick: 'chip', chip: 'dribble', dribble: 'kick' }[S.action];
  } else {
    S.selected = S.selected === id ? null : id;
    S.action = 'kick';
  }
  refresh();
  render();
}

async function onTargetClick(t) {
  if (S.phase !== 'play' || S.paused) return;
  if (S.mode === 'move') {
    const p = getSel();
    if (!p) return;
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
    if (t.steal) addLog(`${teamName(p.team)} #${p.num} merebut bola dari #${t.steal.num}!`, p.team);
    else if (dribble) addLog(`${teamName(p.team)} #${p.num} menggiring bola`, p.team);
    else addLog(`${teamName(p.team)} #${p.num} bergerak${got ? ' & menguasai bola' : ''}`, p.team);
    await sleep(320);
    els.ball.classList.remove('dribble');
    if (got) {
      // boleh langsung menendang di giliran yang sama
      S.moved = p.id;
      S.phase = 'play';
      refresh();
      render();
    } else {
      endTurn();
    }
  } else {
    await doKick(t);
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
  addLog(`Pelanggaran ${teamName(fouler.team)} #${fouler.num} terhadap #${victim.num}${pen ? ' di kotak penalti!' : ''}`, fouler.team, 'info');
  await flash(pen ? 'PENALTI!' : 'TENDANGAN BEBAS', `Pelanggaran #${fouler.num} · ${teamName(victim.team)}`, TEAMS[victim.team].color);
  if (pen) setupPenalty(victim, fouler.team);
  else setupFreeKick(victim, fouler.team);
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
  gk.y = 2;                                     // kiper di tengah gawang
  S.ball = { x: taker.x, y: taker.y };
  S.turn = victim.team;
  S.turnTime = CONFIG.TURN_SECONDS;
  S.selected = taker.id;
  S.moved = null;
  S.setPiece = null;
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
  for (let x = taker.x + dx; x !== gk.x + dx; x += dx) {
    S.ball = { x, y: 2 };
    renderBall();
    await sleep(140);
  }
  if (Math.random() < CONFIG.PEN_SAVE) {
    popup(gk, 'DITAHAN!', 'bad');
    addLog(`Penalti #${taker.num} ditahan kiper ${teamName(def)} #${gk.num}!`, def, 'info');
    renderBall();
    await sleep(700);
    endTurn(); // giliran pindah ke tim kiper yang memegang bola
    return;
  }
  popup(gk, 'TEMBUS!', 'ok');
  S.ball = { x: gk.x + dx, y: 2 };
  renderBall();
  await sleep(200);
  await handleGoal(dx < 0 ? 'left' : 'right', taker);
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

  // 2) pagar 1 pemain jika pelanggaran di area lawan (setengah lapangan yang diserang)
  let wall = null;
  const inAttackHalf = defSide === 'left' ? ball.x <= CONFIG.COLS / 2 : ball.x > CONFIG.COLS / 2;
  if (inAttackHalf) {
    const dx = Math.sign(defGoalX - ball.x), dy = Math.sign(2 - ball.y);
    const cands = [
      { x: ball.x + 2 * dx, y: ball.y + 2 * dy },
      { x: ball.x + 2 * dx, y: ball.y },
      { x: ball.x + 2 * dx, y: ball.y + dy },
    ];
    const spot = cands.find(c => inField(c.x, c.y) && (!playerAt(c.x, c.y) || isDefField(playerAt(c.x, c.y), defTeam)));
    if (spot) {
      wall = playerAt(spot.x, spot.y);
      if (!wall || !isDefField(wall, defTeam)) {
        wall = S.players.filter(p => isDefField(p, defTeam))
          .sort((a, b) => cheb(a, spot) - cheb(b, spot))[0];
        if (wall) { wall.x = spot.x; wall.y = spot.y; }
      }
    }
  }

  S.turn = victim.team;
  S.turnTime = CONFIG.TURN_SECONDS;
  S.selected = victim.id;
  S.moved = victim.id;      // penendang langsung dalam mode tendang (tanpa giring)
  S.action = 'kick';
  S.setPiece = 'free';
  S.wall = wall ? wall.id : null;
  S.phase = 'play';
  refresh();
  render();
  addLog(`Tendangan bebas ${teamName(victim.team)} #${victim.num}${wall ? `, pagar ${teamName(defTeam)} #${wall.num}` : ''}`, victim.team, 'info');
}

const isDefField = (p, team) => p && p.team === team && p.role !== 'GK';

// Kotak kosong terdekat dari pemain q yang memenuhi syarat ok(c); kiper tetap di garis gawang.
function freeCellNear(q, ok, ownGoalX) {
  const cells = [];
  for (let y = 0; y < CONFIG.ROWS; y++)
    for (let x = 1; x <= CONFIG.COLS; x++) {
      if (q.role === 'GK' && (x !== q.x || !CONFIG.GOAL_ROWS.includes(y))) continue;
      if (playerAt(x, y) || (S.ball.x === x && S.ball.y === y) || !ok({ x, y })) continue;
      cells.push({ x, y });
    }
  const d = c => Math.max(Math.abs(c.x - q.x), Math.abs(c.y - q.y));
  cells.sort((a, b) => d(a) - d(b) || Math.abs(a.x - ownGoalX) - Math.abs(b.x - ownGoalX));
  return cells[0] || null;
}

async function doKick(t) {
  const k = holder();
  S.setPiece = null;
  S.wall = null;
  S.phase = 'animating';
  S.targets = [];
  S.selected = null;
  render();
  // hasil sebenarnya diundi di sini
  const sim = simulateKick(k, t.dx, t.dy, t.chip, ch => Math.random() < ch);
  const evAt = new Map(sim.events.map(e => [e.at, e]));
  const kind = t.chip ? 'tendangan lambung' : 'tendangan';
  for (let i = 0; i < sim.path.length; i++) {
    const c = sim.path[i];
    S.ball = { x: c.x, y: c.y };
    els.ball.classList.toggle('air', !!c.air);
    renderBall();
    const e = evAt.get(i);
    if (e) {
      const gk = e.p.role === 'GK';
      if (e.through) {
        popup(c, gk ? 'TEMBUS!' : 'LOLOS!', 'ok');
        addLog(gk ? `Tembakan #${k.num} menembus kiper #${e.p.num}!` : `Bola lolos dari ${teamName(e.p.team)} #${e.p.num}`, k.team);
      } else {
        popup(c, gk ? 'DITANGKAP' : 'DIPOTONG', 'bad');
      }
    }
    await sleep(c.air ? 150 : 110);
  }
  els.ball.classList.remove('air');
  if (sim.goal) {
    await handleGoal(sim.goal, k);
    return;
  }
  const r = sim.receiver;
  if (!r) addLog(`${teamName(k.team)} #${k.num} melakukan ${kind}`, k.team);
  else if (r.team === k.team) addLog(`${teamName(k.team)} #${k.num} mengoper ke #${r.num}${t.chip ? ' (lambung)' : ''}`, k.team);
  else if (r.role === 'GK') addLog(`Kiper ${teamName(r.team)} #${r.num} menangkap ${kind} #${k.num}`, r.team);
  else addLog(`${kind[0].toUpperCase() + kind.slice(1)} #${k.num} dipotong ${teamName(r.team)} #${r.num}`, r.team);
  renderBall();
  await sleep(150);
  if (r && r.team === k.team) {
    // operan sukses: penerima boleh langsung menendang (berantai)
    S.moved = r.id;
    S.phase = 'play';
    refresh();
    render();
  } else {
    endTurn();
  }
}

async function handleGoal(side, kicker) {
  const conceding = side === 'left' ? leftTeam() : other(leftTeam());
  const scorer = other(conceding);
  const own = kicker.team === conceding;
  S.score[scorer]++;
  S.phase = 'goal';
  renderHud();
  addLog(`GOL! ${teamName(scorer)}${own ? ` (gol bunuh diri #${kicker.num})` : ` (#${kicker.num})`}`, scorer, 'goal');
  showModal(`
    <div class="goal-text">GOOOL!</div>
    <p class="goal-sub" style="color:${TEAMS[scorer].color}">${teamName(scorer)}${own ? ' (gol bunuh diri)' : ` · #${kicker.num}`}</p>
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
      hideModal();
      S.half = 2;
      S.clock = CONFIG.HALF_SECONDS;
      setupKickoff(k);
      addLog(`Babak kedua dimulai, kick off ${teamName(k)}`, k, 'info');
      render();
    };
  } else {
    S.phase = 'over';
    render();
    addLog('Pertandingan selesai', null, 'info');
    const { home, away } = S.score;
    const res = home === away ? 'Hasil Imbang' : `${teamName(home > away ? 'home' : 'away')} Menang!`;
    const col = home === away ? 'var(--gold)' : TEAMS[home > away ? 'home' : 'away'].color;
    showModal(`
      <h2>Full Time</h2>
      <div class="final">${home} : ${away}</div>
      <p style="font-size:20px;font-weight:800;color:${col}">${res}</p>
      <div class="btns"><button class="btn primary" id="btnAgain">Main Lagi</button></div>`);
    $('btnAgain').onclick = () => { hideModal(); resetGame(); };
  }
}

function resetGame() {
  S.half = 1;
  S.clock = CONFIG.HALF_SECONDS;
  S.score = { home: 0, away: 0 };
  S.paused = false;
  $('log').innerHTML = '';
  setupKickoff('home');
  S.phase = 'toss';
  refresh();
  render();
  showToss();
}

/* =========================================================
   LEMPAR KOIN
   ========================================================= */
function showToss() {
  showModal(`
    <h2>Lempar Koin</h2>
    <p><b style="color:${TEAMS.home.color}">${teamName('home')}</b> menebak sisi koin.<br>
       Benar: ${teamName('home')} kick off. Salah: ${teamName('away')} kick off.</p>
    <div class="coin-stage"><div class="coin" id="coin">
      <div class="face head">HEAD</div><div class="face tail">TAIL</div>
    </div></div>
    <p id="tossResult">Pilih tebakanmu</p>
    <div class="btns" id="tossBtns">
      <button class="btn home" data-guess="head">HEAD</button>
      <button class="btn home" data-guess="tail">TAIL</button>
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
        const k = correct ? 'home' : 'away';
        S.firstKickoff = k;
        $('tossResult').innerHTML =
          `Hasil: <b>${result.toUpperCase()}</b>, tebakan ${correct ? 'benar' : 'salah'}!<br>` +
          `<b style="color:${TEAMS[k].color}">${teamName(k)}</b> kick off lebih dulu.`;
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
}

/* =========================================================
   RENDER
   ========================================================= */
const els = { pieces: {}, ball: null, targets: null, pieceLayer: null };

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
  pitch.append(field, div('goal left'), div('goal right'), els.pieceLayer, els.targets, ballLayer);
}

function renderPieces() {
  const h = holder();
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
    const playing = S.phase === 'play' || S.phase === 'animating';
    el.className = 'at player ' + p.team +
      (p.role === 'GK' ? ' gk' : '') +
      (S.selected === p.id ? ' selected' : '') +
      (h === p ? ' holder' : '') +
      (S.phase === 'play' && !S.moved && p.team === S.turn ? ' can-select' : '') +
      (playing && p.team !== S.turn ? ' inactive' : '') +
      (S.wall === p.id ? ' wall' : '') +
      (S.phase === 'penalty' && S.penalty && S.penalty.taker === p.id ? ' selected' : '');
    el.title = `${teamName(p.team)} #${p.num} (${p.role})`;
  }
}

function renderBall() {
  place(els.ball, S.ball.x, S.ball.y);
  els.ball.classList.toggle('held', !!holder());
}

function renderTargets() {
  const layer = els.targets;
  layer.innerHTML = '';
  if (S.paused) return;
  for (const t of S.targets) {
    const b = document.createElement('button');
    place(b, t.x, t.y);
    b.onclick = () => onTargetClick(t);
    if (S.mode === 'kick') {
      b.className = 'at target arrow' + (t.goal ? ' goal' : '') + (t.chip ? ' chip' : '');
      const deg = Math.atan2(t.dy, t.dx) * 180 / Math.PI;
      const pct = t.chance ? `<span class="pct">${Math.round(t.chance * 100)}%</span>` : '';
      b.innerHTML = `<span class="rot" style="transform:rotate(${deg}deg)"><svg viewBox="0 0 24 24"><path d="M3 9.5h10V4.5L21.5 12 13 19.5v-5H3z"/></svg></span>${pct}`;
      const r = t.receiver;
      b.title = t.goal ? 'Tendang ke gawang!'
        : r && r.team === S.turn ? `Oper ke #${r.num}`
        : r ? `Terhalang ${r.role === 'GK' ? 'kiper' : 'lawan'} #${r.num}: peluang lolos ${Math.round(t.chance * 100)}%`
        : 'Tendang';
      b.onmouseenter = () => showPath(t.path, t);
      b.onmouseleave = clearPath;
    } else {
      b.className = 'at target ' + (t.steal ? 'steal' : 'move');
      b.setAttribute('aria-label', t.steal ? `Rebut bola dari #${t.steal.num}` : `Kotak ${t.x},${t.y + 1}`);
      if (t.steal) b.title = `Rebut bola dari #${t.steal.num}`;
    }
    layer.appendChild(b);
  }
}
function showPath(cells, t) {
  clearPath();
  cells.forEach((c, i) => {
    const last = i === cells.length - 1;
    const foe = last && t.receiver && t.receiver.team !== S.turn;
    const d = div('at pathdot' + (c.air ? ' air' : '') +
      (last ? ' end' + (t.goal ? ' goal' : t.receiver ? ' recv' : '') + (foe ? ' foe' : '') : ''));
    if (foe && t.chance) d.dataset.pct = Math.round(t.chance * 100) + '% lolos';
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
  const pen = S.phase === 'penalty';
  $('turnPill').textContent = pen ? `Penalti ${teamName(S.turn)}`
    : active ? `Giliran ${teamName(S.turn)}` : (S.phase === 'over' ? 'Selesai' : 'Menunggu');
  $('btnPenalty').classList.toggle('hidden', !pen);
  const sec = Math.max(0, Math.ceil(S.turnTime));
  const low = active && sec <= 10;
  $('turnSec').textContent = active ? sec + 's' : '';
  $('turnSec').classList.toggle('low', low);
  $('timerFill').style.width = (active ? (Math.max(0, S.turnTime) / CONFIG.TURN_SECONDS) * 100 : 0) + '%';
  $('timerFill').classList.toggle('low', low);
  $('hint').innerHTML = S.phase === 'play' ? S.hint
    : pen ? (() => {
        const tk = S.players.find(p => p.id === S.penalty.taker);
        return `<b>PENALTI</b>: #${tk.num} menendang lurus ke tengah gawang. Peluang kiper menahan <b>${Math.round(CONFIG.PEN_SAVE * 100)}%</b>.`;
      })()
    : S.phase === 'animating' ? '...'
    : S.phase === 'toss' ? 'Lempar koin untuk menentukan kick off.' : '';

  $('btnPause').disabled = !active;
  $('btnPause').textContent = S.paused ? '▶ Lanjut' : '⏸ Pause';
  $('btnSkip').disabled = S.phase !== 'play' || S.paused;
  const h = holder();
  const showAct = S.phase === 'play' && !S.paused && h && h.team === S.turn && S.selected === h.id;
  $('holderActions').classList.toggle('hidden', !showAct);
  document.querySelector('[data-act="dribble"]').classList.toggle('hidden', !!S.moved);
  document.querySelectorAll('[data-act]').forEach(b => b.classList.toggle('on', b.dataset.act === S.action));
  $('btnSkip').textContent = S.moved ? '✓ Selesai Giliran' : '⏭ Lewati Giliran';
  $('btnSkip').classList.toggle('primary', !!S.moved);
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
document.querySelectorAll('[data-act]').forEach(b => { b.onclick = () => setAction(b.dataset.act); });
$('btnSkip').onclick = () => {
  if (S.phase !== 'play' || S.paused) return;
  if (!S.moved) addLog(`${teamName(S.turn)} melewati giliran`, S.turn);
  endTurn();
};
$('btnRestart').onclick = () => {
  if (confirm('Ulang pertandingan dari awal?')) { hideModal(); resetGame(); }
};
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && S.phase === 'play' && S.mode === 'move' && S.selected) {
    S.selected = null; refresh(); render();
  }
  if (e.key === 'p' || e.key === 'P') togglePause();
});

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
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
  requestAnimationFrame(tick);
}

/* ---------- start ---------- */
buildPitch();
resetGame();
requestAnimationFrame(tick);
