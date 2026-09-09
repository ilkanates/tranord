import { useMemo, useState } from 'react';
import VILLAGE_DEFS, { towerSlotBonus } from '../data/villageDefs';
import { C, FONT, RES_COLOR, btn, label as lbl, num, fmtTime, signed } from '../theme';
import { RES_LABEL, gameMinutesToRealSeconds, NO_WORKER_TYPES, workerTerm } from '../flows';
import Icon, { buildingIcon } from './Icons';
import WorkerAssign from './WorkerAssign';
import { popHeader, popCols, popCol } from './popoverStyle';

const CAT_LABEL = {
  isleme: 'İşleme', askeri: 'Askeri', depo: 'Depo',
  ekonomik: 'Ekonomik', nufus: 'Nüfus', savunma: 'Savunma',
};
const SLOT_LABEL = {
  sur:    'Sur',
  hendek: 'Hendek',
  kule:   'Kule Slotu',
  hex:    'Boş Arazi',
};

const CAT_ORDER = ['isleme', 'askeri', 'depo', 'nufus', 'ekonomik', 'savunma'];
const CAT_EDGE = {
  isleme: '#4ecfa8', askeri: '#7fb4ff', depo: '#a99cf0',
  ekonomik: '#d9c069', nufus: '#5fd8d0', savunma: '#e8636f',
};

// Personel atanabilen binalar. Kule de personel alır — ama adı OKÇU.
// Sur ve hendek hiç personel almaz (bkz. NO_WORKER_TYPES).
const WORKER_BUILDINGS = new Set(['silahci', 'zirh', 'ahir', 'kisla', 'atolye', 'kule']);
const TRAINERS = new Set(['kisla', 'ahir', 'atolye']);
const PRODUCERS = new Set(['silahci', 'zirh', 'ahir']);

/**
 * İnşa/yükseltme süresi — oyun DAKİKASI. Sunucudaki getVillageBuildMinutes ile
 * birebir aynı formül (yuvarlama yok); gösterirken realSecs ile gerçek
 * saniyeye çevrilir.
 */
function buildMinutes(type, level, workers) {
  const def = VILLAGE_DEFS[type];
  if (!def || !workers || workers <= 0) return Infinity;
  const work = def.buildBaseWork * Math.pow(def.buildMultiplier, Math.max(0, level - 1));
  return work / workers;
}

const capacityAt = (type, level) => {
  const def = VILLAGE_DEFS[type];
  if (!def?.baseCapacity) return null;
  return def.baseCapacity + (level - 1) * def.capacityPerLevel;
};

function Row({ k, v, c = C.frost, strong }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textDim }}>{k}</span>
      <span style={num({ fontSize: 10.5, color: c, fontWeight: strong ? 500 : 400, textAlign: 'right' })}>{v}</span>
    </div>
  );
}

function ColLabel({ children, icon, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {icon && <Icon name={icon} size={11} color={color || C.iceDeep} />}
      <span style={lbl({ fontSize: 8.5, letterSpacing: 1.4 })}>{children}</span>
    </div>
  );
}

