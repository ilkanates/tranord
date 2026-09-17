/**
 * AÇIK ARTIRMA — kahraman eşyalarının pazarı.
 *
 * İlkan: *"kahramanlar itemlerini satabilmeli gümüş karşılığında…
 * her satış 24 saat açık artırmada dursun, fazla parayı veren alsın."*
 *
 * KAHRAMAN EKRANININ İÇİNDE, üst barda ayrı bir sekme değil: satılan
 * şey kahramanın eşyası ve satarken çantana bakman gerekiyor. Ayrı
 * ekran olsaydı "hangi eşyamı satayım" sorusu için sürekli gidip
 * gelmek gerekirdi.
 *
 * SÜRE GERÇEK ZAMANDA. Oyunun geri kalanı oyun saatiyle akıyor ama
 * açık artırma bir PAZAR: insanların görüp teklif verebilmesi gerekiyor.
 * Dünya 10× hızdayken 24 oyun saati 2,4 gerçek saat eder ve günde bir
 * giren oyuncu hiçbir ilanı göremezdi.
 */
import { useEffect, useMemo, useState } from 'react';
import { C, FONT, btn, label as lbl, num, panel } from '../theme';
import Icon from './Icons';
import { Sikke } from './KesePanel';

const HATA = {
  kahraman_yok: 'Önce bir kahramanın olmalı.',
  esya_yok: 'Eşya bulunamadı.',
  bitti: 'Bu açık artırma bitti.',
  kendi_ilanin: 'Kendi ilanına teklif veremezsin.',
  zaten_ondesin: 'En yüksek teklif zaten senin.',
  teklif_dusuk: 'Teklifin en az artıştan düşük.',
  yetersiz: 'Gümüşün yetmiyor.',
  gecildin: 'Sen yazarken biri daha yüksek teklif verdi.',
  kayit_hatasi: 'Kaydedilemedi, tekrar dene.',
  ilan_yok: 'İlan bulunamadı.',
};

/** Kalan süre — gün/saat/dakika, saniyeye inince saniye */
function kalanMetni(sn) {
  if (sn <= 0) return 'bitti';
  const g = Math.floor(sn / 86400);
  const s = Math.floor((sn % 86400) / 3600);
  const d = Math.floor((sn % 3600) / 60);
  if (g > 0) return `${g}g ${s}sa`;
  if (s > 0) return `${s}sa ${d}dk`;
  if (d > 0) return `${d}dk`;
  return `${sn}sn`;
}

