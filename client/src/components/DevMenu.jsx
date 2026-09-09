/**
 * DevMenu — TEST tuşları tek menü altında.
 *
 * Bunlar kasten kural TANIMAYAN kısayollar: kaynak, süre, köy hakkı,
 * göçmen hiçbiri sorulmaz. Amaç oyunu denerken beklememek.
 *
 * Yalnız geliştirme derlemesinde görünür (import.meta.env.DEV) ve sunucu
 * tarafı da TRANORD_DEV_CHEATS=1 istiyor — üretimde ne düğme ne olay var.
 */
import { useEffect, useRef, useState } from 'react';
import { C, FONT, btn, label as lbl, num } from '../theme';
import Icon from './Icons';

/** Menüdeki her satır: ne yaptığını açıkça yazsın */
const ITEMS = [
  {
    key: 'depo',
    label: 'Depoları doldur',
    note: '4 ambar Lvl 10 + tam dolu',
    emit: ['dev_setup', { level: 10, fill: true }],
  },
  {
    key: 'koy',
    label: 'İkinci köy ver',
    note: 'merkeze en yakın boş slota',
    emit: ['dev_new_village', {}],
  },
  {
    key: 'ordu',
    label: 'Ordu ver',
    note: '200 piyade · 60 süvari · 5 kuşatma',
    emit: ['dev_grant', {
      army: {
        fjordvakt: 100, skjoldvakt: 60, spydvakt: 40,
        demirAtli: 40, skjoldreiter: 20,
        kaleKiran: 5,
      },
    }],
  },
];

