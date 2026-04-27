import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import ResourceBar    from './components/ResourceBar';
import ProductionArea from './components/ProductionArea';
import VillageCenter  from './components/VillageCenter';
import ArmyPanel      from './components/ArmyPanel';
import BattleSimulator from './components/BattleSimulator';

const SERVER_URL   = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const LANDING_URL  = import.meta.env.VITE_LANDING_URL || 'http://localhost:8080';

// Token: URL param → localStorage → yok
function getToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken  = urlParams.get('token');
  if (urlToken) {
    localStorage.setItem('tranord_token', urlToken);
    // Token'ı URL'den temizle (güvenlik)
    const clean = window.location.origin + window.location.pathname;
    window.history.replaceState({}, '', clean);
    return urlToken;
  }
  return localStorage.getItem('tranord_token') || null;
}

const token = getToken();

// Token yoksa landing site'a yönlendir
if (!token) {
  window.location.href = LANDING_URL;
}

const socket = io(SERVER_URL, {
  auth: { token },
  reconnectionAttempts: 5
});

// Auth hatası: token geçersiz → landing site'a yönlendir
socket.on('connect_error', (err) => {
  if (err.message === 'auth:token_missing' || err.message === 'auth:token_invalid') {
    localStorage.removeItem('tranord_token');
    window.location.href = LANDING_URL;
  }
});

const TABS = [
  { key: 'uretim',    label: 'Üretim Alanı' },
  { key: 'koy',       label: 'Köy Merkezi' },
  { key: 'ordu',      label: 'Ordu' },
  { key: 'simulator', label: 'Savaş Simülatörü' },
  { key: 'harita',    label: 'Dünya Haritası' }
];

// Token payload'dan email oku (JWT'nin ikinci kısmı base64)
function getEmailFromToken(tok) {
  try {
    return JSON.parse(atob(tok.split('.')[1])).email || '';
  } catch { return ''; }
}

function logout() {
  localStorage.removeItem('tranord_token');
  window.location.href = LANDING_URL;
}