function CostGrid({ cost, resources }) {
  if (!cost || !Object.keys(cost).length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
      {Object.entries(cost).map(([res, amt]) => {
        const have = Math.floor(resources[res] || 0);
        const ok = have >= amt;
        return (
          <div key={res} title={`${RES_LABEL[res] || res}: ${amt} gerekli, ${have} var`}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '2.5px 5px', borderRadius: 3,
              background: ok ? 'rgba(78,207,168,0.09)' : 'rgba(232,99,111,0.1)',
              border: `1px solid ${ok ? 'rgba(78,207,168,0.3)' : 'rgba(232,99,111,0.32)'}`,
            }}>
            <Icon name={res} size={11} color={RES_COLOR[res] || C.textDim} />
            <span style={num({ fontSize: 9.5, color: ok ? C.good : C.danger, flex: 1, textAlign: 'right' })}>
              {amt}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Binanın tek satırlık etkisi
function EffectStrip({ type, level, def, processingRates, flows }) {
  const proc = def?.processes;
  const rate = proc ? processingRates?.[proc.output] : null;

  if (proc) {
    const inNet = flows?.[proc.input]?.net;
    return (
      <div style={{
        padding: '6px 8px', borderRadius: 5,
        background: 'rgba(8,17,28,0.5)', border: `1px solid ${C.lineSoft}`,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon name={proc.input} size={13} color={RES_COLOR[proc.input]} />
          <span style={num({ fontSize: 9.5, color: C.warn })}>
            −{rate?.inputPerHour || 0}
          </span>
          <span style={{ color: C.textMute, fontSize: 11 }}>→</span>
          <Icon name={proc.output} size={13} color={RES_COLOR[proc.output]} />
          <span style={num({ fontSize: 9.5, color: C.good })}>
            +{rate?.outputPerHour || 0}
          </span>
          <span style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute, marginLeft: 'auto' }}>/sa</span>
        </div>
        {inNet !== undefined && (
          <Row k={`${RES_LABEL[proc.input]} net`} v={`${signed(inNet)}/sa`}
            c={inNet >= 0 ? C.good : C.danger} strong />
        )}
        {inNet < 0 && (
          <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.warn, lineHeight: 1.4 }}>
            Girdi tükeniyor — işçiyi azalt ya da üretim alanı ekle.
          </div>
        )}
      </div>
    );
  }

  const rows = [];
  if (def?.baseCapacity) rows.push(['Kapasite', `${capacityAt(type, level).toLocaleString('tr-TR')} → ${capacityAt(type, level + 1).toLocaleString('tr-TR')}`]);
  if (def?.populationPerLevel) rows.push(['Nüfus', `+${level * def.populationPerLevel} → +${(level + 1) * def.populationPerLevel}`]);
  if (def?.bonusPerLevel) rows.push([`${def.affects || 'Üretim'} bonusu`, `+%${level * def.bonusPerLevel}`]);
  if (def?.bonusTable) rows.push(['Savunma', `%${def.bonusTable[level] ?? 0} → %${def.bonusTable[level + 1] ?? 0}`]);
  if (type === 'ahir') rows.push(['At kapasitesi', `${level * (def?.horseCapPerLevel || 5)} → ${(level + 1) * (def?.horseCapPerLevel || 5)}`]);
  if (type === 'cephane') rows.push(['Ortak havuz', `${level * (def?.poolCapPerLevel || 200)} → ${(level + 1) * (def?.poolCapPerLevel || 200)}`]);

  if (!rows.length) return null;
  return (
    <div style={{
      padding: '6px 8px', borderRadius: 5,
      background: 'rgba(8,17,28,0.5)', border: `1px solid ${C.lineSoft}`,
      display: 'flex', flexDirection: 'column', gap: 3,
    }}>
      {rows.map(([k, v]) => <Row key={k} k={k} v={v} c={C.iceSoft} />)}
    </div>
  );
}

export default function BuildMenu({
  slotKey, building, isTower, slotKind = 'hex', isCenter,
  placedBuildings, freeWorkers, resources = {}, processingRates = {}, flows = {},
  onBuild, onUpgrade, onDemolish, onAssignVillageWorkers, onCancelBuild, onClose,
  hourSeconds = 3600, worldSpeed = 1,
  // Poster biçiminde başlık bina görselinin üstünde çiziliyor; burada tekrar etmesin
  posterHeader = false,
}) {
  // Oyun dakikası → gerçek saniye (sunucudaki geri sayımla aynı ölçek)
  const realSecs = (mins) => gameMinutesToRealSeconds(mins, hourSeconds, worldSpeed);

  const [buildWorkers, setBuildWorkers] = useState(1);
  const [upgradeWorkers, setUpgradeWorkers] = useState(1);
  // Savunma slotunda doğrudan savunma sekmesi açılsın
  const [cat, setCat] = useState(slotKind !== 'hex' ? 'savunma' : 'isleme');
  const [selectedType, setSelectedType] = useState(null);

  const builtTypes = useMemo(
    () => new Set(Object.values(placedBuildings).map(b => b.type)),
    [placedBuildings]
  );

  const def = building ? VILLAGE_DEFS[building.type] : null;
  const bcat = building?.type === 'anaBina' ? 'anaBina' : def?.category;
  const edge = CAT_EDGE[bcat] || C.ice;

  /**
   * Savunma yapıları köyün içinde hex kaplamıyor: sur köyü çevreliyor, hendek
   * surun dışında, kuleler surun altı köşesinde. Bu yüzden her savunma yapısı
   * YALNIZ kendi isimli slotuna, her savunma slotu da yalnız kendi yapısına
   * izin veriyor — sunucudaki canBuildAt ile aynı kural.
   */
  const canBuild = (key, d) => {
    if (key === 'anaBina') return false;
    const isDefenceSlot = slotKind !== 'hex';
    if (isDefenceSlot !== (key === slotKind)) return false;
    if (d.unique && builtTypes.has(key)) return false;
    if (key === 'kule') {
      const max = d.maxInstances || 6;
      return Object.values(placedBuildings).filter(b => b.type === 'kule').length < max;
    }
    return true;
  };
  const canAfford = (cost) => !cost || Object.entries(cost).every(([r, a]) => (resources[r] || 0) >= a);

  const grouped = useMemo(() => {
    const out = {};
    Object.entries(VILLAGE_DEFS).forEach(([k, d]) => {
      if (!canBuild(k, d)) return;
      (out[d.category] ||= []).push([k, d]);
    });
    return out;
  }, [builtTypes, slotKind, placedBuildings]);

  const cats = CAT_ORDER.filter(c => grouped[c]?.length);
  const activeCat = grouped[cat]?.length ? cat : (cats[0] || null);
  const list = grouped[activeCat] || [];

  const selDef = selectedType ? VILLAGE_DEFS[selectedType] : null;
  const affordable = selDef ? canAfford(selDef.cost) : false;
  const buildReady = affordable && freeWorkers >= 1;

  const upgradeCost = useMemo(() => {
    if (!building || !def?.upgradeCostBase) return null;
    const m = Math.pow(def.upgradeCostMultiplier || 1.5, building.level - 1);
    return Object.fromEntries(Object.entries(def.upgradeCostBase).map(([k, v]) => [k, Math.ceil(v * m)]));
  }, [building, def]);
  const upgradeReady = (!upgradeCost || canAfford(upgradeCost)) && freeWorkers >= 1;

  const title = building
    ? (building.type === 'anaBina' ? 'Ana Bina' : (def?.name || building.type))
    : SLOT_LABEL[slotKind] || SLOT_LABEL.hex;

  const maxW = building && def ? building.level * (def.workersPerLevel || 3) : 0;
  const hasWorkerSlot = building && building.level >= 1
    && !NO_WORKER_TYPES.has(building.type)
    && (def?.processes || WORKER_BUILDINGS.has(building.type)) && maxW > 0;
  // "İşçi" mi "Okçu" mu — yapıya göre
  const wTerm = building ? workerTerm(building.type) : 'İşçi';

  return (
    <div>
      {/* ── Başlık ── (poster biçiminde görselin üstünde) */}
      {!posterHeader && (
      <div style={popHeader}>
        <Icon name={building ? buildingIcon(building.type)
          : slotKind !== 'hex' ? buildingIcon(slotKind) : 'ekle'} size={19} color={edge} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT.head, fontSize: 15, fontWeight: 600, letterSpacing: 1.1,
            color: C.frost, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{title}</div>
          <div style={lbl({ fontSize: 8, marginTop: 1 })}>
            {building && !building.building
              ? `Lvl ${building.level}${def?.maxLevel ? `/${def.maxLevel}` : ''} · ${slotKey}`
              : `slot ${slotKey}`}
          </div>
        </div>

        {building && building.type !== 'anaBina' && !building.building && (
          <button onClick={onDemolish} title="Yık"
            style={{
              display: 'grid', placeItems: 'center', width: 26, height: 26, padding: 0,
              borderRadius: 4, cursor: 'pointer',
              background: 'rgba(74,29,36,0.55)', border: `1px solid ${C.dangerDim}`,
            }}>
            <Icon name="yik" size={15} color="#f0b8bd" strokeWidth={2.3} />
          </button>
        )}
        <button onClick={onClose} title="Kapat"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, display: 'grid' }}>
          <Icon name="kapat" size={13} color={C.textMute} />
        </button>
      </div>
      )}

      {/* ── İnşaat / yükseltme sürüyor ── */}
      {building?.building && (
        <div style={popCols('1fr', '1.05fr')}>
          {/* SOL — bina çalışmaya devam ediyor */}
          <div style={popCol}>
            {building.level >= 1 && hasWorkerSlot ? (
              <>
                <ColLabel icon={building.type === 'kule' ? 'kule' : 'isci'}>
                  {building.type === 'kule' ? 'Kuledeki okçu' : `Çalışan ${wTerm.toLowerCase()}`}
                </ColLabel>
                <WorkerAssign
                  mode="assign" value={building.workers || 0} max={maxW}
                  freeWorkers={freeWorkers} title="kadro"
                  onChange={(w) => onAssignVillageWorkers(w)}
                  effect={def?.processes
                    ? (w) => `+${(def.processes.outputPerHour * w).toFixed(0)} ${RES_LABEL[def.processes.output]}/sa`
                    : building.type === 'kule'
                      ? (w) => `${w} okçu · +${towerSlotBonus(building.level, w)}% savunma`
                    : (w) => `${w}× hız`} />
                <div style={{
                  display: 'flex', gap: 7, padding: '6px 8px', borderRadius: 5,
                  background: 'rgba(108,221,163,0.08)', border: '1px solid rgba(108,221,163,0.3)',
                }}>
                  <Icon name="artis" size={12} color={C.good} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: '#a8e8c8', lineHeight: 1.45 }}>
                    Yükseltme sırasında bina <strong>çalışmaya devam ediyor</strong>; üretim ve kapasite düşmüyor.
                  </span>
                </div>
              </>
            ) : building.level >= 1 ? (
              <>
                <ColLabel icon={buildingIcon(building.type)} color={edge}>Bina</ColLabel>
                <div style={{
                  display: 'flex', gap: 7, padding: '6px 8px', borderRadius: 5,
                  background: 'rgba(108,221,163,0.08)', border: '1px solid rgba(108,221,163,0.3)',
                }}>
                  <Icon name="artis" size={12} color={C.good} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: '#a8e8c8', lineHeight: 1.45 }}>
                    Yükseltme sırasında kapasite/bonus <strong>düşmüyor</strong> — Lvl {building.level} etkisi sürüyor.
                  </span>
                </div>
                <EffectStrip type={building.type} level={building.level} def={def}
                  processingRates={processingRates} flows={flows} />
              </>
            ) : (
              <>
                <ColLabel icon={buildingIcon(building.type)} color={edge}>İlk inşaat</ColLabel>
                <div style={{
                  display: 'flex', gap: 7, padding: '6px 8px', borderRadius: 5,
                  background: 'rgba(143,220,255,0.07)', border: `1px solid ${C.lineSoft}`,
                }}>
                  <Icon name="insaat" size={12} color={C.ice} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textDim, lineHeight: 1.45 }}>
                    {def?.description || 'Bina kuruluyor. Bitince işçi atayabilirsin.'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* SAĞ — ilerleme + iptal */}
          <div style={popCol}>
            <ColLabel icon="insaat">
              {building.level === 0 ? 'İnşa ediliyor' : `Lvl ${building.level} → ${building.level + 1}`}
            </ColLabel>
            <div style={{
              padding: '10px 11px', borderRadius: 5, textAlign: 'center',
              background: 'rgba(143,220,255,0.07)', border: `1px solid ${C.lineSoft}`,
            }}>
              <Icon name="insaat" size={18} color={C.ice} className="tn-pulse" />
              <div style={num({ fontSize: 22, color: C.frost, lineHeight: 1.2, marginTop: 3 })}>
                {building.buildTimeLeft}<span style={{ fontSize: 11, color: C.textFaint }}>sn</span>
              </div>
              <div style={lbl({ fontSize: 7.5, marginTop: 2 })}>
                {building.buildWorkers || 0} inşaat işçisi
              </div>
            </div>

            {(() => {
              const refund = building.level === 0 ? (def?.cost || {}) : (upgradeCost || {});
              if (!Object.keys(refund).length) return null;
              return (
                <div style={{
                  padding: '5px 7px', borderRadius: 4,
                  background: 'rgba(242,200,110,0.07)', border: '1px solid rgba(242,200,110,0.25)',
                }}>
                  <div style={lbl({ fontSize: 7.5, marginBottom: 3 })}>İptalde iade edilir</div>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {Object.entries(refund).map(([r, a]) => (
                      <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Icon name={r} size={10} color={RES_COLOR[r]} />
                        <span style={num({ fontSize: 9, color: C.goldSoft })}>{a}</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            <button onClick={() => onCancelBuild?.()}
              style={btn('danger', {
                width: '100%', padding: 8, letterSpacing: 1.2,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              })}>
              <Icon name="kapat" size={12} color="#ffb8bd" strokeWidth={2.2} />
              {building.level === 0 ? 'İNŞAATI İPTAL ET' : 'YÜKSELTMEYİ İPTAL ET'}
            </button>
          </div>
        </div>
      )}

      {/* ── Mevcut bina: SOL işçi · SAĞ yükseltme ── */}
      {building && !building.building && (
        <div style={popCols('1fr', '1.05fr')}>
          <div style={popCol}>
            {hasWorkerSlot ? (
              <>
                <ColLabel icon={building.type === 'kule' ? 'kule' : 'isci'}>
                  {building.type === 'kule' ? 'Kuledeki okçu' : `Çalışan ${wTerm.toLowerCase()}`}
                </ColLabel>
                <WorkerAssign
                  mode="assign" value={building.workers || 0} max={maxW}
                  freeWorkers={freeWorkers} title="kadro"
                  onChange={(w) => onAssignVillageWorkers(w)}
                  effect={def?.processes
                    ? (w) => `+${(def.processes.outputPerHour * w).toFixed(0)} ${RES_LABEL[def.processes.output]}/sa`
                    : building.type === 'kule'
                      ? (w) => `${w} okçu · +${towerSlotBonus(building.level, w)}% savunma`
                    : (w) => `${w}× hız`} />
              </>
            ) : (
              <>
                <ColLabel icon={buildingIcon(building.type)} color={edge}>Bina</ColLabel>
                <div style={{
                  padding: '7px 9px', borderRadius: 5,
                  background: 'rgba(8,17,28,0.5)', border: `1px solid ${C.lineSoft}`,
                  fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, lineHeight: 1.5,
                }}>
                  {def?.description
                    || (NO_WORKER_TYPES.has(building.type)
                      ? 'Bu yapı personel almaz.'
                      : 'İşçi gerektirmiyor.')}
                </div>
              </>
            )}
            <EffectStrip type={building.type} level={building.level} def={def}
              processingRates={processingRates} flows={flows} />
          </div>

          <div style={popCol}>
            {(!def?.maxLevel || building.level < def.maxLevel) ? (
              <>
                <ColLabel icon="insaat">Lvl {building.level + 1}’e yükselt</ColLabel>
                <CostGrid cost={upgradeCost} resources={resources} />
                <WorkerAssign mode="pick" min={1} max={Math.max(1, freeWorkers)} value={upgradeWorkers}
                  freeWorkers={freeWorkers} title="İnşaat işçisi" onChange={setUpgradeWorkers}
                  effect={(w) => `süre ${fmtTime(realSecs(buildMinutes(building.type, building.level + 1, w)))}`} />
                <button onClick={() => onUpgrade(upgradeWorkers)} disabled={!upgradeReady}
                  style={btn(upgradeReady ? 'good' : 'disabled', { width: '100%', padding: 8, letterSpacing: 1.2 })}>
                  YÜKSELT · {fmtTime(realSecs(buildMinutes(building.type, building.level + 1, upgradeWorkers)))}
                </button>
              </>
            ) : (
              <div style={{ padding: '20px 8px', textAlign: 'center', fontFamily: FONT.ui, fontSize: 11, color: C.textMute }}>
                Maksimum seviyede
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Boş slot: kategori + liste + detay ── */}
      {!building && !isCenter && (
        <>
          {cats.length > 1 && (
            <div style={{
              display: 'flex', gap: 4, padding: '9px 11px 0', flexWrap: 'wrap',
            }}>
              {cats.map(c => {
                const on = activeCat === c;
                return (
                  <button key={c} onClick={() => { setCat(c); setSelectedType(null); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                      fontFamily: FONT.ui, fontSize: 9.5,
                      background: on ? `${CAT_EDGE[c]}22` : 'rgba(8,17,28,0.5)',
                      border: `1px solid ${on ? CAT_EDGE[c] : C.lineSoft}`,
                      color: on ? C.frost : C.textFaint,
                    }}>
                    <span style={{ width: 6, height: 6, borderRadius: 2, background: CAT_EDGE[c] }} />
                    {CAT_LABEL[c]}
                    <span style={num({ fontSize: 8.5, color: C.textMute })}>{grouped[c].length}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div style={popCols('1fr', '1.05fr')}>
            <div style={popCol}>
              <ColLabel icon="koy" color={CAT_EDGE[activeCat]}>
                {CAT_LABEL[activeCat] || 'Binalar'}
              </ColLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {list.map(([key, d]) => {
                  const ok = canAfford(d.cost);
                  const on = selectedType === key;
                  return (
                    <button key={key} onClick={() => { setSelectedType(key); setBuildWorkers(1); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                        padding: '5px 7px', borderRadius: 4, cursor: 'pointer', textAlign: 'left',
                        background: on ? `${CAT_EDGE[activeCat]}22` : 'rgba(8,17,28,0.5)',
                        border: `1px solid ${on ? CAT_EDGE[activeCat] : C.lineSoft}`,
                        opacity: ok ? 1 : 0.6,
                      }}>
                      <Icon name={buildingIcon(key)} size={15}
                        color={ok ? CAT_EDGE[activeCat] : C.textMute} />
                      <span style={{
                        flex: 1, fontFamily: FONT.ui, fontSize: 10,
                        color: on ? C.frost : ok ? C.text : C.textFaint,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{d.name}</span>
                      {!ok && <Icon name="uyari" size={10} color={C.dangerDim} />}
                    </button>
                  );
                })}
                {!list.length && (
                  <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute, padding: '4px 2px' }}>
                    Bu kategoride inşa edilecek bina kalmadı.
                  </div>
                )}
              </div>
            </div>

            <div style={popCol}>
              {selDef ? (
                <>
                  <ColLabel icon={buildingIcon(selectedType)} color={CAT_EDGE[selDef.category]}>
                    {selDef.name}
                  </ColLabel>
                  <div style={{
                    fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, lineHeight: 1.45,
                    maxHeight: 42, overflow: 'hidden',
                  }}>{selDef.description}</div>
                  <CostGrid cost={selDef.cost} resources={resources} />
                  {selDef.processes && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 7px', borderRadius: 4,
                      background: 'rgba(8,17,28,0.5)', border: `1px solid ${C.lineSoft}`,
                    }}>
                      <Icon name={selDef.processes.input} size={12} color={RES_COLOR[selDef.processes.input]} />
                      <span style={num({ fontSize: 9.5, color: C.warn })}>−{selDef.processes.inputPerHour}</span>
                      <span style={{ color: C.textMute }}>→</span>
                      <Icon name={selDef.processes.output} size={12} color={RES_COLOR[selDef.processes.output]} />
                      <span style={num({ fontSize: 9.5, color: C.good })}>+{selDef.processes.outputPerHour}</span>
                      <span style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute, marginLeft: 'auto' }}>
                        /işçi/sa
                      </span>
                    </div>
                  )}
                  <WorkerAssign mode="pick" min={1} max={Math.max(1, freeWorkers)} value={buildWorkers}
                    freeWorkers={freeWorkers} title="İnşaat işçisi" onChange={setBuildWorkers}
                    effect={(w) => `süre ${fmtTime(realSecs(buildMinutes(selectedType, 1, w)))}`} />
                  <button onClick={() => { if (buildReady) onBuild(selectedType, buildWorkers); }}
                    disabled={!buildReady}
                    style={btn(buildReady ? 'good' : 'disabled', { width: '100%', padding: 8, letterSpacing: 1.2 })}>
                    İNŞA ET · {fmtTime(realSecs(buildMinutes(selectedType, 1, buildWorkers)))}
                  </button>
                </>
              ) : (
                <div style={{
                  display: 'grid', placeItems: 'center', minHeight: 120,
                  border: `1px dashed ${C.lineSoft}`, borderRadius: 5,
                  fontFamily: FONT.ui, fontSize: 10, color: C.textMute, textAlign: 'center', padding: 12,
                }}>
                  Soldan bir bina seç
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
