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
 * Liste kışla/ahırdaki eğitim kartlarıyla aynı ızgarada: 9:16 poster
 * kartlar yan yana. Eski satır listesi on birimde paneli aşağı şişirip
 * bina görselini eziyordu.
 */
import { C, FONT, RES_COLOR, btn, label as lbl, num, fmtTime } from '../theme';
import { RES_LABEL, gameMinutesToRealSeconds } from '../flows';
import { WAIT_LABEL } from './queueUI';
import { unitImage } from '../data/unitImages';
import Icon from './Icons';

const BINA_AD = { kisla: 'Kışla', ahir: 'Ahır', atolye: 'Atölye' };

/** Düğmeye sığan kısa bina adı */
const binaKisa = (t) => (t === 'ahir' ? 'AHIR' : t === 'atolye' ? 'ATÖLYE' : 'KIŞLA');

const CAT_COLOR = { piyade: '#7fd4ff', suvari: '#a99cf0', kusatma: '#d9c069' };

const pill = {
  display: 'inline-flex', alignItems: 'center', gap: 2.5,
  padding: '1px 4px', borderRadius: 3,
  background: 'rgba(4,9,15,0.78)', border: '1px solid rgba(255,255,255,0.14)',
  backdropFilter: 'blur(3px)',
};

/**
 * Tek birim KARTI — kışla/ahırdaki eğitim kartlarıyla aynı dil:
 * 9:16 tam kadraj görsel, bilgiler görselin üstünde. Eski uzun satır
 * listesi paneli aşağı doğru şişiriyor, bina görselini eziyordu.
 */
