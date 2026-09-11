import { useState } from 'react';
import { C, FONT, btn, label as lbl, num, fmtTime } from '../theme';
import { EQ_LABEL, RES_LABEL, gameMinutesToRealSeconds } from '../flows';
import { unitImage } from '../data/unitImages';
import UnitDetail from './UnitDetail';
import Icon from './Icons';
import { Qty, QueueList } from './queueUI';

// Birim eğitim süresi — oyun DAKİKASI. Sunucudaki getUnitTrainMinutes ile
// birebir: ekipman sayısı × 5 dk, en az 3 dk; eğitmen sayısına bölünür ve
// MIN_PRODUCTION_MINUTES (=1) altına düşmez.
// Ekipmansız birimler (göçmen) süreyi kendi tanımından verir
const baseMinutes = (def) =>
  def?.trainMinutes || Math.max(3, (def?.equipment || []).length * 5);
const effMinutes = (def, trainers) =>
  trainers <= 0 ? baseMinutes(def) : Math.max(1, baseMinutes(def) / trainers);

const CAT_COLOR = { piyade: '#7fd4ff', suvari: '#a99cf0', kusatma: '#d9c069' };

function Stat({ icon, value, color, title }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2.5 }} title={title}>
      <Icon name={icon} size={9} color={color} />
      <span style={num({ fontSize: 8.5, color: C.text, textShadow: '0 1px 2px rgba(0,0,0,0.9)' })}>
        {value}
      </span>
    </span>
  );
}

/**
 * Tek birim kartı — 9:16 tam kadraj görsel, HER ŞEY görselin üstünde.
 * Görselin altına bilgi bloğu koymak dikeyde çok yer yiyordu; overlay ile
 * 4 sütun × 2 satır tek ekrana sığıyor.
 */
