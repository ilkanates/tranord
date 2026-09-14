import { useState } from 'react';
import { C, FONT, panel, btn, label as lbl, num } from '../theme';
import { useViewport } from '../responsive';
import { EQ_LABEL } from '../flows';
import { unitImage } from '../data/unitImages';
import UnitDetail from './UnitDetail';
import Icon from './Icons';

const CAT_LABEL = { piyade: 'Piyade', suvari: 'Süvari', kusatma: 'Kuşatma', gocmen: 'Göçmen', diger: 'Diğer' };
const CAT_COLOR = { piyade: '#7fd4ff', suvari: '#a99cf0', kusatma: '#d9c069', gocmen: '#8fdcb0', diger: C.textDim };
const CAT_ICON  = { piyade: 'kalkan', suvari: 'at', kusatma: 'atolye', gocmen: 'koy', diger: 'ordu' };

/**
 * SAVUNMA YAPILARI — sur, hendek ve her kule AYRI AYRI.
 *
 * İlkan: *"ordu menüsünde mevcut defans binalarımın katkısını yüzde
 * olarak ayrı ayrı göster"*.
 *
 * Bugüne kadar bu sayı yalnız SAVAŞ RAPORUNDA, üçü toplanmış tek bir
 * "sur %57" olarak görünüyordu: oyuncu saldırıya uğramadan savunmasını
 * göremiyor, gördüğünde de hangisinin katkı yaptığını bilemiyordu.
 * Yükseltme kararı tam olarak bu ayrımı gerektiriyor.
 *
 * BONUS ASKERİN SAVUNMASINI ÇARPIYOR, düz sayı eklemiyor: kalabalık
 * savunmada mutlak kazanç çok daha büyük. Bu yüzden yüzde gösteriliyor.
 */