function Kart({
  tip, def, durum, salonLv, arastirmaci, resources,
  binaLv = 0, binaAd = 'Eğitim binası',
  hourSeconds, worldSpeed, onResearch,
}) {
  const ar = def.research;
  const renk = CAT_COLOR[def.category] || C.iceSoft;
  const img = unitImage(tip);
  /*
    İKİ KAPI: salon seviyesi VE birimin eğitildiği binanın seviyesi.
    Basamadığın askeri araştırmak anlamsız — kışla Lvl 10 istiyorsa
    araştırma da Lvl 10 kışla ister.
  */
  const salonTamam = salonLv >= ar.level;
  const binaTamam  = binaLv >= (def.minLevel || 1);
  const seviyeTamam = salonTamam && binaTamam;
  const acik = durum === 'acik';
  const sirada = durum === 'sirada';
  const kaynakTamam = Object.entries(ar.cost).every(([r, a]) => (resources[r] || 0) >= a);
  const basilabilir = !acik && !sirada && seviyeTamam;
  const sure = gameMinutesToRealSeconds(
    arastirmaci > 0 ? Math.max(1, ar.minutes / arastirmaci) : ar.minutes,
    hourSeconds, worldSpeed);

  return (
    <div style={{
      position: 'relative', aspectRatio: '9 / 16', borderRadius: 6, overflow: 'hidden',
      background: '#0b1420',
      border: `1px solid ${acik ? 'rgba(108,221,163,0.5)' : seviyeTamam ? `${renk}55` : C.lineSoft}`,
    }}>
      {img ? (
        <img src={img} alt={def.name || tip} draggable={false} style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: '50% 12%',
          /* Salon seviyesi yetmiyorsa kart bakışta soluk — yapısal engel */
          filter: acik ? 'none' : seviyeTamam ? 'grayscale(0.35)' : 'grayscale(0.85) brightness(0.55)',
        }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <Icon name={def.category === 'suvari' ? 'at' : 'kalkan'} size={28} color={C.lineBright} />
        </div>
      )}

      {/* ÜST — gereken salon seviyesi (solda) · süre (sağda) */}
      <div style={{
        position: 'absolute', top: 4, left: 4, right: 4,
        display: 'flex', alignItems: 'flex-start', gap: 3,
      }}>
        <span title={salonTamam ? `Rún Salonu Lvl ${ar.level}`
          : `Rún Salonu Lvl ${ar.level} gerekiyor (şu an ${salonLv})`}
          style={{ ...pill, borderColor: salonTamam ? 'rgba(255,255,255,0.14)' : 'rgba(224,179,87,0.55)' }}>
          <Icon name={salonTamam ? 'bilgi' : 'kilit'} size={9}
            color={salonTamam ? C.textMute : '#e0b357'} />
          <span style={num({ fontSize: 8, color: salonTamam ? C.textDim : '#e8cf9a' })}>
            {ar.level}
          </span>
        </span>
        {/* Eğitim binası kapısı — yalnız yetmiyorken göster, kart dar */}
        {!binaTamam && (
          <span title={`${binaAd} Lvl ${def.minLevel} gerekiyor (şu an ${binaLv})`}
            style={{ ...pill, borderColor: 'rgba(224,179,87,0.55)' }}>
            <Icon name={def.trainedAt === 'ahir' ? 'at' : def.trainedAt === 'atolye' ? 'atolye' : 'kisla'}
              size={9} color="#e0b357" />
            <span style={num({ fontSize: 8, color: '#e8cf9a' })}>{def.minLevel}</span>
          </span>
        )}
        {!acik && (
          <span style={{ ...pill, marginLeft: 'auto', borderColor: `${renk}55` }}>
            <span style={num({ fontSize: 8, color: renk })}>{fmtTime(sure)}</span>
          </span>
        )}
        {acik && (
          <span style={{ ...pill, marginLeft: 'auto', borderColor: 'rgba(108,221,163,0.5)' }}>
            <Icon name="bonus" size={9} color={C.good} />
          </span>
        )}
      </div>

      {/* ALT — ad, maliyet, düğme; hepsi görselin üstünde */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '24px 5px 5px',
        background: 'linear-gradient(180deg, transparent, rgba(4,9,15,0.62) 32%, rgba(4,9,15,0.95) 68%)',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{
          fontFamily: FONT.head, fontSize: 11.5, fontWeight: 600, letterSpacing: 0.3,
          color: C.frost, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
        }}>{def.name}</div>

        {acik ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: FONT.ui, fontSize: 8.5, color: C.good,
          }}>
            <Icon name="bonus" size={9} color={C.good} />
            {def.trainedAt === 'ahir' ? 'ahırda eğitilir' : 'kışlada eğitilir'}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Object.entries(ar.cost).map(([r, a]) => {
                const ok = (resources[r] || 0) >= a;
                return (
                  <span key={r} title={`${RES_LABEL[r] || r}: ${a}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    <Icon name={r} size={9} color={ok ? RES_COLOR[r] : C.dangerDim} />
                    <span style={num({ fontSize: 8, color: ok ? C.textDim : '#ff9aa2' })}>{a}</span>
                  </span>
                );
              })}
            </div>
            <button type="button" disabled={!basilabilir}
              onClick={() => onResearch?.(tip)}
              title={!salonTamam ? `Rún Salonu Lvl ${ar.level} gerekiyor (şu an ${salonLv})`
                : !binaTamam ? `${binaAd} Lvl ${def.minLevel} gerekiyor (şu an ${binaLv})`
                : sirada ? 'Zaten kuyrukta'
                  : kaynakTamam ? 'Araştırmayı sıraya al'
                    : 'Kaynak yetmiyor — yine de sıraya alınır, sırası gelince ödenir'}
              style={btn(basilabilir ? (kaynakTamam ? 'primary' : 'ghost') : 'disabled', {
                width: '100%', padding: '3px 4px', fontSize: 8.5, letterSpacing: 0.8,
              })}>
              {sirada ? 'KUYRUKTA'
                : !salonTamam ? `SALON ${ar.level}`
                : !binaTamam ? `${binaKisa(def.trainedAt)} ${def.minLevel}`
                : 'ARAŞTIR'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResearchPanel({
  level = 0, workers = 0, binaSeviyeleri = {},
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
  /*
    Araştırılan birim listeden ÇIKAR: bu salonun işi biten iş değil,
    bekleyen iş. Açık birimler zaten kışla/ahır panelinde duruyor.
    Araştırma köy başına ayrı tutuluyor (village.research) — yeni köyde
    liste yeniden dolu başlar.
  */
  const bekleyen = liste.filter(([k]) => !research[k]);

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
        <div className="tn-scroll" style={{
          marginBottom: 9, display: 'flex', flexDirection: 'column', gap: 4,
          maxHeight: 120, overflowY: 'auto', paddingRight: 2,
        }}>
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

      {bekleyen.length === 0 ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '9px 10px', borderRadius: 6,
          background: 'rgba(78,207,168,0.07)', border: '1px solid rgba(78,207,168,0.25)',
          fontFamily: FONT.ui, fontSize: 10, color: C.textDim,
        }}>
          <Icon name="bonus" size={12} color={C.good} />
          Bu köyde araştırılacak birim kalmadı.
        </div>
      ) : (
      /* Kışla/ahırla aynı ızgara: kartlar yan yana, panel aşağı uzamıyor */
      <div style={{
        display: 'grid',
        /*
          ÜST SINIR ŞART: auto-fit + 1fr, tek kart kalınca o kartı panel
          genişliğine kadar şişiriyordu (sarayda tek göçmen kartı bütün
          pencereyi kaplayıp bina görselini eziyordu). 120 px tavanla
          kartlar hep aynı boyda kalıyor.
        */
        gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 120px))',
        justifyContent: 'start', gap: 7,
      }}>
        {bekleyen.map(([tip, def]) => (
          <Kart key={tip} tip={tip} def={def}
            durum={research[tip] ? 'acik' : siradaki.has(tip) ? 'sirada' : 'kapali'}
            salonLv={level} arastirmaci={workers}
            binaLv={binaSeviyeleri[[].concat(def.trainedAt || [])[0]] || 0}
            binaAd={BINA_AD[[].concat(def.trainedAt || [])[0]] || 'Eğitim binası'}
            resources={resources}
            hourSeconds={hourSeconds} worldSpeed={worldSpeed}
            onResearch={onResearch} />
        ))}
      </div>
      )}
    </div>
  );
}
