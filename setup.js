/**
 * TraNord — Proje Kurulum Scripti
 * Çalıştır: node setup.js  (tranord klasöründen)
 */

const fs = require('fs');
const path = require('path');

// ─── Klasörleri oluştur ───────────────────────────────────────────
const dirs = [
  'server/data',
  'server/game',
  'client/src/data',
  'client/src/components',
];
dirs.forEach(d => fs.mkdirSync(d, { recursive: true }));

// ─── Dosya içerikleri ─────────────────────────────────────────────
const files = {};

// ══════════════════════════════════════════════════════════════════
// SERVER — DATA
// ══════════════════════════════════════════════════════════════════

files['server/data/buildingDefs.js'] = `
/**
 * Bina tanımları — sunucu tarafı
 * Yeni bina tipi eklemek için buraya ekle, başka dosyaya dokunma.
 */
const BUILDING_DEFS = {
  odun: {
    name: 'Odun Kesim Yeri',
    icon: '🪵',
    color: '#5a3a1a',
    slots: 3,
    baseProductionPerWorker: 2,   // level 1, 1 işçi → 2/saat
    upgradeBaseWork: 20,           // level 1→2 için iş birimi
    upgradeMultiplier: 1.8         // her seviyede maliyet çarpanı
  },
  tas: {
    name: 'Taş Ocağı',
    icon: '🪨',
    color: '#7a7068',
    slots: 3,
    baseProductionPerWorker: 1.5,
    upgradeBaseWork: 25,
    upgradeMultiplier: 1.8
  },
  tugla: {
    name: 'Tuğla Fırını',
    icon: '🧱',
    color: '#9a5030',
    slots: 3,
    baseProductionPerWorker: 1,
    upgradeBaseWork: 30,
    upgradeMultiplier: 1.9
  },
  demir: {
    name: 'Demir Madeni',
    icon: '⚙️',
    color: '#5a6878',
    slots: 3,
    baseProductionPerWorker: 1,
    upgradeBaseWork: 35,
    upgradeMultiplier: 2.0
  },
  tahil: {
    name: 'Tarla',
    icon: '🌾',
    color: '#8a7818',
    slots: 6,
    baseProductionPerWorker: 3,
    upgradeBaseWork: 15,
    upgradeMultiplier: 1.6
  }
};

module.exports = BUILDING_DEFS;
`;

// ══════════════════════════════════════════════════════════════════
// SERVER — GAME / villageState.js
// ══════════════════════════════════════════════════════════════════

files['server/game/villageState.js'] = `
/**
 * Köy başlangıç state'i
 * İleride PostgreSQL'e taşınacak; şimdilik bellekte.
 */
const BUILDING_DEFS = require('../data/buildingDefs');

function createBuildings() {
  const buildings = [];
  let id = 1;
  Object.keys(BUILDING_DEFS).forEach(type => {
    const def = BUILDING_DEFS[type];
    for (let i = 0; i < def.slots; i++) {
      buildings.push({
        id: id++,
        type,
        level: 1,
        workers: 0,
        upgrading: false,
        upgradeEndTime: null,
        upgradeWorkersAssigned: 0
      });
    }
  });
  return buildings;
}

const village = {
  population: 50,
  maxPopulation: 50,
  freeWorkers: 50,
  resources: { odun: 200, tas: 150, tugla: 80, demir: 50, tahil: 300 }
};

village.buildings = createBuildings();

module.exports = village;
`;

// ══════════════════════════════════════════════════════════════════
// SERVER — GAME / tick.js
// ══════════════════════════════════════════════════════════════════

files['server/game/tick.js'] = `
/**
 * Oyun tick motoru
 * processTick() her saniye çağrılır.
 * Formüller:
 *   üretim/saat  = işçi × baseProductionPerWorker × level
 *   üretim/sn    = üretim/saat ÷ 3600
 *   yükseltme sn = upgradeBaseWork × multiplier^(level-1) ÷ atanan_işçi
 */
const BUILDING_DEFS = require('../data/buildingDefs');

function getUpgradeCost(type, level) {
  const def = BUILDING_DEFS[type];
  return Math.round(def.upgradeBaseWork * Math.pow(def.upgradeMultiplier, level - 1));
}

function getUpgradeSeconds(type, level, workers) {
  if (workers <= 0) return Infinity;
  return Math.ceil(getUpgradeCost(type, level) / workers);
}

function formatTime(seconds) {
  if (seconds === Infinity) return '—';
  if (seconds < 60) return seconds + 'sn';
  if (seconds < 3600) return Math.ceil(seconds / 60) + 'dk';
  return (seconds / 3600).toFixed(1) + 'sa';
}

function processTick(village) {
  const now = Date.now();

  village.buildings.forEach(b => {
    const def = BUILDING_DEFS[b.type];

    // Üretim
    if (b.workers > 0 && !b.upgrading) {
      const perHour = b.workers * def.baseProductionPerWorker * b.level;
      village.resources[b.type] = (village.resources[b.type] || 0) + perHour / 3600;
    }

    // Yükseltme tamamlandı mı?
    if (b.upgrading && now >= b.upgradeEndTime) {
      b.level++;
      b.upgrading = false;
      village.freeWorkers += b.upgradeWorkersAssigned;
      b.upgradeWorkersAssigned = 0;
      b.upgradeEndTime = null;
      console.log(\`[UPGRADE] Bina #\${b.id} (\${b.type}) → Seviye \${b.level}\`);
    }
  });

  // Sayıları yuvarla
  Object.keys(village.resources).forEach(k => {
    village.resources[k] = Math.round(village.resources[k] * 10) / 10;
  });
}

module.exports = { processTick, getUpgradeCost, getUpgradeSeconds, formatTime };
`;

