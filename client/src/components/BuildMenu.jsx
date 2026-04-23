import { useState } from 'react';
import VILLAGE_DEFS from '../data/villageDefs';

const CATEGORY_LABELS = {
  isleme:   '⚗️ İşleme',
  askeri:   '⚔️ Askeri',
  depo:     '📦 Depo',
  ekonomik: '💰 Ekonomik',
  nufus:    '👥 Nüfus',
  savunma:  '🛡 Savunma'
};
const CATEGORY_ORDER = ['isleme', 'askeri', 'depo', 'ekonomik', 'nufus', 'savunma'];

const RES_EMOJI = {
  odun:'🪵', kil:'🟫', tas:'🪨', demir:'⛏️', tahil:'🌾',
  kereste:'🪚', tugla:'🧱', yontmaTas:'🏗️', demirKulce:'🔨',
  un:'🌕', ekmek:'🍞'
};

const iconBtn = {
  width:'22px', height:'22px', background:'#3a2c18',
  border:'1px solid #5a4028', borderRadius:'3px',
  color:'#c8a44a', cursor:'pointer', fontSize:'13px',
  display:'flex', alignItems:'center', justifyContent:'center'
};

function getBuildSeconds(type, level, workers) {
  if (!workers || workers <= 0) return '—';
  const def = VILLAGE_DEFS[type];
  if (!def) return '—';
  const work = Math.round(def.buildBaseWork * Math.pow(def.buildMultiplier, Math.max(0, level - 1)));
  const secs = Math.ceil(work / workers);
  if (secs < 60)   return secs + 'sn';
  if (secs < 3600) return Math.ceil(secs / 60) + 'dk';
  return (secs / 3600).toFixed(1) + 'sa';
}

function getCapacity(type, level) {
  const def = VILLAGE_DEFS[type];
  if (!def?.baseCapacity) return null;
  return def.baseCapacity + (level - 1) * def.capacityPerLevel;
}

// ─── İşçi Slider ─────────────────────────────────────────────────
function WorkerPicker({ value, onChange, max, min = 1, label = 'İşçi' }) {
  const effectiveMax = Math.max(min, max);
  return (
    <div style={{ marginBottom: 2 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
        <span style={{ fontSize:'10px', color:'#9a8860' }}>{label}</span>
        <span style={{ fontSize:'13px', color:'#e8d4a0', fontWeight:'bold', minWidth:22, textAlign:'right' }}>{value}</span>
      </div>
      <input type="range" min={min} max={effectiveMax} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width:'100%', accentColor:'#c8a44a' }}
        disabled={effectiveMax <= min && value === min} />
    </div>
  );
}

// ─── Maliyet satırı ───────────────────────────────────────────────
function CostRow({ cost, resources }) {
  if (!cost || Object.keys(cost).length === 0) return null;
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginBottom:'8px' }}>
      {Object.entries(cost).map(([res, amt]) => {
        const has = resources[res] || 0;
        const ok  = has >= amt;
        return (
          <span key={res} style={{
            fontSize:'10px', padding:'2px 6px',
            background: ok ? '#1a2a10' : '#2a1010',
            border: `1px solid ${ok ? '#3a6a20' : '#6a2020'}`,
            borderRadius:'3px',
            color: ok ? '#8aca60' : '#e06060'
          }}>
            {RES_EMOJI[res]} {amt}
          </span>
        );
      })}
    </div>
  );
}

// İşçi atanabilir askeri binalar (ekipman üretimi + birim eğitimi)
const MILITARY_WORKER_BUILDINGS = new Set(['silahci', 'zirh', 'ahir', 'kisla', 'atolye']);

