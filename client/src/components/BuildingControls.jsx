/**
 * BuildingControls — bir binanın İKİ denetimi: çalışan kadro ve yükseltme.
 *
 * Bunlar BuildMenu'nün gövdesinde iki sütunluk bir ızgaraydı; panel bu yüzden
 * kaydırma gerektiriyordu ve oyuncunun en sık dokunduğu iki denetim en altta
 * kalıyordu. Artık poster görselinin SAĞ ALTINA, tek satırlık cam bir şerit
 * olarak biniyor (layout="strip"). BuildMenu aynı bileşeni eski ızgara
 * düzeninde de kullanabiliyor (layout="grid") — tek tanım, iki yerleşim.
 *
 * Maliyet ve süre formülleri BuildMenu'dekiyle AYNI kaynaktan geliyor
 * (villageDefs.upgradeCostAt, buildMinutes) — ikinci bir doğruluk kaynağı yok.
 */
import { useState } from 'react';
import VILLAGE_DEFS, { towerSlotBonus, upgradeCostAt } from '../data/villageDefs';
import { C, FONT, btn, label as lbl, num, fmtTime } from '../theme';
import { RES_LABEL, NO_WORKER_TYPES, workerTerm, takesWorkers, maxWorkersOf,
  maxBuilders, gameMinutesToRealSeconds } from '../flows';
import { CostRow } from './mapPanels';
import WorkerAssign from './WorkerAssign';
import Icon from './Icons';

/** Sunucudaki getVillageBuildMinutes ile birebir aynı formül */
function buildMinutes(type, level, workers) {
  const def = VILLAGE_DEFS[type];
  if (!def || !workers || workers <= 0) return Infinity;
  const work = def.buildBaseWork * Math.pow(def.buildMultiplier, Math.max(0, level - 1));
  return work / workers;
}

function Etiket({ children, icon, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
      {icon && <Icon name={icon} size={9} color={color || C.iceDeep} />}
      <span style={lbl({ fontSize: 7.5, letterSpacing: 1.2 })}>{children}</span>
    </div>
  );
}

