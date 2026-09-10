/**
 * VillageSwitcher — üst bardaki köy değiştirici.
 *
 * Oyuncunun bütün köyleri burada; tıklayınca sunucuya `switch_village`
 * gidiyor ve o köyün paneli açılıyor. Arkadaki köyler tick almaya devam
 * ediyor, yani "kapalı" köy diye bir şey yok.
 *
 * Tek köy varken hiç görünmüyor — ekranda gereksiz yer tutmasın.
 */
import { useEffect, useRef, useState } from 'react';
import { C, FONT, label as lbl, num } from '../theme';
import { useViewport } from '../responsive';
import { unseenCount } from './ReportScreen';
import Icon from './Icons';

/**
 * BU KÖYE DİKKAT ETMELİ MİYİM?
 *
 * Rapor listesi ve gelen sefer uyarısı yalnız AKTİF köyün paketinde
 * geliyor; saldırı başka köyüne gelirse oyuncu hiçbir şey görmüyordu.
 * Sunucu artık köy başına `incoming` (yürüyen düşman sefer sayısı) ve
 * `reportIds` yolluyor; okunmuş işareti istemcide tutulduğu için
 * okunmamış sayısını burada hesaplıyoruz.
 */
function koyUyarisi(v) {
  const gelen = v.incoming || 0;
  const okunmamis = Array.isArray(v.reportIds)
    ? unseenCount(v.reportIds.map(id => ({ id }))) : 0;
  return { gelen, okunmamis, var: gelen > 0 || okunmamis > 0 };
}

/** Taç — merkez köy işareti */
function Crown({ size = 9, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M3 18h18l-1.6-9-4.4 3.6L12 5l-3 7.6L4.6 9 3 18Z" />
    </svg>
  );
}

