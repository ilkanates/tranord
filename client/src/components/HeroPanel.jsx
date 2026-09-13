/**
 * KAHRAMAN EKRANI — seviye, can, skiller ve (ileride) eşyalar.
 *
 * Ekran üç bloktan oluşuyor:
 *
 *   1. KİMLİK KARTI   seviye, deneyim çubuğu, can, nerede olduğu
 *   2. SKİLLER        dört eksen, dağıtılmamış puan, sıfırlama
 *   3. KUŞAM          eşya slotları (Aşama 4 — şimdilik boş çerçeveler)
 *
 * Kuşam bloğu BOŞKEN DE duruyor: oyuncu kahramanın nereye varacağını
 * baştan görsün. Gizleseydik eşya sistemi geldiğinde ekran birdenbire
 * başka bir şeye dönüşürdü.
 */
import { useState } from 'react';
import { C, FONT, btn, num, label as lbl } from '../theme';
import Icon from './Icons';

/*
  EŞYA SLOTLARI — sunucu tarafı Aşama 4'te geliyor; yerleşim ve isimler
  şimdiden sabit, çünkü kayıt anahtarları kalıcı olacak (bkz. tranord-dongu
  skill'i · "anahtarlar kalıcı").

  Diziliş insan silueti: baş üstte, ayak altta, eller iki yanda.
*/
const KUSAM_SLOTLARI = [
  { key: 'migfer',    ad: 'Miğfer',    ikon: 'migfer',      satir: 0, sutun: 1 },
  { key: 'sagEl',     ad: 'Silah',     ikon: 'kilic',       satir: 1, sutun: 0 },
  { key: 'zirh',      ad: 'Zırh',      ikon: 'zirh',        satir: 1, sutun: 1 },
  { key: 'solEl',     ad: 'Kalkan',    ikon: 'kalkan',      satir: 1, sutun: 2 },
  { key: 'bileklik',  ad: 'Bileklik',  ikon: 'kilicKalkan', satir: 2, sutun: 0 },
  { key: 'pantolon',  ad: 'Pantolon',  ikon: 'zirh',        satir: 2, sutun: 1 },
  { key: 'kolye',     ad: 'Kolye',     ikon: 'kalkan',      satir: 2, sutun: 2 },
  { key: 'ayakkabi',  ad: 'Ayakkabı',  ikon: 'tekerlek',    satir: 3, sutun: 1 },
  { key: 'at',        ad: 'At',        ikon: 'at',          satir: 3, sutun: 2 },
];

const SKIL_SIRA = ['saldiriPuani', 'saldiriBonus', 'savunmaBonus', 'uretim'];

/** Sunucudaki SKILLER tanımının istemci ikizi — metinler burada yaşıyor. */
const SKIL_METIN = {
  saldiriPuani: {
    ad: 'Saldırı Puanı',
    ozet: 'Kahramanın kendi vuruşu',
    detay: 'Sefere katıldığında tek bir birim gibi savaşır; bu puan onun '
      + 'ham saldırı gücüdür. Puan başına +80.',
    renk: '#e8636f',
  },
  saldiriBonus: {
    ad: 'Saldırı Bonusu',
    ozet: 'Ordunun saldırısına yüzde ek',
    detay: 'Kahraman seferdeyken ordunun TOPLAM saldırısını büyütür. '
      + 'Puan başına +%0,2, en çok %20.',
    renk: '#f2bb60',
  },
  savunmaBonus: {
    ad: 'Savunma Bonusu',
    ozet: 'Köyün savunmasına yüzde ek',
    detay: 'Kahraman üssündeyken o köyün TÜM savunmasını büyütür. '
      + 'Puan başına +%0,2, en çok %20. Sur bonusundan ayrı işler.',
    renk: '#7fb4ff',
  },
  uretim: {
    ad: 'Hammadde Üretimi',
    ozet: 'Bulunduğu köye saatlik kaynak',
    detay: 'Odun, kil, taş ve demire saatlik düz ek. Puan başına +3/sa '
      + 'her kaynaktan. Yalnız kahramanın durduğu köye işler.',
    renk: '#4ecfa8',
  },
};

