import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import BUILDING_DEFS from '../data/buildingDefs';
import VILLAGE_DEFS from '../data/villageDefs';
import tahilImg   from '../assets/tahil_tile.png';
import ormanImg   from '../assets/orman_tile.png';
import demirImg   from '../assets/demir_madeni.png';
import kilImg     from '../assets/kil_ocagi.png';
import tasImg     from '../assets/tas_ocagi.png';
import bosImg     from '../assets/bos.png';
import merkezImg  from '../assets/merkez2.png';
import {
  MAP_SIZE, HEX_NEIGHBORS, generateMapCoords, hexToPixel, hexDistance,
  getTileBonus, getDistanceEfficiency, getTotalMultiplier
} from '../data/mapConfig';
import { popoverStyle, computePopoverPos, TEXT_STROKE as SHARED_TEXT_STROKE } from './popoverStyle';

const BASE_S = 42;
const BUILDABLE_TYPES = ['odun', 'kil', 'tas', 'demir', 'tahil'];

const RES_EMOJI = {
  odun: '🪵', kil: '🟫', tas: '🪨', demir: '⛏️', tahil: '🌾',
  kereste: '🪚', tugla: '🧱', yontmaTas: '🪨', demirKulce: '🔩',
  un: '🌾', ekmek: '🍞'
};

const TYPE_COLOR = {
  odun: '#3a5a1a', kil: '#7a4020', tas: '#5a5048',
  demir: '#3a4858', tahil: '#6a5818'
};

const zoomBtn = {
  width: 26, height: 22, padding: 0,
  background: '#3a2c18', color: '#e8d4a0',
  border: '1px solid #5a4828', cursor: 'pointer',
  fontSize: 12, fontFamily: 'Georgia'
};

const TEXT_STROKE = SHARED_TEXT_STROKE;

