/**
 * Harita popover panelleri — tek harita sürümü.
 * Arazi bonusları DÜNYA koordinatından okunur (worldConfig), mesafe cezası yereldir.
 */
import { useState } from 'react';
import BUILDING_DEFS from '../data/buildingDefs';
import VILLAGE_DEFS from '../data/villageDefs';
import { popoverStyle, popHeader, popBody, popCols, popCol } from './popoverStyle';
import { C, FONT, RES_COLOR, btn, label as lbl, num, fmtTime, signed, short } from '../theme';
import { RES_LABEL, gameMinutesToRealSeconds, gameHoursToRealSeconds, maxBuilders } from '../flows';
import { worldTileBonus, localEfficiency, fieldMultiplier, hexDistance } from '../data/worldConfig';
import Icon from './Icons';
import WorkerAssign from './WorkerAssign';

export const BUILDABLE_TYPES = ['odun', 'kil', 'tas', 'demir', 'tahil'];

export const TYPE_FILL = {
  odun: '#3a5a1a', kil: '#7a4020', tas: '#5a5048', demir: '#3a4858', tahil: '#6a5818',
};
export const TYPE_EDGE = {
  odun: '#8fd45a', kil: '#e8a068', tas: '#b8c0cc', demir: '#8fb8e8', tahil: '#e8cf58',
};

export function Row({ k, v, c = C.frost, strong }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textDim }}>{k}</span>
      <span style={num({ fontSize: 10.5, color: c, fontWeight: strong ? 500 : 400, textAlign: 'right' })}>{v}</span>
    </div>
  );
}

export function ColLabel({ children, icon, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {icon && <Icon name={icon} size={11} color={color || C.iceDeep} />}
      <span style={lbl({ fontSize: 8.5, letterSpacing: 1.4 })}>{children}</span>
    </div>
  );
}

/**
 * MALIYET YETER Mİ, YETMEZSE NE ZAMAN?
 *
 * Panelde yalnız "şu kadar gerekiyor" yazıyordu; eksikse oyuncu beklemesi
 * gereken süreyi hiçbir yerde göremiyordu. Burada her eksik kaynak için
 * `eksik / net akış` hesaplanıp EN GEÇ tamamlanan kaynak belirleniyor —
 * bina o an kurulabilir hâle geliyor.
 *
 * Üç ayrı "olmaz" durumu var ve üçü farklı şey söylüyor:
 *   net <= 0    → o kaynak hiç artmıyor (işçi yok / tüketim üretimi yiyor)
 *   amt > tavan → depo o kadarını hiç tutamıyor, önce depo gerekiyor
 *   yeter       → beklemeye gerek yok
 */
export function costEta(cost, resources = {}, flows = {}) {
  let enGecSaat = 0, gecKaynak = null, eksikToplam = 0;
  let akmiyor = null, tavanYetmez = null;
  for (const [res, amt] of Object.entries(cost || {})) {
    const have = resources[res] || 0;
    const eksik = amt - have;
    if (eksik <= 0) continue;
    eksikToplam++;
    const f = flows[res] || {};
    const tavan = f.capacity || 0;
    if (tavan > 0 && amt > tavan) { tavanYetmez = tavanYetmez || { res, tavan, amt }; continue; }
    const net = f.net || 0;
    if (net <= 0) { akmiyor = akmiyor || { res, eksik }; continue; }
    const saat = eksik / net;
    if (saat > enGecSaat) { enGecSaat = saat; gecKaynak = { res, eksik, net }; }
  }
  if (!eksikToplam) return { durum: 'yeter' };
  if (tavanYetmez) return { durum: 'tavan', ...tavanYetmez };
  if (akmiyor) return { durum: 'akmiyor', ...akmiyor };
  return { durum: 'bekle', saat: enGecSaat, ...gecKaynak };
}

/**
 * CostRow — maliyetler TEK SATIRDA, altında tek satır "ne zaman yeter".
 *
 * Eskiden 2 sütunlu bir ızgaraydı: dört kaynak iki satır kaplıyor, panel
 * aşağı doğru uzuyordu. Artık yan yana diziliyor ve yalnız sığmazsa sarıyor.
 */
