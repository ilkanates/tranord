/**
 * KESE — gümüş ve altın cüzdanı.
 *
 * İlkan: *"bunun için bir binaya gerek yok, kendi menüsü olsun
 * yukarıda."*
 *
 * ÜST BARDA SEKME DEĞİL, ROZET. Sekme yapsaydık on ikinci sekme olurdu
 * (şerit on birde zaten taşıyordu) ve bakiyeyi görmek için her seferinde
 * ekran değiştirmek gerekirdi. Oysa bakiye SÜREKLİ görünmesi gereken bir
 * sayı: rozet hem bakiyeyi yazıyor hem de pencereyi açıyor.
 *
 * KURLAR SUNUCUDAN GELİYOR (`kese.altinGumus` vb.), burada sabit yok:
 * kur iki yerde dursaydı biri değişince ekran yalan söylerdi.
 */
import { useEffect, useState } from 'react';
import { C, FONT, btn, label as lbl, num, panel } from '../theme';
import Icon from './Icons';
import { PARA_GORSEL } from './paraArt';

const HATA = {
  yetersiz: 'Bakiyen yetmiyor.',
  miktar_sifir: 'Miktar sıfır olamaz.',
  miktar_az: 'Bir altın almaya yetmiyor.',
  gecersiz_yon: 'Geçersiz çevirme yönü.',
  gecersiz_para: 'Geçersiz para birimi.',
};

/**
 * SİKKE — üretilmiş görsel, yoksa çizgi ikon.
 *
 * Çizgi ikon iki parayı yalnız RENKLE ayırıyordu; renk oyunun her
 * yerinde başka anlamlar taşıyor (nadirlik, ilişki, uyarı) ve renk körü
 * bir oyuncu için ikisi aynı daireydi. Görsel ikisini ŞEKİLDEN ayırıyor.
 */
export function Sikke({ tur, size = 16 }) {
  const src = PARA_GORSEL[tur];
  if (!src) return <Icon name="sikke" size={size} color={tur === 'altin' ? C.gold : C.iceSoft} />;
  return (
    <img src={src} alt="" style={{
      width: size, height: size, borderRadius: '50%', objectFit: 'cover',
      flexShrink: 0, display: 'block',
    }} />
  );
}

