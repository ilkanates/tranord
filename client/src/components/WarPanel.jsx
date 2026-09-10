/**
 * SEFERLER ve GELEN SALDIRI UYARISI — Ordu sekmesinde ordu kartlarının üstünde.
 * Savaş raporları ayrı bir ekranda: ReportScreen.jsx (Raporlar sekmesi).
 *
 * Geri sayımlar sunucudan geliyor (`timeLeft`, her tick tazelenir) — burada
 * ayrı bir zamanlayıcı YOK. Sebep: sefer süresi gerçek zamanla akıyor, köyün
 * hız çarpanıyla değil; istemcide sayaç tutmak iki saatin arasında kayma
 * üretirdi.
 */
import { C, FONT, panel, label as lbl, num, short, fmtTime } from '../theme';
import Icon from './Icons';

const MODE_LABEL = { raid: 'Yağma', attack: 'Saldırı', scout: 'Keşif', yerlesim: 'Yerleşim' };
const MODE_COLOR = { raid: C.warn, attack: C.danger, scout: C.ice, yerlesim: C.good };
const MODE_ICON  = { raid: 'depo', attack: 'kilic', scout: 'harita', yerlesim: 'koy' };

const sum = (o) => Object.values(o || {}).reduce((a, b) => a + (b || 0), 0);

function UnitList({ units, color = C.textDim, unitDefs = {} }) {
  const items = Object.entries(units || {}).filter(([, n]) => n > 0);
  if (!items.length) return <span style={{ color: C.textMute }}>yok</span>;
  return (
    <span style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
      {items.map(([u, n]) => (
        <span key={u} style={num({ fontSize: 10, color })}>
          {n} <span style={{ color: C.textMute, fontSize: 9 }}>{unitDefs[u]?.name || u}</span>
        </span>
      ))}
    </span>
  );
}

// ── Gelen saldırı uyarısı ────────────────────────────────────────────
export function IncomingAlert({ incoming = [] }) {
  if (!incoming.length) return null;
  const next = incoming[0];
  return (
    <div style={panel({
      padding: '9px 11px', marginBottom: 9,
      background: 'rgba(255,111,120,0.11)', border: `1px solid ${C.danger}66`,
      display: 'flex', alignItems: 'center', gap: 10,
    })} className="tn-pulse">
      <Icon name="uyari" size={18} color={C.danger} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT.head, fontSize: 14, fontWeight: 600, color: '#ffb8bd',
          letterSpacing: 0.6,
        }}>
          {incoming.length > 1 ? `${incoming.length} SALDIRI YOLDA` : 'SALDIRI YOLDA'}
        </div>
        <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim, marginTop: 1 }}>
          {next.fromName} → köyün · yaklaşık {next.sizeApprox || '?'} asker ·
          {' '}{MODE_LABEL[next.mode] || next.mode}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>VARIŞ</div>
        <div style={num({ fontSize: 17, color: C.danger })}>{fmtTime(next.timeLeft)}</div>
      </div>
    </div>
  );
}

// ── Yoldaki seferler ─────────────────────────────────────────────────
export function MarchPanel({ marches = [], incoming = [], unitDefs = {}, maxMarches = 8 }) {
  const mine = marches;
  if (!mine.length && !incoming.length) return null;

  return (
    <div style={panel({ padding: 11, marginBottom: 9 })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Icon name="ordu" size={14} color={C.iceDeep} />
        <span style={lbl({ fontSize: 9, letterSpacing: 1.5 })}>Seferler</span>
        <span style={num({ fontSize: 9.5, color: C.textMute, marginLeft: 'auto' })}>
          {mine.length}/{maxMarches}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {mine.map(m => {
          const back = m.phase === 'return';
          const col = back ? C.good : MODE_COLOR[m.mode] || C.ice;
          return (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 9px', borderRadius: 5,
              background: 'rgba(8,17,28,0.55)', border: `1px solid ${col}44`,
            }}>
              <Icon name={back ? 'depo' : MODE_ICON[m.mode] || 'ordu'} size={14} color={col} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT.ui, fontSize: 11, color: C.text }}>
                  {back ? 'Dönüşte' : `${MODE_LABEL[m.mode] || m.mode} →`} <b style={{ color: C.frost }}>{m.toName}</b>
                  <span style={{ color: C.textMute }}> · {m.distance} hex</span>
                </div>
                <div style={{ marginTop: 2 }}>
                  <UnitList units={m.units} unitDefs={unitDefs} color={C.textDim} />
                  {back && sum(m.loot) > 0 && (
                    <span style={{ marginLeft: 8 }}>
                      <Icon name="depo" size={9} color={C.warn} />
                      <span style={num({ fontSize: 10, color: C.warn, marginLeft: 3 })}>
                        +{short(sum(m.loot))}
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={lbl({ fontSize: 7, letterSpacing: 0.9 })}>
                  {back ? 'EVE' : 'VARIŞ'}
                </div>
                <div style={num({ fontSize: 14, color: col })}>{fmtTime(m.timeLeft)}</div>
              </div>
            </div>
          );
        })}

        {incoming.map(inc => (
          <div key={inc.key} style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '7px 9px', borderRadius: 5,
            background: 'rgba(255,111,120,0.09)', border: `1px solid ${C.danger}55`,
          }}>
            <Icon name="uyari" size={14} color={C.danger} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT.ui, fontSize: 11, color: '#ffb8bd' }}>
                <b>{inc.fromName}</b> köyüne {MODE_LABEL[inc.mode] || inc.mode} gönderdi
              </div>
              <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute, marginTop: 1 }}>
                yaklaşık {inc.sizeApprox || '?'} asker · {inc.fromKey}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={lbl({ fontSize: 7, letterSpacing: 0.9 })}>VARIŞ</div>
              <div style={num({ fontSize: 14, color: C.danger })}>{fmtTime(inc.timeLeft)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MarchPanel;
