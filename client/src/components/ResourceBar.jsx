// Ham maddeler, işlenmiş maddeler ve yiyecekler ayrı gruplar hâlinde
const RAW_RESOURCES = [
  { key:'odun',  label:'Odun',       icon:'🪵' },
  { key:'kil',   label:'Kil',        icon:'🟫' },
  { key:'tas',   label:'Taş',        icon:'🪨' },
  { key:'demir', label:'Demir',      icon:'⛏️' },
  { key:'tahil', label:'Tahıl',      icon:'🌾' },
];
const PROCESSED_RESOURCES = [
  { key:'kereste',    label:'Kereste',     icon:'🪚' },
  { key:'tugla',      label:'Tuğla',       icon:'🧱' },
  { key:'yontmaTas',  label:'Yontma Taş',  icon:'🏗️' },
  { key:'demirKulce', label:'Külçe Demir', icon:'🔨' },
];
const FOOD_RESOURCES = [
  { key:'un',    label:'Un',    icon:'🌕' },
  { key:'ekmek', label:'Ekmek', icon:'🍞' },
];
// Askeri envanter — cephanelik (kılıç/mızrak/kalkan/zırh) + ahır (at)
const MILITARY_EQUIPMENT = [
  { key:'kilic',  label:'Kılıç',  icon:'🗡️' },
  { key:'mizrak', label:'Mızrak', icon:'🔱' },
  { key:'kalkan', label:'Kalkan', icon:'🛡️' },
  { key:'zirh',   label:'Zırh',   icon:'🎽' },
  { key:'at',     label:'At',     icon:'🐎' },
];

function fillTime(current, capacity, rate) {
  if (!capacity || capacity <= 0 || rate <= 0) return null;
  const remaining = capacity - current;
  if (remaining <= 0) return 'DOLU';
  const secs = Math.ceil(remaining / rate);
  if (secs < 60)   return `${secs}sn`;
  if (secs < 3600) return `${Math.ceil(secs/60)}dk`;
  return `${(secs/3600).toFixed(1)}sa`;
}

function ResourceCell({ res, val, rate, capacity, processing, consumeRate = 0 }) {
  const netRate = (rate || 0) - consumeRate;
  const pct  = capacity ? Math.min(1, val / capacity) : null;
  const fill = capacity ? fillTime(val, capacity, rate) : null;
  const hasAny = val > 0 || rate > 0 || consumeRate > 0 || (processing && processing.outputPerHour > 0);

  return (
    <div style={{
      background: '#1a1208',
      border: '1px solid #3a2808',
      borderRadius: '6px',
      padding: '4px 8px',
      textAlign: 'center',
      minWidth: '78px',
      opacity: hasAny ? 1 : 0.5
    }}>
      <div style={{ fontSize:'9px', color:'#6a5a3a' }}>{res.icon} {res.label}</div>

      <div style={{ fontSize:'14px', fontWeight:'bold', color:'#e8d4a0', lineHeight:'1.2' }}>
        {Math.floor(val || 0)}
        {capacity > 0 && (
          <span style={{ fontSize:'8px', color:'#5a6a40', fontWeight:'normal' }}>
            /{capacity >= 1000 ? (capacity/1000).toFixed(1)+'k' : capacity}
          </span>
        )}
      </div>

      {pct != null && (
        <div style={{ height:'3px', background:'#2a2010', borderRadius:'2px', margin:'2px 0', overflow:'hidden' }}>
          <div style={{
            height:'100%', borderRadius:'2px',
            width:`${(pct*100).toFixed(1)}%`,
            background: pct >= 0.9 ? '#e06020' : pct >= 0.6 ? '#c8a040' : '#4a8a28'
          }} />
        </div>
      )}

      {/* Üretim hızı (ham madde) + tüketim (ör. tahıl → atlar) */}
      {rate > 0 && (
        <div style={{ fontSize:'9px', color: netRate >= 0 ? '#60a840' : '#e06020' }}>
          {netRate >= 0 ? '+' : ''}{netRate.toFixed(1)}/sa
          {consumeRate > 0 && (
            <span style={{ color:'#c8a040', marginLeft:'2px' }}>
              (−{consumeRate.toFixed(1)})
            </span>
          )}
          {fill && <span style={{ color: fill==='DOLU' ? '#e06020' : '#4a6a3a', marginLeft:'2px' }}>
            {fill==='DOLU' ? '✓' : `(${fill})`}
          </span>}
        </div>
      )}
      {rate === 0 && consumeRate > 0 && (
        <div style={{ fontSize:'9px', color:'#e06020' }}>
          −{consumeRate.toFixed(1)}/sa
        </div>
      )}

      {/* İşleme hızı (işlenmiş/yiyecek) */}
      {!rate && processing && processing.outputPerHour > 0 && (
        <div style={{ fontSize:'9px', color:'#a0c060' }}>
          +{processing.outputPerHour}/sa
          {fill && <span style={{ color: fill==='DOLU' ? '#e06020' : '#4a6a3a', marginLeft:'2px' }}>
            {fill==='DOLU' ? '✓' : `(${fill})`}
          </span>}
        </div>
      )}

      {!rate && (!processing || processing.outputPerHour === 0) && (
        <div style={{ fontSize:'9px', color:'#3a3a3a' }}>—</div>
      )}
    </div>
  );
}

