/**
 * ResearchPanel — Rún Salonu'nun içi.
 *
 * Bir birimi eğitebilmek için İKİ kapı birden açılmalı: eğitildiği binanın
 * (kışla/ahır) seviyesi ve BURADAKİ araştırma. Bu panel ikinci kapıyı
 * yönetiyor: hangi birim açık, hangisi hangi salon seviyesinde araştırılabilir,
 * maliyeti ne, sırada ne var.
 *
 * Başlangıç birimleri (minLevel 1) listede YOK — onlar araştırma istemiyor,
 * listeye koymak "bunu da mı araştırmam lazım" diye yanıltırdı.
 *
 * Maliyet satırı ve "ne zaman yeter" notu ortak bileşenden (mapPanels.CostRow)
 * geliyor; panel başına ayrı bir maliyet gösterimi türetilmiyor.
 */
import { C, FONT, btn, label as lbl, num, fmtTime } from '../theme';
import { gameMinutesToRealSeconds } from '../flows';
import { CostRow } from './mapPanels';
import { WAIT_LABEL } from './queueUI';
import { unitImage } from '../data/unitImages';
import Icon from './Icons';

const CAT_COLOR = { piyade: '#7fd4ff', suvari: '#a99cf0', kusatma: '#d9c069' };

/** Tek birim satırı: görsel + ad + gereken seviye + maliyet + düğme */
function Satir({
  tip, def, durum, salonLv, arastirmaci, resources, flows,
  hourSeconds, worldSpeed, onResearch,
}) {
  const ar = def.research;
  const renk = CAT_COLOR[def.category] || C.ice;
  const img = unitImage(tip);
  const seviyeTamam = salonLv >= ar.level;
  const acik = durum === 'acik';
  const sirada = durum === 'sirada';
  const kaynakTamam = Object.entries(ar.cost)
    .every(([r, a]) => (resources[r] || 0) >= a);
  const basilabilir = !acik && !sirada && seviyeTamam;

  const sure = gameMinutesToRealSeconds(
    arastirmaci > 0 ? Math.max(1, ar.minutes / arastirmaci) : ar.minutes,
    hourSeconds, worldSpeed);

  return (
    <div style={{
      display: 'flex', gap: 8, padding: 7, borderRadius: 6,
      background: acik ? 'rgba(108,221,163,0.07)' : 'rgba(8,17,28,0.55)',
      border: `1px solid ${acik ? 'rgba(108,221,163,0.32)'
        : seviyeTamam ? C.lineSoft : 'rgba(224,179,87,0.28)'}`,
      opacity: seviyeTamam || acik ? 1 : 0.72,
    }}>
      {/* Görsel */}
      <div style={{
        flexShrink: 0, width: 40, height: 56, borderRadius: 4, overflow: 'hidden',
        background: '#0b1420', display: 'grid', placeItems: 'center',
      }}>
        {img ? (
          <img src={img} alt="" draggable={false} style={{
            width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%',
            filter: acik ? 'none' : 'grayscale(0.7) brightness(0.75)',
          }} />
        ) : <Icon name={def.category === 'suvari' ? 'at' : 'kalkan'} size={18} color={C.lineBright} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: FONT.ui, fontSize: 11.5, color: C.frost }}>{def.name}</span>
          <span style={num({ fontSize: 8.5, color: renk })}>
            {def.trainedAt === 'ahir' ? 'süvari' : def.category === 'kusatma' ? 'kuşatma' : 'piyade'}
          </span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Icon name={seviyeTamam ? 'bilgi' : 'kilit'} size={9}
              color={seviyeTamam ? C.textMute : '#e0b357'} />
            <span style={num({ fontSize: 8.5, color: seviyeTamam ? C.textMute : '#e8cf9a' })}>
              salon Lvl {ar.level}
            </span>
          </span>
        </div>

        {acik ? (
          <div style={{
            marginTop: 4, display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: FONT.ui, fontSize: 9.5, color: C.good,
          }}>
            <Icon name="bonus" size={10} color={C.good} />
            araştırıldı — {def.trainedAt === 'ahir' ? 'ahırda' : 'kışlada'} eğitilebilir
          </div>
        ) : (
          <>
            <div style={{ marginTop: 4 }}>
              <CostRow cost={ar.cost} resources={resources} flows={flows}
                hourSeconds={hourSeconds} worldSpeed={worldSpeed} />
            </div>
            <div style={{
              marginTop: 5, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={num({ fontSize: 9.5, color: C.textFaint })}>
                {fmtTime(sure)}
                {arastirmaci > 1 && (
                  <span style={{ color: C.textMute }}> · {arastirmaci} araştırmacı</span>
                )}
              </span>
              <button type="button"
                disabled={!basilabilir}
                title={!seviyeTamam
                  ? `Rún Salonu Lvl ${ar.level} gerekiyor (şu an ${salonLv})`
                  : sirada ? 'Zaten kuyrukta'
                    : kaynakTamam ? 'Araştırmayı sıraya al'
                      : 'Kaynak yetmiyor — yine de sıraya alınır, sırası gelince ödenir'}
                onClick={() => onResearch?.(tip)}
                style={btn(basilabilir ? (kaynakTamam ? 'primary' : 'ghost') : 'disabled', {
                  marginLeft: 'auto', padding: '4px 12px', fontSize: 9.5, letterSpacing: 0.8,
                })}>
                {sirada ? 'KUYRUKTA' : 'ARAŞTIR'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResearchPanel({
  level = 0, workers = 0,
  unitDefs = {}, research = {}, queue = [],
  resources = {}, flows = {},
  hourSeconds = 3600, worldSpeed = 1,
  onResearch, onCancel,
}) {
  // Araştırma isteyen birimler, gereken salon seviyesine göre sıralı
  const liste = Object.entries(unitDefs)
    .filter(([, d]) => d.research)
    .sort((a, b) => (a[1].research.level - b[1].research.level)
      || a[1].name.localeCompare(b[1].name, 'tr'));

  const siradaki = new Set(queue.map(o => o.type));
  const acikSayi = liste.filter(([k]) => research[k]).length;

  return (
    <div style={{
      background: 'rgba(8,17,28,0.55)',
      border: `1px solid ${C.lineSoft}`,
      borderRadius: 7, padding: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Icon name="bilgi" size={13} color={C.iceDeep} />
        <span style={lbl({ fontSize: 8.5, letterSpacing: 1.5, flex: 1 })}>Araştırma</span>
        <span style={num({ fontSize: 10, color: C.iceSoft })}>{acikSayi} / {liste.length}</span>
      </div>

      {/* Araştırmacı uyarısı — işçi yoksa kuyruk hiç ilerlemez */}
      <div style={{
        display: 'flex', gap: 7, alignItems: 'flex-start',
        padding: '6px 8px', borderRadius: 5, marginBottom: 9,
        background: workers === 0 ? 'rgba(224,179,87,0.08)' : 'rgba(78,207,168,0.06)',
        border: `1px solid ${workers === 0 ? 'rgba(224,179,87,0.3)' : 'rgba(78,207,168,0.22)'}`,
      }}>
        <Icon name={workers === 0 ? 'uyari' : 'isci'} size={12}
          color={workers === 0 ? C.warn : C.good} />
        <span style={{
          fontFamily: FONT.ui, fontSize: 9.5, lineHeight: 1.5,
          color: workers === 0 ? '#e8cf9a' : C.textDim,
        }}>
          {workers === 0
            ? 'Araştırmacı yok — salona işçi atamadan hiçbir araştırma ilerlemez.'
            : `${workers} araştırmacı çalışıyor; süre araştırmacı sayısına bölünüyor.`}
        </span>
      </div>

      {/* Kuyruk — yalnız doluyken yer kaplasın */}
      {queue.length > 0 && (
        <div style={{ marginBottom: 9, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {queue.map((o, i) => {
            const aktif = i === 0 && !o.waiting;
            return (
              <div key={o.id} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '5px 7px', borderRadius: 5,
                background: aktif ? 'rgba(61,159,214,0.14)' : 'rgba(8,17,28,0.6)',
                border: `1px solid ${aktif ? 'rgba(61,159,214,0.45)' : C.lineSoft}`,
              }}>
                <span style={num({ fontSize: 9, color: C.textMute, width: 12 })}>{i + 1}</span>
                <span style={{
                  flex: 1, minWidth: 0, fontFamily: FONT.ui, fontSize: 10, color: C.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{unitDefs[o.type]?.name || o.type}</span>
                {o.waiting ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontFamily: FONT.ui, fontSize: 9, color: C.warn,
                  }}>
                    <Icon name="uyari" size={10} color={C.warn} />
                    {WAIT_LABEL[o.waitingReason] || 'bekliyor'}
                  </span>
                ) : (
                  <span style={num({ fontSize: 11, color: C.good })}>{fmtTime(o.timeLeft)}</span>
                )}
                <button type="button" onClick={() => onCancel?.(o.id)} title="İptal (kaynak iade)"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'grid' }}>
                  <Icon name="kapat" size={11} color={C.textMute} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {liste.map(([tip, def]) => (
          <Satir key={tip} tip={tip} def={def}
            durum={research[tip] ? 'acik' : siradaki.has(tip) ? 'sirada' : 'kapali'}
            salonLv={level} arastirmaci={workers}
            resources={resources} flows={flows}
            hourSeconds={hourSeconds} worldSpeed={worldSpeed}
            onResearch={onResearch} />
        ))}
      </div>
    </div>
  );
}
