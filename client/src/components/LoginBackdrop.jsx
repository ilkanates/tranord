/**
 * LoginBackdrop — giriş ve "bağlanıyor" ekranlarının arka planı.
 *
 * Tam ekran video (public/login_bg.mp4) + okunurluk için radial karartma.
 * Video yüklenmezse poster/CSS fallback olarak login_bg.jpg görünür.
 *
 * Aynı dosyalar client/public/dev-login.html tarafından da kullanılıyor;
 * iki kopya tutmamak için public/ altından URL ile veriliyor.
 */
import { useEffect, useRef } from 'react';

const IMG = '/login_bg.jpg';
const VID = '/login_bg.mp4';

export default function LoginBackdrop({ dimMid = 0.30, dimEdge = 0.86 }) {
  const ref = useRef(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // React bazen <video muted> özelliğini ilk render'da uygulamıyor ve muted
    // olmayan video autoplay'de bloklanıp poster'da (sabit resim) kalıyor.
    // Ayrıca ilk açılışta video henüz inmemiş olduğu için play() reddedilebiliyor.
    v.muted = true;
    v.defaultMuted = true;

    let done = false;
    const go = () => {
      if (done) return;
      const pr = v.play();
      if (pr && pr.then) pr.then(() => { done = true; }).catch(() => {});
      else done = true;
    };

    const evs = ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'];
    evs.forEach((e) => v.addEventListener(e, go));
    const gestures = ['pointerdown', 'keydown', 'touchstart'];
    gestures.forEach((e) => window.addEventListener(e, go));
    go();

    return () => {
      evs.forEach((e) => v.removeEventListener(e, go));
      gestures.forEach((e) => window.removeEventListener(e, go));
    };
  }, []);

  return (
    <>
      <video
        ref={ref}
        src={VID} poster={IMG}
        autoPlay muted loop playsInline preload="auto"
        style={{
          position: 'absolute', inset: 0, zIndex: 0,
          width: '100%', height: '100%', objectFit: 'cover',
          backgroundImage: `url(${IMG})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          pointerEvents: 'none',
        }}
      />
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background:
          `radial-gradient(ellipse at 50% 55%, rgba(6,13,22,${dimMid}) 0%,`
          + ` rgba(6,13,22,${(dimMid + dimEdge) / 2}) 55%, rgba(6,13,22,${dimEdge}) 100%)`,
      }} />
    </>
  );
}
