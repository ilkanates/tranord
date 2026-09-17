/**
 * AÇIK ARTIRMA — kahraman eşyalarının pazarı.
 *
 * İlkan'ın tarifi: *"kahramanlar itemlerini satabilmeli gümüş
 * karşılığında… itemlerin min tutarları olsun, kimse almasa bile açık
 * artırma bitince o parayı kullanıcı alsın, item NPC'ye satılmış olsun.
 * her satış 24 saat açık artırmada dursun, fazla parayı veren alsın."*
 *
 * Bu dosya SAF KURAL: veritabanı, soket, zamanlayıcı yok. Kararların
 * hepsi burada ve test edilebilir; index.js yalnız uyguluyor.
 *
 * ── TABAN FİYATI SİSTEM KOYUYOR, SATICI DEĞİL ───────────────────────
 *
 * Satıcı tabanı kendi yazsaydı ve teklif gelmeyince NPC o tabanı
 * ödeseydi, herkes taban fiyatına milyon yazıp bedava para basardı.
 * Taban eşyanın kendisinden türüyor (nadirlik + seviye, bkz.
 * esyaDeger.js): satıcının tek kararı "satayım mı".
 *
 * ── SÜRE GERÇEK ZAMANDA, OYUN SAATİNDE DEĞİL ────────────────────────
 *
 * Oyunun geri kalanı oyun saatiyle akıyor ama açık artırma bir PAZAR:
 * insanların görüp teklif verebilmesi gerekiyor. Dünya hızı 10× iken
 * 24 oyun saati 2,4 gerçek saat eder; günde bir-iki kez giren oyuncu
 * hiçbir açık artırmayı göremez ve pazar ölürdü. Travian da hız
 * sunucularında açık artırmayı 24 GERÇEK saatte tutuyor.
 *
 * ── TEKLİFTE GÜMÜŞ BLOKE ────────────────────────────────────────────
 *
 * Yoksa aynı 500 gümüşle on açık artırmaya girilir, hepsi kazanılınca
 * dokuzu karşılıksız kalırdı. Teklifi geçilen oyuncunun gümüşü ANINDA
 * dönüyor — "kaybettim ama param birkaç saat kilitli" cezası
 * kimsenin teklif vermek istememesine yol açardı.
 */
const DEGER = require('./esyaDeger');

/** Açık artırmanın gerçek zamanda süresi */
const SURE_SAAT = 24;
const SURE_MS = SURE_SAAT * 3600 * 1000;

/**
 * SON DAKİKA TEKLİFİ SÜREYİ UZATIYOR.
 *
 * Uzatma olmasaydı kazanan, eşyayı en çok isteyen değil son saniyede
 * bağlantısı en hızlı olan olurdu; açık artırma bir refleks yarışına
 * dönerdi. On dakika, karşı tarafın görüp cevap vermesine yetecek en
 * kısa süre.
 */
const UZATMA_ESIGI_MS = 10 * 60 * 1000;

/**
 * EN AZ ARTIŞ — mevcut fiyatın %5'i, en az 1 gümüş.
 *
 * Yüzde olmasaydı 500 gümüşlük bir eşyada birer birer artıran biri
 * açık artırmayı yüzlerce teklife boğardı. Sabit bir rakam da ucuz
 * eşyada aşırı, pahalıda anlamsız kalırdı.
 */
const ARTIS_YUZDE = 0.05;

function enAzTeklif(ilan) {
  const taban = ilan?.taban || 0;
  const mevcut = ilan?.teklif || 0;
  if (!mevcut) return taban;                 // ilk teklif tabandan başlar
  return mevcut + Math.max(1, Math.round(mevcut * ARTIS_YUZDE));
}

/** Eşya satışa konabilir mi */
function satilabilirMi(giris) {
  if (!giris || !DEGER.tabanFiyat(giris)) return 'esya_yok';
  return null;
}

/**
 * YENİ İLAN. `simdi` dışarıdan veriliyor ki test zamanı sabitleyebilsin.
 */
function ilanKur(giris, saticiId, simdi = Date.now()) {
  const hata = satilabilirMi(giris);
  if (hata) return { ok: false, sebep: hata };
  return {
    ok: true,
    ilan: {
      saticiId,
      key: giris.key,
      nadirlik: giris.nadirlik,
      seviye: DEGER.seviye(giris),
      taban: DEGER.tabanFiyat(giris),
      teklif: 0,
      teklifVerenId: null,
      baslangic: simdi,
      bitis: simdi + SURE_MS,
    },
  };
}

