/**
 * KAHRAMAN EKRANI — sabit kimlik şeridi + ÜÇ SEGMENT.
 *
 *   KUŞAM      slot ızgarası VE çanta yan yana, toplam bonus
 *   SKİLLER    dört eksen (kompakt 2×2), puan dağıtımı, sıfırlama
 *   MACERALAR  biriken hak, kısa/uzun seçimi, yoldaki macera
 *
 * KUŞAM VE ÇANTA AYNI SEGMENTTE — çünkü sürükle-bırak ikisi de ekranda
 * olmadan çalışmıyor. Ayrı sekmelerdeyken oyuncunun eşyayı sürükleyecek
 * bir hedefi yoktu; tek yol tıklamaydı ve sürükleme özelliği ölü kalıyordu.
 *
 * NEDEN SEGMENT: tek sayfada kuşam + çanta + dört skil kartı + maceralar
 * telefonda metrelerce kaydırma demekti, ve ileride kahramanın görseli de
 * buraya girecek. Segment, her ekranı tek bakışta okunur tutuyor.
 *
 * KİMLİK ŞERİDİ HER SEGMENTTE DURUYOR: seviye, can ve "ölü mü" bilgisi
 * her kararın girdisi — maceraya çıkarken de eşya kuşanırken de görünmeli.
 *
 * SUNUCU KARAR VERİR. Buradaki her devre dışı düğme bir denetim değil,
 * bir AÇIKLAMA: sunucu aynı koşulları yeniden ölçüyor (bkz. macera.js ·
 * maceraUygunMu, kusam.js). Kutuyu gizlemek bir güvenlik önlemi değildir.
 */
import { useState } from 'react';
import { C, FONT, btn, num, label as lbl } from '../theme';
import { RES_LABEL } from '../flows';
import Icon from './Icons';

/** Bedel listesi — "440 demirKulce" değil "440 Külçe Demir" */
const bedelMetni = (bedel) => Object.entries(bedel || {})
  .map(([k, n]) => `${n} ${RES_LABEL[k] || k}`).join(' · ');

const SEGMENTLER = [
  { key: 'kusam', ad: 'Kuşam ve Çanta', ikon: 'migfer' },
  { key: 'skil', ad: 'Skiller', ikon: 'kilicKalkan' },
  { key: 'macera', ad: 'Maceralar', ikon: 'tekerlek' },
];

const SKIL_SIRA = ['saldiriPuani', 'saldiriBonus', 'savunmaBonus', 'uretim'];

/** Sunucudaki SKILLER tanımının istemci ikizi — metinler burada yaşıyor. */
const SKIL_METIN = {
  saldiriPuani: {
    ad: 'Saldırı Puanı', kisa: 'Kendi vuruşu', birim: '+80/puan',
    detay: 'Sefere katıldığında tek bir birim gibi savaşır; bu puan onun '
      + 'ham saldırı gücüdür. Kuşandığın silahlar da buraya eklenir.',
    renk: '#e8636f',
  },
  saldiriBonus: {
    ad: 'Saldırı Bonusu', kisa: 'Orduya saldırı', birim: '+%0,2/puan · tavan %20',
    detay: 'Kahraman seferdeyken ordunun TOPLAM saldırısını büyütür.',
    renk: '#f2bb60',
  },
  savunmaBonus: {
    ad: 'Savunma Bonusu', kisa: 'Köye savunma', birim: '+%0,2/puan · tavan %20',
    detay: 'Kahraman üssündeyken o köyün TÜM savunmasını büyütür. '
      + 'Sur bonusundan ayrı işler.',
    renk: '#7fb4ff',
  },
  uretim: {
    ad: 'Hammadde Üretimi', kisa: 'Köye kaynak', birim: '+%0,2/puan · tavan %20',
    detay: 'Odun, kil, taş ve demir tarlalarının üretimini YÜZDE olarak '
      + 'büyütür — tarlaların büyüdükçe bonus da büyür. Tahıla işlemez. '
      + 'Yalnız kahramanın durduğu köye işler. Tavanda maxlı bir merkez '
      + 'köyde saatte ~900 kaynak eder.',
    renk: '#4ecfa8',
  },
};

const NEREDE_METIN = {
  koy: 'Üssünde', sefer: 'Seferde', macera: 'Macerada',
  takviye: 'Takviyede', donuyor: 'Eve dönüyor',
};

/** Sunucudan gelen engel kodlarının okunur karşılığı */
const ENGEL_METIN = {
  olu: 'Kahramanın ölü — önce dirilt',
  mesgul: 'Kahraman şu an başka bir işte',
  macera_yok: 'Biriken macera hakkın yok',
  can_dusuk: 'Canı çok düşük — önce iyileşmesini bekle',
  konak_yok: 'Önce Kahraman Konağı kur',
};

const BONUS_ADI = {
  saldiri: 'Kahraman saldırısı', can: 'Can tavanı',
  zirhlanma: 'Alınan hasar', hiz: 'Hız', iyilesme: 'İyileşme',
  maceraHizi: 'Macera hızı', ganimet: 'Ganimet',
};
const BONUS_BIRIMI = {
  saldiri: '', can: '', zirhlanma: '%', hiz: '', iyilesme: '/sa',
  maceraHizi: '%', ganimet: '%',
};
/*
  ZIRHLANMA EKSİ İŞARETLE yazılıyor: "+%9 alınan hasar" hasarın ARTTIĞI
  gibi okunurdu. Eşyanın iyi bir şey yaptığını göstermek için işaretin
  doğru olması şart.
*/
const BONUS_ISARET = { zirhlanma: '−' };
const SINIF_ADI = { piyade: 'Piyade', suvari: 'Süvari' };