// ══════════════════════════════════════════════════════════════════
// SERVER — index.js
// ══════════════════════════════════════════════════════════════════

files['server/index.js'] = `
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');

const village  = require('./game/villageState');
const { processTick, getUpgradeCost, getUpgradeSeconds, formatTime } = require('./game/tick');
const BUILDING_DEFS = require('./data/buildingDefs');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// ─── Tick: her saniye ────────────────────────────────────────────
setInterval(() => {
  processTick(village);
  io.emit('village_update', buildPayload());
}, 1000);

// ─── Payload hazırla ─────────────────────────────────────────────
function buildPayload() {
  return {
    population:    village.population,
    maxPopulation: village.maxPopulation,
    freeWorkers:   village.freeWorkers,
    resources:     { ...village.resources },
    buildings: village.buildings.map(b => ({
      ...b,
      upgradeCost:    getUpgradeCost(b.type, b.level),
      upgradeTimeLeft: b.upgrading
        ? Math.max(0, Math.ceil((b.upgradeEndTime - Date.now()) / 1000))
        : null
    }))
  };
}

// ─── Socket olayları ─────────────────────────────────────────────
io.on('connection', socket => {
  console.log('[CONNECT]', socket.id);
  socket.emit('village_update', buildPayload());

  // İşçi ata
  socket.on('assign_workers', ({ buildingId, workers }) => {
    const b = village.buildings.find(x => x.id === buildingId);
    if (!b || b.upgrading) return;
    const diff = workers - b.workers;
    if (diff > village.freeWorkers || workers < 0) return;
    village.freeWorkers -= diff;
    b.workers = workers;
    io.emit('village_update', buildPayload());
  });

  // Yükseltme başlat
  socket.on('start_upgrade', ({ buildingId, workers }) => {
    const b = village.buildings.find(x => x.id === buildingId);
    if (!b || b.upgrading || workers <= 0 || workers > village.freeWorkers) return;
    const secs = getUpgradeSeconds(b.type, b.level, workers);
    village.freeWorkers           -= workers;
    b.upgrading                    = true;
    b.upgradeEndTime               = Date.now() + secs * 1000;
    b.upgradeWorkersAssigned       = workers;
    console.log(\`[UPGRADE START] Bina #\${b.id} (\${b.type}) Lvl\${b.level}→\${b.level+1}, \${secs}sn, \${workers} işçi\`);
    io.emit('village_update', buildPayload());
  });

  socket.on('disconnect', () => console.log('[DISCONNECT]', socket.id));
});

app.get('/', (_req, res) => res.send('TraNord sunucu çalışıyor!'));
server.listen(3001, () => console.log('✓ Sunucu: http://localhost:3001'));
`;

// ══════════════════════════════════════════════════════════════════
// CLIENT — DATA
// ══════════════════════════════════════════════════════════════════

files['client/src/data/buildingDefs.js'] = `
/**
 * Bina tanımları — istemci tarafı (sunucudaki buildingDefs.js ile aynı)
 * İleride API'den çekebiliriz; şimdilik kopyası burada.
 */
const BUILDING_DEFS = {
  odun:  { name: 'Odun Kesim Yeri', icon: '🪵', color: '#5a3a1a', baseProductionPerWorker: 2,   upgradeBaseWork: 20, upgradeMultiplier: 1.8 },
  tas:   { name: 'Taş Ocağı',       icon: '🪨', color: '#7a7068', baseProductionPerWorker: 1.5, upgradeBaseWork: 25, upgradeMultiplier: 1.8 },
  tugla: { name: 'Tuğla Fırını',    icon: '🧱', color: '#9a5030', baseProductionPerWorker: 1,   upgradeBaseWork: 30, upgradeMultiplier: 1.9 },
  demir: { name: 'Demir Madeni',    icon: '⚙️', color: '#5a6878', baseProductionPerWorker: 1,   upgradeBaseWork: 35, upgradeMultiplier: 2.0 },
  tahil: { name: 'Tarla',           icon: '🌾', color: '#8a7818', baseProductionPerWorker: 3,   upgradeBaseWork: 15, upgradeMultiplier: 1.6 }
};

export default BUILDING_DEFS;
`;