function SavunmaYapilari({ s, kahraman }) {
  if (!s) return null;

  const satirlar = [];
  if (s.sur.var) {
    satirlar.push({
      ad: 'Sur', ikon: 'sur', seviye: s.sur.seviye, maxSeviye: s.sur.maxSeviye,
      katki: s.sur.katki, not: null,
    });
  }
  if (s.hendek.var) {
    satirlar.push({
      ad: 'Hendek', ikon: 'hendek', seviye: s.hendek.seviye, maxSeviye: s.hendek.maxSeviye,
      katki: s.hendek.katki,
      not: 'Koç başı hendeğe dokunmaz — yalnız suru kırar.',
    });
  }
  s.kuleler.forEach((k, i) => satirlar.push({
    ad: `Kule ${i + 1}`, ikon: 'kule', seviye: k.seviye, maxSeviye: 20,
    katki: k.katki,
    /*
      EKSİK OKÇU AYRI YAZILIYOR. Boş kule sıfır veriyor; kulesi olup
      okçusu olmayan oyuncunun kaybettiği bonus, yükseltmeden önce
      bakması gereken ilk yer.
    */
    not: k.okcu < k.maxOkcu
      ? `${k.okcu}/${k.maxOkcu} okçu — dolu olsa +%${k.tamKatki}`
      : `${k.okcu}/${k.maxOkcu} okçu · tam kadro`,
    eksik: k.okcu < k.maxOkcu,
  }));

  const enBuyuk = Math.max(1, ...satirlar.map(x => x.katki));

  return (
    <div style={panel({ padding: '13px 15px', background: 'rgba(11,23,37,0.72)', marginBottom: 22 })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon name="sur" size={15} color={C.good} />
        <span style={lbl({ fontSize: 8.5, letterSpacing: 1.6, flex: 1 })}>SAVUNMA YAPILARI</span>
        <span style={num({ fontSize: 17, color: C.good })}>+%{s.etkin}</span>
      </div>

      {satirlar.length === 0 ? (
        <div style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textFaint, lineHeight: 1.6 }}>
          Hiç savunma yapın yok. Sur, hendek ve kule savunan BÜTÜN birliklerinin
          savunmasını yüzde olarak çarpar — kalabalık savunmada kazanç çok daha büyük.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {satirlar.map((x, i) => (
            <div key={`${x.ad}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Icon name={x.ikon} size={13}
                color={x.katki > 0 ? C.good : C.textMute} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontFamily: FONT.ui, fontSize: 11, color: C.text }}>{x.ad}</span>
                  <span style={num({
                    fontSize: 9.5,
                    color: x.seviye >= x.maxSeviye ? C.gold : C.textMute,
                  })}>
                    Lvl {x.seviye}{x.seviye >= x.maxSeviye ? ' · son' : ''}
                  </span>
                </div>
                {/* Çubuk: hangi yapının ne kadar taşıdığı tek bakışta */}
                <div style={{
                  height: 3, borderRadius: 2, marginTop: 3,
                  background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${Math.min(100, (x.katki / enBuyuk) * 100)}%`, height: '100%',
                    background: x.eksik ? C.warn : C.good,
                  }} />
                </div>
                {x.not && (
                  <div style={{
                    fontFamily: FONT.ui, fontSize: 8.5, marginTop: 2,
                    color: x.eksik ? C.warn : C.textFaint,
                  }}>{x.not}</div>
                )}
              </div>
              <span style={num({
                fontSize: 13, color: x.katki > 0 ? C.good : C.textMute, flexShrink: 0,
              })}>+%{x.katki}</span>
            </div>
          ))}
        </div>
      )}

      {/*
        TAVANA DAYANDIYSA SÖYLE. Tavana varmış bir oyuncunun surunu
        yükseltmesi hiçbir işe yaramaz ve bunu bilmeden kaynak yakar.
      */}
      {s.kirpilan > 0 && (
        <div style={{
          marginTop: 9, padding: '7px 9px', borderRadius: 5,
          background: 'rgba(242,187,96,0.10)', border: `1px solid ${C.warn}55`,
          fontFamily: FONT.ui, fontSize: 9.5, color: C.warn, lineHeight: 1.6,
        }}>
          TAVAN DOLDU — yapıların toplamı %{s.ham}, ama savunma bonusu en çok
          %{s.tavan} olabiliyor. %{s.kirpilan} boşa gidiyor; bu yapıları
          yükseltmek artık savunmanı büyütmüyor.
        </div>
      )}

      {/*
        KAHRAMAN AYRI BİR ÇARPAN — sur tavanına girmiyor (bkz. combat.js).
        Aynı listede toplanmış gibi göstermek yanlış olurdu.
      */}
      {(kahraman?.var && !kahraman?.olu && (kahraman.bonuslar?.savunmaYuzde || 0) > 0) && (
        <div style={{
          marginTop: 9, paddingTop: 8, borderTop: `1px solid ${C.lineSoft}`,
          display: 'flex', alignItems: 'center', gap: 9,
        }}>
          <Icon name="migfer" size={13} color={C.frost} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.ui, fontSize: 11, color: C.text }}>Kahraman</div>
            <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint, marginTop: 2 }}>
              {kahraman.nerede === 'koy'
                ? 'Köyde — savunmaya AYRI bir çarpan olarak biniyor, sur tavanına girmiyor.'
                : 'Şu an köyde değil; döndüğünde bu bonus işler.'}
            </div>
          </div>
          <span style={num({
            fontSize: 13, flexShrink: 0,
            color: kahraman.nerede === 'koy' ? C.good : C.textMute,
          })}>+%{kahraman.bonuslar.savunmaYuzde}</span>
        </div>
      )}
    </div>
  );
}

function Summary({ label, value, color, icon }) {
  return (
    <div style={panel({
      padding: '10px 12px', background: 'rgba(11,23,37,0.78)',
      display: 'flex', alignItems: 'center', gap: 10,
    })}>
      <Icon name={icon} size={20} color={color} />
      <div style={{ minWidth: 0 }}>
        <div style={lbl({ fontSize: 8.5 })}>{label}</div>
        <div style={num({ fontSize: 21, color, lineHeight: 1.15, fontWeight: 500 })}>
          {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
        </div>
      </div>
    </div>
  );
}

function StatChip({ icon, label, value, color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} title={label}>
      <Icon name={icon} size={12} color={color} />
      <span style={num({ fontSize: 10.5, color: C.text })}>{value}</span>
    </span>
  );
}