export default function HeroPanel({
  kahraman, villages = [], hourSeconds = 3600, worldSpeed = 1,
  onPuan, onSifirla, onMacera, onKusan, onCikar, onAt, onDirilt, onGeriCagir, onGoTab,
}) {
  const [segment, setSegment] = useState('kusam');
  const [acikSkil, setAcikSkil] = useState(null);
  const [toplu, setToplu] = useState(1);
  const [suruklenen, setSuruklenen] = useState(null);
  const [hedefSlot, setHedefSlot] = useState(null);
  /*
    ÇANTA FİLTRESİ — hangi slotun eşyaları gösterilsin.
    null = hepsi. Boş bir kuşam slotuna tıklamak da buraya yazıyor:
    "bu slota ne koyabilirim?" sorusunun en kısa cevabı o tıklama.
  */
  const [filtre, setFiltre] = useState(null);

  const usAdi = kahraman?.usSlot
    ? (villages.find(v => v.slotKey === kahraman.usSlot)?.name || kahraman.usSlot)
    : null;

  /*
    KONAK YOKSA KAHRAMAN DA YOK. Boş bir kahraman kartı göstermek
    "kahramanım var ama hiçbir şey yapamıyor" gibi okunurdu; oysa
    eksik olan tek şey bina.
  */
  if (!kahraman?.var) {
    return (
      <div style={{ maxWidth: 620, margin: '24px auto', textAlign: 'center' }}>
        <div style={{ opacity: 0.5, marginBottom: 14 }}>
          <Icon name="migfer" size={54} color={C.iceSoft} strokeWidth={1.3} />
        </div>
        <div style={{
          fontFamily: FONT.display, fontSize: 20, color: C.frost, marginBottom: 8,
        }}>Henüz bir kahramanın yok</div>
        <div style={{
          fontFamily: FONT.ui, fontSize: 12, color: C.textMute, lineHeight: 1.65,
          maxWidth: 420, margin: '0 auto 18px',
        }}>
          Kahraman <b style={{ color: C.iceSoft }}>Kahraman Konağı</b> kurulunca
          doğar ve <b style={{ color: C.iceSoft }}>dört skil puanıyla</b> gelir.
          Konak onun evi: orada iyileşir, eşyalarını orada tutar, maceraları
          orada birikir.
        </div>
        {onGoTab && (
          <button onClick={() => onGoTab('koy')} style={btn('primary')}>
            KÖY MERKEZİNE GİT
          </button>
        )}
      </div>
    );
  }

  const olu = !!kahraman.olu;
  const canOran = kahraman.canTavan > 0 ? kahraman.can / kahraman.canTavan : 0;
  const xpOran = kahraman.xpGereken > 0 ? kahraman.xpSimdiki / kahraman.xpGereken : 1;
  const canRenk = olu ? C.danger : canOran > 0.5 ? C.good
    : canOran > 0.25 ? '#f2bb60' : C.danger;

  /** Oyun saatini ekrandaki gerçek süreye çevir — dünya hızı dahil */
  const sure = (oyunSaati) => {
    const sn = Math.max(0, Math.round(oyunSaati * hourSeconds / (worldSpeed || 1)));
    if (sn < 60) return `${sn} sn`;
    if (sn < 3600) return `${Math.ceil(sn / 60)} dk`;
    return `${(sn / 3600).toFixed(1)} sa`;
  };

  const envanter = kahraman.envanter || [];
  const iksirVar = envanter.some(e => e.key === 'diriltmeIksiri');
  /*
    SÜZÜLMÜŞ LİSTE. `indeks` alanı SUNUCUNUN envanterindeki gerçek sıra —
    süzerken de korunuyor. Süzülmüş dizinin kendi sırasını göndersek
    yanlış eşya kuşanılırdı.
  */
  const suzulmus = filtre === 'kullanilir'
    ? envanter.filter(e => e.kullanilir)
    : filtre ? envanter.filter(e => e.slot === filtre) : envanter;

  /*
    MACERA ENGELİ — sunucudaki maceraUygunMu ile aynı sıra. Aynı koşulları
    iki yerde yazmak ikizleşme riski, ama alternatif "düğmeye bas, hata al"
    olurdu: oyuncu neden gidemediğini ancak deneyerek öğrenirdi.
  */
  const misafirAdi = kahraman.misafirSlot
    ? (villages.find(v => v.slotKey === kahraman.misafirSlot)?.name || kahraman.misafirSlot)
    : null;

  const maceraEngeli = olu ? 'olu'
    : (kahraman.nerede && kahraman.nerede !== 'koy') ? 'mesgul'
      : (kahraman.maceraSayisi || 0) < 1 ? 'macera_yok'
        : kahraman.can < kahraman.canTavan * (kahraman.maceraCanEsigi || 0.3) ? 'can_dusuk'
          : null;

  const birak = (slot) => {
    setHedefSlot(null);
    if (suruklenen == null) return;
    const esya = envanter.find(e => e.indeks === suruklenen);
    setSuruklenen(null);
    if (!esya) return;
    /*
      YANLIŞ SLOTA BIRAKMA sessizce yok sayılıyor. Sunucuya yollayıp hata
      almak, oyuncuya kendi hatasını bir uyarı şeridiyle geri okutmak
      olurdu; sürükle-bırakta yanlış hedef zaten olağan.
    */
    if (esya.slot !== slot) return;
    onKusan?.(esya.indeks);
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 24 }}>

      {/* ── KİMLİK ŞERİDİ (her segmentte) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        padding: '13px 16px', borderRadius: 8,
        background: 'rgba(12,20,32,0.55)',
        border: `1px solid ${olu ? C.dangerDim : C.lineSoft}`,
      }}>
        <div style={{
          display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 26,
          flexShrink: 0, background: 'rgba(8,14,24,0.7)',
          border: `2px solid ${olu ? C.dangerDim : C.frost}66`,
          opacity: olu ? 0.4 : 1,
        }}>
          <Icon name="migfer" size={27} color={olu ? C.dangerDim : C.frost} strokeWidth={1.5} />
        </div>

        <div style={{ flex: '1 1 240px', minWidth: 210 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: FONT.display, fontSize: 17, color: C.frost }}>
              Kahraman
            </span>
            <span style={num({ fontSize: 12.5, color: C.iceSoft })}>Lvl {kahraman.seviye}</span>
            {/*
              SINIF VE HIZ yan yana: ikisi de AT slotuna bağlı ve
              oyuncunun savaş öncesi bilmesi gereken şeyler — atlı
              kahramana mızrakçı, yaya kahramana kalkancı çıkıyor.
            */}
            <span style={{
              padding: '1px 7px', borderRadius: 8,
              fontFamily: FONT.ui, fontSize: 8.5, letterSpacing: 0.6,
              color: kahraman.suvari ? '#f2bb60' : C.iceSoft,
              border: `1px solid ${kahraman.suvari ? 'rgba(242,187,96,0.45)' : C.lineSoft}`,
            }}>
              {kahraman.suvari ? 'SÜVARİ' : 'YAYA'} · hız {kahraman.hiz}
            </span>
            <span style={{
              marginLeft: 'auto', fontFamily: FONT.ui, fontSize: 9.5,
              color: olu ? C.danger : C.textMute,
            }}>
              {olu ? 'ÖLÜ'
                : (NEREDE_METIN[kahraman.nerede] || 'Üssünde')
                  + (kahraman.nerede === 'takviye' && misafirAdi
                    ? ` · ${misafirAdi}`
                    : usAdi ? ` · ${usAdi}` : '')}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 7, flexWrap: 'wrap' }}>
            <MiniCubuk ad="DENEYİM" oran={xpOran} renk={C.frost}
              deger={kahraman.xpGereken > 0
                ? `${kahraman.xpSimdiki}/${kahraman.xpGereken}` : 'en yüksek'} />
            <MiniCubuk ad="CAN" oran={canOran} renk={canRenk}
              deger={`${kahraman.can}/${kahraman.canTavan}`
                + (olu ? '' : `  +${kahraman.iyilesmeSaatlik}/sa`)} />
          </div>
        </div>
      </div>

      {/*
        ÖLÜM ŞERİDİ — iki diriltme yolu yan yana. Yalnız biri gösterilseydi
        (iksiri varsa iksir, yoksa kaynak) oyuncu diğerinin var olduğunu
        hiç öğrenemezdi; iksir nadir, saklamak da bir karar.
      */}
      {olu && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          padding: '11px 14px', marginTop: 10, borderRadius: 6,
          background: 'rgba(74,29,36,0.4)', border: `1px solid ${C.dangerDim}`,
        }}>
          <div style={{ flex: '1 1 240px' }}>
            <div style={{ fontFamily: FONT.ui, fontSize: 12, color: '#f0b8bd' }}>
              Kahramanın öldü
            </div>
            <div style={{
              fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute,
              marginTop: 2, lineHeight: 1.6,
            }}>
              Seviyesi ve eşyaları duruyor. Diriltilene kadar ne sefere
              katılır, ne maceraya çıkar, ne de bonus verir.
            </div>
          </div>
          <button onClick={() => onDirilt?.('kaynak')}
            title={bedelMetni(kahraman.dirilmeBedeli)}
            style={{ ...btn('primary'), fontSize: 10 }}>
            HAMMADDEYLE DİRİLT
          </button>
          <button onClick={() => onDirilt?.('iksir')} disabled={!iksirVar}
            title={iksirVar ? 'Diriltme İksiri kullanılacak'
              : 'Çantanda Diriltme İksiri yok — maceralardan düşer'}
            style={{
              ...btn('ghost'), fontSize: 10,
              opacity: iksirVar ? 1 : 0.35,
              cursor: iksirVar ? 'pointer' : 'default',
            }}>
            İKSİRLE DİRİLT
          </button>
        </div>
      )}
      {olu && (
        <div style={{
          fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint,
          margin: '5px 4px 0', textAlign: 'right',
        }}>
          Hammadde bedeli: {bedelMetni(kahraman.dirilmeBedeli)} — her seviyede artar.
        </div>
      )}

      {/*
        TAKVİYE ŞERİDİ. Kahraman başka bir köyü savunuyorsa oyuncunun
        tek merak ettiği şey "nerede ve nasıl geri alırım" — o yüzden
        segmentlerin üstünde, her sekmede görünür.
      */}
      {kahraman.nerede === 'takviye' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          padding: '10px 14px', marginTop: 10, borderRadius: 6,
          background: 'rgba(12,20,32,0.5)', border: `1px solid ${C.good}44`,
        }}>
          <Icon name="kalkan" size={16} color={C.good} strokeWidth={1.5} />
          <div style={{ flex: '1 1 220px' }}>
            <div style={{ fontFamily: FONT.ui, fontSize: 11.5, color: C.frost }}>
              {misafirAdi} köyünü savunuyor
            </div>
            <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint, marginTop: 2 }}>
              O köyün savunmasına +%{kahraman.bonuslar?.savunmaYuzde || 0}.
              Geri çağırınca bonus HEMEN biter, kahraman yola çıkar.
            </div>
          </div>
          <button onClick={onGeriCagir} style={{ ...btn('ghost'), fontSize: 10 }}>
            GERİ ÇAĞIR
          </button>
        </div>
      )}

      {kahraman.nerede === 'donuyor' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          padding: '10px 14px', marginTop: 10, borderRadius: 6,
          background: 'rgba(12,20,32,0.5)', border: `1px solid ${C.lineSoft}`,
        }}>
          <Icon name="tekerlek" size={16} color={C.iceSoft} strokeWidth={1.5} />
          <div style={{ flex: '1 1 220px', fontFamily: FONT.ui, fontSize: 11.5, color: C.iceSoft }}>
            Kahraman eve dönüyor
          </div>
          <span style={num({ fontSize: 13, color: C.frost })}>
            {sure(kahraman.donusKalanSaat)}
          </span>
        </div>
      )}

      {/* ── SEGMENT ÇUBUĞU ── */}
      <div style={{
        display: 'flex', gap: 4, margin: '14px 0 12px',
        padding: 3, borderRadius: 7,
        background: 'rgba(8,14,24,0.5)', border: `1px solid ${C.lineSoft}`,
      }}>
        {SEGMENTLER.map(s => {
          const aktif = segment === s.key;
          const rozet = s.key === 'kusam' ? envanter.length
            : s.key === 'skil' ? (kahraman.harcanmamisPuan || 0)
              : s.key === 'macera' ? (kahraman.maceraSayisi || 0) : 0;
          return (
            <button key={s.key} onClick={() => setSegment(s.key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, padding: '7px 4px', borderRadius: 5, cursor: 'pointer',
                background: aktif ? 'rgba(120,180,255,0.12)' : 'transparent',
                border: `1px solid ${aktif ? `${C.frost}55` : 'transparent'}`,
                color: aktif ? C.frost : C.textMute,
                fontFamily: FONT.ui, fontSize: 10.5, letterSpacing: 0.4,
              }}>
              <Icon name={s.ikon} size={13} color={aktif ? C.frost : C.textMute}
                strokeWidth={1.5} />
              <span>{s.ad}</span>
              {/*
                ROZET yalnız YAPILACAK İŞ varken çıkıyor: dağıtılmamış puan,
                biriken macera, çantadaki eşya. Sürekli duran bir sayaç
                "yeni bir şey var" sinyalini değersizleştirirdi.
              */}
              {rozet > 0 && (
                <span style={num({
                  fontSize: 9, padding: '0 5px', borderRadius: 8,
                  background: s.key === 'kusam' ? 'rgba(143,163,184,0.25)' : 'rgba(242,187,96,0.22)',
                  color: s.key === 'kusam' ? C.textMute : '#ffd98a',
                })}>{rozet}</span>
              )}
            </button>
          );
        })}
      </div>

      {segment === 'kusam' && !kahraman.suvari && (
        /*
          AT SLOTU BOŞKEN uyarı: "kahraman neden yaya savaşıyor" sorusunun
          cevabı burada. Slotun boş olduğunu görmek yetmiyor — at kuşanmanın
          savaşta SINIF değiştirdiğini bilmeyen oyuncu onu sadece bir hız
          eşyası sanar.
        */
        <div style={{
          fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint,
          margin: '0 2px 8px', lineHeight: 1.6,
        }}>
          Kahramanın <b style={{ color: C.iceSoft }}>yaya</b> savaşıyor.
          At kuşanırsan <b style={{ color: '#ffd98a' }}>süvari</b> olur —
          hem daha hızlı yürür hem savaşta atlı gibi vurur.
        </div>
      )}

      {segment === 'kusam' && (
        /*
          İKİ SÜTUN: solda kuşam ızgarası, sağda çanta. Sürükleme ancak
          kaynak ve hedef aynı anda ekrandayken çalışıyor. Dar ekranda
          alt alta düşüyor — orada sürükleme zaten güvenilir değil, tıklama
          yolu asıl yol.
        */
        <div style={{
          display: 'grid', gap: 14, alignItems: 'start',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        }}>
          <div>
            <KusamIzgarasi
              slotlar={kahraman.slotlar || {}} kusanilan={kahraman.kusanilan || {}}
              hedefSlot={hedefSlot} suruklenen={suruklenen} envanter={envanter}
              onHedef={setHedefSlot} onBirak={birak} onCikar={onCikar}
              secili={filtre}
              onSlotSec={(slot) => setFiltre(f => (f === slot ? null : slot))}
            />
            <ToplamBonus kahraman={kahraman} />
          </div>

          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, margin: '0 2px 8px',
            }}>
              <span style={lbl({ fontSize: 8.5 })}>ÇANTA</span>
              <span style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint }}>
                Slota sürükle ya da üstüne tıkla
              </span>
              <span style={num({ fontSize: 10, color: C.textMute, marginLeft: 'auto' })}>
                {suzulmus.length === envanter.length
                  ? envanter.length : `${suzulmus.length}/${envanter.length}`}
              </span>
            </div>

            <CantaFiltresi
              envanter={envanter} slotlar={kahraman.slotlar || {}}
              filtre={filtre} onFiltre={setFiltre}
            />

            <Envanter
              envanter={suzulmus}
              onSurukle={setSuruklenen}
              onBirakBitti={() => { setSuruklenen(null); setHedefSlot(null); }}
              onKusan={onKusan} onAt={onAt}
              onIksir={() => onDirilt?.('iksir')}
              olu={olu} suzuk={!!filtre}
            />
          </div>
        </div>
      )}

      {segment === 'skil' && (
        <Skiller
          kahraman={kahraman} toplu={toplu} setToplu={setToplu}
          acikSkil={acikSkil} setAcikSkil={setAcikSkil}
          onPuan={onPuan} onSifirla={onSifirla}
        />
      )}

      {segment === 'macera' && (
        <Maceralar
          kahraman={kahraman} engel={maceraEngeli} sure={sure} onMacera={onMacera}
        />
      )}
    </div>
  );
}