const NEREDE_METIN = {
  koy: 'Üssünde', sefer: 'Seferde', macera: 'Macerada',
};

export default function HeroPanel({
  kahraman, villages = [], onPuan, onSifirla, onGoTab,
}) {
  const [acikSkil, setAcikSkil] = useState(null);
  const [toplu, setToplu] = useState(1);

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
          doğar. Konak onun evi: orada iyileşir, eşyalarını orada tutar ve
          konağın seviyesi iyileşme hızını belirler.
        </div>
        {onGoTab && (
          <button onClick={() => onGoTab('koy')} style={btn('primary')}>
            KÖY MERKEZİNE GİT
          </button>
        )}
      </div>
    );
  }

  const baygun = (kahraman.baygunKalanSaat || 0) > 0;
  const canOran = kahraman.canTavan > 0 ? kahraman.can / kahraman.canTavan : 0;
  const xpOran = kahraman.xpGereken > 0
    ? kahraman.xpSimdiki / kahraman.xpGereken : 1;
  const canRenk = baygun ? C.danger : canOran > 0.5 ? C.good
    : canOran > 0.25 ? '#f2bb60' : C.danger;

  const puanVer = (skil, adet) => {
    if (!onPuan) return;
    onPuan(skil, Math.min(adet, kahraman.harcanmamisPuan));
  };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', paddingBottom: 24 }}>

      {/* ── 1. KİMLİK KARTI ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        padding: '16px 18px', marginBottom: 14, borderRadius: 8,
        background: 'rgba(12,20,32,0.55)', border: `1px solid ${C.lineSoft}`,
      }}>
        <div style={{
          display: 'grid', placeItems: 'center', width: 62, height: 62, borderRadius: 31,
          flexShrink: 0,
          background: 'rgba(8,14,24,0.7)',
          border: `2px solid ${baygun ? C.dangerDim : C.frost}66`,
          opacity: baygun ? 0.45 : 1,
        }}>
          <Icon name="migfer" size={32} color={baygun ? C.dangerDim : C.frost} strokeWidth={1.5} />
        </div>

        <div style={{ flex: '1 1 240px', minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
            <span style={{ fontFamily: FONT.display, fontSize: 19, color: C.frost }}>
              Kahraman
            </span>
            <span style={num({ fontSize: 13, color: C.iceSoft })}>
              Lvl {kahraman.seviye}
            </span>
            <span style={{
              marginLeft: 'auto', fontFamily: FONT.ui, fontSize: 9.5,
              color: baygun ? C.danger : C.textMute,
            }}>
              {baygun
                ? `BAYGIN · ${kahraman.baygunKalanSaat} oyun sa`
                : (NEREDE_METIN[kahraman.nerede] || 'Üssünde')
                  + (usAdi ? ` · ${usAdi}` : '')}
            </span>
          </div>

          {/* Deneyim çubuğu */}
          <div style={{ marginTop: 9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={lbl({ fontSize: 8.5 })}>DENEYİM</span>
              <span style={num({ fontSize: 9.5, color: C.textMute })}>
                {kahraman.xpGereken > 0
                  ? `${kahraman.xpSimdiki} / ${kahraman.xpGereken}`
                  : 'en yüksek seviye'}
              </span>
            </div>
            <Cubuk oran={xpOran} renk={C.frost} />
          </div>

          {/* Can çubuğu */}
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={lbl({ fontSize: 8.5 })}>CAN</span>
              <span style={num({ fontSize: 9.5, color: canRenk })}>
                {kahraman.can} / {kahraman.canTavan}
                <span style={{ color: C.textFaint }}>
                  {'  '}+{kahraman.iyilesmeSaatlik}/sa
                </span>
              </span>
            </div>
            <Cubuk oran={canOran} renk={canRenk} />
          </div>
        </div>
      </div>

      {/*
        BAYGINLIK UYARISI ayrı bir satır: kahramanın bonuslarının NEDEN
        çalışmadığı görünmezse oyuncu bunu hata sanar.
      */}
      {baygun && (
        <div style={{
          padding: '9px 13px', marginBottom: 14, borderRadius: 6,
          background: 'rgba(74,29,36,0.4)', border: `1px solid ${C.dangerDim}`,
          fontFamily: FONT.ui, fontSize: 11, color: '#f0b8bd', lineHeight: 1.6,
        }}>
          Kahramanın baygın: <b>{kahraman.baygunKalanSaat} oyun saati</b> boyunca
          ne sefere katılabilir ne de bonus verir. Ayağa kalktığında üssünde
          iyileşmeye devam eder.
        </div>
      )}

      {/* ── 2. SKİLLER ── */}
      <BolumBasligi
        baslik="SKİLLER"
        aciklama="Her seviye 4 puan verir. Puanlar geri alınabilir, ama bedeli katlanır."
        sag={kahraman.harcanmamisPuan > 0
          ? `${kahraman.harcanmamisPuan} puan dağıtılmadı` : null}
        sagRenk={kahraman.harcanmamisPuan > 0 ? '#ffd98a' : C.textMute}
      />

      {kahraman.harcanmamisPuan > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7, margin: '0 2px 9px',
        }}>
          <span style={lbl({ fontSize: 8.5 })}>ADET</span>
          {[1, 5, 10, kahraman.harcanmamisPuan].map((n, i) => (
            <button key={i} onClick={() => setToplu(n)}
              disabled={n > kahraman.harcanmamisPuan}
              style={{
                ...btn(toplu === n ? 'primary' : 'ghost'),
                padding: '2px 9px', fontSize: 10,
                opacity: n > kahraman.harcanmamisPuan ? 0.3 : 1,
              }}>
              {i === 3 ? 'TÜMÜ' : `+${n}`}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {SKIL_SIRA.map(key => {
          const m = SKIL_METIN[key];
          const puan = kahraman.skiller?.[key] || 0;
          const acik = acikSkil === key;
          const verilebilir = kahraman.harcanmamisPuan > 0 && puan < 100;
          return (
            <div key={key} style={{
              borderRadius: 6, overflow: 'hidden',
              background: 'rgba(12,20,32,0.45)',
              border: `1px solid ${acik ? `${m.renk}55` : C.lineSoft}`,
            }}>
              <div
                onClick={() => setAcikSkil(acik ? null : key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '10px 13px', cursor: 'pointer',
                }}>
                <span style={{
                  width: 4, height: 26, borderRadius: 2, background: m.renk, flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT.ui, fontSize: 12, color: C.frost }}>
                    {m.ad}
                  </div>
                  <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint }}>
                    {m.ozet}
                  </div>
                </div>
                <span style={num({ fontSize: 14, color: puan > 0 ? m.renk : C.textMute })}>
                  {puan}<span style={{ fontSize: 9, color: C.textFaint }}>/100</span>
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); puanVer(key, toplu); }}
                  disabled={!verilebilir}
                  title={verilebilir ? `+${Math.min(toplu, kahraman.harcanmamisPuan)} puan`
                    : puan >= 100 ? 'Bu skil dolu' : 'Dağıtılmamış puanın yok'}
                  style={{
                    ...btn('ghost'),
                    padding: '3px 11px', fontSize: 13, lineHeight: 1,
                    opacity: verilebilir ? 1 : 0.25,
                    cursor: verilebilir ? 'pointer' : 'default',
                    borderColor: verilebilir ? `${m.renk}66` : C.lineSoft,
                    color: verilebilir ? m.renk : C.textMute,
                  }}>+</button>
              </div>
              {acik && (
                <div style={{
                  padding: '0 13px 11px 28px',
                  fontFamily: FONT.ui, fontSize: 10.5, color: C.textMute, lineHeight: 1.7,
                }}>{m.detay}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sıfırlama */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        marginTop: 12, padding: '10px 13px', borderRadius: 6,
        background: 'rgba(12,20,32,0.3)', border: `1px solid ${C.lineSoft}`,
      }}>
        <div style={{ flex: '1 1 220px' }}>
          <div style={{ fontFamily: FONT.ui, fontSize: 11, color: C.iceSoft }}>
            Skilleri sıfırla
          </div>
          <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, marginTop: 2 }}>
            Bütün puanlar geri gelir. Bedel her sıfırlamada ikiye katlanır —
            savaş öncesi skil değiştirip iki bonusu birden kullanmak istismardır.
          </div>
        </div>
        <span style={num({ fontSize: 10.5, color: C.textMute })}>
          {Object.entries(kahraman.sifirlamaBedeli || {})
            .map(([k, n]) => `${n} ${k}`).join(' · ')}
        </span>
        <button onClick={onSifirla} style={{ ...btn('ghost'), fontSize: 10 }}>
          SIFIRLA
        </button>
      </div>

      {/* ── 3. KUŞAM ── */}
      <BolumBasligi
        baslik="KUŞAM"
        aciklama="Eşyalar maceradan düşer; tek tek birimlerin saldırı ve savunmasını da büyütür."
        sag="yakında"
        sagRenk={C.textFaint}
      />
      <KusamIzgarasi kusanilan={kahraman.kusanilan || {}} />
    </div>
  );
}

