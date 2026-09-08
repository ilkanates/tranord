import { useState, useMemo, useRef, useEffect } from 'react';
import BuildMenu from './BuildMenu';
import EquipmentPanel from './EquipmentPanel';
import UnitTrainingPanel from './UnitTrainingPanel';
import VILLAGE_DEFS from '../data/villageDefs';
import merkezImg from '../assets/merkez2.png';
import { EMBLEM_DY, EMBLEM_SIZE, TEXTURE_EMBLEM, BUILDING_TEXTURE, BUILDING_VIDEO } from './buildingArt';
import { popoverStyle, computePopoverPos } from './popoverStyle';
import { C, FONT, RES_COLOR, btn, label as lbl, num, signed } from '../theme';
import { RES_LABEL } from '../flows';
import Icon, { buildingIcon } from './Icons';

const EQUIPMENT_BUILDINGS = new Set(['silahci', 'zirh', 'ahir']);
const TRAINING_BUILDINGS  = new Set(['kisla', 'ahir', 'atolye']);

const SQRT3 = Math.sqrt(3);
const S = 56;

const RING1 = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
const RING2 = [[2,0],[2,-1],[2,-2],[1,-2],[0,-2],[-1,-1],[-2,0],[-2,1],[-2,2],[-1,2],[0,2],[1,1]];
const RING3 = [
  [3,0],[3,-1],[3,-2],[3,-3],[2,-3],[1,-3],[0,-3],
  [-1,-2],[-2,-1],[-3,0],[-3,1],[-3,2],[-3,3],
  [-2,3],[-1,3],[0,3],[1,2],[2,1],
];

const ALL_SLOTS = [
  { q: 0, r: 0, ring: 0 },
  ...RING1.map(([q, r]) => ({ q, r, ring: 1 })),
  ...RING2.map(([q, r]) => ({ q, r, ring: 2 })),
  ...RING3.map(([q, r]) => ({ q, r, ring: 3 })),
];

// Kategori zeminleri — canlı, birbirinden ayırt edilebilir tonlar
const CAT_FILL = {
  isleme:   '#2f5a34',
  askeri:   '#2b4272',
  depo:     '#453a5e',
  ekonomik: '#5c5320',
  savunma:  '#5c2a30',
  nufus:    '#1f5a5a',
  anaBina:  '#5a4820',
  merkez:   '#5a4820',
};

const CAT_EDGE = {
  isleme:   '#7ae07a',
  askeri:   '#8fbcff',
  depo:     '#c0a8f8',
  ekonomik: '#f0d868',
  savunma:  '#ff8080',
  nufus:    '#68e8e0',
  anaBina:  '#f0c860',
  merkez:   '#f0c860',
};



/**
 * Hex'te hangi simge görünüyorsa tooltip ve panel de ONU kullanır.
 * Amblemi olan binada amblem, olmayanda çizgi ikonu — üç yerde tek kaynak.
 */
function hexEmblem(type) {
  const em = TEXTURE_EMBLEM[type];
  if (em) return { icon: em.icon, rot: em.rot || 0, size: em.size || EMBLEM_SIZE };
  return { icon: buildingIcon(type), rot: 0, size: EMBLEM_SIZE };
}


function hexToScreen(q, r, cx, cy) {
  return { x: cx + S * (1.5 * q), y: cy + S * ((SQRT3 / 2) * q + SQRT3 * r) };
}