/**
 * ÇANTA FİLTRESİ — slota göre süzme.
 *
 * Yalnız ÇANTADA OLAN slotlar çip oluyor: dokuz slotun tamamını her zaman
 * göstermek, çoğu boş çiplerle dolu bir satır demekti ve asıl bilgiyi
 * (neyim var) gizlerdi.
 *
 * Tek çeşit eşya varken filtre HİÇ görünmüyor — süzecek bir şey yokken
 * süzgeç göstermek yalnız yer kaplar.
 */
function CantaFiltresi({ envanter, slotlar, filtre, onFiltre }) {
  const sayac = new Map();
  let kullanilirSayi = 0;
  for (const e of envanter) {
    if (e.kullanilir) { kullanilirSayi++; continue; }
    sayac.set(e.slot, (sayac.get(e.slot) || 0) + 1);
  }
  const cipler = [...sayac.entries()]
    .map(([slot, n]) => ({ key: slot, ad: slotlar[slot]?.ad || slot, n }))
    .sort((a, b) => (slotlar[a.key]?.satir ?? 9) - (slotlar[b.key]?.satir ?? 9)
      || (slotlar[a.key]?.sutun ?? 9) - (slotlar[b.key]?.sutun ?? 9));
  if (kullanilirSayi > 0) {
    cipler.push({ key: 'kullanilir', ad: 'Kullanılır', n: kullanilirSayi });
  }
  if (cipler.length < 2) return null;

  const cip = (key, ad, n) => {
    const aktif = filtre === key;
    return (
      <button key={key ?? 'hepsi'}
        onClick={() => onFiltre(aktif ? null : key)}
        style={{
          padding: '2px 9px', borderRadius: 10, cursor: 'pointer',
          fontFamily: FONT.ui, fontSize: 9,
          background: aktif ? 'rgba(120,180,255,0.16)' : 'transparent',
          border: `1px solid ${aktif ? `${C.frost}66` : C.lineSoft}`,
          color: aktif ? C.frost : C.textMute,
        }}>
        {ad}<span style={{ color: C.textFaint, marginLeft: 4 }}>{n}</span>
      </button>
    );
  };

  return (
    <div style={{
      display: 'flex', gap: 5, flexWrap: 'wrap', margin: '0 2px 8px',
    }}>
      {cip(null, 'Tümü', envanter.length)}
      {cipler.map(c => cip(c.key, c.ad, c.n))}
    </div>
  );
}

