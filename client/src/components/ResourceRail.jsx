/**
 * ResourceRail — sol kenar kaynak rayı.
 * Kaynaklar zincir hâlinde gruplanır; TAMAMI tek ekrana sığar (scroll yok).
 * Zeminler yarı saydam — arkadaki manzara görünür.
 *
 * Hover → brüt üretim / tüketim / net akış / kapasite / dolma-tükenme süresi.
 */
import { memo, useState } from 'react';
import { C, FONT, RES_COLOR, label as lbl, num, short, signed, fmtTime } from '../theme';
import { useHoverable, TAP } from '../responsive';
import { CHAINS, RES_LABEL } from '../flows';
import Icon from './Icons';

// Uzun adları rayda kısalt
const SHORT_LABEL = {
  yontmaTas: 'Yontma T.',
  demirKulce: 'Külçe',
};

function Bar({ pct, color, danger }) {
  return (
    <div style={{
      height: 2, borderRadius: 1, overflow: 'hidden',
      background: 'rgba(255,255,255,0.09)',
    }}>
      <div style={{
        height: '100%', borderRadius: 1,
        width: `${Math.max(0, Math.min(100, (pct || 0) * 100)).toFixed(1)}%`,
        background: danger ? C.danger : color,
        transition: 'width .35s ease-out',
      }} />
    </div>
  );
}