export default function App() {
  const [village, setVillage] = useState(null);
  const [tab, setTab]         = useState('uretim');
  const userEmail             = getEmailFromToken(token || '');

  useEffect(() => {
    socket.on('village_update', setVillage);
    return () => socket.off('village_update');
  }, []);

  if (!village) {
    return <div style={{ color: '#e8d4a0', padding: '40px', fontFamily: 'Georgia' }}>Bağlanıyor...</div>;
  }

  // Üretim alanı (hex grid) event'leri
  const buildProduction         = (slot, type, workers) => socket.emit('build_production',          { slotKey: slot, type, workers });
  const upgradeProduction       = (slot, workers)       => socket.emit('upgrade_production',        { slotKey: slot, workers });
  const demolishProduction      = (slot)                => socket.emit('demolish_production',       { slotKey: slot });
  const assignProductionWorkers = (slot, workers)       => socket.emit('assign_production_workers', { slotKey: slot, workers });

  // Köy merkezi event'leri
  const buildVillage          = (slot, type, workers) => socket.emit('build_village',          { slotKey: slot, buildingType: type, workers });
  const upgradeVillage        = (slot, workers)       => socket.emit('upgrade_village',        { slotKey: slot, workers });
  const demolishVillage       = (slot)                => socket.emit('demolish_village',       { slotKey: slot });
  const assignVillageWorkers  = (slot, workers)       => socket.emit('assign_village_workers', { slotKey: slot, workers });

  // Ekipman kuyruğu event'leri
  const queueEquipment  = (buildingType, equipmentType, quantity) =>
    socket.emit('queue_equipment', { buildingType, equipmentType, quantity });
  const cancelEquipment = (buildingType, orderId) =>
    socket.emit('cancel_equipment_order', { buildingType, orderId });

  // Birim eğitim event'leri
  const trainUnit = (buildingType, unitType, quantity) =>
    socket.emit('train_unit', { buildingType, unitType, quantity });
  const cancelUnitOrder = (buildingType, orderId) =>
    socket.emit('cancel_unit_order', { buildingType, orderId });

  // Hız ayarı — sabit adımlar: 0.1×, 0.5×, 1×, 2×, 4×, 8×
  const SPEED_STEPS = [0.1, 0.5, 1, 2, 4, 8, 16, 32, 64, 128];
  const setSpeed = (ms) => socket.emit('set_speed', { tickMs: ms });
  const tickMs   = village.tickMs || 1000;
  const currentMult = +(1000 / tickMs).toFixed(4);
  const speedIdx = (() => {
    let best = 2; // default: 1×
    let bestDiff = Infinity;
    SPEED_STEPS.forEach((m, i) => {
      const diff = Math.abs(m - currentMult);
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    });
    return best;
  })();

  return (
    <div style={{
      background: '#0d1117', height: '100vh',
      color: '#e8d4a0', fontFamily: 'Georgia',
      display: 'flex', flexDirection: 'column'
    }}>

      <div style={{
        background: '#1a1208', padding: '8px 20px',
        borderBottom: '2px solid #3a2808',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ flex: 1, fontSize: '11px', color: '#5a6a48', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {userEmail}
        </div>
        <span style={{ color: '#c8a44a', fontSize: '18px', letterSpacing: '3px' }}>
          ⚔ TRANORD ⚔
        </span>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'flex-end', gap: '8px',
          fontSize: '11px', color: '#8a7a4a'
        }}>
          <span>Hız:</span>
          <input
            type="range"
            min={0}
            max={SPEED_STEPS.length - 1}
            step={1}
            value={speedIdx}
            onChange={e => {
              const mult = SPEED_STEPS[Number(e.target.value)];
              setSpeed(Math.round(1000 / mult));
            }}
            style={{ width: '120px', accentColor: '#c8a44a' }}
            title={`${SPEED_STEPS[speedIdx]}× hız`}
          />
          <span style={{
            color: '#c8a44a', minWidth: '40px', textAlign: 'right',
            fontFamily: 'monospace'
          }}>
            {SPEED_STEPS[speedIdx]}×
          </span>
          <button
            onClick={() => setSpeed(1000)}
            style={{
              background: 'transparent', border: '1px solid #3a2808',
              color: '#8a7a4a', padding: '2px 8px', fontSize: '10px',
              cursor: 'pointer', borderRadius: '2px'
            }}
            title="1× (varsayılan)"
          >1×</button>
          <button
            onClick={logout}
            style={{
              background: 'transparent', border: '1px solid #3a2808',
              color: '#5a4a2a', padding: '2px 8px', fontSize: '10px',
              cursor: 'pointer', borderRadius: '2px', marginLeft: '8px'
            }}
            title="Çıkış yap"
          >Çıkış</button>
        </div>
      </div>

      <ResourceBar
        resources={village.resources}
        productionPerHour={village.productionPerHour}
        depotCapacities={village.depotCapacities || {}}
        granaryCapacity={village.granaryCapacity || 0}
        processingRates={village.processingRates || {}}
        freeWorkers={village.freeWorkers}
        population={village.population}
        maxPopulation={village.maxPopulation}
        populationGrowthRate={village.populationGrowthRate || 0}
        equipment={village.equipment || {}}
        equipmentCaps={village.equipmentCaps || {}}
        consumption={village.consumption || {}}
        isStarving={village.isStarving || false}
      />

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
              borderBottom: `2px solid ${tab === key ? '#c8a44a' : 'transparent'}`,
              transition: 'all 0.15s'
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {tab === 'uretim' && (
        <ProductionArea
          productionTiles={village.productionTiles || {}}
          productionRing1={village.productionRing1 || []}
          maxProductionSlots={village.maxProductionSlots || 6}
          anaBina={village.villageBuildings?.['0,0']}
          freeWorkers={village.freeWorkers}
          resources={village.resources}
          onBuild={buildProduction}
          onUpgrade={upgradeProduction}
          onDemolish={demolishProduction}
          onAssignWorkers={assignProductionWorkers}
          onUpgradeAnaBina={(workers) => upgradeVillage('0,0', workers)}
          onEnterVillageCenter={() => setTab('koy')}
        />
      )}
      {tab === 'koy' && (
        <VillageCenter
          villageBuildings={village.villageBuildings || {}}
          towerSlots={village.towerSlots || []}
          freeWorkers={village.freeWorkers}
          resources={village.resources}
          processingRates={village.processingRates || {}}
          equipment={village.equipment || {}}
          equipmentQueues={village.equipmentQueues || {}}
          equipmentByBuilding={village.equipmentByBuilding || {}}
          equipmentDefs={village.equipmentDefs || {}}
          unitQueues={village.unitQueues || {}}
          unitsByBuilding={village.unitsByBuilding || {}}
          unitDefs={village.unitDefs || {}}
          onBuild={buildVillage}
          onUpgrade={upgradeVillage}
          onDemolish={demolishVillage}
          onAssignVillageWorkers={assignVillageWorkers}
          onQueueEquipment={queueEquipment}
          onCancelEquipment={cancelEquipment}
          onTrainUnit={trainUnit}
          onCancelUnitOrder={cancelUnitOrder}
        />
      )}
      {tab === 'ordu' && (
        <ArmyPanel
          army={village.army || {}}
          unitDefs={village.unitDefs || {}}
          equipmentDefs={village.equipmentDefs || {}}
        />
      )}
      {tab === 'simulator' && (
        <BattleSimulator
          socket={socket}
          unitDefs={village.unitDefs || {}}
        />
      )}
      {tab === 'harita' && (
        <div style={{ padding: '40px', color: '#5a6a48', textAlign: 'center' }}>
          Dünya Haritası — yakında
        </div>
      )}
    </div>
  );
}