// ══════════════════════════════════════════════════════════════════
// CLIENT — COMPONENTS / ResourceBar.jsx
// ══════════════════════════════════════════════════════════════════

files['client/src/components/ResourceBar.jsx'] = `
const RES_LABELS = {
  odun: '🪵 Odun', tas: '🪨 Taş', tugla: '🧱 Tuğla', demir: '⚙️ Demir', tahil: '🌾 Tahıl'
};

export default function ResourceBar({ resources, freeWorkers, population, maxPopulation }) {
  return (
    <div style={{
      background: '#12100a',
      borderBottom: '2px solid #3a2808',
      padding: '8px 16px',
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      flexShrink: 0
    }}>
      {Object.entries(resources).map(([key, val]) => (
        <div key={key} style={{
          background: '#1a1208',
          border: '1px solid #3a2808',
          borderRadius: '6px',
          padding: '5px 12px',
          textAlign: 'center',
          minWidth: '90px'
        }}>
          <div style={{ fontSize: '10px', color: '#6a5a3a' }}>{RES_LABELS[key]}</div>
          <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#e8d4a0' }}>{Math.floor(val)}</div>
        </div>
      ))}

      <div style={{ marginLeft: 'auto', display: 'flex', gap: '14px', fontSize: '12px', color: '#8a8060' }}>
        <span>👥 {population}/{maxPopulation}</span>
        <span>🔨 Boşta: <strong style={{ color: '#e8d4a0' }}>{freeWorkers}</strong></span>
      </div>
    </div>
  );
}
`;

// ══════════════════════════════════════════════════════════════════
// CLIENT — COMPONENTS / BuildingSlot.jsx
// ══════════════════════════════════════════════════════════════════

files['client/src/components/BuildingSlot.jsx'] = `
import { useState } from 'react';
import BUILDING_DEFS from '../data/buildingDefs';

// ─── Yardımcı hesaplamalar ───────────────────────────────────────
function getUpgradeCost(type, level) {
  const def = BUILDING_DEFS[type];
  return Math.round(def.upgradeBaseWork * Math.pow(def.upgradeMultiplier, level - 1));
}

function getUpgradeTime(type, level, workers) {
  if (!workers || workers <= 0) return '—';
  const secs = Math.ceil(getUpgradeCost(type, level) / workers);
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
export default function BuildingSlot({ building, freeWorkers, onAssignWorkers, onStartUpgrade }) {
  const def = BUILDING_DEFS[building.type];
  const [localWorkers, setLocalWorkers]       = useState(building.workers);
  const [upgradeWorkers, setUpgradeWorkers]   = useState(1);
  const [showUpgradePanel, setShowUpgrade]    = useState(false);

  const prodPerHour = localWorkers * def.baseProductionPerWorker * building.level;
  const maxAssign   = localWorkers + freeWorkers; // mevcut + boştakiler

  function changeWorkers(delta) {
    const next = Math.max(0, Math.min(maxAssign, localWorkers + delta));
    setLocalWorkers(next);
    onAssignWorkers(building.id, next);
  }

  function changeUpgradeWorkers(delta) {
    setUpgradeWorkers(w => Math.max(1, Math.min(freeWorkers, w + delta)));
  }

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
          <div style={{ fontSize: '10px', color: '#c8a44a' }}>Seviye {building.level}</div>
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
              flexDirection: 'column', gap: '6px'
            }}>
              <div style={{ color: '#6a5a3a' }}>
                Maliyet: {getUpgradeCost(building.type, building.level)} iş birimi
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#6a5a3a', flex: 1 }}>İşçi</span>
                <button style={iconBtn} onClick={() => changeUpgradeWorkers(-1)}>−</button>
                <span style={{ color: '#e8d4a0', minWidth: '22px', textAlign: 'center' }}>
                  {upgradeWorkers}
                </span>
                <button style={iconBtn} onClick={() => changeUpgradeWorkers(+1)}>+</button>
              </div>

              <div style={{ color: '#9a9070' }}>
                Süre: {getUpgradeTime(building.type, building.level, upgradeWorkers)}
              </div>

              <button
                onClick={() => { onStartUpgrade(building.id, upgradeWorkers); setShowUpgrade(false); }}
                style={{
                  padding: '5px', background: '#2a5010',
                  border: '1px solid #5aaa28', borderRadius: '4px',
                  color: '#b8e890', fontSize: '11px', cursor: 'pointer'
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
`;