// ── Hover detay kartı ────────────────────────────────────────────────
function FlowCard({ f, at, sheet = false, onClose }) {
  if (!f) return null;
  const chainOf = CHAINS.find(c => c.steps.includes(f.key));
  const color = RES_COLOR[f.key] || C.ice;

  const rows = [
    { k: 'Brüt üretim', v: f.gross > 0 ? `+${f.gross.toFixed(1)}/sa` : '—',
      c: f.gross > 0 ? C.good : C.textMute },
    { k: 'Tüketim', v: f.consumed > 0 ? `−${f.consumed.toFixed(1)}/sa` : '—',
      c: f.consumed > 0 ? C.warn : C.textMute },
    { k: 'Net akış', v: signed(f.net) + '/sa',
      c: Math.abs(f.net) < 0.05 ? C.textMute : f.net > 0 ? C.good : C.danger, strong: true },
  ];

  let eta = null;
  if (f.etaKind === 'fill')  eta = { t: 'Depo dolar', v: fmtTime(f.etaSeconds), c: C.iceSoft };
  if (f.etaKind === 'full')  eta = { t: 'Depo', v: 'DOLU — üretim ziyan', c: C.danger };
  if (f.etaKind === 'drain') eta = { t: 'Tükenir', v: fmtTime(f.etaSeconds), c: C.danger };
  if (f.etaKind === 'empty') eta = { t: 'Stok', v: 'BİTTİ', c: C.danger };

  /**
   * Dokunmatikte kart imlecin yaninda degil ekranin ortasinda acilir:
   * parmagin altinda kalirdi ve `mouseleave` gelmedigi icin kapanmazdi.
   * Kapatma perdesi cagiran tarafta.
   */
  return (
    <div onClick={onClose} style={sheet ? {
      position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
      width: 'min(300px, 92vw)', maxHeight: '82vh', overflowY: 'auto', padding: 13,
      background: 'linear-gradient(180deg, rgba(13,26,42,0.98), rgba(9,18,30,0.98))',
      border: `1px solid ${C.lineBright}`, borderRadius: 10,
      boxShadow: '0 18px 50px rgba(0,0,0,.65)', zIndex: 9200,
    } : {
      position: 'fixed', left: at.x, top: at.y, width: 240, padding: 11,
      background: 'linear-gradient(180deg, rgba(13,26,42,0.9), rgba(9,18,30,0.9))',
      border: `1px solid ${C.lineBright}`, borderRadius: 8,
      backdropFilter: 'blur(18px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
      boxShadow: '0 12px 40px rgba(0,0,0,.55)',
      zIndex: 900, pointerEvents: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon name={f.key} size={19} color={color} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT.head, fontSize: 14.5, fontWeight: 600, color: C.frost, letterSpacing: 0.6 }}>
            {RES_LABEL[f.key] || f.key}
          </div>
          <div style={lbl({ fontSize: 8 })}>
            {chainOf ? chainOf.steps.map(s => RES_LABEL[s]).join(' → ') : 'kaynak'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 3 }}>
        <span style={num({ fontSize: 21, color: C.frost, lineHeight: 1 })}>{Math.floor(f.value)}</span>
        {f.capacity > 0 && (
          <span style={num({ fontSize: 10.5, color: C.textFaint })}>/ {short(f.capacity)}</span>
        )}
        {f.shared && <span style={lbl({ fontSize: 7.5, marginLeft: 'auto' })}>ambar ortak</span>}
      </div>
      {f.capacity > 0 && <Bar pct={f.pct} color={color} danger={f.etaKind === 'full'} />}

      <div style={{ height: 1, background: C.lineSoft, margin: '9px 0 7px' }} />

      {rows.map(r => (
        <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textDim }}>{r.k}</span>
          <span style={num({ fontSize: 10.5, color: r.c, fontWeight: r.strong ? 500 : 400 })}>{r.v}</span>
        </div>
      ))}

      {eta && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 7, paddingTop: 6, borderTop: `1px solid ${C.lineSoft}`,
        }}>
          <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textDim }}>{eta.t}</span>
          <span style={num({ fontSize: 10.5, color: eta.c })}>{eta.v}</span>
        </div>
      )}

      {(f.producer || f.consumer) && (
        <div style={{ marginTop: 7, paddingTop: 6, borderTop: `1px solid ${C.lineSoft}`, lineHeight: 1.5 }}>
          {f.producer && (
            <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint }}>
              İşleme binası:{' '}
              <span style={{ color: f.producer.workers > 0 ? C.good : C.warn }}>
                {f.producer.workers}/{f.producer.maxWorkers} işçi
              </span>
            </div>
          )}
          {f.consumer && (
            <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint }}>
              → <span style={{ color: C.iceSoft }}>{RES_LABEL[f.consumer.output]}</span> üretimine gidiyor
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tek kaynak satırı (kompakt: 2 satırlık, ~26px) ───────────────────
function ResRow({ f, resKey, onHover, onPick, hoverable = true }) {
  const color = RES_COLOR[resKey] || C.ice;
  const full = f?.etaKind === 'full';
  const dry = f?.etaKind === 'empty' || (f && f.net < 0 && f.value <= 0.5);
  const idle = !f || (f.gross === 0 && f.consumed === 0 && f.value === 0);
  const net = f?.net || 0;
  const zero = Math.abs(net) < 0.05;
  const netColor = zero ? C.textMute : net > 0 ? C.good : C.danger;

  /* Dokunmatikte hover yok — satıra dokununca kart açılır (bkz. responsive.js) */
  const hoverProps = hoverable ? {
    onMouseEnter: (e) => onHover(resKey, e),
    onMouseMove: (e) => onHover(resKey, e),
    onMouseLeave: () => onHover(null),
    onMouseOver: (e) => { e.currentTarget.style.background = 'rgba(127,212,255,0.09)'; },
    onMouseOut: (e) => { e.currentTarget.style.background = 'transparent'; },
  } : {};

  return (
    <div
      {...hoverProps}
      onClick={() => onPick?.(resKey)}
      style={{
        padding: '2px 6px 3px', borderRadius: 4,
        cursor: hoverable ? 'help' : 'pointer',
        opacity: idle ? 0.45 : 1, transition: 'background .12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name={resKey} size={13} color={color} />
        <span style={{
          flex: 1, fontFamily: FONT.ui, fontSize: 9.5, color: C.textDim,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {SHORT_LABEL[resKey] || RES_LABEL[resKey]}
        </span>
        <span style={num({
          fontSize: 12, lineHeight: 1, fontWeight: 500,
          color: dry ? C.danger : full ? C.warn : C.frost,
        })}>
          {short(f?.value || 0)}
        </span>
        <span style={num({ fontSize: 9, color: netColor, minWidth: 40, textAlign: 'right' })}>
          {zero ? '—' : signed(net)}
        </span>
      </div>
      <div style={{ marginTop: 2, marginLeft: 19 }}>
        {f?.capacity > 0
          ? <Bar pct={f.pct} color={color} danger={full} />
          : <div style={{ height: 2 }} />}
      </div>
    </div>
  );
}

/**
 * ResChip — TELEFON şeridindeki tek kaynak.
 *
 * Dar ekranda 11 kaynak alt alta sığmıyor; şerit yatay kayıyor ve her kaynak
 * yalnız simge + miktar + net gösteriyor. Ayrıntı (brüt, tüketim, depo dolma
 * süresi) dokununca açılan kartta — masaüstündeki hover kartının aynısı.
 */
function ResChip({ f, resKey, onPick }) {
  const color = RES_COLOR[resKey] || C.ice;
  const full = f?.etaKind === 'full';
  const dry = f?.etaKind === 'empty' || (f && f.net < 0 && f.value <= 0.5);
  const net = f?.net || 0;
  const zero = Math.abs(net) < 0.05;

  return (
    <button type="button" onClick={() => onPick?.(resKey)}
      style={{
        flex: '0 0 auto', minWidth: 58, minHeight: TAP - 8,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
        padding: '3px 7px', borderRadius: 5, cursor: 'pointer',
        background: 'rgba(12,20,28,0.5)',
        border: `1px solid ${dry ? 'rgba(232,99,111,0.45)' : full ? 'rgba(224,179,87,0.4)' : C.lineSoft}`,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon name={resKey} size={12} color={color} />
        <span style={num({
          fontSize: 12, lineHeight: 1, fontWeight: 500,
          color: dry ? C.danger : full ? C.warn : C.frost,
        })}>{short(f?.value || 0)}</span>
      </div>
      <span style={num({
        fontSize: 8.5, lineHeight: 1,
        color: zero ? C.textMute : net > 0 ? C.good : C.danger,
      })}>{zero ? '—' : signed(net)}</span>
    </button>
  );
}

// ── Zincir kartı ─────────────────────────────────────────────────────
function ChainCard({ chain, flows, onHover, onPick, hoverable }) {
  const anyFull = chain.steps.some(k => flows[k]?.etaKind === 'full');
  const anyDry = chain.steps.some(k => flows[k]?.etaKind === 'empty');

  return (
    <div style={{
      padding: '4px 3px 5px',
      borderRadius: 7,
      background: 'rgba(12, 20, 28, 0.34)',
      border: `1px solid ${anyDry ? 'rgba(232,99,111,0.4)' : anyFull ? 'rgba(224,179,87,0.32)' : C.lineSoft}`,
      backdropFilter: 'blur(15px) saturate(1.25)',
      WebkitBackdropFilter: 'blur(15px) saturate(1.25)',
    }}>
      <div style={{ padding: '0 7px 2px' }}>
        <span style={lbl({
          fontSize: 7.5, letterSpacing: 1.3, color: RES_COLOR[chain.id],
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block',
        })}>
          {chain.steps.map(s => (SHORT_LABEL[s] || RES_LABEL[s])).join(' › ')}
        </span>
      </div>
      {chain.steps.map(k => (
        <ResRow key={k} resKey={k} f={flows[k]} onHover={onHover}
          onPick={onPick} hoverable={hoverable} />
      ))}
    </div>
  );
}

// ── Ana bileşen ──────────────────────────────────────────────────────
function ResourceRail({ flows = {}, isStarving = false, mobile = false, railW = 186 }) {
  const [hover, setHover] = useState(null);
  const [pick, setPick] = useState(null);      // dokunmatikte açılan kart
  const hoverable = useHoverable();

  function onHover(key, e) {
    if (!key) return setHover(null);
    const pad = 14, w = 240, h = 330;
    let x = (e?.clientX || 0) + pad;
    let y = (e?.clientY || 0) - 40;
    if (x + w > window.innerWidth - 8) x = (e?.clientX || 0) - w - pad;
    if (y + h > window.innerHeight - 8) y = window.innerHeight - h - 8;
    if (y < 8) y = 8;
    setHover({ key, x, y });
  }

  /* Fare varken tıklama kartı açmasın — hover zaten gösteriyor */
  const onPick = (key) => { if (!hoverable || mobile) setPick(k => (k === key ? null : key)); };

  // ── TELEFON: üst barın altında yatay şerit ────────────────────────
  if (mobile) {
    return (
      <>
        <div className="tn-scroll" style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 7px', overflowX: 'auto', overflowY: 'hidden',
          background: 'rgba(10,17,25,0.72)',
          borderBottom: `1px solid ${C.lineSoft}`,
          backdropFilter: 'blur(14px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(14px) saturate(1.2)',
        }}>
          {isStarving && (
            <span className="tn-pulse" title="Yiyecek yetmiyor — fırına işçi ata"
              style={{
                flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '4px 6px', borderRadius: 4,
                background: 'rgba(232,99,111,0.16)', border: `1px solid ${C.dangerDim}`,
              }}>
              <Icon name="uyari" size={11} color={C.danger} />
              <span style={{ fontFamily: FONT.ui, fontSize: 8, letterSpacing: 0.8, color: '#f0b8bd' }}>
                AÇLIK
              </span>
            </span>
          )}
          {CHAINS.flatMap(c => c.steps).map(k => (
            <ResChip key={k} resKey={k} f={flows[k]} onPick={onPick} />
          ))}
        </div>

        {pick && (
          <>
            <div onClick={() => setPick(null)} style={{
              position: 'fixed', inset: 0, zIndex: 9150, background: 'rgba(0,0,0,0.5)',
            }} />
            <FlowCard f={flows[pick]} at={{ x: 0, y: 0 }} sheet onClose={() => setPick(null)} />
          </>
        )}
      </>
    );
  }

  // ── MASAÜSTÜ: sol sütun ───────────────────────────────────────────
  return (
    <>
      <div style={{
        width: railW, flexShrink: 0, zIndex: 5,
        display: 'flex', flexDirection: 'column', gap: 5,
        padding: '7px 5px 7px 7px',
        overflow: 'hidden',           // scroll yok — her şey sığar
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 3px 1px' }}>
          <Icon name="depo" size={11} color={C.iceDeep} />
          <span style={lbl({ fontSize: 8, letterSpacing: 1.5 })}>Kaynaklar</span>
          {isStarving && (
            <span style={{
              marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '1px 5px', borderRadius: 3,
              background: 'rgba(232,99,111,0.16)', border: `1px solid ${C.dangerDim}`,
            }} className="tn-pulse" title="Yiyecek yetmiyor — fırına işçi ata">
              <Icon name="uyari" size={9} color={C.danger} />
              <span style={{ fontFamily: FONT.ui, fontSize: 7.5, letterSpacing: 0.8, color: '#f0b8bd' }}>
                AÇLIK
              </span>
            </span>
          )}
        </div>

        {CHAINS.map(chain => (
          <ChainCard key={chain.id} chain={chain} flows={flows}
            onHover={onHover} onPick={onPick} hoverable={hoverable} />
        ))}
      </div>

      {hoverable && hover && <FlowCard f={flows[hover.key]} at={hover} />}
      {pick && (
        <>
          <div onClick={() => setPick(null)} style={{
            position: 'fixed', inset: 0, zIndex: 9150, background: 'rgba(0,0,0,0.5)',
          }} />
          <FlowCard f={flows[pick]} at={{ x: 0, y: 0 }} sheet onClose={() => setPick(null)} />
        </>
      )}
    </>
  );
}

export default memo(ResourceRail);
