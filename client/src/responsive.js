/**
 * TraNord — ekran ölçüsü ve giriş aygıtı.
 *
 * Arayüz masaüstü için sabit ölçülerle yazılmıştı: iki yanda 186 px ray,
 * üst barda sekmeler, 860x860 köy sahnesi. 390 px'lik bir telefonda yalnız
 * raylar ekranı doldurduğu için oyun kullanılamıyordu. Kırılma noktaları ve
 * "fare var mı" sorusu TEK yerde toplanıyor ki her bileşen aynı eşiği
 * kullansın — bileşen bileşen media query dağıtmak kısa sürede tutarsızlaşır.
 *
 *   MOBILE  (< 760)  telefon: raylar çekmeceye, sekmeler alta iner
 *   COMPACT (< 1100) küçük dizüstü / tablet: raylar dar, sahne ölçeklenir
 *
 * Ölçüyü window.innerWidth'ten alıyoruz; CSS media query değil JS lazım
 * çünkü stiller satır içi (styled-components/CSS dosyası yok) ve düzenin
 * kendisi (hangi bileşen nereye) değişiyor, sadece görünüm değil.
 */
import { useEffect, useState } from 'react';

export const BP = { mobile: 760, compact: 1100 };

function read() {
  const w = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const h = typeof window === 'undefined' ? 900 : window.innerHeight;
  return {
    w, h,
    mobile: w < BP.mobile,
    compact: w < BP.compact,
    portrait: h >= w,
    /** Ray genişliği: dar ekranda daralır, telefonda ray yok (çekmece) */
    railW: w < BP.mobile ? 0 : w < BP.compact ? 150 : 186,
  };
}

/**
 * Pencere ölçüsü. resize + orientationchange dinlenir; telefonda adres
 * çubuğu gizlenince yükseklik değiştiği için yükseklik de takip ediliyor.
 */
export function useViewport() {
  const [vp, setVp] = useState(read);
  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setVp(read()));
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  return vp;
}

/**
 * GERÇEK fare var mı?
 *
 * Dokunmatik ekranda `onMouseEnter` parmak değince BİR KEZ ateşleniyor ama
 * `onMouseLeave` hiç gelmiyor: hover kartı ekranda takılı kalıyor. Hover'a
 * bağlı her şey (kaynak kartı, bina ipucu) bu bayrakla kapatılıyor; o
 * bilgilere dokunmatikte TIKLAMA ile ulaşılıyor.
 */
export function useHoverable() {
  const [can, setCan] = useState(() => (typeof window === 'undefined' ? true
    : window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? true));
  useEffect(() => {
    const mq = window.matchMedia?.('(hover: hover) and (pointer: fine)');
    if (!mq) return;
    const on = () => setCan(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return can;
}

/**
 * AĞIR MEDYA YÜKLENMESİN Mİ — telefon/tablet mi?
 *
 * Arka plan videoları 752 KB, müzik parçaları ~6 MB. Telefonda bunlar
 * oyunun kendi soketiyle aynı bağlantı kanallarını paylaşıyor ve ilk köy
 * paketini geciktiriyor (canlı nginx kaydında mobil isteklerin yarısından
 * fazlası medyaydı).
 *
 * ÖLÇÜT GENİŞLİK DEĞİL CİHAZ. Önce yalnız genişliğe (760 px) bakılıyordu;
 * telefon YATAY çevrilince ~844 px'e çıkıp videoyu geri getiriyordu.
 * Fare olmayan, kaba işaretçili cihazda ağır medya yok — ekran kaç piksel
 * gelirse gelsin. Dar masaüstü penceresi de kapsansın diye genişlik ölçütü
 * duruyor.
 *
 * Hook değil: React ağacı dışından (audio.js) da çağrılıyor.
 */
export function agirMedyaYok() {
  try {
    if (window.innerWidth < BP.mobile) return true;
    return window.matchMedia?.('(hover: none) and (pointer: coarse)').matches ?? false;
  } catch { return false; }
}

/** Dokunmatikte en küçük dokunma hedefi (Apple/Google kılavuzu: 44 px). */
export const TAP = 44;
