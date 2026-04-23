import { useState } from 'react';

/**
 * Silahçı / Zırhçı / Ahır binalarında ekipman siparişi ve kuyruk yönetimi.
 * Props:
 *   buildingType          — 'silahci' | 'zirh' | 'ahir'
 *   equipmentByBuilding   — { silahci:['kilic','mizrak'], ... }
 *   equipmentDefs         — server EQUIPMENT_DEFS payload'ı
 *   equipment             — { kilic:12, ... } envanter
 *   queue                 — bu binanın sipariş listesi
 *   resources             — oyuncu kaynakları (maliyeti afford ediyor muyuz?)
 *   onQueue(type, qty)    — sipariş ver
 *   onCancel(orderId)     — sipariş iptal
 */

const panel = {
  background: '#14100a',
  border: '1px solid #3a2808',
  borderRadius: '4px',
  padding: '10px',
  marginTop: '8px'
};

const rowBtn = {
  flex: 1,
  padding: '6px 8px',
  background: '#2a1a08',
  border: '1px solid #4a2a08',
  color: '#c8a44a',
  cursor: 'pointer',
  fontSize: '11px',
  borderRadius: '3px'
};

const qtyInput = {
  width: '42px',
  padding: '4px',
  background: '#0d0905',
  border: '1px solid #3a2808',
  color: '#e8d4a0',
  fontSize: '11px',
  textAlign: 'center'
};

function formatCost(cost, resources) {
  return Object.entries(cost).map(([res, amt]) => {
    const have = resources[res] || 0;
    const ok = have >= amt;
    return (
      <span key={res} style={{ color: ok ? '#8ab870' : '#c86060', marginRight: 6 }}>
        {amt} {res}
      </span>
    );
  });
}

const WAITING_REASON_LABEL = {
  isci_yok:     '⏸ işçi yok',
  cephane_dolu: '⏸ cephanelik dolu',
  ahir_dolu:    '⏸ ahır dolu',
  kaynak_yok:   '⏸ kaynak yok'
};

export default function EquipmentPanel({
  buildingType,
  equipmentByBuilding = {},
  equipmentDefs = {},
  equipment = {},
  equipmentCaps = {},
  queue = [],
  resources = {},
  buildingWorkers = 0,
  onQueue,
  onCancel
}) {
  const allowed = equipmentByBuilding[buildingType] || [];
  const [qty, setQty] = useState(() => Object.fromEntries(allowed.map(k => [k, 1])));

  if (!allowed.length) {
    return (
      <div style={panel}>
        <div style={{ color: '#c86060', fontSize: 11 }}>Bu bina ekipman üretmez.</div>
      </div>
    );
  }

  return (
    <div style={panel}>
      <div style={{ color: '#c8a44a', fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>
        ⚒ EKİPMAN ÜRETİMİ
      </div>

      {buildingWorkers === 0 ? (
        <div style={{ color:'#e06060', fontSize: 10, marginBottom: 8, lineHeight:1.4 }}>
          ⚠ Bu binada işçi yok — sipariş kuyruğa girer ama üretim başlamaz.
          İşçi atamak için üst panelde ayarla.
        </div>
      ) : (
        <div style={{ color:'#7a8878', fontSize: 10, marginBottom: 8, lineHeight:1.4 }}>
          👥 {buildingWorkers} işçi çalışıyor — süre = temel ÷ {buildingWorkers}
        </div>
      )}

      {/* Üretilebilir ekipmanlar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        {allowed.map(eqKey => {
          const def = equipmentDefs[eqKey];
          if (!def) return null;
          const stock = equipment[eqKey] || 0;
          const cap   = equipmentCaps[eqKey] ?? 0;
          const capFull = cap > 0 && stock >= cap;
          const canAfford = Object.entries(def.cost).every(([res, amt]) =>
            (resources[res] || 0) >= amt * (qty[eqKey] || 1)
          );
          const speedFactor = Math.max(1, buildingWorkers);
          const secsPer = Math.max(1, Math.ceil(Math.ceil(def.productionHours) / speedFactor));
          const canOrder = canAfford && !capFull;
          return (
            <div key={eqKey} style={{
              background: '#0d0905', border: `1px solid ${capFull ? '#6a2020' : '#2a1808'}`,
              padding: '6px 8px', borderRadius: 3,
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <span style={{ fontSize: 16, opacity: capFull ? 0.5 : 1 }}>{def.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#e8d4a0', fontSize: 11, fontWeight: 600 }}>
                  {def.name}{' '}
                  <span style={{ color: capFull ? '#e06060' : '#8a8060' }}>
                    (stok: {stock}/{cap}{capFull ? ' ⚠ DOLU' : ''})
                  </span>
                </div>
                <div style={{ fontSize: 10, marginTop: 2 }}>
                  {formatCost(def.cost, resources)}
                  <span style={{ color: '#7080a0' }}>
                    · {secsPer}sn{buildingWorkers > 0 && buildingWorkers > 1 ? ` (×${buildingWorkers})` : ''}
                  </span>
                </div>
              </div>
              <input
                type="number" min={1} max={50}
                value={qty[eqKey] || 1}
                onChange={e => setQty(q => ({ ...q, [eqKey]: Math.max(1, Math.min(50, +e.target.value || 1)) }))}
                style={qtyInput}
              />
              <button
                style={{ ...rowBtn, flex: 'none', opacity: canOrder ? 1 : 0.5 }}
                disabled={!canOrder}
                title={
                  capFull   ? (eqKey === 'at' ? 'Ahır dolu — yükselt' : 'Cephanelik dolu — inşa et / yükselt')
                  : !canAfford ? 'Yetersiz kaynak'
                  : 'Kuyruğa ekle'
                }
                onClick={() => onQueue(eqKey, qty[eqKey] || 1)}
              >
                Sipariş
              </button>
            </div>
          );
        })}
      </div>

      {/* Kuyruk */}
      <div style={{ color: '#8a8060', fontSize: 11, marginBottom: 4 }}>
        Kuyruk ({queue.length})
      </div>
      {queue.length === 0 ? (
        <div style={{ color: '#5a5040', fontSize: 10, fontStyle: 'italic' }}>— boş —</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {queue.map((o, idx) => {
            const def = equipmentDefs[o.type];
            return (
              <div key={o.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 6px', fontSize: 11,
                background: idx === 0 ? '#1a1408' : '#0d0905',
                border: '1px solid #2a1808', borderRadius: 3
              }}>
                <span style={{ color: '#6a6050', width: 20 }}>#{idx + 1}</span>
                <span>{def?.icon || '•'}</span>
                <span style={{ flex: 1, color: '#e8d4a0' }}>
                  {def?.name || o.type} × {o.remaining}
                  {o.total > 1 && o.remaining !== o.total && (
                    <span style={{ color: '#6a6050' }}> / {o.total}</span>
                  )}
                </span>
                <span style={{ color: o.waiting ? '#c86060' : '#8ab870', fontSize: 10 }}>
                  {o.waiting
                    ? (WAITING_REASON_LABEL[o.waitingReason] || '⏸ bekliyor')
                    : (o.timeLeft != null ? `${o.timeLeft}sn` : '—')}
                </span>
                <button
                  onClick={() => onCancel(o.id)}
                  style={{
                    width: 22, height: 22, padding: 0,
                    background: '#3a1808', border: '1px solid #5a2008',
                    color: '#c86060', cursor: 'pointer', borderRadius: 3,
                    fontSize: 12, lineHeight: '20px'
                  }}
                  title="İptal"
                >×</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
