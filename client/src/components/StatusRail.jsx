/**
 * StatusRail — sağ kenar. Nüfus en üstte, ekipman ve ordu altında.
 * Tamamı tek ekrana sığar (scroll yok), zeminler yarı saydam.
 */
import { memo, useState } from 'react';
import { C, FONT, label as lbl, num, fmtTime } from '../theme';
import { EQ_LABEL, RES_LABEL, gameHoursToRealSeconds } from '../flows';
import Icon, { buildingIcon } from './Icons';
import { useHoverable } from '../responsive';

// Ortak havuzu paylaşan türler (at ayrı: ahır deposu)
const POOL_KEYS = ['kilic', 'mizrak', 'kalkan', 'zirh'];

const glass = (extra = {}) => ({
  borderRadius: 7,
  background: 'rgba(12, 20, 28, 0.34)',
  border: `1px solid ${C.lineSoft}`,
  backdropFilter: 'blur(15px) saturate(1.25)',
  WebkitBackdropFilter: 'blur(15px) saturate(1.25)',
  ...extra,
});

/**
 * KATLANABILIR BLOK BASLIGI
 *
 * Sag ray dort blok tasiyor (nufus, insaat, ekipman, ordu) ve hepsi birden
 * ekrani doldurabiliyor. Basliga tiklayinca blok kapanir; kapaliyken bile
 * ozet sayi gorunur, boylece bilgi kaybi olmaz. Secim tarayicida saklanir.
 */
const COLLAPSE_KEY = 'tn.rail.collapsed';

function readCollapsed() {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    const o = raw ? JSON.parse(raw) : null;
    return (o && typeof o === 'object') ? o : {};
  } catch { return {}; }
}

function useCollapse() {
  const [state, setState] = useState(readCollapsed);
  const toggle = (key) => setState(prev => {
    const next = { ...prev, [key]: !prev[key] };
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next)); } catch { /* yoksay */ }
    return next;
  });
  return [state, toggle];
}

/** Blok basligi — tiklanabilir, sagda ozet + katlanma oku */
function RailHead({
  icon, iconColor = C.iceDeep, iconClass, title, summary, summaryColor = C.iceSoft,
  collapsed, onToggle, pad = '0 7px 3px',
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      role="button" tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      title={collapsed ? `${title} — aç` : `${title} — kapat`}
      style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: pad,
        cursor: 'pointer', userSelect: 'none', borderRadius: 4,
        background: hov ? 'rgba(127,212,255,0.07)' : 'transparent',
        transition: 'background .14s',
      }}
    >
      <Icon name={icon} size={10} color={iconColor} className={collapsed ? undefined : iconClass} />
      <span style={lbl({ fontSize: 7.5, letterSpacing: 1.3, flex: 1 })}>{title}</span>
      {summary != null && (
        <span style={num({ fontSize: 9.5, color: summaryColor })}>{summary}</span>
      )}
      {/* katlanma oku — kapalıda sağa, açıkta aşağı */}
      <svg width="9" height="9" viewBox="0 0 12 12" style={{
        flexShrink: 0, opacity: hov ? 0.95 : 0.5,
        transform: collapsed ? 'rotate(-90deg)' : 'none',
        transition: 'transform .16s, opacity .14s',
      }}>
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke={C.iceSoft}
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Bar({ pct, color, danger }) {
  return (
    <div style={{ height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.09)', overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 1,
        width: `${Math.max(0, Math.min(100, (pct || 0) * 100)).toFixed(1)}%`,
        background: danger ? C.danger : color,
        transition: 'width .35s ease-out',
      }} />
    </div>
  );
}

