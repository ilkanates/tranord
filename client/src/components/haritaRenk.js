/**
 * HARİTA RENKLERİ — renk KİM olduğunu değil NE olduğunu söyler.
 *
 * İlkan: *"her oyuncuya ayrı renk atama, çerçeve renkleri standart
 * olsun. Kendi köylerimi mavi çerçevelesin, dostları yeşil, tarafsızları
 * gri, düşmanları kırmızı. İstediğim adamı da işaretleyebileyim
 * istediğim renkte."*
 *
 * ESKİ MODEL: her oyuncuya ayrı ton veriliyordu (açgözlü boyama, 14
 * renklik palet). Harita rengârenkti ama renk hiçbir şey ANLATMIYORDU —
 * mor bir köyün mavi bir köyden farkı yoktu, ikisi de yabancıydı. Oyuncu
 * "kime saldırabilirim" sorusunu renge bakarak cevaplayamıyordu.
 *
 * YENİ MODEL: dört durum, dört sabit renk. Renk artık bir CEVAP.
 *
 * SIRA ÖNEMLİ (aşağıdaki `iliskiOf`): elle işaret her şeyin üstünde,
 * çünkü oyuncunun kendi kararı otomatik çıkarımı ezmeli — "bu adam
 * tarafsız görünüyor ama bana saldırdı, kırmızı işaretledim".
 */

/** Dört sabit ilişki rengi */
export const ILISKI_RENK = {
  ben: '#5aa9ff',        // mavi  — kendi köylerim
  dost: '#7fe04d',       // yeşil — birlik arkadaşı, konfederasyon, saldırmazlık
  tarafsiz: '#9aa7b4',   // gri   — kimse
  dusman: '#ff6f78',     // kırmızı — savaş
};

export const ILISKI_ADI = {
  ben: 'Kendi köyün', dost: 'Dost', tarafsiz: 'Tarafsız', dusman: 'Düşman',
};

/**
 * ELLE İŞARET RENKLERİ.
 *
 * İlişki renkleriyle AYNI dört ton başta duruyor: oyuncu çoğu zaman
 * "bunu düşman say" demek istiyor ve o rengin haritada ne anlama
 * geldiğini zaten biliyor. Sonraki üç ton yalnız işaret için — kendi
 * kişisel ayrımı (mesela "bunlar sonra saldırılacak") ilişki renkleriyle
 * karışmasın diye ilişkide kullanılmayan tonlardan seçildi.
 */
export const ISARET_RENKLERI = [
  { key: 'kirmizi', renk: '#ff6f78', ad: 'Kırmızı' },
  { key: 'yesil', renk: '#7fe04d', ad: 'Yeşil' },
  { key: 'mavi', renk: '#5aa9ff', ad: 'Mavi' },
  { key: 'gri', renk: '#9aa7b4', ad: 'Gri' },
  { key: 'sari', renk: '#f2d06b', ad: 'Sarı' },
  { key: 'mor', renk: '#c08bff', ad: 'Mor' },
  { key: 'turuncu', renk: '#ff9f5a', ad: 'Turuncu' },
];

export const ISARET_RENGI = Object.fromEntries(
  ISARET_RENKLERI.map(x => [x.key, x.renk]));

/**
 * BİR KÖYÜN İLİŞKİSİ VE RENGİ.
 *
 * @param {object} v harita köyü (kind, owner, birlikId)
 * @param {object} p
 * @param {number|null} p.benimBirlikId
 * @param {object} p.iliskiler  başka birlik kimliği → 'konfederasyon'|'saldirmazlik'|'savas'
 * @param {object} p.isaretler  oyuncu adı → işaret rengi anahtarı
 * @returns {{ durum: string, renk: string, isaret: boolean }}
 */
export function iliskiOf(v, { benimBirlikId = null, iliskiler = {}, isaretler = {} } = {}) {
  /*
    KENDİ KÖYÜM HER ZAMAN MAVİ — işaret bile ezemiyor. Kendi toprağını
    düşman renginde görmek haritayı okunamaz yapardı.
  */
  if (v?.kind === 'self') return { durum: 'ben', renk: ILISKI_RENK.ben, isaret: false };

  /*
    ELLE İŞARET OTOMATİK ÇIKARIMI EZER. Oyuncunun kendi kararı, sunucunun
    çıkardığı ilişkiden önce gelir: "tarafsız görünüyor ama bana saldırdı,
    kırmızı işaretledim".
  */
  const im = v?.owner ? isaretler[v.owner] : null;
  if (im && ISARET_RENGI[im]) {
    return { durum: 'isaret', renk: ISARET_RENGI[im], isaret: true };
  }

  const bid = v?.birlikId ?? null;
  if (bid != null && benimBirlikId != null) {
    if (Number(bid) === Number(benimBirlikId)) {
      return { durum: 'dost', renk: ILISKI_RENK.dost, isaret: false };
    }
    const t = iliskiler[bid];
    if (t === 'konfederasyon' || t === 'saldirmazlik') {
      return { durum: 'dost', renk: ILISKI_RENK.dost, isaret: false };
    }
    if (t === 'savas') return { durum: 'dusman', renk: ILISKI_RENK.dusman, isaret: false };
  }
  return { durum: 'tarafsiz', renk: ILISKI_RENK.tarafsiz, isaret: false };
}