function Satir({ ilan, gumus, onTeklif, secili, onSec }) {
  /*
    KUTUNUN DEĞERİ TÜRETİLİYOR, kopyalanmıyor.

    Durumda tutup etkiyle eşitleseydik (önceki hâli buydu) her paket
    gelişinde bir fazladan render olurdu ve oyuncunun yazdığı sayı,
    teklif değişince sessizce silinirdi. `null` = "dokunmadım",
    o zaman en az teklif gösteriliyor.

    YENİ TEKLİF GELİNCE yazılan değer korunuyor ama alt sınır yükseliyor;
    düğme kendiliğinden kapanıyor ve oyuncu neden kapandığını satırda
    okuyor.
  */
  const [yazilan, setYazilan] = useState(null);
  const tutar = yazilan ?? ilan.enAzTeklif;
  const setTutar = setYazilan;

  const yetmiyor = gumus < tutar;
  const kapali = ilan.benimIlanim || ilan.ondeyim || ilan.bitti;
  const acil = ilan.kalanSn > 0 && ilan.kalanSn < 3600;

  return (
    <div style={panel({
      padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: 6,
      borderColor: secili ? C.lineBright : C.lineSoft,
    })}>
      <div onClick={onSec} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <Icon name="migfer" size={15} color={ilan.renk || C.iceSoft} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT.ui, fontSize: 11, color: C.frost,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {ilan.ad || ilan.key}
            {ilan.seviye > 1 && (
              <span style={{ color: C.gold, marginLeft: 5 }}>Lvl {ilan.seviye}</span>
            )}
          </div>
          <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute }}>
            {ilan.satici} · taban {ilan.taban.toLocaleString('tr')}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={num({ fontSize: 13, color: ilan.teklif ? C.iceSoft : C.textMute })}>
            {(ilan.teklif || ilan.taban).toLocaleString('tr')}
          </div>
          <div style={{
            fontFamily: FONT.ui, fontSize: 8.5,
            color: acil ? C.warn : C.textMute,
          }}>{kalanMetni(ilan.kalanSn)}</div>
        </div>
      </div>

      {secili && (
        <>
          {/*
            DURUM SATIRI — neden teklif veremediğini yazıyor. Sessiz
            kapalı bir düğme oyuncuyu tahmine zorlardı.
          */}
          {kapali ? (
            <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: ilan.ondeyim ? C.good : C.textFaint }}>
              {ilan.benimIlanim ? 'Kendi ilanın — teklif veremezsin.'
                : ilan.ondeyim ? 'En yüksek teklif senin.'
                  : 'Bu açık artırma bitti.'}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" min={ilan.enAzTeklif} value={tutar}
                onChange={(e) => setTutar(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                style={{
                  width: 96, padding: '5px 7px', borderRadius: 5,
                  background: 'rgba(6,12,20,0.7)', border: `1px solid ${C.line}`,
                  color: C.text, fontFamily: FONT.num, fontSize: 11, outline: 'none',
                }} />
              <button type="button"
                disabled={yetmiyor || tutar < ilan.enAzTeklif}
                onClick={() => onTeklif(ilan.id, tutar)}
                style={btn(!yetmiyor && tutar >= ilan.enAzTeklif ? 'primary' : 'ghost', {
                  padding: '6px 10px', fontSize: 9.5, letterSpacing: 1,
                  opacity: !yetmiyor && tutar >= ilan.enAzTeklif ? 1 : 0.55,
                })}>TEKLİF VER</button>
              <span style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute }}>
                {yetmiyor ? 'gümüşün yetmiyor' : `en az ${ilan.enAzTeklif.toLocaleString('tr')}`}
              </span>
            </div>
          )}
          <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute, lineHeight: 1.45 }}>
            Teklif verince gümüşün bloke olur; biri seni geçerse anında geri döner.
            Son 10 dakikada gelen teklif süreyi uzatır.
          </div>
        </>
      )}
    </div>
  );
}