/** Üst bardaki bakiye rozeti — hem gösteriyor hem pencereyi açıyor */
export function KeseRozet({ kese, onAc, dar = false, tap = 36 }) {
  if (!kese) return null;
  return (
    <button type="button" onClick={onAc} title="Kese — gümüş ve altın"
      style={{
        height: tap - 8, display: 'flex', alignItems: 'center', gap: 7,
        background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px',
      }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Sikke tur="gumus" size={17} />
        {!dar && (
          <span style={{ fontFamily: FONT.num, fontSize: 11, color: C.frost }}>
            {(kese.gumus || 0).toLocaleString('tr')}
          </span>
        )}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Sikke tur="altin" size={17} />
        {!dar && (
          <span style={{ fontFamily: FONT.num, fontSize: 11, color: C.goldSoft }}>
            {(kese.altin || 0).toLocaleString('tr')}
          </span>
        )}
      </span>
    </button>
  );
}

/** Tek bakiye satırı — pencerenin tepesinde iki tane yan yana */
function Bakiye({ ad, tur, deger, renk, aciklama }) {
  return (
    <div style={{
      flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3,
      padding: '9px 11px', borderRadius: 6,
      background: 'rgba(6,12,20,0.6)', border: `1px solid ${C.lineSoft}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Sikke tur={tur} size={20} />
        <span style={lbl({ fontSize: 8, letterSpacing: 1.3 })}>{ad}</span>
      </div>
      <div style={num({ fontSize: 19, color: renk })}>{deger.toLocaleString('tr')}</div>
      <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute, lineHeight: 1.4 }}>
        {aciklama}
      </div>
    </div>
  );
}

export default function KesePanel({ socket, kese, onClose }) {
  const [altinAdet, setAltinAdet] = useState(1);
  const [gumusAdet, setGumusAdet] = useState(150);
  const [mesaj, setMesaj] = useState(null);

  /*
    SUNUCUNUN CEVABI BEKLENİYOR. İyimser güncelleme yapsaydık reddedilen
    bir işlemde ekrandaki bakiye bir an doğru, sonra yanlış görünürdü —
    para söz konusuyken bu kabul edilemez. Bakiye yalnız pakette değişir.
  */
  useEffect(() => {
    if (!socket) return;
    const gelen = (d) => {
      if (d?.ok) setMesaj({ iyi: true, metin: ozetMetni(d) });
      else setMesaj({ iyi: false, metin: HATA[d?.sebep] || 'İşlem yapılamadı.' });
    };
    socket.on('kese_sonuc', gelen);
    return () => socket.off('kese_sonuc', gelen);
  }, [socket]);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  if (!kese) return null;

  const gumus = kese.gumus || 0;
  const altin = kese.altin || 0;
  const kurAG = kese.altinGumus || 100;
  const kurGA = kese.gumusAltin || 150;

  /* Gümüşten altına çevirirken artık gümüş kesede kalıyor — sunucu da böyle */
  const alinacakAltin = Math.floor(gumusAdet / kurGA);

  const yolla = (olay, veri) => { setMesaj(null); socket?.emit(olay, veri); };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9400,
      width: 'var(--tn-vw)', height: 'var(--tn-vh)',
      background: 'rgba(4,8,13,0.72)', display: 'grid', placeItems: 'center', padding: 14,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(460px, 100%)', maxHeight: 'calc(var(--tn-vh) * 0.86)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: C.panelSolid, border: `1px solid ${C.lineBright}`,
        borderRadius: 9, boxShadow: '0 16px 50px rgba(0,0,0,0.6)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', borderBottom: `1px solid ${C.lineSoft}`,
        }}>
          <Icon name="sikke" size={15} color={C.gold} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.head, fontSize: 15, color: C.frost }}>Kese</div>
            <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint }}>
              Hesabına ait — köy değiştirince değişmez
            </div>
          </div>
          <button type="button" onClick={onClose} title="Kapat (Esc)" style={{
            background: 'none', border: `1px solid ${C.lineSoft}`, borderRadius: 5,
            color: C.textMute, cursor: 'pointer', width: 24, height: 24,
            fontFamily: FONT.ui, fontSize: 12, lineHeight: 1,
          }}>✕</button>
        </div>

        <div className="tn-scroll" style={{
          overflowY: 'auto', minHeight: 0, padding: 12,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Bakiye ad="GÜMÜŞ" tur="gumus" deger={gumus} renk={C.iceSoft}
              aciklama="Kahramanın parası. Asıl kaynağı macera." />
            <Bakiye ad="ALTIN" tur="altin" deger={altin} renk={C.gold}
              aciklama="Hesabın parası. Gümüşe çevrilir." />
          </div>

          {/*
            HAMMADDE SEKMESİ KALDIRILDI (İlkan: *"parayla hammadde
            alınamamalı"*). Altınla kaynak alınabilseydi oyun "para öde,
            kaynak al" hâline gelirdi. Kaynak dönüştürmenin yeri pazarın
            NPC takası; oranın kendisi zaten bir bedel.
          */}
          <>
              {/* ── Altın → Gümüş ── */}
              <div style={panel({ padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 7 })}>
                <div style={lbl({ fontSize: 8, letterSpacing: 1.3 })}>
                  ALTIN → GÜMÜŞ · 1 altın = {kurAG} gümüş
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <input type="number" min="1" value={altinAdet}
                    onChange={(e) => setAltinAdet(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                    style={girdi} />
                  <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textFaint }}>
                    → {(altinAdet * kurAG).toLocaleString('tr')} gümüş
                  </span>
                </div>
                <button type="button" disabled={altin < altinAdet}
                  onClick={() => yolla('kese_cevir', { yon: 'altinToGumus', adet: altinAdet })}
                  style={btn(altin >= altinAdet ? 'primary' : 'ghost', {
                    padding: '7px 10px', fontSize: 9.5, letterSpacing: 1.1,
                    opacity: altin >= altinAdet ? 1 : 0.55,
                  })}>ALTINI BOZDUR</button>
              </div>

              {/* ── Gümüş → Altın ── */}
              <div style={panel({ padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 7 })}>
                <div style={lbl({ fontSize: 8, letterSpacing: 1.3 })}>
                  GÜMÜŞ → ALTIN · {kurGA} gümüş = 1 altın
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <input type="number" min={kurGA} step={kurGA} value={gumusAdet}
                    onChange={(e) => setGumusAdet(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                    style={girdi} />
                  <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textFaint }}>
                    → {alinacakAltin} altın
                  </span>
                </div>
                {/*
                  MAKAS AÇIKÇA YAZILIYOR. Geri dönüşün pahalı olduğunu
                  oyuncu işlemden SONRA fark etseydi kandırılmış olurdu.
                */}
                <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute, lineHeight: 1.45 }}>
                  Geri dönüş pahalı: 1 altın {kurAG} gümüş eder ama {kurGA} gümüşe mal olur.
                  Artan gümüş kesende kalır.
                </div>
                <button type="button" disabled={alinacakAltin < 1 || gumus < alinacakAltin * kurGA}
                  onClick={() => yolla('kese_cevir', { yon: 'gumusToAltin', adet: gumusAdet })}
                  style={btn(alinacakAltin >= 1 && gumus >= alinacakAltin * kurGA ? 'primary' : 'ghost', {
                    padding: '7px 10px', fontSize: 9.5, letterSpacing: 1.1,
                    opacity: alinacakAltin >= 1 && gumus >= alinacakAltin * kurGA ? 1 : 0.55,
                  })}>GÜMÜŞÜ ALTINA ÇEVİR</button>
              </div>
          </>

          {/*
            HAMMADDE PAZARDAN ALINIYOR — kese oraya yönlendiriyor.
            Oyuncu altını olunca "kaynak da alabilirim" diye
            düşünebilir; nereye bakacağını söylemek, sessiz bir
            eksiklikten iyidir.
          */}
          <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute, lineHeight: 1.5 }}>
            Hammadde altınla alınmıyor. Kaynağını dönüştürmek istiyorsan
            <b style={{ color: C.textFaint }}> Pazar › NPC TAKASI</b> — orada her
            kaynağı her kaynağa çevirebilirsin.
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
        </div>
      </div>
    </div>
  );
}

const girdi = {
  width: 92, padding: '6px 8px', borderRadius: 5,
  background: 'rgba(6,12,20,0.7)', border: `1px solid ${C.line}`,
  color: C.text, fontFamily: FONT.num, fontSize: 11, outline: 'none',
};

function ozetMetni(d) {
  const yaz = (o) => Object.entries(o || {})
    .map(([k, n]) => `${n.toLocaleString('tr')} ${k === 'altin' ? 'altın' : 'gümüş'}`).join(', ');
  return `${yaz(d.verilen)} verildi, ${yaz(d.alinan)} alındı.`;
}
