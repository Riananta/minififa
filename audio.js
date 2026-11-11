'use strict';

/* =========================================================
   SUARA: musik latar & efek suara, semuanya disintesis dengan Web Audio API
   (tanpa file audio dari luar). Musik = lagu orisinal bergaya anthem stadion.
   Browser hanya mengizinkan suara setelah interaksi pertama (klik / tombol).
   ========================================================= */
const Sound = (() => {
  const KEY = 'minififa.audio';
  const prefs = { music: true, sfx: true };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* abaikan */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* abaikan */ } };

  const MUSIC_VOL = 0.3, SFX_VOL = 0.7, CROWD_VOL = 0.05;
  let ctx = null, master, musicBus, sfxBus, crowdBus, noiseBuf;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 1;
    const comp = ctx.createDynamicsCompressor(); // cegah suara pecah saat banyak efek bersamaan
    master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = prefs.music ? MUSIC_VOL : 0; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = prefs.sfx ? SFX_VOL : 0; sfxBus.connect(master);
    crowdBus = ctx.createGain(); crowdBus.gain.value = 0; crowdBus.connect(sfxBus);
    // 2 detik white noise untuk drum, peluit, penonton
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startCrowd();
    if (prefs.music) startMusic();
    updateButtons();
  }

  /* ---------- blok penyusun ---------- */
  function tone(freq, t, dur, { type = 'sine', vol = 0.3, attack = 0.005, dest = sfxBus, to = null, detune = 0 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function noise(t, dur, { freq = 1000, q = 1, type = 'bandpass', vol = 0.3, attack = 0.005, dest = sfxBus, to = null } = {}) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  // peluit wasit: nada tinggi bergetar
  function whistle(t, dur, vol = 0.26) {
    const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 2650;
    lfo.frequency.value = 32; lg.gain.value = 90; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.setValueAtTime(vol, t + dur - 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxBus);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
    noise(t, dur, { freq: 2650, q: 6, vol: vol * 0.25 });
  }
  // sorak penonton (naik lalu turun)
  function cheer(t, dur, vol = 0.35) {
    noise(t, dur, { freq: 900, q: 0.6, vol, attack: 0.25 });
    noise(t + 0.05, dur * 0.9, { freq: 2200, q: 0.8, vol: vol * 0.5, attack: 0.3 });
  }

  /* ---------- efek suara ---------- */
  const SFX = {
    kick(t, power = 0.5) {
      tone(140 + 40 * power, t, 0.14, { to: 45, vol: 0.45 + 0.35 * power });
      noise(t, 0.04, { freq: 1800, type: 'lowpass', vol: 0.3 + 0.2 * power });
    },
    shot(t) { SFX.kick(t, 1); noise(t + 0.02, 0.25, { freq: 3000, to: 900, q: 0.7, vol: 0.12 }); },
    chip(t) { noise(t, 0.35, { freq: 600, to: 2400, q: 1.5, vol: 0.4 }); tone(400, t, 0.3, { to: 900, type: 'triangle', vol: 0.08 }); },
    save(t) {
      tone(110, t, 0.12, { to: 60, vol: 0.5 });
      noise(t + 0.08, 0.9, { freq: 700, to: 350, q: 0.8, vol: 0.22, attack: 0.15 }); // "uuuh" penonton
    },
    block(t) { tone(180, t, 0.1, { to: 70, vol: 0.45 }); noise(t, 0.05, { freq: 900, type: 'lowpass', vol: 0.25 }); },
    intercept(t) { SFX.block(t); },
    tackle(t) { noise(t, 0.18, { freq: 500, to: 1800, q: 1, vol: 0.2 }); tone(120, t + 0.12, 0.1, { to: 60, vol: 0.4 }); },
    dodge(t) { noise(t, 0.3, { freq: 2500, to: 600, q: 1.2, vol: 0.45 }); tone(300, t + 0.05, 0.15, { to: 500, type: 'triangle', vol: 0.1 }); },
    short(t) { tone(90, t, 0.18, { to: 50, vol: 0.25 }); },
    whistle(t) { whistle(t, 0.45); },
    foul(t) { whistle(t, 0.18); whistle(t + 0.25, 0.18); },
    halftime(t) { whistle(t, 0.5); whistle(t + 0.65, 0.9); },
    fulltime(t) { whistle(t, 0.3); whistle(t + 0.42, 0.3); whistle(t + 0.84, 1.1); cheer(t + 0.9, 2.5, 0.25); },
    goal(t) {
      noise(t, 0.25, { freq: 4000, type: 'highpass', vol: 0.18 }); // bola menyentuh jaring
      cheer(t + 0.05, 3.2, 0.45);
      // terompet stadion
      for (const [f, dt] of [[392, 0.25], [392, 0.55], [523, 0.85]]) {
        tone(f, t + dt, 0.28, { type: 'sawtooth', vol: 0.12, attack: 0.02 });
        tone(f * 1.25, t + dt, 0.28, { type: 'sawtooth', vol: 0.08, attack: 0.02 });
      }
      duckMusic(t, 3.5);
    },
    card(t) { whistle(t, 0.7); noise(t + 0.4, 1.1, { freq: 300, q: 0.7, vol: 0.2, attack: 0.2 }); },
    penalty(t) { whistle(t, 0.9); },
    coin(t) { tone(1760, t, 0.6, { vol: 0.15 }); tone(2637, t, 0.4, { vol: 0.07 }); },
    click(t) { tone(900, t, 0.04, { type: 'triangle', vol: 0.06 }); },
    penGoal(t) { SFX.kick(t, 0.8); cheer(t + 0.1, 1.2, 0.25); },
    penMiss(t) { SFX.kick(t, 0.8); noise(t + 0.15, 0.9, { freq: 450, to: 250, q: 0.8, vol: 0.2, attack: 0.1 }); },
  };
  function play(name, arg) {
    if (!ctx || !prefs.sfx || !SFX[name]) return;
    try { SFX[name](ctx.currentTime + 0.01, arg); } catch (e) { /* jangan ganggu permainan */ }
  }

  /* ---------- suasana penonton selama pertandingan ---------- */
  function startCrowd() {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 0.5;
    lfo.frequency.value = 0.15; lg.gain.value = 150; lfo.connect(lg); lg.connect(f.frequency);
    s.connect(f); f.connect(crowdBus); s.start(); lfo.start();
  }
  let crowdOn = false;
  function crowd(on) {
    if (!ctx || on === crowdOn) return;
    crowdOn = on;
    crowdBus.gain.setTargetAtTime(on ? CROWD_VOL : 0, ctx.currentTime, 0.6);
  }

  /* ---------- musik latar (lagu orisinal) ---------- */
  const BPM = 116, STEP = 60 / BPM / 4;
  // 8 birama: C - G - Am - F - Dm - G - C - G (frekuensi akar, oktaf rendah)
  const N = { C: 130.81, D: 146.83, E: 164.81, F: 174.61, G: 196.0, A: 220.0, B: 246.94 };
  const CHORDS = [
    [N.C, N.E, N.G], [N.G, N.B, N.D * 2], [N.A, N.C * 2, N.E * 2], [N.F, N.A, N.C * 2],
    [N.D, N.F, N.A], [N.G, N.B, N.D * 2], [N.C, N.E, N.G], [N.G, N.B, N.D * 2],
  ];
  // motif melodi (indeks nada akord; 3 = nada akord pertama satu oktaf di atas, -1 = diam)
  const MELODY = [
    [0, -1, 2, -1, 3, -1, 2, 1, 0, -1, 1, 2, 3, -1, -1, -1],
    [2, -1, 1, -1, 0, -1, 1, 2, 3, -1, 2, -1, 1, -1, -1, -1],
  ];
  let musicTimer = null, nextTime = 0, step = 0;
  function scheduleStep(t, i) {
    const bar = Math.floor(i / 16) % CHORDS.length, s = i % 16, ch = CHORDS[bar];
    const drum = musicBus;
    // drum
    if (s === 0 || s === 8 || (s === 10 && bar % 2)) tone(120, t, 0.2, { to: 40, vol: 0.55, dest: drum });
    if (s === 4 || s === 12) { noise(t, 0.16, { freq: 1800, q: 0.7, vol: 0.28, dest: drum }); tone(200, t, 0.08, { to: 120, vol: 0.15, dest: drum }); }
    if (s % 2 === 0) noise(t, 0.04, { freq: 8000, type: 'highpass', vol: s % 4 === 2 ? 0.09 : 0.05, dest: drum });
    // bass
    if (s % 2 === 0) {
      const f = (s === 6 || s === 14) ? ch[2] / 2 : ch[0] / 2;
      tone(f, t, STEP * 1.8, { type: 'triangle', vol: 0.35, attack: 0.01, dest: musicBus });
    }
    // akord (pad) di awal birama
    if (s === 0) for (const f of ch) {
      tone(f * 2, t, STEP * 15, { type: 'triangle', vol: 0.05, attack: 0.08, dest: musicBus });
      tone(f * 2, t, STEP * 15, { type: 'sawtooth', vol: 0.015, attack: 0.1, dest: musicBus, detune: 7 });
    }
    // melodi
    const m = MELODY[bar % 2][s];
    if (m >= 0) {
      const f = (m >= 3 ? ch[m - 3] * 2 : ch[m]) * 4;
      tone(f, t, STEP * 1.6, { type: 'square', vol: 0.045, attack: 0.01, dest: musicBus });
      tone(f, t, STEP * 1.6, { type: 'triangle', vol: 0.05, attack: 0.01, dest: musicBus });
    }
  }
  function startMusic() {
    if (!ctx || musicTimer) return;
    nextTime = ctx.currentTime + 0.1; step = 0;
    musicTimer = setInterval(() => {
      while (nextTime < ctx.currentTime + 0.2) { scheduleStep(nextTime, step); nextTime += STEP; step++; }
    }, 40);
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
  // kecilkan musik sebentar (mis. saat gol) supaya sorak penonton terdengar
  function duckMusic(t, dur) {
    if (!prefs.music) return;
    musicBus.gain.setTargetAtTime(MUSIC_VOL * 0.25, t, 0.1);
    musicBus.gain.setTargetAtTime(MUSIC_VOL, t + dur, 0.5);
  }

  /* ---------- pengaturan & tombol ---------- */
  function setMusic(on) {
    prefs.music = on; save();
    if (ctx) {
      musicBus.gain.setTargetAtTime(on ? MUSIC_VOL : 0, ctx.currentTime, 0.1);
      if (on) startMusic(); else setTimeout(() => { if (!prefs.music) stopMusic(); }, 400);
    }
    updateButtons();
  }
  function setSfx(on) {
    prefs.sfx = on; save();
    if (ctx) sfxBus.gain.setTargetAtTime(on ? SFX_VOL : 0, ctx.currentTime, 0.05);
    updateButtons();
  }
  function updateButtons() {
    const m = document.getElementById('btnMusic'), s = document.getElementById('btnSfx');
    if (m) { m.textContent = '🎵'; m.classList.toggle('off', !prefs.music); m.title = prefs.music ? 'Matikan musik' : 'Nyalakan musik'; }
    if (s) { s.textContent = prefs.sfx ? '🔊' : '🔇'; s.classList.toggle('off', !prefs.sfx); s.title = prefs.sfx ? 'Matikan efek suara' : 'Nyalakan efek suara'; }
  }
  function mountButtons() {
    const box = document.createElement('div');
    box.className = 'audio-ctl';
    box.innerHTML = '<button id="btnMusic" type="button"></button><button id="btnSfx" type="button"></button>';
    document.body.appendChild(box);
    document.getElementById('btnMusic').onclick = () => { init(); setMusic(!prefs.music); };
    document.getElementById('btnSfx').onclick = () => { init(); setSfx(!prefs.sfx); };
    updateButtons();
  }
  // suara aktif setelah interaksi pertama
  const unlock = () => { init(); window.removeEventListener('pointerdown', unlock, true); window.removeEventListener('keydown', unlock, true); };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountButtons); else mountButtons();

  // Render offline (untuk pengujian / pratinjau): fn menerima { sfx, music(step, t), STEP }
  async function renderOffline(seconds, fn) {
    const saved = { ctx, master, musicBus, sfxBus, crowdBus, noiseBuf };
    const off = new OfflineAudioContext(1, Math.ceil(44100 * seconds), 44100);
    try {
      ctx = off;
      master = off.createGain(); master.connect(off.destination);
      musicBus = off.createGain(); musicBus.gain.value = MUSIC_VOL; musicBus.connect(master);
      sfxBus = off.createGain(); sfxBus.gain.value = SFX_VOL; sfxBus.connect(master);
      crowdBus = off.createGain(); crowdBus.gain.value = 0; crowdBus.connect(sfxBus);
      noiseBuf = off.createBuffer(1, 44100 * 2, 44100);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      fn({ sfx: SFX, music: (i, t) => scheduleStep(t, i), STEP });
      return await off.startRendering();
    } finally {
      ({ ctx, master, musicBus, sfxBus, crowdBus, noiseBuf } = saved);
    }
  }

  return { play, crowd, setMusic, setSfx, prefs, _ctx: () => ctx, _render: renderOffline };
})();