function hexPoints(cx, cy, s) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 3 * i;
    return `${(cx + (s - 2) * Math.cos(a)).toFixed(1)},${(cy + (s - 2) * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return Math.ceil(seconds) + 'sn';
  if (seconds < 3600) return Math.ceil(seconds / 60) + 'dk';
  return (seconds / 3600).toFixed(1) + 'sa';
}

function getNeighbors(slotKey) {
  const [q, r] = slotKey.split(',').map(Number);
  return HEX_NEIGHBORS.map(([dq, dr]) => `${q + dq},${r + dr}`);
}

function BonusBadge({ bonus }) {
  if (!bonus) return <span style={{ color: '#5a5040', fontSize: 10 }}>Bonus yok</span>;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '1px 5px', background: '#2a3818', border: '1px solid #5a7030',
      color: '#c8e878', borderRadius: 3, fontSize: 9, fontWeight: 'bold'
    }}>{RES_EMOJI[bonus.resource] || ''} +%{bonus.amount} {bonus.resource}</span>
  );
}

function AnaBinaPanel({ anaBina, resources, freeWorkers, onUpgrade, onClose, popoverPos }) {
  const [workers, setWorkers] = useState(1);
  const def = VILLAGE_DEFS.anaBina;
  const level = anaBina?.level || 1;
  const maxed = level >= (def.maxLevel || 11);
  const costMult = Math.pow(def.upgradeCostMultiplier, level - 1);
  const cost = {};
  Object.entries(def.upgradeCostBase).forEach(([k, v]) => { cost[k] = Math.ceil(v * costMult); });
  const canAfford = Object.entries(cost).every(([k, v]) => (resources[k] || 0) >= v);
  const baseWork = def.buildBaseWork * Math.pow(def.buildMultiplier, level - 1);
  const sureSn = workers > 0 ? Math.ceil(baseWork / workers) : Infinity;
  const slotCount = Math.min(16, 5 + level);
  const nextSlotCount = Math.min(16, 5 + level + 1);

  return (
    <div style={popoverStyle(popoverPos)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ color: '#c8a44a', fontSize: 14, letterSpacing: 2 }}>🏛️ ANA BİNA</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}>×</button>
      </div>
      <div style={{ color: '#e8d4a0', fontSize: 11, marginBottom: 10 }}>
        Seviye <span style={{ color: '#c8a44a' }}>{level}</span> — Üretim slotu: {slotCount}/16
      </div>
      <div style={{ color: '#9aaa98', fontSize: 10, marginBottom: 14, lineHeight: 1.4 }}>{def.description}</div>
      {maxed ? (
        <div style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: 14 }}>Maksimum seviye</div>
      ) : (
        <>
          <div style={{ color: '#c8a44a', fontSize: 11, marginBottom: 6 }}>Lvl {level + 1}'e yükselt — {nextSlotCount} slot</div>
          <div style={{ background: '#221c10', padding: 8, borderRadius: 3, marginBottom: 10 }}>
            {Object.entries(cost).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '2px 0' }}>
                <span style={{ color: '#7a8878' }}>{RES_EMOJI[k] || ''} {k}</span>
                <span style={{ color: (resources[k] || 0) >= v ? '#88c060' : '#c87050' }}>{v} / {Math.floor(resources[k] || 0)}</span>
              </div>
            ))}
          </div>
          <div style={{ color: '#c8a44a', fontSize: 10, marginBottom: 4 }}>İnşaat işçisi: {workers}</div>
          <input type="range" min="1" max={Math.max(1, freeWorkers)} value={workers}
            onChange={e => setWorkers(Number(e.target.value))}
            style={{ width: '100%', marginBottom: 6 }} disabled={freeWorkers < 1} />
          <div style={{ color: '#9aaa98', fontSize: 10, marginBottom: 12 }}>
            Süre: {formatTime(sureSn)} &nbsp;|&nbsp; Boş işçi: {freeWorkers}
          </div>
          <button onClick={() => onUpgrade(workers)} disabled={!canAfford || freeWorkers < 1}
            style={{
              width: '100%', padding: '8px', fontSize: 11, fontFamily: 'Georgia',
              background: (canAfford && freeWorkers >= 1) ? '#3a5a1a' : '#2a2010',
              color: (canAfford && freeWorkers >= 1) ? '#e8d4a0' : '#555',
              border: '1px solid #5a6a48', cursor: (canAfford && freeWorkers >= 1) ? 'pointer' : 'not-allowed',
              letterSpacing: 1
            }}>YÜKSELT</button>
        </>
      )}
    </div>
  );
}

function TileInfoBox({ q, r, tile }) {
  const ring = hexDistance(q, r);
  const distEff = getDistanceEfficiency(q, r);
  const distPct = Math.round(distEff * 100);
  const bonus = getTileBonus(q, r);
  const totalMult = tile ? getTotalMultiplier(q, r, tile.type) : distEff;
  const totalPct = Math.round(totalMult * 100);
  const bonusApplied = tile && bonus && bonus.resource === tile.type;
  return (
    <div style={{ background: '#221c10', padding: 8, borderRadius: 3, marginBottom: 10, fontSize: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9aaa98', marginBottom: 3 }}>
        <span>Ring {ring} mesafe verimi</span>
        <span style={{ color: distPct === 100 ? '#88c060' : distPct >= 80 ? '#c8a44a' : '#c88848' }}>%{distPct}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ color: '#7a8878' }}>Tile bonusu</span>
        <BonusBadge bonus={bonus} />
      </div>
      {tile && (
        <div style={{ display: 'flex', justifyContent: 'space-between', color: bonusApplied ? '#c8e878' : '#c8a44a',
          fontWeight: 'bold', borderTop: '1px solid #2a1808', paddingTop: 4, marginTop: 4 }}>
          <span>Toplam çarpan</span>
          <span>×{totalMult.toFixed(2)} (%{totalPct})</span>
        </div>
      )}
      {tile && bonus && !bonusApplied && (
        <div style={{ color: '#7a6848', fontSize: 9, marginTop: 3, fontStyle: 'italic' }}>
          Bu tile {bonus.resource} bonusu veriyor, ancak burada {tile.type} üretiliyor — bonus devre dışı.
        </div>
      )}
    </div>
  );
}

function ProductionTilePanel({ slotKey, tile, resources, freeWorkers, onUpgrade, onDemolish, onAssignWorkers, onClose, popoverPos }) {
  const def = BUILDING_DEFS[tile.type];
  const [workers, setWorkers] = useState(tile.workers || 0);
  const [buildWorkers, setBuildWorkers] = useState(1);
  const nextLevel = def?.levels?.[tile.level];
  const maxed = !nextLevel;
  const [q, r] = slotKey.split(',').map(Number);
  const totalMult = getTotalMultiplier(q, r, tile.type);
  const canAffordUpgrade = nextLevel ? Object.entries(nextLevel.cost).every(([k, v]) => (resources[k] || 0) >= v) : false;
  const sureSnReal = nextLevel && buildWorkers > 0 ? Math.ceil(nextLevel.sureSaat / buildWorkers) : Infinity;
  const maxOperWorkers = def?.levels?.[tile.level - 1]?.workers || tile.workers || 1;

  const totalPct = Math.round(totalMult * 100);

  return (
    <div style={popoverStyle(popoverPos)}>
      {/* Tek satır başlık */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#c8a44a', fontSize: 13, letterSpacing: 1 }}>{def?.icon} {def?.name?.toUpperCase()}</span>
          <span style={{ color: '#e8d4a0', fontSize: 10 }}>
            Seviye {tile.level} <span style={{ color: '#c8a44a' }}>(%{totalPct})</span>
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
      </div>

      {tile.upgrading && (
        <div style={{ padding: '6px 8px', marginBottom: 10, fontSize: 10, color: '#c87020', borderLeft: '2px solid #c87020' }}>
          ⚙️ Yükseltiliyor… {formatTime(Math.max(0, (tile.upgradeEndTime - Date.now()) / 1000))}
        </div>
      )}

      {!tile.upgrading && (
        <>
          <div style={{ color: '#c8a44a', fontSize: 10, marginBottom: 4 }}>Çalışan işçi: {workers} / {maxOperWorkers}</div>
          <input type="range" min="0" max={Math.min(maxOperWorkers, (tile.workers || 0) + freeWorkers)}
            value={workers} onChange={e => setWorkers(Number(e.target.value))}
            style={{ width: '100%', marginBottom: 4 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9aaa98', marginBottom: 8 }}>
            <span>Üretim: {(workers * (def?.baseProductionPerWorker || 0) * totalMult).toFixed(1)}/sa <span style={{ color: '#5a5040' }}>(×{totalMult.toFixed(2)})</span></span>
            <span>Boş: {freeWorkers}</span>
          </div>
          <button onClick={() => onAssignWorkers(workers)} disabled={workers === tile.workers}
            style={{
              width: '100%', padding: '6px', fontSize: 10, fontFamily: 'Georgia',
              background: '#2a3a6a', color: '#e8d4a0', border: '1px solid #3a4a7a',
              cursor: workers !== tile.workers ? 'pointer' : 'not-allowed', opacity: workers !== tile.workers ? 1 : 0.5,
              marginBottom: 12
            }}>İŞÇİ ATA</button>
        </>
      )}

      {!tile.upgrading && !maxed && (
        <>
          <div style={{ color: '#c8a44a', fontSize: 10, marginBottom: 6 }}>Lvl {tile.level + 1}'e yükselt ({nextLevel.workers} işçi kap.)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', marginBottom: 8 }}>
            {Object.entries(nextLevel.cost).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ color: '#7a8878' }}>{RES_EMOJI[k] || ''} {k}</span>
                <span style={{ color: (resources[k] || 0) >= v ? '#88c060' : '#c87050' }}>{v} / {Math.floor(resources[k] || 0)}</span>
              </div>
            ))}
          </div>
          <div style={{ color: '#c8a44a', fontSize: 10, marginBottom: 4 }}>İnşaat işçisi: {buildWorkers}</div>
          <input type="range" min="1" max={Math.max(1, freeWorkers)} value={buildWorkers}
            onChange={e => setBuildWorkers(Number(e.target.value))}
            style={{ width: '100%', marginBottom: 4 }} disabled={freeWorkers < 1} />
          <div style={{ fontSize: 10, color: '#9aaa98', marginBottom: 8 }}>Süre: {formatTime(sureSnReal)}</div>
          <button onClick={() => onUpgrade(buildWorkers)} disabled={!canAffordUpgrade || freeWorkers < 1}
            style={{
              width: '100%', padding: '6px', fontSize: 10, fontFamily: 'Georgia',
              background: (canAffordUpgrade && freeWorkers >= 1) ? '#3a5a1a' : '#2a2010',
              color: (canAffordUpgrade && freeWorkers >= 1) ? '#e8d4a0' : '#555',
              border: '1px solid #5a6a48', cursor: (canAffordUpgrade && freeWorkers >= 1) ? 'pointer' : 'not-allowed',
              marginBottom: 10
            }}>YÜKSELT</button>
        </>
      )}

      <button onClick={() => { if (window.confirm('Bu üretim alanını yıkmak istediğinize emin misiniz?')) onDemolish(); }}
        style={{
          width: '100%', padding: '6px', fontSize: 10, fontFamily: 'Georgia',
          background: '#5a2010', color: '#e8d4a0', border: '1px solid #7a3020', cursor: 'pointer'
        }}>YIK</button>
    </div>
  );
}

function BuildProductionPanel({ slotKey, freeWorkers, resources, onBuild, onClose, popoverPos }) {
  const [q, r] = slotKey.split(',').map(Number);
  const bonus = getTileBonus(q, r);
  const [selectedType, setSelectedType] = useState(bonus ? bonus.resource : null);
  const [workers, setWorkers] = useState(1);
  const def = selectedType ? BUILDING_DEFS[selectedType] : null;
  const lvl1 = def?.levels?.[0];
  const canAfford = lvl1 ? Object.entries(lvl1.cost).every(([k, v]) => (resources[k] || 0) >= v) : false;
  const sureSn = lvl1 && workers > 0 ? Math.ceil(lvl1.sureSaat / workers) : Infinity;

  return (
    <div style={popoverStyle(popoverPos)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ color: '#c8a44a', fontSize: 13, letterSpacing: 1 }}>
          YENİ ÜRETİM
          {bonus && <span style={{ color: '#c8e878', marginLeft: 6, fontSize: 10 }}>{RES_EMOJI[bonus.resource]} +%{bonus.amount}</span>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 10 }}>
        {BUILDABLE_TYPES.map(t => {
          const d = BUILDING_DEFS[t];
          const active = selectedType === t;
          const isBonusMatch = bonus && bonus.resource === t;
          return (
            <button key={t} onClick={() => setSelectedType(t)}
              style={{
                padding: '5px 4px', fontSize: 10, fontFamily: 'Georgia',
                background: active ? '#3a5a1a' : '#0d0904',
                color: active ? '#e8d4a0' : '#7a8878',
                border: `1px solid ${active ? '#88c060' : isBonusMatch ? '#5a7030' : '#2a1808'}`,
                cursor: 'pointer', textAlign: 'left'
              }}>
              {d.icon} {d.name}{isBonusMatch && <span style={{ color: '#c8e878', marginLeft: 3 }}>+%{bonus.amount}</span>}
            </button>
          );
        })}
      </div>

      {selectedType && lvl1 && (
        <>
          <div style={{ color: '#c8a44a', fontSize: 10, marginBottom: 6 }}>Lvl 1 maliyeti ({lvl1.workers} işçi kap.)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', marginBottom: 8 }}>
            {Object.entries(lvl1.cost).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ color: '#7a8878' }}>{RES_EMOJI[k] || ''} {k}</span>
                <span style={{ color: (resources[k] || 0) >= v ? '#88c060' : '#c87050' }}>{v} / {Math.floor(resources[k] || 0)}</span>
              </div>
            ))}
          </div>
          <div style={{ color: '#c8a44a', fontSize: 10, marginBottom: 4 }}>İnşaat işçisi: {workers}</div>
          <input type="range" min="1" max={Math.max(1, freeWorkers)} value={workers}
            onChange={e => setWorkers(Number(e.target.value))}
            style={{ width: '100%', marginBottom: 4 }} disabled={freeWorkers < 1} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9aaa98', marginBottom: 8 }}>
            <span>Süre: {formatTime(sureSn)}</span>
            <span>Boş: {freeWorkers}</span>
          </div>
          <button onClick={() => onBuild(selectedType, workers)} disabled={!canAfford || freeWorkers < 1}
            style={{
              width: '100%', padding: '7px', fontSize: 11, fontFamily: 'Georgia',
              background: (canAfford && freeWorkers >= 1) ? '#3a5a1a' : '#2a2010',
              color: (canAfford && freeWorkers >= 1) ? '#e8d4a0' : '#555',
              border: '1px solid #5a6a48',
              cursor: (canAfford && freeWorkers >= 1) ? 'pointer' : 'not-allowed',
              letterSpacing: 1
            }}>İNŞA ET</button>
        </>
      )}
    </div>
  );
}

function EmptySlotPanel({ slotKey, slotsFull, onClose, popoverPos }) {
  const [q, r] = slotKey.split(',').map(Number);
  return (
    <div style={popoverStyle(popoverPos)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ color: '#c8a44a', fontSize: 14, letterSpacing: 2 }}>KEŞİF ALANI</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}>×</button>
      </div>
      <div style={{ color: '#9aaa98', fontSize: 10, marginBottom: 8 }}>Slot: {slotKey}</div>
      <TileInfoBox q={q} r={r} tile={null} />
      <div style={{ color: '#c87050', fontSize: 11, lineHeight: 1.5 }}>
        {slotsFull
          ? 'Slot limiti dolu. Ana Bina\'yı yükselterek yeni slot aç.'
          : 'Bu slota inşa etmek için en az bir komşusunda üretim alanı veya Ana Bina olmalı. Önce komşu tile\'ları inşa ederek buraya doğru genişle.'}
      </div>
    </div>
  );
}

function HexTile({ q, r, tile, isCenter, isSelected, isHovered, buildable, disconnected, anaBinaLevel,
  showLabels, onClick, onMouseEnter, onMouseLeave }) {
  const { x, y } = hexToPixel(q, r, BASE_S);
  const bonus = getTileBonus(q, r);
  const bdef = tile ? BUILDING_DEFS[tile.type] : null;
  const bonusApplied = tile && bonus && bonus.resource === tile.type;

  let fill;
  if (isCenter) fill = '#3a3010';
  else if (tile) fill = TYPE_COLOR[tile.type] || '#2a4a1a';
  else if (buildable) fill = '#1a2810';
  else if (disconnected) fill = bonus ? '#1c2016' : '#15180e';
  else fill = '#181408';

  const stroke = isSelected ? '#f0c820' : isHovered ? '#ffe030'
    : isCenter ? '#c8a040' : tile ? '#4a5a38'
    : buildable ? '#3a5028' : bonus ? '#3a4028' : '#2a2010';
  const strokeWidth = isSelected ? 3.5 : isHovered ? 3.5 : isCenter ? 2.5 : bonus && !tile ? 2 : 1.5;
  const opacity = disconnected ? (bonus ? 0.55 : 0.4) : 0.95;

  const isTahil = tile && tile.type === 'tahil';
  const isOrman = tile && tile.type === 'odun';
  const TEXTURE_MAP = { tahil: tahilImg, odun: ormanImg, demir: demirImg, kil: kilImg, tas: tasImg };

  // Tüm tile'lara texture: center → merkez, built → kendi türü, bonus boş → bonus kaynağı, diğer boş → bos
  const tileTexture = isCenter ? merkezImg
    : tile   ? (TEXTURE_MAP[tile.type] || bosImg)
    : bonus  ? (TEXTURE_MAP[bonus.resource] || bosImg)
    : bosImg;

  const hasTexture = true;
  const clipId = `clip-${q}-${r}`;

  return (
    <g onClick={onClick}
       onMouseEnter={onMouseEnter}
       onMouseLeave={onMouseLeave}
       transform={isHovered ? `translate(${x} ${y}) scale(1.1) translate(${-x} ${-y})` : undefined}
       style={{ cursor: 'pointer', transition: 'transform 0.12s ease-out' }}>
      <defs>
        <clipPath id={clipId}>
          <polygon points={hexPoints(x, y, BASE_S)} />
        </clipPath>
      </defs>

      {/* Zemin rengi (her zaman çizilir, texture altında kalır) */}
      <polygon points={hexPoints(x, y, BASE_S)} fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />

      {/* Texture — hex şekline kırpılmış */}
      {hasTexture && (
        <image
          href={tileTexture}
          x={x - BASE_S}
          y={y - BASE_S}
          width={BASE_S * 2}
          height={BASE_S * 2}
          clipPath={`url(#${clipId})`}
          opacity={isCenter ? 1 : disconnected ? 0.3 : tile ? (tile.upgrading ? 0.5 : 0.88) : 0.55}
          preserveAspectRatio="xMidYMid slice"
        />
      )}

      {/* Seçili border (texture üstünde çizilsin) */}
      {hasTexture && (
        <polygon points={hexPoints(x, y, BASE_S)} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      )}
      {showLabels && bonus && !isCenter && (
        <g>
          <rect x={x - 16} y={y - BASE_S + 4} width={32} height={12} rx={2}
            fill={bonusApplied ? '#2a4a18' : '#1a2210'}
            stroke={bonusApplied ? '#88c060' : '#5a7030'} strokeWidth={0.8}
            opacity={disconnected ? 0.85 : 1} />
          <text x={x} y={y - BASE_S + 12} textAnchor="middle" dominantBaseline="middle"
            fontSize={9} fontWeight="bold"
            fill={bonusApplied ? '#c8e878' : '#b8d868'} style={{ userSelect: 'none' }}>
            {RES_EMOJI[bonus.resource]} +{bonus.amount}
          </text>
        </g>
      )}
      {isCenter ? (
        <>
          {showLabels && (
            <text x={x} y={y + BASE_S - 10} textAnchor="middle" dominantBaseline="middle"
              fontSize={10} fontWeight="bold" fill="#fff8c0"
              stroke="#3a1a00" strokeWidth={2.5} paintOrder="stroke"
              style={{ userSelect: 'none' }}>Lvl {anaBinaLevel}</text>
          )}
        </>
      ) : tile ? (
        <>
          {hasTexture ? (
            /* ── Texture'lı tile (tahıl/odun): ikon yok, konturlu yazılar ── */
            showLabels && (
              <>
                {/* Üst: işçi sayısı */}
                {/* İnsan figürü - mavi filter */}
                <text x={x - 6} y={y - 14} textAnchor="middle" dominantBaseline="middle"
                  fontSize={9}
                  style={{ userSelect: 'none', filter: 'sepia(1) saturate(8) hue-rotate(190deg) brightness(1.4)' }}>
                  👤
                </text>
                {/* Rakam - beyaz */}
                <text x={x + 5} y={y - 14} textAnchor="middle" dominantBaseline="middle"
                  fontSize={9} fill="#ffffff"
                  stroke="#1a1a2a" strokeWidth={2.5} paintOrder="stroke"
                  style={{ userSelect: 'none' }}>
                  {tile.workers || 0}
                </text>

                {/* Orta: seviye */}
                <text x={x} y={y + 4} textAnchor="middle" dominantBaseline="middle"
                  fontSize={9} fill={tile.upgrading ? '#ffaa30' : '#fff8c0'}
                  stroke="#3a1a00" strokeWidth={2.5} paintOrder="stroke"
                  style={{ userSelect: 'none' }}>
                  {tile.upgrading ? '⚙️ Lvl' : `Lvl ${tile.level}`}
                </text>
              </>
            )
          ) : (
            /* ── Diğer tile'lar: mevcut düzen ── */
            <>
              <text x={x} y={y - 10} textAnchor="middle" dominantBaseline="middle"
                fontSize={22} style={{ userSelect: 'none' }} opacity={tile.upgrading ? 0.35 : 1}>{bdef?.icon}</text>
              {tile.upgrading && (
                <text x={x + 18} y={y - 18} textAnchor="middle" dominantBaseline="middle"
                  fontSize={13} style={{ userSelect: 'none' }}>⚙️</text>
              )}
              {showLabels && (
                <>
                  <text x={x} y={y + 8} textAnchor="middle" dominantBaseline="middle"
                    fontSize={9} fill={tile.upgrading ? '#c87020' : '#c8a44a'} style={{ userSelect: 'none' }}>Lvl {tile.level}</text>
                  <text x={x} y={y + 20} textAnchor="middle" dominantBaseline="middle"
                    fontSize={8} fill="#9aaa98" style={{ userSelect: 'none' }}>👤 {tile.workers || 0}</text>
                </>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <text x={x} y={y - 4} textAnchor="middle" dominantBaseline="middle"
            fontSize={20}
            fill={buildable ? 'rgba(180,230,120,0.55)' : 'rgba(120,120,120,0.25)'}
            style={{ userSelect: 'none' }}>{buildable ? '+' : '·'}</text>
        </>
      )}
    </g>
  );
}

export default function ProductionArea({
  productionTiles = {},
  maxProductionSlots = 6,
  anaBina,
  freeWorkers = 0,
  resources = {},
  onBuild, onUpgrade, onDemolish, onAssignWorkers, onUpgradeAnaBina,
  onEnterVillageCenter
}) {
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [scale, setScale] = useState(1.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [viewSize, setViewSize] = useState({ w: 800, h: 600 });

  const containerRef = useRef(null);
  const dragRef = useRef(null);

  const mapCoords = useMemo(() => generateMapCoords(MAP_SIZE), []);

  // SVG'yi container'dan büyük tut — rotateX(20deg) eğimiyle köşelerde
  // oluşan trapezoid boşluklar container'ı tamamen örtsün.
  const OVERSIZE = 1.4;
  const svgW = Math.ceil(viewSize.w * OVERSIZE);
  const svgH = Math.ceil(viewSize.h * OVERSIZE);
  const svgOffsetX = Math.floor((viewSize.w - svgW) / 2);
  const svgOffsetY = Math.floor((viewSize.h - svgH) / 2);

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

  const tileCount = Object.keys(productionTiles).length;
  const slotsFull = tileCount >= maxProductionSlots;

  const isConnected = useCallback((slotKey) => {
    const neighbors = getNeighbors(slotKey);
    return neighbors.some(n => n === '0,0' || productionTiles[n]);
  }, [productionTiles]);

  const canBuildAt = useCallback((slotKey) => {
    if (slotKey === '0,0') return false;
    if (productionTiles[slotKey]) return false;
    if (slotsFull) return false;
    return isConnected(slotKey);
  }, [productionTiles, slotsFull, isConnected]);

  function handleSlotClick(slotKey) {
    if (dragRef.current && dragRef.current.moved) return;
    if (slotKey === '0,0' && typeof onEnterVillageCenter === 'function') {
      onEnterVillageCenter();
      return;
    }
    setSelected(prev => prev === slotKey ? null : slotKey);
  }

  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setScale(s => Math.max(0.22, Math.min(2.0, +(s + delta).toFixed(2))));
  }

  function handleMouseDown(e) {
    if (e.button === 2) {
      e.preventDefault();
      dragRef.current = {
        startX: e.clientX, startY: e.clientY,
        startPanX: pan.x, startPanY: pan.y, moved: false
      };
      setIsDragging(true);
    }
  }

  function handleMouseMove(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragRef.current.moved = true;
    setPan({ x: dragRef.current.startPanX + dx, y: dragRef.current.startPanY + dy });
  }

  function endDrag() {
    // Küçük bir gecikme: onClick handleSlotClick'in moved'ı okuyabilmesi için
    setTimeout(() => { dragRef.current = null; }, 0);
    setIsDragging(false);
  }

  function handleContextMenu(e) { e.preventDefault(); }

  function recenter() {
    setPan({ x: 0, y: 0 });
    setScale(1.5);
  }

  const selectedTile = selected && selected !== '0,0' ? productionTiles[selected] : null;
  const selectedBuildable = selected && selected !== '0,0' && !selectedTile && canBuildAt(selected);

  const showLabels = scale >= 0.45;

  // Seçilen hex'in yanına popover için ekran koordinatı
  const popoverPos = useMemo(() => {
    if (!selected) return null;
    const [sq, sr] = selected.split(',').map(Number);
    const { x: sx, y: sy } = hexToPixel(sq, sr, BASE_S);
    return computePopoverPos({
      hexScreenX: viewSize.w / 2 + pan.x + sx * scale,
      hexScreenY: viewSize.h / 2 + pan.y + sy * scale,
      hexRadius: BASE_S * scale,
      viewW: viewSize.w,
      viewH: viewSize.h,
    });
  }, [selected, pan.x, pan.y, scale, viewSize.w, viewSize.h]);

  return (
    <div ref={containerRef}
      style={{
        flex: 1, background: '#1c1812',
        cursor: isDragging ? 'grabbing' : 'default',
        overflow: 'hidden', position: 'relative', userSelect: 'none',
        perspective: '1400px', perspectiveOrigin: '50% 50%'
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onContextMenu={handleContextMenu}>
          <svg width={svgW} height={svgH}
            style={{
              display: 'block',
              position: 'absolute',
              left: svgOffsetX,
              top: svgOffsetY,
              transform: 'rotateX(20deg)',
              transformOrigin: '50% 50%',
              transformStyle: 'preserve-3d'
            }}>
            <g transform={`translate(${svgW / 2 + pan.x} ${svgH / 2 + pan.y}) scale(${scale})`}>
              {mapCoords.map(([q, r]) => {
                const key = `${q},${r}`;
                const tile = productionTiles[key];
                const isCenter = key === '0,0';
                const buildable = !tile && !isCenter && canBuildAt(key);
                const disconnected = !tile && !isCenter && !isConnected(key);
                return (
                  <HexTile key={key} q={q} r={r} tile={tile}
                    isCenter={isCenter} isSelected={selected === key}
                    isHovered={hovered === key}
                    buildable={buildable} disconnected={disconnected}
                    anaBinaLevel={anaBina?.level || 1}
                    showLabels={showLabels}
                    onClick={() => handleSlotClick(key)}
                    onMouseEnter={() => setHovered(key)}
                    onMouseLeave={() => setHovered(prev => prev === key ? null : prev)} />
                );
              })}
            </g>
          </svg>

          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            background: 'rgba(28,24,18,0.90)', border: '1px solid #3a3020',
            padding: '6px 10px', fontSize: 10, color: '#9aaa98',
            borderRadius: 3, pointerEvents: 'none'
          }}>
            <div><span style={{ color: '#c8e878' }}>+%N</span> tile bonusu (~%20 oran · {MAP_SIZE} tile)</div>
            <div>Ring başına -%5 mesafe cezası</div>
          </div>

          {/* Tıklanan hex'in yanına açılan floating panel */}
          {selected === '0,0' && popoverPos && (
            <AnaBinaPanel anaBina={anaBina} resources={resources} freeWorkers={freeWorkers}
              popoverPos={popoverPos}
              onUpgrade={(w) => { onUpgradeAnaBina(w); setSelected(null); }}
              onClose={() => setSelected(null)} />
          )}
          {selected && selected !== '0,0' && selectedTile && popoverPos && (
            <ProductionTilePanel slotKey={selected} tile={selectedTile} resources={resources} freeWorkers={freeWorkers}
              popoverPos={popoverPos}
              onUpgrade={(w) => { onUpgrade(selected, w); setSelected(null); }}
              onDemolish={() => { onDemolish(selected); setSelected(null); }}
              onAssignWorkers={(w) => onAssignWorkers(selected, w)}
              onClose={() => setSelected(null)} />
          )}
          {selected && selected !== '0,0' && !selectedTile && selectedBuildable && popoverPos && (
            <BuildProductionPanel slotKey={selected} freeWorkers={freeWorkers} resources={resources}
              popoverPos={popoverPos}
              onBuild={(type, w) => { onBuild(selected, type, w); setSelected(null); }}
              onClose={() => setSelected(null)} />
          )}
          {selected && selected !== '0,0' && !selectedTile && !selectedBuildable && popoverPos && (
            <EmptySlotPanel slotKey={selected} slotsFull={slotsFull}
              popoverPos={popoverPos}
              onClose={() => setSelected(null)} />
          )}

          {hovered && (() => {
            const [hq, hr] = hovered.split(',').map(Number);
            const hTile = productionTiles[hovered];
            const hIsCenter = hovered === '0,0';
            const hRing = hexDistance(hq, hr);
            const hDistPct = Math.round(getDistanceEfficiency(hq, hr) * 100);
            const hBonus = getTileBonus(hq, hr);
            const hTotalMult = hTile ? getTotalMultiplier(hq, hr, hTile.type) : getDistanceEfficiency(hq, hr);
            const hTotalPct = Math.round(hTotalMult * 100);
            const hBonusApplied = hTile && hBonus && hBonus.resource === hTile.type;
            const hDef = hTile ? BUILDING_DEFS[hTile.type] : null;
            const hProd = hTile && hDef ? (hTile.workers || 0) * (hDef.baseProductionPerWorker || 0) * hTotalMult : 0;
            const hBuildable = !hTile && !hIsCenter && canBuildAt(hovered);
            const hDisconnected = !hTile && !hIsCenter && !isConnected(hovered);

            const title = hIsCenter
              ? '🏛️ Ana Bina'
              : hTile
                ? `${hDef?.icon || ''} ${hDef?.name || hTile.type}`
                : hBonus
                  ? `${RES_EMOJI[hBonus.resource] || ''} ${hBonus.resource} bonus alanı`
                  : hBuildable ? '➕ Boş alan (inşaya uygun)' : '🚫 Bağlantısız alan';

            return (
              <div style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(28,24,18,0.95)',
                border: '1.5px solid #ffe030',
                boxShadow: '0 0 10px rgba(255,224,48,0.25)',
                padding: '8px 12px', fontSize: 11, color: '#e8d4a0',
                borderRadius: 3, pointerEvents: 'none', minWidth: 220, maxWidth: 280
              }}>
                <div style={{ color: '#ffe030', fontSize: 12, marginBottom: 5, letterSpacing: 1 }}>
                  {title}
                </div>
                <div style={{ color: '#7a8878', fontSize: 10, marginBottom: 6 }}>
                  Slot {hovered} · Ring {hRing}
                </div>

                {!hIsCenter && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: '#9aaa98' }}>Mesafe verimi</span>
                    <span style={{ color: hDistPct === 100 ? '#88c060' : hDistPct >= 80 ? '#c8a44a' : '#c88848' }}>
                      {`%${hDistPct}`}
                    </span>
                  </div>
                )}

                {hBonus && !hIsCenter && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ color: '#9aaa98' }}>Tile bonusu</span>
                    <span style={{ color: '#c8e878', fontWeight: 'bold' }}>
                      {RES_EMOJI[hBonus.resource]} {`+%${hBonus.amount}`} {hBonus.resource}
                    </span>
                  </div>
                )}

                {hTile && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ color: '#9aaa98' }}>Seviye</span>
                      <span style={{ color: '#c8a44a' }}>Lvl {hTile.level}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ color: '#9aaa98' }}>İşçi</span>
                      <span style={{ color: '#e8d4a0' }}>
                        👤 {hTile.workers || 0} / {hDef?.levels?.[hTile.level - 1]?.workers || 0}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3,
                      borderTop: '1px solid #3a3020', paddingTop: 4, marginTop: 4 }}>
                      <span style={{ color: '#9aaa98' }}>Toplam çarpan</span>
                      <span style={{ color: hBonusApplied ? '#c8e878' : '#c8a44a', fontWeight: 'bold' }}>
                        ×{hTotalMult.toFixed(2)} (%{hTotalPct})
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#9aaa98' }}>Üretim</span>
                      <span style={{ color: '#88c060', fontWeight: 'bold' }}>
                        {hProd.toFixed(1)}/sa
                      </span>
                    </div>
                    {hTile.upgrading && (
                      <div style={{ color: '#c87020', fontSize: 10, marginTop: 4, fontStyle: 'italic' }}>
                        ⚙️ Yükseltiliyor…
                      </div>
                    )}
                  </>
                )}

                {!hTile && !hIsCenter && (
                  <div style={{ color: hBuildable ? '#88c060' : hDisconnected ? '#c87050' : '#9aaa98',
                    fontSize: 10, marginTop: 4, fontStyle: 'italic' }}>
                    {hBuildable
                      ? 'Bu slota inşa edilebilir — tıkla.'
                      : hDisconnected
                        ? 'Bağlantısız — bir komşusuna önce inşa et.'
                        : 'Boş slot.'}
                  </div>
                )}

                {hIsCenter && (
                  <div style={{ color: '#9aaa98', fontSize: 10, marginTop: 4, fontStyle: 'italic' }}>
                    Köy merkezi — yükseltmek için tıkla.
                  </div>
                )}
              </div>
            );
          })()}
    </div>
  );
}