function Tip({ at, title, icon, rows, note, sheet = false }) {
  return (
    <div style={sheet ? {
      /* Dokunmatik: imlecin yaninda degil ekranin ortasinda; perde kapatir */
      position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
      width: 'min(300px, 92vw)', maxHeight: '82vh', overflowY: 'auto', padding: 13,
      background: 'linear-gradient(180deg, rgba(13,26,42,0.98), rgba(9,18,30,0.98))',
      border: `1px solid ${C.lineBright}`, borderRadius: 10,
      boxShadow: '0 18px 50px rgba(0,0,0,.65)',
      zIndex: 9200, pointerEvents: 'none',
    } : {
      position: 'fixed', left: at.x, top: at.y, width: 224, padding: 11,
      background: 'linear-gradient(180deg, rgba(13,26,42,0.9), rgba(9,18,30,0.9))',
      border: `1px solid ${C.lineBright}`, borderRadius: 8,
      backdropFilter: 'blur(18px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
      boxShadow: '0 12px 40px rgba(0,0,0,.55)',
      zIndex: 900, pointerEvents: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        {icon && <Icon name={icon} size={16} color={C.ice} />}
        <span style={{ fontFamily: FONT.head, fontSize: 13.5, fontWeight: 600, color: C.frost, letterSpacing: 0.6 }}>
          {title}
        </span>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '2px 0' }}>
          <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textDim }}>{r.k}</span>
          <span style={num({ fontSize: 10.5, color: r.c || C.frost, textAlign: 'right' })}>{r.v}</span>
        </div>
      ))}
      {note && (
        <div style={{
          marginTop: 7, paddingTop: 6, borderTop: `1px solid ${C.lineSoft}`,
          fontFamily: FONT.ui, fontSize: 9, color: C.textFaint, lineHeight: 1.5,
        }}>{note}</div>
      )}
    </div>
  );
}

