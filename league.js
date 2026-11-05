'use strict';

/* =========================================================
   MODE LIGA & PIALA
   - 16 tim, kompetisi kandang-tandang (30 pekan)
   - Piala sistem gugur 1 leg (imbang = adu penalti), berjalan di sela liga
   - Pertandingan tim pemain dimainkan di mesin game (main sendiri / ditonton / hasil instan)
   - Pertandingan lain diundi skornya berdasarkan kekuatan tim
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
  const CUP_ROUNDS = ['Babak 16 Besar', 'Perempat Final', 'Semifinal', 'Final'];
  const CUP_AFTER = [4, 10, 18, 26];   // babak piala dimainkan setelah pekan liga ke-n
  const PEN_SCORE = 0.76;              // peluang gol tiap penalti saat adu penalti

  let save = null;
  let tab = 'table';
  let viewEvent = null; // index event yang ditampilkan di tab Jadwal

  const el = id => document.getElementById(id);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const seasonName = y => `${y}/${y + 1}`;
  const club = id => save.clubs.find(c => c.id === id);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const h = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- simpan / muat ---------- */
  function load() {
    try { save = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { save = null; }
    if (save && save.v !== 1) save = null;
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
    pickTeam();
  }

  function pickTeam() {
    const list = CLUBS.slice().sort((a, b) => b.rating - a.rating);
    showModal(`
      <h2>Pilih Tim</h2>
      <p>Musim ${seasonName(START_YEAR)} · 16 tim · liga kandang-tandang + piala</p>
      <div class="club-grid">
        ${list.map(c => `<button class="club-btn" data-club="${c.id}">
          <span class="club-dot" style="background:${c.color}"></span>
          <b>${h(c.name)}</b><small>${stars(c.rating)}</small></button>`).join('')}
      </div>
      <div class="btns"><button class="btn ghost" id="btnPickBack">← Kembali</button></div>`);
    document.querySelectorAll('[data-club]').forEach(b => {
      b.onclick = () => {
        save = { v: 1, user: b.dataset.club, clubs: CLUBS.map(c => ({ ...c })), history: [] };
        newSeason(START_YEAR);
        persist();
        hideModal();
        tab = 'table';
        viewEvent = null;
        showHub();
      };
    });
    el('btnPickBack').onclick = () => { hideModal(); showMainMenu(); };
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
  function setResult(ev, m, hs, as, so) {
    m.hs = hs; m.as = as; m.played = true;
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
  const userMatch = ev => ev && ev.matches.find(m => m.h === save.user || m.a === save.user);

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
    return { home: { name: H.name, color: H.color }, away: { name: A.name, color: ac } };
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
      finishEvent();
      return;
    }
    const userSide = m.h === save.user ? 'home' : 'away';
    const k = kits(m);
    startMatch({
      ...k,
      bots: how === 'watch' ? ['home', 'away'] : [userSide === 'home' ? 'away' : 'home'],
      knockout: ko,
      label: eventTitle(ev),
      onEnd: async (hs, as) => {
        const so = ko && hs === as ? shootout() : null;
        if (so) await showShootout(m, hs, as, so);
        setResult(ev, m, hs, as, so);
        finishEvent();
      },
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
    const userPos = table.findIndex(r => r.id === save.user) + 1;
    let userCup = 'Babak 16 Besar';
    for (const e of save.events) if (e.type === 'cup' && e.matches.some(m => m.h === save.user || m.a === save.user)) userCup = CUP_ROUNDS[e.round];
    if (final.winner === save.user) userCup = 'Juara';
    const entry = { season: seasonName(save.year), league: table[0].id, cup: final.winner, userPos, userCup };
    if (!save.history.some(x => x.season === entry.season)) save.history.push(entry);
    persist();
    const L = club(entry.league), C = club(entry.cup);
    showModal(`
      <h2>Musim ${entry.season} Selesai</h2>
      <div class="champ-row"><span>🏆 Juara Liga</span><b style="color:${L.color}">${h(L.name)}</b></div>
      <div class="champ-row"><span>🥇 Juara Piala</span><b style="color:${C.color}">${h(C.name)}</b></div>
      <p>${h(club(save.user).name)}: peringkat <b>${userPos}</b> di liga, piala: <b>${userCup}</b>.</p>
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

  function open() {
    if (!load()) { pickTeam(); return; }
    tab = 'table';
    viewEvent = null;
    showHub();
  }

  const badge = id => `<span class="club-dot" style="background:${club(id).color}"></span>`;
  const nameCell = id => `${badge(id)}<span class="${id === save.user ? 'me' : ''}">${h(club(id).name)}</span>`;

  function showHub() {
    stopMatch();
    document.querySelector('.app').classList.add('hidden');
    const hub = el('hub');
    hub.classList.remove('hidden');
    const me = club(save.user);
    const ev = save.next < save.events.length ? currentEvent() : null;
    const um = userMatch(ev);
    hub.innerHTML = `
      <header class="hub-head">
        <div class="hub-title">
          <span class="club-dot big" style="background:${me.color}"></span>
          <div><h1>${h(me.name)}</h1><small>Liga Mini Eropa · Musim ${seasonName(save.year)}</small></div>
        </div>
        <button class="btn ghost" id="hubMenu">🏠 Menu Utama</button>
      </header>
      <section class="next-card">${nextCard(ev, um)}</section>
      <nav class="tabs">
        ${[['table', 'Klasemen'], ['fixtures', 'Jadwal & Hasil'], ['cup', 'Piala'], ['history', 'Juara']]
          .map(([k, n]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}
      </nav>
      <section class="tab-body">${tabBody()}</section>`;
    el('hubMenu').onclick = () => showMainMenu();
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
        <button class="btn" data-play="watch">🤖 Dijalankan Komputer</button>
        <button class="btn ghost" data-play="instant">⚡ Hasil Instan</button>
      </div>`;
  }

  function tabBody() {
    if (tab === 'table') {
      const rows = standings();
      return `<div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>#</th><th class="l">Tim</th><th>Main</th><th>M</th><th>S</th><th>K</th><th>GM</th><th>GK</th><th>SG</th><th>Poin</th><th class="form-h">5 Terakhir</th></tr></thead>
        <tbody>${rows.map((r, i) => `<tr class="${r.id === save.user ? 'me-row' : ''}${i === 0 ? ' top' : ''}">
          <td>${i + 1}</td><td class="l">${nameCell(r.id)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>
          <td>${r.gf}</td><td>${r.ga}</td><td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td><b>${r.pts}</b></td>
          <td class="form">${r.form.slice(-5).map(f => `<i class="f${f}">${f}</i>`).join('')}</td></tr>`).join('')}</tbody>
      </table></div>`;
    }
    if (tab === 'fixtures') {
      if (viewEvent == null) viewEvent = Math.min(save.next, save.events.length - 1);
      const ev = save.events[viewEvent];
      const list = ev.matches.length ? ev.matches.map(m => `
        <div class="fx ${m.h === save.user || m.a === save.user ? 'me-row' : ''}">
          <span class="fx-h">${h(club(m.h).name)} ${badge(m.h)}</span>
          <span class="fx-s">${m.played ? `${m.hs} - ${m.as}` : 'vs'}</span>
          <span class="fx-a">${badge(m.a)} ${h(club(m.a).name)}</span>
          ${m.ph != null ? `<small class="fx-p">pen ${m.ph}-${m.pa}</small>` : ''}
        </div>`).join('') : '<p class="muted">Pasangan ditentukan setelah babak sebelumnya selesai.</p>';
      return `<div class="ev-nav">
          <button class="btn" id="evPrev" ${viewEvent === 0 ? 'disabled' : ''}>←</button>
          <b>${eventTitle(ev)}</b>
          <button class="btn" id="evNext" ${viewEvent === save.events.length - 1 ? 'disabled' : ''}>→</button>
        </div>${list}`;
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
    if (!save.history.length) return '<p class="muted">Belum ada musim yang selesai. Juara liga & piala tiap musim akan tercatat di sini.</p>';
    return `<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th class="l">Musim</th><th class="l">🏆 Juara Liga</th><th class="l">🥇 Juara Piala</th><th>Posisi ${h(club(save.user).name)}</th><th class="l">Piala</th></tr></thead>
      <tbody>${save.history.slice().reverse().map(x => `<tr>
        <td class="l">${x.season}</td><td class="l">${nameCell(x.league)}</td><td class="l">${nameCell(x.cup)}</td>
        <td>${x.userPos}</td><td class="l">${x.userCup}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }

  return { hasSave, open, newCareer, hideHub, showHub, endSeason, _debug: () => save };
})();
