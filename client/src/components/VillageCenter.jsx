import { useState, useMemo, useRef, useEffect } from 'react';
import BuildMenu from './BuildMenu';
import EquipmentPanel from './EquipmentPanel';
import UnitTrainingPanel from './UnitTrainingPanel';
import VILLAGE_DEFS from '../data/villageDefs';
import merkezImg from '../assets/merkez2.png';
import zirhciImg from '../assets/zirhci.png';
import zirhciVideo from '../assets/zirhci.mp4';
import { popoverStyle, computePopoverPos } from './popoverStyle';

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
  anaBina:  '#7a6010',
  isleme:   '#4a5028',
  merkez:   '#7a6010'
};

// Seçim/hover border için parlak kategori tonları
const CATEGORY_BORDER = {
  uretim:   '#7ae048',
  askeri:   '#5a9cff',
  depo:     '#b088f0',
  ekonomik: '#f0c820',
  savunma:  '#ff6060',
  nufus:    '#60d8d8',
  anaBina:  '#f0c820',
  isleme:   '#c8d860',
  merkez:   '#f0c820'
};

// Hangi binalar için özel texture kullanılacak
const BUILDING_TEXTURE = {
  zirh: zirhciImg
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
  const [hovered, setHovered] = useState(null);
  const [viewSize, setViewSize] = useState({ w: 900, h: 720 });
  const containerRef = useRef(null);

  const W = 860, H = 860;
  const cx = W / 2, cy = H / 2;

  const towerSet = new Set(towerSlots);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      const rect = containerRef.current.getBoundingClientRect();
      setViewSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // SVG 'rotateX(20deg) scale(1.2)' transformunu hesaba kat (kabaca 1.1 y katsayı)
  // Hex merkez ekran konumu için offset:
  //   - SVG, container'ın içinde ortalanmış
  //   - cx/cy SVG koordinatında tam ortada
  //   - scale(1.2) ile radius 1.2× büyüyor
  const VC_SCALE = 1.2;
  const popoverPos = useMemo(() => {
    if (!selected || !showMenu) return null;
    const [sq, sr] = selected.split(',').map(Number);
    const { x: hx, y: hy } = hexToScreen(sq, sr, cx, cy);
    // SVG, container içinde yatay ortada; container genişliği < SVG ise SVG sola doğru kaydırılmaz (svg overflow:auto container'da)
    // Basitleştirmek için container'ın ortasına konumlandır
    const containerCx = viewSize.w / 2;
    const containerCy = viewSize.h / 2;
    const hexScreenX = containerCx + (hx - cx) * VC_SCALE;
    const hexScreenY = containerCy + (hy - cy) * VC_SCALE * 0.95; // perspektif ufak düzeltme
    return computePopoverPos({
      hexScreenX,
      hexScreenY,
      hexRadius: S * VC_SCALE,
      viewW: viewSize.w,
      viewH: viewSize.h,
      panelW: 300,
      prefH: 520,
    });
  }, [selected, showMenu, viewSize.w, viewSize.h, cx, cy]);

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

      {/* SVG Hex Grid — 3D eğimli */}
      <div ref={containerRef} style={{
        flex:1, display:'flex', alignItems:'center', justifyContent:'center',
        overflowY:'auto', overflowX:'auto',
        perspective: '1400px', perspectiveOrigin: '50% 30%',
        position: 'relative'
      }}>
        <svg width={W} height={H} style={{
          cursor:'pointer', flexShrink:0,
          transform: 'rotateX(20deg) scale(1.2)',
          transformStyle: 'preserve-3d',
          transformOrigin: 'center center'
        }}>

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
            const isHovered  = hovered === key;
            const isRing3    = ring === 3;

            const category = isCenter
              ? 'merkez'
              : building
                ? (building.type === 'anaBina' ? 'anaBina' : (VILLAGE_DEFS[building.type]?.category || ''))
                : '';

            // Zemin rengi
            let fill = isRing3 ? '#2e3e26' : '#3a5a2a';
            if (isCenter)     fill = '#4a4020';
            else if (isTower) fill = '#3a3830';
            else if (building) fill = CATEGORY_COLORS[category] || '#2a4a1a';

            // Seçim/hover border: kategori rengi parlak ton
            const catBorder = CATEGORY_BORDER[category] || '#f0c820';
            const stroke =
              isSelected ? catBorder
              : isHovered ? catBorder
              : isTower   ? '#70a8d8'
              : isCenter  ? '#c8a040'
              : isRing3   ? '#2a4018'
              : '#2a5020';
            const strokeWidth = isSelected ? 3.5 : isHovered ? 3.5 : isCenter ? 2.5 : 2;

            // Texture: merkez ve bazı binalar için
            const buildingTexture = building ? BUILDING_TEXTURE[building.type] : null;
            const tileTexture = isCenter ? merkezImg : buildingTexture;
            const hasTileTexture = !!tileTexture;
            const clipId = `vc-clip-${q}-${r}`;

            // Zırhçı hover → video oynat (zoom yok)
            const isZirhHover = isHovered && building?.type === 'zirh';

            return (
              <g key={key}
                 onClick={() => handleSlotClick(key)}
                 onMouseEnter={() => setHovered(key)}
                 onMouseLeave={() => setHovered(prev => (prev === key ? null : prev))}
                 transform={isHovered && !isZirhHover ? `translate(${x} ${y}) scale(1.05) translate(${-x} ${-y})` : undefined}
                 style={{
                   cursor:'pointer',
                   transition: 'transform 0.18s ease-out, filter 0.18s ease-out',
                   filter: isHovered && !isZirhHover ? 'brightness(1.12) drop-shadow(0 2px 4px rgba(0,0,0,0.35))' : undefined
                 }}>

                {hasTileTexture && (
                  <defs>
                    <clipPath id={clipId}>
                      <polygon points={hexPoints(x, y)} />
                    </clipPath>
                  </defs>
                )}

                <polygon
                  points={hexPoints(x, y)}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={0.92}
                />

                {hasTileTexture && !isZirhHover && (
                  <image
                    href={tileTexture}
                    x={x - S}
                    y={y - S}
                    width={S * 2}
                    height={S * 2}
                    clipPath={`url(#${clipId})`}
                    opacity={building?.building ? 0.5 : 1}
                    preserveAspectRatio="xMidYMid slice"
                  />
                )}

                {isZirhHover && !building?.building && (
                  <foreignObject
                    x={x - S}
                    y={y - S}
                    width={S * 2}
                    height={S * 2}
                    clipPath={`url(#${clipId})`}
                    style={{ pointerEvents: 'none' }}
                  >
                    <video
                      xmlns="http://www.w3.org/1999/xhtml"
                      src={zirhciVideo}
                      autoPlay
                      muted
                      loop
                      playsInline
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                  </foreignObject>
                )}

                {/* Border texture üstünde kalsın */}
                {hasTileTexture && (
                  <polygon
                    points={hexPoints(x, y)}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                  />
                )}

                {building && !hasTileTexture && (
                  <text x={x} y={y-5} textAnchor="middle" dominantBaseline="middle"
                    fontSize={20} style={{ userSelect:'none' }}
                    opacity={building.building ? 0.35 : 1}>
                    {getBuildingIcon(building.type)}
                  </text>
                )}

                {building && building.building && (
                  <text x={x+17} y={y-17} textAnchor="middle" dominantBaseline="middle"
                    fontSize={13} style={{ userSelect:'none' }}>
                    ⚙️
                  </text>
                )}

                {building && (
                  <text x={x} y={hasTileTexture ? y + S - 10 : y + 15}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={hasTileTexture ? 10 : 9}
                    fontWeight={hasTileTexture ? 'bold' : 'normal'}
                    fill={building.building ? '#c87020' : hasTileTexture ? '#fff8c0' : '#c8a44a'}
                    stroke={hasTileTexture ? '#3a1a00' : 'none'}
                    strokeWidth={hasTileTexture ? 2.5 : 0}
                    paintOrder="stroke"
                    style={{ userSelect:'none' }}>
                    {building.building ? `${building.buildTimeLeft}sn` : `Lvl ${building.level}`}
                  </text>
                )}

                {!building && !isCenter && (
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                    fontSize={18}
                    fill={isTower ? 'rgba(120,180,230,0.5)' : isRing3 ? 'rgba(140,190,100,0.2)' : 'rgba(180,230,120,0.3)'}
                    style={{ userSelect:'none' }}>
                    {isTower ? '🗼' : '+'}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tıklanan hex'in yanına açılan floating panel */}
        {showMenu && selected && popoverPos && (
          <div style={popoverStyle(popoverPos, { width: 300, padding: 0 })}>
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
    </div>
  );
}
