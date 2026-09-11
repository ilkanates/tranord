/**
 * MÜZİK — arka plan çalar.
 *
 * TARAYICI KURALI: kullanıcı sayfayla etkileşmeden önce sesli oynatma
 * engelleniyor (Chrome/Safari "autoplay policy"). Bu yüzden çalar açılışta
 * bir kez denenir; engellenirse İLK tıklama/tuşa basma anında kendiliğinden
 * başlar. Kullanıcı sessizi açıkça seçtiyse hiç denenmez.
 *
 * Modül seviyesinde TEK örnek: React StrictMode bileşenleri iki kez
 * kurduğu için bileşen içinde audio yaratmak iki müzik çalıyordu.
 */

const STORE_KEY = 'tn.audio';

/**
 * Ana menü / oyun müzikleri — client/public/muzik/ altında servis edilir.
 *
 * `public/` altında duruyorlar, yani derlemeye GÖMÜLMÜYORLAR: tarayıcı
 * yalnızca çalınan parçayı indiriyor. Toplam ~56 MB olmasının ilk açılış
 * süresine etkisi bu yüzden yok.
 */
export const TRACKS = [
  { src: '/muzik/vindstillhet-1.mp3', name: 'Vindstillhet I' },
  { src: '/muzik/vindstillhet-2.mp3', name: 'Vindstillhet II' },
  { src: '/muzik/vintersorg-1.mp3',   name: 'Vintersorg I' },
  { src: '/muzik/vintersorg-2.mp3',   name: 'Vintersorg II' },
  { src: '/muzik/skoldborg-1.mp3',    name: 'Sköldborg I' },
  { src: '/muzik/skoldborg-2.mp3',    name: 'Sköldborg II' },
  { src: '/muzik/vindvidd-1.mp3',     name: 'Vindvidd I' },
  { src: '/muzik/vindvidd-2.mp3',     name: 'Vindvidd II' },
  { src: '/muzik/white-road-1.mp3',   name: 'White Road I' },
  { src: '/muzik/white-road-2.mp3',   name: 'White Road II' },
  { src: '/muzik/cold-and-open-sky-1.mp3', name: 'Cold and Open Sky I' },
  { src: '/muzik/cold-and-open-sky-2.mp3', name: 'Cold and Open Sky II' },
  { src: '/muzik/kuzeyin-ogullari-1.mp3',  name: 'Kuzeyin Oğulları I' },
  { src: '/muzik/kuzeyin-ogullari-2.mp3',  name: 'Kuzeyin Oğulları II' },
  { src: '/muzik/thar-er-land-mitt-1.mp3', name: 'Þar er land mitt I' },
  { src: '/muzik/thar-er-land-mitt-2.mp3', name: 'Þar er land mitt II' },
  { src: '/muzik/jarn-skal-tala-1.mp3',    name: 'Járn skal tala I' },
  { src: '/muzik/jarn-skal-tala-2.mp3',    name: 'Járn skal tala II' },
];

/**
 * TELEFONDA TEK PARÇA: Vintersorg.
 *
 * Parçalar ~6 MB. Telefonda listenin tamamını dolaşmak her parça değişiminde
 * yeni bir 6 MB indirmesi demek; mobil bağlantıda bu, oyunun kendi soketiyle
 * aynı kanalları paylaşan ciddi bir yük (nginx kaydında mobil isteklerin
 * yarısından fazlası medyaydı). Telefonda tek parça dönüyor: bir kez inip
 * önbellekte kalıyor, sonrası bedava.
 *
 * Masaüstünde liste olduğu gibi duruyor.
 */
const MOBIL_PARCALAR = ['/muzik/vintersorg-1.mp3', '/muzik/vintersorg-2.mp3'];

/**
 * Telefon/tablet mi — dar ekran YA DA dokunmatik cihaz.
 *
 * Yalnız genişliğe bakmak yetmiyordu: telefon yatay çevrilince ~844 px'e
 * çıkıp tam listeye geri dönüyordu. Fare olmayan cihazda liste her hâlükârda
 * tek parça kalsın.
 */
function darEkran() {
  try {
    if (window.innerWidth < 760) return true;
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  } catch { return false; }
}

/** Bu cihazda çalınabilecek parçaların TRACKS içindeki sırası */
function calinabilirSira() {
  if (!darEkran()) return TRACKS.map((_, i) => i);
  const mobil = TRACKS
    .map((t, i) => (MOBIL_PARCALAR.includes(t.src) ? i : -1))
    .filter((i) => i >= 0);
  // Parça adları değişirse listeye düşmeyelim: eşleşme yoksa tam listeye dön
  return mobil.length ? mobil : TRACKS.map((_, i) => i);
}

const DEFAULTS = { muted: false, volume: 0.45 };

function read() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const o = raw ? JSON.parse(raw) : null;
    if (!o || typeof o !== 'object') return { ...DEFAULTS };
    return {
      muted: !!o.muted,
      volume: Number.isFinite(o.volume) ? Math.min(1, Math.max(0, o.volume)) : DEFAULTS.volume,
    };
  } catch { return { ...DEFAULTS }; }
}