export default function AcikArtirma({ socket, kese, envanter = [] }) {
  const [ilanlar, setIlanlar] = useState([]);
  const [sureSaat, setSureSaat] = useState(24);
  const [secili, setSecili] = useState(null);
  const [mesaj, setMesaj] = useState(null);
  const [satilacak, setSatilacak] = useState(null);

  const gumus = kese?.gumus || 0;

  /* Satılabilir eşyalar — kuşanılan zaten envanterde değil */
  const satilabilir = useMemo(
    () => envanter.filter(e => !e.kullanilir), [envanter]);

  useEffect(() => {
    if (!socket) return;
    const liste = (d) => { setIlanlar(d?.ilanlar || []); setSureSaat(d?.sureSaat || 24); };
    const sonuc = (d) => {
      if (d?.ok) {
        setMesaj({ iyi: true, metin: d.islem === 'sat'
          ? `Eşyan satışa çıktı. Kimse teklif vermezse ${d.taban.toLocaleString('tr')} gümüşü yine alacaksın.`
          : d.uzadi
            ? 'Teklifin geçti — son dakika olduğu için süre uzadı.'
            : 'Teklifin geçti.' });
        setSatilacak(null);
      } else {
        setMesaj({ iyi: false, metin: HATA[d?.sebep] || 'İşlem yapılamadı.' });
      }
      socket.emit('artirma_liste');
    };
    const degisti = () => socket.emit('artirma_liste');

    socket.on('artirma_listesi', liste);
    socket.on('artirma_sonuc', sonuc);
    socket.on('artirma_degisti', degisti);
    socket.emit('artirma_liste');
    /*
      SÜRE AKIYOR — sayaçlar yalnız paket geldiğinde değil, saniyede bir
      tazelensin diye periyodik istek. On saniyede bir yeterli: kalan
      süre dakika biriminde gösteriliyor, saniye saniye yenilemek
      gereksiz ağ trafiği olurdu.
    */
    const t = setInterval(() => socket.emit('artirma_liste'), 10000);
    return () => {
      clearInterval(t);
      socket.off('artirma_listesi', liste);
      socket.off('artirma_sonuc', sonuc);
      socket.off('artirma_degisti', degisti);
    };
  }, [socket]);

  const sat = () => {
    if (satilacak == null) return;
    setMesaj(null);
    socket?.emit('artirma_sat', { indeks: satilacak });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* ── Satışa koy ── */}
      <div style={panel({ padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 7 })}>
        <div style={lbl({ fontSize: 8, letterSpacing: 1.3 })}>EŞYANI SATIŞA KOY</div>
        {satilabilir.length === 0 ? (
          <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute }}>
            Çantanda satılacak eşya yok. Kuşandığın eşyayı satmak için önce çıkar.
          </div>
        ) : (
          <>
            <select value={satilacak ?? ''}
              onChange={(e) => { setSatilacak(e.target.value === '' ? null : Number(e.target.value)); setMesaj(null); }}
              style={{
                width: '100%', padding: '6px 8px', borderRadius: 5,
                background: 'rgba(4,9,15,0.75)', border: `1px solid ${C.lineSoft}`,
                color: C.frost, fontFamily: FONT.ui, fontSize: 10.5, outline: 'none',
              }}>
              <option value="">Eşya seç…</option>
              {satilabilir.map(e => (
                <option key={e.indeks} value={e.indeks}>
                  {e.ad}{e.seviye > 1 ? ` · Lvl ${e.seviye}` : ''} — taban {e.tabanFiyat}
                </option>
              ))}
            </select>
            {/*
              TABAN GARANTİ OLDUĞU AÇIKÇA YAZILIYOR (İlkan'ın kuralı):
              oyuncu "satılmazsa boşa mı gitti" diye düşünmemeli.
            */}
            <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute, lineHeight: 1.45 }}>
              İlan {sureSaat} saat açık kalır. Kimse teklif vermezse eşya NPC'ye satılır
              ve taban fiyatı yine sen alırsın — hiçbir satış boşa gitmez.
            </div>
            <button type="button" disabled={satilacak == null} onClick={sat}
              style={btn(satilacak != null ? 'primary' : 'ghost', {
                padding: '7px 10px', fontSize: 9.5, letterSpacing: 1.1,
                opacity: satilacak != null ? 1 : 0.55,
              })}>SATIŞA KOY</button>
          </>
        )}
      </div>

      {mesaj && (
        <div style={{
          fontFamily: FONT.ui, fontSize: 9.5, lineHeight: 1.5,
          color: mesaj.iyi ? C.good : C.danger,
          background: mesaj.iyi ? 'rgba(127,224,77,0.08)' : 'rgba(255,111,120,0.08)',
          border: `1px solid ${mesaj.iyi ? C.good : C.dangerDim}`,
          borderRadius: 5, padding: '6px 8px',
        }}>{mesaj.metin}</div>
      )}

      {/* ── Açık ilanlar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={lbl({ fontSize: 8, letterSpacing: 1.3 })}>AÇIK İLANLAR</span>
        <span style={{ flex: 1, height: 1, background: C.lineSoft }} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {/* Sikke görseli tek kaynaktan (paraArt) — üst bardaki rozetle aynı */}
          <Sikke tur="gumus" size={15} />
          <span style={num({ fontSize: 12, color: C.frost })}>{gumus.toLocaleString('tr')}</span>
        </span>
      </div>

      {ilanlar.length === 0 ? (
        <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute, lineHeight: 1.5 }}>
          Şu an açık ilan yok. İlk satan sen olabilirsin.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ilanlar.map(i => (
            <Satir key={i.id} ilan={i} gumus={gumus} secili={secili === i.id}
              onSec={() => { setSecili(secili === i.id ? null : i.id); setMesaj(null); }}
              onTeklif={(id, tutar) => { setMesaj(null); socket?.emit('artirma_teklif', { id, miktar: tutar }); }} />
          ))}
        </div>
      )}
    </div>
  );
}
