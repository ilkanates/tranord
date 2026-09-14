/**
 * SAĞLIK ÇADIRI PANELİ — REVİRDEKİ YARALILAR, KART OLARAK.
 *
 * İlkan'ın kararı: *"revirdeki askeri sağdaki menüde göstermene gerek yok
 * kart olarak revirde göster ve ben seçince iyileşmeye başlasınlar"*.
 *
 * İKİ AYRI DURUM VAR ve kartlar bunu görünür kılıyor:
 *
 *   BEKLEYEN  — çadıra alınmış ama tedavisi başlamamış. Sayaç işlemiyor;
 *               oyuncu seçene kadar öylece yatıyor.
 *   TEDAVİDE  — sayaç işliyor, süresi dolunca orduya dönüyor.
 *
 * Sağ raya konmamasının sebebi: ray zaten nüfus, ekipman, inşaat ve ordu
 * taşıyor; oraya bir de karar gerektiren bir liste koymak, oyuncunun
 * tıklaması gereken şeyi göz ucuyla bakılan bir yere saklamak olurdu.
 * Karar binanın kendi ekranında.
 */
import { useState } from 'react';
import { C, FONT, label as lbl, num, fmtTime } from '../theme';
import { gameHoursToRealSeconds } from '../flows';
import Icon from './Icons';

