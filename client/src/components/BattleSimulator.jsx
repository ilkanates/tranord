/**
 * Savaş Simülatörü — iki ordu + sur/hendek + mod; sonuç combat.js'ten gelir.
 */
import { useEffect, useMemo, useState } from 'react';
import { C, FONT, panel, btn, label as lbl, num } from '../theme';
import Icon from './Icons';

const CAT_LABEL = { piyade: 'Piyade', suvari: 'Süvari' };
const CAT_COLOR = { piyade: '#7fd4ff', suvari: '#a99cf0' };
const CAT_ICON  = { piyade: 'kalkan', suvari: 'at' };

const WINNER = {
  attacker: { t: 'SALDIRAN KAZANDI', c: '#e8636f', i: 'kilic' },
  defender: { t: 'SAVUNAN KAZANDI',  c: '#4ecfa8', i: 'kalkan' },
  draw:     { t: 'BERABERLİK',       c: '#e0b357', i: 'savas' },
  none:     { t: 'SAVAŞ OLMADI',     c: C.textDim, i: 'uyari' },
};

const SIDE = {
  atk: { title: 'SALDIRAN', color: '#e8636f', icon: 'kilic' },
  def: { title: 'SAVUNAN',  color: '#4ecfa8', icon: 'kalkan' },
};

function LevelPicker({ label, icon, value, onChange, max }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <Icon name={icon} size={14} color={C.iceDeep} />
      <span style={lbl({ fontSize: 8.5 })}>{label}</span>
      <div style={{
        display: 'flex', alignItems: 'center',
        border: `1px solid ${C.lineSoft}`, borderRadius: 4, overflow: 'hidden',
      }}>
        <button onClick={() => onChange(Math.max(0, value - 1))} style={{
          width: 20, height: 22, border: 'none', background: 'rgba(28,51,73,0.6)',
          color: C.iceSoft, cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1,
        }}>−</button>
        <input type="number" min={0} max={max} value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(max, Math.floor(Number(e.target.value) || 0))))}
          style={{
            width: 36, height: 22, border: 'none', textAlign: 'center',
            background: 'rgba(8,17,28,0.8)', color: C.frost,
            fontFamily: FONT.num, fontSize: 11,
          }} />
        <button onClick={() => onChange(Math.min(max, value + 1))} style={{
          width: 20, height: 22, border: 'none', background: 'rgba(28,51,73,0.6)',
          color: C.iceSoft, cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1,
        }}>+</button>
      </div>
    </div>
  );
}

