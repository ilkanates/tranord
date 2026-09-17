/**
 * HAMMADDE GÖNDER — karşılıksız sevkiyat.
 *
 * İlkan: *"pazardan istediğime hammadde yollayabilmeliyim. oyuncu köy
 * ismi girerek ya da oyuncuda bularak yollayabilmeliyim"*.
 *
 * Pazar bugüne kadar YALNIZ TAKAS yapıyordu: birine bir şey vermek için
 * ondan karşılığında bir şey istemek ve onun da kabul etmesi
 * gerekiyordu. Müttefikini beslemek, yeni köyüne yardım etmek, bir borcu
 * ödemek — hiçbiri mümkün değildi.
 *
 * İKİ YERDEN AÇILIYOR, TEK BİLEŞEN:
 *   Pazar ekranı  → hedefi ARAYARAK seçiyorsun (köy adı ya da oyuncu adı)
 *   Harita        → köye tıklayınca hedef HAZIR geliyor
 *
 * İkisini ayrı yazsaydık tüccar hesabı, depo sınırı ve süre tahmini iki
 * yerde durur, biri düzeltilince diğeri eskirdi.
 */
import { useEffect, useMemo, useState } from 'react';
import { C, FONT, btn, label as lbl, num } from '../theme';
import { RES_LABEL } from '../flows';
import Icon from './Icons';

/** Pazarın takas ettiği kaynaklar — sunucudaki TAKAS_KAYNAKLARI ile aynı sıra */
const KAYNAKLAR = [
  'odun', 'kil', 'tas', 'demir', 'tahil',
  'kereste', 'tugla', 'yontmaTas', 'demirKulce',
];

/**
 * HEDEF ARAMA — köy adı ya da oyuncu adı.
 *
 * Dünya anlık görüntüsü zaten bütün köyleri (ad + sahip) taşıyor, o
 * yüzden arama tamamen istemcide: her tuşta sunucuya sormak, on bin
 * köylük bir dünyada gereksiz bir tur olurdu.
 *
 * NPC KÖYLERİ LİSTEDE YOK. Hediye yalnız oyuncu köylerine gidiyor
 * (sunucu da reddediyor); listede göstermek, seçilip reddedilen bir
 * seçenek sunmak olurdu.
 */
function useKoyler(socket) {
  const [koyler, setKoyler] = useState([]);
  useEffect(() => {
    if (!socket) return;
    const onSnap = (d) => {
      setKoyler((d?.villages || []).filter(v => v.kind === 'player' || v.kind === 'self'));
    };
    socket.on('world_snapshot', onSnap);
    socket.emit('request_world');
    return () => socket.off('world_snapshot', onSnap);
  }, [socket]);
  return koyler;
}

