/**
 * BİRLİK SERVİSİ — bellek ile diskin arası.
 *
 * `game/birlik.js` saf kuralları tutuyor (kim ne yapabilir, ad geçerli
 * mi); bu dosya o kuralları VERİYE uyguluyor: belleği (`WORLD`) ve
 * veritabanını birlikte güncelliyor.
 *
 * NEDEN AYRI DOSYA: index.js zaten 4.700 satır ve birlik işlemlerinin
 * tamamı birbirine bağlı (kur → davet et → kabul → terfi → at →
 * dağıt). Aynı yerde durmazlarsa "davet kabul edilince davetler
 * temizleniyor mu" gibi sorular dosya içinde aranır hâle gelir.
 *
 * HER İŞLEM ÖNCE DİSKE, SONRA BELLEĞE yazıyor. Tersi olsaydı disk
 * yazımı patladığında bellek yalan söylerdi ve sunucu yeniden
 * başlayana kadar kimse fark etmezdi.
 */
const { WORLD } = require('../durum');
const B = require('./birlik');

/** Veritabanı modülü dışarıdan veriliyor (dev ve üretim aynı API) */
let DB = null;

function baglaDB(db) { DB = db; }

// ── Açılış ─────────────────────────────────────────────────────────

/**
 * Bütün birlikleri belleğe al. Açılışta bir kez.
 */
async function yukle() {
  if (!DB?.loadAlliances) return;
  const { birlikler, uyeler, davetler } = await DB.loadAlliances();

  WORLD.birlikler.clear();
  WORLD.birlikByUser.clear();
  WORLD.davetByUser.clear();

  for (const a of birlikler) {
    WORLD.birlikler.set(a.id, {
      id: a.id, ad: a.ad, amblem: a.amblem,
      kurucuId: a.kurucu_id, uyeler: new Map(),
    });
  }
  for (const m of uyeler) {
    const b = WORLD.birlikler.get(m.alliance_id);
    if (!b) continue;                         // birliği silinmiş artık kayıt
    b.uyeler.set(m.user_id, m.rutbe);
    WORLD.birlikByUser.set(m.user_id, { id: m.alliance_id, rutbe: m.rutbe });
  }
  for (const d of davetler) {
    if (!WORLD.birlikler.has(d.alliance_id)) continue;
    const liste = WORLD.davetByUser.get(d.user_id) || [];
    liste.push({ birlikId: d.alliance_id, davetEden: d.davet_eden });
    WORLD.davetByUser.set(d.user_id, liste);
  }
  console.log(`[BİRLİK] ${WORLD.birlikler.size} birlik, `
    + `${WORLD.birlikByUser.size} üye, ${davetler.length} bekleyen davet`);
}

// ── Okuma ──────────────────────────────────────────────────────────

const birligim = (userId) => WORLD.birlikByUser.get(Number(userId)) || null;
const birlik = (id) => WORLD.birlikler.get(Number(id)) || null;

/** İki oyuncu aynı birlikte mi — haritanın yeşil çerçevesi bunu soruyor */
function ayniBirlikte(userA, userB) {
  const a = birligim(userA);
  const b = birligim(userB);
  return !!(a && b && a.id === b.id);
}

/** Bir oyuncunun birlik kimliği — harita anlık görüntüsü için */
function birlikIdOf(userId) {
  return birligim(userId)?.id ?? null;
}

/**
 * ÜYE TAVANI — Konung'un EN YÜKSEK elçilik seviyesinden.
 *
 * Seviyeyi bu dosya bilmiyor (köyler oturumda), o yüzden çağıran
 * taraftan bir okuyucu alıyoruz. Böylece kural burada, veri orada
 * kalıyor.
 */
function tavan(birlikId, elcilikSeviyesiOku) {
  const b = birlik(birlikId);
  if (!b || !b.kurucuId) return 0;
  return B.uyeTavani(elcilikSeviyesiOku(b.kurucuId));
}

/** İstemciye giden birlik özeti */
function ozet(birlikId, adOku) {
  const b = birlik(birlikId);
  if (!b) return null;
  const uyeler = [...b.uyeler.entries()]
    .map(([userId, rutbe]) => ({
      userId, rutbe, ad: adOku(userId) || `oyuncu#${userId}`,
      rutbeAd: B.RUTBELER[rutbe]?.ad || rutbe,
    }))
    /*
      SIRALAMA RÜTBEYE GÖRE, sonra ada göre. Katılma sırasına göre
      olsaydı Konung listenin ortasında kalabilirdi ve "kim yönetiyor"
      sorusu bir bakışta cevaplanmazdı.
    */
    .sort((x, y) => (B.RUTBELER[x.rutbe].sira - B.RUTBELER[y.rutbe].sira)
      || x.ad.localeCompare(y.ad, 'tr'));
  return { id: b.id, ad: b.ad, amblem: b.amblem, kurucuId: b.kurucuId, uyeler };
}

