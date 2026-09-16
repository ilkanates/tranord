/**
 * DOM ÖLÇÜMÜ ↔ CSS UZAYI.
 *
 * Arayüz ölçeği `#root { zoom }` ile uygulanıyor (bkz. index.css).
 * Zoom'un kritik yan etkisi ölçüldü (830×982 pencere, ölçek 2):
 *
 *   getBoundingClientRect() → 830 × 982   GERÇEK piksel
 *   offsetWidth/offsetHeight → 415 × 491  ZOOM UZAYI
 *
 * CSS'e yazdığımız her uzunluk ZOOM UZAYINDA. Bir rect ölçüsünü
 * doğrudan CSS'e yazmak, ölçek 2'de her şeyi iki katı büyük kurmak
 * demek — panel ekranın dışına taşıyor ve düğmeler tıklanamıyor.
 *
 * Bu yüzden:
 *   · ELEMAN BOYUTU için `kutuOlcusu` (offset*, zaten doğru uzayda)
 *   · FARE KONUMU için `fareKonumu` (gerçek pikseli ölçeğe böler)
 */
import { ayarlar } from './ayarlar';

/** Geçerli arayüz ölçeği — 0 ya da bozuk değerde 1'e düşer */
export function uiOlcek() {
  const v = Number(ayarlar()?.olcek);
  return Number.isFinite(v) && v > 0 ? v : 1;
}

/**
 * Elemanın CSS uzayındaki boyutu. `offsetWidth/Height` zoom'dan
 * etkilenmiyor, yani ek bir bölme gerekmiyor.
 */
export function kutuOlcusu(el) {
  if (!el) return { w: 0, h: 0 };
  return { w: el.offsetWidth || 0, h: el.offsetHeight || 0 };
}

/**
 * Fare olayının eleman içindeki CSS uzayı konumu.
 *
 * `clientX` ve `rect.left` GERÇEK piksel; farkları da gerçek piksel.
 * Elemanın kendi koordinat sistemine çevirmek için ölçeğe bölünüyor —
 * yoksa ölçek 2'de harita tıklamaları iki kat sapıyor.
 */
export function fareKonumu(el, e) {
  if (!el || !Number.isFinite(e?.clientX)) return { x: 0, y: 0 };
  const rc = el.getBoundingClientRect();
  const k = uiOlcek();
  return { x: (e.clientX - rc.left) / k, y: (e.clientY - rc.top) / k };
}
