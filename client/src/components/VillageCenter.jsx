import { useState } from 'react';
import BuildMenu from './BuildMenu';
import EquipmentPanel from './EquipmentPanel';
import UnitTrainingPanel from './UnitTrainingPanel';
import VILLAGE_DEFS from '../data/villageDefs';

const EQUIPMENT_BUILDINGS = new Set(['silahci', 'zirh', 'ahir']);
const TRAINING_BUILDINGS  = new Set(['kisla', 'ahir', 'atolye']);

const SQRT3 = Math.sqrt(3);
const S = 56; // hex boyutu (küçülttük ki ring3 sığsın)

const RING1 = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
const RING2 = [[2,0],[2,-1],[2,-2],[1,-2],[0,-2],[-1,-1],[-2,0],[-2,1],[-2,2],[-1,2],[0,2],[1,1]];
const RING3 = [
  [3,0],[3,-1],[3,-2],[3,-3],
  [2,-3],[1,-3],[0,-3],
  [-1,-2],[-2,-1],[-3,0],
  [-3,1],[-3,2],[-3,3],
  [-2,3],[-1,3],[0,3],
  [1,2],[2,1]
];

const ALL_SLOTS = [
  { q:0, r:0, ring:0 },
  ...RING1.map(([q,r]) => ({ q, r, ring:1 })),
  ...RING2.map(([q,r]) => ({ q, r, ring:2 })),
  ...RING3.map(([q,r]) => ({ q, r, ring:3 }))
];

function hexToScreen(q, r, cx, cy) {
  return {
    x: cx + S * (3/2 * q),
    y: cy + S * (SQRT3/2 * q + SQRT3 * r)
  };
}

