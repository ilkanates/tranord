/**
 * VideoBackdrop — sahnenin arkasında dönen tam ekran video.
 *
 * Giriş ekranıyla AYNI videoyu kullanıyor (public/login_bg.mp4): geniş açılı
 * çekildiği için `cover` ile kırpılmadan ekranı dolduruyor — kare bina
 * videolarında gereken "bulanık dolgu katmanı" burada gerekmiyor, o yüzden
 * görüntü net kalıyor. `blur` yalnızca yazıların okunmasına yetecek kadar.
 *
 * OTOMATİK OYNATMA: React ilk render'da `muted` özniteliğini bazen
 * uygulamıyor ve video sessiz sayılmadığı için tarayıcı oynatmayı reddedip
 * poster karesinde donuyor. Bu yüzden `muted` elle set ediliyor ve play()
 * hem video olaylarında hem de ilk kullanıcı hareketinde tekrar deneniyor —
 * LoginBackdrop'taki çözümün aynısı.
 */
import { useEffect, useRef } from 'react';
import { C } from '../theme';

export default function VideoBackdrop({
  src = '/login_bg.mp4', poster = '/login_bg.jpg',
  dim = 0.45, blur = 1,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    let bitti = false;
    const oynat = () => {
      if (bitti) return;
      const p = v.play();
      if (p && p.then) p.then(() => { bitti = true; }).catch(() => {});
      else bitti = true;
    };
    const olaylar = ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'];
    const hareketler = ['pointerdown', 'keydown', 'touchstart'];
    olaylar.forEach(e => v.addEventListener(e, oynat));
    hareketler.forEach(e => window.addEventListener(e, oynat));
    oynat();
    return () => {
      olaylar.forEach(e => v.removeEventListener(e, oynat));
      hareketler.forEach(e => window.removeEventListener(e, oynat));
    };
  }, [src]);

  if (!src) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 0,
      overflow: 'hidden', background: C.abyss,
    }}>
      <video ref={ref} src={src} poster={poster}
        autoPlay muted loop playsInline preload="auto"
        style={{
          position: 'absolute', inset: 0, display: 'block',
          width: '100%', height: '100%', objectFit: 'cover',
          filter: blur > 0 ? `blur(${blur}px)` : 'none',
          /* Bulanıklık kenarlarda saydam bir çerçeve bırakıyor; hafif
             büyütme onu ekran dışına itiyor. */
          transform: blur > 0 ? `scale(${1 + blur / 60})` : 'none',
          pointerEvents: 'none',
        }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `linear-gradient(180deg, rgba(5,10,18,${dim + 0.14}) 0%,`
          + ` rgba(5,10,18,${dim}) 45%, rgba(5,10,18,${dim + 0.2}) 100%)`,
      }} />
    </div>
  );
}