function write(s) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* yoksay */ }
}

let state = read();
let el = null;                 // tek <audio>
let order = [];                // karışık çalma sırası
let idx = 0;
let unlockBound = false;
const listeners = new Set();

const notify = () => { for (const fn of listeners) fn(snapshot()); };

/** Sırayı karıştır — her açılışta aynı parça ile başlamasın */
function shuffle() {
  order = calinabilirSira();
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  idx = 0;
}

function ensure() {
  if (el) return el;
  if (typeof Audio === 'undefined') return null;
  shuffle();
  el = new Audio();
  /*
    PRELOAD 'none' — 'auto' idi.

    Her parça ~6 MB ve sayfa açılır açılmaz inmeye başlıyordu. Telefonda
    otomatik oynatma zaten ENGELLİ: dosya iniyor ama çalmıyordu, yani 6 MB
    boşa gidiyor ve tarayıcının bağlantı kanallarını oyunun kendi soketiyle
    paylaşıyordu (nginx kaydında mobil isteklerin yarısından fazlası medya).

    'none' ile indirme yalnız play() gerçekten kabul edildiğinde başlıyor.
    Masaüstünde parça başlarken yarım saniyelik gecikme olabilir; arka plan
    müziği için kabul edilebilir bir bedel.
  */
  el.preload = 'none';
  el.loop = false;                       // sıradaki parçaya geçilecek
  el.volume = state.muted ? 0 : state.volume;
  el.addEventListener('ended', () => ilerle());
  /**
   * DOSYA YOKSA SIRADAKİNE GEÇ.
   *
   * Parça listesi sabit ama dosyalar `client/public/muzik/` altında ve git'e
   * girmiyor (~100 MB). Dosya eksikse `error` gelir, `ended` GELMEZ: eski
   * hâlde çalar o parçada susup kalıyordu. Artık eksik parça atlanıyor;
   * hepsi eksikse bir tur dönüp duruyor (sonsuz döngü yok).
   */
  let hataArtArda = 0;
  el.addEventListener('error', () => {
    hataArtArda += 1;
    // Sınır ÇALMA SIRASININ uzunluğu: telefonda liste iki parça, TRACKS'in
    // tamamını beklemek orada gereksiz yere on altı kez denemek olurdu.
    if (hataArtArda >= Math.max(1, order.length)) { hataArtArda = 0; return; }
    ilerle();
  });
  el.addEventListener('playing', () => { hataArtArda = 0; });
  load();
  return el;
}

/** Sıradaki parçaya geç ve çal */
function ilerle() {
  idx += 1;
  if (idx >= order.length) shuffle();    // listeyi bitirince yeniden karıştır
  load();
  play();
}

function load() {
  if (!el) return;
  const t = TRACKS[order[idx]];
  if (t) el.src = t.src;
}

/** Oynatmayı dene. Tarayıcı reddederse ilk etkileşimde tekrar denenir. */
function play() {
  if (!el || state.muted) return;
  const p = el.play();
  if (p && typeof p.catch === 'function') p.catch(() => bindUnlock());
}

/**
 * Otomatik oynatma engellendiğinde: ilk tıklama/tuş/dokunma anında başlat.
 * Dinleyiciler `once` — bir kez iş görüp kendini kaldırıyor.
 */
function bindUnlock() {
  if (unlockBound || state.muted) return;
  unlockBound = true;
  const go = () => {
    unlockBound = false;
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) {
      window.removeEventListener(ev, go);
    }
    if (!state.muted) play();
  };
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) {
    window.addEventListener(ev, go, { once: true, passive: true });
  }
}

export function snapshot() {
  return {
    muted: state.muted,
    volume: state.volume,
    playing: !!el && !el.paused,
    track: el ? (TRACKS[order[idx]]?.name || '') : '',
  };
}

/** Oyun açılınca çağrılır. Sessiz seçilmişse hiçbir şey yapmaz. */
export function startMusic() {
  if (state.muted) return;
  ensure();
  play();
  notify();
}

export function setMuted(m) {
  state = { ...state, muted: !!m };
  write(state);
  if (state.muted) {
    if (el) { el.pause(); el.volume = 0; }
  } else {
    ensure();
    if (el) el.volume = state.volume;
    play();
  }
  notify();
}

export function setVolume(v) {
  const vol = Math.min(1, Math.max(0, Number(v) || 0));
  state = { ...state, volume: vol };
  write(state);
  if (el && !state.muted) el.volume = vol;
  // Sesi sıfırdan yukarı çekmek sessizden çıkmak anlamına gelir
  if (vol > 0 && state.muted) setMuted(false);
  else notify();
}

/** Sıradaki parçaya geç */
export function nextTrack() {
  ensure();
  idx = (idx + 1) % Math.max(1, order.length);
  load();
  play();
  notify();
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(snapshot());
  return () => listeners.delete(fn);
}
