'use strict';
/* =========================================================
   PASANG SEBAGAI APLIKASI (PWA)
   - ikon di layar utama HP, dibuka layar penuh tanpa tampilan browser
   - Android/Chrome: tombol "Pasang" memakai dialog instal bawaan browser
   - iPhone/iPad: petunjuk "Tambah ke Layar Utama" lewat Safari
   ========================================================= */
const PWA = (() => {
  let deferred = null; // event instal dari browser (Android/Chrome/Edge)

  const installed = () => matchMedia('(display-mode: fullscreen)').matches
    || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', () => { deferred = null; });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  async function install(back) {
    if (deferred) {
      deferred.prompt();
      try { await deferred.userChoice; } catch (e) { /* abaikan */ }
      deferred = null;
      back();
      return;
    }
    const steps = isIOS()
      ? `<ol class="pwa-steps">
          <li>Buka halaman ini di <b>Safari</b>.</li>
          <li>Ketuk tombol <b>Bagikan</b> <span class="pwa-ic">⬆️</span> di bawah layar.</li>
          <li>Pilih <b>Tambah ke Layar Utama</b> (Add to Home Screen), lalu <b>Tambah</b>.</li>
        </ol>`
      : `<ol class="pwa-steps">
          <li>Buka halaman ini di <b>Chrome</b>.</li>
          <li>Ketuk menu <b>⋮</b> di kanan atas.</li>
          <li>Pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>, lalu <b>Instal</b>.</li>
        </ol>`;
    showModal(`
      <h2>📲 Pasang di HP</h2>
      <p>Setelah dipasang, ikon <b>Mini Football</b> muncul di layar utama. Ketuk ikonnya untuk bermain layar penuh tanpa membuka browser.</p>
      ${steps}
      <p class="muted pwa-note">Tetap bisa dimainkan tanpa internet setelah dibuka sekali.${isIOS() ? ' Di iPhone, data karier di aplikasi terpisah dari data di Safari.' : ''}</p>
      <div class="btns"><button class="btn primary" id="btnPwaBack">Kembali</button></div>`);
    document.getElementById('btnPwaBack').onclick = back;
  }

  return { installed, install };
})();
