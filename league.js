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
  // Divisi 2 (Championship) — liga Main Sendiri
  const CLUBS2 = [
    { id: 'tot', name: 'Tottenham', color: '#f8fafc', alt: '#1e3a8a', rating: 80 },
    { id: 'nfc', name: 'Newcastle', color: '#111827', alt: '#f1f5f9', rating: 80 },
    { id: 'avl', name: 'Aston Villa', color: '#7c2d4a', alt: '#7dd3fc', rating: 80 },
    { id: 'rom', name: 'AS Roma', color: '#8b1a1a', alt: '#f59e0b', rating: 80 },
    { id: 'ata', name: 'Atalanta', color: '#1e3a8a', alt: '#111827', rating: 80 },
    { id: 'laz', name: 'Lazio', color: '#7dd3fc', alt: '#f1f5f9', rating: 80 },
    { id: 'rso', name: 'Real Sociedad', color: '#2563eb', alt: '#f1f5f9', rating: 80 },
    { id: 'ath', name: 'Athletic Club', color: '#dc2626', alt: '#f1f5f9', rating: 80 },
    { id: 'vil', name: 'Villarreal', color: '#facc15', alt: '#1e3a8a', rating: 80 },
    { id: 'ben', name: 'Benfica', color: '#e11d48', alt: '#f1f5f9', rating: 80 },
    { id: 'por', name: 'FC Porto', color: '#1d4ed8', alt: '#f1f5f9', rating: 80 },
    { id: 'scp', name: 'Sporting CP', color: '#16a34a', alt: '#f1f5f9', rating: 80 },
    { id: 'aja', name: 'Ajax', color: '#f1f5f9', alt: '#dc2626', rating: 80 },
    { id: 'psv', name: 'PSV', color: '#ef4444', alt: '#f1f5f9', rating: 80 },
    { id: 'com', name: 'Como', color: '#0c4a9e', alt: '#f1f5f9', rating: 80 },
    { id: 'rbl', name: 'RB Leipzig', color: '#be123c', alt: '#f1f5f9', rating: 80 },
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
    tot: { 1: 'Vicario', 2: 'Cristian Romero', 4: 'Van de Ven', 7: 'Xavi Simons', 11: 'Kudus', 9: 'Solanke' },
    nfc: { 1: 'Pope', 2: 'Botman', 4: 'Livramento', 7: 'Bruno Guimarães', 11: 'Tonali', 9: 'Woltemade' },
    avl: { 1: 'Emiliano Martínez', 2: 'Konsa', 4: 'Pau Torres', 7: 'Tielemans', 11: 'Morgan Rogers', 9: 'Ollie Watkins' },
    rom: { 1: 'Svilar', 2: 'Gianluca Mancini', 4: 'Ndicka', 7: 'Manu Koné', 11: 'Dybala', 9: 'Dovbyk' },
    ata: { 1: 'Carnesecchi', 2: 'Isak Hien', 4: 'Bellanova', 7: 'De Ketelaere', 11: 'Lookman', 9: 'Scamacca' },
    laz: { 1: 'Provedel', 2: 'Romagnoli', 4: 'Mario Gila', 7: 'Rovella', 11: 'Zaccagni', 9: 'Castellanos' },
    rso: { 1: 'Remiro', 2: 'Zubeldia', 4: 'Aihen Muñoz', 7: 'Kubo', 11: 'Brais Méndez', 9: 'Oyarzabal' },
    ath: { 1: 'Unai Simón', 2: 'Dani Vivian', 4: 'Laporte', 7: 'Sancet', 11: 'Berenguer', 9: 'Nico Williams' },
    vil: { 1: 'Luiz Júnior', 2: 'Foyth', 4: 'Renato Veiga', 7: 'Parejo', 11: 'Pépé', 9: 'Gerard Moreno' },
    ben: { 1: 'Trubin', 2: 'António Silva', 4: 'Otamendi', 7: 'Aursnes', 11: 'Sudakov', 9: 'Pavlidis' },
    por: { 1: 'Diogo Costa', 2: 'Bednarek', 4: 'Alberto Costa', 7: 'Alan Varela', 11: 'Gabri Veiga', 9: 'Samu Omorodion' },
    scp: { 1: 'Rui Silva', 2: 'Gonçalo Inácio', 4: 'Diomande', 7: 'Hjulmand', 11: 'Trincão', 9: 'Luis Javier Suárez' },
    aja: { 1: 'Jaroš', 2: 'Youri Baas', 4: 'Šutalo', 7: 'Kenneth Taylor', 11: 'Klaassen', 9: 'Weghorst' },
    psv: { 1: 'Kovář', 2: 'Dest', 4: 'Flamingo', 7: 'Guus Til', 11: 'Perišić', 9: 'Ricardo Pepi' },
    com: { 1: 'Butez', 2: 'Kempf', 4: 'Jacobo Ramón', 7: 'Perrone', 11: 'Caqueret', 9: 'Douvikas' },
    rbl: { 1: 'Gulácsi', 2: 'Lukeba', 4: 'Raum', 7: 'Schlager', 11: 'Baumgartner', 9: 'Yan Diomande' },
  };
  // Tier pemain (S/A/B/C) relatif terhadap sesama 96 pemain ini, sesuai kualitas nyata (s.d. pertengahan 2026)
  // urutan nomor: 1 kiper, 2 & 4 bek, 7 & 11 gelandang, 9 penyerang
  const TIERS = {
    rma: { 1: 'S', 2: 'A', 4: 'A', 7: 'A', 11: 'S', 9: 'S' },
    mci: { 1: 'S', 2: 'A', 4: 'A', 7: 'S', 11: 'A', 9: 'S' },
    liv: { 1: 'S', 2: 'A', 4: 'A', 7: 'A', 11: 'S', 9: 'S' },
    ars: { 1: 'S', 2: 'S', 4: 'A', 7: 'A', 11: 'S', 9: 'A' },
    bay: { 1: 'A', 2: 'A', 4: 'A', 7: 'S', 11: 'S', 9: 'S' },
    bar: { 1: 'A', 2: 'A', 4: 'A', 7: 'S', 11: 'S', 9: 'S' },
    psg: { 1: 'B', 2: 'S', 4: 'A', 7: 'S', 11: 'S', 9: 'S' },
    int: { 1: 'B', 2: 'A', 4: 'A', 7: 'A', 11: 'A', 9: 'A' },
    atm: { 1: 'A', 2: 'B', 4: 'B', 7: 'A', 11: 'B', 9: 'A' },
    che: { 1: 'B', 2: 'A', 4: 'B', 7: 'A', 11: 'A', 9: 'A' },
    lev: { 1: 'B', 2: 'A', 4: 'B', 7: 'B', 11: 'C', 9: 'B' },
    nap: { 1: 'B', 2: 'B', 4: 'B', 7: 'A', 11: 'A', 9: 'B' },
    juv: { 1: 'B', 2: 'B', 4: 'A', 7: 'A', 11: 'B', 9: 'B' },
    bvb: { 1: 'A', 2: 'B', 4: 'A', 7: 'B', 11: 'B', 9: 'A' },
    mun: { 1: 'C', 2: 'B', 4: 'B', 7: 'A', 11: 'B', 9: 'B' },
    acm: { 1: 'A', 2: 'B', 4: 'C', 7: 'A', 11: 'A', 9: 'A' },
    tot: { 1: 'B', 2: 'A', 4: 'A', 7: 'A', 11: 'B', 9: 'B' },
    nfc: { 1: 'B', 2: 'B', 4: 'B', 7: 'A', 11: 'A', 9: 'B' },
    avl: { 1: 'S', 2: 'B', 4: 'B', 7: 'B', 11: 'A', 9: 'A' },
    rom: { 1: 'B', 2: 'B', 4: 'B', 7: 'B', 11: 'B', 9: 'B' },
    ata: { 1: 'B', 2: 'B', 4: 'B', 7: 'B', 11: 'A', 9: 'B' },
    laz: { 1: 'B', 2: 'B', 4: 'B', 7: 'B', 11: 'B', 9: 'B' },
    rso: { 1: 'B', 2: 'B', 4: 'C', 7: 'A', 11: 'B', 9: 'A' },
    ath: { 1: 'A', 2: 'B', 4: 'B', 7: 'B', 11: 'B', 9: 'A' },
    vil: { 1: 'C', 2: 'B', 4: 'B', 7: 'C', 11: 'B', 9: 'B' },
    ben: { 1: 'B', 2: 'B', 4: 'C', 7: 'B', 11: 'B', 9: 'B' },
    por: { 1: 'A', 2: 'B', 4: 'C', 7: 'B', 11: 'B', 9: 'B' },
    scp: { 1: 'B', 2: 'A', 4: 'B', 7: 'B', 11: 'B', 9: 'B' },
    aja: { 1: 'C', 2: 'B', 4: 'B', 7: 'B', 11: 'C', 9: 'C' },
    psv: { 1: 'C', 2: 'B', 4: 'B', 7: 'B', 11: 'B', 9: 'B' },
    com: { 1: 'B', 2: 'B', 4: 'B', 7: 'B', 11: 'B', 9: 'B' },
    rbl: { 1: 'C', 2: 'B', 4: 'B', 7: 'B', 11: 'B', 9: 'B' },
  };
  // Ciri khusus: fin = Finisher (Tembak), pas = Pengumpan (Oper), dri = Dribbler (Kontrol), wal = Tembok (Bertahan)
  const TRAIT_DATA = {
    rma: { 2: ['pas'], 11: ['fin'], 9: ['fin', 'dri'] },
    mci: { 2: ['wal'], 7: ['pas'], 9: ['fin'] },
    liv: { 2: ['dri'], 4: ['wal'], 7: ['fin'], 11: ['pas', 'dri'], 9: ['fin'] },
    ars: { 2: ['wal'], 4: ['wal'], 7: ['dri'], 11: ['pas'], 9: ['fin'] },
    bay: { 4: ['wal'], 7: ['dri', 'pas'], 11: ['pas'], 9: ['fin', 'pas'] },
    bar: { 7: ['dri', 'pas'], 11: ['pas'], 9: ['fin'] },
    psg: { 2: ['dri'], 4: ['wal'], 7: ['pas'], 11: ['dri'], 9: ['fin', 'dri'] },
    int: { 2: ['pas'], 4: ['wal'], 11: ['pas'], 9: ['fin'] },
    atm: { 4: ['wal'], 7: ['pas'], 9: ['fin'] },
    che: { 7: ['fin', 'pas'], 11: ['pas'] },
    lev: { 2: ['pas'], 7: ['pas'], 9: ['fin'] },
    nap: { 4: ['wal'], 7: ['fin'], 11: ['pas'] },
    juv: { 4: ['wal'], 7: ['dri'], 9: ['fin'] },
    bvb: { 7: ['dri'], 9: ['fin'] },
    mun: { 7: ['pas'], 11: ['dri'] },
    acm: { 11: ['pas'], 9: ['dri'] },
    tot: { 2: ['wal'], 4: ['dri'], 7: ['dri'], 11: ['dri'] },
    nfc: { 2: ['wal'], 7: ['pas'] },
    avl: { 4: ['pas'], 7: ['pas'], 11: ['dri'], 9: ['fin'] },
    rom: { 2: ['wal'], 11: ['pas'] },
    ata: { 2: ['wal'], 4: ['dri'], 7: ['pas'], 11: ['dri'] },
    laz: { 7: ['pas'], 11: ['dri'] },
    rso: { 7: ['dri'], 11: ['pas'], 9: ['fin'] },
    ath: { 2: ['wal'], 4: ['pas'], 9: ['dri'] },
    vil: { 7: ['pas'], 11: ['dri'], 9: ['fin'] },
    ben: { 4: ['wal'], 11: ['pas'], 9: ['fin'] },
    por: { 11: ['pas'] },
    scp: { 2: ['pas'], 4: ['wal'], 11: ['dri'], 9: ['fin'] },
    aja: {  },
    psv: { 2: ['dri'], 11: ['pas'] },
    com: { 2: ['wal'], 7: ['pas'], 9: ['fin'] },
    rbl: { 4: ['pas'], 9: ['dri'] },
  };
  // Pemain toko (pasar transfer) untuk liga Main Sendiri: [nama, posisi, tier, umur, ciri, potensi]
  // potensi (tersembunyi): '' biasa, 'T' tinggi, 'ST' sangat tinggi. Umur = awal musim 2026/27.
  const SHOP_DATA = [
    // kiper
    ['Ter Stegen', 'GK', 'A', 34, [], ''], ['Ederson', 'GK', 'A', 33, [], ''], ['Onana', 'GK', 'B', 30, [], ''],
    ['Pickford', 'GK', 'B', 32, [], ''], ['Szczęsny', 'GK', 'B', 36, [], ''], ['Mamardashvili', 'GK', 'B', 26, [], ''],
    ['Verbruggen', 'GK', 'B', 24, [], 'T'], ['Dean Henderson', 'GK', 'B', 29, [], ''], ['Safonov', 'GK', 'B', 27, [], ''],
    ['Bounou', 'GK', 'B', 35, [], ''], ['Matz Sels', 'GK', 'B', 34, [], ''], ['Bułka', 'GK', 'B', 29, [], ''],
    ['Lunin', 'GK', 'C', 27, [], ''], ['Kepa', 'GK', 'C', 32, [], ''], ['Filip Jørgensen', 'GK', 'C', 24, [], ''],
    ['Ramsdale', 'GK', 'C', 28, [], ''], ['Leno', 'GK', 'C', 34, [], ''], ['Đorđe Petrović', 'GK', 'C', 26, [], ''],
    // bek
    ['Nuno Mendes', 'DF', 'S', 24, ['dri'], ''], ['Rüdiger', 'DF', 'A', 33, ['wal'], ''], ['Militão', 'DF', 'A', 28, [], ''],
    ['Theo Hernández', 'DF', 'A', 29, ['dri'], ''], ['Alphonso Davies', 'DF', 'A', 26, ['dri'], ''], ['Araujo', 'DF', 'A', 27, ['wal'], ''],
    ['Akanji', 'DF', 'A', 31, [], ''], ['Konaté', 'DF', 'A', 27, ['wal'], ''], ['Timber', 'DF', 'A', 25, [], ''],
    ['Pacho', 'DF', 'A', 25, ['wal'], ''], ['Tah', 'DF', 'A', 30, [], ''], ['Hincapié', 'DF', 'A', 24, [], ''],
    ['Cucurella', 'DF', 'A', 28, [], ''], ['Dumfries', 'DF', 'A', 30, [], ''], ['Guéhi', 'DF', 'A', 26, [], ''],
    ['Pedro Porro', 'DF', 'A', 27, ['pas'], ''], ['Carvajal', 'DF', 'B', 34, [], ''], ['Balde', 'DF', 'B', 23, [], ''],
    ['Robertson', 'DF', 'B', 32, ['pas'], ''], ['Lisandro Martínez', 'DF', 'B', 28, [], ''], ['Calafiori', 'DF', 'B', 24, [], ''],
    ['Pavard', 'DF', 'B', 30, [], ''], ['Gatti', 'DF', 'B', 28, [], ''], ['Rrahmani', 'DF', 'B', 32, [], ''],
    ['Mazraoui', 'DF', 'B', 29, [], ''], ['Jorrel Hato', 'DF', 'B', 20, [], 'ST'], ['Lewis-Skelly', 'DF', 'B', 19, [], 'T'],
    ['Udogie', 'DF', 'B', 23, [], ''], ['Aké', 'DF', 'B', 31, [], ''], ['Stones', 'DF', 'B', 32, [], ''],
    ['Hiroki Ito', 'DF', 'B', 27, [], ''], ['Guerreiro', 'DF', 'B', 32, [], ''], ['Lucas Hernández', 'DF', 'B', 30, [], ''],
    ['Zabarnyi', 'DF', 'B', 24, [], ''], ['Ferland Mendy', 'DF', 'B', 31, [], ''], ['Álvaro Carreras', 'DF', 'B', 23, [], 'T'],
    ['Christensen', 'DF', 'B', 30, [], ''], ['Eric García', 'DF', 'B', 25, [], ''], ['Van Hecke', 'DF', 'B', 26, [], ''],
    ['Stanišić', 'DF', 'B', 26, [], ''], ['Waldemar Anton', 'DF', 'B', 29, [], ''], ['Thiaw', 'DF', 'B', 25, [], ''],
    ['Kalulu', 'DF', 'B', 26, [], ''], ['Ben White', 'DF', 'B', 29, [], ''], ['Gusto', 'DF', 'B', 23, [], ''],
    ['Chalobah', 'DF', 'B', 27, [], ''], ['Dorgu', 'DF', 'B', 22, [], 'T'], ['Branthwaite', 'DF', 'B', 24, [], ''],
    ['Kerkez', 'DF', 'B', 23, [], ''], ['Aït-Nouri', 'DF', 'B', 25, [], ''], ['Murillo', 'DF', 'B', 24, [], ''],
    ['Nathan Collins', 'DF', 'B', 25, [], ''], ['Antonee Robinson', 'DF', 'B', 29, [], ''], ['Leny Yoro', 'DF', 'C', 20, [], 'ST'],
    ['Kyle Walker', 'DF', 'C', 36, [], ''], ['Lucas Beraldo', 'DF', 'C', 22, [], ''], ['Raúl Asencio', 'DF', 'C', 23, [], ''],
    ['Gerard Martín', 'DF', 'C', 24, [], ''], ['Ayden Heaven', 'DF', 'C', 20, [], 'T'],
    // gelandang
    ['Vinícius Jr', 'MF', 'S', 26, ['dri'], ''], ['Musiala', 'MF', 'S', 23, ['dri'], ''], ['Ødegaard', 'MF', 'S', 28, ['pas'], ''],
    ['Mac Allister', 'MF', 'S', 28, ['pas'], ''], ['Caicedo', 'MF', 'S', 25, [], ''], ['João Neves', 'MF', 'S', 22, [], ''],
    ['Frenkie de Jong', 'MF', 'S', 29, ['pas'], ''], ['Messi', 'MF', 'A', 39, ['pas', 'dri'], ''], ['Neymar', 'MF', 'A', 34, ['dri'], ''],
    ['Gavi', 'MF', 'A', 22, [], ''], ['Fermín López', 'MF', 'A', 23, [], ''], ['Dani Olmo', 'MF', 'A', 28, [], ''],
    ['Camavinga', 'MF', 'A', 24, [], ''], ['Tchouaméni', 'MF', 'A', 26, [], ''], ['Arda Güler', 'MF', 'A', 21, ['pas'], 'ST'],
    ['Rodrygo', 'MF', 'A', 25, ['dri'], ''], ['Bernardo Silva', 'MF', 'A', 32, ['pas'], ''], ['Foden', 'MF', 'A', 26, [], ''],
    ['Doku', 'MF', 'A', 24, ['dri'], ''], ['Szoboszlai', 'MF', 'A', 26, [], ''], ['Gravenberch', 'MF', 'A', 24, [], ''],
    ['Désiré Doué', 'MF', 'A', 21, ['dri'], 'ST'], ['Mbeumo', 'MF', 'A', 27, [], ''], ['Zubimendi', 'MF', 'A', 27, ['pas'], ''],
    ['Merino', 'MF', 'A', 30, [], ''], ['Kulusevski', 'MF', 'A', 26, [], ''], ['Barcola', 'MF', 'A', 24, ['dri'], ''],
    ['Aleksandar Pavlović', 'MF', 'A', 22, ['pas'], 'T'], ['Eze', 'MF', 'A', 28, ['dri'], ''], ['Martinelli', 'MF', 'B', 25, [], ''],
    ['Trossard', 'MF', 'B', 32, [], ''], ['Gnabry', 'MF', 'B', 31, [], ''], ['Fabián Ruiz', 'MF', 'B', 30, [], ''],
    ['Zaïre-Emery', 'MF', 'B', 20, [], 'T'], ['Mount', 'MF', 'B', 27, [], ''], ['Mainoo', 'MF', 'B', 21, [], 'T'],
    ['Frattesi', 'MF', 'B', 27, [], ''], ['Nico Paz', 'MF', 'B', 22, ['pas'], 'ST'], ['Estêvão', 'MF', 'B', 19, ['dri'], 'ST'],
    ['Franco Mastantuono', 'MF', 'B', 19, [], 'ST'], ['Savinho', 'MF', 'B', 22, ['dri'], 'T'], ['Ethan Nwaneri', 'MF', 'B', 19, [], 'T'],
    ['Lucas Bergvall', 'MF', 'B', 20, [], 'T'], ['Rico Lewis', 'MF', 'B', 21, [], ''], ['Adam Wharton', 'MF', 'B', 22, ['pas'], 'T'],
    ['Carlos Baleba', 'MF', 'B', 22, [], 'T'], ['Jamie Gittens', 'MF', 'B', 22, ['dri'], 'T'], ['Ben Seghir', 'MF', 'B', 21, [], ''],
    ['El Khannouss', 'MF', 'B', 22, [], ''], ['Kovačić', 'MF', 'B', 32, [], ''], ['Sané', 'MF', 'B', 30, [], ''],
    ['Coman', 'MF', 'B', 30, [], ''], ['Goretzka', 'MF', 'B', 31, [], ''], ['Koopmeiners', 'MF', 'B', 28, [], ''],
    ['Gibbs-White', 'MF', 'B', 26, [], ''], ['Elliot Anderson', 'MF', 'B', 24, [], 'T'], ['Bowen', 'MF', 'B', 29, [], ''],
    ['Gündoğan', 'MF', 'C', 36, ['pas'], ''], ['Mkhitaryan', 'MF', 'C', 37, [], ''], ['Casemiro', 'MF', 'C', 34, [], ''],
    ['Claudio Echeverri', 'MF', 'C', 20, [], 'T'], ['Lennart Karl', 'MF', 'C', 18, [], 'ST'], ['Rodrigo Mora', 'MF', 'C', 19, [], 'T'],
    ['Geovany Quenda', 'MF', 'C', 19, [], 'T'], ['Ayyoub Bouaddi', 'MF', 'C', 19, [], 'T'],
    // penyerang
    ['Osimhen', 'FW', 'S', 28, ['fin'], ''], ['Cristiano Ronaldo', 'FW', 'A', 41, ['fin'], ''], ['Lewandowski', 'FW', 'A', 38, ['fin'], ''],
    ['Marcus Thuram', 'FW', 'A', 29, [], ''], ['Hugo Ekitiké', 'FW', 'A', 24, [], 'T'], ['Luis Díaz', 'FW', 'A', 29, ['dri'], ''],
    ['Havertz', 'FW', 'A', 27, [], ''], ['Griezmann', 'FW', 'A', 35, ['pas'], ''], ['Semenyo', 'FW', 'A', 26, [], ''],
    ['Vlahović', 'FW', 'B', 26, [], ''], ['Sørloth', 'FW', 'B', 31, [], ''], ['Darwin Núñez', 'FW', 'B', 27, [], ''],
    ['Gakpo', 'FW', 'B', 27, [], ''], ['Nicolas Jackson', 'FW', 'B', 25, [], ''], ['Nkunku', 'FW', 'B', 29, [], ''],
    ['Kolo Muani', 'FW', 'B', 28, [], ''], ['Gonçalo Ramos', 'FW', 'B', 25, [], ''], ['Retegui', 'FW', 'B', 27, [], ''],
    ['Lukaku', 'FW', 'B', 33, [], ''], ['Openda', 'FW', 'B', 26, [], ''], ['Mateta', 'FW', 'B', 29, [], ''],
    ['Kean', 'FW', 'B', 26, [], ''], ['Endrick', 'FW', 'B', 20, [], 'ST'], ['Rashford', 'FW', 'B', 29, [], ''],
    ['Garnacho', 'FW', 'B', 22, ['dri'], ''], ['Delap', 'FW', 'B', 23, [], ''], ['Santiago Giménez', 'FW', 'B', 25, [], ''],
    ['Mathys Tel', 'FW', 'B', 21, [], 'T'], ['Jhon Durán', 'FW', 'B', 22, [], ''], ['Igor Thiago', 'FW', 'B', 25, [], ''],
    ['Burkardt', 'FW', 'B', 26, [], ''], ['Boniface', 'FW', 'B', 25, [], ''], ['Benzema', 'FW', 'B', 38, ['fin'], ''],
    ['Gabriel Jesus', 'FW', 'B', 29, [], ''], ['Son Heung-min', 'FW', 'B', 34, [], ''], ['Ferran Torres', 'FW', 'B', 26, [], ''],
    ['Iñaki Williams', 'FW', 'B', 32, [], ''], ['Wissa', 'FW', 'B', 29, [], ''], ['Chris Wood', 'FW', 'B', 34, [], ''],
    ['Tammy Abraham', 'FW', 'B', 28, [], ''], ['Strand Larsen', 'FW', 'B', 26, [], ''], ['Aktürkoğlu', 'FW', 'B', 28, [], ''],
    ['Amoura', 'FW', 'B', 26, [], ''], ['Morata', 'FW', 'C', 34, [], ''], ['Füllkrug', 'FW', 'C', 33, [], ''],
    ['Taremi', 'FW', 'C', 34, [], ''], ['Zirkzee', 'FW', 'C', 25, [], ''], ['Joselu', 'FW', 'C', 36, [], ''],
    ['Evan Ferguson', 'FW', 'C', 21, [], ''], ['Francesco Camarda', 'FW', 'C', 18, [], 'ST'], ['Chido Obi', 'FW', 'C', 19, [], 'T'],
    ['Marc Guiu', 'FW', 'C', 20, [], ''], ['Calvert-Lewin', 'FW', 'C', 29, [], ''], ['Immobile', 'FW', 'C', 36, [], ''],
    ['Džeko', 'FW', 'C', 40, [], ''], ['Vitor Roque', 'FW', 'C', 21, [], ''], ['Hwang Hee-chan', 'FW', 'C', 30, [], ''],
    ['Assane Diao', 'FW', 'C', 21, [], 'T'],
  ];
  // umur pemain inti klub (urutan slot 1, 2, 4, 7, 11, 9)
  const CLUB_AGES = {
    rma: [34, 28, 21, 28, 23, 27], // Courtois, Alexander-Arnold, Huijsen, Valverde, Bellingham, Mbappé
    mci: [27, 29, 24, 30, 28, 26], // Donnarumma, Rúben Dias, Gvardiol, Rodri, Reijnders, Haaland
    liv: [34, 25, 35, 34, 23, 27], // Alisson, Frimpong, Van Dijk, Salah, Wirtz, Isak
    ars: [31, 25, 28, 25, 27, 28], // Raya, Saliba, Gabriel, Saka, Rice, Gyökeres
    bay: [40, 28, 30, 25, 31, 33], // Neuer, Upamecano, Kim Min-jae, Olise, Kimmich, Kane
    bar: [25, 28, 19, 19, 24, 30], // Joan García, Koundé, Cubarsí, Lamine Yamal, Pedri, Raphinha
    psg: [25, 28, 32, 26, 25, 29], // Chevalier, Hakimi, Marquinhos, Vitinha, Kvaratskhelia, Dembélé
    int: [38, 29, 27, 29, 32, 29], // Sommer, Dimarco, Bastoni, Barella, Çalhanoğlu, Lautaro
    atm: [33, 31, 31, 25, 23, 26], // Oblak, Llorente, Giménez, Baena, Barrios, Julián Álvarez
    che: [29, 27, 23, 24, 25, 25], // Sánchez, Reece James, Colwill, Palmer, Enzo, João Pedro
    lev: [33, 31, 27, 29, 32, 30], // Flekken, Grimaldo, Tapsoba, Aleix García, Andrich, Schick
    nap: [29, 33, 27, 30, 35, 23], // Meret, Di Lorenzo, Buongiorno, McTominay, De Bruyne, Højlund
    juv: [29, 26, 29, 21, 28, 26], // Di Gregorio, Cambiaso, Bremer, Yıldız, Locatelli, Jonathan David
    bvb: [29, 28, 26, 24, 21, 30], // Kobel, Ryerson, Schlotterbeck, Adeyemi, J. Bellingham, Guirassy
    mun: [24, 27, 27, 32, 27, 23], // Lammens, Dalot, De Ligt, Bruno F., Cunha, Šeško
    acm: [31, 28, 27, 28, 41, 27], // Maignan, Tomori, Gabbia, Pulisic, Modrić, Leão
    tot: [30, 28, 25, 23, 26, 29], // Vicario, Cristian Romero, Van de Ven, Xavi Simons, Kudus, Solanke
    nfc: [34, 26, 23, 28, 26, 24], // Pope, Botman, Livramento, Bruno Guimarães, Tonali, Woltemade
    avl: [34, 28, 29, 29, 24, 31], // Emiliano Martínez, Konsa, Pau Torres, Tielemans, Morgan Rogers, Ollie Watkins
    rom: [27, 30, 27, 25, 32, 29], // Svilar, Gianluca Mancini, Ndicka, Manu Koné, Dybala, Dovbyk
    ata: [26, 27, 26, 25, 28, 27], // Carnesecchi, Isak Hien, Bellanova, De Ketelaere, Lookman, Scamacca
    laz: [32, 31, 26, 24, 31, 28], // Provedel, Romagnoli, Mario Gila, Rovella, Zaccagni, Castellanos
    rso: [31, 25, 29, 25, 29, 29], // Remiro, Zubeldia, Aihen Muñoz, Kubo, Brais Méndez, Oyarzabal
    ath: [29, 27, 32, 26, 31, 24], // Unai Simón, Dani Vivian, Laporte, Sancet, Berenguer, Nico Williams
    vil: [25, 28, 23, 37, 31, 34], // Luiz Júnior, Foyth, Renato Veiga, Parejo, Pépé, Gerard Moreno
    ben: [25, 22, 38, 30, 23, 27], // Trubin, António Silva, Otamendi, Aursnes, Sudakov, Pavlidis
    por: [27, 30, 23, 25, 24, 22], // Diogo Costa, Bednarek, Alberto Costa, Alan Varela, Gabri Veiga, Samu Omorodion
    scp: [32, 25, 22, 27, 26, 29], // Rui Silva, Gonçalo Inácio, Diomande, Hjulmand, Trincão, Luis Javier Suárez
    aja: [25, 23, 26, 24, 33, 34], // Jaroš, Youri Baas, Šutalo, Kenneth Taylor, Klaassen, Weghorst
    psv: [27, 25, 23, 29, 37, 23], // Kovář, Dest, Flamingo, Guus Til, Perišić, Ricardo Pepi
    com: [31, 31, 21, 23, 26, 27], // Butez, Kempf, Jacobo Ramón, Perrone, Caqueret, Douvikas
    rbl: [36, 23, 28, 29, 27, 19], // Gulácsi, Lukeba, Raum, Schlager, Baumgartner, Yan Diomande
  };
  // potensi tersembunyi pemain klub tertentu (sisanya dihitung dari umur)
  const CLUB_POT = { 'com-4': 'T', 'rbl-9': 'ST', 'scp-4': 'T', 'ben-2': 'T' };
  // Ekonomi (dalam juta). Juara liga + piala 3 musim beruntun ~ 70 jt = 1 pemain S termurah.
  const MARKET = {
    START_MONEY: 10, MIN_SQUAD: 6, MIN_FIRST: 8, MAX_SQUAD: 10, SELL_RATE: 0.4,
    PRICE: { S: 70, A: 18, B: 5, C: 1.5 }, TRAIT_BONUS: 0.1,
    LEAGUE_PRIZE: [12, 9, 7, 6, 5, 4.5, 4, 3.5, 3, 2.7, 2.3, 2, 1.5, 1.3, 1.2, 1],
    CUP_PRIZE: { 'Babak 32 Besar': 0.3, 'Babak 16 Besar': 0.5, 'Perempat Final': 1, 'Semifinal': 2, 'Final': 3, 'Juara': 5 },
    CH_PRIZE: [3, 2.6, 2.3, 2, 1.8, 1.6, 1.4, 1.2, 1.1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.3], // Championship
    PROMO_BONUS: 3,
    UCL_PRIZE: { 'Fase Grup': 1, 'Perempat Final': 2, 'Semifinal': 3, 'Final': 4, 'Juara': 6 },
    WIN: 0.2, DRAW: 0.08, HOME: 0.1,
  };
  const CUP_ROUNDS = ['Babak 16 Besar', 'Perempat Final', 'Semifinal', 'Final'];
  // Main Sendiri: 2 divisi + Piala 32 tim + UCL (16 tim Premiere)
  const CUP_ROUNDS2 = ['Babak 32 Besar', 'Babak 16 Besar', 'Perempat Final', 'Semifinal', 'Final'];
  const UCL_ROUNDS = ['Perempat Final', 'Semifinal', 'Final'];
  const DIV_NAME = { 1: 'Premiere', 2: 'Championship' };
  const GROUP_NAME = ['A', 'B', 'C', 'D'];
  const PROMO = 3;                        // 3 tim naik & 3 tim turun
  const CUP_AFTER2 = [3, 8, 14, 20, 26];  // babak piala setelah pekan ke-n
  const UCL_GROUP_AFTER = [5, 11, 17];    // matchday grup UCL
  const UCL_KO_AFTER = [22, 25, 29];      // perempat final, semifinal, final UCL
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
  const isDiv = () => !!(save && save.divMode);
  const cupRounds = () => (isDiv() ? CUP_ROUNDS2 : CUP_ROUNDS);
  const isKO = ev => ev.type === 'cup' || (ev.type === 'ucl' && !!ev.ko);
  // divisi klub pada musim berjalan (daftar dibekukan saat musim dibuat)
  const divOf = cid => (isDiv() && save.divs[2].includes(cid) ? 2 : 1);
  const inPremiere = cid => !isDiv() || save.divs[1].includes(cid);
  const isMe = id => !!save.user && id === save.user;
  const ROLE_OF = { 1: 'GK', 2: 'DF', 4: 'DF', 7: 'MF', 11: 'MF', 9: 'FW' };
  const NUMS = [1, 2, 4, 7, 11, 9];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const h = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- pasar transfer (liga Main Sendiri) ---------- */
  const isMarket = () => !!(save && save.market);
  const P = pid => save.players[pid];
  const fmtM = v => (Math.round(v * 10) / 10).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' jt';
  const TIER_DOWN = { S: 'A', A: 'B', B: 'C', C: 'D', D: 'D' };
  const SLOT_LABEL = { 1: 'KIP', 2: 'BEK', 4: 'BEK', 7: 'GEL', 11: 'GEL', 9: 'PEN' };
  /* ---------- umur & perkembangan pemain (hanya liga Main Sendiri) ---------- */
  // nilai tersembunyi (OVR) menentukan tier: C < 65, B 65-74, A 75-84, S >= 85
  const OVR_BASE = { S: 88, A: 79, B: 70, C: 60 };
  const tierOf = o => (o >= 85 ? 'S' : o >= 75 ? 'A' : o >= 65 ? 'B' : 'C');
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const AGE = { MAX: 45, RESET: 17 };
  // faktor lain: performa musim (rata-rata rating), jarang main (pemain muda tumbuh lebih lambat), acak per pemain
  const DEV = { GOOD: 7.3, BAD: 6.2, MIN_APPS: 8, BENCH_GROWTH: 0.5, RAND: 2 };
  // perubahan OVR per musim menurut umur; kiper: kurva bergeser 3 tahun (puncak & menurun lebih lambat)
  function ageDelta(age, role) {
    const a = role === 'GK' ? age - 3 : age;
    if (a <= 20) return 4;
    if (a <= 23) return 3;
    if (a <= 26) return 1;
    if (a <= 30) return rint(0, 1); // usia emas
    if (a <= 32) return -1;
    if (a <= 34) return -2;
    if (a <= 36) return -3;
    return -4;
  }
  // potensi = batas atas OVR (tersembunyi dari pemain)
  function initPotential(ovr, age, pot) {
    if (pot === 'ST') return Math.max(ovr + 10, rint(88, 94));
    if (pot === 'T') return Math.max(ovr + 6, rint(82, 88));
    if (age <= 23) return ovr + rint(3, 9);
    return ovr + rint(0, 4);
  }
  // pemain yang "lahir kembali" di umur 17: potensi diundi ulang
  const rollYouthPot = () => { const r = Math.random(); return r < 0.15 ? rint(85, 93) : r < 0.5 ? rint(75, 84) : rint(64, 74); };
  function makePlayer(id, name, role, tier, age, traits, pot, clubId) {
    const ovr = OVR_BASE[tier] + rint(-2, 2);
    return { id, name, role, tier, traits, club: clubId, age, ovr, pot: initPotential(ovr, age, pot) };
  }
  // dipanggil sekali di akhir musim: umur +1, OVR berubah, tier menyesuaikan
  function developPlayers() {
    const st = {};
    for (const c of save.clubs) Object.assign(st, clubPlayerStats(c.id));
    const changes = [];
    for (const p of Object.values(save.players)) {
      const before = p.tier, age = p.age;
      p.age++;
      if (p.age >= AGE.MAX) {
        p.age = AGE.RESET; p.ovr = rint(56, 60); p.pot = rollYouthPot(); p.tier = tierOf(p.ovr);
        changes.push({ id: p.id, from: before, to: p.tier, reborn: true });
        continue;
      }
      const x = st[p.id], played = x && x.apps >= DEV.MIN_APPS;
      let d = ageDelta(age, p.role);
      if (d > 0 && !played) d = Math.round(d * DEV.BENCH_GROWTH);
      if (played) d += x.avg >= DEV.GOOD ? 1 : x.avg <= DEV.BAD ? -1 : 0;
      d += rint(-DEV.RAND, DEV.RAND);
      let o = p.ovr + d;
      if (d > 0) o = Math.min(o, Math.max(p.ovr, p.pot)); // tidak bisa melewati potensi
      p.ovr = Math.max(40, Math.min(99, o));
      p.tier = tierOf(p.ovr);
      if (p.tier !== before) changes.push({ id: p.id, from: before, to: p.tier });
    }
    for (const c of save.clubs) if (c.lineup) syncClub(c);
    return changes;
  }
  // harga: tier, ciri, umur & (untuk pemain muda) ruang berkembang
  const ageFactor = a => (a <= 21 ? 1.3 : a <= 25 ? 1.15 : a <= 29 ? 1 : a <= 32 ? 0.8 : a <= 35 ? 0.6 : 0.5);
  const potFactor = p => (p.age <= 25 ? 1 + 0.03 * Math.max(0, Math.min(20, p.pot - p.ovr)) : 1);
  const price = p => Math.round(MARKET.PRICE[p.tier] * (1 + MARKET.TRAIT_BONUS * p.traits.length) * (p.age ? ageFactor(p.age) * potFactor(p) : 1) * 10) / 10;
  const sellPrice = p => Math.round(price(p) * MARKET.SELL_RATE * 10) / 10;
  const r2 = v => Math.round(v * 100) / 100; // hindari galat desimal pada uang
  // tier efektif: di luar posisi asli turun 1 tingkat
  const effTier = (p, slot) => (p.role === ROLE_OF[slot] ? p.tier : TIER_DOWN[p.tier]);
  const freeAgents = () => Object.values(save.players).filter(p => !p.club);

  // Data pemain awal: 96 pemain klub + pemain toko
  function initMarket() {
    save.market = true;
    save.players = {};
    for (const c of save.clubs) {
      c.roster = []; c.lineup = {}; c.money = MARKET.START_MONEY; c.income = { league: 0, cup: 0, match: 0, ucl: 0, promo: 0 };
      for (const n of NUMS) {
        const id = c.id + '-' + n;
        save.players[id] = makePlayer(id, SQUADS[c.id][n], ROLE_OF[n], TIERS[c.id][n], CLUB_AGES[c.id][NUMS.indexOf(n)], (TRAIT_DATA[c.id] || {})[n] || [], CLUB_POT[id] || '', c.id);
        c.roster.push(id); c.lineup[n] = id;
      }
      syncClub(c);
    }
    SHOP_DATA.forEach(([name, role, tier, age, traits, pot], i) => {
      const id = 's' + (i + 1);
      save.players[id] = makePlayer(id, name, role, tier, age, traits, pot, null);
    });
    save.window = true;      // jendela transfer pra-musim terbuka
    save.soldBy = {};
    save.firstWindow = true; // musim pertama: wajib beli 2 cadangan (skuad minimal 8)
    save.news = [];
    save.ledger = [];
  }
  // data posisi yang dipakai mesin game & simulasi (nama, tier efektif, ciri per slot)
  function syncClub(c) {
    c.squad = {}; c.tiers = {}; c.traits = {};
    for (const n of NUMS) {
      const p = P(c.lineup[n]);
      if (!p) continue;
      c.squad[n] = p.name; c.tiers[n] = effTier(p, n); c.traits[n] = p.traits;
    }
  }
  const minSquad = () => (save.firstWindow ? MARKET.MIN_FIRST : MARKET.MIN_SQUAD);
  // cek skuad: jumlah, semua posisi terisi (posisi asli), susunan inti lengkap & kiper di gawang
  function squadIssues(c, min = minSquad()) {
    const out = [];
    const roles = { GK: 0, DF: 0, MF: 0, FW: 0 };
    for (const id of c.roster) roles[P(id).role]++;
    if (c.roster.length < min) out.push(`Skuad minimal ${min} pemain (sekarang ${c.roster.length})`);
    if (c.roster.length > MARKET.MAX_SQUAD) out.push(`Skuad maksimal ${MARKET.MAX_SQUAD} pemain`);
    if (roles.GK < 1) out.push('Butuh minimal 1 kiper');
    if (roles.DF < 2) out.push('Butuh minimal 2 bek');
    if (roles.MF < 2) out.push('Butuh minimal 2 gelandang');
    if (roles.FW < 1) out.push('Butuh minimal 1 penyerang');
    const used = new Set();
    for (const n of NUMS) {
      const id = c.lineup[n];
      if (!id || !c.roster.includes(id) || used.has(id)) { out.push(`Posisi ${SLOT_LABEL[n]} belum diisi`); continue; }
      used.add(id);
    }
    const gk = P(c.lineup[1]);
    if (gk && gk.role !== 'GK') out.push('Posisi kiper harus diisi kiper');
    return out;
  }
  // susunan inti terbaik: per posisi pilih tier tertinggi, utamakan posisi asli
  function autoLineup(c) {
    const left = new Set(c.roster), lineup = {};
    const tv = (p, n) => TV[effTier(p, n)];
    for (const n of [1, 9, 2, 4, 7, 11]) {
      const cands = [...left].map(P).filter(p => n !== 1 || p.role === 'GK')
        .sort((a, b) => tv(b, n) - tv(a, n) || (b.role === ROLE_OF[n]) - (a.role === ROLE_OF[n]) || b.traits.length - a.traits.length);
      if (cands[0]) { lineup[n] = cands[0].id; left.delete(cands[0].id); }
    }
    c.lineup = lineup;
    syncClub(c);
  }
  // kiper hanya boleh di posisi kiper, dan posisi kiper hanya untuk kiper
  const slotOk = (pid, slot) => !!P(pid) && (P(pid).role === 'GK') === (slot === 1);
  function setSlot(c, slot, pid) {
    const prev = c.lineup[slot];
    const other = NUMS.find(n => c.lineup[n] === pid);
    if (!slotOk(pid, slot) || (other != null && prev && !slotOk(prev, other))) return false;
    if (other != null) c.lineup[other] = prev; // tukar posisi
    c.lineup[slot] = pid;
    syncClub(c);
    return true;
  }
  // perbaiki susunan yang tidak sah (mis. pemain lapangan di gawang dari versi sebelumnya)
  function repairLineup(c) {
    if (NUMS.some(n => !c.lineup[n] || !slotOk(c.lineup[n], n))) autoLineup(c);
  }
  function addLedger(cid, label, amount) {
    if (cid === save.user) save.ledger.unshift({ season: seasonName(save.year), label, amount: Math.round(amount * 100) / 100 });
    if (save.ledger.length > 60) save.ledger.length = 60;
  }
  // Minat pemain bergabung: tergantung tier pemain & status klub
  // status 0 = Championship, 1 = Premiere tanpa trofi (2 musim terakhir), 2 = Premiere dengan trofi
  const WILL = { S: [0.05, 0.35, 0.9], A: [0.2, 0.85, 1], B: [0.75, 1, 1], C: [0.95, 1, 1] };
  function clubStatus(cid) {
    if (!isDiv()) return 2;
    if (club(cid).div === 2) return 0;
    return save.history.slice(-2).some(x => x.league === cid || x.cup === cid || x.ucl === cid) ? 2 : 1;
  }
  const willChance = (c, p) => WILL[p.tier][clubStatus(c.id)];
  const willLabel = v => (v >= 0.85 ? ['🟢', 'Tinggi'] : v >= 0.5 ? ['🟡', 'Sedang'] : v >= 0.2 ? ['🟠', 'Rendah'] : ['🔴', 'Sangat rendah']);
  // pemain yang sudah menolak klub ini baru bisa didekati lagi musim depan
  const refusedBy = (c, pid) => !!(save.refused && (save.refused[pid] || []).includes(c.id));
  // pemain yang baru dijual klub ini di jendela yang sama tidak bisa dibeli kembali (mencegah rugi)
  const soldByMe = (c, pid) => !!(save.soldBy && save.soldBy[pid] === c.id);
  function buy(c, pid) {
    const p = P(pid);
    if (!save.window || !p || p.club || soldByMe(c, pid) || refusedBy(c, pid) || c.roster.length >= MARKET.MAX_SQUAD || c.money + 1e-9 < price(p)) return false;
    if (Math.random() >= willChance(c, p)) {
      save.refused = save.refused || {};
      (save.refused[pid] = save.refused[pid] || []).push(c.id);
      if (c.id === save.user || TV[p.tier] >= TV.A) save.news.unshift(`${p.name} (${p.tier}) menolak bergabung dengan ${club(c.id).name}`);
      return 'refused';
    }
    c.money = r2(c.money - price(p)); p.club = c.id; c.roster.push(pid);
    addLedger(c.id, `Beli ${p.name}`, -price(p));
    save.news.unshift(`${club(c.id).name} membeli ${p.name} (${p.tier}) seharga ${fmtM(price(p))}`);
    return true;
  }
  function canSell(c, pid) {
    if (!save.window || NUMS.some(n => c.lineup[n] === pid) || c.roster.length <= MARKET.MIN_SQUAD) return false;
    const rest = { ...c, roster: c.roster.filter(x => x !== pid) };
    return squadIssues(rest, MARKET.MIN_SQUAD).length === 0;
  }
  function sell(c, pid) {
    if (!canSell(c, pid)) return false;
    const p = P(pid);
    c.money = r2(c.money + sellPrice(p)); p.club = null; c.roster = c.roster.filter(x => x !== pid);
    (save.soldBy = save.soldBy || {})[pid] = c.id;
    addLedger(c.id, `Jual ${p.name}`, sellPrice(p));
    save.news.unshift(`${club(c.id).name} menjual ${p.name} (${p.tier}) ke toko seharga ${fmtM(sellPrice(p))}`);
    return true;
  }
  // Transfer klub komputer (tidak selalu terjadi; ada unsur acak):
  // 1) upgrade pemain inti bila ada yang lebih bagus & terjangkau (85%)
  // 2) kadang menjual cadangan terlemah (30%)
  // 3) kadang menambah cadangan dengan sebagian uang (50%)
  // 4) selalu penuhi skuad minimal
  const AI_T = { UPGRADE: 0.85, SELL: 0.3, DEPTH: 0.5, DEPTH_SPEND: 0.6 };
  function aiTransfers(c) {
    const freeAgents = () => Object.values(save.players).filter(p => !p.club && !soldByMe(c, p.id));
    const cheapest = () => Math.min(...freeAgents().map(price), 99);
    const reserve = extra => Math.max(0, minSquad() - (c.roster.length + extra)) * cheapest();
    const pickTop = (opts, k) => { const top = opts.filter(p => TV[p.tier] === TV[opts[0].tier]); return top[Math.floor(Math.random() * Math.min(k, top.length))]; };
    // coba beli; bila pemain menolak, coba kandidat lain
    const tryBuy = (opts, k) => {
      opts = opts.filter(p => !refusedBy(c, p.id));
      for (let i = 0; i < 4 && opts.length; i++) {
        const p = pickTop(opts, k);
        if (buy(c, p.id) === true) return true;
        opts = opts.filter(x => x !== p);
      }
      return false;
    };
    const benchOf = () => c.roster.filter(id => !NUMS.some(n => c.lineup[n] === id)).map(P);
    // 1) upgrade pemain inti (posisi terlemah dulu)
    if (Math.random() < AI_T.UPGRADE) {
      for (let tries = 0; tries < 2; tries++) {
        const slots = NUMS.map(n => ({ n, t: TV[c.tiers[n]] })).sort((a, b) => a.t - b.t);
        let done = false;
        for (const { n, t } of slots) {
          if (c.roster.length >= MARKET.MAX_SQUAD) {
            const weak = benchOf().filter(p => canSell(c, p.id)).sort((a, b) => TV[a.tier] - TV[b.tier])[0];
            if (!weak) break;
            sell(c, weak.id);
          }
          const opts = freeAgents().filter(p => p.role === ROLE_OF[n] && TV[p.tier] > t && price(p) <= c.money - reserve(1))
            .sort((a, b) => TV[b.tier] - TV[a.tier] || price(a) - price(b));
          if (!tryBuy(opts, 3)) continue;
          autoLineup(c);
          done = true;
          break;
        }
        if (!done) break;
      }
    }
    // 2) kadang menjual cadangan terlemah (untuk menambah uang)
    if (c.roster.length > minSquad() && Math.random() < AI_T.SELL) {
      const weak = benchOf().filter(p => canSell(c, p.id)).sort((a, b) => TV[a.tier] - TV[b.tier] || price(a) - price(b))[0];
      if (weak) sell(c, weak.id);
    }
    // 3) kadang menambah cadangan (posisi yang paling sedikit cadangannya)
    if (c.roster.length < MARKET.MAX_SQUAD && Math.random() < AI_T.DEPTH) {
      const cnt = { GK: 0, DF: 0, MF: 0, FW: 0 };
      for (const p of benchOf()) cnt[p.role]++;
      const need = Object.keys(cnt).sort((a, b) => cnt[a] - cnt[b] || Math.random() - 0.5);
      const budget = c.money * AI_T.DEPTH_SPEND;
      for (const role of need) {
        const opts = freeAgents().filter(p => p.role === role && price(p) <= budget).sort((a, b) => TV[b.tier] - TV[a.tier] || price(a) - price(b));
        if (opts.length && tryBuy(opts, 4)) break;
      }
    }
    // 4) penuhi skuad minimal
    let guard = 0;
    while (c.roster.length < minSquad() && guard++ < 10) {
      const opts = freeAgents().filter(p => price(p) <= c.money - reserve(1)).sort((a, b) => TV[b.tier] - TV[a.tier] || price(a) - price(b));
      if (!tryBuy(opts, 4)) break;
    }
    autoLineup(c);
  }
  // Tutup jendela transfer: klub komputer bertransaksi, musim dimulai
  function closeWindow() {
    const me = club(save.user);
    if (squadIssues(me).length) return;
    save.news = save.news.filter(n => n.startsWith(me.name)).slice(0, 20);
    for (const c of shuffle(save.clubs.filter(x => x.id !== save.user))) aiTransfers(c);
    save.window = false;
    save.firstWindow = false;
    persist();
    tab = 'shop';
    showHub();
  }

  /* ---------- simpan / muat ---------- */
  function load() {
    try { save = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { save = null; }
    if (save && save.v !== 1) save = null;
    // karier lama (sebelum ada nama pemain): lengkapi daftar pemain
    if (save) for (const c of save.clubs) {
      if (!c.squad) c.squad = { ...SQUADS[c.id] };
      if (!c.tiers) c.tiers = { ...TIERS[c.id] };
      if (!c.traits) c.traits = JSON.parse(JSON.stringify(TRAIT_DATA[c.id] || {}));
      if (c.form == null) c.form = 0;
    }
    // karier lama (sebelum ada tingkat kesulitan) tetap Hard seperti sebelumnya
    if (save && !save.difficulty) save.difficulty = 'hard';
    // karier lama = mode Main Sendiri
    if (save && !save.mode) save.mode = 'solo';
    if (save && save.market) {
      const ages = {};
      SHOP_DATA.forEach(d => { ages[d[0]] = d[3]; });
      for (const c of [...CLUBS, ...CLUBS2]) NUMS.forEach((n, i) => { ages[SQUADS[c.id][n]] = CLUB_AGES[c.id][i]; });
      for (const p of Object.values(save.players)) if (p.age == null) {
        p.age = ages[p.name] || 27; p.ovr = OVR_BASE[p.tier] || 60; p.pot = initPotential(p.ovr, p.age, '');
      }
      for (const c of save.clubs) if (c.lineup) repairLineup(c);
    }
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
    if (isDiv()) { newSeasonDiv(year); return; }
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

  // Premiere & Championship (30 pekan bersamaan), Piala 32 tim (5 babak), UCL: 4 grup x 4 tim + gugur
  function newSeasonDiv(year) {
    const d1 = save.clubs.filter(c => c.div === 1).map(c => c.id), d2 = save.clubs.filter(c => c.div === 2).map(c => c.id);
    save.divs = { 1: d1, 2: d2 };
    const r1 = roundRobin(shuffle(d1.slice())), r2 = roundRobin(shuffle(d2.slice()));
    const pot = shuffle(d1.slice());
    save.groups = [0, 1, 2, 3].map(g => pot.slice(g * 4, g * 4 + 4));
    const gRounds = save.groups.map(g => roundRobin(g).slice(0, 3)); // 1 leg
    const events = [];
    r1.forEach((pairs, i) => {
      const md = i + 1;
      events.push({ type: 'league', md, matches: [...pairs.map(([hh, a]) => ({ h: hh, a, d: 1 })), ...r2[i].map(([hh, a]) => ({ h: hh, a, d: 2 }))] });
      const c = CUP_AFTER2.indexOf(md);
      if (c >= 0) events.push({ type: 'cup', round: c, matches: [] });
      const g = UCL_GROUP_AFTER.indexOf(md);
      if (g >= 0) events.push({ type: 'ucl', gmd: g + 1, matches: gRounds.flatMap((gr, gi) => gr[g].map(([hh, a]) => ({ h: hh, a, g: gi }))) });
      const k = UCL_KO_AFTER.indexOf(md);
      if (k >= 0) events.push({ type: 'ucl', ko: true, round: k, matches: [] });
    });
    const draw = shuffle(save.clubs.map(c => c.id));
    events.find(e => e.type === 'cup' && e.round === 0).matches =
      Array.from({ length: draw.length / 2 }, (_, i) => ({ h: draw[2 * i], a: draw[2 * i + 1] }));
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
      save = { v: 1, mode: 'cpu', user: null, difficulty: 'hard', clubs: CLUBS.map(c => ({ ...c, squad: { ...SQUADS[c.id] }, tiers: { ...TIERS[c.id] }, traits: JSON.parse(JSON.stringify(TRAIT_DATA[c.id] || {})), form: 0 })), history: [] };
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
    const st = c => 80 + 3 * NUMS.reduce((a, n) => a + TV[TIERS[c.id][n]], 0) / NUMS.length;
    const sorted = list => list.slice().sort((a, b) => st(b) - st(a));
    const grid = list => `<div class="club-grid">
        ${sorted(list).map(c => `<button class="club-btn" data-club="${c.id}">
          <span class="club-dot" style="background:${c.color}"></span>
          <b>${h(c.name)}</b><small>${stars(st(c))}</small></button>`).join('')}
      </div>`;
    showModal(`
      <h2>Pilih Tim</h2>
      <p>Musim ${seasonName(START_YEAR)} · 32 tim · Premiere & Championship + Piala + UCL</p>
      <div class="lvl-pick">
        <span>Tingkat kesulitan:</span>
        <div class="seg">${LEVELS.map(([k, n]) => `<button type="button" data-lvl="${k}" class="${k === 'medium' ? 'on' : ''}">${n}</button>`).join('')}</div>
        <small id="lvlDesc">${LEVELS[1][2]}</small>
      </div>
      <h4 class="aw-h">🏆 Premiere</h4>${grid(CLUBS)}
      <h4 class="aw-h">🥈 Championship <small class="muted">· 3 teratas naik ke Premiere</small></h4>${grid(CLUBS2)}
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
        const mk = (c, div) => ({ ...c, div, squad: { ...SQUADS[c.id] }, tiers: { ...TIERS[c.id] }, traits: JSON.parse(JSON.stringify(TRAIT_DATA[c.id] || {})), form: 0 });
        save = { v: 1, mode: 'solo', divMode: true, user: b.dataset.club, difficulty: lvl, clubs: [...CLUBS.map(c => mk(c, 1)), ...CLUBS2.map(c => mk(c, 2))], history: [] };
        initMarket();
        newSeason(START_YEAR);
        persist();
        hideModal();
        tab = 'my';
        viewEvent = null;
        showHub();
      };
    });
    el('btnPickBack').onclick = () => pickMode();
  }
  const stars = r => '★'.repeat(Math.max(1, Math.round((r - 80) / 1.5)));

  /* ---------- simulasi ---------- */
  function poisson(l) {
    const L = Math.exp(-l);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  }
  // kekuatan tim: rata-rata tier pemain (+ sedikit "form" musiman)
  const TV = { S: 3, A: 2, B: 1, C: 0, D: -1 };
  // kekuatan dari tier efektif 6 pemain inti (termasuk penalti luar posisi)
  function lineupStrength(cid) {
    const c = club(cid), t = c.tiers || TIERS[cid];
    return 80 + 3 * NUMS.reduce((a, n) => a + TV[t[n] || 'B'], 0) / NUMS.length;
  }
  // untuk simulasi skor: + "form" musiman kecil (tidak ditampilkan sebagai bintang)
  function strength(cid) {
    return lineupStrength(cid) + (club(cid).form || 0);
  }
  // pemain semu untuk menghitung atribut (memakai fungsi attr() dari mesin game)
  const pseudo = (cid, n) => { const c = club(cid); return { role: ROLE_OF[n], tier: (c.tiers || {})[n] || 'B', traits: (c.traits || {})[n] || [] }; };
  function simScore(hid, aid) {
    const d = (strength(hid) - strength(aid)) / 22;
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
    const gw = {}, aw = {};
    for (const k of NUMS) {
      gw[k] = GOAL_W[k] * Math.max(0.2, 1 + 0.25 * (attr(pseudo(cid, k), 'sht') - 2));
      aw[k] = ASSIST_W[k] * Math.max(0.2, 1 + 0.25 * (attr(pseudo(cid, k), 'pas') - 2));
    }
    for (let i = 0; i < n; i++) {
      const s = pick(gw);
      let a = null;
      if (Math.random() < ASSIST_CHANCE) { const w = { ...aw }; delete w[s]; a = pick(w); }
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
        let r = 6.3 + (Math.random() + Math.random() + Math.random() - 1.5) * 0.45
          + 0.15 * (TV[((club(cid).tiers || {})[n]) || 'B'] - 1.5);
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
  /* ---------- pergantian pemain untuk laga yang diundi (liga Main Sendiri) ---------- */
  const SUB_COUNT_W = { 0: 15, 1: 35, 2: 35, 3: 15 }; // jumlah pergantian per tim
  const SIM_GK_SUB = 0.08;                            // pergantian kiper jarang
  // undi pergantian satu tim: menit 46-85, cadangan diutamakan masuk di posisi aslinya
  function simSubs(cid) {
    const c = club(cid);
    if (!c.lineup) return [];
    const inXI = id => NUMS.some(n => c.lineup[n] === id);
    let bench = c.roster.filter(id => !inXI(id)).map(P).filter(p => p.role !== 'GK' || Math.random() < SIM_GK_SUB);
    const n = Math.min(pick(SUB_COUNT_W), bench.length);
    const used = new Set(), out = [];
    for (let i = 0; i < n && bench.length; i++) {
      const b = bench.splice(Math.floor(Math.random() * bench.length), 1)[0];
      let slot;
      if (b.role === 'GK') slot = used.has(1) ? null : 1;
      else {
        const free = NUMS.filter(x => x !== 1 && !used.has(x));
        const same = free.filter(x => ROLE_OF[x] === b.role);
        const pool = same.length ? same : free;
        slot = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
      }
      if (slot == null) continue;
      used.add(slot);
      out.push({ c: cid, min: 46 + Math.floor(Math.random() * 40), slot, out: c.lineup[slot], in: b.id });
    }
    return out.sort((a, b) => a.min - b.min);
  }
  // pemain di lapangan pada menit tertentu (slot -> pid)
  function onPitch(m, cid, minute) {
    const map = { ...m.lu[cid === m.h ? 'h' : 'a'] };
    for (const x of m.subs || []) if (x.c === cid && x.min <= minute) map[x.slot] = x.in;
    return map;
  }
  // pemain semu untuk pid yang bermain di slot (tier turun bila di luar posisi)
  const asSlot = (pid, slot) => { const p = P(pid); return { role: ROLE_OF[slot], tier: effTier(p, slot), traits: p.traits }; };
  // gol undian bermenit: pencetak & assist dipilih dari pemain yang sedang di lapangan
  function genGoalsTimed(m, cid, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const min = 1 + Math.floor(Math.random() * 90);
      const pitch = onPitch(m, cid, min);
      const gw = {}, aw = {};
      for (const k of NUMS) {
        gw[k] = GOAL_W[k] * Math.max(0.2, 1 + 0.25 * (attr(asSlot(pitch[k], k), 'sht') - 2));
        aw[k] = ASSIST_W[k] * Math.max(0.2, 1 + 0.25 * (attr(asSlot(pitch[k], k), 'pas') - 2));
      }
      const sl = pick(gw);
      let a = null;
      if (Math.random() < ASSIST_CHANCE) { const w = { ...aw }; delete w[sl]; a = pick(w); }
      out.push({ c: cid, s: sl, a, sp: pitch[sl], ap: a != null ? pitch[a] : undefined, min });
    }
    return out.sort((x, y) => x.min - y.min);
  }
  // rating undian per pemain (termasuk pengganti)
  function genRatingsTimed(m) {
    const side = (cid, own, conc) => {
      const lu = m.lu[cid === m.h ? 'h' : 'a'], out = {};
      const played = Object.entries(lu).map(([slot, pid]) => [pid, +slot]);
      for (const x of m.subs || []) if (x.c === cid) played.push([x.in, x.slot]);
      for (const [pid, slot] of played) {
        const role = ROLE_OF[slot];
        let r = 6.3 + (Math.random() + Math.random() + Math.random() - 1.5) * 0.45 + 0.15 * (TV[effTier(P(pid), slot)] - 1.5);
        for (const g of m.goals || []) if (g.c === cid && !g.og) { if (g.sp === pid) r += 1.1; if (g.ap === pid) r += 0.7; }
        r += own > conc ? 0.5 : own === conc ? 0.1 : -0.4;
        if (role === 'GK') r += conc === 0 ? 0.8 : -0.3 * conc;
        if (role === 'DF') r += conc === 0 ? 0.4 : -0.15 * conc;
        out[pid] = Math.round(Math.max(3, Math.min(10, r)) * 10) / 10;
      }
      return out;
    };
    return { h: side(m.h, m.hs, m.as), a: side(m.a, m.as, m.hs) };
  }

  function setResult(ev, m, hs, as, so, goals, ratings) {
    m.hs = hs; m.as = as; m.played = true;
    if (isMarket()) {
      // susunan pemain saat laga (statistik tetap milik pemain yang benar walau susunan berubah)
      m.lu = { h: { ...club(m.h).lineup }, a: { ...club(m.a).lineup } };
      if (ev.type === 'league') {
        const pay = (cid, v, label) => { const c = club(cid); c.money = r2(c.money + v); c.income.match = r2(c.income.match + v); addLedger(cid, label, v); };
        pay(m.h, MARKET.HOME, 'Pemasukan laga kandang');
        if (hs === as) { pay(m.h, MARKET.DRAW, 'Bonus seri'); pay(m.a, MARKET.DRAW, 'Bonus seri'); }
        else pay(hs > as ? m.h : m.a, MARKET.WIN, 'Bonus menang');
      }
    }
    if (isMarket() && !goals) {
      // laga yang diundi: pergantian, gol bermenit & rating per pemain
      m.subs = [...simSubs(m.h), ...simSubs(m.a)];
      m.goals = [...genGoalsTimed(m, m.h, hs), ...genGoalsTimed(m, m.a, as)].sort((x, y) => x.min - y.min);
      m.ratings = genRatings(m);
      m.pr = genRatingsTimed(m);
    } else {
      m.goals = goals || [...genGoals(m.h, hs), ...genGoals(m.a, as)];
      m.ratings = ratings ? { h: ratings.home, a: ratings.away } : genRatings(m);
      if (ratings && ratings.byPid && isMarket()) m.pr = { h: ratings.byPid.home, a: ratings.byPid.away };
    }
    if (isKO(ev)) {
      if (hs === as) { const s = so || shootout(); m.ph = s.ph; m.pa = s.pa; }
      m.winner = hs > as || (hs === as && m.ph > m.pa) ? m.h : m.a;
    }
  }
  const winnerLabel = m => (m.ph != null ? ` (${m.ph}-${m.pa} pen)` : '');

  /* ---------- alur event ---------- */
  function currentEvent() {
    const ev = save.events[save.next];
    if (ev && isKO(ev) && !ev.matches.length) {
      let pairs;
      if (ev.type === 'ucl' && ev.round === 0) {
        // perempat final UCL: juara grup vs runner-up grup pasangannya
        const t = save.groups.map((g, gi) => groupTable(gi));
        pairs = [[t[0][0], t[1][1]], [t[1][0], t[0][1]], [t[2][0], t[3][1]], [t[3][0], t[2][1]]].map(([a, b]) => [a.id, b.id]);
      } else {
        // pasangan babak berikutnya: pemenang pertandingan berurutan di bagan
        const prev = save.events.find(e => e.type === ev.type && isKO(e) && e.round === ev.round - 1);
        const w = prev.matches.map(m => m.winner);
        pairs = Array.from({ length: w.length / 2 }, (_, i) => [w[2 * i], w[2 * i + 1]]);
      }
      ev.matches = pairs.map(p => (Math.random() < 0.5 ? { h: p[0], a: p[1] } : { h: p[1], a: p[0] }));
      persist();
    }
    return ev;
  }
  const eventTitle = (ev, m) => ev.type === 'league' ? `${isDiv() ? (m && m.d ? DIV_NAME[m.d] : 'Liga') : 'Liga'} · Pekan ${ev.md}/30`
    : ev.type === 'cup' ? `Piala · ${cupRounds()[ev.round]}`
    : ev.ko ? `UCL · ${UCL_ROUNDS[ev.round]}` : `UCL · Fase Grup ${ev.gmd}/3${m && m.g != null ? ` (Grup ${GROUP_NAME[m.g]})` : ''}`;
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
    const extra = c => {
      if (!isMarket() || !c.lineup) return {};
      const inXI = id => NUMS.some(n => c.lineup[n] === id);
      return { pids: { ...c.lineup }, bench: c.roster.filter(id => !inXI(id)).map(P)
        .map(p => ({ pid: p.id, name: p.name, role: p.role, tier: p.tier, traits: p.traits })) };
    };
    return { home: { name: H.name, color: H.color, squad: H.squad, tiers: H.tiers, traits: H.traits, ...extra(H) },
             away: { name: A.name, color: ac, squad: A.squad, tiers: A.tiers, traits: A.traits, ...extra(A) } };
  }

  async function playUserMatch(how) {
    const ev = currentEvent(), m = userMatch(ev);
    if (!m || m.played) return;
    const ko = isKO(ev);
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
      subs: isMarket(),
      label: eventTitle(ev, m),
      onEnd: (hs, as, events, ratings) => recordEngineResult(ev, m, hs, as, events, ratings, finishEvent),
    });
  }

  // Hasil dari mesin game (main sendiri / ditonton): gol, assist & rating sungguhan
  async function recordEngineResult(ev, m, hs, as, events, ratings, done) {
    const so = isKO(ev) && hs === as ? shootout() : null;
    if (so) await showShootout(m, hs, as, so);
    // gol dari mesin game: home/away -> klub; gol bunuh diri tanpa pencetak
    const goals = (events || []).filter(e => e.type === 'goal')
      .map(e => ({ c: e.team === 'home' ? m.h : m.a, s: e.scorer, a: e.assist, og: e.own || undefined,
        sp: e.scorerPid || undefined, ap: e.assistPid || undefined }));
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
      knockout: isKO(ev),
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
    tab = ev.type === 'cup' ? 'cup' : ev.type === 'ucl' ? 'ucl' : 'fixtures';
    showHub();
    if (save.next >= save.events.length) endSeason();
  }

  // ringkasan perkembangan pemain di akhir musim
  function devCard(dev) {
    const up = x => TV[x.to] > TV[x.from];
    const line = x => `<div>${x.reborn ? '🔄' : up(x) ? '📈' : '📉'} <b>${h(x.name)}</b> <small class="muted">(${x.age} th${x.club && x.club !== save.user ? ` · ${h(club(x.club).name)}` : ''})</small>
      ${tierBadge(x.from)} → ${tierBadge(x.to)}${x.reborn ? ' <small class="muted">kembali ke umur 17</small>' : ''}</div>`;
    const mine = dev.filter(x => x.club === save.user);
    const others = dev.filter(x => x.club && x.club !== save.user && (x.to === 'S' || x.from === 'S' || x.reborn)).slice(0, 10);
    const shopUp = dev.filter(x => !x.club && up(x)).length, shopDown = dev.filter(x => !x.club && !up(x)).length;
    return `<h4 class="aw-h">🧬 Perkembangan Pemain</h4><div class="dev-box">
      <div class="dev-sub">${h(club(save.user).name)}</div>
      ${mine.length ? mine.map(line).join('') : '<div class="muted">Tidak ada pemainmu yang berubah tier.</div>'}
      ${others.length ? `<div class="dev-sub">Sorotan klub lain</div>${others.map(line).join('')}` : ''}
      <div class="muted dev-shop">Toko: ${shopUp} pemain naik tier, ${shopDown} turun tier.</div></div>`;
  }

  function endSeason() {
    const D = isDiv(), rounds = cupRounds();
    const table = standings(1), table2 = D ? standings(2) : null;
    const final = save.events.find(e => e.type === 'cup' && e.round === rounds.length - 1).matches[0];
    const uclFinal = D ? save.events.find(e => e.type === 'ucl' && e.ko && e.round === UCL_ROUNDS.length - 1).matches[0] : null;
    const inM = (e, cid) => e.matches.some(m => m.h === cid || m.a === cid);
    const reachCup = cid => {
      let r = rounds[0];
      for (const e of save.events) if (e.type === 'cup' && inM(e, cid)) r = rounds[e.round];
      return final.winner === cid ? 'Juara' : r;
    };
    const reachUcl = cid => {
      if (!D || !save.divs[1].includes(cid)) return null;
      let r = 'Fase Grup';
      for (const e of save.events) if (e.type === 'ucl' && e.ko && inM(e, cid)) r = UCL_ROUNDS[e.round];
      return uclFinal.winner === cid ? 'Juara' : r;
    };
    let userPos = null, userCup = null, userDiv = null, userUcl = null;
    if (save.user) {
      userDiv = divOf(save.user);
      userPos = (userDiv === 2 ? table2 : table).findIndex(r => r.id === save.user) + 1;
      userCup = reachCup(save.user);
      userUcl = reachUcl(save.user);
    }
    const st = playerStats(awardComp(), inPremiere);
    const ts = st.goals[0], ta = st.assists[0];
    const pots = playerOfSeason(table, final.winner, uclFinal && uclFinal.winner);
    const entry = { season: seasonName(save.year), league: table[0].id, cup: final.winner, userPos, userCup,
      topScorer: ts ? { c: ts.cid, name: ts.name, n: ts.n } : null,
      topAssist: ta ? { c: ta.cid, name: ta.name, n: ta.n } : null,
      pots, dream: dreamTeam() };
    if (D) Object.assign(entry, { ch: table2[0].id, ucl: uclFinal.winner, userDiv, userUcl,
      promo: { up: table2.slice(0, PROMO).map(r => r.id), down: table.slice(-PROMO).map(r => r.id) } });
    const firstTime = !save.history.some(x => x.season === entry.season);
    if (firstTime) save.history.push(entry);
    // hadiah uang (sekali per musim)
    let prize = null;
    if (isMarket() && firstTime) {
      const pay = (cid, key, v, label) => { const c = club(cid); c.money = r2(c.money + v); c.income[key] = r2((c.income[key] || 0) + v); addLedger(cid, label, v); };
      table.forEach((r, i) => pay(r.id, 'league', MARKET.LEAGUE_PRIZE[i], `Hadiah ${D ? 'Premiere' : 'liga'} (peringkat ${i + 1})`));
      if (D) {
        table2.forEach((r, i) => pay(r.id, 'league', MARKET.CH_PRIZE[i], `Hadiah Championship (peringkat ${i + 1})`));
        for (const cid of save.divs[1]) { const r = reachUcl(cid); pay(cid, 'ucl', MARKET.UCL_PRIZE[r], `Hadiah UCL (${r})`); }
        for (const cid of entry.promo.up) pay(cid, 'promo', MARKET.PROMO_BONUS, 'Bonus promosi ke Premiere');
      }
      for (const c of save.clubs) { const r = reachCup(c.id); pay(c.id, 'cup', MARKET.CUP_PRIZE[r], `Hadiah piala (${r})`); }
      // promosi & degradasi (berlaku musim depan)
      if (D) {
        for (const cid of entry.promo.down) club(cid).div = 2;
        for (const cid of entry.promo.up) club(cid).div = 1;
      }
      const me = club(save.user), inc = me.income;
      prize = { ...inc, total: inc.league + inc.cup + inc.match + (inc.ucl || 0) + (inc.promo || 0), money: me.money };
      entry.prize = prize;
      // simpan statistik pemain musim ini (dilihat saat jendela transfer berikutnya)
      save.lastStats = { season: seasonName(save.year), stats: clubPlayerStats(save.user) };
      // umur bertambah & atribut berkembang/menurun
      entry.dev = developPlayers().map(x => ({ ...x, name: P(x.id).name, age: P(x.id).age, club: P(x.id).club }));
    }
    persist();
    // tampilan ulang (setelah dimuat lagi): pakai catatan yang tersimpan
    const E = firstTime ? entry : save.history.find(x => x.season === entry.season) || entry;
    if (!firstTime) prize = E.prize || null;
    const L = club(E.league), C = club(E.cup);
    const champ = (icon, label, cid) => `<div class="champ-row"><span>${icon} ${label}</span><b style="color:${club(cid).color}">${h(club(cid).name)}</b></div>`;
    const names = ids => ids.map(id => `<b class="${isMe(id) ? 'me' : ''}">${h(club(id).name)}</b>`).join(', ');
    showModal(`
      <h2>Musim ${E.season} Selesai</h2>
      ${champ('🏆', D ? 'Juara Premiere' : 'Juara Liga', E.league)}
      ${D ? champ('🥈', 'Juara Championship', E.ch) : ''}
      ${champ('🥇', 'Juara Piala', E.cup)}
      ${D ? champ('⭐', 'Juara UCL', E.ucl) : ''}
      ${E.promo ? `<div class="promo-box"><div>⬆️ Naik ke Premiere: ${names(E.promo.up)}</div><div>⬇️ Turun ke Championship: ${names(E.promo.down)}</div></div>` : ''}
      ${E.topScorer ? `<div class="champ-row"><span>👟 Top Skor</span><b>${h(E.topScorer.name)} <small>(${h(club(E.topScorer.c).name)}) · ${E.topScorer.n} gol</small></b></div>` : ''}
      ${E.topAssist ? `<div class="champ-row"><span>🎯 Top Assist</span><b>${h(E.topAssist.name)} <small>(${h(club(E.topAssist.c).name)}) · ${E.topAssist.n} assist</small></b></div>` : ''}
      ${D ? '<p class="muted aw-note">Penghargaan dari semua kompetisi (liga, piala, UCL), khusus pemain klub Premiere.</p>' : ''}
      ${E.pots ? potsCard(E.pots) : ''}
      ${E.dev ? devCard(E.dev) : ''}
      <h4 class="aw-h">⭐ Dream Team Musim Ini</h4>
      ${dreamPitch(E.dream)}
      ${save.user ? `<p>${h(club(save.user).name)}: peringkat <b>${E.userPos}</b> di ${D ? DIV_NAME[E.userDiv] : 'liga'}, piala: <b>${E.userCup}</b>${E.userUcl ? `, UCL: <b>${E.userUcl}</b>` : ''}.</p>` : ''}
      ${prize ? `<div class="fin-box"><b>💰 Pendapatan musim ini: +${fmtM(prize.total)}</b>
        <small>Hadiah liga +${fmtM(prize.league)} · Hadiah piala +${fmtM(prize.cup)}${prize.ucl ? ` · Hadiah UCL +${fmtM(prize.ucl)}` : ''}${prize.promo ? ` · Bonus promosi +${fmtM(prize.promo)}` : ''} · Bonus laga +${fmtM(prize.match)}</small>
        <small>Uang klub sekarang: <b>${fmtM(prize.money)}</b></small></div>` : ''}
      <div class="btns"><button class="btn primary" id="btnNextSeason">Mulai Musim ${seasonName(save.year + 1)}</button></div>`);
    el('btnNextSeason').onclick = () => {
      // kekuatan tim sedikit berubah tiap musim
      for (const c of save.clubs) c.form = Math.round((Math.random() - 0.5) * 4);
      newSeason(save.year + 1);
      if (isMarket()) {
        save.window = true; // jendela transfer pra-musim
        save.news = [];
        save.soldBy = {};
        save.refused = {}; // pemain yang menolak bisa didekati lagi
        for (const c of save.clubs) c.income = { league: 0, cup: 0, match: 0, ucl: 0, promo: 0 };
      }
      persist();
      hideModal();
      tab = isMarket() ? 'my' : 'table';
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

  // nama pemain di slot `num` klub `cid`; dengan `m` = sesuai susunan saat laga itu
  const pidAt = (m, cid, num) => (m && m.lu ? m.lu[cid === m.h ? 'h' : 'a'][num] : null);
  const pname = (cid, num, m) => {
    const pid = pidAt(m, cid, num);
    if (pid && P(pid)) return P(pid).name;
    return (club(cid).squad && club(cid).squad[num]) || `#${num}`;
  };
  const gname = (g, key, m) => { const pid = g[key === 's' ? 'sp' : 'ap']; return pid && P(pid) ? P(pid).name : pname(g.c, g[key], m); };
  const goalLine = (g, m) => (g.og ? `${h(club(g.c).name)}: gol bunuh diri`
    : `${h(gname(g, 's', m))}${g.a ? ` <small>(assist ${h(gname(g, 'a', m))})</small>` : ''}`) + (g.min ? ` <small>${g.min}'</small>` : '');
  const subLine = x => `🔁 ${x.min}' ${h(P(x.out).name)} → <b>${h(P(x.in).name)}</b>`;

  // filter kompetisi: league (mode lama), p = Premiere, c = Championship, cup, ucl, all
  const compFilter = comp => (ev, m) => comp === 'all' || (comp === 'league' ? ev.type === 'league'
    : comp === 'p' ? ev.type === 'league' && m.d === 1 : comp === 'c' ? ev.type === 'league' && m.d === 2 : ev.type === comp);
  // Statistik pemain sepanjang musim: penampilan, rata-rata rating, gol, assist, clean sheet
  function seasonPlayers(comp = 'league') {
    const inc = compFilter(comp);
    const map = new Map();
    let cur = null; // laga yang sedang dihitung
    const get = (cid, num, direct) => {
      const pid = direct || pidAt(cur, cid, num);
      const k = pid || cid + ':' + num;
      if (!map.has(k)) map.set(k, { cid, num, pid, role: pid ? P(pid).role : ROLE_OF[num], name: pid ? P(pid).name : pname(cid, num, cur), apps: 0, sum: 0, g: 0, a: 0, cs: 0 });
      return map.get(k);
    };
    for (const ev of save.events) {
      for (const m of ev.matches) {
        if (!m.played || !inc(ev, m)) continue;
        cur = m;
        if (!m.ratings) m.ratings = genRatings(m); // data lama tanpa rating
        for (const [side, cid, conc] of [['h', m.h, m.as], ['a', m.a, m.hs]]) {
          if (m.pr) {
            // rating per pemain (termasuk pengganti)
            for (const [pid, r] of Object.entries(m.pr[side] || {})) {
              if (!P(pid)) continue;
              const p = get(cid, null, pid);
              p.apps++; p.sum += r;
              if (conc === 0 && (p.role === 'GK' || p.role === 'DF')) p.cs++;
            }
            continue;
          }
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
          get(g.c, g.s, g.sp).g++;
          if (g.a != null) get(g.c, g.a, g.ap).a++;
        }
      }
    }
    for (const p of map.values()) p.avg = p.apps ? p.sum / p.apps : 0;
    return [...map.values()];
  }

  // Dream Team: rata-rata rating tertinggi per posisi (1 kiper, 2 bek, 2 gelandang, 1 penyerang)
  // mode 2 divisi: dihitung dari semua kompetisi, hanya pemain klub Premiere
  const awardComp = () => (isDiv() ? 'all' : 'league');
  function dreamTeam() {
    const ps = seasonPlayers(awardComp()).filter(p => p.apps >= 10 && inPremiere(p.cid));
    const best = (role, n) => ps.filter(p => p.role === role).sort((a, b) => b.avg - a.avg || b.g + b.a - (a.g + a.a)).slice(0, n);
    return [...best('GK', 1), ...best('DF', 2), ...best('MF', 2), ...best('FW', 1)]
      .map(p => ({ c: p.cid, num: p.num, role: p.role, name: p.name, avg: Math.round(p.avg * 100) / 100 }));
  }

  // Pemain Terbaik Musim: skor gabungan rating, gol, assist, clean sheet & prestasi tim
  const POTS = { RATING: 10, GOAL: 2, ASSIST: 1.5, CS: 0.8, LEAGUE: 12, CUP: 6, UCL: 10, TOP4: 3 };
  function playerOfSeason(table, cupWinner, uclWinner) {
    const champ = table[0].id, top4 = table.slice(0, 4).map(r => r.id);
    const list = seasonPlayers(awardComp()).filter(p => p.apps >= 10 && inPremiere(p.cid)).map(p => {
      const lg = p.cid === champ, cup = p.cid === cupWinner, ucl = !!uclWinner && p.cid === uclWinner, t4 = !lg && top4.includes(p.cid);
      const score = p.avg * POTS.RATING + p.g * POTS.GOAL + p.a * POTS.ASSIST + p.cs * POTS.CS
        + (lg ? POTS.LEAGUE : 0) + (cup ? POTS.CUP : 0) + (ucl ? POTS.UCL : 0) + (t4 ? POTS.TOP4 : 0);
      return { c: p.cid, num: p.num, role: p.role, name: p.name, avg: Math.round(p.avg * 100) / 100,
        g: p.g, a: p.a, cs: p.cs, league: lg, cup, ucl, top4: t4, score: Math.round(score * 10) / 10 };
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
        ${p.league ? '<span>🏆 Juara Liga</span>' : ''}${p.cup ? '<span>🥇 Juara Piala</span>' : ''}${p.ucl ? '<span>⭐ Juara UCL</span>' : ''}${p.top4 ? '<span>4 Besar</span>' : ''}
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
    const side = c => (m.goals || []).filter(g => g.c === c).map(g => `<div>⚽ ${goalLine(g, m)}</div>`).join('') || '<div class="muted">-</div>';
    showModal(`
      <h2>${eventTitle(ev, m)}</h2>
      <div class="final">${m.hs} : ${m.as}</div>
      <p><b style="color:${H.color}">${h(H.name)}</b> vs <b style="color:${A.color}">${h(A.name)}</b>${m.ph != null ? ` · pen ${m.ph}-${m.pa}` : ''}</p>
      <div class="scorers"><div>${side(m.h)}</div><div>${side(m.a)}</div></div>
      ${(m.subs || []).length ? `<div class="scorers subs-sim"><div>${m.subs.filter(x => x.c === m.h).map(x => `<div>${subLine(x)}</div>`).join('') || '<div class="muted">-</div>'}</div>
        <div>${m.subs.filter(x => x.c === m.a).map(x => `<div>${subLine(x)}</div>`).join('') || '<div class="muted">-</div>'}</div></div>` : ''}
      <h4 class="aw-h">Rating Pemain</h4>
      ${matchRatingTable(m)}
      <div class="btns"><button class="btn primary" id="btnInstOk">Lanjut</button></div>`);
    await new Promise(r => { el('btnInstOk').onclick = r; });
    hideModal();
  }

  function matchRatingTable(m) {
    const list = (cid, side) => {
      if (!(m.pr && m.lu)) return NUMS.map(n => ({ id: cid + n, num: n, name: pname(cid, n, m), role: ROLE_OF[n], r: m.ratings[side][n] }));
      const rows = [];
      for (const n of NUMS) {
        const pid = m.lu[side][n], sub = (m.subs || []).find(x => x.c === cid && x.out === pid);
        rows.push({ id: pid, num: n, name: P(pid).name, role: ROLE_OF[n], r: m.pr[side][pid], subOut: !!sub });
        if (sub) rows.push({ id: sub.in, num: n, name: P(sub.in).name, role: ROLE_OF[n], r: m.pr[side][sub.in], subIn: true });
      }
      return rows.filter(r => r.r != null);
    };
    const all = [...list(m.h, 'h'), ...list(m.a, 'a')].sort((a, b) => b.r - a.r);
    return ratingTable({ home: list(m.h, 'h'), away: list(m.a, 'a') }, club(m.h), club(m.a), all[0] && all[0].id);
  }

  // top skor & assist per kompetisi; elig = klub yang boleh masuk daftar
  function playerStats(comp = 'league', elig = () => true) {
    const inc = compFilter(comp);
    const goals = new Map(), assists = new Map();
    const add = (map, cid, num, m, direct) => {
      const pid = direct || pidAt(m, cid, num);
      const k = pid || cid + ':' + num;
      const e = map.get(k) || { cid, num, name: pid && P(pid) ? P(pid).name : pname(cid, num, m), n: 0 };
      e.n++; map.set(k, e);
    };
    for (const ev of save.events) {
      for (const m of ev.matches) for (const g of m.goals || []) {
        if (!m.played || !inc(ev, m) || !elig(g.c) || g.og || g.s == null) continue;
        add(goals, g.c, g.s, m, g.sp);
        if (g.a != null) add(assists, g.c, g.a, m, g.ap);
      }
    }
    const top = map => [...map.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).slice(0, 10);
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
      Sound.play(goal ? 'penGoal' : 'penMiss');
      el('soHS').textContent = ph; el('soAS').textContent = pa;
    }
    const w = so.ph > so.pa ? H : A;
    el('soRes').innerHTML = `<b style="color:${w.color}">${h(w.name)}</b> menang adu penalti ${so.ph}-${so.pa}`;
    el('btnSoOk').classList.remove('hidden');
    await new Promise(r => { el('btnSoOk').onclick = r; });
    hideModal();
  }

  /* ---------- klasemen ---------- */
  function tableOf(ids, inc) {
    const rows = new Map(ids.map(id => [id, { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] }]));
    for (const ev of save.events) {
      for (const m of ev.matches) {
        if (!m.played || !inc(ev, m)) continue;
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
  function standings(div = 1) {
    if (!isDiv()) return tableOf(save.clubs.map(c => c.id), ev => ev.type === 'league');
    return tableOf(save.divs[div], (ev, m) => ev.type === 'league' && m.d === div);
  }
  const groupTable = gi => tableOf(save.groups[gi], (ev, m) => ev.type === 'ucl' && !ev.ko && m.g === gi);

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
          <div><h1>${me ? h(me.name) : 'Liga Komputer'}</h1><small>${isDiv() && me ? DIV_NAME[me.div] : 'Liga Mini Eropa'} · Musim ${seasonName(save.year)}${me ? '' : ' · semua laga Hard vs Hard'}</small></div>
          ${me && isMarket() ? `<div class="money">💰 ${fmtM(me.money)}</div>` : ''}
        </div>
        <div class="hub-actions">
          ${me ? `<label class="lvl-select">🎚️ Tingkat
            <select id="hubLevel">${LEVELS.map(([k, n]) => `<option value="${k}" ${k === save.difficulty ? 'selected' : ''}>${n}</option>`).join('')}</select>
          </label>` : ''}
          <button class="btn ghost" id="hubMenu">🏠 Menu Utama</button>
        </div>
      </header>
      <section class="next-card">${isCpu() ? cpuCard(ev) : isMarket() && save.window ? windowCard() : nextCard(ev, um)}</section>
      <nav class="tabs">
        ${[...(isMarket() ? [['my', 'Skuad Saya'], ['shop', 'Toko Pemain']] : []), ['table', 'Klasemen'], ['fixtures', 'Jadwal & Hasil'], ['stats', 'Statistik Pemain'], ['squads', 'Skuad'], ['cup', 'Piala'], ...(isDiv() ? [['ucl', 'UCL']] : []), ['history', 'Juara & Penghargaan']]
          .map(([k, n]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}
      </nav>
      <section class="tab-body">${tabBody()}</section>`;
    el('hubMenu').onclick = () => showMainMenu();
    if (el('hubLevel')) el('hubLevel').onchange = e => { save.difficulty = e.target.value; persist(); };
    hub.querySelectorAll('[data-watch]').forEach(b => { b.onclick = () => watchMatch(+b.dataset.watch); });
    hub.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { tab = b.dataset.tab; showHub(); }; });
    hub.querySelectorAll('[data-play]').forEach(b => { b.onclick = () => playUserMatch(b.dataset.play); });
    // pasar: atur susunan inti, beli, jual, filter toko, tutup jendela
    hub.querySelectorAll('[data-slot]').forEach(sel => { sel.onchange = () => { setSlot(club(save.user), +sel.dataset.slot, sel.value); persist(); showHub(); }; });
    hub.querySelectorAll('[data-buy]').forEach(b => { b.onclick = async () => {
      const c = club(save.user), p = P(b.dataset.buy);
      if (!(await confirmTrade('buy', c, p))) return;
      const r = buy(c, p.id);
      if (r === 'refused') {
        persist();
        showModal(`<h2>❌ Tawaran Ditolak</h2><p><b>${h(p.name)}</b> (${p.tier}) tidak mau bergabung dengan ${h(c.name)} musim ini.</p>
          <p class="muted">${club(c.id).div === 2 ? 'Pemain bagus enggan bermain di Championship.' : 'Pemain bintang lebih tertarik ke klub yang baru meraih trofi.'} Kamu bisa mencoba lagi musim depan.</p>
          <div class="btns"><button class="btn primary" id="btnRefOk">OK</button></div>`);
        el('btnRefOk').onclick = () => { hideModal(); showHub(); };
      } else if (r) { persist(); showHub(); }
    }; });
    hub.querySelectorAll('[data-sell]').forEach(b => { b.onclick = async () => {
      const c = club(save.user), p = P(b.dataset.sell);
      if (!(await confirmTrade('sell', c, p))) return;
      if (sell(c, p.id)) { persist(); showHub(); }
    }; });
    hub.querySelectorAll('[data-frole]').forEach(b => { b.onclick = () => { shopRole = b.dataset.frole; showHub(); }; });
    hub.querySelectorAll('[data-ftier]').forEach(b => { b.onclick = () => { shopTier = b.dataset.ftier; showHub(); }; });
    hub.querySelectorAll('[data-fage]').forEach(b => { b.onclick = () => { shopAge = b.dataset.fage; showHub(); }; });
    hub.querySelectorAll('[data-vdiv]').forEach(b => { b.onclick = () => { divView = +b.dataset.vdiv; showHub(); }; });
    hub.querySelectorAll('[data-scomp]').forEach(b => { b.onclick = () => { statComp = b.dataset.scomp; showHub(); }; });
    if (el('btnAutoLineup')) el('btnAutoLineup').onclick = () => { autoLineup(club(save.user)); persist(); showHub(); };
    if (el('btnCloseWindow')) el('btnCloseWindow').onclick = () => closeWindow();
    const sim = el('btnSimEvent');
    if (sim) sim.onclick = () => finishEvent();
    const prev = el('evPrev'), next = el('evNext');
    if (prev) prev.onclick = () => { viewEvent = Math.max(0, viewEvent - 1); showHub(); };
    if (next) next.onclick = () => { viewEvent = Math.min(save.events.length - 1, viewEvent + 1); showHub(); };
  }

  // Jendela transfer pra-musim (liga Main Sendiri)
  function windowCard() {
    const me = club(save.user), issues = squadIssues(me);
    return `<div class="nc-title">Jendela Transfer · Pra-musim ${seasonName(save.year)}</div>
      <p class="nc-sub">Beli/jual pemain dan atur pemain inti di tab <b>Skuad Saya</b> & <b>Toko Pemain</b>.
        Skuad ${MARKET.MIN_SQUAD}–${MARKET.MAX_SQUAD} pemain${save.firstWindow ? `, <b>musim pertama wajib ${MARKET.MIN_FIRST} pemain</b> (beli 2 cadangan)` : ''}.
        Transfer hanya bisa sekarang, sebelum musim dimulai. Klub komputer bertransaksi setelah kamu memulai musim.</p>
      <div class="win-stat"><span>Skuad <b>${me.roster.length}/${MARKET.MAX_SQUAD}</b></span><span>Uang <b>${fmtM(me.money)}</b></span></div>
      ${issues.length ? `<ul class="win-issues">${issues.map(x => `<li>⚠️ ${h(x)}</li>`).join('')}</ul>` : '<p class="nc-sub ok">✅ Skuad siap.</p>'}
      <div class="nc-actions"><button class="btn primary" id="btnCloseWindow" ${issues.length ? 'disabled' : ''}>✅ Mulai Musim ${seasonName(save.year)}</button></div>`;
  }

  // tampilan satu pemain (nama, posisi, tier, ciri)
  const ROLE_SHORT = { GK: 'KIP', DF: 'BEK', MF: 'GEL', FW: 'PEN' };
  const grade = v => v >= 4 ? 'S+' : v >= 3 ? 'S' : v >= 2 ? 'A' : v >= 1 ? 'B' : v >= 0 ? 'C' : 'D';
  const gradeCell = (v, key) => `<td><span class="ag g${grade(v).replace('+', 'p')}" title="${key}">${grade(v)}</span></td>`;
  const attrCells = p => ['sht', 'pas', 'def', 'ctl'].map(a => gradeCell(attr(p, a), a)).join('') + (p.role === 'GK' ? gradeCell(attr(p, 'kep'), 'kep') : '<td class="muted">-</td>');
  const tierBadge = t => `<span class="tier-b t${t}">${t}</span>`;
  const ageCell = p => `<span class="age${p.age <= 21 ? ' young' : p.age >= 33 ? ' old' : ''}">${p.age}</span>`;
  const AGE_FILTER = { all: () => true, u21: a => a <= 21, mid: a => a >= 22 && a <= 29, old: a => a >= 30 };
  const traitIcons = p => p.traits.map(t => TRAITS[t].icon).join('');
  let shopRole = 'all', shopTier = 'all', shopAge = 'all';
  let divView = null, statComp = null; // tampilan divisi (klasemen/skuad) & kompetisi (statistik)
  const curDivView = () => divView || (save.user ? divOf(save.user) : 1);
  const divSeg = () => `<div class="seg div-seg">${[1, 2].map(d => `<button type="button" data-vdiv="${d}" class="${curDivView() === d ? 'on' : ''}">${DIV_NAME[d]}</button>`).join('')}</div>`;

  // jendela konfirmasi beli / jual pemain
  function confirmTrade(kind, c, p) {
    const amount = kind === 'buy' ? price(p) : sellPrice(p);
    const after = kind === 'buy' ? c.money - amount : c.money + amount;
    showModal(`
      <h2>${kind === 'buy' ? '🛒 Beli Pemain' : '💸 Jual Pemain'}</h2>
      <div class="trade-p"><b>${h(p.name)}</b> ${traitIcons(p)}<span>${ROLE_ID[p.role]} · Tier ${tierBadge(p.tier)}</span></div>
      <table class="tbl trade-tbl"><tbody>
        <tr><td class="l">${kind === 'buy' ? 'Harga' : 'Harga jual (40%)'}</td><td><b>${fmtM(amount)}</b></td></tr>
        ${kind === 'sell' ? `<tr><td class="l">Harga di toko</td><td>${fmtM(price(p))}</td></tr>` : ''}
        <tr><td class="l">Uang sekarang</td><td>${fmtM(c.money)}</td></tr>
        <tr><td class="l">Uang setelahnya</td><td><b>${fmtM(after)}</b></td></tr>
        <tr><td class="l">Skuad setelahnya</td><td>${c.roster.length + (kind === 'buy' ? 1 : -1)}/${MARKET.MAX_SQUAD}</td></tr>
        ${kind === 'buy' && isDiv() ? `<tr><td class="l">Minat bergabung</td><td>${willLabel(willChance(c, p)).join(' ')}</td></tr>` : ''}
      </tbody></table>
      ${kind === 'sell' ? '<p class="muted">Pemain yang dijual kembali ke toko dengan harga penuh dan bisa dibeli klub lain.</p>' : ''}
      <div class="btns"><button class="btn ghost" id="btnTradeNo">Batal</button>
        <button class="btn primary" id="btnTradeYes">${kind === 'buy' ? 'Ya, beli' : 'Ya, jual'}</button></div>`);
    return new Promise(res => {
      el('btnTradeYes').onclick = () => { hideModal(); res(true); };
      el('btnTradeNo').onclick = () => { hideModal(); res(false); };
    });
  }

  // Statistik pemain satu klub di semua laga musim ini (liga + piala): main, gol, assist, rata-rata rating
  function clubPlayerStats(cid) {
    const st = {};
    const get = pid => st[pid] || (st[pid] = { apps: 0, sum: 0, g: 0, a: 0 });
    for (const ev of save.events) for (const m of ev.matches) {
      if (!m.played || (m.h !== cid && m.a !== cid)) continue;
      const side = m.h === cid ? 'h' : 'a';
      if (m.pr && m.pr[side]) {
        for (const [pid, r] of Object.entries(m.pr[side])) { const x = get(pid); x.apps++; x.sum += r; }
      } else if (m.lu && m.ratings && m.ratings[side]) {
        for (const n of NUMS) { const pid = m.lu[side][n], r = m.ratings[side][n]; if (pid && r != null) { const x = get(pid); x.apps++; x.sum += r; } }
      }
      for (const g of m.goals || []) {
        if (g.c !== cid || g.og) continue;
        const sp = g.sp || pidAt(m, cid, g.s), ap = g.ap || (g.a != null ? pidAt(m, cid, g.a) : null);
        if (sp) get(sp).g++;
        if (ap) get(ap).a++;
      }
    }
    for (const x of Object.values(st)) x.avg = x.apps ? x.sum / x.apps : null;
    return st;
  }
  // saat jendela transfer: tampilkan statistik musim lalu (musim baru belum ada laga)
  function myStats() {
    if (save.window && save.lastStats) return { label: `Musim ${save.lastStats.season}`, st: save.lastStats.stats };
    return { label: save.window ? 'Musim ini (belum ada laga)' : `Musim ${seasonName(save.year)}`, st: clubPlayerStats(save.user) };
  }
  const statCells = x => x && x.apps
    ? `<td>${x.apps}</td><td>${x.g}</td><td>${x.a}</td><td><span class="rt ${ratingCls(x.avg)}">${x.avg.toFixed(2)}</span></td>`
    : '<td class="muted">0</td><td class="muted">-</td><td class="muted">-</td><td class="muted">-</td>';

  function myTab() {
    const c = club(save.user), inLineup = id => NUMS.some(n => c.lineup[n] === id);
    const bench = c.roster.filter(id => !inLineup(id)).map(P);
    const ms = myStats();
    const opt = (n, sel) => c.roster.map(P).filter(p => (p.role === 'GK') === (n === 1))
      .map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${h(p.name)} (${ROLE_SHORT[p.role]} · ${p.tier} · ${p.age} th)</option>`).join('');
    return `<div class="my-head"><span>💰 Uang <b>${fmtM(c.money)}</b></span><span>Skuad <b>${c.roster.length}/${MARKET.MAX_SQUAD}</b></span>
        <span>${save.window ? '🟢 Jendela transfer <b>terbuka</b>' : '🔒 Jendela transfer tutup (buka lagi sebelum musim berikutnya)'}</span>
        <button class="btn sm" id="btnAutoLineup">⚡ Susun otomatis</button></div>
      <h4 class="aw-h">Pemain Inti <small class="muted st-label">· statistik ${h(ms.label)} (liga + piala)</small></h4>
      <div class="tbl-wrap"><table class="tbl my-tbl"><thead><tr><th>Posisi</th><th class="l">Pemain</th><th>Umur</th><th>Tier</th><th>Tem</th><th>Ope</th><th>Ber</th><th>Kon</th><th>Kip</th>
        <th class="st-h" title="Jumlah main">Main</th><th class="st-h">Gol</th><th class="st-h">Ast</th><th class="st-h" title="Rata-rata rating">Rating</th></tr></thead><tbody>
      ${NUMS.map(n => { const p = P(c.lineup[n]), et = effTier(p, n), off = p.role !== ROLE_OF[n];
        const pp = { ...p, role: ROLE_OF[n], tier: et };
        return `<tr><td><b>${SLOT_LABEL[n]}</b></td>
          <td class="l"><select data-slot="${n}">${opt(n, p.id)}</select> ${traitIcons(p)}${off ? ` <small class="warn" title="Bermain di luar posisi: tier turun 1">⚠️ luar posisi</small>` : ''}</td>
          <td>${ageCell(p)}</td><td>${tierBadge(et)}</td>${attrCells(pp)}${statCells(ms.st[p.id])}</tr>`; }).join('')}
      </tbody></table></div>
      <p class="muted sq-note">Pilih pemain untuk tiap posisi (memilih pemain dari posisi lain = tukar). Bermain di luar posisi asli: tier turun 1. Posisi kiper hanya untuk kiper.
        Tiap akhir musim umur +1: pemain muda bisa naik tier, pemain tua menurun (tiap pemain berbeda, juga dipengaruhi rating musim). Umur 45 → kembali ke 17 dengan tier C.</p>
      <h4 class="aw-h">Cadangan (${bench.length})</h4>
      ${bench.length ? `<div class="tbl-wrap"><table class="tbl my-tbl"><thead><tr><th class="l">Pemain</th><th>Posisi</th><th>Umur</th><th>Tier</th><th>Tem</th><th>Ope</th><th>Ber</th><th>Kon</th><th>Kip</th>
        <th class="st-h">Main</th><th class="st-h">Gol</th><th class="st-h">Ast</th><th class="st-h">Rating</th><th>Jual</th></tr></thead><tbody>
        ${bench.map(p => `<tr><td class="l">${h(p.name)} ${traitIcons(p)}</td><td>${ROLE_SHORT[p.role]}</td><td>${ageCell(p)}</td><td>${tierBadge(p.tier)}</td>${attrCells(p)}${statCells(ms.st[p.id])}
          <td>${save.window ? `<button class="btn sm ghost" data-sell="${p.id}" ${canSell(c, p.id) ? '' : 'disabled'}>Jual ${fmtM(sellPrice(p))}</button>` : '<span class="muted">-</span>'}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted">Belum ada cadangan. Beli di tab Toko Pemain saat jendela transfer terbuka.</p>'}
      <h4 class="aw-h">Keuangan</h4>
      ${save.ledger.length ? `<div class="ledger">${save.ledger.slice(0, 15).map(l => `<div><span>${l.season} · ${h(l.label)}</span><b class="${l.amount < 0 ? 'neg' : 'pos'}">${l.amount < 0 ? '−' : '+'}${fmtM(Math.abs(l.amount))}</b></div>`).join('')}</div>` : '<p class="muted">Belum ada transaksi.</p>'}`;
  }

  function shopTab() {
    const c = club(save.user);
    const list = freeAgents().filter(p => (shopRole === 'all' || p.role === shopRole) && (shopTier === 'all' || p.tier === shopTier) && AGE_FILTER[shopAge](p.age))
      .sort((a, b) => price(b) - price(a) || a.name.localeCompare(b.name));
    const why = p => !save.window ? 'Jendela transfer tutup' : soldByMe(c, p.id) ? 'Baru kamu jual (tidak bisa dibeli lagi di jendela ini)'
      : refusedBy(c, p.id) ? 'Menolak klubmu (coba lagi musim depan)'
      : c.roster.length >= MARKET.MAX_SQUAD ? 'Skuad penuh (10)' : c.money + 1e-9 < price(p) ? 'Uang tidak cukup' : '';
    const filt = (key, cur, items) => `<div class="seg">${items.map(([v, n]) => `<button type="button" data-${key}="${v}" class="${cur === v ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    return `<div class="shop-head">
        <span>💰 <b>${fmtM(c.money)}</b> · Skuad ${c.roster.length}/${MARKET.MAX_SQUAD}${save.window ? '' : ' · 🔒 jendela transfer tutup'}</span>
        ${filt('frole', shopRole, [['all', 'Semua'], ['GK', 'Kiper'], ['DF', 'Bek'], ['MF', 'Gelandang'], ['FW', 'Penyerang']])}
        ${filt('ftier', shopTier, [['all', 'Semua tier'], ['S', 'S'], ['A', 'A'], ['B', 'B'], ['C', 'C']])}
        ${filt('fage', shopAge, [['all', 'Semua umur'], ['u21', '≤21'], ['mid', '22–29'], ['old', '30+']])}
      </div>
      <div class="tbl-wrap"><table class="tbl shop-tbl"><thead><tr><th class="l">Pemain</th><th>Posisi</th><th>Umur</th><th>Tier</th><th>Tem</th><th>Ope</th><th>Ber</th><th>Kon</th><th>Kip</th><th>Harga</th>${isDiv() ? '<th title="Minat bergabung dengan klubmu">Minat</th>' : ''}<th></th></tr></thead><tbody>
      ${list.map(p => `<tr><td class="l">${h(p.name)} ${traitIcons(p)}</td><td>${ROLE_SHORT[p.role]}</td><td>${ageCell(p)}</td><td>${tierBadge(p.tier)}</td>${attrCells(p)}
        <td><b>${fmtM(price(p))}</b></td>${isDiv() ? `<td title="${willLabel(willChance(c, p))[1]}">${willLabel(willChance(c, p))[0]}</td>` : ''}
        <td>${why(p) ? `<small class="muted">${why(p)}</small>` : `<button class="btn sm primary" data-buy="${p.id}">Beli</button>`}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="muted sq-note">${list.length} pemain tersedia. Harga dipengaruhi tier, ciri, umur & bakat (pemain muda berbakat lebih mahal). Harga jual kembali ke toko hanya ${MARKET.SELL_RATE * 100}% dari harga toko.${isDiv() ? ` Minat (🟢 tinggi · 🟡 sedang · 🟠 rendah · 🔴 sangat rendah): pemain bagus enggan ke Championship, pemain S lebih memilih klub Premiere yang meraih trofi dalam 2 musim terakhir. Pemain yang menolak bisa dicoba lagi musim depan.` : ''}</p>
      ${save.news.length ? `<h4 class="aw-h">Berita Transfer</h4><div class="news">${save.news.slice(0, 40).map(n => `<div>📰 ${h(n)}</div>`).join('')}</div>` : ''}`;
  }

  function nextCard(ev, um) {
    if (!ev) return `<div class="nc-title">Musim selesai</div>
      <button class="btn primary" id="btnSeasonEnd" onclick="League.endSeason()">Lihat ringkasan musim</button>`;
    const title = `<div class="nc-title">${eventTitle(ev, um)}</div>`;
    if (!um) return `${title}<p class="nc-sub">${h(club(save.user).name)} tidak bermain di babak ini${ev.type === 'ucl' && !inPremiere(save.user) ? ' (UCL khusus tim Premiere)' : isKO(ev) ? ' (sudah tersingkir)' : ''}.</p>
      <div class="nc-actions"><button class="btn primary" id="btnSimEvent">⏭ Simulasikan</button></div>`;
    const H = club(um.h), A = club(um.a);
    return `${title}
      <div class="nc-match">
        <div class="nc-team">${badge(um.h)}<b class="${um.h === save.user ? 'me' : ''}">${h(H.name)}</b><small>Kandang</small></div>
        <div class="nc-vs">VS</div>
        <div class="nc-team">${badge(um.a)}<b class="${um.a === save.user ? 'me' : ''}">${h(A.name)}</b><small>Tandang</small></div>
      </div>
      ${isKO(ev) ? '<p class="nc-sub">Sistem gugur 1 leg. Imbang = adu penalti.</p>' : ev.type === 'ucl' ? '<p class="nc-sub">Fase grup 1 leg: juara & runner-up grup lolos ke perempat final.</p>' : ''}
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
    if ((tab === 'my' || tab === 'shop') && !isMarket()) tab = 'table';
    if (tab === 'my') return myTab();
    if (tab === 'shop') return shopTab();
    if ((tab === 'ucl') && !isDiv()) tab = 'table';
    if (tab === 'table') {
      const dv = isDiv() ? curDivView() : 1;
      const rows = standings(dv);
      const zone = i => !isDiv() ? '' : dv === 1 && i >= rows.length - PROMO ? ' z-down' : dv === 2 && i < PROMO ? ' z-up' : '';
      return `${isDiv() ? `${divSeg()}<p class="muted sq-note">${dv === 1 ? `Semua tim Premiere ikut UCL. ${PROMO} tim terbawah turun ke Championship.` : `${PROMO} tim teratas naik ke Premiere.`}</p>` : ''}<div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>#</th><th class="l">Tim</th><th>Main</th><th>M</th><th>S</th><th>K</th><th>GM</th><th>GK</th><th>SG</th><th>Poin</th><th class="form-h">5 Terakhir</th></tr></thead>
        <tbody>${rows.map((r, i) => `<tr class="${isMe(r.id) ? 'me-row' : ''}${i === 0 ? ' top' : ''}${zone(i)}">
          <td>${i + 1}</td><td class="l">${nameCell(r.id)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>
          <td>${r.gf}</td><td>${r.ga}</td><td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td><b>${r.pts}</b></td>
          <td class="form">${r.form.slice(-5).map(f => `<i class="f${f}">${f}</i>`).join('')}</td></tr>`).join('')}</tbody>
      </table></div>`;
    }
    if (tab === 'fixtures') {
      if (viewEvent == null) viewEvent = Math.min(save.next, save.events.length - 1);
      const ev = save.events[viewEvent];
      const fxRow = m => `
        <div class="fx ${isMe(m.h) || isMe(m.a) ? 'me-row' : ''}">
          <span class="fx-h">${h(club(m.h).name)} ${badge(m.h)}</span>
          <span class="fx-s">${m.played ? `${m.hs} - ${m.as}` : 'vs'}</span>
          <span class="fx-a">${badge(m.a)} ${h(club(m.a).name)}</span>
          ${m.ph != null ? `<small class="fx-p">pen ${m.ph}-${m.pa}</small>` : ''}
          ${m.goals && m.goals.length ? `<small class="fx-g"><span>${m.goals.filter(g => g.c === m.h).map(g => goalLine(g, m)).join(', ')}</span><span>${m.goals.filter(g => g.c === m.a).map(g => goalLine(g, m)).join(', ')}</span></small>` : ''}
        </div>`;
      const sec = (title, ms) => `<h4 class="aw-h fx-sec">${title}</h4>${ms.map(fxRow).join('')}`;
      let list;
      if (!ev.matches.length) list = '<p class="muted">Pasangan ditentukan setelah babak sebelumnya selesai.</p>';
      else if (isDiv() && ev.type === 'league') {
        const mine = divOf(save.user), order = mine === 2 ? [2, 1] : [1, 2];
        list = order.map(d => sec(DIV_NAME[d], ev.matches.filter(m => m.d === d))).join('');
      } else if (ev.type === 'ucl' && !ev.ko) list = GROUP_NAME.map((g, gi) => sec(`Grup ${g}`, ev.matches.filter(m => m.g === gi))).join('');
      else list = ev.matches.map(fxRow).join('');
      return `<div class="ev-nav">
          <button class="btn" id="evPrev" ${viewEvent === 0 ? 'disabled' : ''}>←</button>
          <b>${eventTitle(ev)}</b>
          <button class="btn" id="evNext" ${viewEvent === save.events.length - 1 ? 'disabled' : ''}>→</button>
        </div>${list}`;
    }
    if (tab === 'stats') {
      const COMPS = [['p', 'Premiere'], ['c', 'Championship'], ['cup', 'Piala'], ['ucl', 'UCL']];
      const comp = isDiv() ? (statComp || (divOf(save.user) === 2 ? 'c' : 'p')) : 'league';
      const cname = isDiv() ? COMPS.find(x => x[0] === comp)[1] : 'Liga';
      const st = playerStats(comp);
      const list = (rows, unit) => rows.length ? `<table class="tbl"><tbody>${rows.map((r, i) => `<tr class="${isMe(r.cid) ? 'me-row' : ''}">
          <td>${i + 1}</td><td class="l"><b>${h(r.name)}</b></td><td class="l">${nameCell(r.cid)}</td><td><b>${r.n}</b> ${unit}</td></tr>`).join('')}</tbody></table>`
        : '<p class="muted">Belum ada data.</p>';
      // rating rata-rata (minimal tampil di separuh laga terbanyak pada kompetisi ini)
      const sp = seasonPlayers(comp);
      const played = Math.max(0, ...sp.map(p => p.apps));
      const rated = sp.filter(p => p.apps >= Math.max(1, Math.ceil(played / 2))).sort((a, b) => b.avg - a.avg).slice(0, 10);
      const rtList = rated.length ? `<table class="tbl"><tbody>${rated.map((p, i) => `<tr class="${isMe(p.cid) ? 'me-row' : ''}">
          <td>${i + 1}</td><td class="l"><b>${h(p.name)}</b> <small class="muted">${ROLE_ID[p.role]}</small></td><td class="l">${nameCell(p.cid)}</td>
          <td><span class="rt ${ratingCls(p.avg)}">${p.avg.toFixed(2)}</span></td></tr>`).join('')}</tbody></table>` : '<p class="muted">Belum ada data.</p>';
      return `${isDiv() ? `<div class="seg div-seg">${COMPS.map(([k, n]) => `<button type="button" data-scomp="${k}" class="${comp === k ? 'on' : ''}">${n}</button>`).join('')}</div>` : ''}
        <div class="stats-grid">
        <div><h4>👟 Top Skor ${cname}</h4>${list(st.goals, 'gol')}</div>
        <div><h4>🎯 Top Assist ${cname}</h4>${list(st.assists, 'assist')}</div>
        <div><h4>⭐ Rating Rata-rata Tertinggi</h4>${rtList}</div>
      </div>`;
    }
    if (tab === 'squads') {
      // tier, ciri & atribut setiap pemain; tim diurutkan dari yang terkuat
      const grade = v => v >= 4 ? 'S+' : v >= 3 ? 'S' : v >= 2 ? 'A' : v >= 1 ? 'B' : v >= 0 ? 'C' : 'D';
      const cell = (v, key) => `<td><span class="ag g${grade(v).replace('+', 'p')}" title="${key}">${grade(v)}</span></td>`;
      const clubs = save.clubs.filter(c => !isDiv() || c.div === curDivView()).sort((a, b) => lineupStrength(b.id) - lineupStrength(a.id));
      return `${isDiv() ? divSeg() : ''}<p class="muted sq-note">Atribut: <b>Tem</b>bak · <b>Ope</b>r · <b>Ber</b>tahan · <b>Kon</b>trol · <b>Kip</b>er. Ciri: 🎯 Finisher · 🅿️ Pengumpan · 💨 Dribbler · 🧱 Tembok.</p>
        <div class="sq-grid">${clubs.map(c => `<div class="sq ${isMe(c.id) ? 'me-row' : ''}">
          <div class="sq-head">${badge(c.id)}<b>${h(c.name)}</b>${isMarket() ? `<small class="muted">💰 ${fmtM(c.money)}</small>` : ''}<small title="Dari tier 6 pemain inti">${stars(lineupStrength(c.id))}</small></div>
          <table class="tbl sq-tbl"><thead><tr><th class="l">Pemain</th>${isMarket() ? '<th>Umur</th>' : ''}<th>Tier</th><th>Tem</th><th>Ope</th><th>Ber</th><th>Kon</th><th>Kip</th></tr></thead><tbody>
          ${NUMS.map(n => { const ps = pseudo(c.id, n), tr = (c.traits || {})[n] || [];
            return `<tr><td class="l"><small class="muted">${ROLE_ID[ps.role].slice(0, 3)}</small> ${h(pname(c.id, n))} ${tr.map(t => TRAITS[t].icon).join('')}</td>
              ${isMarket() && P(c.lineup[n]) ? `<td>${ageCell(P(c.lineup[n]))}</td>` : ''}<td><span class="tier-b t${ps.tier}">${ps.tier}</span></td>
              ${['sht', 'pas', 'def', 'ctl'].map(a => cell(attr(ps, a), a)).join('')}${ps.role === 'GK' ? cell(attr(ps, 'kep'), 'kep') : '<td class="muted">-</td>'}</tr>`; }).join('')}
          ${isMarket() ? c.roster.filter(id => !NUMS.some(n => c.lineup[n] === id)).map(P).map(p => `<tr class="bench-row"><td class="l"><small class="muted">Cad</small> ${h(p.name)} ${traitIcons(p)} <small class="muted">${ROLE_SHORT[p.role]}</small></td>
              <td>${ageCell(p)}</td><td>${tierBadge(p.tier)}</td>${attrCells(p)}</tr>`).join('') : ''}
          </tbody></table></div>`).join('')}</div>`;
    }
    if (tab === 'cup') {
      return bracket('cup', cupRounds(), isDiv() ? 16 : 8);
    }
    if (tab === 'ucl') {
      const groups = save.groups.map((g, gi) => { const rows = groupTable(gi);
        return `<div class="grp"><h4>Grup ${GROUP_NAME[gi]}</h4><table class="tbl"><thead><tr><th>#</th><th class="l">Tim</th><th>Main</th><th>SG</th><th>Poin</th></tr></thead>
          <tbody>${rows.map((r, i) => `<tr class="${isMe(r.id) ? 'me-row' : ''}${i < 2 ? ' z-up' : ''}"><td>${i + 1}</td><td class="l">${nameCell(r.id)}</td><td>${r.p}</td>
          <td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td><b>${r.pts}</b></td></tr>`).join('')}</tbody></table></div>`; }).join('');
      return `<p class="muted sq-note">16 tim Premiere · fase grup 1 leg, juara & runner-up grup lolos ke perempat final (sistem gugur 1 leg).</p>
        <div class="grp-grid">${groups}</div><h4 class="aw-h">Fase Gugur</h4>${bracket('ucl', UCL_ROUNDS, 4)}`;
    }
    // riwayat juara
    return historyTab();
  }
  // bagan sistem gugur (piala / UCL)
  function bracket(type, names, first) {
    const cols = names.map((name, r) => {
      const ev = save.events.find(e => e.type === type && isKO(e) && e.round === r);
      const ms = ev.matches.length ? ev.matches : Array.from({ length: first >> r }, () => null);
      return `<div class="br-col"><h4>${name}</h4><div class="br-list">${ms.map(m => m ? `
        <div class="br-m">
          <div class="${m.winner === m.h ? 'win' : m.played ? 'lose' : ''}">${nameCell(m.h)}<em>${m.played ? m.hs : ''}</em></div>
          <div class="${m.winner === m.a ? 'win' : m.played ? 'lose' : ''}">${nameCell(m.a)}<em>${m.played ? m.as : ''}</em></div>
          ${m.ph != null ? `<small>pen ${m.ph}-${m.pa}</small>` : ''}
        </div>` : '<div class="br-m empty"><div>?</div><div>?</div></div>').join('')}</div></div>`;
    }).join('');
    return `<div class="bracket">${cols}</div>`;
  }
  function historyTab() {
    if (!save.history.length) return '<p class="muted">Belum ada musim yang selesai. Juara liga & piala, Pemain Terbaik, dan Dream Team tiap musim akan tercatat di sini.</p>';
    const me = save.user ? club(save.user) : null;
    const D = isDiv();
    const table = `<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th class="l">Musim</th><th class="l">🏆 ${D ? 'Premiere' : 'Juara Liga'}</th>${D ? '<th class="l">🥈 Championship</th>' : ''}<th class="l">🥇 Juara Piala</th>${D ? '<th class="l">⭐ UCL</th>' : ''}<th class="l">🏅 Pemain Terbaik</th><th class="l">👟 Top Skor</th><th class="l">🎯 Top Assist</th>${me ? `<th>Posisi ${h(me.name)}</th><th class="l">Piala</th>` : ''}</tr></thead>
      <tbody>${save.history.slice().reverse().map(x => `<tr>
        <td class="l">${x.season}</td><td class="l">${nameCell(x.league)}</td>${D ? `<td class="l">${x.ch ? nameCell(x.ch) : '-'}</td>` : ''}<td class="l">${nameCell(x.cup)}</td>${D ? `<td class="l">${x.ucl ? nameCell(x.ucl) : '-'}</td>` : ''}
        <td class="l">${x.pots ? `${h(x.pots.name)} <small class="muted">(${h(club(x.pots.c).name)})</small>` : '-'}</td>
        <td class="l">${x.topScorer ? `${h(x.topScorer.name)} (${x.topScorer.n})` : '-'}</td>
        <td class="l">${x.topAssist ? `${h(x.topAssist.name)} (${x.topAssist.n})` : '-'}</td>
        ${me ? `<td>${x.userPos ?? '-'}${x.userDiv ? ` <small class="muted">${DIV_NAME[x.userDiv]}</small>` : ''}</td><td class="l">${x.userCup ?? '-'}${x.userUcl ? ` <small class="muted">· UCL ${x.userUcl}</small>` : ''}</td>` : ''}</tr>`).join('')}</tbody>
    </table></div>`;
    const awards = save.history.slice().reverse().filter(x => x.pots || x.dream).map(x => `
      <div class="aw-season"><h4 class="aw-h">Musim ${x.season}</h4>
        ${x.promo ? `<div class="promo-box"><div>⬆️ Naik: ${x.promo.up.map(id => h(club(id).name)).join(', ')}</div><div>⬇️ Turun: ${x.promo.down.map(id => h(club(id).name)).join(', ')}</div></div>` : ''}
        ${x.pots ? potsCard(x.pots) : ''}
        ${x.dream ? `<div class="aw-sub">⭐ Dream Team</div>${dreamPitch(x.dream)}` : ''}
      </div>`).join('');
    return table + awards;
  }

  return { hasSave, open, newCareer, hideHub, showHub, endSeason, _debug: () => save };
})();
