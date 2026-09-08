/**
 * Birim detay penceresi — karta tıklanınca açılır.
 *
 * Düzen: pencerenin TAMAMI 9:16 dikey görsel. Yazılar görselin üstünde,
 * yarı saydam + hafif bulanık bir zeminde duruyor; karakter zeminin arkasından
 * görünmeye devam ediyor. (Önceki hâlde görsel üstte, metin altta ayrı bloktaydı.)
 *
 * DİKKAT: createPortal ile document.body'ye çiziliyor. Popover'ın stilinde
 * backdropFilter var; bu bir "containing block" oluşturduğu için position:fixed
 * viewport'a değil popover kutusuna göre konumlanıyor ve pencere kırpılıyordu.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, btn, label as lbl, num } from '../theme';
import { EQ_LABEL } from '../flows';
import { unitImage } from '../data/unitImages';
import { unitLore } from '../data/unitLore';
import Icon from './Icons';

const CAT_LABEL = { piyade: 'Piyade', suvari: 'Süvari', kusatma: 'Kuşatma' };
const CAT_COLOR = { piyade: '#7fd4ff', suvari: '#a99cf0', kusatma: '#d9c069' };

function StatBox({ icon, label, value, color }) {
  return (
    <div style={{
      minWidth: 0, padding: '5px 6px', borderRadius: 5,
      background: 'rgba(6,12,20,0.55)', border: '1px solid rgba(255,255,255,0.13)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Icon name={icon} size={10} color={color} />
        <span style={lbl({
          fontSize: 7, letterSpacing: 0.8, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        })}>{label}</span>
      </div>
      <div style={num({
        fontSize: 14, color: C.frost, lineHeight: 1.2, marginTop: 1,
        textShadow: '0 1px 3px rgba(0,0,0,0.9)',
      })}>{value}</div>
    </div>
  );
}

export default function UnitDetail({ type, def, count, equipmentDefs = {}, onClose }) {
  // ESC ile kapat
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!def) return null;
  const img = unitImage(type);
  const lore = unitLore(type);
  const color = CAT_COLOR[def.category] || C.iceSoft;
  const s = def.stats || {};

  // Yarı saydam yazı zemini — karakter arkadan görünsün
  const glass = {
    background: 'rgba(8,15,24,0.52)',
    backdropFilter: 'blur(7px) saturate(1.1)',
    WebkitBackdropFilter: 'blur(7px) saturate(1.1)',
    border: '1px solid rgba(255,255,255,0.10)',
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(4,8,13,0.72)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'grid', placeItems: 'center', padding: 16,
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="tn-rise"
        style={{
          // Pencerenin kendisi 9:16 — genişlik en kısıtlı ölçüden gelir,
          // yükseklik orandan türer, böylece görsel hiç kırpılmadan doluyor.
          width: 'min(90vw, 51vh, 520px)',
          aspectRatio: '9 / 16',
          position: 'relative', overflow: 'hidden', borderRadius: 10,
          background: '#0b1420',
          border: `1px solid ${color}55`,
          boxShadow: '0 24px 70px rgba(0,0,0,0.75)',
        }}>
        {img ? (
          <img src={img} alt={def.name || type} draggable={false}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: '50% 18%', display: 'block',
            }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <Icon name={def.category === 'suvari' ? 'at' : 'kalkan'}
              size={64} color={C.lineBright} strokeWidth={1.1} />
          </div>
        )}

        {/* Alt karartma — yazı zemininin altına yumuşak geçiş */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%',
          background: 'linear-gradient(180deg, transparent, rgba(4,9,15,0.35) 45%, rgba(4,9,15,0.72))',
          pointerEvents: 'none',
        }} />

        <button onClick={onClose} title="Kapat (Esc)"
          style={{
            position: 'absolute', top: 9, right: 9, zIndex: 3,
            display: 'grid', placeItems: 'center', width: 28, height: 28, padding: 0,
            borderRadius: 5, cursor: 'pointer',
            background: 'rgba(4,9,15,0.7)', border: `1px solid ${C.lineBright}`,
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          }}>
          <Icon name="kapat" size={13} color={C.textDim} strokeWidth={2} />
        </button>

        {count != null && (
          <div style={{
            position: 'absolute', top: 9, left: 9, zIndex: 3,
            padding: '3px 10px', borderRadius: 5,
            background: 'rgba(4,9,15,0.7)', border: `1px solid ${color}66`,
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          }}>
            <span style={num({ fontSize: 15, color, fontWeight: 500 })}>{count}</span>
            <span style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textMute }}> asker</span>
          </div>
        )}

        {/* METİN — görselin üstünde, yarı saydam zeminde */}
        <div style={{
          position: 'absolute', left: 10, right: 10, bottom: 10, zIndex: 2,
          display: 'flex', flexDirection: 'column', gap: 8,
          padding: '11px 12px 11px', borderRadius: 8,
          // Küçük ekranda metin taşarsa pencereyi büyütmek yerine kendi içinde kaysın
          maxHeight: 'calc(100% - 20px)', overflowY: 'auto',
          ...glass,
        }}>
          <div>
            <div style={{
              fontFamily: FONT.head, fontSize: 23, fontWeight: 600, letterSpacing: 1.3,
              color: C.frost, lineHeight: 1.12,
              textShadow: '0 2px 6px rgba(0,0,0,0.85)',
            }}>{def.name || type}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={lbl({ fontSize: 8, letterSpacing: 1.5, color })}>
                {(CAT_LABEL[def.category] || def.category || '').toUpperCase()}
              </span>
              <span style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {(def.equipment || []).map(eq => (
                  <span key={eq} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Icon name={eq} size={10} color={C.textDim} />
                    <span style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textDim }}>
                      {EQ_LABEL[eq] || equipmentDefs[eq]?.name || eq}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {lore && (
            <>
              <p style={{
                margin: 0, fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 1.65,
                color: '#d6e2ee', textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}>{lore.story}</p>

              <div style={{
                display: 'flex', gap: 8, padding: '8px 10px', borderRadius: 6,
                background: `${color}1f`, border: `1px solid ${color}4d`,
              }}>
                <Icon name="bonus" size={13} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{
                  fontFamily: FONT.ui, fontSize: 11, lineHeight: 1.6, color: '#eaf2fa',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                }}>{lore.strength}</span>
              </div>
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 5 }}>
            <StatBox icon="kilic"  label="SALDIRI"  value={s.saldiri ?? '—'}  color={C.danger} />
            <StatBox icon="kalkan" label="YAYA"     value={s.yayaSav ?? '—'}  color={C.good} />
            <StatBox icon="mizrak" label="ATLI"     value={s.atliSav ?? '—'}  color={C.good} />
            <StatBox icon="hiz"    label="HIZ"      value={s.hiz ?? '—'}      color={C.iceDeep} />
            <StatBox icon="depo"   label="TAŞIMA"   value={s.kapasite ?? '—'} color={C.textDim} />
          </div>

          <button onClick={onClose}
            style={btn('ghost', {
              width: '100%', padding: 8, letterSpacing: 1.4, fontSize: 9.5,
              background: 'rgba(6,12,20,0.5)',
            })}>
            KAPAT
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