/**
 * unitStatsNow: sunucunun köyün EKİPMAN YÜKSELTMELERİYLE hesapladığı
 * güncel değerler. Kılıç Lvl 5'e çıkınca kılıçlı birimlerin saldırısı
 * burada da artmalı; tanımdaki temel değer yükseltmeleri bilmiyor.
 */
/**
 * TAKVİYE BÖLÜMÜ — iki yön, iki ayrı liste.
 *
 * `takviyeler`   : bu köyde misafir duran birlikler. Ev sahibi bunları
 *                  GERİ ÇAĞIRAMAZ (sahibinin işi) ama BESLİYOR — o yüzden
 *                  kimi beslediğini görmesi şart.
 * `takviyelerim` : benim askerimin durduğu köyler. Geri çağırma buradan.
 */
/**
 * MİKTAR SEÇİCİ — birim birim sayı kutusu.
 *
 * İki yön de kullanıyor: sahibin geri ÇAĞIRMASI ve ev sahibinin geri
 * YOLLAMASI. Aynı kutuyu iki kez yazmak, birinde düzeltilen bir sınırın
 * diğerinde kalmasına davetiye.
 */
function MiktarSecici({ units, sec, setSec, unitDefs }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))',
      gap: 6,
    }}>
      {Object.entries(units).map(([u, have]) => (
        <div key={u} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 7px', borderRadius: 5,
          background: 'rgba(8,17,28,0.6)', border: `1px solid ${C.lineSoft}`,
        }}>
          <Icon name={unitDefs[u]?.category === 'suvari' ? 'at' : 'kalkan'}
            size={12} color={C.iceDeep} />
          <span style={{
            flex: 1, minWidth: 0, fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{unitDefs[u]?.name || u}</span>
          <span style={num({ fontSize: 9, color: C.textMute })}>/{have}</span>
          <input type="number" min={0} max={have} value={sec[u] ?? 0}
            onChange={(e) => setSec(s => ({
              ...s,
              [u]: Math.max(0, Math.min(have, Math.floor(Number(e.target.value) || 0))),
            }))}
            style={{
              width: 56, flexShrink: 0, padding: '3px 5px', textAlign: 'right',
              fontFamily: FONT.num, fontSize: 11, color: C.frost,
              background: 'rgba(4,9,15,0.75)', border: `1px solid ${C.lineSoft}`,
              borderRadius: 4, outline: 'none',
            }} />
          <button onClick={() => setSec(s => ({ ...s, [u]: have }))} title="Tümünü seç"
            style={btn('ghost', {
              flexShrink: 0, padding: '3px 6px', fontSize: 8, letterSpacing: 0.6,
            })}>TÜM</button>
        </div>
      ))}
    </div>
  );
}