function StatusRail({
  population = 0, maxPopulation = 0, freeWorkers = 0, civilians = null,
  populationGrowthRate = 0, isStarving = false,
  consumption = {}, equipment = {}, equipmentCaps = {},
  equipmentPool = { capacity: 0, used: 0, free: 0 },
  buildQueue = [], onCancelBuild,
  army = {}, unitDefs = {}, tickMs = 1000,
  populationPerHour = 0, hourSeconds = 3600, worldSpeed = 1,
  culture = null, festival = null,
  mobile = false, railW = 186,
}) {
  const [tip, setTip] = useState(null);
  const hoverable = useHoverable();

  /**
   * İpucu kutusu. Dokunmatik ekranda `mouseenter` parmak değince ateşleniyor
   * ama `mouseleave` HİÇ gelmiyor: kutu ekranda asılı kalıyordu. Orada kutu
   * ekranın ortasında açılıyor ve arkasındaki perdeye dokununca kapanıyor.
   */
  const place = (e, payload) => {
    if (!hoverable) { setTip({ ...payload, at: { x: 0, y: 0 }, sheet: true }); return; }
    const w = 224, h = 230;
    let x = (e.clientX || 0) - w - 14;
    let y = (e.clientY || 0) - 30;
    if (x < 8) x = (e.clientX || 0) + 14;
    if (y + h > window.innerHeight - 8) y = window.innerHeight - h - 8;
    if (y < 8) y = 8;
    setTip({ ...payload, at: { x, y } });
  };

  /**
   * Ev tavanı yalnız SİVİLLERİ sınırlıyor (asker evden çıkıp kışlaya gider),
   * bu yüzden büyük rakam ve çubuk sivil sayısını gösteriyor. Toplam nüfus
   * ipucu kutusunda duruyor. `civilians` eski sunucudan gelmezse toplamdan
   * hesaplanır.
   */
  const armyTot = Object.values(army).reduce((a, b) => a + (b || 0), 0);
  const sivil = civilians != null ? civilians : Math.max(0, population - armyTot);
  const popPct = maxPopulation > 0 ? sivil / maxPopulation : 0;
  const busy = Math.max(0, population - freeWorkers - armyTot);
  const tavanda = sivil >= maxPopulation;
  /**
   * +1 nüfus için kalan gerçek süre. Eskiden `tickMs * 10 / 1000` idi —
   * tick sayısına dayalı eski kuraldan kalmış, gerçek hızla ilgisi yoktu.
   * Hız artık ana bina seviyesinden geliyor (sunucu populationPerHour
   * gönderiyor) ve oyun saati → gerçek saniye çevirisi tek yerden.
   */
  const growSecs = populationPerHour > 0
    ? gameHoursToRealSeconds(1 / populationPerHour, hourSeconds, worldSpeed)
    : Infinity;
  const [fold, toggleFold] = useCollapse();
  const armyList = Object.entries(army).filter(([, n]) => n > 0);

  return (
    <>
      <div style={{
        width: mobile ? '100%' : railW, flexShrink: 0, zIndex: 5,
        display: 'flex', flexDirection: 'column', gap: 5,
        padding: '7px 7px 7px 5px',
        /* Telefonda çekmece kaydırıyor; masaüstünde her şey sığar */
        overflow: mobile ? 'visible' : 'hidden',
      }}>

        {/* ══ NÜFUS ══ */}
        <div
          onMouseEnter={(e) => place(e, {
            title: 'Nüfus', icon: 'nufus',
            rows: [
              { k: 'Siviller', v: `${sivil} / ${maxPopulation}`, c: tavanda ? C.warn : C.frost },
              { k: 'Çalışan', v: busy, c: C.iceSoft },
              { k: 'Boşta', v: freeWorkers, c: freeWorkers > 0 ? C.good : C.warn },
              { k: 'Asker', v: armyTot, c: armyTot ? C.iceSoft : C.textMute },
              { k: 'Toplam', v: population },
              { k: 'Yiyecek', v: `−${(consumption.foodPerHour || 0).toFixed(1)}/sa`, c: C.warn },
              ...(consumption.horses
                ? [{ k: 'At (tahıl)', v: `−${(consumption.grainPerHour || 0).toFixed(1)}/sa`, c: C.warn }]
                : []),
            ],
            note: isStarving
              ? 'Açlık sürüyor: nüfus artmıyor ve kayıp veriyorsun. Fırına işçi ata.'
              : tavanda
                ? 'Sivil nüfus tavanda. EV inşa et — ya da işçileri askere al:'
                  + ' asker tavana sayılmaz, yeri boşalır ve nüfus yerini doldurur.'
                : `+${populationPerHour.toFixed(1)} nüfus/saat (ana bina seviyesi)`
                  + ` — her ${fmtTime(growSecs)} içinde 1 kişi. Tavanı EV belirler,`
                  + ' asker tavana sayılmaz.',
          })}
          onMouseMove={(e) => tip && place(e, tip)}
          onMouseLeave={() => setTip(null)}
          style={glass({
            padding: '7px 9px', cursor: 'help', flexShrink: 0,
            background: isStarving ? 'rgba(52, 14, 20, 0.42)' : 'rgba(12, 20, 28, 0.34)',
            border: `1px solid ${isStarving ? C.dangerDim : C.lineBright}`,
          })}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <Icon name="nufus" size={12} color={isStarving ? C.danger : C.ice} />
            <span style={lbl({ flex: 1, fontSize: 8, letterSpacing: 1.5 })}>Nüfus</span>
            {isStarving
              ? <Icon name="uyari" size={12} color={C.danger} className="tn-pulse" />
              : populationGrowthRate > 0
                ? <Icon name="artis" size={11} color={C.good} strokeWidth={2.2} />
                : <Icon name="kilit" size={11} color={C.textMute} />}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={num({ fontSize: 24, lineHeight: 1, color: C.frost, fontWeight: 500 })}>
              {sivil}
            </span>
            <span style={num({ fontSize: 11, color: C.textFaint })}>/ {maxPopulation}</span>
            {armyTot > 0 && (
              <span style={num({ fontSize: 9.5, color: C.textMute, marginLeft: 'auto' })}
                title={`${population} toplam (${sivil} sivil + ${armyTot} asker)`}>
                +{armyTot} asker
              </span>
            )}
          </div>

          <div style={{ marginTop: 5 }}>
            <Bar pct={popPct} color={C.iceDeep} danger={isStarving} />
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={lbl({ fontSize: 7.5 })}>Boşta</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Icon name="isci" size={11} color={freeWorkers > 0 ? C.good : C.warn} />
                <span style={num({ fontSize: 14, color: freeWorkers > 0 ? C.good : C.warn, fontWeight: 500 })}>
                  {freeWorkers}
                </span>
              </div>
            </div>
            <div style={{ width: 1, background: C.lineSoft }} />
            <div style={{ flex: 1 }}>
              <div style={lbl({ fontSize: 7.5 })}>Asker</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Icon name="ordu" size={11} color={armyTot ? C.iceSoft : C.textMute} />
                <span style={num({ fontSize: 14, color: armyTot ? C.iceSoft : C.textMute, fontWeight: 500 })}>
                  {armyTot}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ══ KÜLTÜR PUANI ══
          * Yeni köy kurma hakkının ölçüsü. Sıradaki eşiğe ne kadar kaldığı ve
          * neyin engellediği (kültür puanı mı, köşk/saray seviyesi mi) burada
          * görünüyor — oyuncu "neden köy kuramıyorum" sorusunu buradan çözer.
          */}
        {culture && (
          <div
            onMouseEnter={(e) => place(e, {
              title: 'Kültür puanı', icon: 'kultur',
              rows: [
                { k: 'Toplam', v: Math.floor(culture.points || 0) },
                { k: 'Üretim', v: `+${culture.cpPerDay || 0}/gün`, c: C.good },
                { k: 'Sıradaki eşik', v: culture.cpNext || 0 },
                { k: 'Kalan', v: culture.cpMissing || 0,
                  c: culture.cpMissing > 0 ? C.warn : C.good },
                { k: 'Köy', v: `${culture.owned} / ${culture.allowed}` },
                { k: 'Köşk-saray hakkı', v: culture.slots || 0 },
              ],
              note: culture.blockedBy === 'yok'
                ? 'Yeni köy kurabilirsin — köşk ya da saraydan göçmen çıkar.'
                : culture.blockedBy === 'kultur'
                  ? `Kültür puanı yetmiyor: ${culture.cpMissing} puan daha`
                    + (isFinite(culture.daysToNext) ? ` (~${culture.daysToNext} gün)` : '')
                    + '. Taverna\'da şölen düzenlemek hızlandırır.'
                  : culture.blockedBy === 'bina'
                    ? 'Kültür puanı yeterli ama köy hakkı yok: köşkü Lvl 10/20\'ye ya da sarayı Lvl 10/15/20\'ye çıkar.'
                    : 'Hem kültür puanı hem köşk/saray seviyesi gerekiyor.',
            })}
            onMouseMove={(e) => tip && place(e, tip)}
            onMouseLeave={() => setTip(null)}
            style={glass({ padding: '6px 9px', cursor: 'help', flexShrink: 0 })}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <Icon name="kultur" size={10} color={C.iceDeep} />
              <span style={lbl({ fontSize: 7.5, letterSpacing: 1.3, flex: 1 })}>Kültür</span>
              <span style={num({ fontSize: 11, color: C.frost })}>
                {Math.floor(culture.points || 0)}
              </span>
              <span style={num({ fontSize: 8.5, color: C.textMute })}>
                /{culture.cpNext || 0}
              </span>
            </div>
            <Bar
              pct={culture.cpNext > 0 ? (culture.points || 0) / culture.cpNext : 0}
              color={culture.blockedBy === 'yok' ? C.good : C.iceDeep} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 3 }}>
              <span style={num({ fontSize: 8.5, color: C.good })}>
                +{culture.cpPerDay || 0}/gün
              </span>
              <span style={num({ fontSize: 8.5, color: C.textFaint, marginLeft: 'auto' })}>
                köy {culture.owned}/{culture.allowed}
              </span>
            </div>
            {festival && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Icon name="solen" size={9} color={C.warn} className="tn-pulse" />
                <span style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.warn, flex: 1 }}>
                  {festival.label}
                </span>
                <span style={num({ fontSize: 8.5, color: C.warn })}>
                  {fmtTime(festival.timeLeft)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ══ İNŞAAT / YÜKSELTME LİSTESİ ══ */}
        {buildQueue.length > 0 && (
          <div style={glass({ padding: '5px 3px 6px', flexShrink: 0 })}>
            <RailHead icon="insaat" iconColor={C.ice} iconClass="tn-pulse"
              title="İnşaat" summary={buildQueue.length} summaryColor={C.ice}
              collapsed={!!fold.insaat} onToggle={() => toggleFold('insaat')} />

            {!fold.insaat && buildQueue.slice(0, 4).map((it) => {
              const isNew = it.kind === 'build';
              return (
                <div key={`${it.area}:${it.slotKey}`}
                  onMouseEnter={(e) => place(e, {
                    title: it.name, icon: it.area === 'production' ? it.type : buildingIcon(it.type),
                    rows: [
                      { k: 'İşlem', v: isNew ? 'İlk inşaat' : `Lvl ${it.fromLevel} → ${it.toLevel}`,
                        c: isNew ? C.ice : C.good },
                      { k: 'Kalan süre', v: fmtTime(it.timeLeft) },
                      { k: 'İnşaat işçisi', v: it.workers },
                      { k: 'Slot', v: `${it.area === 'production' ? 'harita' : 'köy'} ${it.slotKey}` },
                      ...Object.entries(it.refund || {}).map(([r, a]) => ({
                        k: `iade: ${RES_LABEL[r] || r}`, v: a, c: C.goldSoft,
                      })),
                    ],
                    note: isNew
                      ? 'İptal edersen bina kaldırılır, harcanan kaynak ve işçi tam iade edilir.'
                      : 'Bina bu sırada ÇALIŞMAYA DEVAM EDİYOR. İptalde kaynak ve işçi tam iade edilir, seviye korunur.',
                  })}
                  onMouseMove={(e) => tip && place(e, tip)}
                  onMouseLeave={() => setTip(null)}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(127,212,255,0.09)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  style={{
                    padding: '3px 6px 4px', borderRadius: 4, cursor: 'help',
                    transition: 'background .12s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Icon name={it.area === 'production' ? it.type : buildingIcon(it.type)}
                      size={12} color={isNew ? C.ice : C.good} />
                    <span style={{
                      flex: 1, minWidth: 0, fontFamily: FONT.ui, fontSize: 9.5, color: C.textDim,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {it.name}
                    </span>
                    <span style={num({ fontSize: 8.5, color: isNew ? C.ice : C.good })}>
                      {isNew ? 'yeni' : `L${it.toLevel}`}
                    </span>
                    <span style={num({ fontSize: 10.5, color: C.frost, minWidth: 30, textAlign: 'right' })}>
                      {fmtTime(it.timeLeft)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onCancelBuild?.(it); }}
                      title={isNew ? 'İnşaatı iptal et (tam iade)' : 'Yükseltmeyi iptal et (tam iade)'}
                      style={{
                        width: 16, height: 16, flexShrink: 0, padding: 0, display: 'grid',
                        placeItems: 'center', borderRadius: 3, cursor: 'pointer',
                        background: 'rgba(120,50,58,0.5)', border: `1px solid ${C.dangerDim}`,
                      }}>
                      <Icon name="kapat" size={8} color="#ffb8bd" strokeWidth={2.4} />
                    </button>
                  </div>
                  <div style={{ marginTop: 2, marginLeft: 17 }}>
                    <Bar
                      pct={it.totalSeconds > 0
                        ? Math.max(0.03, Math.min(1, 1 - it.timeLeft / it.totalSeconds))
                        : 0.5}
                      color={isNew ? C.iceDeep : C.goodDim} />
                  </div>
                </div>
              );
            })}
            {!fold.insaat && buildQueue.length > 4 && (
              <div style={{ padding: '2px 7px', fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute }}>
                +{buildQueue.length - 4} tane daha
              </div>
            )}
          </div>
        )}

        {/* ══ EKİPMAN — kılıç/mızrak/kalkan/zırh ORTAK havuz ══ */}
        {(() => {
          const poolCap  = equipmentPool.capacity || 0;
          const poolUsed = equipmentPool.used || 0;
          const poolFree = Math.max(0, poolCap - poolUsed);
          const poolPct  = poolCap > 0 ? Math.min(1, poolUsed / poolCap) : 0;
          const poolFull = poolCap > 0 && poolFree <= 0;
          const atCap    = equipmentCaps.at ?? 0;
          const atVal    = equipment.at || 0;
          const atFull   = atCap > 0 && atVal >= atCap;

          return (
            <div style={glass({ padding: '5px 3px 6px', flexShrink: 0 })}>
              {/* Havuz başlığı + bar */}
              <div
                onMouseEnter={(e) => place(e, {
                  title: 'Ekipman havuzu', icon: 'cephane',
                  rows: [
                    { k: 'Kullanılan', v: `${poolUsed} / ${poolCap}`, c: poolFull ? C.danger : C.frost },
                    { k: 'Boş yer', v: poolFree, c: poolFree > 0 ? C.good : C.danger },
                    ...POOL_KEYS.map(k => ({ k: EQ_LABEL[k], v: equipment[k] || 0 })),
                  ],
                  note: poolCap <= 80
                    ? 'Cephanelik yok — havuz 80 ile sınırlı. Cephanelik her seviyede +200 yer katar.'
                    : poolFull
                      ? 'Havuz dolu: siparişler bekler, biten parça ziyan olur. Asker eğitip stok boşalt ya da cephaneliği yükselt.'
                      : 'Kılıç, mızrak, kalkan ve zırh aynı havuzu paylaşır — istediğin türe yığabilirsin.',
                })}
                onMouseMove={(e) => tip && place(e, tip)}
                onMouseLeave={() => setTip(null)}
                onClick={() => toggleFold('ekipman')}
                title={fold.ekipman ? 'Ekipman — aç' : 'Ekipman — kapat'}
                style={{ padding: '0 7px 4px', cursor: 'pointer', userSelect: 'none' }}
              >
                {/* Havuz barı kapalıyken de görünür — özet bilgi kaybolmasın */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <Icon name="cephane" size={10} color={poolFull ? C.warn : C.iceDeep} />
                  <span style={lbl({ fontSize: 7.5, letterSpacing: 1.3, flex: 1 })}>Ekipman havuzu</span>
                  <span style={num({ fontSize: 10, color: poolFull ? C.warn : C.frost })}>
                    {poolUsed}<span style={{ color: C.textMute }}>/{poolCap}</span>
                  </span>
                  <svg width="9" height="9" viewBox="0 0 12 12" style={{
                    flexShrink: 0, opacity: 0.55,
                    transform: fold.ekipman ? 'rotate(-90deg)' : 'none',
                    transition: 'transform .16s',
                  }}>
                    <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke={C.iceSoft}
                      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <Bar pct={poolPct} color={C.iceDeep} danger={poolFull} />
              </div>

              {/* Havuzdaki türler — kapasite paylaşımlı, tek tek sınır yok */}
              {!fold.ekipman && POOL_KEYS.map(k => {
                const val = equipment[k] || 0;
                const share = poolCap > 0 ? val / poolCap : 0;
                return (
                  <div key={k}
                    onMouseEnter={(e) => place(e, {
                      title: EQ_LABEL[k], icon: k,
                      rows: [
                        { k: 'Stok', v: val },
                        { k: 'Havuz payı', v: poolCap > 0 ? `%${Math.round(share * 100)}` : '—' },
                        { k: 'Havuz', v: `${poolUsed} / ${poolCap}`, c: poolFull ? C.danger : C.frost },
                      ],
                      note: poolFull
                        ? 'Havuz dolu — bu türden de üretim duruyor.'
                        : `Havuzda ${poolFree} yer boş. Bu türe ayrı bir sınır yok.`,
                    })}
                    onMouseMove={(e) => tip && place(e, tip)}
                    onMouseLeave={() => setTip(null)}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(127,212,255,0.09)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    style={{
                      padding: '2px 6px 3px', borderRadius: 4, cursor: 'help',
                      opacity: val === 0 ? 0.5 : 1, transition: 'background .12s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon name={k} size={13} color={poolFull ? C.warn : C.textDim} />
                      <span style={{ flex: 1, fontFamily: FONT.ui, fontSize: 9.5, color: C.textDim }}>
                        {EQ_LABEL[k]}
                      </span>
                      <span style={num({ fontSize: 11.5, color: poolFull ? C.warn : C.frost, fontWeight: 500 })}>
                        {val}
                      </span>
                    </div>
                    <div style={{ marginTop: 2, marginLeft: 19 }}>
                      <Bar pct={share} color={C.iceDeep} danger={poolFull} />
                    </div>
                  </div>
                );
              })}

              {/* At — ayrı depo (ahır) */}
              {!fold.ekipman && (
              <div style={{ height: 1, background: C.lineSoft, margin: '4px 7px 3px' }} />
              )}
              {!fold.ekipman && (
              <div
                onMouseEnter={(e) => place(e, {
                  title: 'At', icon: 'at',
                  rows: [
                    { k: 'Stok', v: `${atVal} / ${atCap}` },
                    { k: 'Doluluk', v: atCap > 0 ? `%${Math.round((atVal / atCap) * 100)}` : '—',
                      c: atFull ? C.danger : C.frost },
                  ],
                  note: atCap === 0
                    ? 'Ahır yok — at üretilemez.'
                    : 'At ekipman havuzuna girmez; kapasitesi ahır seviyesi × 5 ile sınırlı. Her süvari 1 at tüketir.',
                })}
                onMouseMove={(e) => tip && place(e, tip)}
                onMouseLeave={() => setTip(null)}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(127,212,255,0.09)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                style={{
                  padding: '2px 6px 3px', borderRadius: 4, cursor: 'help',
                  opacity: atVal === 0 && atCap === 0 ? 0.42 : 1, transition: 'background .12s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="at" size={13} color={atFull ? C.warn : C.textDim} />
                  <span style={{ flex: 1, fontFamily: FONT.ui, fontSize: 9.5, color: C.textDim }}>At</span>
                  <span style={num({ fontSize: 11.5, color: atFull ? C.warn : C.frost, fontWeight: 500 })}>
                    {atVal}
                  </span>
                  <span style={num({ fontSize: 8.5, color: C.textMute, minWidth: 26, textAlign: 'right' })}>
                    /{atCap}
                  </span>
                </div>
                <div style={{ marginTop: 2, marginLeft: 19 }}>
                  <Bar pct={atCap > 0 ? Math.min(1, atVal / atCap) : 0} color={C.iceDeep} danger={atFull} />
                </div>
              </div>
              )}
            </div>
          );
        })()}

        {/* ══ ORDU ══ */}
        {armyTot > 0 && (
          <div style={glass({
            padding: '4px 3px 5px', minHeight: 0, overflow: 'hidden',
            flexShrink: fold.ordu ? 0 : 1,
            // Başlık sabit kalsın, liste kendi içinde kaysın
            display: 'flex', flexDirection: 'column',
          })}>
            <RailHead icon="ordu" title="Ordu" summary={armyTot} pad="0 7px 2px"
              collapsed={!!fold.ordu} onToggle={() => toggleFold('ordu')} />
            {/* Tüm birlikler listelenir; sığmazsa blok kendi içinde kayar */}
            {!fold.ordu && (
            <div className="tn-scroll" style={{ overflowY: 'auto', minHeight: 0 }}>
            {armyList.map(([type, n]) => {
              const d = unitDefs[type];
              const cav = d?.category === 'suvari';
              return (
                <div key={type}
                  onMouseEnter={(e) => place(e, {
                    title: d?.name || type, icon: cav ? 'at' : 'kalkan',
                    rows: [
                      { k: 'Sayı', v: n },
                      { k: 'Sınıf', v: d?.category || '—' },
                      { k: 'Saldırı', v: d?.stats?.saldiri ?? '—', c: C.danger },
                      { k: 'Yaya sav.', v: d?.stats?.yayaSav ?? '—', c: C.good },
                      { k: 'Atlı sav.', v: d?.stats?.atliSav ?? '—', c: C.good },
                      { k: 'Hız', v: d?.stats?.hiz ?? '—' },
                    ],
                    note: `Birlik gücü: ${((d?.stats?.saldiri || 0) * n).toLocaleString('tr-TR')} saldırı`,
                  })}
                  onMouseMove={(e) => tip && place(e, tip)}
                  onMouseLeave={() => setTip(null)}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(127,212,255,0.09)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  style={{
                    padding: '2.5px 6px', borderRadius: 4, cursor: 'help',
                    display: 'flex', gap: 6, alignItems: 'center', transition: 'background .12s',
                  }}
                >
                  <Icon name={cav ? 'at' : 'kalkan'} size={11} color={C.textFaint} />
                  <span style={{
                    flex: 1, fontFamily: FONT.ui, fontSize: 9.5, color: C.textDim,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {d?.name || type}
                  </span>
                  <span style={num({ fontSize: 11.5, color: C.frost })}>{n}</span>
                </div>
              );
            })}
            </div>
            )}
          </div>
        )}
      </div>

      {/* Dokunmatikte perde: ipucunun dışına dokununca kapanır */}
      {tip?.sheet && (
        <div onClick={() => setTip(null)} style={{
          position: 'fixed', inset: 0, zIndex: 9150, background: 'rgba(0,0,0,0.5)',
        }} />
      )}
      {tip && <Tip {...tip} />}
    </>
  );
}

export default memo(StatusRail);
