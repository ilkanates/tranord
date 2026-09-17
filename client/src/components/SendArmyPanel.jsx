/**
 * ORDU GÖNDERME EKRANI — haritada bir yabancı köy seçiliyken açılır.
 *
 * Üç mod: yağma (kayıplar yarı, deponun yarısı taşınır), tam saldırı
 * (kayıplar tam, savunma silinir), keşif (çarpışma yok, bilgi getirir).
 *
 * Tahmin: sunucudan `simulate_battle` ile istenir — savaş formülü tek yerde
 * (server/game/combat.js) durmalı, istemcide kopyası olmamalı. Tahmin ancak
 * hedefi DAHA ÖNCE KEŞFETTİYSEN yapılabilir; keşif verisi yoksa ekran bunu
 * söyler. `tag` alanı yanıtı bu ekrana ait olduğunu doğrulamak için (savaş
 * simülatörü de aynı olayı kullanıyor).
 *
 * DİKKAT: createPortal ile body'ye çiziliyor — harita popover'ının
 * backdropFilter'ı position:fixed'i hapsediyor (bkz. UnitDetail.jsx).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, btn, label as lbl, num, short, fmtTime } from '../theme';
import VILLAGE_DEFS from '../data/villageDefs';
import BUILDING_DEFS from '../data/buildingDefs';
import { unitImage } from '../data/unitImages';
import Icon from './Icons';

const MODES = [
  { key: 'raid',   label: 'YAĞMA',       icon: 'depo',   color: C.warn,
    desc: 'Kayıplar yarıya iner, deposunun yarısı taşınır. Düzenli gelir için.' },
  { key: 'attack', label: 'TAM SALDIRI', icon: 'kilic',  color: C.danger,
    desc: 'Kayıplar tam. Kazanırsan savunması silinir, deposu tamamen yağmalanır.' },
  { key: 'scout',  label: 'KEŞİF',       icon: 'harita', color: C.ice,
    desc: 'Çarpışma yok. Ordusunu, surunu ve deposunu öğrenir. Yalnız izci gider.' },
  { key: 'takviye', label: 'TAKVİYE',    icon: 'kalkan', color: C.good,
    desc: 'Çarpışma yok. Askerin o köyde kalır ve saldırı gelince savunur. '
      + 'Yemini O KÖY öder. Geri çağırınca yürüyerek döner.' },
];

/**
 * MANCINIK HEDEF LİSTESİ — binalar VE tarlalar.
 *
 * Sur YOK: onu koç başı yıkıyor, mancınığa verilse iki
 * makine aynı işi yapardı. Liste tanım dosyalarından türetiliyor, elle
 * yazılsaydı yeni bina eklendiğinde unutulurdu.
 *
 * TARLALAR SONRADAN EKLENDİ. Köyün yok olması artık tarlaların da
 * düşmesini istiyor (bkz. server/game/kusatma.js · koyBosMu): vurulamayan
 * bir şeyi sayınca köy ölümsüz olurdu. Tarla vurmak ayrıca kendi başına
 * bir hamle — düşmanın ÜRETİMİNİ kesiyor.
 *
 * İki grup AYRI başlık altında: oyuncu "Orman"ı bina sanmasın.
 */
const YIKILABILIR_BINA = Object.entries(VILLAGE_DEFS)
  .filter(([k]) => k !== 'sur' && k !== 'hendek' && k !== 'kule')
  .map(([k, d]) => [k, d.name || k])
  .sort((a, b) => a[1].localeCompare(b[1], 'tr'));

const YIKILABILIR_TARLA = Object.entries(BUILDING_DEFS)
  .map(([k, d]) => [k, d.name || k])
  .sort((a, b) => a[1].localeCompare(b[1], 'tr'));

const ERR = {
  konum_yok: 'Köyünün dünya konumu yok.',
  /*
    Bu sebep ARTIK yalnız İÇİNDE bulunduğun köye sefer için geliyor;
    kendi öbür köylerine her kip açıldı. Eski metin ("kendi köyüne
    saldıramazsın") yeni kuralı yanlış anlatıyordu.
  */
  kendi_koyun: 'Şu an bulunduğun köye sefer gönderemezsin — önce başka bir köye geç.',
  sefer_limiti: 'Aynı anda daha fazla sefer yürütemezsin.',
  gecersiz_hedef: 'Bu hedefe sefer açılamaz.',
  // PvP açıldı; sunucu bu sebebi artık göndermiyor ama eski istemciler
  // ya da yolda kalmış bir paket için karşılığı duruyor.
  oyuncu_hedefi_kapali: 'Oyuncu köylerine saldırı kapalı.',
  gecersiz_mod: 'Geçersiz sefer türü.',
  bilinmeyen_birim: 'Bilinmeyen birim.',
  yetersiz_asker: 'O kadar askerin yok.',
  asker_secilmedi: 'Hiç asker seçmedin.',
  kesif_icin_izci_gerek: 'Keşfe yalnızca izci gönderilebilir.',
  saldiri_gucu_yok: 'Seçtiğin birimlerin saldırı gücü yok.',
  gecersiz_koy: 'Hedef köy bulunamadı.',
  savunma_gucu_yok: 'Seçtiğin birimlerin savunma gücü yok — takviye olamaz.',
  takviye_yalniz_oyuncuya: 'NPC köyüne takviye gönderilmez.',
  kusatma_yalniz_saldiri: 'Koçbaşı ve mancınık yalnız TAM SALDIRIDA kullanılır.',
  takviye_yok: 'Bu takviye artık orada değil.',
  senin_degil: 'Bu takviye senin değil.',
};

/**
 * ACEMİ KALKANI sebebi KALAN SÜREYİ de taşıyor: "acemi_kalkani:37".
 * Düz bir sözlük araması bunu yakalayamaz, sayıyı da göstermek gerek —
 * "saldıramazsın" demek yetmez, oyuncu NE ZAMAN saldırabileceğini
 * bilmeli, yoksa her gün yeniden deneyip aynı duvara çarpar.
 */