/** Bir oyuncuya gelen bekleyen davetler */
function davetlerim(userId, adOku) {
  const liste = WORLD.davetByUser.get(Number(userId)) || [];
  return liste
    .map(d => {
      const b = birlik(d.birlikId);
      if (!b) return null;
      return {
        birlikId: b.id, ad: b.ad, amblem: b.amblem,
        uyeSayisi: b.uyeler.size,
        davetEdenAd: d.davetEden ? (adOku(d.davetEden) || null) : null,
      };
    })
    .filter(Boolean);
}

// ── Yazma ──────────────────────────────────────────────────────────

async function kur({ userId, ad, amblem, elcilikSeviyesi }) {
  const uid = Number(userId);
  const izin = B.kurabilirMi({ elcilikSeviyesi, mevcutBirlikId: birlikIdOf(uid) });
  if (!izin.ok) return { hata: izin.sebep };

  const dg = B.adDogrula(ad);
  if (dg.hata) return { hata: dg.hata };
  if (!B.amblemGecerli(amblem)) return { hata: 'gecersiz_amblem' };

  const r = await DB.birlikKur({ ad: dg.ad, amblem, kurucuId: uid });
  if (r.hata) return { hata: r.hata };

  WORLD.birlikler.set(r.id, {
    id: r.id, ad: dg.ad, amblem, kurucuId: uid,
    uyeler: new Map([[uid, 'konung']]),
  });
  WORLD.birlikByUser.set(uid, { id: r.id, rutbe: 'konung' });
  /*
    KURAN OYUNCUNUN BEKLEYEN DAVETLERİ DÜŞER. Kendi birliğini kurduktan
    sonra eski davetler ekranında durmaya devam etseydi, kabul etmeye
    kalkınca "zaten birliktesin" hatası alırdı — kullanıcıya hatalı
    bir yol açık bırakmak.
  */
  await DB.davetleriTemizle(uid);
  WORLD.davetByUser.delete(uid);

  return { ok: true, birlikId: r.id };
}

async function davetEt({ userId, hedefUserId }) {
  const ben = birligim(userId);
  if (!ben) return { hata: 'birlikte_degilsin' };
  if (!B.yetkiler(ben.rutbe).davetEder) return { hata: 'yetki_yok' };

  const hedef = Number(hedefUserId);
  if (hedef === Number(userId)) return { hata: 'kendini_davet' };
  if (birlikIdOf(hedef)) return { hata: 'zaten_birlikte' };

  const r = await DB.davetYaz(ben.id, hedef, Number(userId));
  if (r.hata) return { hata: r.hata };

  const liste = WORLD.davetByUser.get(hedef) || [];
  liste.push({ birlikId: ben.id, davetEden: Number(userId) });
  WORLD.davetByUser.set(hedef, liste);
  return { ok: true, birlikId: ben.id };
}

async function davetGeriAl({ userId, hedefUserId }) {
  const ben = birligim(userId);
  if (!ben) return { hata: 'birlikte_degilsin' };
  if (!B.yetkiler(ben.rutbe).davetIptal) return { hata: 'yetki_yok' };
  await davetDus(ben.id, Number(hedefUserId));
  return { ok: true };
}

/** Tek bir daveti hem diskten hem bellekten düşür */
async function davetDus(birlikId, userId) {
  await DB.davetSil(birlikId, userId);
  const kalan = (WORLD.davetByUser.get(userId) || [])
    .filter(d => d.birlikId !== birlikId);
  if (kalan.length) WORLD.davetByUser.set(userId, kalan);
  else WORLD.davetByUser.delete(userId);
}

async function daveteCevap({ userId, birlikId, kabul, elcilikSeviyesiOku }) {
  const uid = Number(userId);
  const bid = Number(birlikId);
  const davetli = (WORLD.davetByUser.get(uid) || []).some(d => d.birlikId === bid);
  if (!davetli) return { hata: 'davet_yok' };

  if (!kabul) {
    await davetDus(bid, uid);
    return { ok: true, katildi: false };
  }

  const b = birlik(bid);
  if (!b) return { hata: 'birlik_yok' };

  const izin = B.katilabilirMi({
    uyeSayisi: b.uyeler.size,
    tavan: tavan(bid, elcilikSeviyesiOku),
    mevcutBirlikId: birlikIdOf(uid),
  });
  if (!izin.ok) return { hata: izin.sebep };

  const r = await DB.uyeEkle(bid, uid, 'karl');
  if (r.hata) return { hata: r.hata };

  b.uyeler.set(uid, 'karl');
  WORLD.birlikByUser.set(uid, { id: bid, rutbe: 'karl' });
  /*
    KATILINCA BÜTÜN DAVETLER DÜŞER — yalnız kabul edilen değil. Oyuncu
    artık bir birlikte; kalan davetler tıklanınca hata verecek ölü
    satırlar olurdu.
  */
  await DB.davetleriTemizle(uid);
  WORLD.davetByUser.delete(uid);

  return { ok: true, katildi: true, birlikId: bid };
}