/**
 * Konak ölçüsü: şimdiki değer ve bir sonraki seviyedeki değer.
 *
 * Sonraki seviye DEĞİŞMİYORSA sönük yazılıyor — macera tavanı her
 * seviyede artmıyor (iki seviyede bir), ve "aynı kalacak" bilgisi de
 * oyuncunun kararına giriyor.
 */
function KonakOlcu({ ad, simdi, sonra, artti }) {
  return (
    <div>
      <div style={lbl({ fontSize: 7.5, letterSpacing: 0.9 })}>{ad.toUpperCase()}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={num({ fontSize: 12, color: C.frost })}>{simdi}</span>
        {sonra && (
          <>
            <span style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint }}>→</span>
            <span style={num({
              fontSize: 11, color: artti ? C.good : C.textFaint,
            })}>{sonra}</span>
          </>
        )}
      </div>
    </div>
  );
}

/** Kimlik şeridindeki dar çubuk — ad, değer ve doluluk tek satırda */
function MiniCubuk({ ad, oran, renk, deger }) {
  return (
    <div style={{ flex: '1 1 150px', minWidth: 140 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={lbl({ fontSize: 7.5 })}>{ad}</span>
        <span style={num({ fontSize: 9, color: renk })}>{deger}</span>
      </div>
      <div style={{
        height: 5, borderRadius: 3, overflow: 'hidden',
        background: 'rgba(8,14,24,0.75)', border: `1px solid ${C.lineSoft}`,
      }}>
        <div style={{
          width: `${Math.max(0, Math.min(1, oran)) * 100}%`, height: '100%',
          background: renk, transition: 'width .3s',
        }} />
      </div>
    </div>
  );
}

/**
 * SKİLLER — 2×2 kompakt ızgara.
 *
 * Eskiden dört tam genişlik satırdı ve tek başına ekranı dolduruyordu.
 * Kompakt kart: ad, kısa etki, puan ve + düğmesi; ayrıntı tıklayınca
 * altta açılıyor. Bilgi kaybı yok, yer üçte bir.
 */
function Skiller({ kahraman, toplu, setToplu, acikSkil, setAcikSkil, onPuan, onSifirla }) {
  const puanVer = (skil, adet) => onPuan?.(skil, Math.min(adet, kahraman.harcanmamisPuan));
  const kalan = kahraman.harcanmamisPuan || 0;

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', margin: '0 2px 9px',
      }}>
        <span style={{
          fontFamily: FONT.ui, fontSize: 11,
          color: kalan > 0 ? '#ffd98a' : C.textMute,
        }}>
          {kalan > 0 ? `${kalan} puan dağıtılmadı` : 'Bütün puanlar dağıtıldı'}
        </span>
        {kalan > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
            <span style={lbl({ fontSize: 8 })}>ADET</span>
            {[1, 5, 10, kalan].map((n, i) => (
              <button key={i} onClick={() => setToplu(n)} disabled={n > kalan}
                style={{
                  ...btn(toplu === n ? 'primary' : 'ghost'),
                  padding: '1px 8px', fontSize: 9.5,
                  opacity: n > kalan ? 0.3 : 1,
                }}>{i === 3 ? 'TÜMÜ' : `+${n}`}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{
        display: 'grid', gap: 7,
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
      }}>
        {SKIL_SIRA.map(key => {
          const m = SKIL_METIN[key];
          const puan = kahraman.skiller?.[key] || 0;
          const acik = acikSkil === key;
          const verilebilir = kalan > 0 && puan < 100;
          return (
            <div key={key}
              onClick={() => setAcikSkil(acik ? null : key)}
              style={{
                padding: '9px 11px', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(12,20,32,0.45)',
                border: `1px solid ${acik ? `${m.renk}55` : C.lineSoft}`,
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{
                  width: 3, height: 24, borderRadius: 2, background: m.renk, flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: FONT.ui, fontSize: 11.5, color: C.frost,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{m.ad}</div>
                  <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint }}>
                    {m.kisa}
                  </div>
                </div>
                <span style={num({ fontSize: 13, color: puan > 0 ? m.renk : C.textMute })}>
                  {puan}<span style={{ fontSize: 8.5, color: C.textFaint }}>/100</span>
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); puanVer(key, toplu); }}
                  disabled={!verilebilir}
                  title={verilebilir ? `+${Math.min(toplu, kalan)} puan`
                    : puan >= 100 ? 'Bu skil dolu' : 'Dağıtılmamış puanın yok'}
                  style={{
                    ...btn('ghost'), padding: '2px 10px', fontSize: 12.5, lineHeight: 1,
                    opacity: verilebilir ? 1 : 0.25,
                    cursor: verilebilir ? 'pointer' : 'default',
                    borderColor: verilebilir ? `${m.renk}66` : C.lineSoft,
                    color: verilebilir ? m.renk : C.textMute,
                  }}>+</button>
              </div>
              {acik && (
                <div style={{
                  marginTop: 7, paddingTop: 7, borderTop: `1px solid ${C.lineSoft}`,
                  fontFamily: FONT.ui, fontSize: 10, color: C.textMute, lineHeight: 1.65,
                }}>
                  {m.detay}
                  <div style={{ color: C.textFaint, marginTop: 3 }}>{m.birim}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        marginTop: 12, padding: '9px 12px', borderRadius: 6,
        background: 'rgba(12,20,32,0.3)', border: `1px solid ${C.lineSoft}`,
      }}>
        <div style={{ flex: '1 1 220px' }}>
          <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.iceSoft }}>
            Skilleri sıfırla
          </div>
          <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint, marginTop: 2 }}>
            Bedel her sıfırlamada ikiye katlanır — savaş öncesi skil değiştirip
            iki bonusu birden kullanmak istismardır.
          </div>
        </div>
        <span style={num({ fontSize: 10, color: C.textMute })}>
          {bedelMetni(kahraman.sifirlamaBedeli)}
        </span>
        <button onClick={onSifirla} style={{ ...btn('ghost'), fontSize: 9.5 }}>SIFIRLA</button>
      </div>
    </>
  );
}