export default function BuildingControls({
  building, freeWorkers = 0, resources = {}, flows = {},
  hourSeconds = 3600, worldSpeed = 1,
  onAssignVillageWorkers, onUpgrade, onCancelBuild,
  layout = 'strip',
}) {
  const [upgradeWorkers, setUpgradeWorkers] = useState(1);
  if (!building) return null;

  const def = VILLAGE_DEFS[building.type];
  const maxW = maxWorkersOf(building.type, def, building.level);
  const kadroVar = building.level >= 1 && takesWorkers(building.type, def) && maxW > 0;
  const wTerm = workerTerm(building.type);

  const upgradeCost = upgradeCostAt(building.type, building.level);
  const yeter = !upgradeCost
    || Object.entries(upgradeCost).every(([r, a]) => (resources[r] || 0) >= a);
  const upgradeReady = yeter && freeWorkers >= 1;
  const sonSeviye = !!def?.maxLevel && building.level >= def.maxLevel;
  const realSecs = (m) => gameMinutesToRealSeconds(m, hourSeconds, worldSpeed);
  const sure = (w) => fmtTime(realSecs(buildMinutes(building.type, building.level + 1, w)));

  const serit = layout === 'strip';
  const kutu = serit ? {
    background: 'rgba(6,12,20,0.72)',
    border: `1px solid ${C.lineSoft}`,
    borderRadius: 6, padding: '6px 7px',
    backdropFilter: 'blur(10px) saturate(1.15)',
    WebkitBackdropFilter: 'blur(10px) saturate(1.15)',
    /*
      168 px'ti. Kaydırıcı + iki adım düğmesi o genişlikte ancak sığıyordu,
      0/½/TAM kısayollarına yer kalmıyordu (bu yüzden kompaktta gizliydiler).
      212 px üçünü de alt satıra sığdırıyor ve maliyet satırındaki sayılar
      da kısaltmaya uğramıyor.
    */
    width: 212,
    // Dar ekranda kutu sarmalayıcıdan taşmasın (bkz. VillageCenter · şerit)
    maxWidth: '100%',
  } : { minWidth: 0 };

  /**
   * BİNA İNŞA/YÜKSELTME HÂLİNDEYSE de aynı şerit çizilir.
   * Eskiden burada null dönülüyordu; denetimler BuildMenu'nün gövdesine
   * düşüyor ve panelin düzeni yükseltme sırasında tamamen değişiyordu.
   */
  if (building.building) {
    return (
      <div style={{
        display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: '100%',
        flexWrap: serit ? 'wrap' : 'nowrap', justifyContent: 'flex-end',
      }}>
        {kadroVar && (
          <div style={kutu}>
            <Etiket icon={building.type === 'kule' ? 'kule' : 'isci'}>
              {building.type === 'kule' ? 'Kuledeki okçu' : `Çalışan ${wTerm.toLowerCase()}`}
            </Etiket>
            <WorkerAssign
              compact={serit}
              mode="assign" value={building.workers || 0} max={maxW}
              freeWorkers={freeWorkers} title="kadro"
              onChange={(w) => onAssignVillageWorkers?.(w)}
              effect={def?.processes
                ? (w) => `+${(def.processes.outputPerHour * w).toFixed(0)} ${RES_LABEL[def.processes.output]}/sa`
                : building.type === 'kule'
                  ? (w) => `${w} okçu · +${towerSlotBonus(building.level, w)}% savunma`
                  : (w) => `${w}× hız`} />
          </div>
        )}

        <div style={kutu}>
          <Etiket icon="insaat">
            {building.level === 0 ? 'İnşa ediliyor' : `Lvl ${building.level} → ${building.level + 1}`}
          </Etiket>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 4 }}>
            <span style={num({ fontSize: 15, color: C.frost, lineHeight: 1.1 })}>
              {fmtTime(building.buildTimeLeft)}
            </span>
            <span style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute }}>
              {building.buildWorkers || 0} işçi
            </span>
          </div>
          <button onClick={() => onCancelBuild?.()}
            title={'İptalde kaynak iade edilir'}
            style={btn('danger', {
              width: '100%', padding: '4px 0', letterSpacing: 1, fontSize: 9,
            })}>
            {building.level === 0 ? 'İNŞAATI İPTAL' : 'YÜKSELTMEYİ İPTAL'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: '100%',
      flexWrap: serit ? 'wrap' : 'nowrap', justifyContent: 'flex-end',
    }}>
      {/* ── Çalışan kadro ── */}
      {kadroVar && (
        <div style={kutu}>
          <Etiket icon={building.type === 'kule' ? 'kule' : 'isci'}>
            {building.type === 'kule' ? 'Kuledeki okçu' : `Çalışan ${wTerm.toLowerCase()}`}
          </Etiket>
          <WorkerAssign
            compact={serit}
            mode="assign" value={building.workers || 0} max={maxW}
            freeWorkers={freeWorkers} title="kadro"
            onChange={(w) => onAssignVillageWorkers?.(w)}
            effect={def?.processes
              ? (w) => `+${(def.processes.outputPerHour * w).toFixed(0)} ${RES_LABEL[def.processes.output]}/sa`
              : building.type === 'kule'
                ? (w) => `${w} okçu · +${towerSlotBonus(building.level, w)}% savunma`
                : (w) => `${w}× hız`} />
        </div>
      )}

      {/* ── Seviye atlatma kadrosu + düğme ── */}
      <div style={kutu}>
        {sonSeviye ? (
          <div style={{
            fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute,
            padding: '4px 2px', textAlign: 'center',
          }}>
            Maksimum seviyede
          </div>
        ) : (
          <>
            <Etiket icon="insaat">Lvl {building.level + 1}’e yükselt</Etiket>
            <CostRow cost={upgradeCost} resources={resources} flows={flows}
              hourSeconds={hourSeconds} worldSpeed={worldSpeed} />
            <div style={{ marginTop: 4 }}>
              <WorkerAssign compact={serit} mode="pick" min={1}
                max={Math.max(1, Math.min(freeWorkers, maxBuilders(building.level)))}
                value={upgradeWorkers} freeWorkers={freeWorkers}
                title="İnşaatçı" onChange={setUpgradeWorkers}
                effect={(w) => sure(w)} />
            </div>
            <button data-tut="yukselt" onClick={() => onUpgrade?.(upgradeWorkers)} disabled={!upgradeReady}
              style={btn(upgradeReady ? 'good' : 'disabled', {
                width: '100%', marginTop: 4, padding: '4px 0', letterSpacing: 1, fontSize: 9.5,
              })}>
              YÜKSELT · {sure(upgradeWorkers)}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