function hataMetni(reason) {
  if (typeof reason === 'string' && reason.startsWith('acemi_kalkani')) {
    const saat = Number(reason.split(':')[1]) || 0;
    const sure = saat >= 24
      ? `${Math.ceil(saat / 24)} oyun günü`
      : `${Math.max(1, Math.round(saat))} oyun saati`;
    return `Bu köy ACEMİ KALKANI altında — yeni oyuncu. Kalkan ${sure} `
      + 'sonra ya da nüfusu 200 e ulaşınca düşer. Takviye ve hammadde '
      + 'gönderebilirsin.';
  }
  return ERR[reason] || reason || 'Sefer açılamadı.';
}

/**
 * Yürüyüş süresi — sunucudaki army.js ile AYNI kural.
 * Birim hızı = saatte kaç hex; en yavaş birim belirler. Oyun saati gerçek
 * saniyeye `hourSeconds` ile çevrilir (1× → 3600).
 *
 * ASKERSİZ SEFER = KAHRAMAN TEK BAŞINA. O zaman süreyi kahramanın hızı
 * belirliyor. Eskiden bu durumda 0 dönüyordu: kahramanı yalnız
 * gönderirken ekranda "0 sn" yazıyor, kahramanın hızının bir işe
 * yaradığı hiçbir yerden anlaşılmıyordu (İlkan sordu).
 */
function marchSeconds(units, unitDefs, distance, hourSeconds, minMinutes = 1,
  kahramanHiz = 0) {
  let hiz = Infinity;
  for (const [k, n] of Object.entries(units)) {
    if (!(n > 0)) continue;
    const h = unitDefs[k]?.stats?.hiz;
    if (h > 0 && h < hiz) hiz = h;
  }
  if (!Number.isFinite(hiz)) {
    if (!(kahramanHiz > 0)) return 0;
    hiz = kahramanHiz;
  }
  const gameHours = Math.max(minMinutes / 60, distance / hiz);
  return Math.round(gameHours * hourSeconds);
}

/**
 * Bu birim SAVAŞÇI mı? Hızlı seçim yalnız savaşçıları alır.
 *
 * Dışarıda kalanlar:
 *   • İzci — savaşmaz, yalnız keşfeder ve taşır. Saldırıya karışırsa
 *     bedavaya ölür, savunmaya karışırsa gücü şişirir.
 *   • Göçmen — saldırısı ve savunması SIFIR. Yeni köy kurmak için lazım;
 *     savaşa gönderilirse hem boşa gider hem yerleşim hakkı kaçar.
 *
 * Ölçüt sabit liste değil, birimin KENDİ değerleri: yeni bir savaşmayan
 * birim eklendiğinde kendiliğinden dışarıda kalır.
 */
function savasci(def, scoutSet, key) {
  if (scoutSet?.has(key)) return false;
  const s = def?.stats;
  if (!s) return false;
  return (s.saldiri || 0) > 0 || (s.yayaSav || 0) > 0 || (s.atliSav || 0) > 0;
}

/**
 * Bu birim saldırgan mı? Saldırısı ortalama savunmasından büyükse evet.
 * Tanımdan çıkıyor; sabit liste tutulsaydı yeni birimde unutulurdu.
 */
function saldirgan(def) {
  const s = def?.stats;
  if (!s) return false;
  return (s.saldiri || 0) > (((s.yayaSav || 0) + (s.atliSav || 0)) / 2);
}

function carryCapacity(units, unitDefs, statsNow = {}) {
  return Object.entries(units).reduce(
    (s, [k, n]) => s + ((statsNow[k]?.kapasite ?? unitDefs[k]?.stats?.kapasite) || 0) * n, 0);
}

function UnitRow({ u, def, st, have, value, onChange, disabled, reason }) {
  const img = unitImage(u);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 7px', borderRadius: 5,
      background: value > 0 ? 'rgba(143,220,255,0.07)' : 'rgba(8,17,28,0.5)',
      border: `1px solid ${value > 0 ? C.lineBright : C.lineSoft}`,
      opacity: disabled ? 0.45 : 1,
    }} title={disabled ? reason : ''}>
      <div style={{
        width: 26, height: 36, borderRadius: 3, overflow: 'hidden',
        background: '#0b1420', flexShrink: 0,
      }}>
        {img && <img src={img} alt="" draggable={false} style={{
          width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%',
        }} />}
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontFamily: FONT.head, fontSize: 11.5, color: C.frost,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{def?.name || u}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 1 }}>
          {/* Yükseltmelerle güncel saldırı (unitStatsNow) — temel değer değil */}
          <span style={num({ fontSize: 8.5, color: C.textMute })}>
            sal {st?.saldiri != null ? Math.round(st.saldiri) : '—'}
          </span>
          <span style={num({ fontSize: 8.5, color: C.textMute })}>
            hız {def?.stats?.hiz ?? '—'}
          </span>
          <span style={num({ fontSize: 8.5, color: C.textMute })}>
            yük {st?.kapasite != null ? Math.round(st.kapasite) : '—'}
          </span>
        </div>
      </div>

      <span style={num({ fontSize: 10, color: C.textDim, minWidth: 34, textAlign: 'right' })}>
        /{have}
      </span>

      <input type="number" min={0} max={have} value={value} disabled={disabled}
        onChange={(e) => onChange(Math.max(0, Math.min(have, Math.floor(Number(e.target.value) || 0))))}
        style={{
          width: 58, flexShrink: 0, minWidth: 0,
          padding: '3px 5px', textAlign: 'right',
          fontFamily: FONT.num, fontSize: 11, color: C.frost,
          background: 'rgba(4,9,15,0.75)', border: `1px solid ${C.lineSoft}`,
          borderRadius: 4, outline: 'none',
        }} />

      <button onClick={() => onChange(have)} disabled={disabled} title="Tümünü seç"
        style={btn('ghost', { padding: '3px 6px', fontSize: 8, letterSpacing: 0.6, flexShrink: 0 })}>
        TÜM
      </button>
    </div>
  );
}