export default function HammaddeGonder({
  socket, resources = {}, pazar = null,
  /** Harita kısayolundan geliyorsa hedef hazır — arama kutusu gizleniyor */
  sabitHedef = null,
  onGonderildi,
}) {
  const koyler = useKoyler(socket);
  const [arama, setArama] = useState('');
  const [secili, setSecili] = useState(null);
  const [yuk, setYuk] = useState({});
  /*
    SUNUCUNUN CEVABI BEKLENİYOR.

    Panel eskiden isteği yollar yollamaz kapanıyordu. Sunucu reddederse
    (pazar yok, tüccar yok, hedef zaten bulunduğun köy) oyuncu hiçbir
    şey görmüyordu: düğmeye basıyor, panel kapanıyor, kaynak duruyor.
    İlkan tam olarak bunu bildirdi — *"tam tersini yapamıyorum"*.

    Sebep BURADA yazılıyor, ekranın tepesindeki genel şeritte değil:
    oyuncunun gözü düğmede, şeritte değil.
  */
  const [hata, setHata] = useState(null);
  const [bekliyor, setBekliyor] = useState(false);

  /*
    HEDEF TÜRETİLİYOR, kopyalanmıyor. Sabit hedefi duruma yazmak için bir
    etki gerekiyordu; etkiyle durum eşitlemek hem bir tur fazladan render
    hem de "hangisi doğru" sorusu demek. Sabit hedef varsa o kazanıyor.
  */
  const hedef = sabitHedef || secili;

  const sonuc = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr');
    if (!q) return koyler.slice(0, 8);
    return koyler.filter(v =>
      (v.name || '').toLocaleLowerCase('tr').includes(q)
      || (v.owner || '').toLocaleLowerCase('tr').includes(q)).slice(0, 12);
  }, [arama, koyler]);

  const toplam = Object.values(yuk).reduce((a, b) => a + (Number(b) || 0), 0);
  const kap = pazar?.tuccarKapasitesi || 2000;
  const gerekenTuccar = Math.ceil(toplam / kap);
  const bosTuccar = pazar?.tuccarBos ?? 0;
  /*
    PAZAR YOKSA SEBEP AÇIKÇA YAZILSIN. Pazarı olmayan köyde tüccar da
    sıfır olduğu için ekranda "1 tüccar gerekiyor, 0 boşta" yazıyordu:
    doğru ama yanıltıcı — oyuncu tüccar beklerken eksik olan binaydı.
  */
  const pazarVar = (pazar?.seviye || 0) >= 1;
  /*
    HEDEF KENDİ KÖYÜM OLAMAZ. Sunucu da reddediyor; burada da engellemek
    oyuncuyu boşuna reddedilen bir düğmeye bastırmamak için.
  */
  /*
    HEDEF, İÇİNDE DURDUĞUM KÖY OLAMAZ.

    Eskiden `hedef.kind === 'self' && hedef.key === pazar.slotKey`
    yazıyordu ama pazar özeti `slotKey` GÖNDERMİYORDU: karşılaştırma
    her zaman `undefined` ile yapılıyor, denetim hiç çalışmıyordu.
    Oyuncu bulunduğu köye "gönder" diyebiliyor, sunucu reddediyor,
    ekranda hiçbir şey olmuyordu. `kind` şartı da kalktı — kendi
    köylerimin hepsi zaten 'self', ayırt eden şey slot.
  */
  const kendim = !!pazar?.slotKey && hedef?.key === pazar.slotKey;
  const yeterliKaynak = Object.entries(yuk)
    .every(([k, n]) => (resources[k] || 0) >= (Number(n) || 0));
  const gecerli = pazarVar && !!hedef && !kendim && toplam > 0
    && gerekenTuccar <= bosTuccar && yeterliKaynak && !bekliyor;

  /*
    SUNUCUNUN CEVABI. Başarıda panel kapanıyor, rette sebep yazılıyor.
    `hedef` bağımlılıkta: kapanış geri çağrısına DOĞRU hedef gitsin.
  */
  useEffect(() => {
    if (!socket) return;
    const gelen = (d) => {
      setBekliyor(false);
      if (d?.ok) { setYuk({}); setHata(null); onGonderildi?.(hedef); }
      else setHata(d?.sebep || 'Gönderilemedi.');
    };
    socket.on('hammadde_sonuc', gelen);
    return () => socket.off('hammadde_sonuc', gelen);
  }, [socket, hedef, onGonderildi]);

  const ayarla = (k, n) => setYuk(y => {
    const v = Math.max(0, Math.floor(Number(n) || 0));
    const out = { ...y };
    if (v > 0) out[k] = v; else delete out[k];
    return out;
  });

  /*
    YÜKÜ BOŞALTMAK ve PANELİ KAPATMAK SUNUCUNUN CEVABINDA.

    Burada yapsaydık — eskiden öyleydi — reddedilen gönderide oyuncunun
    yazdığı sayılar da silinir, panel de kapanırdı: "bastım, hiçbir şey
    olmadı". Ret hâlâ görünmez olurdu, üstelik yazdıklarını yeniden
    yazmak zorunda kalırdı.
  */
  const gonder = () => {
    if (!gecerli) return;
    setHata(null);
    setBekliyor(true);
    socket?.emit('pazar_hammadde_gonder', { targetKey: hedef.key, kaynaklar: yuk });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {/* ── Hedef ── */}
      {!sabitHedef && (
        <div>
          <div style={lbl({ fontSize: 8, letterSpacing: 1, marginBottom: 4 })}>
            KİME GÖNDERİYORSUN
          </div>
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Köy adı ya da oyuncu adı yaz…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '7px 9px', borderRadius: 5,
              background: 'rgba(6,12,20,0.7)', border: `1px solid ${C.line}`,
              color: C.text, fontFamily: FONT.ui, fontSize: 10.5, outline: 'none',
            }} />

          <div className="tn-scroll" style={{
            marginTop: 5, maxHeight: 132, overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            {sonuc.length === 0 ? (
              <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, padding: '5px 2px' }}>
                {koyler.length === 0
                  ? 'Köy listesi yükleniyor…'
                  : 'Eşleşen köy yok — köy adını ya da oyuncu adını dene.'}
              </div>
            ) : sonuc.map(v => {
              const sec = hedef?.key === v.key;
              return (
                <button key={v.key} type="button" onClick={() => setSecili(v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
                    padding: '5px 8px', borderRadius: 4, textAlign: 'left',
                    background: sec ? 'rgba(143,220,255,0.12)' : 'rgba(8,14,24,0.5)',
                    border: `1px solid ${sec ? C.lineBright : C.line}`,
                  }}>
                  <Icon name="koy" size={11} color={v.kind === 'self' ? C.good : C.iceSoft} />
                  <span style={{
                    flex: 1, minWidth: 0, fontFamily: FONT.ui, fontSize: 10,
                    color: sec ? C.frost : C.textDim,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {v.name}
                    <span style={{ color: C.textMute }}>
                      {' · '}{v.kind === 'self' ? 'kendi köyüm' : (v.owner || 'oyuncu')}
                    </span>
                  </span>
                  {v.distance != null && (
                    <span style={num({ fontSize: 9, color: C.textMute })}>{v.distance} hex</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sabitHedef && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 9px', borderRadius: 5,
          background: 'rgba(8,14,24,0.6)', border: `1px solid ${C.line}`,
        }}>
          <Icon name="koy" size={12} color={C.iceSoft} />
          <span style={{ flex: 1, fontFamily: FONT.ui, fontSize: 10.5, color: C.frost }}>
            {sabitHedef.name}
            <span style={{ color: C.textMute }}>
              {' · '}{sabitHedef.owner || 'oyuncu'}
            </span>
          </span>
          {sabitHedef.distance != null && (
            <span style={num({ fontSize: 9.5, color: C.textMute })}>{sabitHedef.distance} hex</span>
          )}
        </div>
      )}

      {/* ── Yük ── */}
      <div>
        <div style={lbl({ fontSize: 8, letterSpacing: 1, marginBottom: 4 })}>NE GÖNDERİYORSUN</div>
        <div style={{
          display: 'grid', gap: 5,
          gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))',
        }}>
          {KAYNAKLAR.map(k => {
            const elde = Math.floor(resources[k] || 0);
            const deger = yuk[k] || '';
            const fazla = (Number(deger) || 0) > elde;
            return (
              <div key={k} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 6px', borderRadius: 4,
                background: 'rgba(8,14,24,0.5)',
                border: `1px solid ${fazla ? C.danger : C.line}`,
              }}>
                <span style={{
                  flex: 1, minWidth: 0, fontFamily: FONT.ui, fontSize: 9.5,
                  color: elde > 0 ? C.textDim : C.textMute,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }} title={`Elinde ${elde.toLocaleString('tr-TR')}`}>
                  {RES_LABEL[k] || k}
                </span>
                {/*
                  HEPSİ düğmesi: elindekinin tamamını yazıyor. Depoyu
                  boşaltmak sık yapılan bir şey (yeni köye yardım) ve
                  elle beş haneli sayı yazmak hataya davetiye.
                */}
                <button type="button" onClick={() => ayarla(k, elde)} disabled={elde <= 0}
                  title="Hepsini koy"
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    cursor: elde > 0 ? 'pointer' : 'default',
                    fontFamily: FONT.ui, fontSize: 8, letterSpacing: 0.5,
                    color: elde > 0 ? C.iceDeep : C.textMute,
                  }}>MAKS</button>
                <input
                  value={deger}
                  onChange={(e) => ayarla(k, e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric" placeholder="0"
                  style={{
                    width: 56, textAlign: 'right', padding: '3px 5px', borderRadius: 3,
                    background: 'rgba(4,9,15,0.8)', border: `1px solid ${C.line}`,
                    color: fazla ? C.danger : C.frost,
                    fontFamily: FONT.num, fontSize: 10, outline: 'none',
                  }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Özet ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap',
        padding: '7px 9px', borderRadius: 5,
        background: 'rgba(6,12,20,0.6)', border: `1px solid ${C.lineSoft || C.line}`,
      }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={lbl({ fontSize: 7.5 })}>TOPLAM YÜK</div>
          <div style={num({ fontSize: 14, color: toplam > 0 ? C.frost : C.textMute })}>
            {toplam.toLocaleString('tr-TR')}
          </div>
        </div>
        <div style={{ minWidth: 90 }}>
          <div style={lbl({ fontSize: 7.5 })}>TÜCCAR</div>
          <div style={num({
            fontSize: 14, color: gerekenTuccar > bosTuccar ? C.danger : C.good,
          })}>
            {gerekenTuccar}<span style={{ color: C.textMute }}> / {bosTuccar}</span>
          </div>
        </div>
      </div>

      {/*
        NEDEN BASILAMIYOR — sessiz kapalı düğme, oyuncuyu tahmine
        zorluyordu. Tek bir sebep yazılıyor: en yakındaki engel.
      */}
      {!gecerli && !bekliyor && (
        <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, lineHeight: 1.5 }}>
          {!pazarVar ? 'Bu köyde pazar yok — gönderi pazardan çıkar.'
            : !hedef ? 'Önce hedef köyü seç.'
              : kendim ? 'Zaten bu köydesin. Gönderecek köye geç.'
                : toplam <= 0 ? 'Ne kadar göndereceğini yaz.'
                  : !yeterliKaynak ? 'Elindekinden fazlasını yazdın.'
                    : `${gerekenTuccar} tüccar gerekiyor, ${bosTuccar} boşta.`}
        </div>
      )}

      {/*
        SUNUCUNUN REDDİ. Yukarıdaki satır düğmeye BASILMADAN önceki
        engeli anlatıyor; bu satır basıldıktan sonra sunucunun ne
        dediğini. İkisi ayrı: biri tahmin, öteki cevap.
      */}
      {hata && (
        <div style={{
          fontFamily: FONT.ui, fontSize: 9.5, lineHeight: 1.5,
          color: C.danger,
          background: 'rgba(255,111,120,0.08)',
          border: `1px solid ${C.dangerDim}`,
          borderRadius: 5, padding: '6px 8px',
        }}>{hata}</div>
      )}

      <button type="button" onClick={gonder} disabled={!gecerli}
        style={btn(gecerli ? 'primary' : 'ghost', {
          padding: '8px 12px', fontSize: 10, letterSpacing: 1.2,
          opacity: gecerli ? 1 : 0.55,
        })}>
        {bekliyor ? 'GÖNDERİLİYOR…' : 'GÖNDER'}
      </button>

      <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint, lineHeight: 1.55 }}>
        Karşılıksız gönderi — geri alınamaz. Tüccarlar yürüyerek gidip
        dönüyor; dönene kadar başka işte kullanılamıyorlar, yani uzak
        müttefike yardım yakına yardımdan pahalı.
      </div>
    </div>
  );
}