/**
 * TEKLİF VERİLEBİLİR Mİ — tek cümle, hem sunucu hem istemci okuyor.
 *
 * KENDİ İLANINA TEKLİF YASAK: kendi eşyanın fiyatını yükseltip başka
 * birine ödetmek (shill bidding) açık artırmanın en bilinen
 * dolandırıcılığı. Blokaj da olduğu için kendine teklif vermek
 * risksiz olurdu — kaybetse bile parası kendine dönerdi.
 */
function teklifEngeli(ilan, teklifciId, miktar, bakiye, simdi = Date.now()) {
  if (!ilan) return 'ilan_yok';
  if (ilan.bitti) return 'bitti';
  if (simdi >= ilan.bitis) return 'bitti';
  if (ilan.saticiId === teklifciId) return 'kendi_ilanin';
  if (ilan.teklifVerenId === teklifciId) return 'zaten_ondesin';
  const enAz = enAzTeklif(ilan);
  if (!(miktar >= enAz)) return 'teklif_dusuk';
  if (bakiye < miktar) return 'yetersiz';
  return null;
}

/**
 * TEKLİFİ UYGULA — yeni ilan durumunu ve İADE EDİLECEK önceki
 * teklifçiyi döndürür. Blokaj/iade parasını bu dosya taşımıyor:
 * kese işlemi çağıranda, tek yerde (bkz. index.js).
 */
function teklifUygula(ilan, teklifciId, miktar, simdi = Date.now()) {
  const onceki = ilan.teklifVerenId
    ? { userId: ilan.teklifVerenId, miktar: ilan.teklif }
    : null;
  /*
    UZATMA: son dakikada gelen teklif bitişi ileri atıyor. Bitişi
    SABİT tutmak değil, "son teklifin üstünden en az şu kadar geçsin"
    kuralı — böylece uzatma zincirlenebiliyor ve gerçekten isteyen
    kazanıyor.
  */
  const yeniBitis = (ilan.bitis - simdi) < UZATMA_ESIGI_MS
    ? simdi + UZATMA_ESIGI_MS
    : ilan.bitis;
  return {
    ilan: { ...ilan, teklif: miktar, teklifVerenId: teklifciId, bitis: yeniBitis },
    iade: onceki,
    uzadi: yeniBitis !== ilan.bitis,
  };
}

/**
 * SÜRE DOLDU — kim aldı, satıcı ne kazandı.
 *
 * TEKLİF YOKSA NPC ALIYOR ve satıcı TABANI alıyor (İlkan'ın açık
 * isteği). Satılmazsa oyuncu emeğinin karşılığını hiç alamazdı ve
 * değersiz eşyalar envanterde çöp olarak birikirdi. NPC'ye giden eşya
 * dünyadan siliniyor: havuzda tutmak "NPC satıcı" diye ikinci bir
 * sistem gerektirirdi ve kimsenin istemediği eşyalar sonsuza kadar
 * listede dolaşırdı.
 */
function sonuclandir(ilan) {
  if (ilan.teklifVerenId) {
    return {
      tur: 'satildi',
      aliciId: ilan.teklifVerenId,
      /* Alıcının gümüşü teklif anında bloke edilmişti — burada yeniden düşülmüyor */
      saticiKazanc: ilan.teklif,
      fiyat: ilan.teklif,
    };
  }
  return { tur: 'npc', aliciId: null, saticiKazanc: ilan.taban, fiyat: ilan.taban };
}

/** İstemciye giden satır — teklif VERENİN kimliği gitmiyor, adı çağıranda */
function ozet(ilan, simdi = Date.now()) {
  return {
    id: ilan.id,
    key: ilan.key, nadirlik: ilan.nadirlik, seviye: ilan.seviye,
    taban: ilan.taban,
    teklif: ilan.teklif || 0,
    enAzTeklif: enAzTeklif(ilan),
    kalanSn: Math.max(0, Math.round((ilan.bitis - simdi) / 1000)),
    bitti: !!ilan.bitti || simdi >= ilan.bitis,
  };
}

module.exports = {
  SURE_SAAT, SURE_MS, UZATMA_ESIGI_MS, ARTIS_YUZDE,
  enAzTeklif, satilabilirMi, ilanKur, teklifEngeli, teklifUygula,
  sonuclandir, ozet,
};
