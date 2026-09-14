/**
 * KARŞILAMA ANLATIMI — ilk girişte, ekranın ortasında, GEÇİLEMEZ.
 *
 * Neden geçilemez: yeni oyuncu oyuna girdiğinde 30 hex, 28 bina ve altı
 * kaynak zinciriyle karşılaşıyor ve hiçbirinin ne işe yaradığını
 * bilmiyordu. "Atla" düğmesi konsaydı çoğu oyuncu basar ve aynı yere
 * düşerdi; anlatım beş kısa adım, atlanacak kadar uzun değil.
 *
 * Kapatma (✕), dışarı tıklama ve Esc YOK. İlerlemenin tek yolu DEVAM.
 * Geri gitmek serbest — okuduğunu kaçıran geri dönebilsin.
 *
 * "Gördüm" kaydı SUNUCUDA (socket: tutorial_done, bkz. game/quests.js ·
 * egitimBitir). localStorage'da olsaydı depoyu temizleyen her girişte
 * baştan görür, geliştirici konsolundan da tek satırla atlanırdı.
 *
 * Metin oyuncu dilinde: "üretim tile'ı" değil "tarla", "processing
 * building" değil "işleme binası".
 */
import { useState } from 'react';
import { C, FONT, btn } from '../theme';
import { useViewport } from '../responsive';
import Icon from './Icons';

/**
 * ADIMLAR — sıra oyunun ÜRETİM ZİNCİRİNİ takip ediyor:
 * amaç → tarla (ham madde) → işleme (yarı mamul) → bina/asker → görevler.
 * Oyuncu "neden hiçbir şey üretmiyorum" sorusuna düşmeden önce işçinin
 * üretimi yapan şey olduğunu görsün diye işçi ilk adımlarda geçiyor.
 */
const ADIMLAR = [
  {
    ikon: 'koy',
    baslik: 'TraNord\'a hoş geldin',
    ozet: 'Fiyortta bir köyün var. Bundan sonrası sana kalmış.',
    paragraflar: [
      'Amacın basit: **tarlalarında üretim yap**, üretimle **köyünü büyüt**, '
      + 'ordunu kur ve **komşularını yağmalayarak** haritada söz sahibi ol.',
      'Kaynak biriktiren hızlı büyür, ordu kuran elindekini korur. '
      + 'İkisini birden dengeleyen kazanır.',
    ],
  },
  {
    ikon: 'tahil',
    baslik: 'Her şey tarlada başlar',
    ozet: 'Ham maddeyi tarlalar üretir — ama üreten işçidir.',
    paragraflar: [
      'Köyünün çevresindeki tarlalar dört ham madde verir: '
      + '**odun, kil, taş ve demir**. Bir de karnını doyuran **tahıl**.',
      'Bir tarla kendi kendine üretmez: içine **işçi atamalısın**. '
      + 'Boşta duran köylü ekmek yer, üretmez.',
      'Tarlanın **seviyesi** üretimi doğrudan artırmaz — '
      + 'daha çok işçi almasını sağlar. Önce doldur, sonra yükselt.',
    ],
  },
  {
    ikon: 'keresteci',
    baslik: 'Ham madde tek başına işe yaramaz',
    ozet: 'İşleme binaları ham maddeyi yapı malzemesine çevirir.',
    paragraflar: [
      'Odun tek başına bina yapmaz. **Keresteci** odunu keresteye, '
      + '**tuğlacı** kili tuğlaya, **taşçı** taşı yontma taşa, '
      + '**demirci** demiri külçeye çevirir.',
      'Tahıl da öyle: **değirmen** unu, **fırın** ekmeği üretir. '
      + 'Ekmek bitince köyün aç kalır ve büyümesi durur.',
      'Bu binaların da işçiye ihtiyacı var. Zincirin herhangi bir halkası '
      + 'boş kalırsa arkası tıkanır.',
    ],
  },
  {
    ikon: 'kilic',
    baslik: 'Malzeme binaya ve askere dönüşür',
    ozet: 'Kereste, tuğla, yontma taş ve külçe her şeyin temeli.',
    paragraflar: [
      'İşlenmiş malzemeyle **bina kurar ve yükseltirsin**: depo, ev, kışla, sur…',
      'Asker iki şey ister: **ekipman** (silahçı ve zırhçıda üretilir) ve '
      + '**boş işçi**. Her asker bir köylüyü askere alır — ordu bedava değil.',
      'Ordunla komşuna **yağma** gönderip kaynağını alabilir, '
      + '**tam saldırı** ile savunmasını kırabilirsin. Sur ve hendek de '
      + 'seni aynı şeyden korur.',
    ],
  },
  {
    ikon: 'bonus',
    baslik: 'Yalnız değilsin',
    ozet: 'Görevler seni adım adım yönlendirecek.',
    paragraflar: [
      'Sağ altta duran **görev kartı** her an sıradaki adımı söyler ve '
      + 'nereye tıklaman gerektiğini ekranda gösterir.',
      '**Zorunlu** görevler ana hattı öğretir — onları sırayla yap. '
      + '**Opsiyonel** görevler yan hedeftir, istersen atlarsın.',
      'Her görevin bir ödülü var. Takıldığın yerde görev kartındaki '
      + 'ipucuna bak.',
    ],
  },
];

