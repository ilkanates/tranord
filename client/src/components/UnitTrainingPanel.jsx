import { useState } from 'react';

/**
 * Kışla / Ahır / Atölye binalarında birim eğitim paneli.
 * Props:
 *   buildingType       — 'kisla' | 'ahir' | 'atolye'
 *   unitsByBuilding    — { kisla:[...], ahir:[...], ... }
 *   unitDefs           — server TRAINABLE_UNITS payload'ı (UNIT_DEFS'ten filtrelenmiş)
 *   equipmentDefs      — ekipman iconları için
 *   equipment          — { kilic:12, ... } envanter (yeterli mi görmek için)
 *   queue              — bu binanın eğitim kuyruğu
 *   freeWorkers        — boş işçi havuzu (her asker 1 işçi harcar)
 *   onTrain(type, qty) — eğitim siparişi
 *   onCancel(orderId)  — sipariş iptal
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

// Birim eğitim süresi (1 eğitmen): ekipman sayısı × 5sn, min 3sn
function getTrainSeconds(unitDef) {
  const n = (unitDef?.equipment || []).length;
  return Math.max(3, n * 5);
}

// İşçi sayısına göre fiili süre
function getEffectiveTrainSeconds(unitDef, trainerWorkers) {
  const base = getTrainSeconds(unitDef);
  if (trainerWorkers <= 0) return base;
  return Math.max(1, Math.ceil(base / trainerWorkers));
}

const WAITING_REASON_LABEL = {
  egitmen_yok:         '⏸ eğitmen yok',
  ekipman_yok:         '⏸ ekipman yok',
  asker_icin_isci_yok: '⏸ boş işçi yok'
};

function formatStats(stats) {
  return (
    <span style={{ color: '#7080a0' }}>
      ⚔{stats.saldiri} 🛡{stats.yayaSav}/{stats.atliSav} ⚡{stats.hiz}
    </span>
  );
}

export default function UnitTrainingPanel({
  buildingType,
  unitsByBuilding = {},
  unitDefs = {},
  equipmentDefs = {},
  equipment = {},
  queue = [],
  freeWorkers = 0,
  trainerWorkers = 0,
  onTrain,
  onCancel
}) {
  const allowed = unitsByBuilding[buildingType] || [];
  const [qty, setQty] = useState(() => Object.fromEntries(allowed.map(k => [k, 1])));

  if (!allowed.length) {
    return (
      <div style={panel}>
        <div style={{ color: '#c86060', fontSize: 11 }}>Bu bina birim eğitemez.</div>
      </div>
    );
  }

  return (
    <div style={panel}>
      <div style={{ color: '#c8a44a', fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>
        🛡 BİRİM EĞİTİMİ
      </div>

      {trainerWorkers === 0 ? (
        <div style={{ color: '#e06060', fontSize: 10, marginBottom: 8, lineHeight: 1.5 }}>
          ⚠ Bu binada eğitmen işçi yok — üst panelden işçi ata, aksi halde sipariş beklemeye alınır.
        </div>
      ) : (
        <div style={{ color: '#7a8878', fontSize: 10, marginBottom: 8, lineHeight: 1.5 }}>
          👥 {trainerWorkers} eğitmen — her asker 1 serbest işçi + ekipmanları tüketir.
          Süre = ekipman×5sn ÷ {trainerWorkers}.
        </div>
      )}

      {/* Eğitilebilir birimler */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        {allowed.map(uKey => {
          const def = unitDefs[uKey];
          if (!def) return null;
          const eqList = def.equipment || [];
          const q = qty[uKey] || 1;

          // Tek birim için gerekli ekipmanlar: hepsinden ≥1 gerekiyor
          const canAffordEq = eqList.every(eq => (equipment[eq] || 0) >= 1);
          const hasWorker = freeWorkers >= 1;
          const hasTrainer = trainerWorkers >= 1;
          const canTrain = canAffordEq && hasWorker && hasTrainer;

          const trainSecs = getEffectiveTrainSeconds(def, trainerWorkers);
          const baseSecs  = getTrainSeconds(def);

          return (
            <div key={uKey} style={{
              background: '#0d0905', border: '1px solid #2a1808',
              padding: '6px 8px', borderRadius: 3
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>
                  {def.category === 'suvari' ? '🐎' : def.category === 'kusatma' ? '🏗️' : '🛡️'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#e8d4a0', fontSize: 11, fontWeight: 600 }}>
                    {def.name}
                  </div>
                  <div style={{ fontSize: 10, marginTop: 1 }}>
                    {formatStats(def.stats)}
                    <span style={{ color: '#7080a0', marginLeft: 6 }}>
                      · {trainSecs}sn
                      {trainerWorkers > 1 && (
                        <span style={{ color: '#5a6050' }}> (temel {baseSecs}sn)</span>
                      )}
                    </span>
                  </div>
                </div>
                <input
                  type="number" min={1} max={50}
                  value={q}
                  onChange={e => setQty(st => ({ ...st, [uKey]: Math.max(1, Math.min(50, +e.target.value || 1)) }))}
                  style={qtyInput}
                />
                <button
                  style={{ ...rowBtn, flex: 'none', opacity: canTrain ? 1 : 0.5 }}
                  disabled={!canTrain}
                  title={
                    !hasTrainer ? 'Eğitmen işçi yok (bu binaya işçi ata)' :
                    !canAffordEq ? 'Yetersiz ekipman (1. birim için)' :
                    !hasWorker  ? 'Serbest işçi yok (askere dönüşecek)' :
                    'Eğitim kuyruğuna ekle'
                  }
                  onClick={() => onTrain(uKey, q)}
                >
                  Eğit
                </button>
              </div>
              <div style={{ fontSize: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {eqList.map(eq => {
                  const eqDef = equipmentDefs[eq];
                  const have = equipment[eq] || 0;
                  const ok = have >= 1;
                  return (
                    <span key={eq} style={{ color: ok ? '#8ab870' : '#c86060' }}>
                      {eqDef?.icon || '•'} {eqDef?.name || eq} ({have})
                    </span>
                  );
                })}
                <span style={{ color: freeWorkers >= 1 ? '#8ab870' : '#c86060' }}>
                  👤 işçi ({freeWorkers})
                </span>
              </div>
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
            const def = unitDefs[o.type];
            return (
              <div key={o.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 6px', fontSize: 11,
                background: idx === 0 ? '#1a1408' : '#0d0905',
                border: '1px solid #2a1808', borderRadius: 3
              }}>
                <span style={{ color: '#6a6050', width: 20 }}>#{idx + 1}</span>
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
