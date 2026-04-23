/**
 * Savaş Simülatörü — iki ordu + sur/hendek + mod girersin, sonucu görürsün.
 *
 * Props:
 *   socket   — socket.io client
 *   unitDefs — TRAINABLE_UNITS (kuşatma zaten dışarıda)
 */

import { useEffect, useMemo, useState } from 'react';

const CAT_LABEL = { piyade: 'Piyade', suvari: 'Süvari' };
const CAT_COLOR = { piyade: '#6a8858', suvari: '#8a6050' };
const CAT_ICON  = { piyade: '🛡️', suvari: '🐎' };

const WINNER_LABEL = {
  attacker: 'Saldıran Kazandı',
  defender: 'Savunan Kazandı',
  draw:     'Beraberlik',
  none:     'Savaş Gerçekleşmedi'
};
const WINNER_COLOR = {
  attacker: '#c86060',
  defender: '#6a8858',
  draw:     '#c8a44a',
  none:     '#7a8878'
};

export default function BattleSimulator({ socket, unitDefs = {} }) {
  const [attacker, setAttacker] = useState({});
  const [defender, setDefender] = useState({});
  const [surLevel,    setSurLevel]    = useState(0);
  const [hendekLevel, setHendekLevel] = useState(0);
  const [mode,   setMode]   = useState('normal');
  const [result, setResult] = useState(null);
  const [error,  setError]  = useState(null);

  // Birimleri kategoriye göre grupla
  const grouped = useMemo(() => {
    const out = { piyade: [], suvari: [] };
    Object.entries(unitDefs).forEach(([key, def]) => {
      if (out[def.category]) out[def.category].push([key, def]);
    });
    return out;
  }, [unitDefs]);

  useEffect(() => {
    if (!socket) return;
    const onResult = (payload) => {
      if (payload.ok) {
        setResult(payload.result);
        setError(null);
      } else {
        setResult(null);
        setError(payload.error || 'Bilinmeyen hata');
      }
    };
    socket.on('battle_result', onResult);
    return () => socket.off('battle_result', onResult);
  }, [socket]);

  const runBattle = () => {
    setError(null);
    socket.emit('simulate_battle', {
      attacker, defender, surLevel, hendekLevel, mode
    });
  };

  const clearAll = () => {
    setAttacker({});
    setDefender({});
    setSurLevel(0);
    setHendekLevel(0);
    setMode('normal');
    setResult(null);
    setError(null);
  };

  const setCount = (side, key, val) => {
    const n = Math.max(0, Math.floor(Number(val) || 0));
    const setter = side === 'atk' ? setAttacker : setDefender;
    setter(prev => {
      const next = { ...prev };
      if (n === 0) delete next[key];
      else next[key] = n;
      return next;
    });
  };

  return (
    <div style={{ padding: 20, color: '#e8d4a0', overflow: 'auto', flex: 1 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ color: '#c8a44a', fontSize: 18, letterSpacing: 3, marginBottom: 16 }}>
          ⚔ SAVAŞ SİMÜLATÖRÜ
        </div>

        {/* Ayarlar bar */}
        <div style={{
          background: '#14100a', border: '1px solid #3a2808', borderRadius: 4,
          padding: 14, marginBottom: 16,
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20
        }}>
          <LevelInput label="Sur Seviyesi"    value={surLevel}    onChange={setSurLevel}    max={20} />
          <LevelInput label="Hendek Seviyesi" value={hendekLevel} onChange={setHendekLevel} max={20} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#7a8878', fontSize: 11 }}>Mod:</span>
            <ModeButton current={mode} val="normal" label="Normal" onClick={setMode} />
            <ModeButton current={mode} val="raid"   label="Yağma"  onClick={setMode} />
          </div>

          <div style={{ flex: 1 }} />

          <button
            onClick={clearAll}
            style={btnStyle('#3a2808', '#7a8878')}
          >Temizle</button>
          <button
            onClick={runBattle}
            style={btnStyle('#6a3010', '#e8d4a0', 'bold')}
          >⚔ Savaş!</button>
        </div>

        {error && (
          <div style={{
            background: '#2a1008', border: '1px solid #6a2010',
            color: '#e8a860', padding: 10, borderRadius: 4, marginBottom: 16
          }}>
            Hata: {error}
          </div>
        )}

        {/* İki taraf */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <SideColumn
            title="SALDIRAN"
            color="#c86060"
            counts={attacker}
            grouped={grouped}
            onChange={(k, v) => setCount('atk', k, v)}
            losses={result?.attackerLosses}
            survivors={result?.attackerSurvivors}
          />
          <SideColumn
            title="SAVUNAN"
            color="#6a8858"
            counts={defender}
            grouped={grouped}
            onChange={(k, v) => setCount('def', k, v)}
            losses={result?.defenderLosses}
            survivors={result?.defenderSurvivors}
          />
        </div>

        {/* Sonuç paneli */}
        {result && <ResultPanel result={result} />}

      </div>
    </div>
  );
}

// ─── Alt bileşenler ───────────────────────────────────────────────

function LevelInput({ label, value, onChange, max }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: '#7a8878', fontSize: 11 }}>{label}:</span>
      <input
        type="number" min={0} max={max}
        value={value}
        onChange={e => onChange(Math.max(0, Math.min(max, Math.floor(Number(e.target.value) || 0))))}
        style={{
          width: 56, padding: '4px 6px', fontSize: 12,
          background: '#0d0a06', border: '1px solid #3a2808',
          color: '#c8a44a', borderRadius: 2, textAlign: 'center'
        }}
      />
    </div>
  );
}

