'use strict';

/* =========================================================
   MODE LIGA & PIALA
   - 16 tim, kompetisi kandang-tandang (30 pekan)
   - Piala sistem gugur 1 leg (imbang = adu penalti), berjalan di sela liga
   - Mode "Main Sendiri": pilih 1 tim, mainkan (atau hasil instan); pertandingan lain diundi
   - Mode "Liga Komputer": semua pertandingan komputer vs komputer (Hard), ditonton satu per satu
   - Rating pemain tiap pertandingan, penghargaan Pemain Terbaik & Dream Team tiap musim
   - Semua tersimpan di localStorage, termasuk riwayat juara tiap musim
   ========================================================= */
const League = (() => {
  const SAVE_KEY = 'minififa.league';
  const START_YEAR = 2026;

  // Data awal: 16 klub besar Eropa. rating = kekuatan untuk simulasi skor.
  const CLUBS = [
    { id: 'rma', name: 'Real Madrid',     color: '#f1f5f9', alt: '#6d28d9', rating: 90 },
    { id: 'mci', name: 'Manchester City', color: '#6cabdd', alt: '#1c2c5b', rating: 89 },
    { id: 'liv', name: 'Liverpool',       color: '#c8102e', alt: '#f1f5f9', rating: 89 },
    { id: 'ars', name: 'Arsenal',         color: '#ef0107', alt: '#facc15', rating: 88 },
    { id: 'bay', name: 'Bayern München',  color: '#dc052d', alt: '#f1f5f9', rating: 89 },
    { id: 'bar', name: 'Barcelona',       color: '#a50044', alt: '#edbb00', rating: 88 },
    { id: 'psg', name: 'Paris SG',        color: '#004170', alt: '#f1f5f9', rating: 88 },
    { id: 'int', name: 'Inter',           color: '#0068a8', alt: '#f1f5f9', rating: 86 },
    { id: 'atm', name: 'Atlético Madrid', color: '#cb3524', alt: '#1e3a8a', rating: 84 },
    { id: 'che', name: 'Chelsea',         color: '#034694', alt: '#f1f5f9', rating: 84 },
    { id: 'lev', name: 'Leverkusen',      color: '#1f2937', alt: '#e32221', rating: 84 },
    { id: 'nap', name: 'Napoli',          color: '#12a0d7', alt: '#f1f5f9', rating: 84 },
    { id: 'juv', name: 'Juventus',        color: '#f1f5f9', alt: '#1f2937', rating: 83 },
    { id: 'bvb', name: 'Dortmund',        color: '#fde100', alt: '#1f2937', rating: 83 },
    { id: 'mun', name: 'Manchester Utd',  color: '#da291c', alt: '#1f2937', rating: 82 },
    { id: 'acm', name: 'AC Milan',        color: '#fb090b', alt: '#f1f5f9', rating: 82 },
  ];
  // Pemain inti tiap klub, sesuai formasi game: 1 = kiper, 2 & 4 = bek, 7 & 11 = gelandang, 9 = penyerang.
  // Data dari pengetahuan hingga pertengahan 2026; transfer setelah itu belum tercakup. Bebas diedit.
  const SQUADS = {
    rma: { 1: 'Courtois',   2: 'Alexander-Arnold', 4: 'Huijsen',      7: 'Valverde',    11: 'Bellingham', 9: 'Mbappé' },
    mci: { 1: 'Donnarumma', 2: 'Rúben Dias',  4: 'Gvardiol',     7: 'Rodri',       11: 'Reijnders',  9: 'Haaland' },
    liv: { 1: 'Alisson',    2: 'Frimpong',    4: 'Van Dijk',     7: 'Salah',       11: 'Wirtz',      9: 'Isak' },
    ars: { 1: 'Raya',       2: 'Saliba',      4: 'Gabriel',      7: 'Saka',        11: 'Rice',       9: 'Gyökeres' },
    bay: { 1: 'Neuer',      2: 'Upamecano',   4: 'Kim Min-jae',  7: 'Olise',       11: 'Kimmich',    9: 'Kane' },
    bar: { 1: 'Joan García', 2: 'Koundé',     4: 'Cubarsí',      7: 'Lamine Yamal', 11: 'Pedri',     9: 'Raphinha' },
    psg: { 1: 'Chevalier',  2: 'Hakimi',      4: 'Marquinhos',   7: 'Vitinha',     11: 'Kvaratskhelia', 9: 'Dembélé' },
    int: { 1: 'Sommer',     2: 'Dimarco',     4: 'Bastoni',      7: 'Barella',     11: 'Çalhanoğlu', 9: 'Lautaro' },
    atm: { 1: 'Oblak',      2: 'Llorente',    4: 'Giménez',      7: 'Baena',       11: 'Barrios',    9: 'Julián Álvarez' },
    che: { 1: 'Sánchez',    2: 'Reece James', 4: 'Colwill',      7: 'Palmer',      11: 'Enzo',       9: 'João Pedro' },
    lev: { 1: 'Flekken',    2: 'Grimaldo',    4: 'Tapsoba',      7: 'Aleix García', 11: 'Andrich',   9: 'Schick' },
    nap: { 1: 'Meret',      2: 'Di Lorenzo',  4: 'Buongiorno',   7: 'McTominay',   11: 'De Bruyne',  9: 'Højlund' },
    juv: { 1: 'Di Gregorio', 2: 'Cambiaso',   4: 'Bremer',       7: 'Yıldız',      11: 'Locatelli',  9: 'Jonathan David' },
    bvb: { 1: 'Kobel',      2: 'Ryerson',     4: 'Schlotterbeck', 7: 'Adeyemi',    11: 'J. Bellingham', 9: 'Guirassy' },
    mun: { 1: 'Lammens',    2: 'Dalot',       4: 'De Ligt',      7: 'Bruno F.',    11: 'Cunha',      9: 'Šeško' },
    acm: { 1: 'Maignan',    2: 'Tomori',      4: 'Gabbia',       7: 'Pulisic',     11: 'Modrić',     9: 'Leão' },
  };
  const CUP_ROUNDS = ['Babak 16 Besar', 'Perempat Final', 'Semifinal', 'Final'];
  // tingkat kesulitan komputer lawan
  const LEVELS = [
    ['easy', 'Easy', 'Komputer sering salah langkah & jarang bertahan rapat'],
    ['medium', 'Medium', 'Komputer cukup cerdas, sesekali lengah'],
    ['hard', 'Hard', 'Komputer bermain penuh: bertahan rapat & membaca peluang'],
  ];
  const levelName = k => (LEVELS.find(l => l[0] === k) || LEVELS[2])[1];
  // peluang mencetak gol / memberi assist per posisi (untuk pertandingan yang diundi)
  const GOAL_W = { 9: 42, 7: 20, 11: 20, 2: 6, 4: 6, 1: 0 };
  const ASSIST_W = { 9: 18, 7: 30, 11: 30, 2: 11, 4: 9, 1: 2 };
  const ASSIST_CHANCE = 0.7;
  const CUP_AFTER = [4, 10, 18, 26];   // babak piala dimainkan setelah pekan liga ke-n
  const PEN_SCORE = 0.76;              // peluang gol tiap penalti saat adu penalti

  let save = null;
  let tab = 'table';
  let viewEvent = null; // index event yang ditampilkan di tab Jadwal

  const el = id => document.getElementById(id);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const seasonName = y => `${y}/${y + 1}`;
  const club = id => save.clubs.find(c => c.id === id);
  const isCpu = () => save.mode === 'cpu';
  const isMe = id => !!save.user && id === save.user;
  const ROLE_OF = { 1: 'GK', 2: 'DF', 4: 'DF', 7: 'MF', 11: 'MF', 9: 'FW' };
  const NUMS = [1, 2, 4, 7, 11, 9];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const h = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- simpan / muat ---------- */
  function load() {
    try { save = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { save = null; }
    if (save && save.v !== 1) save = null;
    // karier lama (sebelum ada nama pemain): lengkapi daftar pemain
    if (save) for (const c of save.clubs) if (!c.squad) c.squad = { ...SQUADS[c.id] };
    // karier lama (sebelum ada tingkat kesulitan) tetap Hard seperti sebelumnya
    if (save && !save.difficulty) save.difficulty = 'hard';
    // karier lama = mode Main Sendiri
    if (save && !save.mode) save.mode = 'solo';
    return save;
  }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* abaikan */ } }
  function hasSave() { return !!load(); }

  /* ---------- jadwal ---------- */
  // Round robin metode lingkaran; paruh kedua musim = kebalikan kandang/tandang
  function roundRobin(ids) {
    const n = ids.length, arr = ids.slice(), rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const pairs = [];
      for (let i = 0; i < n / 2; i++) {
        let a = arr[i], b = arr[n - 1 - i];
        if (i === 0 ? r % 2 === 1 : i % 2 === 1) [a, b] = [b, a];
        pairs.push([a, b]);
      }
      rounds.push(pairs);
      arr.splice(1, 0, arr.pop());
    }
    return rounds.concat(rounds.map(p => p.map(([a, b]) => [b, a])));
  }

  function newSeason(year) {
    const ids = shuffle(save.clubs.map(c => c.id));
    const rounds = roundRobin(ids);
    const events = [];
    rounds.forEach((pairs, i) => {
      events.push({ type: 'league', md: i + 1, matches: pairs.map(([hh, a]) => ({ h: hh, a })) });
      const r = CUP_AFTER.indexOf(i + 1);
      if (r >= 0) events.push({ type: 'cup', round: r, matches: [] });
    });
    // undian babak pertama piala
    const draw = shuffle(save.clubs.map(c => c.id));
    events.find(e => e.type === 'cup' && e.round === 0).matches =
      Array.from({ length: 8 }, (_, i) => ({ h: draw[2 * i], a: draw[2 * i + 1] }));
    save.year = year;
    save.events = events;
    save.next = 0;
  }

  function newCareer() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* abaikan */ }
    save = null;
    pickMode();
  }

  // Awal mode liga: Main Sendiri atau Liga Komputer
  function pickMode() {
    showModal(`
      <h2>Mode Liga</h2>
      <p>Musim ${seasonName(START_YEAR)} · 16 tim · liga kandang-tandang + piala</p>
      <div class="menu-list">
        <button class="menu-btn" id="mSolo"><span>🎮</span><b>Main Sendiri</b><small>Pilih 1 tim & mainkan pertandingannya</small></button>
        <button class="menu-btn" id="mCpu"><span>🤖</span><b>Liga Komputer</b><small>Tonton semua pertandingan komputer vs komputer (Hard)</small></button>
      </div>
      <div class="btns"><button class="btn ghost" id="btnModeBack">← Kembali</button></div>`);
    el('mSolo').onclick = () => pickTeam();
    el('mCpu').onclick = () => {
      save = { v: 1, mode: 'cpu', user: null, difficulty: 'hard', clubs: CLUBS.map(c => ({ ...c, squad: { ...SQUADS[c.id] } })), history: [] };
      newSeason(START_YEAR);
      persist();
      hideModal();
      tab = 'table';
      viewEvent = null;
      showHub();
    };
    el('btnModeBack').onclick = () => { hideModal(); showMainMenu(); };
  }

  function pickTeam() {
    const list = CLUBS.slice().sort((a, b) => b.rating - a.rating);
    showModal(`
      <h2>Pilih Tim</h2>
      <p>Musim ${seasonName(START_YEAR)} · 16 tim · liga kandang-tandang + piala</p>
      <div class="lvl-pick">
        <span>Tingkat kesulitan:</span>
        <div class="seg">${LEVELS.map(([k, n]) => `<button type="button" data-lvl="${k}" class="${k === 'medium' ? 'on' : ''}">${n}</button>`).join('')}</div>
        <small id="lvlDesc">${LEVELS[1][2]}</small>
      </div>
      <div class="club-grid">
        ${list.map(c => `<button class="club-btn" data-club="${c.id}">
          <span class="club-dot" style="background:${c.color}"></span>
          <b>${h(c.name)}</b><small>${stars(c.rating)}</small></button>`).join('')}
      </div>
      <div class="btns"><button class="btn ghost" id="btnPickBack">← Kembali</button></div>`);
    let lvl = 'medium';
    document.querySelectorAll('[data-lvl]').forEach(b => {
      b.onclick = () => {
        lvl = b.dataset.lvl;
        document.querySelectorAll('[data-lvl]').forEach(x => x.classList.toggle('on', x === b));
        el('lvlDesc').textContent = LEVELS.find(l => l[0] === lvl)[2];
      };
    });
    document.querySelectorAll('[data-club]').forEach(b => {
      b.onclick = () => {
        save = { v: 1, mode: 'solo', user: b.dataset.club, difficulty: lvl, clubs: CLUBS.map(c => ({ ...c, squad: { ...SQUADS[c.id] } })), history: [] };
        newSeason(START_YEAR);
        persist();
        hideModal();
        tab = 'table';
        viewEvent = null;
        showHub();
      };
    });
    el('btnPickBack').onclick = () => pickMode();
  }
  const stars = r => '★'.repeat(Math.max(1, Math.round((r - 78) / 3))) ;

  /* ---------- simulasi ---------- */
  function poisson(l) {
    const L = Math.exp(-l);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  }
  function simScore(hid, aid) {
    const d = (club(hid).rating - club(aid).rating) / 22;
    return [poisson(1.45 * Math.exp(d)), poisson(1.15 * Math.exp(-d))];
  }
  // Adu penalti: 5 tendangan per tim, lalu sudden death
  function shootout() {
    const kicks = [];
    let ph = 0, pa = 0;
    for (let i = 0; i < 5; i++) {
      const a = Math.random() < PEN_SCORE; ph += a; kicks.push(['h', a]);
      if (ph > pa + (5 - i) || pa > ph + (5 - i - 1)) break;
      const b = Math.random() < PEN_SCORE; pa += b; kicks.push(['a', b]);
      if (ph > pa + (4 - i) || pa > ph + (4 - i)) break;
    }
    while (ph === pa) {
      const a = Math.random() < PEN_SCORE, b = Math.random() < PEN_SCORE;
      ph += a; pa += b; kicks.push(['h', a], ['a', b]);
    }
    return { ph, pa, kicks };
  }
  const pick = w => {
    const tot = Object.values(w).reduce((a, b) => a + b, 0);
    let r = Math.random() * tot;
    for (const [k, v] of Object.entries(w)) { r -= v; if (r < 0) return +k; }
    return 9;
  };
  // pencetak gol & assist acak (berbobot posisi) untuk pertandingan yang diundi
  function genGoals(cid, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const s = pick(GOAL_W);
      let a = null;
      if (Math.random() < ASSIST_CHANCE) { const w = { ...ASSIST_W }; delete w[s]; a = pick(w); }
      out.push({ c: cid, s, a });
    }
    return out;
  }
  // rating pemain untuk pertandingan yang diundi (dari gol, assist, hasil & kebobolan)
  function genRatings(m) {
    const side = (cid, own, conc) => {
      const out = {};
      for (const n of NUMS) {
        const role = ROLE_OF[n];
        let r = 6.3 + (Math.random() + Math.random() + Math.random() - 1.5) * 0.45;
        for (const g of m.goals || []) if (g.c === cid && !g.og) { if (g.s === n) r += 1.1; if (g.a === n) r += 0.7; }
        r += own > conc ? 0.5 : own === conc ? 0.1 : -0.4;
        if (role === 'GK') r += conc === 0 ? 0.8 : -0.3 * conc;
        if (role === 'DF') r += conc === 0 ? 0.4 : -0.15 * conc;
        out[n] = Math.round(Math.max(3, Math.min(10, r)) * 10) / 10;
      }
      return out;
    };
    return { h: side(m.h, m.hs, m.as), a: side(m.a, m.as, m.hs) };
  }
  function setResult(ev, m, hs, as, so, goals, ratings) {
    m.hs = hs; m.as = as; m.played = true;
    m.goals = goals || [...genGoals(m.h, hs), ...genGoals(m.a, as)];
    m.ratings = ratings ? { h: ratings.home, a: ratings.away } : genRatings(m);
    if (ev.type === 'cup') {
      if (hs === as) { const s = so || shootout(); m.ph = s.ph; m.pa = s.pa; }
      m.winner = hs > as || (hs === as && m.ph > m.pa) ? m.h : m.a;
    }
  }
  const winnerLabel = m => (m.ph != null ? ` (${m.ph}-${m.pa} pen)` : '');

  /* ---------- alur event ---------- */
  function currentEvent() {
    const ev = save.events[save.next];
    if (ev && ev.type === 'cup' && !ev.matches.length) {
      // pasangan babak berikutnya: pemenang pertandingan berurutan di bagan
      const prev = save.events.find(e => e.type === 'cup' && e.round === ev.round - 1);
      const w = prev.matches.map(m => m.winner);
      ev.matches = Array.from({ length: w.length / 2 }, (_, i) => {
        const pair = Math.random() < 0.5 ? [w[2 * i], w[2 * i + 1]] : [w[2 * i + 1], w[2 * i]];
        return { h: pair[0], a: pair[1] };
      });
      persist();
    }
    return ev;
  }
  const eventTitle = ev => ev.type === 'league' ? `Liga · Pekan ${ev.md}/30` : `Piala · ${CUP_ROUNDS[ev.round]}`;
  const userMatch = ev => ev && save.user && ev.matches.find(m => m.h === save.user || m.a === save.user);

  // Warna kostum: tim tamu memakai warna kedua jika terlalu mirip dengan tim tuan rumah
  function colorDist(a, b) {
    const p = x => [parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16)];
    const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
    return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
  }
  function kits(m) {
    const H = club(m.h), A = club(m.a);
    let ac = A.color;
    if (colorDist(H.color, ac) < 120) ac = colorDist(H.color, A.alt) >= 120 ? A.alt : '#f97316';
    return { home: { name: H.name, color: H.color, squad: H.squad }, away: { name: A.name, color: ac, squad: A.squad } };
  }

  async function playUserMatch(how) {
    const ev = currentEvent(), m = userMatch(ev);
    if (!m || m.played) return;
    const ko = ev.type === 'cup';
    if (how === 'instant') {
      const [hs, as] = simScore(m.h, m.a);
      const so = ko && hs === as ? shootout() : null;
      if (so) await showShootout(m, hs, as, so);
      setResult(ev, m, hs, as, so);
      await showInstant(ev, m);
      finishEvent();
      return;
    }
    const userSide = m.h === save.user ? 'home' : 'away';
    const k = kits(m);
    startMatch({
      ...k,
      bots: [userSide === 'home' ? 'away' : 'home'],
      knockout: ko,
      level: save.difficulty,
      label: eventTitle(ev),
      onEnd: (hs, as, events, ratings) => recordEngineResult(ev, m, hs, as, events, ratings, finishEvent),
    });
  }

  // Hasil dari mesin game (main sendiri / ditonton): gol, assist & rating sungguhan
  async function recordEngineResult(ev, m, hs, as, events, ratings, done) {
    const so = ev.type === 'cup' && hs === as ? shootout() : null;
    if (so) await showShootout(m, hs, as, so);
    // gol dari mesin game: home/away -> klub; gol bunuh diri tanpa pencetak
    const goals = (events || []).filter(e => e.type === 'goal')
      .map(e => ({ c: e.team === 'home' ? m.h : m.a, s: e.scorer, a: e.assist, og: e.own || undefined }));
    setResult(ev, m, hs, as, so, goals, ratings);
    done();
  }

  // Liga Komputer: tonton satu pertandingan (Hard vs Hard, kecepatan normal)
  function watchMatch(i) {
    const ev = currentEvent(), m = ev.matches[i];
    if (!m || m.played) return;
    startMatch({
      ...kits(m),
      bots: ['home', 'away'],
      knockout: ev.type === 'cup',
      level: 'hard',
      speed: 1,
      label: eventTitle(ev),
      onEnd: (hs, as, events, ratings) => recordEngineResult(ev, m, hs, as, events, ratings, () => {
        if (ev.matches.every(x => x.played)) finishEvent();
        else { persist(); tab = 'fixtures'; viewEvent = save.next; showHub(); }
      }),
    });
  }

  // Selesaikan event: undi pertandingan lain, maju ke event berikutnya
  function finishEvent() {
    const ev = currentEvent();
    for (const m of ev.matches) if (!m.played) { const [hs, as] = simScore(m.h, m.a); setResult(ev, m, hs, as); }
    viewEvent = save.next;
    save.next++;
    persist();
    tab = ev.type === 'cup' ? 'cup' : 'fixtures';
    showHub();
    if (save.next >= save.events.length) endSeason();
  }

  function endSeason() {
    const table = standings();
    const final = save.events.find(e => e.type === 'cup' && e.round === 3).matches[0];
    let userPos = null, userCup = null;
    if (save.user) {
      userPos = table.findIndex(r => r.id === save.user) + 1;
      userCup = 'Babak 16 Besar';
      for (const e of save.events) if (e.type === 'cup' && e.matches.some(m => m.h === save.user || m.a === save.user)) userCup = CUP_ROUNDS[e.round];
      if (final.winner === save.user) userCup = 'Juara';
    }
    const st = playerStats();
    const ts = st.goals[0], ta = st.assists[0];
    const pots = playerOfSeason(table, final.winner);
    const entry = { season: seasonName(save.year), league: table[0].id, cup: final.winner, userPos, userCup,
      topScorer: ts ? { c: ts.cid, name: pname(ts.cid, ts.num), n: ts.n } : null,
      topAssist: ta ? { c: ta.cid, name: pname(ta.cid, ta.num), n: ta.n } : null,
      pots, dream: dreamTeam() };
    if (!save.history.some(x => x.season === entry.season)) save.history.push(entry);
    persist();
    const L = club(entry.league), C = club(entry.cup);
    showModal(`
      <h2>Musim ${entry.season} Selesai</h2>
      <div class="champ-row"><span>🏆 Juara Liga</span><b style="color:${L.color}">${h(L.name)}</b></div>
      <div class="champ-row"><span>🥇 Juara Piala</span><b style="color:${C.color}">${h(C.name)}</b></div>
      ${entry.topScorer ? `<div class="champ-row"><span>👟 Top Skor</span><b>${h(entry.topScorer.name)} <small>(${h(club(entry.topScorer.c).name)}) · ${entry.topScorer.n} gol</small></b></div>` : ''}
      ${entry.topAssist ? `<div class="champ-row"><span>🎯 Top Assist</span><b>${h(entry.topAssist.name)} <small>(${h(club(entry.topAssist.c).name)}) · ${entry.topAssist.n} assist</small></b></div>` : ''}
      ${pots ? potsCard(pots) : ''}
      <h4 class="aw-h">⭐ Dream Team Musim Ini</h4>
      ${dreamPitch(entry.dream)}
      ${save.user ? `<p>${h(club(save.user).name)}: peringkat <b>${userPos}</b> di liga, piala: <b>${userCup}</b>.</p>` : ''}
      <div class="btns"><button class="btn primary" id="btnNextSeason">Mulai Musim ${seasonName(save.year + 1)}</button></div>`);
    el('btnNextSeason').onclick = () => {
      // kekuatan tim sedikit berubah tiap musim
      for (const c of save.clubs) c.rating = Math.max(74, Math.min(93, c.rating + Math.round((Math.random() - 0.5) * 6)));
      newSeason(save.year + 1);
      persist();
      hideModal();
      tab = 'table';
      viewEvent = null;
      showHub();
    };
  }

  function open() {
    if (!load()) { pickMode(); return; }
    tab = 'table';
    viewEvent = null;
    showHub();
  }

  const pname = (cid, num) => (club(cid).squad && club(cid).squad[num]) || `#${num}`;
  const goalLine = g => g.og ? `${h(club(g.c).name)}: gol bunuh diri`
    : `${h(pname(g.c, g.s))}${g.a ? ` <small>(assist ${h(pname(g.c, g.a))})</small>` : ''}`;

  // Statistik pemain sepanjang musim (liga): penampilan, rata-rata rating, gol, assist, clean sheet
  function seasonPlayers() {
    const map = new Map();
    const get = (cid, num) => {
      const k = cid + ':' + num;
      if (!map.has(k)) map.set(k, { cid, num, role: ROLE_OF[num], name: pname(cid, num), apps: 0, sum: 0, g: 0, a: 0, cs: 0 });
      return map.get(k);
    };
    for (const ev of save.events) {
      if (ev.type !== 'league') continue;
      for (const m of ev.matches) {
        if (!m.played) continue;
        if (!m.ratings) m.ratings = genRatings(m); // data lama tanpa rating
        for (const [side, cid, conc] of [['h', m.h, m.as], ['a', m.a, m.hs]]) {
          for (const n of NUMS) {
            const r = m.ratings[side] && m.ratings[side][n];
            if (r == null) continue;
            const p = get(cid, n);
            p.apps++; p.sum += r;
            if (conc === 0 && (p.role === 'GK' || p.role === 'DF')) p.cs++;
          }
        }
        for (const g of m.goals || []) {
          if (g.og || g.s == null) continue;
          get(g.c, g.s).g++;
          if (g.a != null) get(g.c, g.a).a++;
        }
      }
    }
    for (const p of map.values()) p.avg = p.apps ? p.sum / p.apps : 0;
    return [...map.values()];
  }

  // Dream Team: rata-rata rating tertinggi per posisi (1 kiper, 2 bek, 2 gelandang, 1 penyerang)
  function dreamTeam() {
    const ps = seasonPlayers().filter(p => p.apps >= 10);
    const best = (role, n) => ps.filter(p => p.role === role).sort((a, b) => b.avg - a.avg || b.g + b.a - (a.g + a.a)).slice(0, n);
    return [...best('GK', 1), ...best('DF', 2), ...best('MF', 2), ...best('FW', 1)]
      .map(p => ({ c: p.cid, num: p.num, role: p.role, name: p.name, avg: Math.round(p.avg * 100) / 100 }));
  }

  // Pemain Terbaik Musim: skor gabungan rating, gol, assist, clean sheet & prestasi tim
  const POTS = { RATING: 10, GOAL: 2, ASSIST: 1.5, CS: 0.8, LEAGUE: 12, CUP: 6, TOP4: 3 };
  function playerOfSeason(table, cupWinner) {
    const champ = table[0].id, top4 = table.slice(0, 4).map(r => r.id);
    const list = seasonPlayers().filter(p => p.apps >= 10).map(p => {
      const lg = p.cid === champ, cup = p.cid === cupWinner, t4 = !lg && top4.includes(p.cid);
      const score = p.avg * POTS.RATING + p.g * POTS.GOAL + p.a * POTS.ASSIST + p.cs * POTS.CS
        + (lg ? POTS.LEAGUE : 0) + (cup ? POTS.CUP : 0) + (t4 ? POTS.TOP4 : 0);
      return { c: p.cid, num: p.num, role: p.role, name: p.name, avg: Math.round(p.avg * 100) / 100,
        g: p.g, a: p.a, cs: p.cs, league: lg, cup, top4: t4, score: Math.round(score * 10) / 10 };
    }).sort((a, b) => b.score - a.score);
    return list[0] || null;
  }
  const ROLE_ID = { GK: 'Kiper', DF: 'Bek', MF: 'Gelandang', FW: 'Penyerang' };
  const potsCard = p => `<div class="pots">
      <div class="pots-t">🏅 Pemain Terbaik Musim</div>
      <div class="pots-n"><span class="club-dot" style="background:${club(p.c).color}"></span><b>${h(p.name)}</b> <small>${h(club(p.c).name)} · ${ROLE_ID[p.role]}</small></div>
      <div class="pots-s">
        <span>Rating <b>${p.avg.toFixed(2)}</b></span><span>Gol <b>${p.g}</b></span><span>Assist <b>${p.a}</b></span>
        <span>G/A <b>${p.g + p.a}</b></span>${p.role === 'GK' || p.role === 'DF' ? `<span>Clean sheet <b>${p.cs}</b></span>` : ''}
        ${p.league ? '<span>🏆 Juara Liga</span>' : ''}${p.cup ? '<span>🥇 Juara Piala</span>' : ''}${p.top4 ? '<span>4 Besar</span>' : ''}
        <span>Skor <b>${p.score}</b></span>
      </div>
    </div>`;
  // Dream Team dalam susunan formasi (kiper - bek - gelandang - penyerang)
  const dreamPitch = list => {
    if (!list || !list.length) return '<p class="muted">Belum ada data.</p>';
    const row = role => `<div class="dt-row">${list.filter(p => p.role === role).map(p => `
      <div class="dt-p"><span class="club-dot" style="background:${club(p.c).color}"></span>
      <b>${h(p.name)}</b><small>${h(club(p.c).name)}</small><span class="rt ${ratingCls(p.avg)}">${p.avg.toFixed(2)}</span></div>`).join('')}</div>`;
    return `<div class="dt">${row('FW')}${row('MF')}${row('DF')}${row('GK')}</div>`;
  };
  const ratingCls = r => r >= 8 ? 'r-top' : r >= 7 ? 'r-good' : r >= 6 ? 'r-ok' : 'r-bad';

  async function showInstant(ev, m) {
    const H = club(m.h), A = club(m.a);
    const side = c => (m.goals || []).filter(g => g.c === c).map(g => `<div>⚽ ${goalLine(g)}</div>`).join('') || '<div class="muted">-</div>';
    showModal(`
      <h2>${eventTitle(ev)}</h2>
      <div class="final">${m.hs} : ${m.as}</div>
      <p><b style="color:${H.color}">${h(H.name)}</b> vs <b style="color:${A.color}">${h(A.name)}</b>${m.ph != null ? ` · pen ${m.ph}-${m.pa}` : ''}</p>
      <div class="scorers"><div>${side(m.h)}</div><div>${side(m.a)}</div></div>
      <h4 class="aw-h">Rating Pemain</h4>
      ${matchRatingTable(m)}
      <div class="btns"><button class="btn primary" id="btnInstOk">Lanjut</button></div>`);
    await new Promise(r => { el('btnInstOk').onclick = r; });
    hideModal();
  }

  function matchRatingTable(m) {
    const list = (cid, side) => NUMS.map(n => ({ id: cid + n, num: n, name: pname(cid, n), role: ROLE_OF[n], r: m.ratings[side][n] }));
    const all = [...list(m.h, 'h'), ...list(m.a, 'a')].sort((a, b) => b.r - a.r);
    return ratingTable({ home: list(m.h, 'h'), away: list(m.a, 'a') }, club(m.h), club(m.a), all[0] && all[0].id);
  }

  // top skor & assist liga musim ini
  function playerStats() {
    const goals = new Map(), assists = new Map();
    const add = (map, cid, num) => { const k = cid + ':' + num; map.set(k, (map.get(k) || 0) + 1); };
    for (const ev of save.events) {
      if (ev.type !== 'league') continue;
      for (const m of ev.matches) for (const g of m.goals || []) {
        if (g.og || g.s == null) continue;
        add(goals, g.c, g.s);
        if (g.a != null) add(assists, g.c, g.a);
      }
    }
    const top = map => [...map.entries()].map(([k, n]) => { const [cid, num] = k.split(':'); return { cid, num: +num, n }; })
      .sort((a, b) => b.n - a.n || pname(a.cid, a.num).localeCompare(pname(b.cid, b.num))).slice(0, 10);
    return { goals: top(goals), assists: top(assists) };
  }

  async function showShootout(m, hs, as, so) {
    const H = club(m.h), A = club(m.a);
    showModal(`
      <h2>Adu Penalti</h2>
      <p>${h(H.name)} ${hs} : ${as} ${h(A.name)}</p>
      <div class="so">
        <div class="so-row"><b>${h(H.name)}</b><span id="soH"></span><em id="soHS">0</em></div>
        <div class="so-row"><b>${h(A.name)}</b><span id="soA"></span><em id="soAS">0</em></div>
      </div>
      <p id="soRes">&nbsp;</p>
      <div class="btns"><button class="btn primary hidden" id="btnSoOk">Lanjut</button></div>`);
    let ph = 0, pa = 0;
    for (const [side, goal] of so.kicks) {
      await wait(650);
      const dot = document.createElement('i');
      dot.className = goal ? 'in' : 'out';
      el(side === 'h' ? 'soH' : 'soA').appendChild(dot);
      if (goal) { if (side === 'h') ph++; else pa++; }
      el('soHS').textContent = ph; el('soAS').textContent = pa;
    }
    const w = so.ph > so.pa ? H : A;
    el('soRes').innerHTML = `<b style="color:${w.color}">${h(w.name)}</b> menang adu penalti ${so.ph}-${so.pa}`;
    el('btnSoOk').classList.remove('hidden');
    await new Promise(r => { el('btnSoOk').onclick = r; });
    hideModal();
  }

  /* ---------- klasemen ---------- */
  function standings() {
    const rows = new Map(save.clubs.map(c => [c.id, { id: c.id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] }]));
    for (const ev of save.events) {
      if (ev.type !== 'league') continue;
      for (const m of ev.matches) {
        if (!m.played) continue;
        const H = rows.get(m.h), A = rows.get(m.a);
        H.p++; A.p++; H.gf += m.hs; H.ga += m.as; A.gf += m.as; A.ga += m.hs;
        if (m.hs > m.as) { H.w++; A.l++; H.pts += 3; H.form.push('M'); A.form.push('K'); }
        else if (m.hs < m.as) { A.w++; H.l++; A.pts += 3; A.form.push('M'); H.form.push('K'); }
        else { H.d++; A.d++; H.pts++; A.pts++; H.form.push('S'); A.form.push('S'); }
      }
    }
    return [...rows.values()].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf
      || club(a.id).name.localeCompare(club(b.id).name));
  }

  /* ---------- tampilan hub ---------- */
  function hideHub() {
    el('hub').classList.add('hidden');
    document.querySelector('.app').classList.remove('hidden');
  }

  const badge = id => `<span class="club-dot" style="background:${club(id).color}"></span>`;
  const nameCell = id => `${badge(id)}<span class="${isMe(id) ? 'me' : ''}">${h(club(id).name)}</span>`;

  function showHub() {
    stopMatch();
    document.querySelector('.app').classList.add('hidden');
    const hub = el('hub');
    hub.classList.remove('hidden');
    const me = save.user ? club(save.user) : null;
    const ev = save.next < save.events.length ? currentEvent() : null;
    const um = userMatch(ev);
    hub.innerHTML = `
      <header class="hub-head">
        <div class="hub-title">
          ${me ? `<span class="club-dot big" style="background:${me.color}"></span>` : '<span class="hub-ic">🤖</span>'}
          <div><h1>${me ? h(me.name) : 'Liga Komputer'}</h1><small>Liga Mini Eropa · Musim ${seasonName(save.year)}${me ? '' : ' · semua laga Hard vs Hard'}</small></div>
        </div>
        <div class="hub-actions">
          ${me ? `<label class="lvl-select">🎚️ Tingkat
            <select id="hubLevel">${LEVELS.map(([k, n]) => `<option value="${k}" ${k === save.difficulty ? 'selected' : ''}>${n}</option>`).join('')}</select>
          </label>` : ''}
          <button class="btn ghost" id="hubMenu">🏠 Menu Utama</button>
        </div>
      </header>
      <section class="next-card">${isCpu() ? cpuCard(ev) : nextCard(ev, um)}</section>
      <nav class="tabs">
        ${[['table', 'Klasemen'], ['fixtures', 'Jadwal & Hasil'], ['stats', 'Statistik Pemain'], ['cup', 'Piala'], ['history', 'Juara & Penghargaan']]
          .map(([k, n]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}
      </nav>
      <section class="tab-body">${tabBody()}</section>`;
    el('hubMenu').onclick = () => showMainMenu();
    if (el('hubLevel')) el('hubLevel').onchange = e => { save.difficulty = e.target.value; persist(); };
    hub.querySelectorAll('[data-watch]').forEach(b => { b.onclick = () => watchMatch(+b.dataset.watch); });
    hub.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { tab = b.dataset.tab; showHub(); }; });
    hub.querySelectorAll('[data-play]').forEach(b => { b.onclick = () => playUserMatch(b.dataset.play); });
    const sim = el('btnSimEvent');
    if (sim) sim.onclick = () => finishEvent();
    const prev = el('evPrev'), next = el('evNext');
    if (prev) prev.onclick = () => { viewEvent = Math.max(0, viewEvent - 1); showHub(); };
    if (next) next.onclick = () => { viewEvent = Math.min(save.events.length - 1, viewEvent + 1); showHub(); };
  }

  function nextCard(ev, um) {
    if (!ev) return `<div class="nc-title">Musim selesai</div>
      <button class="btn primary" id="btnSeasonEnd" onclick="League.endSeason()">Lihat ringkasan musim</button>`;
    const title = `<div class="nc-title">${eventTitle(ev)}</div>`;
    if (!um) return `${title}<p class="nc-sub">${h(club(save.user).name)} tidak bermain di babak ini${ev.type === 'cup' ? ' (sudah tersingkir)' : ''}.</p>
      <div class="nc-actions"><button class="btn primary" id="btnSimEvent">⏭ Simulasikan</button></div>`;
    const H = club(um.h), A = club(um.a);
    return `${title}
      <div class="nc-match">
        <div class="nc-team">${badge(um.h)}<b class="${um.h === save.user ? 'me' : ''}">${h(H.name)}</b><small>Kandang</small></div>
        <div class="nc-vs">VS</div>
        <div class="nc-team">${badge(um.a)}<b class="${um.a === save.user ? 'me' : ''}">${h(A.name)}</b><small>Tandang</small></div>
      </div>
      ${ev.type === 'cup' ? '<p class="nc-sub">Sistem gugur 1 leg. Imbang = adu penalti.</p>' : ''}
      <div class="nc-actions">
        <button class="btn primary" data-play="play">▶ Main</button>
        <button class="btn ghost" data-play="instant">⚡ Hasil Instan</button>
      </div>`;
  }

  // Liga Komputer: daftar laga di babak ini, klik untuk menonton (harus ditonton semua)
  function cpuCard(ev) {
    if (!ev) return `<div class="nc-title">Musim selesai</div>
      <button class="btn primary" onclick="League.endSeason()">Lihat ringkasan musim</button>`;
    const done = ev.matches.filter(m => m.played).length;
    return `<div class="nc-title">${eventTitle(ev)} · ${done}/${ev.matches.length} ditonton</div>
      <p class="nc-sub">Klik pertandingan untuk menonton komputer vs komputer. Babak selesai setelah semua laga ditonton.${ev.type === 'cup' ? ' Imbang = adu penalti.' : ''}</p>
      <div class="cpu-list">${ev.matches.map((m, i) => `
        <div class="cpu-m${m.played ? ' done' : ''}">
          <span class="fx-h">${h(club(m.h).name)} ${badge(m.h)}</span>
          <span class="fx-s">${m.played ? `${m.hs} - ${m.as}${m.ph != null ? `<small> (${m.ph}-${m.pa} p)</small>` : ''}` : 'vs'}</span>
          <span class="fx-a">${badge(m.a)} ${h(club(m.a).name)}</span>
          ${m.played ? '<span class="cpu-ok">✓</span>' : `<button class="btn primary sm" data-watch="${i}">▶ Tonton</button>`}
        </div>`).join('')}</div>`;
  }

  function tabBody() {
    if (tab === 'table') {
      const rows = standings();
      return `<div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>#</th><th class="l">Tim</th><th>Main</th><th>M</th><th>S</th><th>K</th><th>GM</th><th>GK</th><th>SG</th><th>Poin</th><th class="form-h">5 Terakhir</th></tr></thead>
        <tbody>${rows.map((r, i) => `<tr class="${isMe(r.id) ? 'me-row' : ''}${i === 0 ? ' top' : ''}">
          <td>${i + 1}</td><td class="l">${nameCell(r.id)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>
          <td>${r.gf}</td><td>${r.ga}</td><td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td><b>${r.pts}</b></td>
          <td class="form">${r.form.slice(-5).map(f => `<i class="f${f}">${f}</i>`).join('')}</td></tr>`).join('')}</tbody>
      </table></div>`;
    }
    if (tab === 'fixtures') {
      if (viewEvent == null) viewEvent = Math.min(save.next, save.events.length - 1);
      const ev = save.events[viewEvent];
      const list = ev.matches.length ? ev.matches.map(m => `
        <div class="fx ${isMe(m.h) || isMe(m.a) ? 'me-row' : ''}">
          <span class="fx-h">${h(club(m.h).name)} ${badge(m.h)}</span>
          <span class="fx-s">${m.played ? `${m.hs} - ${m.as}` : 'vs'}</span>
          <span class="fx-a">${badge(m.a)} ${h(club(m.a).name)}</span>
          ${m.ph != null ? `<small class="fx-p">pen ${m.ph}-${m.pa}</small>` : ''}
          ${m.goals && m.goals.length ? `<small class="fx-g"><span>${m.goals.filter(g => g.c === m.h).map(goalLine).join(', ')}</span><span>${m.goals.filter(g => g.c === m.a).map(goalLine).join(', ')}</span></small>` : ''}
        </div>`).join('') : '<p class="muted">Pasangan ditentukan setelah babak sebelumnya selesai.</p>';
      return `<div class="ev-nav">
          <button class="btn" id="evPrev" ${viewEvent === 0 ? 'disabled' : ''}>←</button>
          <b>${eventTitle(ev)}</b>
          <button class="btn" id="evNext" ${viewEvent === save.events.length - 1 ? 'disabled' : ''}>→</button>
        </div>${list}`;
    }
    if (tab === 'stats') {
      const st = playerStats();
      const list = (rows, unit) => rows.length ? `<table class="tbl"><tbody>${rows.map((r, i) => `<tr class="${isMe(r.cid) ? 'me-row' : ''}">
          <td>${i + 1}</td><td class="l"><b>${h(pname(r.cid, r.num))}</b></td><td class="l">${nameCell(r.cid)}</td><td><b>${r.n}</b> ${unit}</td></tr>`).join('')}</tbody></table>`
        : '<p class="muted">Belum ada data.</p>';
      // rating rata-rata (minimal tampil di separuh laga yang sudah dimainkan)
      const played = Math.max(...standings().map(r => r.p), 0);
      const rated = seasonPlayers().filter(p => p.apps >= Math.max(1, Math.ceil(played / 2))).sort((a, b) => b.avg - a.avg).slice(0, 10);
      const rtList = rated.length ? `<table class="tbl"><tbody>${rated.map((p, i) => `<tr class="${isMe(p.cid) ? 'me-row' : ''}">
          <td>${i + 1}</td><td class="l"><b>${h(p.name)}</b> <small class="muted">${ROLE_ID[p.role]}</small></td><td class="l">${nameCell(p.cid)}</td>
          <td><span class="rt ${ratingCls(p.avg)}">${p.avg.toFixed(2)}</span></td></tr>`).join('')}</tbody></table>` : '<p class="muted">Belum ada data.</p>';
      return `<div class="stats-grid">
        <div><h4>👟 Top Skor Liga</h4>${list(st.goals, 'gol')}</div>
        <div><h4>🎯 Top Assist Liga</h4>${list(st.assists, 'assist')}</div>
        <div><h4>⭐ Rating Rata-rata Tertinggi</h4>${rtList}</div>
      </div>`;
    }
    if (tab === 'cup') {
      const cols = CUP_ROUNDS.map((name, r) => {
        const ev = save.events.find(e => e.type === 'cup' && e.round === r);
        const ms = ev.matches.length ? ev.matches : Array.from({ length: 8 >> r }, () => null);
        return `<div class="br-col"><h4>${name}</h4><div class="br-list">${ms.map(m => m ? `
          <div class="br-m">
            <div class="${m.winner === m.h ? 'win' : m.played ? 'lose' : ''}">${nameCell(m.h)}<em>${m.played ? m.hs : ''}</em></div>
            <div class="${m.winner === m.a ? 'win' : m.played ? 'lose' : ''}">${nameCell(m.a)}<em>${m.played ? m.as : ''}</em></div>
            ${m.ph != null ? `<small>pen ${m.ph}-${m.pa}</small>` : ''}
          </div>` : '<div class="br-m empty"><div>?</div><div>?</div></div>').join('')}</div></div>`;
      }).join('');
      return `<div class="bracket">${cols}</div>`;
    }
    // riwayat juara
    if (!save.history.length) return '<p class="muted">Belum ada musim yang selesai. Juara liga & piala, Pemain Terbaik, dan Dream Team tiap musim akan tercatat di sini.</p>';
    const me = save.user ? club(save.user) : null;
    const table = `<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th class="l">Musim</th><th class="l">🏆 Juara Liga</th><th class="l">🥇 Juara Piala</th><th class="l">🏅 Pemain Terbaik</th><th class="l">👟 Top Skor</th><th class="l">🎯 Top Assist</th>${me ? `<th>Posisi ${h(me.name)}</th><th class="l">Piala</th>` : ''}</tr></thead>
      <tbody>${save.history.slice().reverse().map(x => `<tr>
        <td class="l">${x.season}</td><td class="l">${nameCell(x.league)}</td><td class="l">${nameCell(x.cup)}</td>
        <td class="l">${x.pots ? `${h(x.pots.name)} <small class="muted">(${h(club(x.pots.c).name)})</small>` : '-'}</td>
        <td class="l">${x.topScorer ? `${h(x.topScorer.name)} (${x.topScorer.n})` : '-'}</td>
        <td class="l">${x.topAssist ? `${h(x.topAssist.name)} (${x.topAssist.n})` : '-'}</td>
        ${me ? `<td>${x.userPos ?? '-'}</td><td class="l">${x.userCup ?? '-'}</td>` : ''}</tr>`).join('')}</tbody>
    </table></div>`;
    const awards = save.history.slice().reverse().filter(x => x.pots || x.dream).map(x => `
      <div class="aw-season"><h4 class="aw-h">Musim ${x.season}</h4>
        ${x.pots ? potsCard(x.pots) : ''}
        ${x.dream ? `<div class="aw-sub">⭐ Dream Team</div>${dreamPitch(x.dream)}` : ''}
      </div>`).join('');
    return table + awards;
  }

  return { hasSave, open, newCareer, hideHub, showHub, endSeason, _debug: () => save };
})();