export default function RevirPanel({
  saglik = null, unitDefs = {}, level = 0,
  hourSeconds = 3600, worldSpeed = 1, onIyilestir,
}) {
  /*
    SEÇİM İSTEMCİDE DURUYOR, sunucuda değil. Yarım kalmış bir seçim
    kaydedilecek bir durum değil: oyuncu sekmeyi kapatınca da, başka
    köye geçince de sıfırlanması doğru.
  */
  const [secili, setSecili] = useState(() => new Set());

  const yatanlar = saglik?.yatanlar || [];
  const kapasite = saglik?.kapasite || 0;
  const dolu = saglik?.dolu || 0;
  const bekleyenler = yatanlar.filter(y => !y.basladi);
  const tedavide = yatanlar.filter(y => y.basladi);

  const sure = (oyunSaati) =>
    fmtTime(gameHoursToRealSeconds(oyunSaati, hourSeconds, worldSpeed));

  const cevir = (indeks) => setSecili(onceki => {
    const s = new Set(onceki);
    if (s.has(indeks)) s.delete(indeks); else s.add(indeks);
    return s;
  });

  const seciliAsker = bekleyenler
    .filter(y => secili.has(y.indeks)).reduce((s, y) => s + y.adet, 0);

  const baslat = (indeksler) => {
    onIyilestir?.(indeksler);
    setSecili(new Set());
  };

  return (
    <div style={{
      background: 'rgba(8,15,24,0.55)', border: `1px solid ${C.lineSoft}`,
      borderRadius: 6, padding: '10px 11px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Icon name="saglikCadiri" size={13} color={C.good} />
        <span style={lbl({ fontSize: 8, letterSpacing: 1.3, flex: 1 })}>REVİR</span>
        <span style={num({ fontSize: 11, color: dolu >= kapasite ? C.danger : C.good })}>
          {dolu}/{kapasite}
        </span>
        <span style={lbl({ fontSize: 7.5, letterSpacing: 0.8 })}>YATAK</span>
      </div>

      {/*
        BOŞ REVİR DE BİR ŞEY ANLATIYOR. "Burada hiç yaralı yok" demek
        yerine binanın ne yaptığını yazıyoruz: oyuncu bu binayı ilk kez
        açtığında karşısında boş bir kutu değil, yükseltme sebebi
        bulmalı.
      */}
      {yatanlar.length === 0 ? (
        <div style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textFaint, lineHeight: 1.55 }}>
          Revir boş. Köyün SAVUNULDUĞU bir savaşta ölen askerlerinin
          <b style={{ color: C.good }}> %{saglik?.oran ?? 0}</b> kadarı yaralı
          sayılıp buraya alınır ({kapasite} yatak). Tedavileri kendiliğinden
          başlamaz — hangi birliği ayağa kaldıracağına sen karar verirsin.
          {level < 20 && ' Çadırı yükseltmek hem yaralı payını hem yatak sayısını artırır.'}
        </div>
      ) : null}

      {bekleyenler.length > 0 && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, margin: '2px 0 6px',
          }}>
            <span style={lbl({ fontSize: 7.5, letterSpacing: 1, color: C.textMute })}>
              TEDAVİ BEKLEYEN
            </span>
            <div style={{ flex: 1, height: 1, background: C.lineSoft }} />
          </div>

          <div style={{
            display: 'grid', gap: 7,
            gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))',
          }}>
            {bekleyenler.map((y) => {
              const d = unitDefs[y.birim];
              const sec = secili.has(y.indeks);
              return (
                <button key={y.indeks} type="button" onClick={() => cevir(y.indeks)}
                  title={`${d?.name || y.birim} — tedavisi ${sure(y.toplamSaat)} sürer`}
                  style={{
                    textAlign: 'left', cursor: 'pointer',
                    background: sec ? 'rgba(78,207,168,0.10)' : 'rgba(6,12,20,0.6)',
                    border: `1px solid ${sec ? C.good : C.lineSoft}`,
                    borderRadius: 5, padding: '7px 8px',
                    transition: 'background .12s, border-color .12s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/*
                      Onay kutusu ÇİZİLİYOR, gerçek input değil: kartın
                      tamamı tıklanabilir olmalı ve iç içe bir input
                      kartın kendi tıklamasını yutardı.
                    */}
                    <span style={{
                      width: 11, height: 11, borderRadius: 3, flexShrink: 0,
                      border: `1px solid ${sec ? C.good : C.textFaint}`,
                      background: sec ? C.good : 'transparent',
                    }} />
                    <span style={{
                      flex: 1, fontFamily: FONT.ui, fontSize: 10, color: C.text,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {d?.name || y.birim}
                    </span>
                    <span style={num({ fontSize: 12, color: C.frost })}>{y.adet}</span>
                  </div>
                  <div style={{
                    fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint, marginTop: 4,
                  }}>
                    Tedavi süresi {sure(y.toplamSaat)}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 7, marginTop: 9, flexWrap: 'wrap' }}>
            <button type="button" disabled={seciliAsker <= 0}
              onClick={() => baslat([...secili])}
              style={dugme(seciliAsker > 0)}>
              {seciliAsker > 0
                ? `SEÇİLENİ İYİLEŞTİR · ${seciliAsker} asker`
                : 'ÖNCE BİRLİK SEÇ'}
            </button>
            <button type="button" onClick={() => baslat(null)} style={dugme(true, true)}>
              HEPSİNİ İYİLEŞTİR
            </button>
          </div>
        </>
      )}

      {tedavide.length > 0 && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, margin: '12px 0 6px',
          }}>
            <span style={lbl({ fontSize: 7.5, letterSpacing: 1, color: C.good })}>
              TEDAVİDE
            </span>
            <div style={{ flex: 1, height: 1, background: C.lineSoft }} />
          </div>

          <div style={{
            display: 'grid', gap: 7,
            gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))',
          }}>
            {tedavide.map((y) => {
              const d = unitDefs[y.birim];
              const oran = y.toplamSaat > 0
                ? Math.max(0, Math.min(1, 1 - y.kalanSaat / y.toplamSaat)) : 0;
              return (
                <div key={y.indeks} style={{
                  background: 'rgba(6,12,20,0.6)',
                  border: `1px solid ${C.good}44`, borderRadius: 5, padding: '7px 8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="saglikCadiri" size={10} color={C.good} />
                    <span style={{
                      flex: 1, fontFamily: FONT.ui, fontSize: 10, color: C.text,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {d?.name || y.birim}
                    </span>
                    <span style={num({ fontSize: 12, color: C.good })}>{y.adet}</span>
                  </div>
                  {/* İlerleme çubuğu: kalan süre tek başına ne kadar yol
                      alındığını göstermiyor. */}
                  <div style={{
                    height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)',
                    margin: '6px 0 4px', overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${oran * 100}%`, height: '100%',
                      background: C.good, transition: 'width .3s',
                    }} />
                  </div>
                  <div style={{
                    fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint,
                  }}>
                    {sure(y.kalanSaat)} sonra orduya dönüyor
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function dugme(aktif, ikincil = false) {
  return {
    flex: '1 1 auto', padding: '7px 10px', borderRadius: 4,
    fontFamily: FONT.ui, fontSize: 9.5, letterSpacing: 0.6,
    cursor: aktif ? 'pointer' : 'not-allowed',
    background: ikincil ? 'transparent' : (aktif ? 'rgba(78,207,168,0.14)' : 'transparent'),
    border: `1px solid ${aktif ? (ikincil ? C.lineSoft : C.good) : C.lineSoft}`,
    color: aktif ? (ikincil ? C.textDim : C.good) : C.textMute,
  };
}