/** MACERALAR — biriken hak, iki tip, yoldaki macera */
/*
  GERÇEK MACERA SÜRESİ sunucudan geliyor (maceraSaatleri): kahramanın
  hızı macerayı kısaltıyor (bkz. macera.js · maceraSuresi). Eski sunucu
  bu alanı yollamazsa tanımdaki ham saate düşüyoruz — ekran boş kalmasın.
*/
function Maceralar({ kahraman, engel, sure, onMacera }) {
  const saatOf = (tip, def) => kahraman.maceraSaatleri?.[tip] ?? def.saat;
  if (kahraman.macera) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: '13px 15px', borderRadius: 6,
        background: 'rgba(12,20,32,0.5)', border: `1px solid ${C.frost}44`,
      }}>
        <Icon name="tekerlek" size={18} color={C.frost} strokeWidth={1.5} />
        <div style={{ flex: '1 1 180px' }}>
          <div style={{ fontFamily: FONT.ui, fontSize: 12, color: C.frost }}>
            {kahraman.maceraTipleri?.[kahraman.macera.tip]?.ad || 'Macera'} sürüyor
          </div>
          <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint }}>
            Kahraman döndüğünde sonuç raporlara düşer.
          </div>
        </div>
        <span style={num({ fontSize: 15, color: C.frost })}>
          {sure(kahraman.macera.kalanSaat)}
        </span>
      </div>
    );
  }

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', margin: '0 2px 9px',
      }}>
        <span style={{ fontFamily: FONT.ui, fontSize: 11, color: C.iceSoft }}>
          {kahraman.maceraSayisi || 0} / {kahraman.maceraTavan || 0} macera hakkı
        </span>
        <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint }}>
          Konak seviyesi hem tavanı hem birikme hızını büyütür.
        </span>
      </div>

      {/*
        KONAĞIN NE VERDİĞİ. İlkan sordu: "kahraman binasını artırmak ne
        işe yarıyor?" — üç şey veriyordu ama üçü de hiçbir ekranda
        yazmıyordu. Yükseltmenin karşılığı görünmüyorsa oyuncu o binayı
        yükseltmez. Bir sonraki seviye de yanında: "şu an ne veriyor"
        tek başına "yükseltsem ne olur" sorusunu cevaplamıyor.
      */}
      {kahraman.konakGetirisi && (
        <div style={{
          padding: '10px 13px', marginBottom: 10, borderRadius: 6,
          background: 'rgba(12,20,32,0.35)', border: `1px solid ${C.lineSoft}`,
        }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7,
          }}>
            <span style={lbl({ fontSize: 8.5 })}>KAHRAMAN KONAĞI</span>
            <span style={num({ fontSize: 11, color: C.iceSoft })}>
              Lvl {kahraman.konakGetirisi.seviye}
            </span>
            <span style={{
              marginLeft: 'auto', fontFamily: FONT.ui, fontSize: 9, color: C.textFaint,
            }}>yükseltince ↓</span>
          </div>
          <div style={{
            display: 'grid', gap: 7,
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          }}>
            <KonakOlcu ad="İyileşme"
              simdi={`${kahraman.konakGetirisi.iyilesme}/sa`}
              sonra={kahraman.konakSonraki && `${kahraman.konakSonraki.iyilesme}/sa`}
              artti={kahraman.konakSonraki
                && kahraman.konakSonraki.iyilesme > kahraman.konakGetirisi.iyilesme} />
            <KonakOlcu ad="Macera tavanı"
              simdi={String(kahraman.konakGetirisi.maceraTavan)}
              sonra={kahraman.konakSonraki && String(kahraman.konakSonraki.maceraTavan)}
              artti={kahraman.konakSonraki
                && kahraman.konakSonraki.maceraTavan > kahraman.konakGetirisi.maceraTavan} />
            <KonakOlcu ad="Yeni macera"
              simdi={sure(kahraman.konakGetirisi.maceraSaat)}
              sonra={kahraman.konakSonraki && sure(kahraman.konakSonraki.maceraSaat)}
              artti={kahraman.konakSonraki
                && kahraman.konakSonraki.maceraSaat < kahraman.konakGetirisi.maceraSaat} />
          </div>
        </div>
      )}

      {/*
        SALDIRI GÜCÜ MACERADA DA İŞE YARIYOR — bunu yazmazsak oyuncu
        saldırıya yatırım yapmanın macerayı kolaylaştırdığını hiç
        fark etmez; sayı sessizce iyileşir ve sebebi görünmez.
      */}
      {(kahraman.maceraGucAzaltma || 0) > 0 && (
        <div style={{
          fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint,
          margin: '0 2px 9px',
        }}>
          Saldırı gücün macerada alınan hasarı{' '}
          <b style={{ color: C.good }}>%{kahraman.maceraGucAzaltma}</b> azaltıyor
          {(kahraman.bonuslar?.zirhlanmaYuzde || 0) > 0
            && <>, kuşamın <b style={{ color: C.good }}>
              %{kahraman.bonuslar.zirhlanmaYuzde}</b> daha</>}.
        </div>
      )}

      <div style={{
        display: 'grid', gap: 8,
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      }}>
        {Object.entries(kahraman.maceraTipleri || {}).map(([tip, def]) => (
          <button key={tip} onClick={() => onMacera?.(tip)} disabled={!!engel}
            title={engel ? ENGEL_METIN[engel] : `${def.ad} — ${sure(saatOf(tip, def))}`}
            style={{
              textAlign: 'left', padding: '12px 14px', borderRadius: 6,
              background: 'rgba(12,20,32,0.5)',
              border: `1px solid ${engel ? C.lineSoft : `${C.frost}44`}`,
              cursor: engel ? 'default' : 'pointer',
              opacity: engel ? 0.45 : 1, color: 'inherit', font: 'inherit',
            }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: FONT.ui, fontSize: 12, color: C.frost }}>{def.ad}</span>
              <span style={num({ fontSize: 10, color: C.textMute, marginLeft: 'auto' })}>
                {sure(saatOf(tip, def))}
                {/*
                  HIZ KISALTTIYSA ham süre üstü çizili duruyor: yoksa
                  oyuncu atının maceraya da işlediğini göremezdi.
                */}
                {saatOf(tip, def) < def.saat && (
                  <span style={{
                    fontSize: 8.5, color: C.textFaint, marginLeft: 4,
                    textDecoration: 'line-through',
                  }}>{sure(def.saat)}</span>
                )}
              </span>
            </div>
            <div style={{
              fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, margin: '3px 0 7px',
            }}>{def.aciklama}</div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
              <span style={num({ fontSize: 10, color: C.good })}>+{def.xp} XP</span>
              {/*
                GERÇEK HASAR gösteriliyor, tanımdaki ham sayı değil:
                saldırı gücü ve zırh düşülmüş hâli. Ham sayıyı yazsaydık
                oyuncu hangi maceraya çıkacağını yanlış hesaplardı.
              */}
              <span style={num({ fontSize: 10, color: C.danger })}>
                −{kahraman.maceraHasari?.[tip] ?? def.can} can
                {(kahraman.maceraHasari?.[tip] ?? def.can) < def.can && (
                  <span style={{ color: C.textFaint }}> (ham {def.can})</span>
                )}
              </span>
              <span style={num({ fontSize: 10, color: C.textMute })}>{def.odulSayisi} ödül</span>
            </div>
          </button>
        ))}
      </div>

      {engel && (
        <div style={{
          fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute, margin: '8px 2px 0',
        }}>
          {ENGEL_METIN[engel]}
          {engel === 'macera_yok' && kahraman.maceraGereken > 0
            && ` — bir sonraki ${sure(kahraman.maceraGereken - (kahraman.maceraIlerleme || 0))} sonra.`}
        </div>
      )}
    </>
  );
}

