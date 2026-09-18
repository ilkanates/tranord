/**
 * AdminPanel — TAM EKRAN inceleme tezgâhı.
 *
 * İlkan: *"admin ekranı tam bir ayrıntılı inceleme ekranı olsun,
 * olabildiğin kadar bilgi ver, tam ekran olsun."*
 *
 * ── NEDEN BU EKRAN VAR ─────────────────────────────────────────────
 *
 * Süs değil, TEŞHİS ARACI. 700 NPC köyü haftalarca hiç gelişmedi ve
 * kimse fark etmedi; hatayı ancak elle yazılmış ölçüm betikleriyle
 * bulabildim. "Köylerin kaçında fırın var" sorusunun sorulabildiği bir
 * yer olsaydı hata ilk gün görülürdü. Bu ekran o yer.
 *
 * ── ÜÇ TASARIM KARARI ──────────────────────────────────────────────
 *
 * 1) ORTANCA, ORTALAMANIN YANINDA. Tek başına ortalama yalan söyler:
 *    sıfırlamadan önce dünyanın ORTALAMA ordusu sıfırdan büyüktü ama
 *    ORTANCA 0'dı — köylerin yarısından fazlasının hiç askeri yoktu.
 *    Karar ortancadan çıktı, o yüzden ikisi hep yan yana.
 *
 * 2) "KAÇINDA HİÇ YOK" AYRI SÜTUN. Ortalamanın içinde kaybolan ama en
 *    çok konuşan sayı bu.
 *
 * 3) KENDİ KENDİNE YENİLEMİYOR. Hesap canlıda ~0,7 sn sürüyor (700 köy);
 *    saniyede bir koşan bir panel oyun sunucusuna sürekli yük bindirirdi.
 *    Tazeleme düğmesi var, ne zaman bakılacağına bakan karar veriyor.
 *
 * PANEL YALNIZ ADMİNE GÖRÜNÜYOR ama bu bir yetki değil: sunucu her
 * istekte yeniden karar veriyor (server/admin.js · adminGate) ve admin
 * olmayana bu yollar 404 dönüyor. Buradaki bayrak sadece düğmeyi çizip
 * çizmemeye karar veriyor.
 *
 * GERİ DÖNÜŞ YOLU ŞART: başka bir hesaba girmek kendi hesabını
 * kaybetmek olmamalı — adminin token'ı ayrı bir anahtarda saklanıyor.
 */
import { useEffect, useState } from 'react';
import { C, FONT, btn, label as lbl, num, short } from '../theme';
import Icon from './Icons';
import { adminTokeniSakla } from '../adminOturum';
import { useViewport } from '../responsive';

/**
 * Yanıtı JSON olarak oku — HTML dönerse ANLAŞILIR hata ver.
 *
 * "Unexpected token '<', \"<!doctype\"..." tarayıcının ham çözümleme
 * hatası ve sebebi hiç anlatmıyor. HTML dönmesinin tek bir anlamı var:
 * istek oyun sunucusuna değil, tek sayfalık uygulamaya düştü — yani ön
 * yüz (nginx) /admin yolunu iletmiyor.
 */
async function jsonOku(r) {
  const tur = r.headers.get('content-type') || '';
  if (!tur.includes('application/json')) {
    throw new Error(`Sunucu JSON yerine sayfa döndürdü (${r.status}). `
      + '/admin yolu oyun sunucusuna iletilmiyor — nginx ayarı eksik.');
  }
  return r.json();
}

const SEKMELER = [
  ['ozet', 'Özet'],
  ['npc', 'NPC dünyası'],
  ['oyuncu', 'Oyuncular'],
  ['arac', 'Araçlar'],
];

/* ── Küçük görsel parçalar ───────────────────────────────────────── */

const kutu = (extra = {}) => ({
  background: 'rgba(8,17,28,0.6)', border: `1px solid ${C.lineSoft}`,
  borderRadius: 6, padding: '10px 12px', ...extra,
});