// ══════════════════════════════════════════════════════════════════
// CLIENT — COMPONENTS / ProductionArea.jsx
// ══════════════════════════════════════════════════════════════════

files['client/src/components/ProductionArea.jsx'] = `
import BuildingSlot from './BuildingSlot';
import BUILDING_DEFS from '../data/buildingDefs';

const TYPE_ORDER = ['odun', 'tas', 'tugla', 'demir', 'tahil'];

export default function ProductionArea({ buildings, freeWorkers, onAssignWorkers, onStartUpgrade }) {
  return (
    <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
      {TYPE_ORDER.map(type => {
        const group = buildings.filter(b => b.type === type);
        const def   = BUILDING_DEFS[type];
        return (
          <div key={type} style={{ marginBottom: '20px' }}>
            <h3 style={{
              color: '#c8a44a', fontSize: '12px',
              letterSpacing: '1.5px', marginBottom: '10px',
              textTransform: 'uppercase'
            }}>
              {def.icon} {def.name}
            </h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {group.map(b => (
                <BuildingSlot
                  key={b.id}
                  building={b}
                  freeWorkers={freeWorkers}
                  onAssignWorkers={onAssignWorkers}
                  onStartUpgrade={onStartUpgrade}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
`;

// ══════════════════════════════════════════════════════════════════
// CLIENT — App.jsx
// ══════════════════════════════════════════════════════════════════

files['client/src/App.jsx'] = `
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import ResourceBar    from './components/ResourceBar';
import ProductionArea from './components/ProductionArea';

const socket = io('http://localhost:3001');

const TABS = [
  { key: 'uretim', label: 'Üretim Alanı' },
  { key: 'koy',    label: 'Köy Merkezi' },
  { key: 'harita', label: 'Dünya Haritası' }
];

export default function App() {
  const [village, setVillage] = useState(null);
  const [tab, setTab]         = useState('uretim');

  useEffect(() => {
    socket.on('village_update', setVillage);
    return () => socket.off('village_update');
  }, []);

  if (!village) {
    return <div style={{ color: '#e8d4a0', padding: '40px', fontFamily: 'Georgia' }}>Bağlanıyor...</div>;
  }

  const assignWorkers  = (id, n) => socket.emit('assign_workers',  { buildingId: id, workers: n });
  const startUpgrade   = (id, n) => socket.emit('start_upgrade',   { buildingId: id, workers: n });

  return (
    <div style={{
      background: '#0d1117', height: '100vh',
      color: '#e8d4a0', fontFamily: 'Georgia',
      display: 'flex', flexDirection: 'column'
    }}>

      {/* Başlık */}
      <div style={{
        background: '#1a1208', padding: '8px 20px',
        borderBottom: '2px solid #3a2808',
        textAlign: 'center', flexShrink: 0
      }}>
        <span style={{ color: '#c8a44a', fontSize: '18px', letterSpacing: '3px' }}>
          ⚔ TRANORD ⚔
        </span>
      </div>

      {/* Kaynak çubuğu */}
      <ResourceBar
        resources={village.resources}
        freeWorkers={village.freeWorkers}
        population={village.population}
        maxPopulation={village.maxPopulation}
      />

      {/* Sekme navigasyonu */}
      <div style={{
        background: '#0f0c06',
        borderBottom: '1px solid #2a1808',
        display: 'flex', padding: '0 16px', flexShrink: 0
      }}>
        {TABS.map(({ key, label }) => (
          <div
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '8px 16px', cursor: 'pointer', fontSize: '12px',
              color: tab === key ? '#c8a44a' : '#5a6a48',
              borderBottom: \`2px solid \${tab === key ? '#c8a44a' : 'transparent'}\`,
              transition: 'all 0.15s'
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* İçerik */}
      {tab === 'uretim' && (
        <ProductionArea
          buildings={village.buildings}
          freeWorkers={village.freeWorkers}
          onAssignWorkers={assignWorkers}
          onStartUpgrade={startUpgrade}
        />
      )}
      {tab === 'koy' && (
        <div style={{ padding: '40px', color: '#5a6a48', textAlign: 'center' }}>
          Köy Merkezi — yakında
        </div>
      )}
      {tab === 'harita' && (
        <div style={{ padding: '40px', color: '#5a6a48', textAlign: 'center' }}>
          Dünya Haritası — yakında
        </div>
      )}
    </div>
  );
}
`;

// ─── Dosyaları yaz ────────────────────────────────────────────────
let count = 0;
Object.entries(files).forEach(([filePath, content]) => {
  fs.writeFileSync(filePath, content.trimStart());
  console.log('✓', filePath);
  count++;
});

console.log(`\n✅ ${count} dosya oluşturuldu. Şimdi:\n`);
console.log('  1. server CMD: node index.js');
console.log('  2. client CMD: npm run dev');
console.log('  3. Tarayıcı:   http://localhost:5173\n');