function GroupLabel({ label }) {
  return (
    <div style={{
      fontSize:'9px', color:'#5a4a2a', letterSpacing:'1px',
      writingMode:'vertical-rl', textOrientation:'mixed',
      padding:'0 2px', alignSelf:'stretch',
      display:'flex', alignItems:'center', justifyContent:'center',
      borderRight:'1px solid #2a1a08', marginRight:'4px'
    }}>
      {label}
    </div>
  );
}

// Granary: un + ekmek ortak kapasite
function GranaryGroup({ resources, granaryCapacity, processingRates, foodConsumePerHour = 0, isStarving = false }) {
  const un    = resources.un    || 0;
  const ekmek = resources.ekmek || 0;
  const total = un + ekmek;
  const cap   = granaryCapacity || 0;
  const pct   = cap > 0 ? Math.min(1, total / cap) : null;

  const capLabel = cap >= 1000 ? (cap/1000).toFixed(1)+'k' : cap;

  function itemRate(key) {
    const p = processingRates[key];
    return p?.outputPerHour || 0;
  }

  return (
    <div style={{
      background: isStarving ? '#2a0d08' : '#1a1208',
      border: `1px solid ${isStarving ? '#c03020' : '#3a2808'}`,
      borderRadius:'6px', padding:'4px 8px', minWidth:'130px'
    }}>
      <div style={{ fontSize:'9px', color:'#6a5a3a', marginBottom:'2px' }}>
        🏦 Granary {cap > 0 ? `— ${Math.floor(total)}/${capLabel}` : '(yok)'}
        {foodConsumePerHour > 0 && (
          <span style={{ color:'#e06020', marginLeft:'4px' }}>
            −{foodConsumePerHour.toFixed(1)}/sa
          </span>
        )}
        {isStarving && (
          <span style={{ color:'#ff4040', marginLeft:'4px', fontWeight:'bold' }}>
            ⚠ AÇLIK
          </span>
        )}
      </div>

      {/* Ortak kapasite barı */}
      {pct != null && (
        <div style={{ height:'3px', background:'#2a2010', borderRadius:'2px', margin:'2px 0', overflow:'hidden', display:'flex' }}>
          {/* Un (açık sarı) */}
          <div style={{
            height:'100%', background:'#c8c040',
            width:`${cap > 0 ? (un/cap*100).toFixed(1) : 0}%`
          }} />
          {/* Ekmek (kahve) */}
          <div style={{
            height:'100%', background:'#c86020',
            width:`${cap > 0 ? (ekmek/cap*100).toFixed(1) : 0}%`
          }} />
        </div>
      )}

      {/* Un + Ekmek satırları */}
      {[
        { key:'un',    icon:'🌕', label:'Un'    },
        { key:'ekmek', icon:'🍞', label:'Ekmek' }
      ].map(r => {
        const val  = resources[r.key] || 0;
        const rate = itemRate(r.key);
        return (
          <div key={r.key} style={{ display:'flex', justifyContent:'space-between', fontSize:'10px', color:'#d0c090' }}>
            <span>{r.icon} {r.label}</span>
            <span style={{ color:'#e8d4a0' }}>
              {Math.floor(val)}
              {rate > 0 && <span style={{ color:'#a0c060', marginLeft:'3px' }}>+{rate}/sa</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EquipmentCell({ item, val, cap }) {
  const pct = cap > 0 ? Math.min(1, val / cap) : null;
  const full = cap > 0 && val >= cap;
  const empty = val === 0 && cap === 0;
  return (
    <div style={{
      background: full ? '#1a0d08' : '#1a1208',
      border: `1px solid ${full ? '#6a3020' : '#3a2808'}`,
      borderRadius: '6px',
      padding: '4px 8px',
      textAlign: 'center',
      minWidth: '64px',
      opacity: empty ? 0.45 : 1
    }}>
      <div style={{ fontSize:'9px', color:'#6a5a3a' }}>{item.icon} {item.label}</div>
      <div style={{ fontSize:'14px', fontWeight:'bold', color:'#e8d4a0', lineHeight:'1.2' }}>
        {Math.floor(val || 0)}
        <span style={{ fontSize:'8px', color: full ? '#e06020' : '#5a6a40', fontWeight:'normal' }}>
          /{cap}
        </span>
      </div>
      {pct != null && (
        <div style={{ height:'3px', background:'#2a2010', borderRadius:'2px', margin:'2px 0', overflow:'hidden' }}>
          <div style={{
            height:'100%', borderRadius:'2px',
            width:`${(pct*100).toFixed(1)}%`,
            background: pct >= 0.9 ? '#e06020' : pct >= 0.6 ? '#c8a040' : '#7a8a60'
          }} />
        </div>
      )}
      {cap === 0 && (
        <div style={{ fontSize:'9px', color:'#5a4030' }}>
          {item.key === 'at' ? 'ahır yok' : 'cephane yok'}
        </div>
      )}
    </div>
  );
}

export default function ResourceBar({
  resources = {}, productionPerHour = {}, depotCapacities = {},
  granaryCapacity = 0,
  processingRates = {}, freeWorkers, population, maxPopulation, populationGrowthRate = 0,
  equipment = {}, equipmentCaps = {},
  consumption = {}, isStarving = false
}) {
  const foodPerHour  = consumption.foodPerHour  || 0;
  const grainPerHour = consumption.grainPerHour || 0;
  return (
    <div style={{
      background:'#12100a', borderBottom:'2px solid #3a2808',
      padding:'5px 12px', display:'flex', gap:'8px',
      alignItems:'center', flexShrink:0, overflowX:'auto'
    }}>

      {/* Ham Maddeler */}
      <GroupLabel label="HAM" />
      {RAW_RESOURCES.map(res => (
        <ResourceCell key={res.key} res={res}
          val={resources[res.key]}
          rate={productionPerHour[res.key] || 0}
          capacity={depotCapacities[res.key]}
          processing={null}
          consumeRate={res.key === 'tahil' ? grainPerHour : 0}
        />
      ))}

      <div style={{ width:'1px', background:'#3a2808', alignSelf:'stretch', margin:'0 2px' }} />

      {/* İşlenmiş Maddeler */}
      <GroupLabel label="İŞL" />
      {PROCESSED_RESOURCES.map(res => (
        <ResourceCell key={res.key} res={res}
          val={resources[res.key]}
          rate={0}
          capacity={depotCapacities[res.key]}
          processing={processingRates[res.key] || null}
        />
      ))}

      <div style={{ width:'1px', background:'#3a2808', alignSelf:'stretch', margin:'0 2px' }} />

      {/* Yiyecek — ortak granary kapasitesi */}
      <GroupLabel label="YİY" />
      <GranaryGroup
        resources={resources}
        granaryCapacity={granaryCapacity}
        processingRates={processingRates}
        foodConsumePerHour={foodPerHour}
        isStarving={isStarving}
      />

      <div style={{ width:'1px', background:'#3a2808', alignSelf:'stretch', margin:'0 2px' }} />

      {/* Askeri Envanter — cephanelik + ahır */}
      <GroupLabel label="ASK" />
      {MILITARY_EQUIPMENT.map(item => (
        <EquipmentCell key={item.key} item={item}
          val={equipment[item.key] || 0}
          cap={equipmentCaps[item.key] ?? 0}
        />
      ))}

      <div style={{ width:'1px', background:'#3a2808', alignSelf:'stretch', margin:'0 2px' }} />

      {/* Nüfus + İşçi + Açlık */}
      <div style={{ display:'flex', flexDirection:'column', gap:'4px', fontSize:'12px', color:'#8a8060', minWidth:'110px' }}>
        <span>
          👥 {population}/{maxPopulation}
          {isStarving
            ? <span style={{ color:'#ff4040', fontSize:'10px', marginLeft:'4px', fontWeight:'bold' }}>⚠ AÇLIK</span>
            : populationGrowthRate > 0
              ? <span style={{ color:'#60b0b0', fontSize:'10px', marginLeft:'4px' }}>+1/10sn</span>
              : <span style={{ color:'#6a4a3a', fontSize:'10px', marginLeft:'4px' }}>dolu</span>
          }
        </span>
        <span>🔨 Boşta: <strong style={{ color:'#e8d4a0' }}>{freeWorkers}</strong></span>
        {(consumption.soldiers > 0 || consumption.horses > 0) && (
          <span style={{ fontSize:'10px', color:'#6a6050' }}>
            ⚔ {consumption.soldiers || 0} asker
            {consumption.horses > 0 && <> · 🐎 {consumption.horses} at</>}
          </span>
        )}
      </div>
    </div>
  );
}