function Sayi({ baslik, deger, alt, renk }) {
  return (
    <div style={kutu()}>
      <div style={lbl({ fontSize: 8.5, letterSpacing: 1.3 })}>{baslik}</div>
      <div style={num({ fontSize: 20, color: renk || C.frost, lineHeight: 1.25 })}>{deger}</div>
      {alt && (
        <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute }}>{alt}</div>
      )}
    </div>
  );
}

/**
 * DAĞILIM SATIRI — bir ölçünün beş yüzü.
 *
 * Ortalama tek başına gösterilmiyor (bkz. dosya başı · 1. karar).
 * "hiç yok" sütunu en sağda ve kırmızı: bakan gözün ilk yakaladığı şey
 * "kaç tanesinde bu hiç yok" olsun.
 */
function DagilimSatiri({ ad, d, birim = '' }) {
  if (!d) return null;
  const yaz = (n) => (n >= 10000 ? short(n) : n);
  return (
    <tr>
      <td style={{ padding: '5px 8px', fontFamily: FONT.ui, fontSize: 11, color: C.frost }}>{ad}</td>
      <td style={num({ padding: '5px 8px', fontSize: 11, textAlign: 'right', color: C.iceSoft })}>
        {yaz(d.ortanca)}{birim}
      </td>
      <td style={num({ padding: '5px 8px', fontSize: 11, textAlign: 'right', color: C.textDim })}>
        {yaz(d.ortalama)}{birim}
      </td>
      <td style={num({ padding: '5px 8px', fontSize: 11, textAlign: 'right', color: C.textDim })}>
        {yaz(d.p90)}{birim}
      </td>
      <td style={num({ padding: '5px 8px', fontSize: 11, textAlign: 'right', color: C.textDim })}>
        {yaz(d.enCok)}{birim}
      </td>
      <td style={num({
        padding: '5px 8px', fontSize: 11, textAlign: 'right',
        color: d.sifir ? C.danger : C.textMute,
      })}>{d.sifir}</td>
      <td style={num({ padding: '5px 8px', fontSize: 11, textAlign: 'right', color: C.textDim })}>
        {yaz(d.toplam)}
      </td>
    </tr>
  );
}

