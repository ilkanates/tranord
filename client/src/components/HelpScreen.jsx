/**
 * HelpScreen — YARDIM / ANSİKLOPEDİ
 *
 * İçerik ELLE YAZILMIYOR: bütün sayılar tanım dosyalarından ve sunucudan gelen
 * payload'dan türetiliyor (villageDefs, buildingDefs, unitDefs, equipmentDefs).
 * Böylece bir değeri kodda değiştirdiğinde yardım sayfası kendiliğinden
 * güncelleniyor — ikinci bir doğruluk kaynağı oluşmuyor.
 *
 * Bina panelindeki "?" düğmesi buraya `topic` ile giriyor (örn. 'bina:kisla').
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import VILLAGE_DEFS, {
  SUR_BONUS, HENDEK_BONUS, KULE_BONUS, TOWER_SLOTS, upgradeCostAt, UPGRADE_MULT_DEFAULT,
} from '../data/villageDefs';
import BUILDING_DEFS from '../data/buildingDefs';
import { C, FONT, label as lbl, num, panel, fmtTime } from '../theme';
import { RES_LABEL, EQ_LABEL, gameMinutesToRealSeconds } from '../flows';
import Icon, { buildingIcon } from './Icons';
import { BUILDING_TEXTURE, BUILDING_VIDEO, MERKEZ_IMG } from './buildingArt';

const CAT_LABEL = {
  merkez: 'Merkez', isleme: 'İşleme', askeri: 'Askeri', depo: 'Depo',
  ekonomik: 'Ekonomik', nufus: 'Nüfus', savunma: 'Savunma',
  yonetim: 'Yönetim',
};
const CAT_EDGE = {
  merkez: '#f0c860', isleme: '#7ae07a', askeri: '#8fbcff', depo: '#c0a8f8',
  ekonomik: '#f0d868', nufus: '#68e8e0', savunma: '#ff8080',
  yonetim: '#e0b357',
};
const CAT_ORDER = ['merkez', 'yonetim', 'isleme', 'askeri', 'savunma', 'depo', 'nufus', 'ekonomik'];
const UNIT_CAT = { piyade: 'Piyade', suvari: 'Süvari', kusatma: 'Kuşatma' };

/* ── küçük parçalar ───────────────────────────────────────────────── */

