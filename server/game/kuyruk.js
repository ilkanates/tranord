/**
 * KUYRUK BEDELİ — üretim siparişlerinin peşin ödemesi.
 *
 * ESKİ MODEL: sipariş bedelsiz kuyruğa giriyor, her parça sırası gelince
 * ödeniyordu. Kaynak yoksa sipariş kuyruğun BAŞINDA `waiting` durumunda
 * takılıyor ve arkasındaki her şeyi kilitliyordu. Oyuncu 10 kılıç sipariş
 * ediyor, kaynağı 3'üne yetiyor, kuyruk üçüncüden sonra duruyor ve
 * arkadaki zırh siparişi de hiç başlamıyordu.
 *
 * YENİ MODEL: bedel SİPARİŞ ANINDA tamamen ödenir. Yetmiyorsa sipariş
 * kuyruğa hiç girmez — oyuncu neyin eksik olduğunu hemen görür. Kuyrukta
 * bekleyen her iş ödenmiş demektir, dolayısıyla kaynak yüzünden takılmaz.
 * İptalde ÜRETİLMEMİŞ parçaların bedeli tam iade edilir.
 *
 * ESKİ KAYITLAR: `odendi` alanı olmayan siparişler kayıtlı oyunlarda
 * duruyor olabilir; tick onları eski yoldan (parça parça ödeme) işlemeye
 * devam ediyor. Bu dosyadaki yardımcılar yalnız yeni siparişler için.
 */

/** {odun:5} × 3 → {odun:15} */
function carp(bedel, adet) {
  const out = {};
  for (const [k, n] of Object.entries(bedel || {})) out[k] = (n || 0) * adet;
  return out;
}

/** İki bedeli topla (birim hem ekipman hem kaynak isteyebiliyor) */
function topla(a, b) {
  const out = { ...(a || {}) };
  for (const [k, n] of Object.entries(b || {})) out[k] = (out[k] || 0) + n;
  return out;
}

/** Bir birimin ekipman listesi {kilic:1, kalkan:1} biçiminde */
function ekipmanBedeli(unitDef) {
  const out = {};
  for (const e of unitDef?.equipment || []) out[e] = (out[e] || 0) + 1;
  return out;
}

/** havuz bedeli karşılıyor mu — eksikleri döndürür (boşsa yeterli) */
function eksikler(havuz, bedel) {
  const eksik = {};
  for (const [k, n] of Object.entries(bedel || {})) {
    const var_ = havuz?.[k] || 0;
    if (var_ < n) eksik[k] = n - var_;
  }
  return eksik;
}

function yeterMi(havuz, bedel) {
  return Object.keys(eksikler(havuz, bedel)).length === 0;
}

function dus(havuz, bedel) {
  for (const [k, n] of Object.entries(bedel || {})) havuz[k] = (havuz[k] || 0) - n;
}

/**
 * İade — depo tavanını AŞMAZ.
 *
 * Tavansız iade edilseydi oyuncu depoyu doldurup büyük bir sipariş verip
 * iptal ederek tavanın üstüne çıkardı. Sığmayan kısım kayboluyor; bu
 * iptalin bilinen bedeli.
 */
function iadeEt(havuz, bedel, tavanlar) {
  const kayip = {};
  for (const [k, n] of Object.entries(bedel || {})) {
    const tavan = tavanlar?.[k];
    const yeni = (havuz[k] || 0) + n;
    if (tavan != null && yeni > tavan) {
      kayip[k] = yeni - tavan;
      havuz[k] = tavan;
    } else {
      havuz[k] = yeni;
    }
  }
  return kayip;
}

/**
 * Sıralama değiştir — bir siparişi bir basamak yukarı/aşağı taşır.
 *
 * BAŞTAKİ İŞ KİLİTLİ: sayacı işliyor, yerini değiştirmek onu baştan
 * başlatmak demek olurdu. Bu yüzden çalışan bir işin önüne geçilemiyor.
 * `calisiyorMu` çağıran tarafta belirleniyor (ekipman ve birim kuyruğunda
 * "başlamış" ölçütü aynı: startTime var ve beklemede değil).
 */
function tasi(queue, orderId, yon) {
  const i = (queue || []).findIndex((o) => o.id === orderId);
  if (i < 0) return { ok: false, sebep: 'siparis_yok' };
  const j = yon === 'yukari' ? i - 1 : i + 1;
  if (j < 0 || j >= queue.length) return { ok: false, sebep: 'sinirda' };
  const bas = queue[0];
  const basCalisiyor = !!bas && !!bas.startTime && !bas.waiting;
  if (basCalisiyor && (i === 0 || j === 0)) return { ok: false, sebep: 'calisan_is' };
  [queue[i], queue[j]] = [queue[j], queue[i]];
  return { ok: true, yeniSira: j };
}

/**
 * Eksik listesini oyuncunun okuyacağı cümleye çevirir.
 * İstemcideki RES_LABEL/EQ_LABEL ile aynı kelimeler kullanılıyor —
 * oyuncu ret mesajında gördüğü adı ekranda da görsün.
 */
const ETIKET = {
  odun: 'odun', kereste: 'kereste',
  kil: 'kil', tugla: 'tuğla',
  tas: 'taş', yontmaTas: 'yontma taş',
  demir: 'demir', demirKulce: 'külçe demir',
  tahil: 'tahıl', un: 'un', ekmek: 'ekmek',
  kilic: 'kılıç', mizrak: 'mızrak', kalkan: 'kalkan', zirh: 'zırh', at: 'at',
};

function eksikMetni(eksik) {
  return Object.entries(eksik)
    .map(([k, n]) => `${Math.ceil(n)} ${ETIKET[k] || k}`)
    .join(', ');
}

module.exports = {
  carp, topla, ekipmanBedeli, eksikler, yeterMi, dus, iadeEt, tasi,
  ETIKET, eksikMetni,
};