function SideColumn({ side, counts, grouped, onChange, losses, survivors, onFillFromArmy, canFill }) {
  const s = SIDE[side];
  const total = Object.values(counts).reduce((a, n) => a + n, 0);

  return (
    <div style={panel({
      padding: 12, background: 'rgba(11,23,37,0.8)',
      border: `1px solid ${s.color}44`,
    })}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingBottom: 7, marginBottom: 10, borderBottom: `1px solid ${s.color}44`,
      }}>
        <Icon name={s.icon} size={17} color={s.color} />
        <span style={{ fontFamily: FONT.head, fontSize: 15, letterSpacing: 2.5, color: s.color, flex: 1 }}>
          {s.title}
        </span>
        {canFill && (
          <button onClick={onFillFromArmy} style={btn('ghost', { padding: '3px 8px', fontSize: 9 })}>
            ORDUMU YÜKLE
          </button>
        )}
        <span style={num({ fontSize: 13, color: C.frost })}>{total}</span>
      </div>

      {['piyade', 'suvari'].map(cat => (
        <div key={cat} style={{ marginBottom: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
            <Icon name={CAT_ICON[cat]} size={11} color={CAT_COLOR[cat]} />
            <span style={lbl({ fontSize: 8, color: CAT_COLOR[cat] })}>{CAT_LABEL[cat]}</span>
          </div>

          {(grouped[cat] || []).map(([key, def]) => {
            const count = counts[key] || 0;
            const loss = losses?.[key];
            const surv = survivors?.[key];
            return (
              <div key={key} style={{
                display: 'grid', gridTemplateColumns: '1fr 68px',
                alignItems: 'center', gap: 8, padding: '5px 0',
                borderBottom: `1px solid ${C.lineSoft}`,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: FONT.ui, fontSize: 10.5, color: count > 0 ? C.text : C.textFaint,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{def.name || key}</div>
                  <div style={{ display: 'flex', gap: 9, marginTop: 1 }}>
                    <span style={num({ fontSize: 9, color: C.textMute })}>
                      atk {def.stats.saldiri}
                    </span>
                    <span style={num({ fontSize: 9, color: C.textMute })}>
                      sav {def.stats.yayaSav}/{def.stats.atliSav}
                    </span>
                  </div>
                  {loss !== undefined && count > 0 && (
                    <div style={num({ fontSize: 9.5, color: C.danger, marginTop: 2 })}>
                      −{loss} ölü → {surv} sağ
                    </div>
                  )}
                </div>
                <input type="number" min={0} value={count || ''} placeholder="0"
                  onChange={(e) => onChange(key, e.target.value)}
                  style={{
                    width: '100%', padding: '4px 6px', borderRadius: 3, textAlign: 'right',
                    background: 'rgba(8,17,28,0.8)', border: `1px solid ${C.lineSoft}`,
                    color: count > 0 ? C.frost : C.textMute,
                    fontFamily: FONT.num, fontSize: 11,
                  }} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={lbl({ fontSize: 8 })}>{label}</div>
      <div style={num({ fontSize: 17, color, fontWeight: 500, lineHeight: 1.25 })}>{value}</div>
    </div>
  );
}

function LossBar({ label, rate, color }) {
  const pct = Math.round((rate || 0) * 100);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim }}>{label}</span>
        <span style={num({ fontSize: 12, color })}>%{pct}</span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width .35s' }} />
      </div>
    </div>
  );
}

export default function BattleSimulator({ socket, unitDefs = {}, army = {} }) {
  const [attacker, setAttacker] = useState({});
  const [defender, setDefender] = useState({});
  const [surLevel, setSurLevel] = useState(0);
  const [hendekLevel, setHendekLevel] = useState(0);
  const [mode, setMode] = useState('normal');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const grouped = useMemo(() => {
    const out = { piyade: [], suvari: [] };
    Object.entries(unitDefs).forEach(([k, d]) => { if (out[d.category]) out[d.category].push([k, d]); });
    return out;
  }, [unitDefs]);

  const myArmy = useMemo(
    () => Object.fromEntries(Object.entries(army).filter(([, n]) => n > 0)),
    [army]
  );
  const hasArmy = Object.keys(myArmy).length > 0;

  useEffect(() => {
    if (!socket) return;
    const onResult = (p) => {
      if (p.ok) { setResult(p.result); setError(null); }
      else { setResult(null); setError(p.error || 'Bilinmeyen hata'); }
    };
    socket.on('battle_result', onResult);
    return () => socket.off('battle_result', onResult);
  }, [socket]);

  const run = () => {
    setError(null);
    socket.emit('simulate_battle', { attacker, defender, surLevel, hendekLevel, mode });
  };

  const clearAll = () => {
    setAttacker({}); setDefender({});
    setSurLevel(0); setHendekLevel(0);
    setMode('normal'); setResult(null); setError(null);
  };

  const setCount = (side, key, val) => {
    const n = Math.max(0, Math.floor(Number(val) || 0));
    const setter = side === 'atk' ? setAttacker : setDefender;
    setter(prev => {
      const next = { ...prev };
      if (n === 0) delete next[key]; else next[key] = n;
      return next;
    });
  };

  const w = result ? (WINNER[result.winner] || WINNER.none) : null;

  return (
    <div style={{ padding: '20px 24px 32px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18 }}>
          <Icon name="savas" size={26} color={C.ice} strokeWidth={1.4} />
          <div>
            <h2 style={{ fontFamily: FONT.head, fontSize: 24, letterSpacing: 4, color: C.frost }}>
              SAVAŞ SİMÜLATÖRÜ
            </h2>
            <div style={lbl({ fontSize: 8.5, letterSpacing: 2 })}>
              gerçek combat.js formülü · kuşatma birimleri hariç
            </div>
          </div>
        </div>

        {/* Ayarlar */}
        <div style={panel({
          padding: 13, marginBottom: 14, background: 'rgba(11,23,37,0.8)',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18,
        })}>
          <LevelPicker label="Sur" icon="sur" value={surLevel} onChange={setSurLevel} max={20} />
          <LevelPicker label="Hendek" icon="hendek" value={hendekLevel} onChange={setHendekLevel} max={20} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={lbl({ fontSize: 8.5 })}>Mod</span>
            {[['normal', 'Normal'], ['raid', 'Yağma']].map(([v, t]) => (
              <button key={v} onClick={() => setMode(v)}
                style={btn(mode === v ? 'primary' : 'ghost', { padding: '4px 11px', fontSize: 10 })}>
                {t}
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />
          <button onClick={clearAll} style={btn('ghost')}>TEMİZLE</button>
          <button onClick={run} style={btn('primary', {
            padding: '8px 20px', fontSize: 12, letterSpacing: 1.5,
            display: 'flex', alignItems: 'center', gap: 7,
          })}>
            <Icon name="savas" size={14} color={C.frost} /> SAVAŞ
          </button>
        </div>

        {error && (
          <div style={panel({
            padding: 11, marginBottom: 14,
            background: 'rgba(58,14,20,0.8)', border: `1px solid ${C.dangerDim}`,
            display: 'flex', alignItems: 'center', gap: 8,
          })}>
            <Icon name="uyari" size={15} color={C.danger} />
            <span style={{ fontFamily: FONT.ui, fontSize: 11, color: '#f0b8bd' }}>{error}</span>
          </div>
        )}

        <div style={{
          display: 'grid', gap: 14, marginBottom: 14,
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        }}>
          <SideColumn side="atk" counts={attacker} grouped={grouped}
            onChange={(k, v) => setCount('atk', k, v)}
            losses={result?.attackerLosses} survivors={result?.attackerSurvivors}
            canFill={hasArmy} onFillFromArmy={() => setAttacker({ ...myArmy })} />
          <SideColumn side="def" counts={defender} grouped={grouped}
            onChange={(k, v) => setCount('def', k, v)}
            losses={result?.defenderLosses} survivors={result?.defenderSurvivors}
            canFill={hasArmy} onFillFromArmy={() => setDefender({ ...myArmy })} />
        </div>

        {/* Sonuç */}
        {result && w && (
          <div style={panel({ padding: 16, background: 'rgba(11,23,37,0.85)', border: `1px solid ${w.c}44` })}
            className="tn-rise">
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 11, marginBottom: 16,
            }}>
              <Icon name={w.i} size={24} color={w.c} strokeWidth={1.5} />
              <span style={{ fontFamily: FONT.head, fontSize: 23, letterSpacing: 3.5, color: w.c, fontWeight: 700 }}>
                {w.t}
              </span>
            </div>

            <div style={{
              display: 'grid', gap: 14, marginBottom: 16,
              gridTemplateColumns: 'repeat(auto-fit, minmax(126px, 1fr))',
              paddingBottom: 14, borderBottom: `1px solid ${C.lineSoft}`,
            }}>
              <Stat label="Saldırı gücü"  value={result.attackTotal.toLocaleString('tr-TR')} color={C.danger} />
              <Stat label="Ham savunma"   value={result.defenseRaw.toLocaleString('tr-TR')} color={C.good} />
              <Stat label={`Sur+hendek %${result.wallBonusPct}`}
                value={result.defenseTotal.toLocaleString('tr-TR')} color="#9ef0d4" />
              <Stat label="Piyade oranı"  value={`%${(result.infRatio * 100).toFixed(0)}`} color={C.iceSoft} />
              <Stat label="Süvari oranı"  value={`%${(result.cavRatio * 100).toFixed(0)}`} color="#a99cf0" />
              <Stat label="Mod" value={result.mode === 'raid' ? 'Yağma' : 'Normal'} color={C.textDim} />
            </div>

            <div style={{
              display: 'grid', gap: 16,
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}>
              <LossBar label="Saldıran kayıp oranı" rate={result.attackerLossRate} color={C.danger} />
              <LossBar label="Savunan kayıp oranı"  rate={result.defenderLossRate} color={C.good} />
            </div>

            {result.mode === 'normal' && (result.attackerLossRate === 1 || result.defenderLossRate === 1) && (
              <div style={{
                display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 14,
                padding: '8px 10px', borderRadius: 6,
                background: 'rgba(224,179,87,0.07)', border: '1px solid rgba(224,179,87,0.28)',
              }}>
                <Icon name="uyari" size={13} color={C.warn} style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: '#e8cf9a', lineHeight: 1.5 }}>
                  Normal modda kaybeden taraf tamamen siliniyor — kısmi kayıp yok. Yağma modu
                  kayıpları yarıya indiriyor.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