function ModeButton({ current, val, label, onClick }) {
  const active = current === val;
  return (
    <button
      onClick={() => onClick(val)}
      style={{
        background: active ? '#6a3010' : 'transparent',
        border: `1px solid ${active ? '#c8a44a' : '#3a2808'}`,
        color: active ? '#e8d4a0' : '#7a8878',
        padding: '4px 12px', fontSize: 11, cursor: 'pointer', borderRadius: 2
      }}
    >{label}</button>
  );
}

function SideColumn({ title, color, counts, grouped, onChange, losses, survivors }) {
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  return (
    <div style={{ background: '#14100a', border: `1px solid ${color}`, borderRadius: 4, padding: 12 }}>
      <div style={{
        color, fontSize: 13, letterSpacing: 2, marginBottom: 10,
        borderBottom: `1px solid ${color}`, paddingBottom: 4,
        display: 'flex', justifyContent: 'space-between'
      }}>
        <span>{title}</span>
        <span style={{ fontSize: 11, color: '#7a8878' }}>Toplam: {total}</span>
      </div>

      {['piyade', 'suvari'].map(cat => (
        <div key={cat} style={{ marginBottom: 10 }}>
          <div style={{ color: CAT_COLOR[cat], fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>
            {CAT_ICON[cat]} {CAT_LABEL[cat]}
          </div>
          {grouped[cat].map(([key, def]) => {
            const count = counts[key] || 0;
            const loss  = losses?.[key];
            const surv  = survivors?.[key];
            return (
              <div key={key} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 74px',
                alignItems: 'center',
                gap: 8, padding: '4px 0',
                borderBottom: '1px solid #2a1808'
              }}>
                <div style={{ fontSize: 11 }}>
                  <div style={{ color: '#e8d4a0' }}>{def.name}</div>
                  <div style={{ color: '#5a6a58', fontSize: 9 }}>
                    ⚔{def.stats.saldiri} · 🛡Y{def.stats.yayaSav} · 🛡A{def.stats.atliSav}
                  </div>
                  {loss !== undefined && count > 0 && (
                    <div style={{ fontSize: 10, color: '#c86060', marginTop: 2 }}>
                      −{loss} ölü → {surv} kaldı
                    </div>
                  )}
                </div>
                <input
                  type="number" min={0}
                  value={count || ''}
                  placeholder="0"
                  onChange={e => onChange(key, e.target.value)}
                  style={{
                    padding: '4px 6px', fontSize: 12,
                    background: '#0d0a06', border: '1px solid #3a2808',
                    color: '#c8a44a', borderRadius: 2, textAlign: 'right',
                    width: '100%', boxSizing: 'border-box'
                  }}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ResultPanel({ result }) {
  const pct = (x) => (x * 100).toFixed(1) + '%';
  return (
    <div style={{ background: '#14100a', border: '1px solid #3a2808', borderRadius: 4, padding: 14 }}>
      <div style={{
        textAlign: 'center', marginBottom: 14,
        color: WINNER_COLOR[result.winner], fontSize: 20, letterSpacing: 2, fontWeight: 'bold'
      }}>
        {WINNER_LABEL[result.winner]}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 10, marginBottom: 10
      }}>
        <Stat label="Saldırı Gücü"       value={result.attackTotal}  color="#c86060" />
        <Stat label="Ham Savunma"        value={result.defenseRaw}   color="#6a8858" />
        <Stat label={`Sur+Hendek (%${result.wallBonusPct})`} value={result.defenseTotal} color="#8ab870" />
        <Stat label="Piyade Oranı"       value={pct(result.infRatio)} color="#7a8878" />
        <Stat label="Süvari Oranı"       value={pct(result.cavRatio)} color="#7a8878" />
        <Stat label="Mod"                value={result.mode === 'raid' ? 'Yağma' : 'Normal'} color="#c8a44a" />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10
      }}>
        <LossBar label="Saldıran Kayıp Oranı" rate={result.attackerLossRate} color="#c86060" />
        <LossBar label="Savunan Kayıp Oranı"  rate={result.defenderLossRate} color="#6a8858" />
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: '#7a8878', fontSize: 10, letterSpacing: 1 }}>{label}</div>
      <div style={{ color, fontSize: 16, fontWeight: 'bold' }}>{value}</div>
    </div>
  );
}

function LossBar({ label, rate, color }) {
  const pct = Math.round(rate * 100);
  return (
    <div>
      <div style={{ fontSize: 11, color: '#7a8878', marginBottom: 2 }}>
        {label}: <strong style={{ color }}>{pct}%</strong>
      </div>
      <div style={{ background: '#0d0a06', border: '1px solid #3a2808', borderRadius: 2, height: 10, overflow: 'hidden' }}>
        <div style={{ background: color, width: `${pct}%`, height: '100%', transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function btnStyle(bg, fg, weight = 'normal') {
  return {
    background: bg, border: `1px solid ${fg}`, color: fg,
    padding: '6px 16px', fontSize: 12, cursor: 'pointer', borderRadius: 2,
    fontWeight: weight, letterSpacing: 1
  };
}