function DagilimTablosu({ baslik, satirlar }) {
  return (
    <div style={kutu({ padding: 0, overflow: 'hidden' })}>
      <div style={{
        padding: '8px 12px', borderBottom: `1px solid ${C.lineSoft}`,
        fontFamily: FONT.head, fontSize: 12, letterSpacing: 1.6, color: C.frost,
      }}>{baslik}</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
          <thead>
            <tr>
              {['ölçü', 'ortanca', 'ortalama', '%90', 'en çok', 'hiç yok', 'toplam'].map((b, i) => (
                <th key={b} style={lbl({
                  fontSize: 8, letterSpacing: 1.1, padding: '6px 8px',
                  textAlign: i === 0 ? 'left' : 'right', fontWeight: 400,
                })}>{b}</th>
              ))}
            </tr>
          </thead>
          <tbody>{satirlar}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Ana bileşen ─────────────────────────────────────────────────── */

export default function AdminPanel({ token, onToken, onKapat, serverUrl = '' }) {
  const [liste, setListe] = useState(null);
  /* Yetkili e-postalar — ortam değişkeninden geliyor (bkz. server/admin.js) */
  const [adminler, setAdminler] = useState([]);
  const [ist, setIst] = useState(null);
  const [hata, setHata] = useState(null);
  const [ara, setAra] = useState('');
  const [bekleyen, setBekleyen] = useState(null);
  const [sekme, setSekme] = useState('ozet');
  const [yukleniyor, setYukleniyor] = useState(true);
  /* null · 'soru' (uyarı açık) · 'calisiyor' */
  const [sifirla, setSifirla] = useState(null);
  const [sifirSonuc, setSifirSonuc] = useState(null);
  const vp = useViewport();

  /*
    TAZELEME SAYACI. Yükleme mantığı TEK KOPYA ve efektin içinde; düğme
    sayacı artırıyor, efekt sayacı dinliyor. İkinci bir kopya yazmak
    (biri efektte biri düğmede) bu depodaki en pahalı hata sınıfıydı:
    aynı iş iki yerde, zamanla ayrışıyor.
  */
  const [tazeleme, setTazeleme] = useState(0);
  const tazele = () => { setYukleniyor(true); setHata(null); setTazeleme(n => n + 1); };

  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const bas = { Authorization: `Bearer ${token}` };
        const [ru, ri] = await Promise.all([
          fetch(`${serverUrl}/admin/users`, { headers: bas }),
          fetch(`${serverUrl}/admin/istatistik`, { headers: bas }),
        ]);
        if (!ru.ok) throw new Error(ru.status === 404 ? 'Yetki yok' : `Sunucu ${ru.status}`);
        const du = await jsonOku(ru);
        if (iptal) return;
        setListe(du.users || []);
        setAdminler(du.adminler || []);
        if (ri.ok) {
          const di = await jsonOku(ri);
          if (!iptal) setIst(di);
        }
      } catch (e) {
        if (!iptal) setHata(e.message);
      } finally {
        if (!iptal) setYukleniyor(false);
      }
    })();
    /* Panel kapanırken yarım kalan istek artık state'e yazmıyor */
    return () => { iptal = true; };
  }, [serverUrl, token, tazeleme]);

  /**
   * HESABA GİR. Adminin kendi token'ı saklanıyor, sonra o kullanıcının
   * token'ı yükleniyor — uygulama yeni kimlikle baştan bağlanıyor.
   */
  const gir = async (u) => {
    setBekleyen(u.id); setHata(null);
    try {
      const r = await fetch(`${serverUrl}/admin/impersonate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id }),
      });
      if (!r.ok) throw new Error(`Sunucu ${r.status}`);
      const d = await jsonOku(r);
      if (!d.token) throw new Error('Token gelmedi');
      /*
        KENDİ TOKEN'INI SAKLA — önce. Sıra tersse ve saklama başarısız
        olursa admin kendi hesabına dönemez.
      */
      adminTokeniSakla(token);
      onToken(d.token);
      /*
        TEMİZ YENİDEN YÜKLEME. Token'ı yerinde değiştirmek soketi kopuk
        bırakıyor (ölçüldü) ve oturum durumu eski kimliğe ait kalıyor.
      */
      window.location.reload();
    } catch (e) {
      setHata(e.message);
      setBekleyen(null);
    }
  };

  /**
   * NPC DÜNYASINI SIFIRLA — bütün NPC köyleri silinir, dünya baştan kurulur.
   *
   * GERİ ALINAMAZ. Oyuncu köylerine dokunmuyor (ayrım veritabanı
   * TABLOSUNDA, bkz. server/db.js · deleteAllNpcVillages).
   */
  const npcSifirla = async () => {
    setSifirla('calisiyor'); setHata(null); setSifirSonuc(null);
    try {
      const r = await fetch(`${serverUrl}/admin/npc-sifirla`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`Sunucu ${r.status}`);
      setSifirSonuc(await jsonOku(r));
      setSifirla(null);
      tazele();
    } catch (e) {
      setHata('Sıfırlama başarısız: ' + e.message);
      setSifirla(null);
    }
  };

  const suzulmus = (liste || []).filter(u => {
    if (!ara.trim()) return true;
    const q = ara.trim().toLowerCase();
    return String(u.id) === q
      || (u.email || '').toLowerCase().includes(q)
      || (u.name || '').toLowerCase().includes(q);
  });

  /* İstatistikteki oyuncu satırını kullanıcı numarasından bul */
  const istOyuncu = (id) => (ist?.oyuncular || []).find(o => o.userId === id);

  const d = ist?.dunya;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: 'rgba(4,9,15,0.94)', backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Başlık şeridi ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        padding: '10px 14px', borderBottom: `1px solid ${C.lineSoft}`,
      }}>
        <Icon name="kilit" size={17} color={C.warn} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONT.head, fontSize: 16, letterSpacing: 2, color: C.frost }}>
            ADMİN PANELİ
          </div>
          <div style={lbl({
            fontSize: 8.5, letterSpacing: 1.3,
            /*
              E-POSTA BÜYÜK HARFE ÇEVRİLMİYOR: `TRANORD_ADMIN` satırıyla
              karşılaştırmak isteyen kişi yazdığıyla aynı olup olmadığını
              görebilmeli.
            */
            ...(adminler.length ? { textTransform: 'none' } : {}),
          })}>
            {adminler.length ? `yetkili: ${adminler.join(' · ')}` : 'yükleniyor…'}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/*
          SAYI ŞERİDİ TELEFONDA YOK. 375 px'de dört sayı 149 px alıyor ve
          başlığa 59 px kalıyordu — başlık sarıp kırpılıyordu (ölçüldü).
          Aynı dört sayı Özet sekmesinde daha büyük ve açıklamalı duruyor.
        */}
        {d && !vp.mobile && (
          <div style={{ display: 'flex', gap: 14, marginRight: 6 }}>
            {[['NPC', `${d.npc}${d.npcKuyruk ? ` +${d.npcKuyruk}` : ''}`],
              ['OYUNCU', d.oyuncu],
              ['KÖY', d.oyuncuKoy],
              ['BELLEK', `${d.bellekMb} MB`]].map(([b, v]) => (
              <div key={b} style={{ textAlign: 'right' }}>
                <div style={lbl({ fontSize: 7.5, letterSpacing: 1.1 })}>{b}</div>
                <div style={num({ fontSize: 13, color: C.iceSoft })}>{v}</div>
              </div>
            ))}
          </div>
        )}

        <button type="button" disabled={yukleniyor} onClick={tazele}
          style={btn('ghost', { padding: '6px 11px', fontSize: 10 })}>
          {yukleniyor ? 'YÜKLENİYOR…' : 'TAZELE'}
        </button>
        <button type="button" onClick={onKapat}
          style={btn('ghost', { padding: '6px 11px', fontSize: 10 })}>KAPAT</button>
      </div>

      {/* ── Sekmeler ── */}
      <div style={{
        display: 'flex', gap: 4, flexShrink: 0, padding: '8px 14px 0',
        borderBottom: `1px solid ${C.lineSoft}`, overflowX: 'auto',
      }}>
        {SEKMELER.map(([k, ad]) => (
          <button key={k} type="button" onClick={() => setSekme(k)}
            style={{
              padding: '7px 13px', border: 'none', cursor: 'pointer',
              borderRadius: '5px 5px 0 0', whiteSpace: 'nowrap',
              background: sekme === k ? 'rgba(143,220,255,0.14)' : 'transparent',
              borderBottom: sekme === k ? `2px solid ${C.frost}` : '2px solid transparent',
              fontFamily: FONT.ui, fontSize: 11,
              color: sekme === k ? C.frost : C.textMute,
            }}>{ad}</button>
        ))}
      </div>

      {hata && (
        <div style={{
          margin: '10px 14px 0', padding: '8px 10px', borderRadius: 5,
          background: 'rgba(58,14,20,0.8)', border: `1px solid ${C.dangerDim}`,
          fontFamily: FONT.ui, fontSize: 11, color: '#f0b8bd',
        }}>{hata}</div>
      )}

      {/* ── Gövde ── */}
      <div className="tn-scroll" style={{ flex: 1, overflowY: 'auto', padding: 14 }}>

        {sekme === 'ozet' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {d && (
              <div style={{
                display: 'grid', gap: 8,
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              }}>
                <Sayi baslik="NPC KÖYÜ" deger={d.npc}
                  alt={d.npcKuyruk ? `${d.npcKuyruk} tanesi kuruluyor` : `hedef ${d.npcHedef}`}
                  renk={d.npcKuyruk ? C.warn : C.frost} />
                <Sayi baslik="OYUNCU" deger={d.oyuncu} alt={`${d.oyuncuKoy} köy`} />
                <Sayi baslik="HARİTA" deger={d.slot} alt="slot" />
                <Sayi baslik="DÜNYA HIZI" deger={`${Math.round(3600 / d.saatSaniye)}×`}
                  alt={`1 oyun saati = ${d.saatSaniye} sn`} />
                <Sayi baslik="ÇALIŞMA" deger={`${Math.floor(d.calismaSn / 3600)} sa`}
                  alt={`${Math.floor((d.calismaSn % 3600) / 60)} dk`} />
                <Sayi baslik="BELLEK" deger={`${d.bellekMb} MB`} alt={`hesap ${ist.hesapMs} ms`} />
              </div>
            )}

            {/*
              NPC ve OYUNCU YAN YANA. Asıl soru hiçbir zaman "NPC ne
              durumda" değil, "NPC oyuncuya göre ne durumda" — dünyanın
              zorluğu bu orandan okunuyor.
            */}
            {ist && (
              <div style={{
                display: 'grid', gap: 12,
                gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
              }}>
                <DagilimTablosu baslik="NPC KÖYLERİ — köy başına" satirlar={<>
                  <DagilimSatiri ad="Nüfus" d={ist.npc.nufus} />
                  <DagilimSatiri ad="Ordu (evde)" d={ist.npc.ordu} />
                  <DagilimSatiri ad="Ordu (yolda)" d={ist.npc.yolda} />
                  <DagilimSatiri ad="Saldırı gücü" d={ist.npc.saldiri} />
                  <DagilimSatiri ad="Savunma gücü" d={ist.npc.savunma} />
                  <DagilimSatiri ad="Ana bina" d={ist.npc.anaBina} />
                  <DagilimSatiri ad="Tarla sayısı" d={ist.npc.tarlaSayisi} />
                  <DagilimSatiri ad="Tarla seviyesi" d={ist.npc.tarlaOrtSeviye} />
                  <DagilimSatiri ad="İşleme binası" d={ist.npc.isleme} />
                  <DagilimSatiri ad="Askerî bina" d={ist.npc.askeri} />
                  <DagilimSatiri ad="Sur" d={ist.npc.sur} />
                </>} />
                <DagilimTablosu baslik="OYUNCU KÖYLERİ — köy başına" satirlar={<>
                  <DagilimSatiri ad="Nüfus" d={ist.oyuncuToplam.nufus} />
                  <DagilimSatiri ad="Ordu (evde)" d={ist.oyuncuToplam.ordu} />
                  <DagilimSatiri ad="Ordu (yolda)" d={ist.oyuncuToplam.yolda} />
                  <DagilimSatiri ad="Misafir asker" d={ist.oyuncuToplam.misafir} />
                  <DagilimSatiri ad="Savunan toplam" d={ist.oyuncuToplam.savunanToplam} />
                  <DagilimSatiri ad="Saldırı gücü" d={ist.oyuncuToplam.saldiri} />
                  <DagilimSatiri ad="Savunma gücü" d={ist.oyuncuToplam.savunma} />
                  <DagilimSatiri ad="Ana bina" d={ist.oyuncuToplam.anaBina} />
                  <DagilimSatiri ad="Tarla sayısı" d={ist.oyuncuToplam.tarlaSayisi} />
                  <DagilimSatiri ad="Tarla seviyesi" d={ist.oyuncuToplam.tarlaOrtSeviye} />
                  <DagilimSatiri ad="İşleme binası" d={ist.oyuncuToplam.isleme} />
                  <DagilimSatiri ad="Askerî bina" d={ist.oyuncuToplam.askeri} />
                  <DagilimSatiri ad="Sığınak" d={ist.oyuncuToplam.siginak} />
                </>} />
              </div>
            )}
          </div>
        )}

        {sekme === 'npc' && ist && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              display: 'grid', gap: 8,
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            }}>
              <Sayi baslik="ORDUSU OLMAYAN" deger={ist.npc.ordu.sifir}
                alt={`${ist.npc.koySayisi} köyden`}
                renk={ist.npc.ordu.sifir > ist.npc.koySayisi / 2 ? C.danger : C.frost} />
              <Sayi baslik="AÇ KÖY" deger={ist.npc.acKoy}
                renk={ist.npc.acKoy ? C.warn : C.frost} />
              <Sayi baslik="TOPLAM ASKER" deger={short(ist.npc.ordu.toplam)} />
              <Sayi baslik="TOPLAM NÜFUS" deger={short(ist.npc.nufus.toplam)} />
            </div>

            {/*
              BİNA VARLIĞI — bugünkü hatanın tam olarak görüneceği tablo.
              "700 köyün 0'ında fırın var" satırı, aynı bilgiyi ortalama
              olarak vermekten kat kat anlaşılır.
            */}
            <div style={kutu({ padding: 0, overflow: 'hidden' })}>
              <div style={{
                padding: '8px 12px', borderBottom: `1px solid ${C.lineSoft}`,
                fontFamily: FONT.head, fontSize: 12, letterSpacing: 1.6, color: C.frost,
              }}>BİNALAR — kaç köyde var, ortalama seviyesi</div>
              <div style={{
                display: 'grid', gap: 1,
                gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                background: C.lineSoft,
              }}>
                {Object.entries(ist.npc.binaVarlik).map(([tur, b]) => {
                  const oran = ist.npc.koySayisi ? b.koy / ist.npc.koySayisi : 0;
                  return (
                    <div key={tur} style={{
                      background: 'rgba(8,17,28,0.9)', padding: '7px 10px',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{
                        flex: 1, minWidth: 0, fontFamily: FONT.ui, fontSize: 11,
                        color: C.frost, whiteSpace: 'nowrap', overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>{b.ad}</span>
                      <span style={num({
                        fontSize: 11,
                        color: b.koy === 0 ? C.danger : oran > 0.5 ? C.iceSoft : C.textDim,
                      })}>{b.koy}</span>
                      <span style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textMute }}>
                        köy
                      </span>
                      {b.ortSeviye > 0 && (
                        <span style={num({ fontSize: 10, color: C.textMute })}>
                          Lvl {b.ortSeviye}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dünyadaki asker dağılımı — hangi birimden kaç tane var */}
            <div style={kutu({ padding: 0, overflow: 'hidden' })}>
              <div style={{
                padding: '8px 12px', borderBottom: `1px solid ${C.lineSoft}`,
                fontFamily: FONT.head, fontSize: 12, letterSpacing: 1.6, color: C.frost,
              }}>NPC ORDULARI — birim dağılımı</div>
              <div style={{
                display: 'grid', gap: 1,
                gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                background: C.lineSoft,
              }}>
                {Object.entries(ist.npc.birimler)
                  .sort((a, b) => b[1] - a[1])
                  .map(([tur, n]) => (
                    <div key={tur} style={{
                      background: 'rgba(8,17,28,0.9)', padding: '7px 10px',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{
                        flex: 1, minWidth: 0, fontFamily: FONT.ui, fontSize: 11,
                        color: C.frost, whiteSpace: 'nowrap', overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>{tur}</span>
                      <span style={num({ fontSize: 11, color: C.iceSoft })}>{short(n)}</span>
                    </div>
                  ))}
                {!Object.keys(ist.npc.birimler).length && (
                  <div style={{
                    background: 'rgba(8,17,28,0.9)', padding: '10px 12px',
                    fontFamily: FONT.ui, fontSize: 11, color: C.danger,
                  }}>Dünyada hiç asker yok.</div>
                )}
              </div>
            </div>

            <DagilimTablosu baslik="NPC — bütün ölçüler (köy başına)" satirlar={<>
              <DagilimSatiri ad="Nüfus" d={ist.npc.nufus} />
              <DagilimSatiri ad="Ordu (evde)" d={ist.npc.ordu} />
              <DagilimSatiri ad="Ordu (yolda)" d={ist.npc.yolda} />
              <DagilimSatiri ad="Misafir asker" d={ist.npc.misafir} />
              <DagilimSatiri ad="Saldırı gücü" d={ist.npc.saldiri} />
              <DagilimSatiri ad="Savunma gücü" d={ist.npc.savunma} />
              <DagilimSatiri ad="Ana bina seviyesi" d={ist.npc.anaBina} />
              <DagilimSatiri ad="Bina sayısı" d={ist.npc.binaSayisi} />
              <DagilimSatiri ad="Tarla sayısı" d={ist.npc.tarlaSayisi} />
              <DagilimSatiri ad="Tarla ort. seviye" d={ist.npc.tarlaOrtSeviye} />
              <DagilimSatiri ad="İşleme binası (6'da)" d={ist.npc.isleme} />
              <DagilimSatiri ad="Askerî bina (7'de)" d={ist.npc.askeri} />
              <DagilimSatiri ad="Sur seviyesi" d={ist.npc.sur} />
              <DagilimSatiri ad="Ham hammadde" d={ist.npc.hammadde} />
            </>} />
          </div>
        )}

        {sekme === 'oyuncu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={ara} onChange={(e) => setAra(e.target.value)}
              placeholder="e-posta, ad ya da numara"
              style={{
                padding: '9px 11px', borderRadius: 5,
                background: 'rgba(8,17,28,0.8)', border: `1px solid ${C.lineSoft}`,
                color: C.frost, fontFamily: FONT.ui, fontSize: 12,
              }} />

            <div style={kutu({ padding: 0, overflow: 'hidden' })}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
                  <thead>
                    <tr>
                      {['#', 'oyuncu', 'köy', 'nüfus', 'evde', 'yolda', 'dışarıda',
                        'saldırı', 'savunma', 'sefer', 'gümüş', 'altın', 'kah.', '', ''].map((b, i) => (
                        <th key={b + i} style={lbl({
                          fontSize: 8, letterSpacing: 1.1, padding: '7px 8px',
                          textAlign: i <= 1 ? 'left' : 'right', fontWeight: 400,
                          borderBottom: `1px solid ${C.lineSoft}`,
                        })}>{b}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {suzulmus.map(u => {
                      const o = istOyuncu(u.id);
                      const s = (v) => (v == null ? '—' : (v >= 10000 ? short(v) : v));
                      return (
                        <tr key={u.id} style={{ borderTop: `1px solid ${C.lineSoft}` }}>
                          <td style={num({ padding: '7px 8px', fontSize: 10, color: C.textMute })}>
                            {u.id}
                          </td>
                          <td style={{ padding: '7px 8px', maxWidth: 210 }}>
                            <div style={{
                              fontFamily: FONT.ui, fontSize: 11.5, color: C.frost,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {o?.cevrimici && (
                                <span style={{ color: C.good, marginRight: 5 }}>●</span>
                              )}
                              {u.name || '(adsız)'}
                            </div>
                            <div style={{
                              fontFamily: FONT.ui, fontSize: 9, color: C.textMute,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>{u.email}</div>
                          </td>
                          {[o?.koy ?? u.koySayisi, o?.nufus, o?.ordu, o?.yolda, o?.disarida,
                            o?.saldiri, o?.savunma,
                            o?.sefer, o?.gumus, o?.altin, o?.kahramanSeviye].map((v, i) => (
                            <td key={i} style={num({
                              padding: '7px 8px', fontSize: 11, textAlign: 'right',
                              color: C.textDim,
                            })}>{s(v)}</td>
                          ))}
                          <td style={{ padding: '7px 8px', textAlign: 'right' }}>
                            {o?.acKoy ? (
                              <span style={{
                                fontFamily: FONT.ui, fontSize: 9, color: C.warn,
                              }}>{o.acKoy} aç</span>
                            ) : null}
                          </td>
                          <td style={{ padding: '7px 8px', textAlign: 'right' }}>
                            <button type="button" onClick={() => gir(u)}
                              disabled={bekleyen != null}
                              style={btn('ghost', {
                                padding: '4px 9px', fontSize: 9,
                                opacity: bekleyen != null && bekleyen !== u.id ? 0.5 : 1,
                              })}>GİR</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {liste && !suzulmus.length && (
                <div style={{
                  padding: '12px', fontFamily: FONT.ui, fontSize: 11, color: C.textMute,
                }}>Eşleşen oyuncu yok.</div>
              )}
            </div>

            {ist && (
              <DagilimTablosu baslik="OYUNCU KÖYLERİ — bütün ölçüler (KÖY başına; üstteki tablo OYUNCU başına)" satirlar={<>
                <DagilimSatiri ad="Nüfus" d={ist.oyuncuToplam.nufus} />
                <DagilimSatiri ad="Ordu (evde)" d={ist.oyuncuToplam.ordu} />
                <DagilimSatiri ad="Ordu (yolda)" d={ist.oyuncuToplam.yolda} />
                <DagilimSatiri ad="Misafir asker" d={ist.oyuncuToplam.misafir} />
                <DagilimSatiri ad="Savunan toplam" d={ist.oyuncuToplam.savunanToplam} />
                <DagilimSatiri ad="Saldırı gücü" d={ist.oyuncuToplam.saldiri} />
                <DagilimSatiri ad="Savunma gücü" d={ist.oyuncuToplam.savunma} />
                <DagilimSatiri ad="Ana bina seviyesi" d={ist.oyuncuToplam.anaBina} />
                <DagilimSatiri ad="Bina sayısı" d={ist.oyuncuToplam.binaSayisi} />
                <DagilimSatiri ad="Tarla sayısı" d={ist.oyuncuToplam.tarlaSayisi} />
                <DagilimSatiri ad="Tarla ort. seviye" d={ist.oyuncuToplam.tarlaOrtSeviye} />
                <DagilimSatiri ad="Sığınak seviyesi" d={ist.oyuncuToplam.siginak} />
                <DagilimSatiri ad="Sur seviyesi" d={ist.oyuncuToplam.sur} />
                <DagilimSatiri ad="Ham hammadde" d={ist.oyuncuToplam.hammadde} />
              </>} />
            )}
          </div>
        )}

        {sekme === 'arac' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }}>
            {/*
              TEHLİKELİ BÖLGE kendi sekmesinde. Oyuncu listesiyle aynı
              akışta durursa aynı el hareketiyle basılır; geri alınamaz
              bir iş için bu yeterli bir sebep.
            */}
            <div style={kutu({ borderColor: C.dangerDim })}>
              <div style={{
                fontFamily: FONT.head, fontSize: 13, letterSpacing: 1.6,
                color: '#f0b8bd', marginBottom: 6,
              }}>NPC DÜNYASINI SIFIRLA</div>
              <div style={{
                fontFamily: FONT.ui, fontSize: 11, color: C.textDim,
                lineHeight: 1.55, marginBottom: 9,
              }}>
                Bütün NPC köyleri silinir ve dünya baştan kurulur. Köyler
                kademelerine uygun gelişmişlikte, orduları hazır doğar.
                Oyuncu köylerine dokunulmaz — NPC'ler ayrı veritabanı
                tablosunda duruyor. Yeni köyler tik tik kurulur, sunucu
                açık kalır.
              </div>

              {sifirSonuc ? (
                <div style={{
                  padding: '8px 10px', borderRadius: 5,
                  background: 'rgba(12,28,20,0.8)', border: `1px solid ${C.lineSoft}`,
                  fontFamily: FONT.ui, fontSize: 11, color: C.frost, lineHeight: 1.5,
                }}>
                  Sıfırlandı · <b>{sifirSonuc.kaldirilan}</b> köy kaldırıldı,{' '}
                  <b>{sifirSonuc.kuyrukta}</b> yeni köy kuruluyor.
                </div>
              ) : sifirla === 'soru' ? (
                <>
                  <div style={{
                    padding: '8px 10px', borderRadius: 5, marginBottom: 8,
                    background: 'rgba(58,14,20,0.8)', border: `1px solid ${C.dangerDim}`,
                    fontFamily: FONT.ui, fontSize: 11, color: '#f0b8bd', lineHeight: 1.5,
                  }}>
                    <b>{ist?.dunya?.npc ?? '?'} NPC köyü silinecek.</b> Orduları,
                    binaları, kaynakları geri gelmez. Emin misin?
                  </div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button type="button" onClick={() => setSifirla(null)}
                      style={{ ...btn('ghost', { padding: '7px 12px', fontSize: 10 }), flex: 1 }}>
                      VAZGEÇ
                    </button>
                    <button type="button" onClick={npcSifirla}
                      style={{ ...btn('danger', { padding: '7px 12px', fontSize: 10 }), flex: 1 }}>
                      EVET, SIFIRLA
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" disabled={sifirla === 'calisiyor'}
                  onClick={() => setSifirla('soru')}
                  style={{
                    ...btn('ghost', { padding: '7px 12px', fontSize: 10 }),
                    color: '#f0b8bd', borderColor: C.dangerDim,
                    opacity: sifirla === 'calisiyor' ? 0.6 : 1,
                  }}>
                  {sifirla === 'calisiyor' ? 'SIFIRLANIYOR…' : 'SIFIRLA'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