function hexPoints(cx, cy, s = S) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return `${(cx + (s - 2) * Math.cos(a)).toFixed(1)},${(cy + (s - 2) * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

// ── Hover bilgi kartı ────────────────────────────────────────────────
function VCHover({ slotKey, building, isTower, isCenter, ring, flows, processingRates, railInset = 0 }) {
  const def = building ? VILLAGE_DEFS[building.type] : null;
  const cat = isCenter ? 'merkez' : (building?.type === 'anaBina' ? 'anaBina' : def?.category || '');
  const edge = CAT_EDGE[cat] || C.lineBright;

  const title = isCenter ? 'Ana Bina'
    : building ? (def?.name || building.type)
    : isTower ? 'Kule Slotu' : 'Boş Arazi';

  const proc = def?.processes;
  const rate = proc ? processingRates?.[proc.output] : null;
  const maxW = building && def ? building.level * (def.workersPerLevel || 3) : 0;

  const Row = ({ k, v, c = C.frost, strong }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '2.5px 0' }}>
      <span style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim }}>{k}</span>
      <span style={num({ fontSize: 11, color: c, fontWeight: strong ? 500 : 400, textAlign: 'right' })}>{v}</span>
    </div>
  );

  // Hex'te kullanılan bina görseli ve AYNI amblem kartta da görünsün
  const tex = isCenter ? merkezImg : (building ? BUILDING_TEXTURE[building.type] : null);
  const hoverEm = building
    ? hexEmblem(building.type)
    : { icon: isTower ? 'kule' : 'ekle', rot: 0, size: EMBLEM_SIZE };

  return (
    <div style={{
      position: 'absolute', top: 10, right: (railInset || 0) + 10, width: 252, zIndex: 40,
      background: 'linear-gradient(180deg, rgba(12,25,40,0.78), rgba(8,17,28,0.78))',
      border: `1px solid ${edge}55`, borderRadius: 8, padding: 11,
      boxShadow: `0 10px 34px rgba(0,0,0,.5), 0 0 14px ${edge}22`,
      backdropFilter: 'blur(20px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.2)', pointerEvents: 'none',
    }} className="tn-rise">
      {/* Bina görseli — KARE kutu, kartın tam genişliği: kare kaynak hiç
          kırpılmaz. Dikdörtgen pencerede `cover` hep bir yerden kesiyordu. */}
      {tex && (
        <div style={{
          position: 'relative', width: 252, height: 252, overflow: 'hidden',
          margin: '-11px -11px 9px', borderRadius: '8px 8px 0 0',
        }}>
          <img src={tex} alt="" draggable={false} style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          }} />
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(180deg, rgba(6,12,20,0) 62%, rgba(8,17,28,0.92) 100%)',
          }} />
          <div style={{
            position: 'absolute', top: 8, right: 9,
            display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 14,
            background: 'rgba(8,14,24,0.66)', border: `1px solid ${edge}66`,
            transform: hoverEm.rot ? `rotate(${hoverEm.rot}deg)` : undefined,
          }}>
            <Icon name={hoverEm.icon} size={hoverEm.size} color={edge} strokeWidth={1.5} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon name={hoverEm.icon} size={19} color={edge}
          style={hoverEm.rot ? { transform: `rotate(${hoverEm.rot}deg)` } : undefined} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT.head, fontSize: 14, fontWeight: 600, letterSpacing: 0.8, color: C.frost }}>
            {title}
          </div>
          <div style={lbl({ fontSize: 8 })}>{slotKey} · ring {ring}{def?.category ? ` · ${def.category}` : ''}</div>
        </div>
        {building && !building.building && (
          <span style={num({ fontSize: 11, color: C.iceSoft })}>Lvl {building.level}</span>
        )}
      </div>

      {building?.building ? (
        <>
          <Row k={building.level === 0 ? 'İnşa ediliyor' : `Lvl ${building.level} → ${building.level + 1}`}
            v={`${building.buildTimeLeft ?? '—'}sn`} c={C.ice} strong />
          {building.level >= 1 && (
            <div style={{ marginTop: 5, fontFamily: FONT.ui, fontSize: 9, color: C.good, lineHeight: 1.45 }}>
              Bina çalışmaya devam ediyor — üretim ve kapasite düşmüyor.
            </div>
          )}
        </>
      ) : building ? (
        <>
          {def?.description && (
            <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, lineHeight: 1.5, marginBottom: 7 }}>
              {def.description}
            </div>
          )}
          {maxW > 0 && (
            <Row k="İşçi" v={`${building.workers || 0} / ${maxW}`}
              c={(building.workers || 0) === 0 ? C.danger : C.frost} strong />
          )}

          {proc && (
            <>
              <div style={{ height: 1, background: C.lineSoft, margin: '6px 0 4px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <Icon name={proc.input} size={13} color={RES_COLOR[proc.input]} />
                <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textDim }}>
                  {RES_LABEL[proc.input]}
                </span>
                <Icon name="artis" size={10} color={C.textMute}
                  style={{ transform: 'rotate(90deg)' }} />
                <Icon name={proc.output} size={13} color={RES_COLOR[proc.output]} />
                <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textDim }}>
                  {RES_LABEL[proc.output]}
                </span>
              </div>
              <Row k="Girdi tüketimi"
                v={rate?.inputPerHour > 0 ? `−${rate.inputPerHour}/sa` : '—'}
                c={rate?.inputPerHour > 0 ? C.warn : C.textMute} />
              <Row k="Çıktı üretimi"
                v={rate?.outputPerHour > 0 ? `+${rate.outputPerHour}/sa` : '—'}
                c={rate?.outputPerHour > 0 ? C.good : C.textMute} />
              {flows?.[proc.input] && (
                <Row k={`${RES_LABEL[proc.input]} net`} v={`${signed(flows[proc.input].net)}/sa`}
                  c={flows[proc.input].net >= 0 ? C.good : C.danger} />
              )}
              {flows?.[proc.output] && (
                <Row k={`${RES_LABEL[proc.output]} stok`}
                  v={flows[proc.output].capacity > 0
                    ? `${Math.floor(flows[proc.output].value)} / ${flows[proc.output].capacity}`
                    : Math.floor(flows[proc.output].value)}
                  c={flows[proc.output].etaKind === 'full' ? C.warn : C.frost} />
              )}
            </>
          )}

          {def?.baseCapacity && (
            <Row k="Kapasite"
              v={(def.baseCapacity + (building.level - 1) * def.capacityPerLevel).toLocaleString('tr-TR')}
              c={C.iceSoft} />
          )}
          {def?.populationPerLevel && (
            <Row k="Nüfus katkısı" v={`+${building.level * def.populationPerLevel}`} c={C.iceSoft} />
          )}
          {def?.bonusTable && (
            <Row k="Savunma bonusu" v={`%${def.bonusTable[building.level] ?? 0}`} c={C.iceSoft} />
          )}
          {building.type === 'ahir' && (
            <Row k="At kapasitesi" v={building.level * (def?.horseCapPerLevel || 5)} c={C.iceSoft} />
          )}
          {building.type === 'cephane' && (
            <Row k="Ortak ekipman havuzu" v={building.level * (def?.poolCapPerLevel || 200)} c={C.iceSoft} />
          )}
        </>
      ) : (
        <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, lineHeight: 1.5 }}>
          {isTower
            ? 'Bu slota yalnızca Kule inşa edilebilir (en fazla 4 kule).'
            : 'İnşa menüsünü açmak için tıkla.'}
        </div>
      )}
    </div>
  );
}

// ── Ana bileşen ──────────────────────────────────────────────────────
export default function VillageCenter({
  villageBuildings = {}, towerSlots = [], freeWorkers = 0, resources = {},
  processingRates = {}, flows = {}, railInset = 0,
  equipment = {}, equipmentCaps = {}, equipmentPool = { capacity: 0, used: 0, free: 0 },
  equipmentQueues = {}, equipmentByBuilding = {}, equipmentDefs = {},
  unitQueues = {}, unitsByBuilding = {}, unitDefs = {},
  onBuild, onUpgrade, onDemolish, onAssignVillageWorkers, onCancelBuild,
  onQueueEquipment, onCancelEquipment, onTrainUnit, onCancelUnitOrder,
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

  const VC_SCALE = 1.2;
  const selB = selected ? villageBuildings[selected] : null;
  // Yükseltme sırasında da bina çalıştığı için kuyruk paneli açık kalır
  const hasQueuePanel = !!selB && selB.level >= 1
    && (EQUIPMENT_BUILDINGS.has(selB.type) || TRAINING_BUILDINGS.has(selB.type));

  // Eğitim binalarında birim kartları görselli ve 4 sütun — pencere daha geniş olmalı
  const isTraining = !!selB && selB.level >= 1 && TRAINING_BUILDINGS.has(selB.type)
    && (unitsByBuilding[selB.type] || []).length > 0;

  /**
   * POSTER BİÇİMİ: dar pencere (430) + üstte büyük bina görseli + tek sütun.
   * Geniş pencerede kare görsel ya kırpılıyor ya da yanlarda boş bant
   * bırakıyordu; dar pencerede görsel neredeyse tam sığıyor.
   * İSTİSNA — eğitim binaları: birim kartları 4 sütun olarak isteniyor,
   * 430'a sığmaz. Onlar geniş kalır, görsel de o pencerede daha çok kırpılır.
   */
  const POSTER_W = 860;   // 430 -> 860: birim kartlari ve govde daha genis gorunsun
  const POSTER_H = 800;
  // HER bina paneli aynı boyutta açılır; içerik değişse de kutu oynamaz
  // Ekran darsa panel tasmasin: en az 430, en cok POSTER_W
  const panelW = Math.min(POSTER_W, Math.max(430, (viewSize.w || POSTER_W) - 24));
  // Panel ekrandan tasmasin: dikey kaydirma ihtiyaci kalmasin
  const prefH = Math.min(POSTER_H, Math.max(420, (viewSize.h || POSTER_H) - 20));

  const popoverPos = useMemo(() => {
    if (!selected || !showMenu) return null;
    const [sq, sr] = selected.split(',').map(Number);
    const { x: hx, y: hy } = hexToScreen(sq, sr, cx, cy);
    return computePopoverPos({
      hexScreenX: viewSize.w / 2 + (hx - cx) * VC_SCALE,
      hexScreenY: viewSize.h / 2 + (hy - cy) * VC_SCALE * 0.95,
      hexRadius: S * VC_SCALE,
      viewW: viewSize.w, viewH: viewSize.h,
      panelW, prefH,
      insetLeft: railInset, insetRight: railInset,
      center: true,      // panel hep ekranın ortasında açılsın
    });
  }, [selected, showMenu, viewSize.w, viewSize.h, cx, cy, panelW, prefH, railInset]);

  function handleSlotClick(slotKey) {
    if (selected === slotKey) { setSelected(null); setShowMenu(false); }
    else { setSelected(slotKey); setShowMenu(true); }
  }

  const selectedBuilding = selected ? villageBuildings[selected] : null;
  const hoveredSlot = hovered ? ALL_SLOTS.find(s => `${s.q},${s.r}` === hovered) : null;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div ref={containerRef} style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', zIndex: 2,
        perspective: '1400px', perspectiveOrigin: '50% 30%',
      }}>
        <svg width={W} height={H} style={{
          cursor: 'pointer', flexShrink: 0,
          transform: 'rotateX(20deg) scale(1.2)',
          transformStyle: 'preserve-3d', transformOrigin: 'center center',
        }}>
          <defs>
            <radialGradient id="vc-ground" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#3a5230" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#1c2a18" stopOpacity="0.5" />
            </radialGradient>
          </defs>

          {/* Avlu zemini */}
          <circle cx={cx} cy={cy} r={S * 3.9} fill="url(#vc-ground)" />

          {/* Sur halkası — taş */}
          <circle cx={cx} cy={cy} r={S * 3.45} fill="none" stroke="#3a3630" strokeWidth={16} />
          <circle cx={cx} cy={cy} r={S * 3.45} fill="none" stroke="#7a7264" strokeWidth={7} />
          <circle cx={cx} cy={cy} r={S * 3.45} fill="none" stroke="rgba(220,232,240,0.28)" strokeWidth={1.6} />
          {/* Mazgallar */}
          {Array.from({ length: 40 }, (_, i) => {
            const a = (Math.PI * 2 * i) / 40;
            const r1 = S * 3.45 - 9, r2 = S * 3.45 + 9;
            return (
              <line key={i}
                x1={cx + r1 * Math.cos(a)} y1={cy + r1 * Math.sin(a)}
                x2={cx + r2 * Math.cos(a)} y2={cy + r2 * Math.sin(a)}
                stroke="#241f19" strokeWidth="3" opacity="0.6" />
            );
          })}

          {ALL_SLOTS.map(({ q, r, ring }) => {
            const key = `${q},${r}`;
            const { x, y } = hexToScreen(q, r, cx, cy);
            const building = villageBuildings[key];
            const isTower = towerSet.has(key);
            const isCenter = key === '0,0';
            const isSelected = selected === key;
            const isHovered = hovered === key;
            const isRing3 = ring === 3;

            const cat = isCenter ? 'merkez'
              : building ? (building.type === 'anaBina' ? 'anaBina' : VILLAGE_DEFS[building.type]?.category || '')
              : '';

            let fill = isRing3 ? '#26361f' : '#2f4a28';
            if (isCenter) fill = CAT_FILL.merkez;
            else if (isTower) fill = '#2a3a44';
            else if (building) fill = CAT_FILL[cat] || '#2f4a28';

            const edge = CAT_EDGE[cat] || C.lineBright;
            const stroke = isSelected || isHovered ? edge
              : isTower ? 'rgba(143,188,255,0.6)'
              : isCenter ? '#f0c860'
              : building ? `${edge}88`
              : isRing3 ? 'rgba(150,180,120,0.25)'
              : 'rgba(150,190,120,0.4)';
            const sw = isSelected ? 3.2 : isHovered ? 3 : isCenter ? 2.4 : 1.4;

            const tex = isCenter ? merkezImg : (building ? BUILDING_TEXTURE[building.type] : null);
            const hasTex = !!tex;
            const clipId = `vc-${q}-${r}`;
            const idle = building && building.level >= 1
              && (VILLAGE_DEFS[building.type]?.processes || ['silahci','zirh','ahir','kisla','atolye'].includes(building.type))
              && !(building.workers > 0);

            return (
              <g key={key}
                onClick={() => handleSlotClick(key)}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(prev => (prev === key ? null : prev))}
                transform={isHovered ? `translate(${x} ${y}) scale(1.06) translate(${-x} ${-y})` : undefined}
                style={{
                  cursor: 'pointer',
                  transition: 'transform .18s ease-out, filter .18s ease-out',
                  filter: isHovered ? `brightness(1.14) drop-shadow(0 0 8px ${edge}55)` : undefined,
                }}>

                {hasTex && (
                  <defs><clipPath id={clipId}><polygon points={hexPoints(x, y)} /></clipPath></defs>
                )}

                <polygon points={hexPoints(x, y)} fill={fill} stroke="none" opacity={0.94} />

                {hasTex && (
                  <image href={tex} x={x - S} y={y - S} width={S * 2} height={S * 2}
                    clipPath={`url(#${clipId})`}
                    opacity={building?.building ? 0.45 : 1}
                    preserveAspectRatio="xMidYMid slice" />
                )}

                <polygon points={hexPoints(x, y)} fill="none" stroke={stroke} strokeWidth={sw} />

                {/* Texture'lı binalarda tepe amblemi */}
                {building && hasTex && TEXTURE_EMBLEM[building.type] && (() => {
                  const em = TEXTURE_EMBLEM[building.type];
                  const es = em.size || EMBLEM_SIZE;
                  const ey = y - EMBLEM_DY;
                  return (
                    <g opacity={building.building ? 0.4 : 1}>
                      <circle cx={x} cy={ey} r={es / 2 + 4} fill="rgba(8,14,24,0.62)" stroke={`${edge}66`} strokeWidth={1} />
                      <g transform={`translate(${x} ${ey}) rotate(${em.rot}) translate(${-es / 2} ${-es / 2})`}>
                        <Icon name={em.icon} size={es} color={edge} strokeWidth={1.5} />
                      </g>
                    </g>
                  );
                })()}

                {/* Bina ikonu (texture'lı olanlar hariç) */}
                {building && !hasTex && (
                  <g transform={`translate(${x - 13} ${y - 20})`}
                    opacity={building.building ? 0.4 : 1}>
                    <Icon name={buildingIcon(building.type)} size={26} color={edge} strokeWidth={1.4} />
                  </g>
                )}

                {/* İnşaat göstergesi */}
                {building?.building && (
                  <g transform={`translate(${x + 13} ${y - 30})`} className="tn-pulse">
                    <Icon name="insaat" size={15} color={C.ice} />
                  </g>
                )}

                {/* İşçisiz uyarısı */}
                {idle && (
                  <g transform={`translate(${x + 14} ${y - 30})`}>
                    <Icon name="uyari" size={14} color={C.warn} />
                  </g>
                )}

                {/* İşçi sayacı */}
                {building && building.level >= 1 && (() => {
                  const d = VILLAGE_DEFS[building.type];
                  const maxW = d ? building.level * (d.workersPerLevel || 3) : 0;
                  const assignable = d?.processes || ['silahci','zirh','ahir','kisla','atolye'].includes(building.type);
                  if (!assignable || maxW <= 0) return null;
                  return (
                    <g transform={`translate(${x - 16} ${y + 4})`}>
                      <rect x="0" y="0" width="32" height="14" rx="3"
                        fill={idle ? 'rgba(58,20,26,0.9)' : 'rgba(8,20,32,0.88)'}
                        stroke={idle ? C.dangerDim : 'rgba(45,76,115,0.7)'} strokeWidth="0.8" />
                      <text x="16" y="7.5" textAnchor="middle" dominantBaseline="middle"
                        fontFamily={FONT.num} fontSize="9" fontWeight="500"
                        fill={idle ? '#f0b8bd' : C.iceSoft} style={{ userSelect: 'none' }}>
                        {building.workers || 0}/{maxW}
                      </text>
                    </g>
                  );
                })()}

                {/* Seviye / süre */}
                {building && (
                  <text x={x} y={y + S - 12} textAnchor="middle" dominantBaseline="middle"
                    fontFamily={FONT.head} fontSize={11} fontWeight="700"
                    fill={building.building ? C.ice : C.frost}
                    stroke="#04121e" strokeWidth={2.6} paintOrder="stroke"
                    style={{ userSelect: 'none' }}>
                    {building.building ? `${building.buildTimeLeft}sn` : `LVL ${building.level}`}
                  </text>
                )}

                {/* Boş slot işareti */}
                {!building && !isCenter && (
                  isTower ? (
                    <g transform={`translate(${x - 11} ${y - 11})`} opacity="0.5">
                      <Icon name="kule" size={22} color="#7fb4ff" strokeWidth={1.3} />
                    </g>
                  ) : (
                    <path d={`M ${x - 8} ${y} H ${x + 8} M ${x} ${y - 8} V ${y + 8}`}
                      stroke={isRing3 ? 'rgba(127,212,255,0.2)' : 'rgba(127,212,255,0.35)'}
                      strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  )
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover bilgi kartı */}
        {hovered && !showMenu && hoveredSlot && (
          <VCHover slotKey={hovered} building={villageBuildings[hovered]}
            isTower={towerSet.has(hovered)} isCenter={hovered === '0,0'}
            ring={hoveredSlot.ring} flows={flows} processingRates={processingRates}
            railInset={railInset} />
        )}

        {/* İnşa / yönetim paneli */}
        {showMenu && selected && popoverPos && (() => {
          /**
           * Bina görseli panelin ARKA PLANI olur, yazılar yarı saydam bir cam
           * zeminde durur (asker kartlarındaki düzenin aynısı). Görsel
           * kutunun kendisine boyandığı için içerik kaydırılırken sabit kalır.
           */
          const panelTex = selected === '0,0'
            ? merkezImg
            : (selectedBuilding ? BUILDING_TEXTURE[selectedBuilding.type] : null);
          const panelEm = selectedBuilding ? TEXTURE_EMBLEM[selectedBuilding.type] : null;
          const panelTitle = selected === '0,0' ? 'Ana Bina'
            : selectedBuilding
              ? (VILLAGE_DEFS[selectedBuilding.type]?.name || selectedBuilding.type)
              : (towerSet.has(selected) ? 'Kule Slotu' : 'Boş Arazi');
          const panelEdge = CAT_EDGE[
            selected === '0,0' ? 'merkez'
              : selectedBuilding?.type === 'anaBina' ? 'anaBina'
              : (selectedBuilding ? VILLAGE_DEFS[selectedBuilding.type]?.category : '')
          ] || C.lineBright;

          // Bu binanin panel arka planinda oynayacak videosu (varsa)
          const panelVid = selectedBuilding ? BUILDING_VIDEO[selectedBuilding.type] : null;

          // Govde sirasi: savascilar gorselin hemen altinda, digerleri altta
          const hasEquipment = !!selectedBuilding && selectedBuilding.level >= 1
            && EQUIPMENT_BUILDINGS.has(selectedBuilding.type);
          const hasTraining = !!selectedBuilding && selectedBuilding.level >= 1
            && TRAINING_BUILDINGS.has(selectedBuilding.type)
            && (unitsByBuilding[selectedBuilding.type] || []).length > 0;

          /**
           * ARKA PLAN: görsel panelin tamamına yayılır ama KOYU bir gradyanla
           * bastırılır — yazı katmanı saydam olduğu için altındaki görselin
           * kontrastı düşük kalmalı.
           */
          const bgStyle = panelTex ? {
            padding: 0,
            backgroundColor: '#0b1420',
            // Gövdenin arkasında görselin çok soluk bir kopyası — poster
            // hissi sürsün ama yazıların kontrastı düşmesin
            backgroundImage:
              'linear-gradient(180deg, rgba(6,12,20,0.86) 0%, rgba(6,12,20,0.93) 100%), '
              + `url(${panelTex})`,
            backgroundSize: '100% 100%, cover',
            backgroundPosition: 'top center, center',
            backgroundRepeat: 'no-repeat, no-repeat',
          } : {};

          const glass = panelTex ? {
            // Daha saydam: bina görseli yazıların ardından okunsun
            background: 'rgba(8,15,24,0.40)',
            backdropFilter: 'blur(11px) saturate(1.1)',
            WebkitBackdropFilter: 'blur(11px) saturate(1.1)',
            borderTop: '1px solid rgba(255,255,255,0.09)',
          } : {};

          return (
          <div style={popoverStyle(popoverPos, { overflowY: 'auto', ...bgStyle })}
            className="tn-rise tn-scroll">
            {/* Görsel penceresi — panelin tepesinde bina net görünür */}
            {panelTex && (
              /**
               * POSTER BAŞLIĞI — pencere KARE (aspect-ratio 1/1), görseller de
               * kare olduğu için HİÇ KIRPILMAZ. Dikdörtgen pencerede `cover`
               * her seferinde bir yerden kesiyordu (önce çatı, sonra taban).
               * Bina adı ve düğmeler görselin üstüne biner.
               */
              <div style={{
                position: 'relative', width: '100%',
                // video varsa 16:9 pencere + contain => HIC kirpilmaz; jpg'de genis banner
                aspectRatio: panelVid ? '16 / 9' : '18 / 5',
                backgroundColor: '#0b1420',
                flexShrink: 0, overflow: 'hidden',
              }}>
                {panelVid ? (
                  <video src={panelVid} poster={panelTex} autoPlay muted loop playsInline
                    style={{
                      width: '100%', height: '100%', objectFit: 'contain', display: 'block',
                      backgroundColor: '#0b1420',
                    }} />
                ) : (
                  <img src={panelTex} alt="" draggable={false} style={{
                    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                  }} />
                )}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'linear-gradient(180deg, rgba(6,12,20,0) 40%,'
                    + ' rgba(6,12,20,0.62) 74%, rgba(8,15,24,0.94) 100%)',
                }} />

                {/* Sağ üst: amblem + yık + kapat */}
                <div style={{
                  position: 'absolute', top: 9, right: 10, zIndex: 2,
                  display: 'flex', alignItems: 'center', gap: 7,
                }}>
                  {panelEm && (
                    <div style={{
                      display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 15,
                      background: 'rgba(8,14,24,0.66)', border: `1px solid ${panelEdge}66`,
                      transform: panelEm.rot ? `rotate(${panelEm.rot}deg)` : undefined,
                    }}>
                      <Icon name={panelEm.icon} size={panelEm.size || 17} color={panelEdge} strokeWidth={1.5} />
                    </div>
                  )}
                  {selectedBuilding && selectedBuilding.type !== 'anaBina' && !selectedBuilding.building && (
                    <button onClick={() => { onDemolish(selected); setShowMenu(false); setSelected(null); }}
                      title="Yık" style={{
                        display: 'grid', placeItems: 'center', width: 30, height: 30, padding: 0,
                        borderRadius: 15, cursor: 'pointer',
                        background: 'rgba(74,29,36,0.72)', border: `1px solid ${C.dangerDim}`,
                      }}>
                      <Icon name="yik" size={15} color="#f0b8bd" strokeWidth={2.3} />
                    </button>
                  )}
                  <button onClick={() => { setShowMenu(false); setSelected(null); }}
                    title="Kapat" style={{
                      display: 'grid', placeItems: 'center', width: 30, height: 30, padding: 0,
                      borderRadius: 15, cursor: 'pointer',
                      background: 'rgba(8,14,24,0.66)', border: `1px solid ${C.lineBright}`,
                    }}>
                    <Icon name="kapat" size={14} color={C.textDim} strokeWidth={2} />
                  </button>
                </div>

                {/* Sol alt: bina adı + seviye, görselin üstünde */}
                <div style={{ position: 'absolute', left: 13, right: 13, bottom: 9, zIndex: 2 }}>
                  <div style={{
                    fontFamily: FONT.head, fontSize: 25, fontWeight: 600, letterSpacing: 1.1,
                    color: C.frost, lineHeight: 1.1, textShadow: '0 2px 8px rgba(0,0,0,0.95)',
                  }}>{panelTitle}</div>
                  <div style={{
                    fontFamily: FONT.ui, fontSize: 9, letterSpacing: 1.5, marginTop: 2,
                    color: C.textDim, textTransform: 'uppercase',
                    textShadow: '0 1px 5px rgba(0,0,0,0.95)',
                  }}>
                    {selectedBuilding && !selectedBuilding.building
                      ? `LVL ${selectedBuilding.level} · ${selected}`
                      : `slot ${selected}`}
                  </div>
                </div>
              </div>
            )}

            <div style={{ ...glass, display: 'flex', flexDirection: 'column' }}>

            {/* SIRA: bina gorseli -> savascilar -> isci/yukseltme + ekipman */}
            {hasTraining && (
              <div style={{ padding: '0 12px 10px', order: 1 }}>
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

            <div style={{
              order: 2, display: 'grid',
              gridTemplateColumns: hasEquipment ? '1fr 1fr' : '1fr',
              alignItems: 'start',
            }}>
            <div style={{ minWidth: 0 }}>
            <BuildMenu
              posterHeader={!!panelTex}
              slotKey={selected}
              building={selectedBuilding}
              isTower={towerSet.has(selected)}
              isCenter={selected === '0,0'}
              placedBuildings={villageBuildings}
              freeWorkers={freeWorkers}
              resources={resources}
              processingRates={processingRates}
              flows={flows}
              onBuild={(type, workers) => { onBuild(selected, type, workers); setShowMenu(false); setSelected(null); }}
              onUpgrade={(workers) => { onUpgrade(selected, workers); setShowMenu(false); setSelected(null); }}
              onDemolish={() => { onDemolish(selected); setShowMenu(false); setSelected(null); }}
              onAssignVillageWorkers={(workers) => onAssignVillageWorkers(selected, workers)}
              onCancelBuild={() => { onCancelBuild?.(selected); setShowMenu(false); setSelected(null); }}
              onClose={() => { setShowMenu(false); setSelected(null); }}
            />
            </div>

            <div style={{ minWidth: 0 }}>
            {selectedBuilding && EQUIPMENT_BUILDINGS.has(selectedBuilding.type)
              && selectedBuilding.level >= 1 && (
              <div style={{ padding: '0 12px 12px' }}>
                <EquipmentPanel
                  buildingType={selectedBuilding.type}
                  equipmentByBuilding={equipmentByBuilding}
                  equipmentDefs={equipmentDefs}
                  equipment={equipment}
                  equipmentCaps={equipmentCaps}
                  equipmentPool={equipmentPool}
                  queue={equipmentQueues[selectedBuilding.type] || []}
                  resources={resources}
                  buildingWorkers={selectedBuilding.workers || 0}
                  onQueue={(type, qty) => onQueueEquipment(selectedBuilding.type, type, qty)}
                  onCancel={(orderId) => onCancelEquipment(selectedBuilding.type, orderId)}
                />
              </div>
            )}

            </div>
            </div>
            </div>{/* cam katman */}
          </div>
          );
        })()}

        {/* Sol alt — kategori anahtarı */}
        <div style={{
          position: 'absolute', bottom: 10, left: railInset + 10, zIndex: 30,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 11px', borderRadius: 7,
          background: 'rgba(9,18,30,0.55)', border: `1px solid ${C.lineSoft}`,
          backdropFilter: 'blur(12px) saturate(1.15)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.15)',
        }}>
          {[['isleme', 'İşleme'], ['askeri', 'Askeri'], ['depo', 'Depo'],
            ['nufus', 'Nüfus'], ['savunma', 'Savunma']].map(([k, t]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: CAT_EDGE[k] }} />
              <span style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint }}>{t}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