export default function DevMenu({
  socket,
  /**
   * HIZ — üst bardan buraya taşındı. Oyuncunun sürekli göreceği bir denetim
   * değil: 128×'e kadar çıkıyor ve tek işi test etmeyi hızlandırmak.
   */
  tickMs = 1000, setSpeed, hourSeconds = 3600,
  speedSteps = [1], scaleLabel = null,
}) {
  const [open, setOpen] = useState(false);
  /**
   * Son sonuç. Eskiden tuşa basınca HİÇBİR geri bildirim yoktu: sunucu eski
   * kodla çalışıyorsa (olay tanımlı değil) tık boşa gidiyor ve oyuncu neden
   * olmadığını anlamıyordu. Artık sunucu her kısayolda `dev_result` yolluyor;
   * 3 saniyede yanıt gelmezse bunu ayrıca söylüyoruz.
   */
  const [sonuc, setSonuc] = useState(null);   // { ok, message } | { bekliyor } | { sessiz }
  const boxRef = useRef(null);
  const zamanRef = useRef(null);

  // Sunucu yanıtı
  useEffect(() => {
    if (!socket) return;
    const gelen = (r) => {
      clearTimeout(zamanRef.current);
      setSonuc({ ok: r?.ok !== false, message: r?.message || (r?.ok === false ? 'başarısız' : 'tamam') });
    };
    socket.on('dev_result', gelen);
    return () => socket.off('dev_result', gelen);
  }, [socket]);

  useEffect(() => () => clearTimeout(zamanRef.current), []);

  // Dışına tıklanınca kapan
  useEffect(() => {
    if (!open) return;
    const kapat = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    window.addEventListener('pointerdown', kapat);
    return () => window.removeEventListener('pointerdown', kapat);
  }, [open]);

  if (!socket) return null;

  const calistir = (item) => {
    socket.emit(item.emit[0], item.emit[1]);
    setSonuc({ bekliyor: true, message: item.label + '…' });
    clearTimeout(zamanRef.current);
    // Yanıt gelmiyorsa sebebi neredeyse her zaman aynı: sunucu bu olayı
    // tanımayan eski sürümle çalışıyor ya da dev kısayolları kapalı.
    zamanRef.current = setTimeout(() => setSonuc({
      ok: false,
      message: 'Sunucu yanıt vermedi. Sunucu eski kodla mı çalışıyor? '
        + '(yeniden başlat) — TRANORD_DEV_CHEATS=1 gerekiyor.',
    }), 3000);
  };

  const SARI = '#e0b357';

  /** Mevcut tick aralığına en yakın hız kademesi (üst bardaki hesabın aynısı) */
  const carpan = +(1000 / tickMs).toFixed(4);
  const hizIdx = speedSteps.reduce(
    (best, m, i) => (Math.abs(m - carpan) < Math.abs(speedSteps[best] - carpan) ? i : best), 0);

  return (
    <div ref={boxRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        title="Test kısayolları (yalnız geliştirme)"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 8px', marginLeft: 4, borderRadius: 4, cursor: 'pointer',
          background: open ? 'rgba(224,179,87,0.16)' : 'transparent',
          border: `1px solid rgba(224,179,87,${open ? 0.7 : 0.45})`,
          color: SARI, fontFamily: FONT.ui, fontSize: 9, letterSpacing: 0.6,
        }}>
        TEST
        <svg width="8" height="8" viewBox="0 0 12 12" style={{
          opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .16s',
        }}>
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke={SARI}
            strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 60,
          minWidth: 208, padding: 5, borderRadius: 7,
          background: 'linear-gradient(180deg, rgba(13,26,42,0.97), rgba(9,18,30,0.97))',
          border: '1px solid rgba(224,179,87,0.35)',
          boxShadow: '0 12px 34px rgba(0,0,0,.55)',
          backdropFilter: 'blur(18px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
        }}>
          <div style={lbl({ fontSize: 7.5, letterSpacing: 1.3, padding: '3px 6px 5px', color: SARI })}>
            Test kısayolları
          </div>

          {ITEMS.map(item => (
            <button key={item.key} type="button" onClick={() => calistir(item)}
              style={{
                width: '100%', display: 'block', textAlign: 'left',
                padding: '6px 7px', marginBottom: 1, borderRadius: 4,
                background: 'transparent', border: '1px solid transparent',
                cursor: 'pointer', color: C.text,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(224,179,87,0.10)';
                e.currentTarget.style.borderColor = 'rgba(224,179,87,0.35)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}>
              <div style={{ fontFamily: FONT.ui, fontSize: 11 }}>{item.label}</div>
              <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint, marginTop: 1 }}>
                {item.note}
              </div>
            </button>
          ))}

          {setSpeed && speedSteps.length > 1 && (
            <div style={{
              marginTop: 4, paddingTop: 6,
              borderTop: `1px solid rgba(224,179,87,0.22)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 7px 4px' }}>
                <Icon name="hiz" size={11} color={SARI} />
                <span style={lbl({ fontSize: 7.5, letterSpacing: 1.3, flex: 1, color: SARI })}>
                  Oyun hızı
                </span>
                <span style={num({ fontSize: 11, color: C.iceSoft })}>
                  {speedSteps[hizIdx]}×
                </span>
              </div>

              <div style={{ padding: '0 7px' }}>
                <input type="range" min={0} max={speedSteps.length - 1} step={1} value={hizIdx}
                  onChange={(e) => setSpeed(Math.round(1000 / speedSteps[Number(e.target.value)]))}
                  style={{ width: '100%', height: 4 }}
                  title={`${speedSteps[hizIdx]}× hız`} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{
                    flex: 1, fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint,
                  }}>
                    {scaleLabel ? scaleLabel(hourSeconds, speedSteps[hizIdx]) : ''}
                  </span>
                  <button type="button" onClick={() => setSpeed(1000)}
                    disabled={speedSteps[hizIdx] === 1}
                    style={btn(speedSteps[hizIdx] === 1 ? 'disabled' : 'ghost',
                      { padding: '2px 8px', fontSize: 9 })}>1×</button>
                </div>
              </div>
            </div>
          )}

          <div style={{
            padding: '5px 7px 2px', fontFamily: FONT.ui, fontSize: 8.5,
            color: sonuc
              ? (sonuc.bekliyor ? C.textDim : (sonuc.ok ? C.good : C.danger))
              : C.textFaint,
            lineHeight: 1.45,
          }}>
            {sonuc
              ? (sonuc.bekliyor ? sonuc.message : (sonuc.ok ? '✓ ' : '✕ ') + sonuc.message)
              : 'Kural tanımaz kısayollar. Sunucuda TRANORD_DEV_CHEATS=1 gerekiyor.'}
          </div>
        </div>
      )}
    </div>
  );
}