function TakviyeBolumu({ takviyeler = [], takviyelerim = [], unitDefs, onGeriCagir, onGeriYolla }) {
  /*
    AÇIK SATIR ve MİKTARLAR.

    Liste artık KÖY BAŞINA tek satır (sunucu grupluyor). Geri çağırırken
    "hepsi" tek seçenek değil: satır açılıp birim birim sayı verilebiliyor.
    Tek düğme bırakmak, saldırı gelirken savunmanın yarısını orada
    tutmayı imkânsız kılıyordu.
  */
  const [acik, setAcik] = useState(null);       // hostKey|slotKey
  const [sec, setSec] = useState({});

  if (!takviyeler.length && !takviyelerim.length) return null;

  const anahtar = (t) => `${t.hostKey}|${t.slotKey}`;
  const ac = (t) => {
    const k = anahtar(t);
    if (acik === k) { setAcik(null); return; }
    setAcik(k);
    setSec({ ...t.units });                     // varsayılan: hepsi
  };
  const secTopla = () => Object.values(sec).reduce((s, n) => s + (n || 0), 0);

  const Satir = ({ baslik, alt, units, sag }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      padding: '8px 10px', borderRadius: 6,
      background: 'rgba(8,17,28,0.6)', border: `1px solid ${C.lineSoft}`,
    }}>
      <div style={{ minWidth: 0, flex: '1 1 160px' }}>
        <div style={{ fontFamily: FONT.ui, fontSize: 11.5, color: C.frost }}>{baslik}</div>
        <div style={lbl({ fontSize: 8, marginTop: 1 })}>{alt}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: '1 1 auto' }}>
        {Object.entries(units || {}).map(([k, n]) => (
          <span key={k} title={unitDefs[k]?.name || k}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Icon name={unitDefs[k]?.category === 'suvari' ? 'at' : 'kalkan'}
              size={11} color={C.iceDeep} />
            <span style={num({ fontSize: 10.5, color: C.text })}>{n}</span>
          </span>
        ))}
      </div>
      {sag}
    </div>
  );

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon name="kalkan" size={14} color={C.good} />
        <span style={lbl({ fontSize: 9, letterSpacing: 1.6 })}>Takviye</span>
      </div>

      {takviyeler.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
          <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint }}>
            Köyümde misafir — <strong style={{ color: C.warn }}>yemeklerini ben ödüyorum</strong>
          </div>
          {takviyeler.map(t => {
            const k = `in-${t.userId}-${t.slotKey}`;
            const secili = acik === k;
            return (
              <div key={k}>
                <Satir baslik={t.fromName || 'Müttefik'}
                  alt={`${t.toplam} asker`
                    + (t.girdiSayisi > 1 ? ` · ${t.girdiSayisi} sevkiyat` : '')}
                  units={t.units}
                  sag={onGeriYolla ? (
                    <button onClick={() => {
                      if (secili) { setAcik(null); return; }
                      setAcik(k); setSec({ ...t.units });
                    }}
                      title="Misafir askeri sahibinin köyüne yolla"
                      style={btn(secili ? 'primary' : 'ghost', {
                        flexShrink: 0, padding: '5px 10px', fontSize: 9, letterSpacing: 0.8,
                      })}>
                      {secili ? 'KAPAT' : 'GERİ YOLLA'}
                    </button>
                  ) : null} />

                {secili && (
                  <div style={{
                    margin: '5px 0 2px', padding: '9px 11px', borderRadius: 6,
                    background: 'rgba(6,12,20,0.7)', border: `1px solid ${C.lineBright}`,
                    display: 'flex', flexDirection: 'column', gap: 7,
                  }}>
                    <div style={{
                      fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, lineHeight: 1.5,
                    }}>
                      Ne kadarını yollayacaksın? Kalanlar köyünü savunmaya devam eder —
                      ama <b style={{ color: C.warn }}>ekmeklerini sen ödersin</b>.
                      Sahibine bir rapor gidiyor.
                    </div>
                    <MiktarSecici units={t.units} sec={sec} setSec={setSec} unitDefs={unitDefs} />
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button onClick={() => setSec({ ...t.units })}
                        style={btn('ghost', { padding: '5px 9px', fontSize: 9 })}>HEPSİ</button>
                      <button onClick={() => setSec({})}
                        style={btn('ghost', { padding: '5px 9px', fontSize: 9 })}>TEMİZLE</button>
                      <span style={num({ fontSize: 10.5, color: C.textDim, marginLeft: 'auto' })}>
                        {secTopla()} asker
                      </span>
                      <button
                        disabled={secTopla() <= 0}
                        onClick={() => {
                          onGeriYolla({ ownerUserId: t.userId, slotKey: t.slotKey, units: sec });
                          setAcik(null);
                        }}
                        style={btn('danger', {
                          padding: '6px 14px', fontSize: 9.5, letterSpacing: 1,
                          opacity: secTopla() > 0 ? 1 : 0.5,
                        })}>
                        GERİ YOLLA
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {takviyelerim.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint }}>
            Askerim dışarıda — yemeğini o köy ödüyor
          </div>
          {takviyelerim.map(t => {
            const k = anahtar(t);
            const secili = acik === k;
            return (
              <div key={`out-${k}`}>
                <Satir
                  baslik={t.hostName || t.hostKey}
                  alt={`${t.toplam} asker · ${t.kendiKoyum ? 'kendi köyüm' : 'müttefik köy'}`
                    + (t.girdiSayisi > 1 ? ` · ${t.girdiSayisi} sevkiyat` : '')}
                  units={t.units}
                  sag={(
                    <button onClick={() => ac(t)}
                      title="Ne kadarını geri çağıracağını seç"
                      style={btn(secili ? 'primary' : 'ghost', {
                        flexShrink: 0, padding: '5px 10px', fontSize: 9, letterSpacing: 0.8,
                      })}>
                      {secili ? 'KAPAT' : 'GERİ ÇAĞIR'}
                    </button>
                  )} />

                {secili && (
                  <div style={{
                    margin: '5px 0 2px', padding: '9px 11px', borderRadius: 6,
                    background: 'rgba(6,12,20,0.7)', border: `1px solid ${C.lineBright}`,
                    display: 'flex', flexDirection: 'column', gap: 7,
                  }}>
                    <div style={{
                      fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, lineHeight: 1.5,
                    }}>
                      Ne kadarını çağıracaksın? Kalanlar orada savunmaya devam eder.
                      Dönen asker <b style={{ color: C.textDim }}>yürüyerek</b> gelir.
                    </div>

                    <MiktarSecici units={t.units} sec={sec} setSec={setSec} unitDefs={unitDefs} />

                    <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button onClick={() => setSec({ ...t.units })}
                        style={btn('ghost', { padding: '5px 9px', fontSize: 9 })}>HEPSİ</button>
                      <button onClick={() => setSec({})}
                        style={btn('ghost', { padding: '5px 9px', fontSize: 9 })}>TEMİZLE</button>
                      <span style={num({ fontSize: 10.5, color: C.textDim, marginLeft: 'auto' })}>
                        {secTopla()} asker
                      </span>
                      <button
                        disabled={secTopla() <= 0}
                        onClick={() => {
                          onGeriCagir?.({ hostKey: t.hostKey, slotKey: t.slotKey, units: sec });
                          setAcik(null);
                        }}
                        style={btn('primary', {
                          padding: '6px 14px', fontSize: 9.5, letterSpacing: 1,
                          opacity: secTopla() > 0 ? 1 : 0.5,
                        })}>
                        GERİ ÇAĞIR
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ArmyPanel({
  army = {}, unitDefs = {}, equipmentDefs = {}, unitStatsNow = {},
  takviyeler = [], takviyelerim = [], onGeriCagir, onGeriYolla,
  // Savunma yapılarının yüzde katkısı — bkz. combat.js · savunmaOzeti
  savunmaYapilari = null, kahraman = null,
}) {
  const stOf = (type) => unitStatsNow[type] || unitDefs[type]?.stats || {};
  const vp = useViewport();
  const [detail, setDetail] = useState(null);
  const entries = Object.entries(army).filter(([, c]) => c > 0);
  const total = entries.reduce((s, [, c]) => s + c, 0);

  const t = entries.reduce((acc, [type, count]) => {
    const d = unitDefs[type];
    if (!d) return acc;
    const st = stOf(type);
    acc.saldiri  += Math.round((st.saldiri  || 0) * count);
    acc.yayaSav  += Math.round((st.yayaSav  || 0) * count);
    acc.atliSav  += Math.round((st.atliSav  || 0) * count);
    acc.kapasite += Math.round((st.kapasite || 0) * count);
    return acc;
  }, { saldiri: 0, yayaSav: 0, atliSav: 0, kapasite: 0 });

  const byCat = entries.reduce((acc, [type, count]) => {
    const d = unitDefs[type];
    if (!d) return acc;
    (acc[d.category || 'diger'] ||= []).push({ type, count, def: d });
    return acc;
  }, {});

  return (
    <div style={{ padding: vp.mobile ? '14px 12px 28px' : '20px 24px 32px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18 }}>
          <Icon name="ordu" size={26} color={C.ice} strokeWidth={1.4} />
          <div>
            <h2 style={{ fontFamily: FONT.head, fontSize: 24, letterSpacing: 5, color: C.frost }}>ORDU</h2>
            <div style={lbl({ fontSize: 8.5, letterSpacing: 2 })}>
              {total > 0 ? `${total} asker · ${Object.keys(byCat).length} sınıf` : 'henüz asker yok'}
            </div>
          </div>
        </div>

        {/* Özet */}
        <div style={{
          display: 'grid', gap: 9, marginBottom: 22,
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        }}>
          <Summary label="Toplam asker"  value={total}        color={C.frost}  icon="nufus" />
          <Summary label="Toplam saldırı" value={t.saldiri}   color={C.danger} icon="kilic" />
          <Summary label="Yaya savunma"  value={t.yayaSav}    color={C.good}   icon="kalkan" />
          <Summary label="Atlı savunma"  value={t.atliSav}    color={C.good}   icon="mizrak" />
          <Summary label="Taşıma kap."   value={t.kapasite}   color={C.iceSoft} icon="depo" />
        </div>

        <SavunmaYapilari s={savunmaYapilari} kahraman={kahraman} />

        <TakviyeBolumu takviyeler={takviyeler} takviyelerim={takviyelerim}
          onGeriYolla={onGeriYolla}
          unitDefs={unitDefs} onGeriCagir={onGeriCagir} />

        {total === 0 ? (
          <div style={panel({
            padding: 34, textAlign: 'center', background: 'rgba(11,23,37,0.72)',
          })}>
            <Icon name="kisla" size={40} color={C.lineBright} strokeWidth={1.1} />
            <div style={{ fontFamily: FONT.head, fontSize: 17, color: C.textDim, letterSpacing: 2, marginTop: 12 }}>
              Ordu boş
            </div>
            <div style={{
              fontFamily: FONT.ui, fontSize: 11, color: C.textMute,
              marginTop: 7, lineHeight: 1.6, maxWidth: 420, marginInline: 'auto',
            }}>
              Köy Merkezi’nden bir <strong style={{ color: C.textDim }}>Kışla</strong> ya da
              {' '}<strong style={{ color: C.textDim }}>Ahır</strong> kur, ardından
              {' '}<strong style={{ color: C.textDim }}>Silahçı/Zırhçı</strong>’da ekipman üretip asker eğit.
              Her asker 1 boş işçi tüketir.
            </div>
          </div>
        ) : (
          Object.entries(byCat).map(([cat, units]) => {
            const color = CAT_COLOR[cat] || C.textDim;
            return (
              <div key={cat} style={{ marginBottom: 22 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  paddingBottom: 6, marginBottom: 10,
                  borderBottom: `1px solid ${color}44`,
                }}>
                  <Icon name={CAT_ICON[cat] || 'ordu'} size={15} color={color} />
                  <span style={{ fontFamily: FONT.head, fontSize: 15, letterSpacing: 2.5, color }}>
                    {(CAT_LABEL[cat] || cat).toUpperCase()}
                  </span>
                  <span style={num({ fontSize: 11, color: C.textFaint })}>
                    {units.reduce((s, u) => s + u.count, 0)} asker
                  </span>
                </div>

                {/*
                  Masaustunde 4 sutun (degismedi). Telefonda sabit repeat(4)
                  kartlari ~70 px genisliginde ama 168 px yuksekliginde
                  seritlere ceviriyor, isim ile sayi rozeti ust uste biniyordu;
                  orada auto-fill ile 2 sutuna (cok dar ekranda 1) iniyor.
                */}
                <div style={{
                  display: 'grid', gap: 10,
                  gridTemplateColumns: vp.mobile
                    ? 'repeat(auto-fill, minmax(140px, 1fr))'
                    : 'repeat(4, minmax(0, 1fr))',
                }}>
                  {units.map(({ type, count, def }) => {
                    const img = unitImage(type);
                    return (
                    <div key={type} className="tn-card"
                      onClick={() => setDetail(type)} title="Detay için tıkla"
                      style={panel({
                        padding: 0, overflow: 'hidden', cursor: 'pointer',
                        background: 'rgba(11,23,37,0.78)',
                        border: `1px solid ${color}33`,
                      })}>
                      {/* Birim görseli — asker sayısı üstte rozet */}
                      <div style={{ position: 'relative', height: 168, background: '#0b1420' }}>
                        {img ? (
                          <img src={img} alt={def.name || type} draggable={false}
                            style={{
                              width: '100%', height: '100%', display: 'block',
                              objectFit: 'cover', objectPosition: '50% 16%',
                            }} />
                        ) : (
                          <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
                            <Icon name={CAT_ICON[cat] || 'ordu'} size={38}
                              color={C.lineBright} strokeWidth={1.2} />
                          </div>
                        )}
                        <div style={{
                          position: 'absolute', left: 0, right: 0, bottom: 0,
                          padding: '20px 10px 7px',
                          background: 'linear-gradient(180deg, transparent, rgba(4,9,15,0.94))',
                        }}>
                          <div style={{
                            fontFamily: FONT.head, fontSize: 15, fontWeight: 600,
                            color: C.frost, letterSpacing: 0.6,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>{def.name || type}</div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                            {(def.equipment || []).map(eq => (
                              <span key={eq} title={EQ_LABEL[eq] || equipmentDefs[eq]?.name || eq}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                <Icon name={eq} size={10} color={C.textFaint} />
                              </span>
                            ))}
                          </div>
                        </div>
                        <div style={{
                          position: 'absolute', top: 7, right: 7,
                          padding: '3px 9px', borderRadius: 5,
                          background: 'rgba(4,9,15,0.8)', border: `1px solid ${color}66`,
                        }}>
                          <span style={num({ fontSize: 16, color, fontWeight: 500 })}>{count}</span>
                        </div>
                      </div>

                      <div style={{ padding: '0 11px 11px' }}>
                      <div style={{
                        display: 'flex', gap: 10, flexWrap: 'wrap',
                        paddingTop: 8, borderTop: `1px solid ${C.lineSoft}`,
                      }}>
                        <StatChip icon="kilic"  label="Saldırı (yükseltmelerle)" value={Math.round(stOf(type).saldiri ?? 0)}  color={C.danger} />
                        <StatChip icon="kalkan" label="Yaya savunma"  value={Math.round(stOf(type).yayaSav ?? 0)}  color={C.good} />
                        <StatChip icon="mizrak" label="Atlı savunma"  value={Math.round(stOf(type).atliSav ?? 0)}  color={C.good} />
                        <StatChip icon="hiz"    label="Hız"           value={def.stats.hiz}      color={C.iceDeep} />
                        <StatChip icon="depo"   label="Taşıma"        value={def.stats.kapasite} color={C.textDim} />
                      </div>

                      <div style={{
                        marginTop: 7, fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute,
                      }}>
                        Birlik toplamı: saldırı{' '}
                        <span style={num({ color: C.textDim })}>{Math.round((stOf(type).saldiri ?? 0) * count).toLocaleString('tr-TR')}</span>
                        {' '}· savunma{' '}
                        <span style={num({ color: C.textDim })}>{Math.round((stOf(type).yayaSav ?? 0) * count).toLocaleString('tr-TR')}</span>
                      </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {detail && (
        <UnitDetail type={detail} def={unitDefs[detail]} count={army[detail]}
          equipmentDefs={equipmentDefs} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}
