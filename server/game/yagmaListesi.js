/**
 * yagmaListesi — köye özel yağma listeleri ("farm list").
 *
 * İlkan: *"satır satır saldırıp yağmalanabilecek köyleri ve hangi askerin
 * kaç adet gideceğini ekleyebileyim… toplu yağmaya gönder tuşu olsun…
 * dolu dönenlere saldır tuşu olsun… şu an saldıramadıklarıma saldır tuşu
 * olsun… birden fazla liste olsun ve listeler köye özel olsun."*
 *
 * ── LİSTE KÖYE AİT, HESABA DEĞİL ────────────────────────────────────
 *
 * İlkan'ın açık isteği ve doğrusu da bu: yağma bir KÖYDEN çıkıyor,
 * mesafe o köye göre, gönderilecek asker o köyün ordusundan. Hesap
 * düzeyinde tek liste olsaydı beş köylü oyuncu her satırda "bu hangi
 * köyden gidecek?" sorusunu yeniden cevaplamak zorunda kalırdı.
 *
 * ── "DOLU DÖNDÜ" NE DEMEK ───────────────────────────────────────────
 *
 * Ganimet taşıma kapasitesini DOLDURDUYSA hedefte daha fazlası kalmış
 * demektir — oraya yine gitmeye değer. Eksik döndüyse köy boşalmıştır,
 * bir süre beklemek gerekir. Oyunun bütün yağma döngüsü bu tek bitlik
 * bilgiye dayanıyor; o yüzden tahminle değil, dönüş anında ÖLÇÜLEREK
 * yazılıyor (bkz. sonucIsle).
 *
 * ── ÜÇ DÜĞMENİN ANLAMI ──────────────────────────────────────────────
 *
 *   hepsi          — listedeki her hedefe gönder
 *   dolu           — en son DOLU dönenlere gönder (hâlâ kaynak var)
 *   gonderilemeyen — en son gönderilemeyenlere gönder (asker yetmedi,
 *                    sefer limiti doldu, hedef kalkanlıydı…)
 *
 * Üçüncüsü olmasaydı oyuncu 40 satırlık listede hangi 6'sının
 * gitmediğini tek tek aramak zorunda kalırdı.
 *
 * ── SINIRLAR NEDEN VAR ──────────────────────────────────────────────
 *
 * Liste köyün kayıtlı durumunun (JSON) içinde yaşıyor ve her kayıtta
 * diske yazılıyor. Sınırsız bırakılsaydı tek bir oyuncu köy kaydını
 * megabaytlara çıkarabilir ve tik yoluna yazma gecikmesi sokabilirdi —
 * bu depoda rapor listesi tam olarak bu yüzden 250 ile sınırlı.
 */

/** Bir köyde en çok bu kadar liste */
const MAX_LISTE = 12;
/** Bir listede en çok bu kadar hedef */
const MAX_HEDEF = 100;
/** Liste adı en çok bu kadar karakter */
const AD_UZUNLUK = 28;

/** Sonuç etiketleri — panel bunlara göre renk veriyor */
const SONUC = {
  DOLU: 'dolu',       // ganimet kapasiteyi doldurdu → hedefte daha var
  EKSIK: 'eksik',     // kapasite dolmadı → hedef boşalmış
  BOS: 'bos',         // hiç ganimet yok
  KAYIP: 'kayip',     // savaşı kaybettik
};

const yeniId = (v) => {
  v.yagmaSonId = (v.yagmaSonId || 0) + 1;
  return `y${v.yagmaSonId}`;
};

const listeler = (v) => (v.yagmaListeleri ||= []);

/** Ad temizliği — boş ad listeyi görünmez yapar, uzun ad arayüzü bozar */
function adTemizle(ad, varsayilan = 'Liste') {
  const s = String(ad ?? '').trim().replace(/\s+/g, ' ');
  return (s || varsayilan).slice(0, AD_UZUNLUK);
}

/**
 * BİRİM SEÇİMİNİ TEMİZLE — sayılar tam ve pozitif olmalı.
 *
 * Doğrulama BURADA, gönderimde değil: bozuk bir kayıt listeye girerse
 * her gönderimde yeniden reddedilir ve oyuncu sebebini hiç göremez.
 */
function birimTemizle(birimler, unitDefs) {
  const out = {};
  for (const [k, raw] of Object.entries(birimler || {})) {
    if (unitDefs && !unitDefs[k]) continue;        // bilinmeyen birim düşer
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    if (n > 0) out[k] = n;
  }
  return out;
}

/* ── Liste işlemleri ─────────────────────────────────────────────── */