// ─── Ana Bileşen ─────────────────────────────────────────────────
export default function BuildMenu({
  slotKey, building, isTower, isCenter,
  placedBuildings, freeWorkers, resources = {}, processingRates = {},
  onBuild, onUpgrade, onDemolish, onAssignVillageWorkers, onClose
}) {
  const [buildWorkers,   setBuildWorkers]   = useState(1);
  const [upgradeWorkers, setUpgradeWorkers] = useState(1);
  const [selectedType,   setSelectedType]   = useState(null);

  const builtTypes = new Set(Object.values(placedBuildings).map(b => b.type));
  const def = building ? VILLAGE_DEFS[building.type] : null;

  function canBuild(key, d) {
    if (isTower  && key !== 'kule') return false;
    if (!isTower && key === 'kule') return false;
    if (d.unique && builtTypes.has(key)) return false;
    if (key === 'kule') {
      return Object.values(placedBuildings).filter(b => b.type === 'kule').length < 4;
    }
    return true;
  }

  function canAfford(cost) {
    if (!cost) return true;
    return Object.entries(cost).every(([res, amt]) => (resources[res] || 0) >= amt);
  }

  const buildable = Object.entries(VILLAGE_DEFS).filter(([k, d]) => canBuild(k, d));
  const grouped   = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = buildable.filter(([,d]) => d.category === cat);
    return acc;
  }, {});

  const selectedDef = selectedType ? VILLAGE_DEFS[selectedType] : null;
  const affordable  = selectedDef ? canAfford(selectedDef.cost) : false;
  const hasWorkers  = freeWorkers >= 1;

  return (
    <div style={{
      width:'280px', flexShrink:0,
      background:'#2a2418', borderLeft:'2px solid #4a3c28',
      display:'flex', flexDirection:'column', overflowY:'auto'
    }}>

      {/* Başlık */}
      <div style={{
        padding:'12px 14px', borderBottom:'1px solid #3c3020',
        display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0
      }}>
        <div>
          <div style={{ fontSize:'13px', color:'#c8a44a', fontWeight:'bold' }}>
            {building
              ? (building.type === 'anaBina' ? 'Ana Bina' : def?.name || building.type)
              : 'Boş Alan'}
          </div>
          <div style={{ fontSize:'10px', color:'#8a8860' }}>
            {isTower ? '🗼 Kule Slotu' : `q:${slotKey?.split(',')[0]}  r:${slotKey?.split(',')[1]}`}
          </div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#6a5a3a', cursor:'pointer', fontSize:'16px' }}>✕</button>
      </div>

      {/* Mevcut bina bilgisi */}
      {building && (
        <div style={{ padding:'12px 14px', borderBottom:'1px solid #3a3020' }}>

          {building.building ? (
            <div style={{ fontSize:'12px', color:'#c8a44a', textAlign:'center', padding:'6px 0' }}>
              ⚙️ {building.level === 0 ? 'İnşa ediliyor' : 'Yükseltiliyor'}...
              <div style={{ fontSize:'18px', fontWeight:'bold', marginTop:'4px' }}>
                {building.buildTimeLeft}sn kaldı
              </div>
            </div>
          ) : (
            <>
              {def?.description && (
                <div style={{ fontSize:'11px', color:'#8a8060', marginBottom:'8px', lineHeight:'1.4' }}>
                  {def.description}
                </div>
              )}

              <div style={{ fontSize:'13px', color:'#c8a44a', marginBottom:'8px' }}>
                Seviye {building.level}
                {def?.maxLevel ? ` / ${def.maxLevel}` : ''}
              </div>

              {def?.baseCapacity && (
                <div style={{ fontSize:'11px', color:'#7a9a60', marginBottom:'8px' }}>
                  📦 Kapasite: {getCapacity(building.type, building.level).toLocaleString()}
                  <span style={{ color:'#5a6a40' }}> → Lvl {building.level+1}: {getCapacity(building.type, building.level+1).toLocaleString()}</span>
                </div>
              )}

              {def?.bonusPerLevel && (
                <div style={{ fontSize:'11px', color:'#60a840', marginBottom:'8px' }}>
                  Mevcut bonus: +{building.level * def.bonusPerLevel}%
                </div>
              )}

              {def?.bonusTable && (
                <div style={{ fontSize:'11px', color:'#a07060', marginBottom:'8px' }}>
                  Savunma bonusu: %{def.bonusTable[building.level]}
                </div>
              )}

              {def?.populationPerLevel && (
                <div style={{ fontSize:'11px', color:'#60b0b0', marginBottom:'8px' }}>
                  👥 +{building.level * def.populationPerLevel} nüfus kapasitesi
                </div>
              )}

              {/* Askeri üretim/eğitim binası — işçi atama (silahçı/zırh/ahır/kışla/atölye) */}
              {!def?.processes && MILITARY_WORKER_BUILDINGS.has(building.type) && (() => {
                const maxW = building.level * (def?.workersPerLevel || 3);
                const curW = building.workers || 0;
                const isTraining = ['kisla', 'ahir', 'atolye'].includes(building.type);
                const isProducing = ['silahci', 'zirh', 'ahir'].includes(building.type);
                return (
                  <div style={{ background:'#322020', border:'1px solid #4a3030', borderRadius:'5px', padding:'8px', marginBottom:'8px' }}>
                    <div style={{ fontSize:'10px', color:'#c0a060', marginBottom:'6px', lineHeight:1.4 }}>
                      ⚒ {isProducing && isTraining ? 'Üretim + Eğitim' : isProducing ? 'Üretim hızı' : 'Eğitim hızı'}
                      <span style={{ color:'#7a6a3a' }}> — süre = temel ÷ işçi</span>
                    </div>
                    <WorkerPicker
                      value={curW}
                      onChange={(w) => onAssignVillageWorkers(w)}
                      max={Math.min(maxW, curW + freeWorkers)}
                      min={0}
                      label={`İşçi (maks ${maxW})`}
                    />
                    {curW === 0 && (
                      <div style={{ fontSize:'9px', color:'#e06060', marginTop:'4px' }}>
                        ⚠ İşçi atanmamış — sipariş/eğitim duracak
                      </div>
                    )}
                    {curW > 0 && (
                      <div style={{ fontSize:'9px', color:'#7a9a60', marginTop:'4px' }}>
                        ×{curW} hız {curW >= 2 ? `(${curW}× daha hızlı)` : ''}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Ahır at kapasitesi bilgisi */}
              {building.type === 'ahir' && !building.building && (
                <div style={{ fontSize:'10px', color:'#a07060', marginBottom:'8px' }}>
                  🐎 At kapasitesi: <strong>{building.level * (def?.horseCapPerLevel || 5)}</strong>
                  <span style={{ color:'#5a4a30' }}> → Lvl {building.level+1}: {(building.level+1) * (def?.horseCapPerLevel || 5)}</span>
                </div>
              )}

              {/* Cephanelik kapasitesi bilgisi */}
              {building.type === 'cephane' && !building.building && (
                <div style={{ fontSize:'10px', color:'#a07060', marginBottom:'8px' }}>
                  🏹 Ekipman kapasitesi: <strong>{building.level * (def?.equipmentCapPerLevel || 50)}</strong>/tür
                  <span style={{ color:'#5a4a30' }}> → Lvl {building.level+1}: {(building.level+1) * (def?.equipmentCapPerLevel || 50)}</span>
                </div>
              )}

              {/* İşleme binası — işçi atama */}
              {def?.processes && (() => {
                const { input, inputPerHour, output, outputPerHour } = def.processes;
                const maxW    = building.level * (def.workersPerLevel || 3);
                const curW    = building.workers || 0;
                const rate    = processingRates[output];
                return (
                  <div style={{ background:'#2e2e1a', border:'1px solid #4a4828', borderRadius:'5px', padding:'8px', marginBottom:'8px' }}>
                    <div style={{ fontSize:'10px', color:'#a0c060', marginBottom:'6px' }}>
                      ⚗️ {RES_EMOJI[input]} → {RES_EMOJI[output]}
                      {rate?.outputPerHour > 0
                        ? <span style={{ color:'#60c060' }}> +{rate.outputPerHour}/sa</span>
                        : <span style={{ color:'#6a5a3a' }}> (işçi yok)</span>
                      }
                    </div>
                    <WorkerPicker
                      value={curW}
                      onChange={(w) => onAssignVillageWorkers(w)}
                      max={Math.min(maxW, curW + freeWorkers)}
                      min={0}
                      label={`İşçi (maks ${maxW})`}
                    />
                    {curW > 0 && (
                      <div style={{ fontSize:'9px', color:'#7a9a60', marginTop:'4px' }}>
                        {RES_EMOJI[input]} -{inputPerHour * curW}/sa  →  {RES_EMOJI[output]} +{outputPerHour * curW}/sa
                      </div>
                    )}
                  </div>
                );
              })()}

              {building.type !== 'anaBina' && (
                <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginTop:'4px' }}>
                  {(!def?.maxLevel || building.level < def.maxLevel) && (
                    <>
                      <WorkerPicker
                        value={upgradeWorkers}
                        onChange={setUpgradeWorkers}
                        max={freeWorkers}
                        label={`Yükselt işçi — ${getBuildSeconds(building.type, building.level + 1, upgradeWorkers)}`}
                      />
                      <button onClick={() => onUpgrade(upgradeWorkers)} style={{
                        padding:'6px', background:'#2a4a10',
                        border:'1px solid #5a9a28', borderRadius:'4px',
                        color:'#b8e890', fontSize:'11px', cursor:'pointer'
                      }}>
                        ⬆ Yükselt (Lvl {building.level} → {building.level + 1})
                      </button>
                    </>
                  )}
                  <button onClick={onDemolish} style={{
                    padding:'5px', background:'#3a1010',
                    border:'1px solid #8a2020', borderRadius:'4px',
                    color:'#e08080', fontSize:'11px', cursor:'pointer'
                  }}>
                    🗑 Yık
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* İnşa listesi — slot boşsa */}
      {!building && !isCenter && (
        <div style={{ padding:'10px 14px' }}>

          {/* Seçili bina önizleme */}
          {selectedType && selectedDef && (
            <div style={{
              background:'#2e2418', border:'1px solid #5a4020',
              borderRadius:'6px', padding:'10px', marginBottom:'12px'
            }}>
              <div style={{ fontSize:'12px', color:'#e8d4a0', fontWeight:'bold', marginBottom:'4px' }}>
                {selectedDef.icon} {selectedDef.name}
              </div>
              <div style={{ fontSize:'10px', color:'#8a8060', marginBottom:'8px', lineHeight:'1.4' }}>
                {selectedDef.description}
              </div>

              <div style={{ fontSize:'10px', color:'#7a6a4a', marginBottom:'4px' }}>💰 Maliyet:</div>
              <CostRow cost={selectedDef.cost} resources={resources} />

              {selectedDef.processes && (
                <div style={{ fontSize:'10px', color:'#a0c060', marginBottom:'6px' }}>
                  ⚗️ {RES_EMOJI[selectedDef.processes.input]} {selectedDef.processes.inputPerHour}/sa
                  {' → '}
                  {RES_EMOJI[selectedDef.processes.output]} {selectedDef.processes.outputPerHour}/sa (Lvl 1)
                </div>
              )}
              {selectedDef.baseCapacity && (
                <div style={{ fontSize:'10px', color:'#7a9a60', marginBottom:'6px' }}>
                  📦 Lvl 1 kapasite: {selectedDef.baseCapacity.toLocaleString()}
                </div>
              )}
              {selectedDef.populationPerLevel && (
                <div style={{ fontSize:'10px', color:'#60b0b0', marginBottom:'6px' }}>
                  👥 +{selectedDef.populationPerLevel} nüfus kapasitesi
                </div>
              )}

              <WorkerPicker
                value={buildWorkers}
                onChange={setBuildWorkers}
                max={Math.max(1, freeWorkers)}
                label={`İşçi — ${getBuildSeconds(selectedType, 1, buildWorkers)}`}
              />

              {!affordable && (
                <div style={{ fontSize:'10px', color:'#e06060', marginTop:'6px' }}>⚠ Yetersiz hammadde</div>
              )}
              {affordable && !hasWorkers && (
                <div style={{ fontSize:'10px', color:'#e0a030', marginTop:'6px' }}>⚠ Boşta işçi yok</div>
              )}

              <div style={{ display:'flex', gap:'6px', marginTop:'8px' }}>
                <button
                  onClick={() => { if (affordable && hasWorkers) onBuild(selectedType, buildWorkers); }}
                  style={{
                    flex:1, padding:'6px',
                    background: (affordable && hasWorkers) ? '#2a5010' : '#1a2a0a',
                    border:`1px solid ${(affordable && hasWorkers) ? '#5aaa28' : '#3a5018'}`,
                    borderRadius:'4px',
                    color: (affordable && hasWorkers) ? '#b8e890' : '#5a7a40',
                    fontSize:'11px',
                    cursor: (affordable && hasWorkers) ? 'pointer' : 'not-allowed'
                  }}>
                  ✓ İnşa Et
                </button>
                <button onClick={() => setSelectedType(null)} style={{
                  padding:'6px 10px', background:'#2a1a08',
                  border:'1px solid #4a3010', borderRadius:'4px',
                  color:'#c8a44a', fontSize:'11px', cursor:'pointer'
                }}>
                  ✕
                </button>
              </div>
            </div>
          )}

          <div style={{ fontSize:'11px', color:'#9a8860', marginBottom:'8px' }}>
            Buraya inşa edilebilecek binalar:
          </div>

          {CATEGORY_ORDER.map(cat => {
            const list = grouped[cat];
            if (!list || !list.length) return null;
            return (
              <div key={cat} style={{ marginBottom:'10px' }}>
                <div style={{ fontSize:'10px', color:'#9a8858', marginBottom:'5px', letterSpacing:'1px' }}>
                  {CATEGORY_LABELS[cat]}
                </div>
                {list.map(([key, d]) => {
                  const ok = canAfford(d.cost);
                  return (
                    <button
                      key={key}
                      onClick={() => { setSelectedType(key); setBuildWorkers(1); }}
                      style={{
                        display:'flex', alignItems:'center', gap:'8px',
                        width:'100%', padding:'7px 8px', marginBottom:'3px',
                        background: selectedType === key ? '#3a4a28' : '#2a2218',
                        border:`1px solid ${selectedType === key ? '#7aaa40' : '#4a3818'}`,
                        borderRadius:'5px',
                        color: ok ? '#e8d4a0' : '#6a5a40',
                        cursor:'pointer', textAlign:'left'
                      }}
                    >
                      <span style={{ fontSize:'16px', opacity: ok ? 1 : 0.4 }}>{d.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'11px', fontWeight:'bold' }}>{d.name}</div>
                        {d.cost && (
                          <div style={{ display:'flex', gap:'4px', marginTop:'2px', flexWrap:'wrap' }}>
                            {Object.entries(d.cost).map(([res, amt]) => {
                              const resOk = (resources[res] || 0) >= amt;
                              return (
                                <span key={res} style={{ fontSize:'9px', color: resOk ? '#7a9a60' : '#aa5050' }}>
                                  {RES_EMOJI[res]}{amt}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