/**
 * SLOT IZGARASI — insan silueti (baş üstte, ayak altta, eller iki yanda).
 * Yerleşim SUNUCUDAN geliyor (`slotlar[].satir/sutun`): iki taraf ayrışıp
 * eşya yanlış kutuya düşmesin.
 *
 * Sürükle-bırakta UYGUN OLMAYAN slot soluyor. Bütün slotlar aynı görünse
 * oyuncu her seferinde denemek zorunda kalırdı.
 */
/**
 * EŞYA KARTI — üzerine gelince çıkan açıklama.
 *
 * `title` özniteliği yetmiyordu: tarayıcı onu bir saniye gecikmeyle ve
 * tek satır düz metin olarak gösteriyor, bonusları okunur biçimde
 * yazmak mümkün değil. Oyuncunun iki eşyayı karşılaştırması gereken
 * yerde bu, bilgiyi pratikte gizlemek demekti.
 */
function EsyaKarti({ esya, yer = 'sag' }) {
  if (!esya) return null;
  const bonuslar = [];
  for (const [alan, v] of Object.entries(esya.kahramanBonus || {})) {
    if (v > 0) {
      bonuslar.push([BONUS_ADI[alan] || alan,
        `${BONUS_ISARET[alan] || '+'}${v}${BONUS_BIRIMI[alan] || ''}`,
        alan === 'zirhlanma' ? C.good : C.frost]);
    }
  }
  for (const [sinif, b] of Object.entries(esya.birimBonus || {})) {
    for (const [tur, v] of Object.entries(b || {})) {
      if (v > 0) {
        bonuslar.push([`${SINIF_ADI[sinif] || sinif} ${
          tur === 'saldiri' ? 'saldırı' : 'savunma'}`, `+%${v}`, C.good]);
      }
    }
  }
  return (
    <div style={{
      position: 'absolute', zIndex: 40, top: '50%', transform: 'translateY(-50%)',
      [yer === 'sag' ? 'left' : 'right']: 'calc(100% + 8px)',
      width: 208, padding: '9px 11px', borderRadius: 6, pointerEvents: 'none',
      background: 'rgba(6,11,19,0.97)', border: `1px solid ${esya.renk}77`,
      boxShadow: '0 6px 22px rgba(0,0,0,0.55)',
    }}>
      <div style={{ fontFamily: FONT.ui, fontSize: 11, color: esya.renk }}>{esya.ad}</div>
      <div style={{
        fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint, margin: '1px 0 6px',
      }}>{esya.slotAd || 'Kullanılır'}</div>
      <div style={{
        fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute,
        lineHeight: 1.55, marginBottom: bonuslar.length ? 6 : 0,
      }}>{esya.aciklama}</div>
      {bonuslar.map(([ad, deger, renk]) => (
        <div key={ad} style={{
          display: 'flex', justifyContent: 'space-between', gap: 8,
          fontFamily: FONT.ui, fontSize: 9.5, marginTop: 2,
        }}>
          <span style={{ color: C.textMute }}>{ad}</span>
          <span style={num({ fontSize: 10, color: renk })}>{deger}</span>
        </div>
      ))}
    </div>
  );
}