export function CostRow({ cost, resources = {}, flows = {}, hourSeconds = 3600, worldSpeed = 1 }) {
  if (!cost || !Object.keys(cost).length) return null;
  const eta = costEta(cost, resources, flows);

  let not = null;
  if (eta.durum === 'bekle') {
    not = {
      renk: C.warn, ikon: 'bilgi',
      metin: `${RES_LABEL[eta.res] || eta.res} ${Math.ceil(eta.eksik)} eksik — `
        + `${fmtTime(gameHoursToRealSeconds(eta.saat, hourSeconds, worldSpeed))} sonra yeter`,
    };
  } else if (eta.durum === 'akmiyor') {
    not = {
      renk: C.danger, ikon: 'uyari',
      metin: `${RES_LABEL[eta.res] || eta.res} artmıyor (${Math.ceil(eta.eksik)} eksik) — üretime işçi ata`,
    };
  } else if (eta.durum === 'tavan') {
    not = {
      renk: C.danger, ikon: 'uyari',
      metin: `${RES_LABEL[eta.res] || eta.res} deposu yetmiyor (tavan ${eta.tavan}, gereken ${eta.amt})`,
    };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {Object.entries(cost).map(([res, amt]) => {
          const have = Math.floor(resources[res] || 0);
          const ok = have >= amt;
          return (
            <div key={res} title={`${RES_LABEL[res] || res}: ${amt} gerekli, ${have} var`}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '2.5px 6px', borderRadius: 3, flex: '1 1 auto', minWidth: 0,
                justifyContent: 'center',
                background: ok ? 'rgba(108,221,163,0.09)' : 'rgba(255,111,120,0.1)',
                border: `1px solid ${ok ? 'rgba(108,221,163,0.3)' : 'rgba(255,111,120,0.32)'}`,
              }}>
              <Icon name={res} size={11} color={RES_COLOR[res] || C.textDim} />
              <span style={num({ fontSize: 9.5, color: ok ? C.good : C.danger })}>{amt}</span>
            </div>
          );
        })}
      </div>
      {not && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon name={not.ikon} size={10} color={not.renk} />
          <span style={{ fontFamily: FONT.ui, fontSize: 9, color: not.renk, lineHeight: 1.3 }}>
            {not.metin}
          </span>
        </div>
      )}
    </div>
  );
}

/** Eski ad — çağrı yerleri tek tek güncellendi, geriye dönük kalsın */
export const CostGrid = CostRow;

export function PopHead({ icon, iconColor, title, sub, onClose, extra }) {
  return (
    <div style={popHeader}>
      {icon && <Icon name={icon} size={19} color={iconColor || C.ice} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT.head, fontSize: 15, fontWeight: 600, letterSpacing: 1.1,
          color: C.frost, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{title}</div>
        {sub && <div style={lbl({ fontSize: 8, marginTop: 1 })}>{sub}</div>}
      </div>
      {extra}
      <button onClick={onClose} title="Kapat"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, display: 'grid' }}>
        <Icon name="kapat" size={13} color={C.textMute} />
      </button>
    </div>
  );
}

/** Arazi şeridi — dünya bonusu + yerel mesafe verimi */
export function YieldStrip({ wq, wr, lq, lr, type }) {
  const ring = hexDistance(lq, lr);
  const eff = localEfficiency(ring);
  const bonus = worldTileBonus(wq + lq, wr + lr);
  const mult = type ? fieldMultiplier(wq, wr, lq, lr, type) : eff;
  const applied = type && bonus && bonus.resource === type;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap',
      padding: '6px 8px', borderRadius: 5,
      background: 'rgba(8,17,28,0.5)', border: `1px solid ${C.lineSoft}`,
    }}>
      <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint }}>Ring {ring}</span>
      <span style={num({ fontSize: 9.5, color: eff === 1 ? C.good : eff >= 0.8 ? C.warn : C.danger })}>
        mesafe %{Math.round(eff * 100)}
      </span>
      {bonus ? (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '1px 5px', borderRadius: 3,
          background: applied ? 'rgba(108,221,163,0.15)' : 'rgba(242,187,96,0.1)',
          border: `1px solid ${applied ? 'rgba(108,221,163,0.4)' : 'rgba(242,187,96,0.28)'}`,
        }} title={applied ? 'Bonus uygulanıyor' : `Bu arazi yalnızca ${RES_LABEL[bonus.resource]} üretimine bonus verir`}>
          <Icon name={bonus.resource} size={10} color={RES_COLOR[bonus.resource]} />
          <span style={num({ fontSize: 9, color: applied ? C.good : C.warn })}>+{bonus.amount}%</span>
        </span>
      ) : (
        <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute }}>bonus yok</span>
      )}
      {type && (
        <span style={num({ fontSize: 10.5, color: applied ? C.good : C.iceSoft, marginLeft: 'auto', fontWeight: 500 })}>
          ×{mult.toFixed(2)}
        </span>
      )}
    </div>
  );
}

