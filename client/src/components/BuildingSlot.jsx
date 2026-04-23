import { useState } from 'react';
import BUILDING_DEFS from '../data/buildingDefs';

const RES_EMOJI = {
  kereste: '🪵', kil: '🟫', yontmaTas: '🪨', demirKulce: '⚙️'
};
const RES_NAME = {
  kereste: 'Kereste', kil: 'Kil', yontmaTas: 'Y.Taş', demirKulce: 'D.Külçe'
};

function formatTime(secs) {
  if (!secs || secs === Infinity) return '—';
  if (secs < 60)   return secs + 'sn';
  if (secs < 3600) return Math.ceil(secs / 60) + 'dk';
  return (secs / 3600).toFixed(1) + 'sa';
}

// ─── Küçük buton stili ───────────────────────────────────────────
const iconBtn = {
  width: '22px', height: '22px',
  background: '#2a1a08', border: '1px solid #4a2a08',
  borderRadius: '3px', color: '#c8a44a',
  cursor: 'pointer', fontSize: '13px', lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};

// ─── Bileşen ─────────────────────────────────────────────────────
export default function BuildingSlot({ building, freeWorkers, resources, onAssignWorkers, onStartUpgrade }) {
  const def = BUILDING_DEFS[building.type];
  const [localWorkers, setLocalWorkers]     = useState(building.workers);
  const [upgradeWorkers, setUpgradeWorkers] = useState(1);
  const [showUpgradePanel, setShowUpgrade]  = useState(false);

  const prodPerHour = localWorkers * def.baseProductionPerWorker;
  const maxWorkers  = building.maxWorkers;
  const maxAssign   = Math.min(maxWorkers, localWorkers + freeWorkers);

  // Yükseltme maliyeti — sunucudan geliyor
  const upgradeCost = building.upgradeCost; // { kereste, kil, yontmaTas, demirKulce } or null
  const canAfford   = upgradeCost && resources
    ? Object.entries(upgradeCost).every(([r, amt]) => (resources[r] || 0) >= amt)
    : false;

  // Yükseltme süresi — client-side hesap
  const nextLevel = building.level; // levels[building.level] = level+1'e yükseltme
  const sureSaat  = def.levels[nextLevel]?.sureSaat;
  const upgradeTimeSecs = sureSaat ? Math.ceil(sureSaat / upgradeWorkers) : null;

  function changeWorkers(delta) {
    const next = Math.max(0, Math.min(maxAssign, localWorkers + delta));
    setLocalWorkers(next);
    onAssignWorkers(building.id, next);
  }

  function changeUpgradeWorkers(delta) {
    setUpgradeWorkers(w => Math.max(1, Math.min(freeWorkers, w + delta)));
  }

  const isMaxLevel = building.level >= def.levels.length;

  return (
    <div style={{
      background: '#1a1208',
      border: '1px solid #3a2808',
      borderRadius: '8px',
      padding: '12px',
      width: '190px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>

      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '22px' }}>{def.icon}</span>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#e8d4a0' }}>{def.name}</div>
          <div style={{ fontSize: '10px', color: '#c8a44a' }}>Seviye {building.level} · max {maxWorkers} işçi</div>
        </div>
      </div>

      {/* Üretim hızı */}
      <div style={{ fontSize: '11px', color: '#60a840' }}>
        +{prodPerHour.toFixed(1)}/saat
        {localWorkers === 0 && <span style={{ color: '#5a5a3a' }}> (işçi yok)</span>}
      </div>

      {/* İşçi atama */}
      {!building.upgrading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: '#6a5a3a', flex: 1 }}>İşçi</span>
          <button style={iconBtn} onClick={() => changeWorkers(-1)}>−</button>
          <span style={{ color: '#e8d4a0', fontSize: '14px', minWidth: '22px', textAlign: 'center' }}>
            {localWorkers}
          </span>
          <button style={iconBtn} onClick={() => changeWorkers(+1)}>+</button>
        </div>
      )}

      {/* Yükseltme */}
      {building.upgrading ? (
        <div style={{ fontSize: '11px', color: '#c8a44a', textAlign: 'center', padding: '4px 0' }}>
          ⚒ Geliştiriliyor... {building.upgradeTimeLeft}sn kaldı
        </div>
      ) : isMaxLevel ? (
        <div style={{ fontSize: '10px', color: '#5a5a3a', textAlign: 'center' }}>Maks seviye</div>
      ) : (
        <>
          <button
            onClick={() => setShowUpgrade(v => !v)}
            style={{
              padding: '5px', background: '#200e04',
              border: '1px solid #5a3a10', borderRadius: '4px',
              color: '#c8a44a', fontSize: '11px', cursor: 'pointer'
            }}
          >
            ⬆ Geliştir (Lvl {building.level} → {building.level + 1})
          </button>

          {showUpgradePanel && (
            <div style={{
              background: '#0f0c06', borderRadius: '6px',
              padding: '8px', fontSize: '11px', display: 'flex',
              flexDirection: 'column', gap: '5px'
            }}>
              {/* Maliyetler */}
              <div style={{ color: '#6a5a3a', marginBottom: '2px' }}>Maliyet:</div>
              {upgradeCost
                ? Object.entries(upgradeCost).map(([res, amt]) => {
                    const has     = resources?.[res] || 0;
                    const enough  = has >= amt;
                    return (
                      <div key={res} style={{
                        display: 'flex', justifyContent: 'space-between',
                        color: enough ? '#60a840' : '#c04040', fontSize: '10px'
                      }}>
                        <span>{RES_EMOJI[res]} {RES_NAME[res]}</span>
                        <span>{Math.round(has)}/{amt}</span>
                      </div>
                    );
                  })
                : <div style={{ color: '#5a5a3a' }}>—</div>
              }

              {/* İşçi seçimi */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <span style={{ color: '#6a5a3a', flex: 1 }}>İşçi</span>
                <button style={iconBtn} onClick={() => changeUpgradeWorkers(-1)}>−</button>
                <span style={{ color: '#e8d4a0', minWidth: '22px', textAlign: 'center' }}>
                  {upgradeWorkers}
                </span>
                <button style={iconBtn} onClick={() => changeUpgradeWorkers(+1)}>+</button>
              </div>

              <div style={{ color: '#9a9070' }}>
                Süre: {formatTime(upgradeTimeSecs)}
              </div>

              <button
                disabled={!canAfford || freeWorkers < 1}
                onClick={() => { onStartUpgrade(building.id, upgradeWorkers); setShowUpgrade(false); }}
                style={{
                  padding: '5px',
                  background: canAfford && freeWorkers >= 1 ? '#2a5010' : '#1a1a0a',
                  border: `1px solid ${canAfford && freeWorkers >= 1 ? '#5aaa28' : '#3a3a1a'}`,
                  borderRadius: '4px',
                  color: canAfford && freeWorkers >= 1 ? '#b8e890' : '#5a5a3a',
                  fontSize: '11px', cursor: canAfford && freeWorkers >= 1 ? 'pointer' : 'default'
                }}
              >
                Başlat
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