function KusamIzgarasi({
  slotlar, kusanilan, hedefSlot, suruklenen, envanter,
  onHedef, onBirak, onCikar, onSlotSec, secili,
}) {
  const [ustunde, setUstunde] = useState(null);
  const suruklenenEsya = suruklenen == null
    ? null : envanter.find(e => e.indeks === suruklenen);
  const satirlar = Math.max(0, ...Object.values(slotlar).map(s => s.satir)) + 1;
  const sutunlar = Math.max(0, ...Object.values(slotlar).map(s => s.sutun)) + 1;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${sutunlar}, minmax(0, 108px))`,
      gap: 8, justifyContent: 'center', padding: '4px 0',
    }}>
      {Array.from({ length: satirlar }).flatMap((_, satir) =>
        Array.from({ length: sutunlar }).map((__, sutun) => {
          const girdi = Object.entries(slotlar)
            .find(([, s]) => s.satir === satir && s.sutun === sutun);
          if (!girdi) return <div key={`${satir}-${sutun}`} />;
          const [slot, def] = girdi;
          const esya = kusanilan[slot];
          const uygun = suruklenenEsya ? suruklenenEsya.slot === slot : null;
          const vurgu = hedefSlot === slot && uygun;

          return (
            <div key={slot}
              onDragOver={(e) => { if (uygun) { e.preventDefault(); onHedef(slot); } }}
              onDragLeave={() => onHedef(null)}
              onDrop={(e) => { e.preventDefault(); onBirak(slot); }}
              onClick={() => (esya ? onCikar?.(slot) : onSlotSec?.(slot))}
              onMouseEnter={() => setUstunde(slot)}
              onMouseLeave={() => setUstunde(null)}
              title={esya
                ? `${esya.ad} — çıkarmak için tıkla`
                : `${def.ad} — çantada bu slotun eşyalarını gör`}
              style={{
                position: 'relative',
                display: 'grid', placeItems: 'center', gap: 4, padding: 6,
                aspectRatio: '1 / 1', borderRadius: 7, textAlign: 'center',
                background: vurgu ? 'rgba(120,180,255,0.14)'
                  : secili === slot ? 'rgba(120,180,255,0.08)' : 'rgba(8,14,24,0.45)',
                border: `1px ${esya ? 'solid' : 'dashed'} ${
                  vurgu ? C.frost : secili === slot ? `${C.frost}88`
                    : esya ? esya.renk : C.lineSoft}`,
                opacity: uygun === false ? 0.25 : esya ? 1 : 0.6,
                cursor: esya ? 'pointer' : 'default',
                transition: 'opacity .15s, border-color .15s, background .15s',
              }}>
              <Icon name={esya?.ikon || def.ikon || 'migfer'} size={20}
                color={esya ? esya.renk : C.iceSoft} strokeWidth={1.4} />
              <span style={{
                fontFamily: FONT.ui, fontSize: 8.5, lineHeight: 1.25,
                color: esya ? esya.renk : C.textFaint,
              }}>{esya ? esya.ad : def.ad}</span>
              {/* Kart SAĞA açılıyor, son sütunda SOLA: ızgaranın dışına taşmasın */}
              {ustunde === slot && esya && (
                <EsyaKarti esya={esya} yer={sutun >= sutunlar - 1 ? 'sol' : 'sag'} />
              )}
            </div>
          );
        }))}
    </div>
  );
}

/**
 * KAHRAMANIN TOPLAM GÜCÜ — SKİL + EŞYA BİRLİKTE.
 *
 * Eskiden burada YALNIZ eşya bonusu vardı ve "Kahraman saldırısı" yazıyordu:
 * skil puanı dağıtan oyuncu bu sayının değişmediğini görüp eşyanın ya da
 * skilin işe yaramadığını sanıyordu (İlkan bildirdi). Artık sayı
 * kahramanın GERÇEK toplamı; eşyanın payı altında ayrıca yazıyor ki
 * "bu eşya ne kattı" sorusu da cevapsız kalmasın.
 */
function ToplamBonus({ kahraman }) {
  const toplam = kahraman?.bonuslar || {};
  const esya = kahraman?.kusamBonuslari || {};
  const esyaKah = esya.kahraman || {};

  /** Toplam, eşya payı, etiket, birim */
  const satirlar = [
    ['Saldırı gücü', toplam.saldiriGucu || 0, esyaKah.saldiri || 0, ''],
    ['Orduya saldırı', toplam.saldiriYuzde || 0, 0, '%'],
    ['Köye savunma', toplam.savunmaYuzde || 0, 0, '%'],
    ['Kaynak üretimi', toplam.uretimYuzde || 0, 0, '%'],
    ['Can tavanı', kahraman?.canTavan || 0, esyaKah.can || 0, ''],
    ['İyileşme', kahraman?.iyilesmeSaatlik || 0, esyaKah.iyilesme || 0, '/sa'],
    ['Hız', kahraman?.hiz || 0, esyaKah.hiz || 0, ''],
  ].filter(([, t]) => t > 0);

  const birim = Object.entries(toplam.birim || {})
    .flatMap(([sinif, b]) => Object.entries(b || {})
      .filter(([, v]) => v > 0)
      .map(([tur, v]) => [`${SINIF_ADI[sinif] || sinif} ${
        tur === 'saldiri' ? 'saldırı' : 'savunma'}`, v]));

  const ekstra = [];
  if ((esyaKah.maceraHizi || 0) > 0) ekstra.push(['Macera hızı', esyaKah.maceraHizi, '%']);
  if ((esyaKah.ganimet || 0) > 0) ekstra.push(['Ganimet', esyaKah.ganimet, '%']);

  if (!satirlar.length && !birim.length && !ekstra.length) return null;

  return (
    <div style={{
      display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center',
      padding: '10px 12px', marginTop: 10, borderRadius: 6,
      background: 'rgba(12,20,32,0.35)', border: `1px solid ${C.lineSoft}`,
    }}>
      {/*
        ZIRHLANMA ayrı gösteriliyor: tek eksi işaretli ölçü o ve tavana
        kırpılmış hâli yazılıyor — oyuncu tavana dayandığını görebilmeli.
      */}
      {(toplam.zirhlanmaYuzde || 0) > 0 && (
        <Olcu ad="Alınan hasar" deger={`−%${yuvarla(toplam.zirhlanmaYuzde)}`}
          renk={C.good}
          alt={toplam.zirhlanmaYuzde >= 50 ? 'tavanda' : 'eşyadan'} />
      )}
      {satirlar.map(([ad, t, e, br]) => (
        <Olcu key={ad} ad={ad} deger={`${br === '%' ? '%' : ''}${yuvarla(t)}${
          br === '/sa' ? '/sa' : ''}`} renk={C.frost}
          alt={e > 0 ? `eşyadan +${yuvarla(e)}` : null} />
      ))}
      {birim.map(([ad, v]) => (
        <Olcu key={ad} ad={ad} deger={`+%${v}`} renk={C.good} alt="eşyadan" />
      ))}
      {ekstra.map(([ad, v, br]) => (
        <Olcu key={ad} ad={ad} deger={`+${br === '%' ? '%' : ''}${yuvarla(v)}`}
          renk={C.warn} alt="eşyadan" />
      ))}
    </div>
  );
}

const yuvarla = (n) => (Math.round(n * 10) / 10);

function Olcu({ ad, deger, renk, alt }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={lbl({ fontSize: 7.5, letterSpacing: 0.9 })}>{ad.toUpperCase()}</div>
      <div style={num({ fontSize: 12, color: renk })}>{deger}</div>
      {alt && (
        <div style={{ fontFamily: FONT.ui, fontSize: 7.5, color: C.textFaint }}>{alt}</div>
      )}
    </div>
  );
}

/**
 * ÇANTA. Sürükle-bırak ana yol, ama TIKLAMA da kuşanıyor: dokunmatik
 * ekranda sürükleme güvenilir değil ve telefonda oynayan oyuncu kuşam
 * yapamaz hâle gelirdi.
 */
function Envanter({ envanter, onSurukle, onBirakBitti, onKusan, onAt, onIksir, olu, suzuk }) {
  const [ustunde, setUstunde] = useState(null);
  if (!envanter.length) {
    return (
      <div style={{
        fontFamily: FONT.ui, fontSize: 10, color: C.textMute,
        textAlign: 'center', padding: '18px 12px', lineHeight: 1.8,
        borderRadius: 6, border: `1px dashed ${C.lineSoft}`,
      }}>
        {/*
          SÜZGEÇ YÜZÜNDEN BOŞSA başka bir cümle: "çantan boş" demek
          oyuncuya yanlış bilgi verirdi — eşyası var, yalnız bu slota ait
          olanı yok.
        */}
        {suzuk ? (
          <>Bu slota uygun eşyan yok.<br />Süzgeci kaldırmak için
            <b style={{ color: C.iceSoft }}> Tümü</b>&apos;ne bas.</>
        ) : (
          <>Çantan boş.<br />
            Eşyalar <b style={{ color: C.iceSoft }}>maceralardan</b> düşer —
            uzun maceralarda daha sık.</>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {envanter.map(e => {
        const kullanilir = e.kullanilir;
        return (
          <div key={e.indeks}
            draggable={!kullanilir}
            onDragStart={() => !kullanilir && onSurukle(e.indeks)}
            onDragEnd={onBirakBitti}
            onClick={() => !kullanilir && onKusan?.(e.indeks)}
            onMouseEnter={() => setUstunde(e.indeks)}
            onMouseLeave={() => setUstunde(null)}
            title={kullanilir ? e.aciklama : `${e.ad} — kuşanmak için tıkla`}
            style={{
              position: 'relative',
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '9px 12px', borderRadius: 6,
              cursor: kullanilir ? 'default' : 'grab',
              background: 'rgba(12,20,32,0.45)', border: `1px solid ${e.renk}44`,
            }}>
            <Icon name={e.ikon} size={18} color={e.renk} strokeWidth={1.4} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT.ui, fontSize: 11.5, color: e.renk }}>{e.ad}</div>
              <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint }}>
                {kullanilir ? e.aciklama : `${e.slotAd} · ${bonusMetni(e)}`}
              </div>
            </div>
            {/*
              KULLANILABİLİR eşyada "KULLAN" düğmesi ölü değilken de duruyor
              ama kapalı: iksirin ne işe yaradığını ancak kahraman ölünce
              öğrenmek, onu bir sürpriz yapardı.
            */}
            {kullanilir && (
              <button
                onClick={(ev) => { ev.stopPropagation(); onIksir?.(); }}
                disabled={!olu}
                title={olu ? 'Kahramanı dirilt' : 'Yalnız kahraman ölüyken kullanılır'}
                style={{
                  ...btn(olu ? 'primary' : 'ghost'), padding: '2px 10px', fontSize: 9,
                  opacity: olu ? 1 : 0.35, cursor: olu ? 'pointer' : 'default',
                }}>KULLAN</button>
            )}
            <button
              onClick={(ev) => {
                ev.stopPropagation();
                /*
                  ATMAK GERİ ALINAMAZ — onay şart. Envanter satırları
                  birbirine benziyor; yanlış tıklama efsane bir eşyayı
                  sessizce yok ederdi.
                */
                if (window.confirm(`${e.ad} KALICI olarak atılsın mı?\n\nGeri alınamaz.`)) {
                  onAt?.(e.indeks);
                }
              }}
              title="At"
              style={{
                ...btn('ghost'), padding: '2px 9px', fontSize: 9,
                color: C.textMute, borderColor: C.lineSoft,
              }}>AT</button>
            {/*
              Kart SOLA açılıyor: çanta sağ sütunda, sağa açılsa ekranın
              dışına taşardı.
            */}
            {ustunde === e.indeks && <EsyaKarti esya={e} yer="sol" />}
          </div>
        );
      })}
    </div>
  );
}

/** Envanter satırındaki tek satırlık bonus özeti */
function bonusMetni(e) {
  const parcalar = [];
  for (const [alan, v] of Object.entries(e.kahramanBonus || {})) {
    if (v > 0) {
      parcalar.push(`${BONUS_ADI[alan] || alan} ${
        BONUS_ISARET[alan] || '+'}${v}${BONUS_BIRIMI[alan] || ''}`);
    }
  }
  for (const [sinif, b] of Object.entries(e.birimBonus || {})) {
    for (const [tur, v] of Object.entries(b || {})) {
      if (v > 0) {
        parcalar.push(`${SINIF_ADI[sinif] || sinif} ${
          tur === 'saldiri' ? 'saldırı' : 'savunma'} +%${v}`);
      }
    }
  }
  return parcalar.join(' · ') || 'bonus yok';
}