function listeEkle(v, ad) {
  const L = listeler(v);
  if (L.length >= MAX_LISTE) return { ok: false, sebep: 'liste_limiti' };
  const liste = { id: yeniId(v), ad: adTemizle(ad, `Liste ${L.length + 1}`), hedefler: [] };
  L.push(liste);
  return { ok: true, liste };
}

function listeSil(v, listeId) {
  const L = listeler(v);
  const i = L.findIndex(x => x.id === listeId);
  if (i < 0) return { ok: false, sebep: 'liste_yok' };
  L.splice(i, 1);
  return { ok: true };
}

function listeAdlandir(v, listeId, ad) {
  const liste = listeler(v).find(x => x.id === listeId);
  if (!liste) return { ok: false, sebep: 'liste_yok' };
  liste.ad = adTemizle(ad, liste.ad);
  return { ok: true, liste };
}

/* ── Hedef işlemleri ─────────────────────────────────────────────── */

/**
 * HEDEF EKLE — aynı hedef iki kez girmez.
 *
 * Tekrar eklenirse asker seçimi GÜNCELLENİYOR, ikinci satır açılmıyor:
 * aynı köye iki satırdan sefer, toplu gönderimde sefer limitini boşuna
 * yiyen ve oyuncunun fark etmediği bir hata olurdu.
 */
function hedefEkle(v, listeId, { slotKey, ad, birimler }, unitDefs = null) {
  /*
    LİSTE BELİRTİLMEZSE İLK LİSTE. Haritadan ekleme bu yolu kullanıyor:
    orada liste seçtirmek, hedef toplarken her tıklamaya bir soru daha
    eklerdi. Hiç liste yoksa bir tane açılıyor — "önce liste oluştur"
    diye geri çevirmek, sebebi haritada görünmeyen bir ret olurdu.
  */
  let liste = listeId
    ? listeler(v).find(x => x.id === listeId)
    : listeler(v)[0];
  if (!liste && !listeId) {
    const y = listeEkle(v, 'Yağma listesi');
    if (!y.ok) return y;
    liste = y.liste;
  }
  if (!liste) return { ok: false, sebep: 'liste_yok' };
  if (!slotKey) return { ok: false, sebep: 'hedef_yok' };

  const temiz = birimTemizle(birimler, unitDefs);
  const mevcut = liste.hedefler.find(h => h.slotKey === slotKey);
  if (mevcut) {
    if (Object.keys(temiz).length) mevcut.birimler = temiz;
    if (ad) mevcut.ad = String(ad).slice(0, 40);
    return { ok: true, hedef: mevcut, zatenVardi: true };
  }

  if (liste.hedefler.length >= MAX_HEDEF) return { ok: false, sebep: 'hedef_limiti' };
  const hedef = {
    slotKey,
    ad: String(ad || slotKey).slice(0, 40),
    birimler: temiz,
    sonGonderim: null,
    sonSonuc: null,
    sonGanimet: 0,
    sonHata: null,
  };
  liste.hedefler.push(hedef);
  return { ok: true, hedef };
}

function hedefSil(v, listeId, slotKey) {
  const liste = listeler(v).find(x => x.id === listeId);
  if (!liste) return { ok: false, sebep: 'liste_yok' };
  const i = liste.hedefler.findIndex(h => h.slotKey === slotKey);
  if (i < 0) return { ok: false, sebep: 'hedef_yok' };
  liste.hedefler.splice(i, 1);
  return { ok: true };
}

function hedefGuncelle(v, listeId, slotKey, birimler, unitDefs = null) {
  const liste = listeler(v).find(x => x.id === listeId);
  if (!liste) return { ok: false, sebep: 'liste_yok' };
  const hedef = liste.hedefler.find(h => h.slotKey === slotKey);
  if (!hedef) return { ok: false, sebep: 'hedef_yok' };
  hedef.birimler = birimTemizle(birimler, unitDefs);
  return { ok: true, hedef };
}

/* ── Gönderim ────────────────────────────────────────────────────── */

/**
 * BU SÜZGECE UYAN HEDEFLER.
 *
 * Asker seçilmemiş satır HİÇBİR süzgeçte gönderilmiyor: "0 asker yolla"
 * sessizce başarısız olan bir sefer olurdu ve oyuncu listenin neden
 * eksik gittiğini anlamazdı.
 */
function gonderilecekler(v, listeId, filtre = 'hepsi') {
  const liste = listeler(v).find(x => x.id === listeId);
  if (!liste) return [];
  return liste.hedefler.filter(h => {
    if (!Object.keys(h.birimler || {}).length) return false;
    if (filtre === 'dolu') return h.sonSonuc === SONUC.DOLU;
    if (filtre === 'gonderilemeyen') return !!h.sonHata;
    return true;
  });
}