function Row({ k, v, c = C.frost, note }) {
  return (
    <div style={{ padding: '4px 0', borderBottom: `1px solid ${C.lineSoft}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <span style={{ fontFamily: FONT.ui, fontSize: 11, color: C.textDim }}>{k}</span>
        <span style={num({ fontSize: 11.5, color: c, textAlign: 'right' })}>{v}</span>
      </div>
      {note && (
        <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, marginTop: 2, lineHeight: 1.45 }}>
          {note}
        </div>
      )}
    </div>
  );
}

function Head({ children }) {
  return (
    <div style={lbl({ fontSize: 8, letterSpacing: 1.6, margin: '14px 0 4px' })}>{children}</div>
  );
}

/** Kaynak listesi — ikon + miktar */
function Cost({ cost, empty = '—' }) {
  const list = Object.entries(cost || {});
  if (!list.length) return <span style={num({ fontSize: 11, color: C.textMute })}>{empty}</span>;
  return (
    <span style={{ display: 'inline-flex', gap: 9, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {list.map(([r, n]) => (
        <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <Icon name={r} size={12} />
          <span style={num({ fontSize: 11, color: C.frost })}>{n}</span>
        </span>
      ))}
    </span>
  );
}

/** Seviye tablosu — başlıklar ve satırlar dizi olarak verilir */
function Table({ cols, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT.num, fontSize: 11 }}>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i} style={{
                textAlign: i ? 'right' : 'left', padding: '4px 7px',
                fontFamily: FONT.ui, fontSize: 8, letterSpacing: 1.2,
                color: C.textFaint, textTransform: 'uppercase',
                borderBottom: `1px solid ${C.lineBright}`, whiteSpace: 'nowrap',
              }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
              {r.map((cell, j) => (
                <td key={j} style={{
                  textAlign: j ? 'right' : 'left', padding: '3.5px 7px',
                  color: j ? C.frost : C.textDim, whiteSpace: 'nowrap',
                  borderBottom: `1px solid ${C.lineSoft}`,
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── içerik üreticileri ───────────────────────────────────────────── */

/** Bina inşa/yükseltme süresi — sunucudaki getVillageBuildMinutes ile aynı */
const buildMinutes = (def, level, workers) =>
  (def.buildBaseWork * Math.pow(def.buildMultiplier, Math.max(0, level - 1))) / Math.max(1, workers);



function BuildingDetail({ id, def, hourSeconds, worldSpeed, equipmentByBuilding, unitDefs }) {
  const secs = (mins) => fmtTime(gameMinutesToRealSeconds(mins, hourSeconds, worldSpeed));
  const maxLv = def.maxLevel || 20;
  const bonusTable = def.bonusTable
    || (id === 'sur' ? SUR_BONUS : id === 'hendek' ? HENDEK_BONUS : id === 'kule' ? KULE_BONUS : null);

  /**
   * SEVİYE TABLOSU — her seviye artışı için bir satır.
   * maxLevel tanımsız binalarda (sınırsız) ilk 20 seviye listelenir; ondan
   * sonrası aynı çarpanla devam ediyor ve tablo okunmaz hâle geliyordu.
   */
  const tableMax = Math.min(def.maxLevel || 20, 20);
  const allLv = Array.from({ length: tableMax }, (_, i) => i + 1);

  const madeHere = equipmentByBuilding?.[id] || [];
  const trainsHere = Object.entries(unitDefs || {})
    .filter(([, u]) => u.trainedAt === id);

  return (
    <>
      <Head>Temel</Head>
      <Row k="Kategori" v={CAT_LABEL[def.category] || def.category} />
      <Row k="Maksimum seviye" v={def.maxLevel ? def.maxLevel : 'sınırsız'} />
      <Row k="Köyde kaç tane"
        v={def.unique ? '1 (tek)' : (def.maxInstances ? `en fazla ${def.maxInstances}` : 'sınırsız')} />
      {def.workersPerLevel > 0 && (
        <Row k="İşçi kapasitesi" v={`seviye × ${def.workersPerLevel}`}
          note={`Lvl 1: ${def.workersPerLevel} · Lvl 10: ${def.workersPerLevel * 10} kişi`} />
      )}

      <Head>Maliyet</Head>
      <Row k="İnşa (Lvl 1)" v={<Cost cost={def.cost} />} />
      <Row k="Yükseltme (Lvl 1 → 2)" v={<Cost cost={upgradeCostAt(id, 1)} />}
        note={`Her seviyede × ${def.upgradeCostMultiplier || UPGRADE_MULT_DEFAULT} artar.`
          + (def.upgradeCostBase ? '' : ' Tabanı binanın inşa maliyeti.')} />

      <Head>Seviye seviye maliyet ve süre</Head>
      <Table
        cols={['Seviye', 'Maliyet', 'Süre (1 işçi)', '3 işçi', '10 işçi']}
        rows={allLv.map(lv => {
          // lv === 1 → binayi sifirdan insa; sonrasi (lv-1) -> lv yukseltmesi
          const cost = lv === 1 ? def.cost : upgradeCostAt(id, lv - 1);
          return [
            lv === 1 ? 'inşa → 1' : `${lv - 1} → ${lv}`,
            Object.entries(cost || {}).map(([k, v]) => `${v} ${RES_LABEL[k] || k}`).join(' · ') || '—',
            secs(buildMinutes(def, lv, 1)),
            secs(buildMinutes(def, lv, 3)),
            secs(buildMinutes(def, lv, 10)),
          ];
        })} />
      {!def.maxLevel && (
        <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, marginTop: 5 }}>
          Bu binanın seviye sınırı yok; tablo ilk 20 seviyeyi gösteriyor,
          sonrası aynı çarpanla devam eder.
        </div>
      )}

      {def.processes && (
        <>
          <Head>Üretim</Head>
          <Row k="Girdi" v={`${def.processes.inputPerHour} ${RES_LABEL[def.processes.input] || def.processes.input}/sa`} />
          <Row k="Çıktı" v={`${def.processes.outputPerHour} ${RES_LABEL[def.processes.output] || def.processes.output}/sa`}
            c={C.good} note="İşçi başına saatlik oran; atanan her işçi bu kadar ekler." />
        </>
      )}

      {def.baseCapacity != null && (
        <>
          <Head>Depolama</Head>
          <Row k="Lvl 1 kapasite" v={def.baseCapacity} />
          <Row k="Seviye başına" v={`+${def.capacityPerLevel}`} />
          <Row k="Lvl 10" v={def.baseCapacity + 9 * def.capacityPerLevel} c={C.good} />
          {def.stores && (
            <Row k="Neyi tutar"
              v={(Array.isArray(def.stores) ? def.stores : [def.stores])
                .map(r => RES_LABEL[r] || r).join(', ')} />
          )}
        </>
      )}

      {/* KÜLTÜR PUANI ve YENİ KÖY HAKKI */}
      {def.cpPerLevel > 0 && (
        <>
          <Head>Kültür puanı</Head>
          <Row k="Seviye başına" v={`+${def.cpPerLevel}/gün`} c={C.good}
            note="Kültür puanı yeni köy kurma hakkının ölçüsü; köyün bütün binaları toplanır." />
          <Row k="Lvl 10'da" v={`+${def.cpPerLevel * 10}/gün`} />
        </>
      )}

      {Array.isArray(def.expansionAt) && (
        <>
          <Head>Yeni köy hakkı</Head>
          <Row k="Hak veren seviyeler" v={def.expansionAt.map(l => `Lvl ${l}`).join(' · ')}
            c={C.good} note={`Toplam ${def.expansionAt.length} hak. Yeni köy için ayrıca`
              + ' kültür puanı eşiği de gerekiyor — hangisi azsa tavan o.'} />
          {def.capitalOnly && (
            <Row k="Kısıt" v="Yalnız merkez köy" c={C.warn}
              note="Saray sadece merkez köye kurulur. Yıkılıp başka köyde kurulunca merkez oraya taşınır." />
          )}
          {def.excludes && (
            <Row k="Birlikte olamaz" v={VILLAGE_DEFS[def.excludes]?.name || def.excludes}
              c={C.warn} note="Bir köyde ikisinden yalnız biri bulunabilir." />
          )}
          {def.trainsSettlers && (
            <Row k="Göçmen" v="burada eğitilir"
              note="Yeni köy kurmak için 3 göçmen boş bir araziye gönderilir." />
          )}
        </>
      )}

      {def.festival && (
        <>
          <Head>Şölen</Head>
          <Row k="Küçük şölen" v="Lvl 1 · 12 saat"
            note="Bu köyün günlük kültür puanı üretimi kadar puan verir." />
          <Row k="Büyük şölen" v="Lvl 10 · 24 saat"
            note="Bütün köylerin günlük üretimi × 2. Aynı anda tek şölen düzenlenebilir." />
        </>
      )}

      {def.populationPerLevel > 0 && (
        <>
          <Head>Nüfus</Head>
          <Row k="Seviye başına tavan" v={`+${def.populationPerLevel}`} c={C.good}
            note="Ev nüfus TAVANINI belirler; artış HIZI ana bina seviyesinden gelir." />
        </>
      )}

      {def.bonusPerLevel > 0 && (
        <>
          <Head>Bonus</Head>
          <Row k="Seviye başına" v={`+%${def.bonusPerLevel}`} c={C.good} />
          {def.affects && <Row k="Etkilediği" v={RES_LABEL[def.affects] || def.affects} />}
          <Row k="Maksimum" v={`+%${def.bonusPerLevel * (def.maxLevel || 5)}`} c={C.good} />
        </>
      )}

      {def.poolCapPerLevel > 0 && (
        <Row k="Ekipman havuzu" v={`seviye × ${def.poolCapPerLevel}`}
          note="Kılıç, mızrak, kalkan ve zırh bu ORTAK havuzu paylaşır." />
      )}
      {def.horseCapPerLevel > 0 && (
        <Row k="At kapasitesi" v={`seviye × ${def.horseCapPerLevel}`} />
      )}
      {def.equipmentCapPerLevel > 0 && (
        <Row k="Ekipman kapasitesi" v={`seviye × ${def.equipmentCapPerLevel}`} />
      )}

      {bonusTable && (
        <>
          <Head>Savunma bonusu</Head>
          {id === 'kule' && (
            <Row k="Okçu kapasitesi" v={`seviye × ${def.workersPerLevel || 4}`}
              note={`Tablodaki değer ${TOWER_SLOTS} kulenin TOPLAMI ve okçu dolulukla ölçeklenir: boş kule sıfır katkı verir.`} />
          )}
          <Table cols={['Seviye', 'Bonus']}
            rows={[1, 5, 10, 15, 20].filter(l => l < bonusTable.length)
              .map(l => [`Lvl ${l}`, `+%${bonusTable[l]}`])} />
        </>
      )}

      {madeHere.length > 0 && (
        <>
          <Head>Burada üretilen ekipman</Head>
          <Row k="Türler" v={madeHere.map(e => EQ_LABEL[e] || e).join(', ')} />
        </>
      )}
      {trainsHere.length > 0 && (
        <>
          <Head>Burada eğitilen birlikler</Head>
          <Row k="Birimler" v={trainsHere.map(([, u]) => u.name).join(', ')} />
        </>
      )}
    </>
  );
}

function FieldDetail({ def, hourSeconds, worldSpeed }) {
  const secs = (mins) => fmtTime(gameMinutesToRealSeconds(mins, hourSeconds, worldSpeed));
  const lv = def.levels || [];
  const sample = [0, 1, 4, 9, 14, 19].filter(i => i < lv.length);
  return (
    <>
      <Head>Temel</Head>
      <Row k="İşçi başına üretim" v={`${def.baseProductionPerWorker}/sa`} c={C.good}
        note="Arazi bonusu ve merkeze uzaklık bu değeri çarpar." />
      <Row k="Köydeki slot sayısı" v={def.slots} />
      <Row k="Maksimum seviye" v={lv.length} />

      <Head>Seviye tablosu</Head>
      <Table
        cols={['Seviye', 'Maks işçi', 'Süre (1 işçi)', 'Maliyet']}
        rows={sample.map(i => [
          `${i} → ${i + 1}`,
          lv[i].workers,
          secs(lv[i].sureSaat),
          Object.entries(lv[i].cost).map(([k, v]) => `${v} ${RES_LABEL[k] || k}`).join(' · '),
        ])} />
    </>
  );
}

function UnitDetail({ def, equipmentDefs, hourSeconds, worldSpeed }) {
  const eq = def.equipment || [];
  const trainMins = Math.max(3, eq.length * 5);
  const secs = (m) => fmtTime(gameMinutesToRealSeconds(m, hourSeconds, worldSpeed));
  const totalCost = {};
  for (const e of eq) {
    for (const [r, n] of Object.entries(equipmentDefs?.[e]?.cost || {})) {
      totalCost[r] = (totalCost[r] || 0) + n;
    }
  }
  return (
    <>
      <Head>Temel</Head>
      <Row k="Sınıf" v={UNIT_CAT[def.category] || def.category} />
      <Row k="Eğitildiği yer" v={VILLAGE_DEFS[def.trainedAt]?.name || def.trainedAt} />

      <Head>Değerler</Head>
      <Row k="Saldırı" v={def.stats?.saldiri ?? '—'} c={C.danger} />
      <Row k="Piyadeye savunma" v={def.stats?.yayaSav ?? '—'} c={C.good} />
      <Row k="Süvariye savunma" v={def.stats?.atliSav ?? '—'} c={C.good} />
      <Row k="Hız" v={`${def.stats?.hiz ?? '—'} hex/sa`} />
      <Row k="Taşıma" v={def.stats?.kapasite ?? '—'} />

      <Head>Gereksinim</Head>
      <Row k="Ekipman" v={eq.length ? eq.map(e => EQ_LABEL[e] || e).join(' + ') : 'yok'} />
      <Row k="Ekipman ham maliyeti" v={<Cost cost={totalCost} />}
        note="Ekipman ayrıca üretildiği binada zaman harcar." />
      <Row k="Nüfus" v="1 işçi → 1 asker"
        note="Eğitilen asker işçi havuzundan çıkar ve geri dönmez." />
      <Row k="Eğitim süresi (1 eğitmen)" v={secs(trainMins)}
        note="Eğitmen sayısına bölünür, en az 1 oyun dakikası." />
    </>
  );
}

function EquipDetail({ id, def, hourSeconds, worldSpeed }) {
  const secs = (m) => fmtTime(gameMinutesToRealSeconds(m, hourSeconds, worldSpeed));
  return (
    <>
      <Head>Temel</Head>
      <Row k="Üretildiği yer" v={VILLAGE_DEFS[def.producedAt]?.name || def.producedAt} />
      <Row k="Maliyet" v={<Cost cost={def.cost} />} />
      <Row k="Süre (1 işçi)" v={secs(def.productionHours * 60)}
        note="İşçi sayısına bölünür, en az 1 oyun dakikası." />
      <Row k="Depo" v={id === 'at' ? 'Ahır (ayrı depo)' : 'Cephanelik ortak havuzu'} />

      <Head>Askere kattığı</Head>
      <Row k="Saldırı" v={def.saldiri ?? '—'} c={C.danger} />
      <Row k="Piyadeye savunma" v={def.yayaSav ?? '—'} c={C.good} />
      <Row k="Süvariye savunma" v={def.atliSav ?? '—'} c={C.good} />
      <Row k="Hız" v={def.hiz ?? '—'} c={(def.hiz || 0) < 0 ? C.warn : C.good} />
      <Row k="Taşıma" v={def.kapasite ?? '—'} c={(def.kapasite || 0) < 0 ? C.warn : C.good} />
    </>
  );
}

/* ── ekran ────────────────────────────────────────────────────────── */

export default function HelpScreen({
  unitDefs = {}, equipmentDefs = {}, equipmentByBuilding = {},
  hourSeconds = 3600, worldSpeed = 1,
  topic = null, onTopicHandled,
}) {
  const [sel, setSel] = useState(topic || 'bina:anaBina');
  const [q, setQ] = useState('');
  const bodyRef = useRef(null);

  // Bina panelinden "?" ile gelindiğinde o konuya atla
  useEffect(() => {
    if (!topic) return;
    setSel(topic);
    setQ('');
    onTopicHandled?.();
  }, [topic]);

  useEffect(() => { bodyRef.current?.scrollTo({ top: 0 }); }, [sel]);

  const groups = useMemo(() => {
    const byCat = new Map();
    for (const [id, d] of Object.entries(VILLAGE_DEFS)) {
      const cat = id === 'anaBina' ? 'merkez' : d.category;
      if (!byCat.has(cat)) byCat.set(cat, []);
      // `img`: köy ekranındaki gerçek görsel; yoksa vektör simgeye düşer
      byCat.get(cat).push({ id: `bina:${id}`, name: d.name, icon: buildingIcon(id),
        img: BUILDING_TEXTURE[id] || null, edge: CAT_EDGE[cat] });
    }
    const out = CAT_ORDER.filter(c => byCat.has(c))
      .map(c => ({ title: CAT_LABEL[c], items: byCat.get(c).sort((a, b) => a.name.localeCompare(b.name, 'tr')) }));

    out.push({
      title: 'Üretim alanları',
      items: Object.entries(BUILDING_DEFS).map(([id, d]) => ({
        id: `tarla:${id}`, name: d.name, icon: id, edge: '#7ae07a',
      })),
    });

    const units = Object.entries(unitDefs);
    if (units.length) {
      out.push({
        title: 'Birlikler',
        items: units.map(([id, d]) => ({
          id: `birim:${id}`, name: d.name,
          icon: d.category === 'suvari' ? 'at' : 'kalkan', edge: '#8fbcff',
        })),
      });
    }
    const eqs = Object.entries(equipmentDefs);
    if (eqs.length) {
      out.push({
        title: 'Ekipman',
        items: eqs.map(([id, d]) => ({
          id: `ekip:${id}`, name: EQ_LABEL[id] || d.name, icon: id, edge: '#c0a8f8',
        })),
      });
    }
    return out;
  }, [unitDefs, equipmentDefs]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('tr');
    if (!needle) return groups;
    return groups
      .map(g => ({ ...g, items: g.items.filter(i => i.name.toLocaleLowerCase('tr').includes(needle)) }))
      .filter(g => g.items.length);
  }, [groups, q]);

  const [kind, id] = sel.split(':');
  const def = kind === 'bina' ? VILLAGE_DEFS[id]
    : kind === 'tarla' ? BUILDING_DEFS[id]
      : kind === 'birim' ? unitDefs[id]
        : equipmentDefs[id];

  const title = !def ? 'Seç' : (kind === 'ekip' ? (EQ_LABEL[id] || def.name) : def.name);
  const edge = kind === 'bina' ? (CAT_EDGE[id === 'anaBina' ? 'merkez' : def?.category] || C.ice)
    : kind === 'tarla' ? '#7ae07a' : kind === 'birim' ? '#8fbcff' : '#c0a8f8';

  const tex = kind === 'bina'
    ? (id === 'anaBina' ? MERKEZ_IMG : BUILDING_TEXTURE[id])
    : null;
  const vid = kind === 'bina' ? BUILDING_VIDEO[id] : null;

  return (
    <div style={{ display: 'flex', gap: 12, height: '100%', minHeight: 0 }}>

      {/* SOL — arama + liste */}
      <div style={panel({
        width: 236, flexShrink: 0, display: 'flex', flexDirection: 'column',
        minHeight: 0, padding: 0, overflow: 'hidden',
      })}>
        <div style={{ padding: 9, borderBottom: `1px solid ${C.lineSoft}` }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ara…"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '6px 8px',
              background: 'rgba(8,17,28,0.7)', border: `1px solid ${C.lineSoft}`,
              borderRadius: 5, color: C.frost, fontFamily: FONT.ui, fontSize: 11,
              outline: 'none',
            }} />
        </div>
        <div className="tn-scroll" style={{ overflowY: 'auto', minHeight: 0, padding: '6px 6px 10px' }}>
          {filtered.map(g => (
            <div key={g.title}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1.4, padding: '8px 6px 3px' })}>{g.title}</div>
              {g.items.map(it => {
                const on = sel === it.id;
                return (
                  <button key={it.id} type="button" onClick={() => setSel(it.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                      padding: '5px 7px', marginBottom: 1, borderRadius: 4,
                      background: on ? `${it.edge}1f` : 'transparent',
                      border: `1px solid ${on ? `${it.edge}66` : 'transparent'}`,
                      color: on ? C.frost : C.textDim, cursor: 'pointer',
                      fontFamily: FONT.ui, fontSize: 11, textAlign: 'left',
                    }}>
                    {it.img ? (
                      <span style={{
                        width: 18, height: 18, flexShrink: 0, borderRadius: 3,
                        overflow: 'hidden', display: 'block', background: '#0b1420',
                        border: `1px solid ${(on ? it.edge : C.lineSoft)}66`,
                      }}>
                        <img src={it.img} alt="" draggable={false}
                          style={{
                            width: '100%', height: '100%', objectFit: 'cover',
                            objectPosition: '50% 32%', display: 'block',
                            filter: on ? 'none' : 'grayscale(0.45) brightness(0.85)',
                          }} />
                      </span>
                    ) : (
                      <Icon name={it.icon} size={13} color={on ? it.edge : C.textFaint} />
                    )}
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {it.name}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          {!filtered.length && (
            <div style={{ padding: 12, fontFamily: FONT.ui, fontSize: 10.5, color: C.textMute }}>
              eşleşme yok
            </div>
          )}
        </div>
      </div>

      {/* SAĞ — detay */}
      <div ref={bodyRef} className="tn-scroll"
        style={panel({ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', padding: 0 })}>
        {!def ? (
          <div style={{ padding: 20, fontFamily: FONT.ui, fontSize: 11, color: C.textMute }}>
            Soldan bir konu seç.
          </div>
        ) : (
          <>
            {/* Başlık — görseli varsa afiş olarak */}
            <div style={{
              position: 'relative', minHeight: tex || vid ? 148 : 0,
              borderBottom: `1px solid ${edge}44`, overflow: 'hidden',
            }}>
              {vid ? (
                <video key={sel} src={vid} autoPlay muted loop playsInline
                  style={{ width: '100%', height: 148, objectFit: 'cover', display: 'block' }} />
              ) : tex ? (
                <img src={tex} alt="" style={{ width: '100%', height: 148, objectFit: 'cover', display: 'block' }} />
              ) : null}
              <div style={{
                position: (tex || vid) ? 'absolute' : 'static', inset: 0,
                display: 'flex', alignItems: 'flex-end', gap: 10, padding: 14,
                background: (tex || vid)
                  ? 'linear-gradient(180deg, rgba(6,12,20,0.1) 30%, rgba(8,17,28,0.94) 100%)'
                  : 'transparent',
              }}>
                <Icon name={kind === 'bina' ? buildingIcon(id) : id} size={22} color={edge} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: FONT.head, fontSize: 19, fontWeight: 700, color: C.frost }}>
                    {title}
                  </div>
                  <div style={lbl({ fontSize: 8, letterSpacing: 1.4, marginTop: 2 })}>
                    {kind === 'bina' ? 'köy binası' : kind === 'tarla' ? 'üretim alanı'
                      : kind === 'birim' ? 'birlik' : 'ekipman'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '4px 16px 20px' }}>
              {def.description && (
                <div style={{
                  fontFamily: FONT.ui, fontSize: 11.5, color: C.textDim, lineHeight: 1.6,
                  padding: '12px 0 2px',
                }}>{def.description}</div>
              )}

              {kind === 'bina' && (
                <BuildingDetail id={id} def={def} hourSeconds={hourSeconds} worldSpeed={worldSpeed}
                  equipmentByBuilding={equipmentByBuilding} unitDefs={unitDefs} />
              )}
              {kind === 'tarla' && (
                <FieldDetail def={def} hourSeconds={hourSeconds} worldSpeed={worldSpeed} />
              )}
              {kind === 'birim' && (
                <UnitDetail def={def} equipmentDefs={equipmentDefs}
                  hourSeconds={hourSeconds} worldSpeed={worldSpeed} />
              )}
              {kind === 'ekip' && (
                <EquipDetail id={id} def={def} hourSeconds={hourSeconds} worldSpeed={worldSpeed} />
              )}

              <div style={{
                marginTop: 18, padding: '8px 10px', borderRadius: 5,
                background: 'rgba(127,212,255,0.05)', border: `1px solid ${C.lineSoft}`,
                fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, lineHeight: 1.5,
              }}>
                Bu sayfadaki bütün sayılar oyunun tanım dosyalarından okunuyor —
                dengeyi değiştirdiğinde burası kendiliğinden güncellenir.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