// ── Ana Bina ────────────────────────────────────────────────────────
export function AnaBinaPanel({
  anaBina, resources, freeWorkers, popoverPos, worldName, flows = {},
  onUpgrade, onEnterVillage, onCancelBuild, onClose,
  hourSeconds = 3600, worldSpeed = 1,
}) {
  const [workers, setWorkers] = useState(1);
  const def = VILLAGE_DEFS.anaBina;
  const level = anaBina?.level || 1;
  const building = !!anaBina?.building;
  const maxed = level >= (def.maxLevel || 11);
  const mult = Math.pow(def.upgradeCostMultiplier, level - 1);
  const cost = Object.fromEntries(Object.entries(def.upgradeCostBase).map(([k, v]) => [k, Math.ceil(v * mult)]));
  const canAfford = Object.entries(cost).every(([k, v]) => (resources[k] || 0) >= v);
  // buildBaseWork oyun DAKİKASI cinsinden iş; işçiye bölünüp gerçek saniyeye çevrilir
  const baseWork = def.buildBaseWork * Math.pow(def.buildMultiplier, level - 1);
  const secs = workers > 0
    ? gameMinutesToRealSeconds(baseWork / workers, hourSeconds, worldSpeed)
    : Infinity;
  const slots = Math.min(16, 5 + level);
  const ready = canAfford && freeWorkers >= 1;

  return (
    <div style={popoverStyle(popoverPos)} className="tn-rise">
      <PopHead icon="anaBina" title={worldName || 'ANA BİNA'}
        sub={`ana bina · seviye ${level} / ${def.maxLevel || 11}`} onClose={onClose} />

      <div style={popCols('1fr', '1.15fr')}>
        <div style={popCol}>
          <ColLabel icon="harita">Tarla slotu</ColLabel>
          <div style={{
            padding: '9px 10px', borderRadius: 5, textAlign: 'center',
            background: 'rgba(8,17,28,0.5)', border: `1px solid ${C.lineSoft}`,
          }}>
            <span style={num({ fontSize: 26, color: C.frost, fontWeight: 500, lineHeight: 1 })}>{slots}</span>
            <span style={num({ fontSize: 12, color: C.textMute })}> / 16</span>
            {!maxed && (
              <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.good, marginTop: 3 }}>
                yükseltince +1
              </div>
            )}
          </div>
          <button onClick={onEnterVillage} style={btn('ghost', {
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          })}>
            <Icon name="koy" size={13} color={C.iceSoft} /> KÖY MERKEZİ
          </button>
        </div>

        <div style={popCol}>
          {building ? (
            <>
              <ColLabel icon="insaat">Lvl {level} → {level + 1}</ColLabel>
              <div style={{
                padding: '10px 11px', borderRadius: 5, textAlign: 'center',
                background: 'rgba(143,220,255,0.07)', border: `1px solid ${C.lineSoft}`,
              }}>
                <Icon name="insaat" size={18} color={C.ice} className="tn-pulse" />
                <div style={num({ fontSize: 22, color: C.frost, lineHeight: 1.2, marginTop: 3 })}>
                  {fmtTime(anaBina.buildTimeLeft)}
                </div>
              </div>
              <button onClick={onCancelBuild} style={btn('danger', {
                width: '100%', padding: 8, letterSpacing: 1.2,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              })}>
                <Icon name="kapat" size={12} color="#ffb8bd" strokeWidth={2.2} /> YÜKSELTMEYİ İPTAL ET
              </button>
            </>
          ) : maxed ? (
            <div style={{ padding: 20, textAlign: 'center', fontFamily: FONT.ui, fontSize: 11, color: C.textMute }}>
              Maksimum seviye
            </div>
          ) : (
            <>
              <ColLabel icon="insaat">Lvl {level + 1}’e yükselt</ColLabel>
              <CostRow cost={cost} resources={resources} flows={flows}
                hourSeconds={hourSeconds} worldSpeed={worldSpeed} />
              <WorkerAssign mode="pick" min={1}
                max={Math.max(1, Math.min(freeWorkers, maxBuilders(level)))} value={workers}
                freeWorkers={freeWorkers} title="İnşaat işçisi" onChange={setWorkers}
                effect={(w) => `süre ${fmtTime(w > 0
                  ? gameMinutesToRealSeconds(baseWork / w, hourSeconds, worldSpeed)
                  : Infinity)}`} />
              <button data-tut="yukselt" onClick={() => onUpgrade(workers)} disabled={!ready}
                style={btn(ready ? 'good' : 'disabled', { width: '100%', padding: 8, letterSpacing: 1.2 })}>
                YÜKSELT · {fmtTime(secs)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Kurulu tarla ────────────────────────────────────────────────────
export function FieldPanel({
  localKey, wq, wr, tile, resources, freeWorkers, flows, popoverPos,
  onUpgrade, onDemolish, onAssignWorkers, onCancelBuild, onClose,
  hourSeconds = 3600, worldSpeed = 1,
}) {
  const def = BUILDING_DEFS[tile.type];
  const [buildWorkers, setBuildWorkers] = useState(1);
  const next = def?.levels?.[tile.level];
  const maxed = !next;
  const [lq, lr] = localKey.split(',').map(Number);
  const mult = fieldMultiplier(wq, wr, lq, lr, tile.type);
  const canAfford = next ? Object.entries(next.cost).every(([k, v]) => (resources[k] || 0) >= v) : false;
  // sureSaat aslında oyun DAKİKASI (bkz. server/game/tick.js getUpgradeMinutes)
  const secs = next && buildWorkers > 0
    ? gameMinutesToRealSeconds(next.sureSaat / buildWorkers, hourSeconds, worldSpeed)
    : Infinity;
  const maxOper = def?.levels?.[tile.level - 1]?.workers || 1;
  const perWorker = (def?.baseProductionPerWorker || 0) * mult;
  const f = flows?.[tile.type];
  const color = TYPE_EDGE[tile.type] || C.ice;
  const ready = canAfford && freeWorkers >= 1;

  return (
    <div style={popoverStyle(popoverPos)} className="tn-rise">
      <PopHead icon={tile.type} iconColor={color}
        title={def?.name || tile.type}
        sub={`Lvl ${tile.level} · dünya ${wq + lq},${wr + lr}`}
        onClose={onClose}
        extra={!tile.upgrading && (
          <button onClick={() => { if (window.confirm('Bu tarlayı yıkmak istediğine emin misin?')) onDemolish(); }}
            title="Yık"
            style={{
              display: 'grid', placeItems: 'center', width: 26, height: 26, padding: 0,
              borderRadius: 4, cursor: 'pointer',
              background: 'rgba(120,50,58,0.5)', border: `1px solid ${C.dangerDim}`,
            }}>
            <Icon name="yik" size={15} color="#ffb8bd" strokeWidth={2.3} />
          </button>
        )} />

      <div style={popCols('1fr', '1.1fr')}>
        <div style={popCol}>
          <ColLabel icon="isci">Çalışan işçi</ColLabel>
          {tile.level >= 1 ? (
            <WorkerAssign
              mode="assign" value={tile.workers || 0} max={maxOper}
              freeWorkers={freeWorkers} title="kadro"
              onChange={(w) => onAssignWorkers(w)}
              effect={(w) => `${(w * perWorker).toFixed(1)} ${RES_LABEL[tile.type]}/sa`} />
          ) : (
            <div style={{
              display: 'flex', gap: 7, padding: '6px 8px', borderRadius: 5,
              background: 'rgba(143,220,255,0.07)', border: `1px solid ${C.lineSoft}`,
            }}>
              <Icon name="insaat" size={12} color={C.ice} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textDim, lineHeight: 1.45 }}>
                İlk inşaat sürüyor.
              </span>
            </div>
          )}

          <YieldStrip wq={wq} wr={wr} lq={lq} lr={lr} type={tile.type} />

          {f && (
            <div style={{
              padding: '6px 8px', borderRadius: 5,
              background: 'rgba(8,17,28,0.5)', border: `1px solid ${C.lineSoft}`,
              display: 'flex', flexDirection: 'column', gap: 3,
            }}>
              <Row k={`${RES_LABEL[tile.type]} net`} v={`${signed(f.net)}/sa`} strong
                c={Math.abs(f.net) < 0.05 ? C.textMute : f.net > 0 ? C.good : C.danger} />
              <Row k="Stok" v={f.capacity > 0 ? `${Math.floor(f.value)}/${f.capacity}` : Math.floor(f.value)}
                c={f.etaKind === 'full' ? C.warn : C.frost} />
            </div>
          )}
        </div>

        <div style={popCol}>
          {tile.upgrading ? (
            <>
              <ColLabel icon="insaat">
                {tile.level === 0 ? 'İnşa ediliyor' : `Lvl ${tile.level} → ${tile.level + 1}`}
              </ColLabel>
              <div style={{
                padding: '10px 11px', borderRadius: 5, textAlign: 'center',
                background: 'rgba(143,220,255,0.07)', border: `1px solid ${C.lineSoft}`,
              }}>
                <Icon name="insaat" size={18} color={C.ice} className="tn-pulse" />
                <div style={num({ fontSize: 22, color: C.frost, lineHeight: 1.2, marginTop: 3 })}>
                  {fmtTime(Math.max(0, tile.upgradeTimeLeft ?? 0))}
                </div>
                <div style={lbl({ fontSize: 7.5, marginTop: 2 })}>
                  {tile.upgradeWorkersAssigned || 0} inşaat işçisi
                </div>
              </div>
              {tile.level >= 1 && (
                <div style={{
                  display: 'flex', gap: 7, padding: '6px 8px', borderRadius: 5,
                  background: 'rgba(108,221,163,0.08)', border: '1px solid rgba(108,221,163,0.3)',
                }}>
                  <Icon name="artis" size={12} color={C.good} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: '#a8e8c8', lineHeight: 1.45 }}>
                    Üretim <strong>durmuyor</strong>.
                  </span>
                </div>
              )}
              <button onClick={onCancelBuild} style={btn('danger', {
                width: '100%', padding: 8, letterSpacing: 1.2,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              })}>
                <Icon name="kapat" size={12} color="#ffb8bd" strokeWidth={2.2} />
                {tile.level === 0 ? 'İNŞAATI İPTAL ET' : 'YÜKSELTMEYİ İPTAL ET'}
              </button>
            </>
          ) : maxed ? (
            <div style={{ padding: '20px 8px', textAlign: 'center', fontFamily: FONT.ui, fontSize: 11, color: C.textMute }}>
              Maksimum seviyede
            </div>
          ) : (
            <>
              <ColLabel icon="insaat">Lvl {tile.level + 1} · {next.workers} işçi kap.</ColLabel>
              <CostRow cost={next.cost} resources={resources} flows={flows}
                hourSeconds={hourSeconds} worldSpeed={worldSpeed} />
              <WorkerAssign mode="pick" min={1}
                max={Math.max(1, Math.min(freeWorkers, maxBuilders(tile.level)))} value={buildWorkers}
                freeWorkers={freeWorkers} title="İnşaat işçisi" onChange={setBuildWorkers}
                effect={(w) => `süre ${fmtTime(w > 0
                  ? gameMinutesToRealSeconds(next.sureSaat / w, hourSeconds, worldSpeed)
                  : Infinity)}`} />
              <button data-tut="yukselt" onClick={() => onUpgrade(buildWorkers)} disabled={!ready}
                style={btn(ready ? 'good' : 'disabled', { width: '100%', padding: 8, letterSpacing: 1.2 })}>
                YÜKSELT · {fmtTime(secs)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Boş tarla (kendi toprağında) ────────────────────────────────────
export function BuildFieldPanel({
  localKey, wq, wr, freeWorkers, resources, slotsFull, connected, popoverPos, onBuild, onClose,
  flows = {},
  hourSeconds = 3600, worldSpeed = 1,
}) {
  const [lq, lr] = localKey.split(',').map(Number);
  const bonus = worldTileBonus(wq + lq, wr + lr);
  const [type, setType] = useState(bonus ? bonus.resource : 'odun');
  const [workers, setWorkers] = useState(1);
  const def = BUILDING_DEFS[type];
  const lvl1 = def?.levels?.[0];
  const canAfford = lvl1 ? Object.entries(lvl1.cost).every(([k, v]) => (resources[k] || 0) >= v) : false;
  const secs = lvl1 && workers > 0
    ? gameMinutesToRealSeconds(lvl1.sureSaat / workers, hourSeconds, worldSpeed)
    : Infinity;
  const mult = fieldMultiplier(wq, wr, lq, lr, type);
  const perWorker = (def?.baseProductionPerWorker || 0) * mult;
  const blocked = slotsFull || !connected;
  const ready = canAfford && freeWorkers >= 1 && !blocked;

  return (
    <div style={popoverStyle(popoverPos)} className="tn-rise">
      <PopHead icon="ekle" title="BOŞ TARLA"
        sub={`dünya ${wq + lq},${wr + lr} · ring ${hexDistance(lq, lr)}`} onClose={onClose} />

      <div style={popCols('1fr', '1.1fr')}>
        <div style={popCol}>
          <ColLabel icon="bonus">Ne üretilecek</ColLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {BUILDABLE_TYPES.map(t => {
              const d = BUILDING_DEFS[t];
              const on = type === t;
              const isBonus = bonus && bonus.resource === t;
              return (
                <button key={t} onClick={() => setType(t)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 7px', borderRadius: 4, cursor: 'pointer', textAlign: 'left',
                    fontFamily: FONT.ui, fontSize: 10,
                    background: on ? 'rgba(79,176,224,0.22)' : 'rgba(8,17,28,0.5)',
                    border: `1px solid ${on ? C.iceDeep : isBonus ? 'rgba(108,221,163,0.4)' : C.lineSoft}`,
                    color: on ? C.frost : C.textDim,
                  }}>
                  <Icon name={t} size={14} color={on ? TYPE_EDGE[t] : C.textFaint} />
                  <span style={{ flex: 1 }}>{d.name}</span>
                  {isBonus && <span style={num({ fontSize: 8.5, color: C.good })}>+{bonus.amount}%</span>}
                </button>
              );
            })}
          </div>
          <YieldStrip wq={wq} wr={wr} lq={lq} lr={lr} type={type} />
        </div>

        <div style={popCol}>
          {blocked ? (
            <div style={{
              display: 'flex', gap: 8, padding: '8px 9px', borderRadius: 6,
              background: 'rgba(242,187,96,0.07)', border: '1px solid rgba(242,187,96,0.28)',
            }}>
              <Icon name="uyari" size={14} color={C.warn} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontFamily: FONT.ui, fontSize: 10, color: '#e8cf9a', lineHeight: 1.5 }}>
                {slotsFull
                  ? 'Tarla limiti dolu. Ana Bina’yı yükselterek yeni slot aç.'
                  : 'Bu tarla köyüne bağlı değil — önce komşusunu kur.'}
              </span>
            </div>
          ) : (
            <>
              <ColLabel icon="insaat">Lvl 1 · {lvl1?.workers || 1} işçi kap.</ColLabel>
              <CostRow cost={lvl1?.cost} resources={resources} flows={flows}
                hourSeconds={hourSeconds} worldSpeed={worldSpeed} />
              <WorkerAssign mode="pick" min={1}
                max={Math.max(1, Math.min(freeWorkers, maxBuilders(0)))} value={workers}
                freeWorkers={freeWorkers} title="İnşaat işçisi" onChange={setWorkers}
                effect={(w) => `süre ${fmtTime(w > 0
                  ? gameMinutesToRealSeconds((lvl1?.sureSaat || 5) / w, hourSeconds, worldSpeed)
                  : Infinity)}`} />
              <div style={{
                padding: '6px 8px', borderRadius: 5,
                background: 'rgba(8,17,28,0.5)', border: `1px solid ${C.lineSoft}`,
              }}>
                <Row k="Kurulunca 1 işçi" v={`${perWorker.toFixed(1)}/sa`} c={C.good} strong />
              </div>
              <button onClick={() => onBuild(type, workers)} disabled={!ready}
                style={btn(ready ? 'good' : 'disabled', { width: '100%', padding: 8, letterSpacing: 1.2 })}>
                İNŞA ET · {fmtTime(secs)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Başka bir köy (NPC / oyuncu) ────────────────────────────────────
export function ForeignVillagePanel({
  v, myArmy, popoverPos, onClose, onAttack, canAttack = false, intel = null,
}) {
  const color = v.kind === 'player' ? '#ff6f78' : C.ice;
  const ratio = myArmy && v.army ? v.army / Math.max(1, myArmy) : null;

  return (
    <div style={popoverStyle(popoverPos, { width: 268 })} className="tn-rise">
      <PopHead icon="koy" iconColor={color} title={v.name}
        /* Oyuncu köyünde sahibinin adı yazsın — 'oyuncu' bilgi vermiyor */
        sub={`${v.kind === 'player' ? (v.owner || 'oyuncu') : v.tierLabel} · ${v.key}`} onClose={onClose} />
      <div style={{ ...popBody, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {v.kind === 'player' && v.owner && <Row k="Sahibi" v={v.owner} c={color} />}
        {v.distance != null && <Row k="Mesafe" v={`${v.distance} hex`} c={C.iceSoft} />}
        {v.population != null && <Row k="Nüfus" v={short(v.population)} />}
        {v.army != null && (
          <Row k="Ordu" v={short(v.army)} strong
            c={ratio == null ? C.frost : ratio > 1.2 ? C.danger : ratio < 0.7 ? C.good : C.warn} />
        )}
        {v.kind === 'npc' && (
          <>
            <Row k="Sur / hendek" v={`${v.surLevel} / ${v.hendekLevel}`}
              c={v.surLevel > 10 ? C.warn : C.textDim} />
            <Row k="Puan" v={short(v.score)} c={C.textDim} />
          </>
        )}
        {/*
          OYUNCU köyünün savunması KASTEN gizli: sunucu sur/hendek
          seviyesini yollamıyor. Öğrenmenin tek yolu izci göndermek —
          keşif birimini anlamlı kılan şey bu. Boş "0 / 0" satırı
          göstermek yanlış bilgi olurdu, onun yerine niye yok yazıyor.
        */}
        {v.kind === 'player' && !intel && (
          <Row k="Sur / hendek" v="bilinmiyor" c={C.textMute} />
        )}

        {ratio != null && (
          <div style={{
            marginTop: 6, paddingTop: 7, borderTop: `1px solid ${C.lineSoft}`,
            fontFamily: FONT.ui, fontSize: 9.5, lineHeight: 1.5,
            color: ratio > 1.2 ? C.danger : ratio < 0.7 ? C.good : C.warn,
          }}>
            {ratio > 1.2 ? `Ordusu senden ${ratio.toFixed(1)}× büyük — riskli hedef.`
              : ratio < 0.7 ? `Ordun ${(1 / ratio).toFixed(1)}× büyük — zayıf hedef.`
              : 'Kuvvetler yakın — sur bonusu belirleyici olur.'}
          </div>
        )}

        {/* Keşif verisi varsa özet — yoksa saldırı ekranı da tahmin yapamaz */}
        {intel && (
          <div style={{
            marginTop: 6, padding: '6px 8px', borderRadius: 5,
            background: 'rgba(143,220,255,0.07)', border: `1px solid ${C.lineSoft}`,
            fontFamily: FONT.ui, fontSize: 9.5, color: C.textDim, lineHeight: 1.5,
          }}>
            <span style={{ color: C.ice }}>Keşfedildi</span> · ordu {short(intel.armyTotal)} ·
            {' '}sur {intel.surLevel}/{intel.hendekLevel} ·
            {intel.kulePct ? <> {' '}kule +{intel.kulePct}% · </> : null}
            {' '}depo {short(Object.values(intel.resources || {}).reduce((a, b) => a + b, 0))}
          </div>
        )}

        {canAttack ? (
          <button onClick={onAttack}
            style={btn('danger', {
              width: '100%', marginTop: 8, padding: 8, letterSpacing: 1.4, fontSize: 10,
            })}>
            ORDU GÖNDER
          </button>
        ) : (
          <div style={{
            marginTop: 6, padding: '7px 8px', borderRadius: 5,
            background: 'rgba(143,220,255,0.06)', border: `1px solid ${C.lineSoft}`,
            fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, lineHeight: 1.5,
          }}>
            Bu köy hedef alınamaz.
          </div>
        )}
        {/* Oyuncu köyüne saldırıyorsa keşif uyarısı — savunması gizli */}
        {canAttack && v.kind === 'player' && !intel && (
          <div style={{
            marginTop: 6, fontFamily: FONT.ui, fontSize: 9, lineHeight: 1.5,
            color: C.textFaint,
          }}>
            Savunmasını bilmiyorsun. İzci gönderirsen suru, hendeği ve
            deposunu görürsün — ama onun izcileri de karşı çıkar, az izciyle
            gidersen bilgi gelmez.
          </div>
        )}
      </div>
    </div>
  );
}