/** **kalın** işaretini gerçek kalına çevirir — metin okunur kalsın diye */
function Metin({ children }) {
  const parcalar = String(children).split(/\*\*(.+?)\*\*/g);
  return (
    <p style={{
      fontFamily: FONT.ui, fontSize: 12, lineHeight: 1.75,
      color: C.textDim, margin: '0 0 10px',
    }}>
      {parcalar.map((p, i) => (i % 2 === 1
        ? <b key={i} style={{ color: C.frost, fontWeight: 600 }}>{p}</b>
        : <span key={i}>{p}</span>))}
    </p>
  );
}

export default function Tutorial({ socket }) {
  const vp = useViewport();
  const [i, setI] = useState(0);
  const [bitiriliyor, setBitiriliyor] = useState(false);
  const adim = ADIMLAR[i];
  const sonuncu = i === ADIMLAR.length - 1;

  const ilerle = () => {
    if (!sonuncu) { setI(i + 1); return; }
    setBitiriliyor(true);
    socket?.emit('tutorial_done');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'grid', placeItems: 'center',
      background: 'rgba(3,7,12,0.92)',
      backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)',
      padding: vp.mobile ? 12 : 20,
    }}>
      <div className="tn-rise" style={{
        width: 'min(520px, 100%)',
        maxHeight: 'calc(var(--tn-vh) - 24px)',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(8,15,24,0.98)', border: `1px solid ${C.lineBright}`,
        borderRadius: 12, boxShadow: '0 28px 70px rgba(0,0,0,0.75)',
      }}>
        {/* Başlık */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 11,
          padding: vp.mobile ? '14px 16px 10px' : '18px 22px 12px',
          borderBottom: `1px solid ${C.lineSoft}`,
        }}>
          <div style={{
            display: 'grid', placeItems: 'center', flexShrink: 0,
            width: 38, height: 38, borderRadius: 19,
            background: 'rgba(127,212,255,0.10)', border: `1px solid ${C.iceDeep}66`,
          }}>
            <Icon name={adim.ikon} size={19} color={C.ice} strokeWidth={1.5} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: FONT.head, fontSize: vp.mobile ? 16 : 19,
              fontWeight: 600, letterSpacing: 0.6, color: C.frost, lineHeight: 1.2,
            }}>{adim.baslik}</div>
            <div style={{
              fontFamily: FONT.ui, fontSize: 10, color: C.textMute, marginTop: 3,
            }}>{adim.ozet}</div>
          </div>
        </div>

        {/* Gövde — uzun metinde kendi içinde kaysın, pencere taşmasın */}
        <div className="tn-scroll" style={{
          padding: vp.mobile ? '14px 16px' : '16px 22px',
          overflowY: 'auto', minHeight: 0, flex: 1,
        }}>
          {adim.paragraflar.map((p, n) => <Metin key={n}>{p}</Metin>)}
        </div>

        {/* Alt şerit: ilerleme + gezinme */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: vp.mobile ? '10px 16px 14px' : '12px 22px 16px',
          borderTop: `1px solid ${C.lineSoft}`,
        }}>
          {/* Noktalar: kaç adım kaldığı görünsün — belirsizlik bıktırır */}
          <div style={{ display: 'flex', gap: 5, flex: 1 }}>
            {ADIMLAR.map((_, n) => (
              <span key={n} style={{
                width: n === i ? 16 : 6, height: 6, borderRadius: 3,
                background: n === i ? C.ice : n < i ? C.iceDeep : C.lineBright,
                transition: 'width .18s, background .18s',
              }} />
            ))}
          </div>

          {i > 0 && (
            <button type="button" onClick={() => setI(i - 1)}
              style={btn('ghost', { padding: '7px 12px', fontSize: 9.5, letterSpacing: 1 })}>
              GERİ
            </button>
          )}
          <button type="button" onClick={ilerle} disabled={bitiriliyor}
            style={btn('primary', {
              padding: '8px 18px', fontSize: 10, letterSpacing: 1.6,
              opacity: bitiriliyor ? 0.6 : 1,
            })}>
            {sonuncu ? (bitiriliyor ? 'BAŞLIYOR…' : 'OYUNA BAŞLA') : 'DEVAM'}
          </button>
        </div>

        <div style={{
          padding: '0 22px 12px',
          fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint, textAlign: 'center',
        }}>
          {sonuncu
            ? 'Bu anlatım bir daha çıkmayacak — görev kartı yol göstermeye devam edecek.'
            : `Adım ${i + 1} / ${ADIMLAR.length}`}
        </div>
      </div>
    </div>
  );
}

export { ADIMLAR };