function hexPoints(cx, cy) {
  return Array.from({length:6}, (_,i) => {
    const a = Math.PI / 3 * i;
    return `${(cx + (S-2) * Math.cos(a)).toFixed(1)},${(cy + (S-2) * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

const CATEGORY_COLORS = {
  uretim:   '#3a6a2a',
  askeri:   '#2a3a6a',
  depo:     '#4a3a5a',
  ekonomik: '#6a5a1a',
  savunma:  '#6a2a2a',
  nufus:    '#2a5a5a',
  anaBina:  '#7a6010'
};

function getBuildingIcon(type) {
  if (type === 'anaBina') return '🏛️';
  return VILLAGE_DEFS[type]?.icon || '🏠';
}

export default function VillageCenter({
  villageBuildings = {}, towerSlots = [], freeWorkers = 0, resources = {},
  processingRates = {},
  equipment = {}, equipmentCaps = {}, equipmentQueues = {}, equipmentByBuilding = {}, equipmentDefs = {},
  unitQueues = {}, unitsByBuilding = {}, unitDefs = {},
  onBuild, onUpgrade, onDemolish, onAssignVillageWorkers,
  onQueueEquipment, onCancelEquipment,
  onTrainUnit, onCancelUnitOrder
}) {
  const [selected, setSelected] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  const W = 860, H = 860;
  const cx = W / 2, cy = H / 2;

  const towerSet = new Set(towerSlots);

  function handleSlotClick(slotKey) {
    if (selected === slotKey) {
      setSelected(null);
      setShowMenu(false);
    } else {
      setSelected(slotKey);
      setShowMenu(true);
    }
  }

  const selectedBuilding = selected ? villageBuildings[selected] : null;

  return (
    <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

      {/* SVG Hex Grid */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', overflowY:'auto', overflowX:'auto' }}>
        <svg width={W} height={H} style={{ cursor:'pointer', flexShrink:0 }}>

          {/* Duvar halkası — ring 2 dışında */}
          <circle cx={cx} cy={cy} r={S*3.45}
            fill="none" stroke="#5a4a30" strokeWidth={14} />
          <circle cx={cx} cy={cy} r={S*3.45}
            fill="none" stroke="#8a7a58" strokeWidth={6} />

          {ALL_SLOTS.map(({ q, r, ring }) => {
            const key = `${q},${r}`;
            const { x, y } = hexToScreen(q, r, cx, cy);
            const building   = villageBuildings[key];
            const isTower    = towerSet.has(key);
            const isCenter   = key === '0,0';
            const isSelected = selected === key;
            const isRing3    = ring === 3;

            // Zemin rengi
            let fill = isRing3 ? '#2e3e26' : '#3a5a2a';
            if (isCenter)     fill = '#4a4020';
            else if (isTower) fill = '#3a3830';
            else if (building) {
              const cat = building.type === 'anaBina'
                ? 'anaBina'
                : (VILLAGE_DEFS[building.type]?.category || '');
              fill = CATEGORY_COLORS[cat] || '#2a4a1a';
            }

            const stroke      = isSelected ? '#f0c820' : isTower ? '#70a8d8' : isCenter ? '#c8a040' : isRing3 ? '#2a4018' : '#2a5020';
            const strokeWidth = isSelected ? 3 : isCenter ? 2.5 : 2;

            return (
              <g key={key} onClick={() => handleSlotClick(key)} style={{ cursor:'pointer' }}>
                <polygon
                  points={hexPoints(x, y)}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={0.92}
                />

                {building ? (
                  <>
                    {/* Bina ikonu — inşa süresinde soluk */}
                    <text x={x} y={y-5} textAnchor="middle" dominantBaseline="middle"
                      fontSize={20} style={{ userSelect:'none' }}
                      opacity={building.building ? 0.35 : 1}>
                      {getBuildingIcon(building.type)}
                    </text>

                    {/* İnşa/yükseltme sırasında çark (sağ üst köşe) */}
                    {building.building && (
                      <text x={x+17} y={y-17} textAnchor="middle" dominantBaseline="middle"
                        fontSize={13} style={{ userSelect:'none' }}>
                        ⚙️
                      </text>
                    )}

                    {/* Alt etiket */}
                    <text x={x} y={y+15} textAnchor="middle" dominantBaseline="middle"
                      fontSize={9} fill={building.building ? '#c87020' : '#c8a44a'}
                      style={{ userSelect:'none' }}>
                      {building.building ? `${building.buildTimeLeft}sn` : `Lvl ${building.level}`}
                    </text>
                  </>
                ) : (
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                    fontSize={18}
                    fill={isTower
                      ? 'rgba(120,180,230,0.5)'
                      : isRing3
                        ? 'rgba(140,190,100,0.2)'
                        : 'rgba(180,230,120,0.3)'}
                    style={{ userSelect:'none' }}>
                    {isTower ? '🗼' : '+'}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Sağ panel */}
      {showMenu && selected && (
        <div style={{ width: 320, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: '#1e1e28', borderLeft: '1px solid #3a3040' }}>
          <BuildMenu
            slotKey={selected}
            building={selectedBuilding}
            isTower={towerSet.has(selected)}
            isCenter={selected === '0,0'}
            placedBuildings={villageBuildings}
            freeWorkers={freeWorkers}
            resources={resources}
            processingRates={processingRates}
            onBuild={(type, workers) => { onBuild(selected, type, workers); setShowMenu(false); setSelected(null); }}
            onUpgrade={(workers) => { onUpgrade(selected, workers); setShowMenu(false); setSelected(null); }}
            onDemolish={() => { onDemolish(selected); setShowMenu(false); setSelected(null); }}
            onAssignVillageWorkers={(workers) => onAssignVillageWorkers(selected, workers)}
            onClose={() => { setShowMenu(false); setSelected(null); }}
          />

          {/* Silahçı/Zırhçı/Ahır seçiliyse ekipman üretim paneli */}
          {selectedBuilding
            && EQUIPMENT_BUILDINGS.has(selectedBuilding.type)
            && !selectedBuilding.building
            && selectedBuilding.level >= 1 && (
            <div style={{ padding: '0 10px 10px' }}>
              <EquipmentPanel
                buildingType={selectedBuilding.type}
                equipmentByBuilding={equipmentByBuilding}
                equipmentDefs={equipmentDefs}
                equipment={equipment}
                equipmentCaps={equipmentCaps}
                queue={equipmentQueues[selectedBuilding.type] || []}
                resources={resources}
                buildingWorkers={selectedBuilding.workers || 0}
                onQueue={(type, qty) => onQueueEquipment(selectedBuilding.type, type, qty)}
                onCancel={(orderId) => onCancelEquipment(selectedBuilding.type, orderId)}
              />
            </div>
          )}

          {/* Kışla/Ahır/Atölye seçiliyse birim eğitim paneli */}
          {selectedBuilding
            && TRAINING_BUILDINGS.has(selectedBuilding.type)
            && !selectedBuilding.building
            && selectedBuilding.level >= 1
            && (unitsByBuilding[selectedBuilding.type] || []).length > 0 && (
            <div style={{ padding: '0 10px 10px' }}>
              <UnitTrainingPanel
                buildingType={selectedBuilding.type}
                unitsByBuilding={unitsByBuilding}
                unitDefs={unitDefs}
                equipmentDefs={equipmentDefs}
                equipment={equipment}
                queue={unitQueues[selectedBuilding.type] || []}
                freeWorkers={freeWorkers}
                trainerWorkers={selectedBuilding.workers || 0}
                onTrain={(type, qty) => onTrainUnit(selectedBuilding.type, type, qty)}
                onCancel={(orderId) => onCancelUnitOrder(selectedBuilding.type, orderId)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
