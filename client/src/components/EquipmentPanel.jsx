import { useState } from 'react';
import { C, FONT, RES_COLOR, num, fmtTime } from '../theme';
import { EQ_LABEL, RES_LABEL, gameMinutesToRealSeconds } from '../flows';
import Icon from './Icons';
import { PanelShell, WorkerNote, Qty, OrderButton, QueueList } from './queueUI';

/**
 * Silahçı / Zırhçı / Ahır — ekipman siparişi ve kuyruk.
 */
export default function EquipmentPanel({
  buildingType,
  equipmentByBuilding = {}, equipmentDefs = {},
  equipment = {}, equipmentCaps = {}, equipmentPool = { capacity: 0, used: 0, free: 0 },
  queue = [], resources = {}, buildingWorkers = 0,
  onQueue, onCancel,
  hourSeconds = 3600, worldSpeed = 1,
}) {
  const allowed = equipmentByBuilding[buildingType] || [];
  const [qty, setQty] = useState(() => Object.fromEntries(allowed.map(k => [k, 1])));

  // Kılıç/mızrak/kalkan/zırh ortak havuzu paylaşır; at ahırda ayrı durur
  const poolFree = Math.max(0, (equipmentPool.capacity || 0) - (equipmentPool.used || 0));
  const poolFull = (equipmentPool.capacity || 0) > 0 && poolFree <= 0;

  if (!allowed.length) {
    return (
      <PanelShell icon="cephane" title="Ekipman üretimi">
        <div style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textMute }}>
          Bu bina ekipman üretmez.
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell icon="cephane" title="Ekipman üretimi"
      note={<WorkerNote workers={buildingWorkers}
        warn="Bu binada işçi yok — sipariş kuyruğa girer ama üretim başlamaz."
        ok={`${buildingWorkers} işçi · süre = temel ÷ ${buildingWorkers}`} />}
      status={allowed.some(k => k !== 'at') ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 7px', borderRadius: 4, marginBottom: 8,
          background: poolFull ? 'rgba(255,111,120,0.1)' : 'rgba(12,20,28,0.5)',
          border: `1px solid ${poolFull ? 'rgba(255,111,120,0.35)' : C.lineSoft}`,
        }}>
          <Icon name="cephane" size={11} color={poolFull ? C.danger : C.iceDeep} />
          <span style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint, flex: 1 }}>
            Ortak havuz
          </span>
          <span style={num({ fontSize: 9.5, color: poolFull ? C.danger : C.frost })}>
            {equipmentPool.used || 0}/{equipmentPool.capacity || 0}
          </span>
          <span style={{ fontFamily: FONT.ui, fontSize: 9, color: poolFull ? C.danger : C.good }}>
            {poolFull ? 'DOLU' : `${poolFree} boş`}
          </span>
        </div>
      ) : null}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {allowed.map(eq => {
          const def = equipmentDefs[eq];
          if (!def) return null;
          const q = qty[eq] || 1;
          const stock = equipment[eq] || 0;
          const isHorse = eq === 'at';
          const cap = equipmentCaps[eq] ?? 0;
          const full = isHorse ? (cap > 0 && stock >= cap) : poolFull;
          const afford = Object.entries(def.cost).every(([r, a]) => (resources[r] || 0) >= a * q);
          // Sunucu ile birebir: productionHours GERÇEKTEN oyun saati; dakikaya
          // çevrilip işçiye bölünür, MIN_PRODUCTION_MINUTES (=1) altına inmez.
          const workers = Math.max(1, buildingWorkers);
          const mins = Math.max(1, (def.productionHours * 60) / workers);
          const secs = gameMinutesToRealSeconds(mins, hourSeconds, worldSpeed);
          const ready = afford && !full;

          return (
            <div key={eq} style={{
              padding: '7px 8px', borderRadius: 5,
              background: 'rgba(8,17,28,0.6)',
              border: `1px solid ${full ? 'rgba(232,99,111,0.35)' : C.lineSoft}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <Icon name={eq} size={17} color={full ? C.dangerDim : C.iceSoft} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT.ui, fontSize: 10.5, fontWeight: 500, color: C.text }}>
                    {EQ_LABEL[eq] || def.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                    <span style={num({ fontSize: 9.5, color: full ? C.danger : C.textFaint })}>
                      {isHorse ? `stok ${stock}/${cap}` : `stok ${stock}`}
                    </span>
                    {full && (
                      <span style={{ fontFamily: FONT.ui, fontSize: 9, color: C.danger }}>DOLU</span>
                    )}
                    <span style={num({ fontSize: 9.5, color: C.iceDeep, marginLeft: 'auto' })}>
                      {fmtTime(secs)}{buildingWorkers > 1 ? ` (${buildingWorkers}×)` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Maliyet */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                {Object.entries(def.cost).map(([r, a]) => {
                  const need = a * q;
                  const ok = (resources[r] || 0) >= need;
                  return (
                    <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Icon name={r} size={11} color={ok ? RES_COLOR[r] : C.dangerDim} />
                      <span style={num({ fontSize: 9.5, color: ok ? C.textDim : C.danger })}>
                        {need}
                      </span>
                      <span style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute }}>
                        {RES_LABEL[r] || r}
                      </span>
                    </span>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Qty value={q} onChange={(n) => setQty(s => ({ ...s, [eq]: n }))} />
                <OrderButton disabled={!ready} onClick={() => onQueue(eq, q)}
                  title={full
                    ? (isHorse ? 'Ahır dolu — yükselt' : 'Ekipman havuzu dolu — cephaneliği yükselt ya da asker eğit')
                    : !afford ? 'Yetersiz kaynak' : 'Kuyruğa ekle'}>
                  SİPARİŞ
                </OrderButton>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <QueueList queue={queue}
          nameOf={(o) => EQ_LABEL[o.type] || equipmentDefs[o.type]?.name || o.type}
          iconOf={(o) => o.type}
          onCancel={onCancel} />
      </div>
    </PanelShell>
  );
}
