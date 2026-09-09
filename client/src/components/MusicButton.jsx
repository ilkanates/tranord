/**
 * MusicButton — üst bardaki müzik denetimi.
 *
 * Tıklayınca sessize alır/açar; üstüne gelince ses kaydırıcısı ve "sıradaki
 * parça" düğmesi açılır. Tam ayarlar menüsü gelene kadar (TODO) müziği
 * kapatmak için tek yer burası; tercih tarayıcıda saklanıyor.
 */
import { useEffect, useRef, useState } from 'react';
import { C, FONT, label as lbl, num } from '../theme';
import { setMuted, setVolume, nextTrack, subscribe } from '../audio';

/** Hoparlör — sessizken üstü çizili, açıkken ses dalgaları */
function Speaker({ muted, size = 15, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5h3l4.5-3.5v12L7 14.5H4z" />
      {muted ? (
        <path d="M16 9.5l5 5M21 9.5l-5 5" />
      ) : (
        <>
          <path d="M16.2 9a4.2 4.2 0 0 1 0 6" />
          <path d="M18.6 6.8a7.4 7.4 0 0 1 0 10.4" opacity="0.7" />
        </>
      )}
    </svg>
  );
}

export default function MusicButton() {
  const [s, setS] = useState({ muted: false, volume: 0.45, playing: false, track: '' });
  const [open, setOpen] = useState(false);
  const closeRef = useRef(null);

  useEffect(() => subscribe(setS), []);
  useEffect(() => () => clearTimeout(closeRef.current), []);

  /**
   * Panel düğmenin ALTINDA duruyor ve aradaki boşluk imleç geçerken
   * "hover" durumunu bozuyordu: menüye giderken kapanıyor, ses kısılamıyordu.
   * İki önlem: (1) görsel boşluk margin değil PADDING — yani boşluk da
   * kabın hover alanı içinde kalıyor, (2) ayrılışta kısa gecikme, imleç
   * bir an dışarı çıksa bile panel kapanmıyor.
   */
  const show = () => { clearTimeout(closeRef.current); setOpen(true); };
  const hide = () => {
    clearTimeout(closeRef.current);
    closeRef.current = setTimeout(() => setOpen(false), 220);
  };

  const color = s.muted ? C.textMute : C.iceSoft;

  return (
    <div
      onMouseEnter={show}
      onMouseLeave={hide}
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>

      <button type="button" onClick={() => setMuted(!s.muted)}
        title={s.muted ? 'Müziği aç' : 'Müziği kapat'}
        style={{
          display: 'grid', placeItems: 'center', width: 28, height: 28, padding: 0,
          background: 'none', border: 'none', cursor: 'pointer',
        }}>
        <Speaker muted={s.muted} color={color} />
      </button>

      {open && (
        /* Dış kap saydam ve boşluğu KENDİ içinde taşıyor: imleç düğmeden
           panele giderken hover hiç kopmuyor. */
        <div
          onMouseEnter={show}
          onMouseLeave={hide}
          style={{
            position: 'absolute', top: '100%', right: 0, zIndex: 60,
            paddingTop: 6, width: 178,
          }}>
        <div style={{
          width: '100%', boxSizing: 'border-box',
          padding: '9px 10px', borderRadius: 7,
          background: 'linear-gradient(180deg, rgba(13,26,42,0.96), rgba(9,18,30,0.96))',
          border: `1px solid ${C.lineBright}`,
          boxShadow: '0 12px 34px rgba(0,0,0,.55)',
          backdropFilter: 'blur(18px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
            <span style={lbl({ fontSize: 7.5, letterSpacing: 1.3, flex: 1 })}>Müzik</span>
            <span style={num({ fontSize: 9.5, color: C.textFaint })}>
              {s.muted ? 'kapalı' : `%${Math.round(s.volume * 100)}`}
            </span>
          </div>

          <input type="range" min={0} max={100} step={1}
            value={Math.round(s.volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            style={{ width: '100%', height: 4 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <button type="button" onClick={() => nextTrack()}
              style={{
                padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                background: 'rgba(28,51,73,0.6)', border: `1px solid ${C.lineSoft}`,
                color: C.iceSoft, fontFamily: FONT.ui, fontSize: 9,
              }}>sıradaki</button>
            <span style={{
              flex: 1, fontFamily: FONT.ui, fontSize: 9, color: C.textFaint,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              textAlign: 'right',
            }}>
              {s.muted ? '—' : (s.track || 'yükleniyor…')}
            </span>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