/** Üyeyi bellekten ve diskten çıkar — ayrılma ve atmanın ortak yolu */
async function uyelikBitir(uid, b) {
  await DB.uyeCikar(uid);
  b.uyeler.delete(uid);
  WORLD.birlikByUser.delete(uid);
}

async function ayril({ userId }) {
  const ben = birligim(userId);
  if (!ben) return { hata: 'birlikte_degilsin' };
  if (!B.yetkiler(ben.rutbe).ayrilir) return { hata: 'konung_ayrilamaz' };
  const b = birlik(ben.id);
  await uyelikBitir(Number(userId), b);
  return { ok: true };
}

async function uyeAt({ userId, hedefUserId }) {
  const ben = birligim(userId);
  if (!ben) return { hata: 'birlikte_degilsin' };
  const hedef = birligim(hedefUserId);
  if (!hedef || hedef.id !== ben.id) return { hata: 'uye_degil' };
  if (Number(hedefUserId) === Number(userId)) return { hata: 'kendini_atamazsin' };
  if (!B.atabilirMi(ben.rutbe, hedef.rutbe)) return { hata: 'yetki_yok' };

  const b = birlik(ben.id);
  await uyelikBitir(Number(hedefUserId), b);
  return { ok: true, atilan: Number(hedefUserId) };
}

/**
 * JARL SEÇ / GERİ AL.
 *
 * Tek olay, iki yön: `jarl` true ise terfi, false ise indirme. Ayrı
 * iki olay olsaydı yetki denetimi iki yerde tekrarlanırdı.
 */
async function jarlAyarla({ userId, hedefUserId, jarl }) {
  const ben = birligim(userId);
  if (!ben) return { hata: 'birlikte_degilsin' };
  if (!B.yetkiler(ben.rutbe).jarlSecer) return { hata: 'yetki_yok' };

  const hedef = birligim(hedefUserId);
  if (!hedef || hedef.id !== ben.id) return { hata: 'uye_degil' };
  if (hedef.rutbe === 'konung') return { hata: 'konung_degistirilemez' };

  const b = birlik(ben.id);
  const yeni = jarl ? 'jarl' : 'karl';
  if (hedef.rutbe === yeni) return { ok: true, rutbe: yeni };

  if (jarl) {
    const mevcut = [...b.uyeler.values()].filter(r => r === 'jarl').length;
    if (!B.jarlSecilebilirMi(mevcut)) return { hata: 'jarl_tavani' };
  }

  await DB.uyeRutbe(Number(hedefUserId), yeni);
  b.uyeler.set(Number(hedefUserId), yeni);
  WORLD.birlikByUser.set(Number(hedefUserId), { id: ben.id, rutbe: yeni });
  return { ok: true, rutbe: yeni };
}

async function dagit({ userId }) {
  const ben = birligim(userId);
  if (!ben) return { hata: 'birlikte_degilsin' };
  if (!B.yetkiler(ben.rutbe).dagitir) return { hata: 'yetki_yok' };

  const b = birlik(ben.id);
  const uyeIdler = [...b.uyeler.keys()];
  await DB.birlikSil(ben.id);
  for (const uid of uyeIdler) WORLD.birlikByUser.delete(uid);
  for (const [uid, liste] of [...WORLD.davetByUser.entries()]) {
    const kalan = liste.filter(d => d.birlikId !== ben.id);
    if (kalan.length) WORLD.davetByUser.set(uid, kalan);
    else WORLD.davetByUser.delete(uid);
  }
  WORLD.birlikler.delete(ben.id);
  return { ok: true, uyeIdler };
}

async function duzenle({ userId, ad, amblem }) {
  const ben = birligim(userId);
  if (!ben) return { hata: 'birlikte_degilsin' };
  if (!B.yetkiler(ben.rutbe).adDegistirir) return { hata: 'yetki_yok' };

  const dg = B.adDogrula(ad);
  if (dg.hata) return { hata: dg.hata };
  if (!B.amblemGecerli(amblem)) return { hata: 'gecersiz_amblem' };

  const r = await DB.birlikAdDegistir(ben.id, dg.ad, amblem);
  if (r.hata) return { hata: r.hata };

  const b = birlik(ben.id);
  b.ad = dg.ad; b.amblem = amblem;
  return { ok: true };
}

module.exports = {
  baglaDB, yukle,
  birligim, birlik, ayniBirlikte, birlikIdOf, tavan, ozet, davetlerim,
  kur, davetEt, davetGeriAl, daveteCevap, ayril, uyeAt, jarlAyarla,
  dagit, duzenle,
};