export default function VillageSwitcher({ villages = [], activeSlot, onSwitch }) {
  const vp = useViewport();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // Dışına tıklanınca kapan — açılır liste ekranın yarısını kaplamasın
  useEffect(() => {
    if (!open) return;
    const kapat = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    window.addEventListener('pointerdown', kapat);
    return () => window.removeEventListener('pointerdown', kapat);
  }, [open]);

  // Tek köyde değiştiriciye gerek yok
  if (!Array.isArray(villages) || villages.length < 2) return null;

  const aktif = villages.find(v => v.slotKey === activeSlot) || villages[0];
  /*
    Kapalı düğmede de uyarı olmalı: aksi hâlde saldırıyı görmek için
    listeyi açmak gerekiyor, oyuncu da açmayı akıl etmiyor.
    Yalnız AKTİF OLMAYAN köyler sayılıyor — aktif köyün uyarısı zaten
    ekranda (raporlar sekmesi rozeti, gelen sefer şeridi).
  */
  const arkadaGelen = villages
    .filter(v => v.slotKey !== activeSlot)
    .reduce((n, v) => n + (v.incoming || 0), 0);

  return (
    <div ref={boxRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        title="Köy değiştir"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: vp.mobile ? '0 9px' : '4px 9px',
          minHeight: vp.mobile ? 36 : 0,
          borderRadius: 5, cursor: 'pointer',
          background: open ? 'rgba(127,212,255,0.12)' : 'rgba(20,34,50,0.55)',
          border: `1px solid ${open ? C.iceDeep : C.lineSoft}`,
          maxWidth: vp.mobile ? 138 : 190,
        }}>
        <Icon name="koy" size={13} color={C.iceSoft} />
        <span style={{
          fontFamily: FONT.ui, fontSize: 11, color: C.frost,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{aktif?.name || activeSlot}</span>
        {aktif?.isCapital && <Crown color="#f0c860" />}
        {arkadaGelen > 0 && (
          <span className="tn-pulse" title={`Başka köyüne ${arkadaGelen} düşman seferi yolda`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0,
              padding: '1px 4px', borderRadius: 3,
              background: 'rgba(232,99,111,0.2)', border: `1px solid ${C.dangerDim}`,
            }}>
            <Icon name="kilic" size={9} color={C.danger} />
            <span style={num({ fontSize: 8.5, color: C.danger })}>{arkadaGelen}</span>
          </span>
        )}
        <span style={num({ fontSize: 9, color: C.textMute })}>
          {villages.length}
        </span>
        <svg width="9" height="9" viewBox="0 0 12 12" style={{
          flexShrink: 0, opacity: 0.6,
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .16s',
        }}>
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke={C.iceSoft}
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 60,
          minWidth: 230, padding: 5, borderRadius: 7,
          background: 'linear-gradient(180deg, rgba(13,26,42,0.97), rgba(9,18,30,0.97))',
          border: `1px solid ${C.lineBright}`,
          boxShadow: '0 12px 34px rgba(0,0,0,.55)',
          backdropFilter: 'blur(18px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
        }}>
          <div style={lbl({ fontSize: 7.5, letterSpacing: 1.3, padding: '3px 6px 5px' })}>
            Köylerim ({villages.length})
          </div>
          {villages.map(v => {
            const on = v.slotKey === activeSlot;
            return (
              <button key={v.slotKey} type="button"
                onClick={() => { if (!on) onSwitch?.(v.slotKey); setOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                  padding: '6px 7px', marginBottom: 1, borderRadius: 4,
                  background: on ? 'rgba(127,212,255,0.13)' : 'transparent',
                  border: `1px solid ${on ? `${C.iceDeep}66` : 'transparent'}`,
                  color: on ? C.frost : C.textDim,
                  cursor: on ? 'default' : 'pointer',
                  fontFamily: FONT.ui, fontSize: 11, textAlign: 'left',
                }}>
                <Icon name="koy" size={12} color={on ? C.iceSoft : C.textFaint} />
                <span style={{
                  flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{v.name || v.slotKey}</span>

                {/* Durum işaretleri: merkez, inşaat sürüyor, açlık, saldırı */}
                {v.isCapital && <Crown color="#f0c860" />}
                {v.building && <Icon name="insaat" size={10} color={C.ice} />}
                {v.starving && <Icon name="uyari" size={10} color={C.danger} />}
                {(() => {
                  const u = koyUyarisi(v);
                  if (!u.var) return null;
                  return (
                    <span title={u.gelen > 0
                      ? `${u.gelen} düşman seferi yolda`
                      : `${u.okunmamis} okunmamış rapor`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        padding: '1px 4px', borderRadius: 3, flexShrink: 0,
                        background: u.gelen > 0 ? 'rgba(232,99,111,0.18)' : 'rgba(224,179,87,0.16)',
                        border: `1px solid ${u.gelen > 0 ? C.dangerDim : 'rgba(224,179,87,0.4)'}`,
                      }}
                      className={u.gelen > 0 ? 'tn-pulse' : undefined}>
                      <Icon name={u.gelen > 0 ? 'kilic' : 'savas'} size={9}
                        color={u.gelen > 0 ? C.danger : C.warn} />
                      <span style={num({ fontSize: 8.5, color: u.gelen > 0 ? C.danger : C.warn })}>
                        {u.gelen > 0 ? u.gelen : u.okunmamis}
                      </span>
                    </span>
                  );
                })()}

                <span style={num({ fontSize: 9, color: C.textMute, minWidth: 30, textAlign: 'right' })}>
                  {v.population}
                </span>
                <span style={num({ fontSize: 8.5, color: C.textFaint, minWidth: 44, textAlign: 'right' })}>
                  {v.slotKey}
                </span>
              </button>
            );
          })}
          <div style={{
            padding: '5px 7px 2px', fontFamily: FONT.ui, fontSize: 9,
            color: C.textFaint, lineHeight: 1.45,
          }}>
            Bütün köyler arka planda çalışmaya devam eder.
          </div>
        </div>
      )}
    </div>
  );
}