/**
 * GÖNDERİM SONUCUNU YAZ — sefer AÇILDI mı açılamadı mı.
 *
 * Başarıda `sonHata` TEMİZLENİYOR: temizlenmeseydi bir kez gönderilemeyen
 * hedef "gönderilemeyen" süzgecinde sonsuza kadar kalırdı.
 */
function gonderimIsle(v, listeId, slotKey, sonuc) {
  const liste = listeler(v).find(x => x.id === listeId);
  const hedef = liste?.hedefler.find(h => h.slotKey === slotKey);
  if (!hedef) return;
  if (sonuc?.ok) {
    hedef.sonGonderim = sonuc.at || Date.now();
    hedef.sonHata = null;
  } else {
    hedef.sonHata = sonuc?.sebep || 'bilinmeyen';
  }
}

/**
 * SEFER EVE DÖNDÜ — sonucu listelere yaz.
 *
 * "DOLU" ölçülüyor, tahmin edilmiyor: ganimet taşıma kapasitesini
 * doldurduysa hedefte daha fazlası kalmıştır. Kapasite sefere
 * iliştirilmiş olmalı (bkz. army.js · resolveArrival).
 *
 * AYNI HEDEF BİRDEN ÇOK LİSTEDE olabilir — hepsi güncelleniyor. Tek
 * listeyi güncellemek, aynı köyü iki listede tutan oyuncuya iki farklı
 * gerçek göstermek olurdu.
 */
function sonucIsle(v, march) {
  const L = v.yagmaListeleri;
  if (!L?.length || !march?.toKey) return;

  const ganimet = Object.values(march.loot || {})
    .reduce((s, n) => s + (Number(n) || 0), 0);
  const kapasite = Number(march.yagmaKapasite) || 0;
  const askerKaldi = Object.values(march.units || {})
    .reduce((s, n) => s + (Number(n) || 0), 0);

  let sonuc;
  if (!askerKaldi) sonuc = SONUC.KAYIP;
  else if (!ganimet) sonuc = SONUC.BOS;
  /*
    TAM EŞİTLİK ARANMIYOR. Ganimet kaynak başına bölünüp yuvarlanıyor,
    yani dolu bir sefer kapasitenin bir-iki birim altında dönebiliyor.
    Katı eşitlik, "dolu" sonucunun neredeyse hiç oluşmaması demekti.
  */
  else if (kapasite > 0 && ganimet >= kapasite - 2) sonuc = SONUC.DOLU;
  else sonuc = SONUC.EKSIK;

  for (const liste of L) {
    for (const h of liste.hedefler) {
      if (h.slotKey !== march.toKey) continue;
      h.sonSonuc = sonuc;
      h.sonGanimet = ganimet;
      h.sonDonus = Date.now();
    }
  }
}

/**
 * KAYITTAN GELEN LİSTEYİ ONAR.
 *
 * Eski köy kayıtlarında alan hiç yok; bozuk bir kayıt bütün ekranı
 * çökertmemeli. Bu depoda "eski kayıt yeni alanı bilmiyor" hatası
 * defalarca canlıda patladı.
 */
function hydrate(v) {
  if (!Array.isArray(v.yagmaListeleri)) { v.yagmaListeleri = []; return v; }
  v.yagmaListeleri = v.yagmaListeleri
    .filter(l => l && typeof l === 'object')
    .slice(0, MAX_LISTE)
    .map(l => ({
      id: String(l.id || yeniId(v)),
      ad: adTemizle(l.ad),
      hedefler: (Array.isArray(l.hedefler) ? l.hedefler : [])
        .filter(h => h && h.slotKey)
        .slice(0, MAX_HEDEF)
        .map(h => ({
          slotKey: String(h.slotKey),
          ad: String(h.ad || h.slotKey).slice(0, 40),
          birimler: birimTemizle(h.birimler),
          sonGonderim: Number(h.sonGonderim) || null,
          sonDonus: Number(h.sonDonus) || null,
          sonSonuc: Object.values(SONUC).includes(h.sonSonuc) ? h.sonSonuc : null,
          sonGanimet: Math.max(0, Math.floor(Number(h.sonGanimet) || 0)),
          sonHata: h.sonHata ? String(h.sonHata).slice(0, 40) : null,
        })),
    }));
  return v;
}

module.exports = {
  MAX_LISTE, MAX_HEDEF, AD_UZUNLUK, SONUC,
  listeEkle, listeSil, listeAdlandir,
  hedefEkle, hedefSil, hedefGuncelle,
  gonderilecekler, gonderimIsle, sonucIsle, hydrate,
  birimTemizle, adTemizle,
};