function UnitCard({
  u, def, color, img, qty, setQty, equipment, equipmentDefs, resources = {},
  freeWorkers, trainerWorkers, onTrain, onOpen,
  buildingLevel = 0, buildingName = 'Bina', arastirildi = true,
  /** Ekipman yükseltmeleriyle GÜNCEL değerler; yoksa tanımdakiler */
  guncelStats = null,
  hourSeconds = 3600, worldSpeed = 1,
}) {
  /*
    MALZEME ADET KADAR ARANIYOR — 1 tane değil.

    Sunucu bedeli SİPARİŞ ANINDA topluca düşüyor (bkz. server/index.js ·
    train_unit): 10 asker için 10 takım ekipman ve 10 boş işçi gerekiyor.
    Burada 1'e bakmak, düğmeyi açık gösterip sunucuya reddettirirdi —
    oyuncu "neden olmuyor" diye bakardı.
  */
  const adet = Math.max(1, qty || 1);
  const eqList = def.equipment || [];
  const eqIhtiyac = {};
  for (const e of eqList) eqIhtiyac[e] = (eqIhtiyac[e] || 0) + adet;
  const eqOk = Object.entries(eqIhtiyac).every(([e, n]) => (equipment[e] || 0) >= n);
  const costList = Object.entries(def.cost || {});
  const costOk = costList.every(([r, a]) => (resources[r] || 0) >= a * adet);
  const workerOk = freeWorkers >= adet;
  const trainerOk = trainerWorkers >= 1;
  /**
   * SEVİYE KİLİDİ — iyi asker iyi kışla ister. Kilitli birim listeden
   * gizlenmiyor: oyuncu neyi hedeflediğini görsün, kartın üstünde kaçıncı
   * seviyede açılacağı yazıyor.
   */
  const gereken = def.minLevel || 1;
  const seviyeKilidi = buildingLevel < gereken;
  /**
   * İKİNCİ KAPI — Rún Salonu araştırması. Seviye kilidi "kışlan yeterli mi"
   * diye sorar, bu "bu birimi biliyor musun" diye. Başlangıç birimlerinde
   * `def.research` yok, o yüzden hep açık sayılırlar.
   */
  const arastirmaKilidi = !!def.research && !arastirildi;
  const kilitli = seviyeKilidi || arastirmaKilidi;
  const ready = !kilitli && eqOk && costOk && workerOk && trainerOk;
  const secs = gameMinutesToRealSeconds(effMinutes(def, trainerWorkers), hourSeconds, worldSpeed);
  /**
   * Kartta YÜKSELTİLMİŞ değer gösteriliyor: oyuncu silahçıya yatırım yapınca
   * kışlada karşılığını görmeli. Sunucu bunu köyün seviyeleriyle hesaplayıp
   * gönderiyor (`unitStatsNow`); gelmezse tanımdaki değere düşülüyor.
   */
  const st = guncelStats || def.stats;
  const yukseltilmis = !!guncelStats && Math.round(st.saldiri) !== Math.round(def.stats?.saldiri ?? 0);
  const cav = def.category === 'suvari';

  const [hov, setHov] = useState(false);

  const pill = {
    display: 'inline-flex', alignItems: 'center', gap: 2,
    padding: '1px 4px', borderRadius: 3,
    background: 'rgba(4,9,15,0.72)', border: '1px solid rgba(255,255,255,0.12)',
  };

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      // Tıklarken yakınlaştırmayı bırak: detay penceresi kartı kapattığı için
      // mouseleave gelmiyor ve kart zoom'lu takılı kalıyordu.
      onClick={() => { setHov(false); onOpen(); }}
      title="Detay için tıkla"
      style={{
        cursor: 'pointer',
        position: 'relative', aspectRatio: '9 / 16', borderRadius: 6, overflow: 'hidden',
        background: '#0b1420',
        border: `1px solid ${hov ? color : ready ? `${color}66` : C.lineSoft}`,
        // Üzerine gelince yaklaş — kart öne çıkar
        transform: hov ? 'scale(1.06)' : 'none',
        zIndex: hov ? 5 : 1,
        boxShadow: hov
          ? `0 10px 26px rgba(0,0,0,0.6), 0 0 0 1px ${color}55`
          : ready ? `0 0 0 1px ${color}22 inset` : 'none',
        transition: 'transform .13s ease-out, box-shadow .13s ease-out, border-color .13s',
      }}>
      {img ? (
        <img src={img} alt={def.name || u} draggable={false}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: '50% 12%',
            // Eksik ekipman görseli GRİLEŞTİRMEZ (kırmızı rozetlerden okunur),
            // ama SEVİYE KİLİDİ yapısal bir engel: kart bakışta soluk görünsün.
            filter: kilitli ? 'grayscale(0.85) brightness(0.55)' : 'none',
            transform: hov ? 'scale(1.04)' : 'none',
            transition: 'transform .2s ease-out',
          }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <Icon name={cav ? 'at' : 'kalkan'} size={30} color={C.lineBright} strokeWidth={1.2} />
        </div>
      )}

      {/* ÜST — ekipman gereksinimleri (solda) · süre (sağda) */}
      <div style={{
        position: 'absolute', top: 4, left: 4, right: 4,
        display: 'flex', alignItems: 'flex-start', gap: 3,
      }}>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', flex: 1 }}>
          {seviyeKilidi && (
            <span title={`${buildingName} Lvl ${gereken} gerekiyor (şu an ${buildingLevel})`}
              style={{ ...pill, borderColor: 'rgba(224,179,87,0.55)' }}>
              <Icon name="kilit" size={9} color="#e0b357" />
              <span style={num({ fontSize: 8, color: '#e8cf9a' })}>Lvl {gereken}</span>
            </span>
          )}
          {arastirmaKilidi && (
            <span title={`Rún Salonu'nda araştırılmadı (salon Lvl ${def.research.level} gerekiyor)`}
              style={{ ...pill, borderColor: 'rgba(169,156,240,0.6)' }}>
              <Icon name="bilgi" size={9} color="#a99cf0" />
              <span style={num({ fontSize: 8, color: '#cfc6ff' })}>RÚN</span>
            </span>
          )}
          {!kilitli && costList.map(([r, need]) => {
            const have = resources[r] || 0;
            const ok = have >= need;
            return (
              <span key={r} title={`${RES_LABEL[r] || r}: ${Math.floor(have)} / ${need}`}
                style={{ ...pill, borderColor: ok ? 'rgba(108,221,163,0.45)' : C.dangerDim }}>
                <Icon name={r} size={9} color={ok ? C.good : '#ff9aa2'} />
                <span style={num({ fontSize: 8, color: ok ? '#c8f0d8' : '#ff9aa2' })}>{need}</span>
              </span>
            );
          })}
          {!kilitli && eqList.map(e => {
            const have = equipment[e] || 0;
            const ok = have >= 1;
            return (
              <span key={e} title={`${EQ_LABEL[e] || equipmentDefs[e]?.name || e}: ${have}`}
                style={{ ...pill, borderColor: ok ? 'rgba(108,221,163,0.45)' : C.dangerDim }}>
                <Icon name={e} size={9} color={ok ? C.good : '#ff9aa2'} />
                <span style={num({ fontSize: 8, color: ok ? '#c8f0d8' : '#ff9aa2' })}>{have}</span>
              </span>
            );
          })}
        </div>
        <span style={{ ...pill, borderColor: `${color}55` }}>
          <span style={num({ fontSize: 8, color })}>{fmtTime(secs)}</span>
        </span>
      </div>

      {/* ALT — isim, istatistik, adet + EĞİT (hepsi görselin üstünde) */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '26px 5px 5px',
        background: 'linear-gradient(180deg, transparent, rgba(4,9,15,0.62) 32%, rgba(4,9,15,0.95) 68%)',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{
          fontFamily: FONT.head, fontSize: 12, fontWeight: 600, letterSpacing: 0.4,
          color: C.frost, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
        }}>{def.name || u}</div>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <Stat icon="kilic" value={Math.round(st?.saldiri ?? 0) || '—'} color={C.danger}
            title={yukseltilmis ? `Saldırı (yükseltmelerle; temel ${def.stats?.saldiri})` : 'Saldırı'} />
          <Stat icon="kalkan" value={`${Math.round(st?.yayaSav ?? 0)}/${Math.round(st?.atliSav ?? 0)}`}
            color={C.good} title="Yaya / atlı savunma" />
          <Stat icon="hiz" value={def.stats?.hiz ?? '—'} color={C.iceDeep} title="Hız" />
        </div>

        <div onClick={(e) => e.stopPropagation()}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Qty value={qty} onChange={setQty} />
          <button onClick={() => onTrain(u, qty)} disabled={!ready}
            title={seviyeKilidi ? `${buildingName} Lvl ${gereken} gerekiyor (şu an ${buildingLevel})`
              : arastirmaKilidi ? `Önce Rún Salonu'nda araştırılmalı (salon Lvl ${def.research.level})`
              : !trainerOk ? 'Eğitmen işçi yok'
              : !eqOk ? 'Yetersiz ekipman'
              : !costOk ? 'Yetersiz kaynak'
              : !workerOk ? 'Askere dönüşecek boş işçi yok'
              : 'Eğitim kuyruğuna ekle'}
            style={btn(ready ? 'good' : 'disabled', {
              flex: 1, padding: '3px 4px', fontSize: 8.5, letterSpacing: 0.8,
            })}>
            {seviyeKilidi ? `LVL ${gereken}` : arastirmaKilidi ? 'RÚN' : 'EĞİT'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UnitTrainingPanel({
  buildingType, buildingLevel = 0, buildingName = 'Bina',
  unitsByBuilding = {}, unitDefs = {}, equipmentDefs = {},
  equipment = {}, resources = {}, queue = [], freeWorkers = 0, trainerWorkers = 0,
  research = {}, unitStatsNow = {},
  onTrain, onCancel, onReorder,
  hourSeconds = 3600, worldSpeed = 1,
}) {
  // Kilit sırasına göre diz: açık birimler önce, sıradaki hedef hemen arkada
  const allowed = [...(unitsByBuilding[buildingType] || [])]
    .sort((a, b) => (unitDefs[a]?.minLevel || 1) - (unitDefs[b]?.minLevel || 1));
  const [qty, setQty] = useState(() => Object.fromEntries(allowed.map(k => [k, 1])));
  const [detail, setDetail] = useState(null);

  if (!allowed.length) {
    return (
      <div style={{
        background: 'rgba(8,17,28,0.55)', border: `1px solid ${C.lineSoft}`,
        borderRadius: 7, padding: 10,
        fontFamily: FONT.ui, fontSize: 10, color: C.textMute,
      }}>
        Bu bina birim eğitemez.
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(8,17,28,0.55)', border: `1px solid ${C.lineSoft}`,
      borderRadius: 7, padding: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Icon name="kisla" size={13} color={C.iceDeep} />
        <span style={lbl({ fontSize: 8.5, letterSpacing: 1.5 })}>Birim eğitimi</span>
        <span style={num({ fontSize: 9, color: C.textMute, marginLeft: 'auto' })}>
          {allowed.filter(u => buildingLevel >= (unitDefs[u]?.minLevel || 1)
            && (!unitDefs[u]?.research || research[u])).length}
          /{allowed.length} tür
        </span>
      </div>

      {/* Tek satır bilgi — kutu yerine satır, dikeyde yer kazanır */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
        fontFamily: FONT.ui, fontSize: 9.5,
        color: trainerWorkers === 0 ? '#e8cf9a' : C.textDim,
      }}>
        <Icon name={trainerWorkers === 0 ? 'uyari' : 'isci'} size={11}
          color={trainerWorkers === 0 ? C.warn : C.good} />
        {trainerWorkers === 0
          ? 'Bu binada eğitmen yok — yukarıdan işçi ata, sipariş bekler.'
          : `${trainerWorkers} eğitmen · her asker 1 boş işçi + ekipmanını tüketir`}
      </div>

      {/* 4 sütun × 2 satır: tüm türler tek ekranda, scroll yok */}
      <div style={{
        display: 'grid',
        /**
         * Dar poster panelinde de 4 sütun kalır. Eşik 84px: 430'luk panelde
         * dış boşluklar VE kaydırma çubuğu düşünce iç genişlik ~373px kalıyor;
         * 90px eşiğiyle 4 sütun sığmayıp 3'e düşüyordu (önizlemede görüldü).
         * Pencere genişlerse kendiliğinden daha fazla sütun açılır.
         */
        /*
          ÜST SINIR ŞART: auto-fit + 1fr, tek kart kalınca o kartı panel
          genişliğine kadar şişiriyordu (sarayda tek göçmen kartı bütün
          pencereyi kaplayıp bina görselini eziyordu). 120 px tavanla
          kartlar hep aynı boyda kalıyor.
        */
        gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 120px))',
        justifyContent: 'start', gap: 7,
        marginBottom: queue.length > 0 ? 9 : 0,
      }}>
        {allowed.map(u => {
          const def = unitDefs[u];
          if (!def) return null;
          return (
            <UnitCard key={u} u={u} def={def}
              color={CAT_COLOR[def.category] || C.iceSoft}
              img={unitImage(u)}
              qty={qty[u] || 1}
              setQty={(n) => setQty(s => ({ ...s, [u]: n }))}
              equipment={equipment} equipmentDefs={equipmentDefs} resources={resources}
              freeWorkers={freeWorkers} trainerWorkers={trainerWorkers}
              buildingLevel={buildingLevel} buildingName={buildingName}
              arastirildi={!unitDefs[u]?.research || !!research[u]}
              guncelStats={unitStatsNow[u] || null}
              hourSeconds={hourSeconds} worldSpeed={worldSpeed}
              onTrain={onTrain} onOpen={() => setDetail(u)} />
          );
        })}
      </div>

      {queue.length > 0 && (
        <QueueList queue={queue}
          nameOf={(o) => unitDefs[o.type]?.name || o.type}
          iconOf={(o) => (unitDefs[o.type]?.category === 'suvari' ? 'at' : 'kalkan')}
          onCancel={onCancel}
          onReorder={onReorder} />
      )}

      {detail && (
        <UnitDetail type={detail} def={unitDefs[detail]}
          equipmentDefs={equipmentDefs} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}