function Cubuk({ oran, renk }) {
  return (
    <div style={{
      height: 6, borderRadius: 3, overflow: 'hidden',
      background: 'rgba(8,14,24,0.75)', border: `1px solid ${C.lineSoft}`,
    }}>
      <div style={{
        width: `${Math.max(0, Math.min(1, oran)) * 100}%`, height: '100%',
        background: renk, transition: 'width .3s',
      }} />
    </div>
  );
}

function BolumBasligi({ baslik, aciklama, sag, sagRenk }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap',
      margin: '20px 2px 9px', paddingTop: 13, borderTop: `1px solid ${C.lineSoft}`,
    }}>
      <span style={{
        padding: '2px 8px', borderRadius: 4,
        fontFamily: FONT.ui, fontSize: 8.5, letterSpacing: 1.2, fontWeight: 700,
        color: C.iceSoft, border: `1px solid ${C.lineSoft}`,
      }}>{baslik}</span>
      <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint }}>
        {aciklama}
      </span>
      {sag && (
        <span style={{
          marginLeft: 'auto', fontFamily: FONT.ui, fontSize: 9.5, color: sagRenk,
        }}>{sag}</span>
      )}
    </div>
  );
}

/**
 * Eşya slotları. Aşama 4'e kadar boş çerçeveler — ama YERLEŞİM ŞİMDİDEN
 * doğru: oyuncu kahramanın nereye varacağını görsün, eşya geldiğinde
 * ekran birdenbire başka bir şeye dönüşmesin.
 */
function KusamIzgarasi({ kusanilan }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 96px))',
      gap: 8, justifyContent: 'center',
      padding: '14px 0 4px',
    }}>
      {[0, 1, 2, 3].flatMap(satir =>
        [0, 1, 2].map(sutun => {
          const slot = KUSAM_SLOTLARI.find(s => s.satir === satir && s.sutun === sutun);
          if (!slot) return <div key={`${satir}-${sutun}`} />;
          const esya = kusanilan[slot.key];
          return (
            <div key={slot.key} title={slot.ad} style={{
              display: 'grid', placeItems: 'center', gap: 4,
              aspectRatio: '1 / 1', borderRadius: 7,
              background: 'rgba(8,14,24,0.45)',
              border: `1px dashed ${esya ? C.frost : C.lineSoft}`,
              opacity: esya ? 1 : 0.55,
            }}>
              <Icon name={slot.ikon} size={20} color={C.iceSoft} strokeWidth={1.4} />
              <span style={{
                fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint, letterSpacing: 0.5,
              }}>{slot.ad}</span>
            </div>
          );
        }))}
    </div>
  );
}