export default function SendArmyPanel({
  socket, target, army = {}, unitDefs = {}, unitStatsNow = {}, marchInfo = {}, intel = null,
  kahraman = null, activeSlot = null, villages = [], onClose,
  /*
    HARİTA KISAYOLUNDAN GELEN KİP. Oyuncu köye tıklayıp "KEŞFET" dediyse
    ekran keşif kipinde açılmalı; varsayılana düşüp oyuncuyu kipi tekrar
    seçmeye zorlamak, kısayolu kısayol olmaktan çıkarırdı.

  */
  baslangicKip = null,
}) {
  /*
    KAHRAMAN HANGİ MODLARDA? Sunucudaki KAHRAMAN_MODLARI ile aynı liste
    (index.js). Saldırı ve yağmada savaşır, takviyede gittiği köyü savunur.
  */
  const KAHRAMAN_MODLARI = new Set(['attack', 'raid', 'takviye']);
  /*
    KAHRAMAN İSTENDİ AMA GELMEDİ — SEBEBİ.

    Sunucu seferi kahramansız yolluyor (ölü kahraman yüzünden saldırıyı
    iptal etmek yanlış olurdu) ama artık susmuyor. Susması, oyuncunun
    kahramanını yolladığını sanıp savaşı kahramansız vermesi demekti
    (İlkan bildirdi).
  */
  const ATLANDI_METNI = {
    kahraman_yok: 'Kahramanın olmadığı için',
    olu: 'Kahramanın baygın olduğu için',
    seferde: 'Kahraman zaten seferde olduğu için',
    macerada: 'Kahraman macerada olduğu için',
    donuyor: 'Kahraman eve dönüş yolunda olduğu için',
    konak_yok: 'Kahraman Konağın olmadığı için',
    baska_koyde: 'Kahraman başka köyde olduğu için',
  };

  const NEREDE_ENGEL = {
    sefer: 'Zaten seferde', macera: 'Macerada',
    takviye: 'Başka köyde takviyede', donuyor: 'Eve dönüş yolunda',
  };

  /*
    KENDİ KÖYÜM DE DİĞERLERİYLE AYNI (İlkan'ın kararı). Kip listesi
    artık daralmıyor; yalnız VARSAYILAN kip kendi köyümde takviye,
    çünkü çoklu köyde oraya gönderilen şey neredeyse her zaman destek.
    Oyuncu isterse üstteki kip düğmelerinden yağmaya geçiyor.
  */
  const kendiKoyum = target?.kind === 'self';
  const moduller = MODES;

  const [mode, setMode] = useState(() => {
    if (MODES.some(m => m.key === baslangicKip)) return baslangicKip;
    return kendiKoyum ? 'takviye' : 'raid';
  });
  const [hedefBina, setHedefBina] = useState('');
  // İkinci mancınık hedefi — yalnız atölye Lvl 10'dan itibaren
  const [hedefBina2, setHedefBina2] = useState('');
  const [sel, setSel] = useState({});
  // Kahraman sefere katılsın mı — varsayılan HAYIR: kahramanı yanlışlıkla
  // riske atmak, yanlışlıkla evde bırakmaktan çok daha pahalı
  const [kahramaniGotur, setKahramaniGotur] = useState(false);
  /*
    YUVA YAP — kendi köyüne takviyede kahramanın evi oraya taşınsın mı.
    Varsayılan AÇIK: eski davranış buydu ve kahramanı kendi köyüne
    yollamanın en sık sebebi taşınmak.
  */
  const [yuvaYap, setYuvaYap] = useState(true);
  const [err, setErr] = useState(null);
  const [sent, setSent] = useState(null);
  const [pred, setPred] = useState(null);

  const [noReply, setNoReply] = useState(false);
  const pending = useRef(false);   // gönderim yanıt bekliyor mu

  /**
   * Sunucu sefer sistemini tanıyor mu? `marchInfo` yalnızca yeni sunucudan
   * gelir. Eski sunucu çalışıyorsa `send_army` olayını kimse dinlemez: tıklama
   * sessizce kaybolur, hiçbir hata görünmez. Bunu ekranda söylemek şart.
   */
  const serverReady = !!marchInfo?.hourSeconds;

  const hourSeconds = marchInfo.hourSeconds || 3600;
  const minMarchMin = marchInfo.minMarchMinutes || 1;
  /**
   * Keşif birimleri normalde sunucudan gelir; gelmiyorsa istemcide
   * tanımdaki `kesif` bayrağından türetilir.
   *
   * ESKİ YEDEK KURAL YANLIŞTI: "kapasite ≥ 100 ve saldırı ≤ 10" diyordu
   * ama izcinin yükü dengeleme sırasında 0'a indirildi — yedek yol
   * çalışsaydı liste BOŞ kalır ve keşif modunda hiçbir birim
   * seçilemezdi. Sunucu listeyi gönderdiği için fark edilmiyordu;
   * sessizce çürüyen bir dal.
   *
   * KİMLİĞE DEĞİL İÇERİĞE BAĞLI: `marchInfo` ve `unitDefs` her saniye
   * yeniden kuruluyor (bkz. flows.js · shiftTimers), yani kimliğe
   * bağlansaydı bu Set her saniye yenilenirdi — aşağıdaki efekt de
   * onunla birlikte çalışıp tahmini silerdi.
   */
  const scoutAnahtar = (marchInfo.scoutUnits || []).join(',');
  const unitAnahtar = Object.keys(unitDefs).join(',');
  const scoutSet = useMemo(() => {
    if (marchInfo.scoutUnits?.length) return new Set(marchInfo.scoutUnits);
    return new Set(Object.entries(unitDefs)
      .filter(([, d]) => d?.kesif === true).map(([k]) => k));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoutAnahtar, unitAnahtar]);
  const distance  = target?.distance ?? 0;

  const available = useMemo(
    () => Object.entries(army).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]),
    [army]);

  /*
    Mod değişince uygun olmayan seçimleri temizle.

    Kuşatma da burada düşüyor: "tam saldırı"da mancınık seçip yağmaya
    geçen oyuncunun seçimi ekranda duruyor ama geçersiz — gönderirken
    sunucudan hata yiyordu.
  */
  useEffect(() => {
    setSel(s => Object.fromEntries(Object.entries(s).filter(([k]) => {
      if (mode === 'scout') return scoutSet.has(k);
      if (mode !== 'attack' && unitDefs[k]?.category === 'kusatma') return false;
      return true;
    })));
    /*
      TAHMİNİ SIFIRLA — yalnız MOD değiştiğinde. Eskiden bu efekt
      `scoutSet` kimliğine de bağlıydı ve o Set her saniye yenilendiği
      için tahmin saniyede bir siliniyordu: satır çıkıyor, kayboluyor,
      220 ms sonra geri geliyordu.
    */
    setPred(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const chosen = useMemo(
    () => Object.fromEntries(Object.entries(sel).filter(([, n]) => n > 0)),
    [sel]);
  const chosenTotal = Object.values(chosen).reduce((a, b) => a + b, 0);
  /*
    İSTİHBARATIN İÇERİK PARMAK İZİ. `intel` her saniye yeni bir nesne
    (bkz. flows.js · shiftTimers) ama içeriği yalnız yeni bir keşif
    dönünce değişiyor; `at` damgası o anı taşıyor.
  */
  /*
    KEŞFİN YAŞI. Saniyede bir yeniden hesaplanıyor ama yalnız METİN —
    hiçbir state sıfırlamıyor, o yüzden tahmin satırını titretmiyor.
  */
  const intelYas = intel?.at
    ? new Date(intel.at).toLocaleString('tr-TR',
      { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;

  const intelAnahtar = intel
    ? `${intel.at || 0}|${intel.surLevel || 0}|${intel.hendekLevel || 0}|${intel.kulePct || 0}|${intel.population || 0}|${JSON.stringify(intel.army || {})}`
    : '';
  /*
    KAHRAMAN BU SEFERE KATILABİLİR Mİ?

    Üç koşul: ölü olmamalı, başka bir işte (sefer/macera/takviye) olmamalı
    ve SEFERİN ÇIKTIĞI köyde durmalı. Sonuncusu çoklu köy yüzünden:
    kahraman tek, ordu her köyden çıkabiliyor.

    Aynı denetim SUNUCUDA da var — buradaki yalnız oyuncuya sebebi
    söylemek için; kutuyu gizlemek bir denetim değildir.

    SÜRE HESABINDAN ÖNCE tanımlı olmak ZORUNDA: kahraman tek başına
    giderken yürüyüş süresini onun hızı belirliyor. Aşağıda tanımlıydı ve
    ekran "Cannot access 'kahramanUygun' before initialization" diye
    çöküyordu (tarayıcıda görüldü).
  */
  /*
    KAHRAMANIN BULUNDUĞU KÖYÜN ADI. "Başka köyde" deyip hangisi olduğunu
    söylememek, oyuncuyu kahramanını aramak için köyleri tek tek
    gezdiriyordu.
  */
  const kahramanKoyu = (kahraman?.bulunduguSlot && villages.length)
    ? (villages.find(v => v.slotKey === kahraman.bulunduguSlot)?.name || null)
    : null;

  /*
    KURAL SUNUCUDAN: paket kahramanın FİİLEN bulunduğu slotu taşıyor
    (üssü ya da takviyede olduğu köy). Burada elle yazılıyken sunucudaki
    koşuldan ayrışmıştı ve konağı olmayan kahramanda kutu açık
    görünüyordu — sunucu ise kahramanı sessizce almıyordu.

    TAKVİYE ARTIK ENGEL DEĞİL: kahraman kendi başka köyünde misafirse o
    köyden sefere çıkabiliyor, o yüzden 'takviye' durumu tek başına
    kutuyu kapatmıyor; kapatan şey KÖYÜN FARKLI olması.
  */
  const kahramanEngeli = !kahraman?.var ? 'Kahramanın yok'
    : kahraman.olu ? 'Ölü — önce diriltmen gerekiyor'
      : (kahraman.nerede === 'sefer' || kahraman.nerede === 'macera'
        || kahraman.nerede === 'donuyor')
        ? NEREDE_ENGEL[kahraman.nerede] || 'Şu an başka bir işte'
        : !kahraman.bulunduguSlot
          ? 'Kahraman Konağı yok — kahramanın yürüyecek bir yeri yok'
          : (activeSlot && kahraman.bulunduguSlot !== activeSlot)
            ? `${kahramanKoyu ? kahramanKoyu + ' köyünde' : 'Başka köyde'} — `
              + 'sefer oradan çıkmalı'
            : null;
  const kahramanUygun = !!kahraman?.var && !kahramanEngeli;

  /*
    Kahraman bu seferde yürüyorsa hızı süreye giriyor — ama YALNIZ asker
    yoksa. Orduyla giderse kahraman orduyu bekler (sunucudaki kuralın
    aynısı: army.js · marchGameHours).
  */
  const kahramanYuruyor = kahramaniGotur && kahramanUygun;
  /*
    HEDEF BENİM KÖYÜM MÜ — yuva kutusu ve "tek başına gönder" mantığı
    buna bakıyor. `villages` oyuncunun kendi köy listesi (slot→ad).
  */
  const kendiKoyumMu = !!target && villages.some(v => v.slotKey === target.key);
  /*
    GÖNDERİLEBİLİR — kahraman TEK BAŞINA da gidebilir.

    Düğme `chosenTotal <= 0` ile kapanıyordu ve kahramanı taşımak
    isteyen oyuncu yanına asker katmak zorunda kalıyordu (İlkan
    bildirdi). Sunucu askersiz seferi kahraman varken zaten kabul
    ediyor — ölçüldü; engel yalnız buradaydı.
  */
  const gonderilebilir = chosenTotal > 0 || kahramanYuruyor;
  const secs = marchSeconds(chosen, unitDefs, distance, hourSeconds, minMarchMin,
    kahramanYuruyor ? (kahraman?.hiz || 0) : 0);
  const cap  = carryCapacity(chosen, unitDefs, unitStatsNow);

  /*
    Seçimde mancınık var mı — hedef seçici yalnız o zaman çıkar.
    Sınıfı birimin EKİPMANINDAN okunuyor (sunucudaki kusatma.js ile aynı
    kural); ada bakılsaydı yeni bir mancınık eklenince unutulurdu.
  */
  const mancinikVar = useMemo(
    () => Object.keys(chosen).some(
      u => (unitDefs[u]?.equipment || []).includes('mancinik')),
    [chosen, unitDefs]);

  /*
    İKİNCİ HEDEF — atölye seviyesi sunucudan (marchInfo) geliyor: seviye
    SALDIRANIN köyüne ait, panelin haritadan aldığı hedef bilgisinde yok.
    Karar yine sunucuda; buradaki kontrol yalnız kutuyu göstermek için.
  */
  /*
    KUŞATMA YALNIZ TAM SALDIRIDA. Sunucu da reddediyor; buradaki kilit
    oyuncuyu boşuna seçtirip sonra hata yedirmemek için. Sınıf birimin
    KENDİ tanımından okunuyor, elle liste tutulmuyor.
  */
  const kusatmaKapali = mode !== 'attack';
  const kusatmaBirimi = (u) => unitDefs[u]?.category === 'kusatma';

  const minAtolye = marchInfo?.ikiHedefMinAtolye ?? 10;
  const ikiHedefAcik = (marchInfo?.atolyeSeviye ?? 0) >= minAtolye;

  // ── Sonuç/hata dinleyicileri ──
  useEffect(() => {
    if (!socket) return;
    const onErr = ({ reason }) => {
      pending.current = false; setNoReply(false);
      setErr(hataMetni(reason));
    };
    const onSentOk = (d) => { pending.current = false; setNoReply(false); setSent(d); };
    const onBattle = (d) => { if (d?.tag === 'sendpanel') setPred(d.ok ? d.result : null); };
    socket.on('army_error', onErr);
    socket.on('army_sent', onSentOk);
    socket.on('battle_result', onBattle);
    return () => {
      socket.off('army_error', onErr);
      socket.off('army_sent', onSentOk);
      socket.off('battle_result', onBattle);
    };
  }, [socket]);

  // ── Tahmin: keşif verisi varsa sunucudan sor ──
  useEffect(() => {
    if (!socket || mode === 'scout' || mode === 'takviye' || !intel || chosenTotal <= 0) { setPred(null); return; }
    const t = setTimeout(() => {
      socket.emit('simulate_battle', {
        tag: 'sendpanel', attacker: chosen, defender: intel.army || {},
        surLevel: intel.surLevel || 0, hendekLevel: intel.hendekLevel || 0,
        // Kule bonusu okçu dolulukla ölçekli geliyor — tahmin de bunu saymalı
        kulePct: intel.kulePct || 0,
        mode: mode === 'raid' ? 'raid' : 'normal',
        /*
          KAHRAMAN TAHMİNE DE GİRSİN. Girmiyordu: kutuyu işaretleyince
          tahmindeki sayılar hiç değişmiyor, oyuncu da haklı olarak
          "bonus yansımıyor" diyordu (İlkan bildirdi). Gücü sunucu
          hesaplıyor; buradan yalnız "götürüyorum" bilgisi gidiyor.
        */
        kahraman: kahramanYuruyor,
      });
    }, 220);   // yazarken her tuşta istek atma
    return () => clearTimeout(t);
    /*
      İÇERİĞE BAĞLI: `intel` nesnesi her saniye yeniden kuruluyor ama
      içeriği yalnız yeni keşifte değişiyor. Kimliğe bağlasaydık panel
      açıkken sunucuya saniyede bir gereksiz istek giderdi.
      eslint-disable-next-line react-hooks/exhaustive-deps
    */
    /*
      `kahramanYuruyor` de bağımlılık: kutu değişince tahmin yeniden
      istenmeli, yoksa kahramanlı ve kahramansız tahmin aynı kalır —
      düzeltmeye çalıştığımız yanılgının ta kendisi.
    */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, mode, intelAnahtar, chosenTotal, kahramanYuruyor, JSON.stringify(chosen)]);

  // ESC ile kapat
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!target) return null;
  const modeDef = moduller.find(m => m.key === mode);

  const send = () => {
    setErr(null); setNoReply(false);
    pending.current = true;
    socket?.emit('send_army', {
      targetKey: target.key, mode, units: chosen,
      hedefBina: hedefBina || null,
      hedefBina2: (ikiHedefAcik && hedefBina) ? (hedefBina2 || null) : null,
      kahraman: kahramaniGotur && kahramanUygun,
      /* Yalnız takviyede ve kendi köyümde anlamlı — sunucu da öyle okuyor */
      kahramanYuva: yuvaYap,
    });
    // Sunucu ne 'army_sent' ne 'army_error' döndürmezse olayı kimse dinlemiyor
    // demektir — sessiz başarısızlık yerine bunu söyle.
    setTimeout(() => { if (pending.current) setNoReply(true); }, 3000);
  };

  const box = {
    padding: '8px 10px', borderRadius: 6,
    background: 'rgba(8,17,28,0.55)', border: `1px solid ${C.lineSoft}`,
  };

  return createPortal(
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 3200,
      background: 'rgba(4,8,13,0.74)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'grid', placeItems: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="tn-rise" style={{
        width: 'min(660px, 100%)', maxHeight: '100%', overflow: 'auto',
        borderRadius: 10, padding: 16,
        background: 'linear-gradient(180deg, rgba(13,26,42,0.97), rgba(9,18,30,0.99))',
        border: `1px solid ${modeDef.color}55`,
        boxShadow: '0 24px 70px rgba(0,0,0,0.75)',
        display: 'flex', flexDirection: 'column', gap: 11,
      }}>
        {/* Başlık */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Icon name="koy" size={20} color={modeDef.color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT.head, fontSize: 20, fontWeight: 600, letterSpacing: 1,
              color: C.frost, lineHeight: 1.15,
            }}>{target.name}</div>
            <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute, marginTop: 2 }}>
              {target.tierLabel || 'köy'} · {target.key} · {distance} hex
              {target.army != null ? ` · ordu ~${short(target.army)}` : ''}
            </div>
          </div>
          <button onClick={onClose} title="Kapat (Esc)" style={{
            display: 'grid', placeItems: 'center', width: 26, height: 26, padding: 0,
            borderRadius: 5, cursor: 'pointer',
            background: 'rgba(4,9,15,0.7)', border: `1px solid ${C.lineBright}`,
          }}>
            <Icon name="kapat" size={12} color={C.textDim} strokeWidth={2} />
          </button>
        </div>

        {sent ? (
          /* ── Gönderildi ── */
          <div style={{ ...box, borderColor: `${C.good}66`, background: 'rgba(108,221,163,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="ordu" size={16} color={C.good} />
              <span style={{ fontFamily: FONT.head, fontSize: 14, color: C.frost }}>
                Ordu yolda
              </span>
            </div>
            <div style={{ fontFamily: FONT.ui, fontSize: 11, color: C.textDim, marginTop: 6, lineHeight: 1.6 }}>
              {sent.toName} — varış {fmtTime(sent.seconds)} sonra, dönüş bir o kadar.
              Seferi Ordu sekmesinden izleyebilirsin; sonuç savaş raporu olarak gelir.
            </div>
            {sent.kahramanAtlandi && (
              <div style={{
                marginTop: 8, padding: '7px 9px', borderRadius: 5,
                background: 'rgba(242,187,96,0.10)', border: `1px solid ${C.warn}44`,
                fontFamily: FONT.ui, fontSize: 10.5, color: '#f5dca8', lineHeight: 1.55,
              }}>
                <b>Kahraman gitmedi.</b>{' '}
                {ATLANDI_METNI[sent.kahramanAtlandi] || 'Uygun olmadığı için'} sefere
                katılamadı; ordu kahramansız yola çıktı.
              </div>
            )}
            <button onClick={onClose} style={btn('primary', { width: '100%', marginTop: 10, padding: 8 })}>
              TAMAM
            </button>
          </div>
        ) : (
          <>
            {/* Mod seçimi */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {moduller.map(m => {
                const on = m.key === mode;
                return (
                  <button key={m.key} onClick={() => { setMode(m.key); setErr(null); }} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: '7px 6px', borderRadius: 6, cursor: 'pointer',
                    fontFamily: FONT.ui, fontSize: 9.5, letterSpacing: 1.1, fontWeight: 600,
                    color: on ? C.frost : C.textDim,
                    background: on ? `${m.color}22` : 'rgba(8,17,28,0.6)',
                    border: `1px solid ${on ? m.color : C.lineSoft}`,
                  }}>
                    <Icon name={m.icon} size={12} color={on ? m.color : C.textFaint} />
                    {m.label}
                  </button>
                );
              })}
            </div>
            <div style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textFaint, lineHeight: 1.5 }}>
              {modeDef.desc}
            </div>

            {/*
              KAHRAMAN — saldırı, yağma ve TAKVİYE.

              Takviyede kahraman gittiği köyde kalıyor ve savunma bonusunu
              ORAYA veriyor; sahibi istediğinde geri çağırıyor (Kahraman
              ekranından). Keşif izcinin, yerleşim göçmenin işi.

              Ölü ya da başka bir köyde duruyorsa kutu KAPALI ama GÖRÜNÜR:
              nedenini yazmazsak oyuncu kahramanın neden gelmediğini
              bilemezdi.
            */}
            {kahraman?.var && KAHRAMAN_MODLARI.has(mode) && (
              <label style={{
                ...box, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 9,
                cursor: kahramanUygun ? 'pointer' : 'default',
                opacity: kahramanUygun ? 1 : 0.55,
              }}>
                <input type="checkbox" disabled={!kahramanUygun}
                  checked={kahramaniGotur && kahramanUygun}
                  onChange={(e) => setKahramaniGotur(e.target.checked)}
                  style={{ accentColor: C.frost, width: 14, height: 14, flexShrink: 0 }} />
                <Icon name="migfer" size={14} color={kahramanUygun ? C.frost : C.textMute} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.frost }}>
                    Kahramanı da götür
                  </div>
                  <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint }}>
                    {/*
                      TEK BAŞINA GİDİYORSA hızını burada yazıyoruz: süre
                      kutusundaki sayının neden o olduğu başka hiçbir
                      yerden anlaşılmıyor.
                    */}
                    {(kahramanUygun && chosenTotal === 0)
                      ? `Tek başına gidiyor · ${kahraman.suvari ? 'süvari' : 'yaya'} · hız ${kahraman.hiz}`
                      : kahramanEngeli || (mode === 'takviye'
                      ? `Lvl ${kahraman.seviye} · o köye savunma +%${
                        kahraman.bonuslar?.savunmaYuzde || 0} · geri çağırana kadar orada kalır`
                      : `Lvl ${kahraman.seviye} · ${kahraman.suvari ? 'süvari' : 'yaya'} · +${
                        Math.round(kahraman.bonuslar?.saldiriGucu || 0)} güç`
                        + ((kahraman.bonuslar?.saldiriYuzde || 0) > 0
                          ? ` · orduya +%${kahraman.bonuslar.saldiriYuzde}` : ''))}
                  </div>
                </div>
              </label>
            )}

            {/*
              MANCINIK HEDEFİ — yalnız seçimde mancınık varken görünür.

              Bina TİPİ gönderiliyor, slot değil: saldıran hedefin hangi
              slotunda ne olduğunu bilmiyor. Sunucu o tipi bulamazsa
              rastgele bir bina vuruyor (sefer boşa gitmesin).
            */}
            {mancinikVar && (
              <div style={{ ...box, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Icon name="atolye" size={12} color="#d9c069" />
                  <span style={lbl({ fontSize: 8.5, letterSpacing: 1.4 })}>Mancınık hedefi</span>
                </div>
                <select value={hedefBina} onChange={(e) => setHedefBina(e.target.value)}
                  style={{
                    width: '100%', padding: '6px 8px', borderRadius: 4,
                    background: 'rgba(4,9,15,0.75)', border: `1px solid ${C.lineSoft}`,
                    color: C.frost, fontFamily: FONT.ui, fontSize: 10.5, outline: 'none',
                  }}>
                  <option value="">Rastgele hedef</option>
                  <optgroup label="Köy binaları">
                    {YIKILABILIR_BINA.map(([k, ad]) => (
                      <option key={k} value={k}>{ad}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Tarlalar">
                    {YIKILABILIR_TARLA.map(([k, ad]) => (
                      <option key={k} value={k}>{ad}</option>
                    ))}
                  </optgroup>
                </select>
                {/*
                  İKİNCİ HEDEF — güç bölünüyor, artmıyor. Yüzdeleri yazmak
                  şart: "iki hedef seçebiliyorum" bedava bir bonus gibi
                  okunuyor, oysa tek hedefe tam güç vurmanın alternatifi.
                */}
                {ikiHedefAcik && (
                  <div style={{ marginTop: 7 }}>
                    <div style={lbl({ fontSize: 8, letterSpacing: 1.2, marginBottom: 4 })}>
                      İkinci hedef · atölye Lvl {minAtolye}+
                    </div>
                    <select value={hedefBina2}
                      onChange={(e) => setHedefBina2(e.target.value)}
                      disabled={!hedefBina}
                      style={{
                        width: '100%', padding: '6px 8px', borderRadius: 4,
                        background: 'rgba(4,9,15,0.75)', border: `1px solid ${C.lineSoft}`,
                        color: hedefBina ? C.frost : C.textMute,
                        fontFamily: FONT.ui, fontSize: 10.5, outline: 'none',
                        opacity: hedefBina ? 1 : 0.55,
                      }}>
                      <option value="">İkinci hedef yok — tek hedefe tam güç</option>
                      <optgroup label="Köy binaları">
                        {YIKILABILIR_BINA.map(([k, ad]) => (
                          <option key={k} value={k}>{ad}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Tarlalar">
                        {YIKILABILIR_TARLA.map(([k, ad]) => (
                          <option key={k} value={k}>{ad}</option>
                        ))}
                      </optgroup>
                    </select>
                    <div style={{
                      fontFamily: FONT.ui, fontSize: 9, color: C.textMute,
                      marginTop: 4, lineHeight: 1.4,
                    }}>
                      {hedefBina2
                        ? 'Kuşatma gücü bölünür: birinci hedefe %60, ikinciye %40.'
                        : hedefBina
                          ? 'Boş bırakırsan bütün güç birinci hedefe gider.'
                          : 'Önce birinci hedefi seç.'}
                    </div>
                  </div>
                )}

                <div style={{
                  fontFamily: FONT.ui, fontSize: 9, color: C.textMute,
                  marginTop: 5, lineHeight: 1.4,
                }}>
                  Suru koç başı yıkar (hendeğe dokunmaz) — mancınık binaları
                  vurur. Hedef o köyde yoksa rastgele bir bina vurulur.
                </div>
              </div>
            )}

            {/* Birim seçimi */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Icon name="ordu" size={12} color={C.iceDeep} />
                <span style={lbl({ fontSize: 8.5, letterSpacing: 1.4 })}>Gönderilecek birimler</span>
                <span style={num({ fontSize: 9.5, color: C.textMute, marginLeft: 'auto' })}>
                  {chosenTotal} asker
                </span>
              </div>

              {/*
                HIZLI SEÇİM — asker tek tek yazmak yerine tek dokunuş.

                İZCİ HİÇBİRİNE GİRMEZ. İzci savaşmaz, yalnız taşır ve
                keşfeder; saldırıya karışırsa bedavaya ölür, savunmaya
                karışırsa savunma gücünü şişirir. "Tüm ordu" bile izciyi
                almıyor — oyuncu izcisini kaybetmek istemez.

                Saldırı/savunma ayrımı birimin KENDİ değerlerinden çıkıyor:
                saldırısı ortalama savunmasından büyükse saldırgan sayılır.
                Sabit bir liste tutulsaydı yeni birim eklendiğinde
                unutulurdu.
              */}
              {available.length > 0 && mode !== 'scout' && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                  {[
                    { k: 'hepsi', etiket: 'TÜM ORDU', sec: () => true },
                    { k: 'saldiri', etiket: 'SALDIRI', sec: (d) => saldirgan(d) },
                    { k: 'savunma', etiket: 'SAVUNMA', sec: (d) => !saldirgan(d) },
                  ].map(({ k, etiket, sec }) => (
                    <button key={k} onClick={() => setSel(
                      Object.fromEntries(available
                        .filter(([u]) => savasci(unitDefs[u], scoutSet, u) && sec(unitDefs[u])
                          && !(kusatmaKapali && kusatmaBirimi(u)))
                        .map(([u, have]) => [u, have])))}
                      style={btn('ghost', {
                        flex: '1 1 auto', padding: '5px 8px', fontSize: 9, letterSpacing: 0.8,
                      })}
                      title={kusatmaKapali ? 'Kuşatma makineleri bu modda seçilmez' : undefined}>
                      {etiket}
                    </button>
                  ))}
                  <button onClick={() => setSel({})}
                    style={btn('ghost', { flexShrink: 0, padding: '5px 8px', fontSize: 9 })}>
                    TEMİZLE
                  </button>
                </div>
              )}

              {available.length === 0 ? (
                <div style={{ ...box, fontFamily: FONT.ui, fontSize: 10.5, color: C.warn }}>
                  Hiç askerin yok. Kışla veya ahırdan birim eğit.
                </div>
              ) : (
                <div style={{
                  /*
                    Sabit "1fr 1fr" telefonda her sutunu ~149 px'e dusuruyor,
                    satirdaki resim + /adet + sayi kutusu + TUM tusu o genislige
                    sigmiyordu. auto-fill ile dar ekranda kendiliginden tek
                    sutuna iniyor, genis ekranda iki sutun kaliyor.
                  */
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(230px, 100%), 1fr))',
                  gap: 5,
                  maxHeight: 250, overflowY: 'auto', overflowX: 'hidden',
                }}>
                  {available.map(([u, have]) => {
                    const scoutOnly = mode === 'scout' && !scoutSet.has(u);
                    const makineKapali = kusatmaKapali && kusatmaBirimi(u);
                    return (
                      <UnitRow key={u} u={u} def={unitDefs[u]}
                        st={unitStatsNow[u] || unitDefs[u]?.stats} have={have}
                        value={sel[u] || 0} disabled={scoutOnly || makineKapali}
                        reason={makineKapali
                          ? 'Kuşatma makinesi yalnız TAM SALDIRIDA'
                          : 'Keşfe yalnızca izci gidebilir'}
                        onChange={(n) => setSel(s => ({ ...s, [u]: n }))} />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Özet */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              <div style={box}>
                <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>TEK YÖN</div>
                <div style={num({ fontSize: 15, color: chosenTotal ? C.frost : C.textMute })}>
                  {chosenTotal ? fmtTime(secs) : '—'}
                </div>
              </div>
              <div style={box}>
                <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>GİDİŞ-DÖNÜŞ</div>
                <div style={num({ fontSize: 15, color: chosenTotal ? C.textDim : C.textMute })}>
                  {chosenTotal ? fmtTime(secs * 2) : '—'}
                </div>
              </div>
              <div style={box}>
                <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>TAŞIMA</div>
                <div style={num({ fontSize: 15, color: chosenTotal ? C.warn : C.textMute })}>
                  {(mode === 'scout' || mode === 'takviye') ? '—' : short(cap)}
                </div>
              </div>
            </div>

            {/* Tahmin */}
            {mode !== 'scout' && mode !== 'takviye' && (
              intel ? (
                <div style={{
                  ...box,
                  borderColor: pred ? (pred.winner === 'attacker' ? `${C.good}55` : `${C.danger}55`) : C.lineSoft,
                  background: pred ? (pred.winner === 'attacker' ? 'rgba(108,221,163,0.07)' : 'rgba(255,111,120,0.07)') : box.background,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <Icon name="savas" size={12} color={C.iceDeep} />
                    <span style={lbl({ fontSize: 8, letterSpacing: 1.3 })}>
                      Son keşfe göre tahmin{intelYas ? ` · ${intelYas}` : ''}
                    </span>
                  </div>
                  {!chosenTotal ? (
                    <div style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textMute }}>
                      Birim seç, tahmin hesaplanır.
                    </div>
                  ) : !pred ? (
                    <div style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textMute }}>
                      hesaplanıyor…
                    </div>
                  ) : (
                    <div style={{ fontFamily: FONT.ui, fontSize: 11, lineHeight: 1.7, color: C.text }}>
                      <div style={{ color: pred.winner === 'attacker' ? C.good : C.danger, fontWeight: 600 }}>
                        {pred.winner === 'attacker' ? 'Kazanırsın' : pred.winner === 'defender' ? 'Kaybedersin' : 'Berabere'}
                        {' · '}atak {short(pred.attackTotal)} / savunma {short(pred.defenseTotal)}
                        {pred.wallBonusPct > 0 ? ` (sur %${pred.wallBonusPct})` : ''}
                      </div>
                      <div style={{ color: C.textDim }}>
                        Beklenen kaybın {Math.round(pred.attackerLossRate * 100)}% ·
                        {' '}onların kaybı {Math.round(pred.defenderLossRate * 100)}%
                      </div>
                      <div style={{ color: C.textFaint, fontSize: 9.5 }}>
                        Keşif verisi eskiyebilir — ordusu bu arada büyümüş olabilir.
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ ...box, background: 'rgba(242,187,96,0.07)', borderColor: `${C.warn}44` }}>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <Icon name="uyari" size={13} color={C.warn} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim, lineHeight: 1.6 }}>
                      Bu köyü hiç keşfetmedin — savunmasını bilmiyorsun, tahmin yapılamaz.
                      Önce izci gönder.
                    </span>
                  </div>
                </div>
              )
            )}

            {/* Keşif verisi özeti */}
            {mode === 'scout' && intel && (
              <div style={box}>
                <div style={lbl({ fontSize: 8, letterSpacing: 1.3, marginBottom: 4 })}>
                  Son keşif
                </div>
                <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim, lineHeight: 1.6 }}>
                  Ordu {short(intel.armyTotal)} · sur {intel.surLevel} / hendek {intel.hendekLevel} ·
                  {' '}depo {short(Object.values(intel.resources || {}).reduce((a, b) => a + b, 0))}
                </div>
              </div>
            )}

            {(!serverReady || noReply) && (
              <div style={{
                ...box, background: 'rgba(255,111,120,0.1)', borderColor: C.dangerDim,
              }}>
                <div style={{ display: 'flex', gap: 7 }}>
                  <Icon name="uyari" size={13} color={C.danger} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontFamily: FONT.ui, fontSize: 10.5, color: '#ffb8bd', lineHeight: 1.6 }}>
                    <b>Sunucu sefer sistemini tanımıyor.</b> Eski sürüm çalışıyor —
                    {' '}<code>stop-tranord.bat</code> sonra <code>start-tranord-dev.bat</code>
                    {' '}ile sunucuyu yeniden başlat, sonra sayfayı yenile.
                    {noReply && ' (Gönderim isteğine 3 saniyede yanıt gelmedi.)'}
                  </span>
                </div>
              </div>
            )}

            {err && (
              <div style={{
                ...box, background: 'rgba(255,111,120,0.1)', borderColor: C.dangerDim,
                fontFamily: FONT.ui, fontSize: 10.5, color: '#ffb8bd',
              }}>{err}</div>
            )}

            {/*
              KAHRAMANIN YUVASI — yalnız KENDİ köyüne takviyede.

              Başkasının köyünde misafir kalıyor (orayı üs saysaydık
              kahraman başkasının toprağında yaşardı ve ev sahibi onu
              istemediğinde gidecek yeri kalmazdı), o yüzden kutu orada
              hiç çıkmıyor.
            */}
            {mode === 'takviye' && kahramanYuruyor && kendiKoyumMu && (
              <label style={{
                ...box, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 9,
                cursor: 'pointer',
              }}>
                <input type="checkbox" checked={yuvaYap}
                  onChange={(e) => setYuvaYap(e.target.checked)}
                  style={{ accentColor: C.frost, width: 14, height: 14, flexShrink: 0 }} />
                <Icon name="koy" size={14} color={yuvaYap ? C.good : C.textMute} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.frost }}>
                    Bu köyü kahramanın yuvası yap
                  </div>
                  <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint, lineHeight: 1.45 }}>
                    {yuvaYap
                      ? 'Kahraman oraya taşınır; bundan sonra seferleri o köyden çıkar.'
                      : 'Misafir kalır, savunmaya katılır; Kahraman ekranından geri çağırabilirsin.'}
                  </div>
                </div>
              </label>
            )}

            <button onClick={send} disabled={!gonderilebilir}
              style={btn(gonderilebilir ? (mode === 'takviye' ? 'good' : mode === 'scout' ? 'primary' : 'danger') : 'disabled', {
                width: '100%', padding: 10, letterSpacing: 1.6, fontSize: 11,
              })}>
              {mode === 'scout' ? 'İZCİ GÖNDER'
                : mode === 'takviye' ? 'TAKVİYEYE GÖNDER'
                  : mode === 'raid' ? 'YAĞMAYA GÖNDER' : 'SALDIRIYA GÖNDER'}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
