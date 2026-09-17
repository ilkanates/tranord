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
import { RES_LABEL } from '../flows';
import Icon from './Icons';

const HATA = {
  yetersiz: 'Bakiyen yetmiyor.',
  miktar_sifir: 'Miktar sıfır olamaz.',
  miktar_az: 'Bir altın almaya yetmiyor.',
  gecersiz_yon: 'Geçersiz çevirme yönü.',
  gecersiz_kaynak: 'Bu kaynak altınla alınamıyor.',
  gecersiz_para: 'Geçersiz para birimi.',
  depo_dolu: 'Deponda bu kadar yer yok.',
};

/** Üst bardaki bakiye rozeti — hem gösteriyor hem pencereyi açıyor */
export function KeseRozet({ kese, onAc, dar = false, tap = 36 }) {
  if (!kese) return null;
  return (
    <button type="button" onClick={onAc} title="Kese — gümüş ve altın"
      style={{
        height: tap - 8, display: 'flex', alignItems: 'center', gap: 7,
        background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px',
      }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Icon name="sikke" size={13} color={C.iceSoft} />
        {!dar && (
          <span style={{ fontFamily: FONT.num, fontSize: 11, color: C.frost }}>
            {(kese.gumus || 0).toLocaleString('tr')}
          </span>
        )}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Icon name="sikke" size={13} color={C.gold} />
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
function Bakiye({ ad, deger, renk, aciklama }) {
  return (
    <div style={{
      flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3,
      padding: '9px 11px', borderRadius: 6,
      background: 'rgba(6,12,20,0.6)', border: `1px solid ${C.lineSoft}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Icon name="sikke" size={13} color={renk} />
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
  const [sekme, setSekme] = useState('cevir');
  const [altinAdet, setAltinAdet] = useState(1);
  const [gumusAdet, setGumusAdet] = useState(150);
  const [kaynak, setKaynak] = useState('odun');
  const [hamAdet, setHamAdet] = useState(1);
  const [mesaj, setMesaj] = useState(null);

  /*
    SUNUCUNUN CEVABI BEKLENİYOR. İyimser güncelleme yapsaydık reddedilen
    bir işlemde ekrandaki bakiye bir an doğru, sonra yanlış görünürdü —
    para söz konusuyken bu kabul edilemez. Bakiye yalnız pakette değişir.
  */
  useEffect(() => {
    if (!socket) return;
    const gelen = (d) => {
      if (d?.ok) {
        setMesaj({ iyi: true, metin: d.islem === 'hammadde'
          ? `${d.miktar.toLocaleString('tr')} ${RES_LABEL[d.kaynak] || d.kaynak} deponuza eklendi.`
          : ozetMetni(d) });
      } else {
        setMesaj({ iyi: false, metin: HATA[d?.sebep] || 'İşlem yapılamadı.' });
      }
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
  const paket = kese.altinHammadde || 1000;
  const kaynaklar = kese.hammaddeler || ['odun', 'kil', 'tas', 'demir', 'tahil'];

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
            <Bakiye ad="GÜMÜŞ" deger={gumus} renk={C.iceSoft}
              aciklama="Kahramanın parası. Asıl kaynağı macera." />
            <Bakiye ad="ALTIN" deger={altin} renk={C.gold}
              aciklama="Hesabın parası. Hammaddeye ve gümüşe çevrilir." />
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            {[['cevir', 'ÇEVİR'], ['hammadde', 'HAMMADDE AL']].map(([k, ad]) => (
              <button key={k} type="button" onClick={() => { setSekme(k); setMesaj(null); }}
                style={btn(sekme === k ? 'primary' : 'ghost', {
                  flex: 1, padding: '6px 8px', fontSize: 9, letterSpacing: 1.1,
                })}>{ad}</button>
            ))}
          </div>

          {sekme === 'cevir' && (
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
          )}

          {sekme === 'hammadde' && (
            <div style={panel({ padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 8 })}>
              <div style={lbl({ fontSize: 8, letterSpacing: 1.3 })}>
                1 ALTIN = {paket.toLocaleString('tr')} BİRİM
              </div>
              <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute, lineHeight: 1.45 }}>
                Hangi kaynağı seçersen seç aynı miktar gelir — kaynaklar arasında kur farkı yok.
                Mal <b style={{ color: C.textFaint }}>bulunduğun köye</b> iner; depon taşıyorsa alım yapılmaz.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {kaynaklar.map(k => (
                  <button key={k} type="button" onClick={() => { setKaynak(k); setMesaj(null); }}
                    style={btn(kaynak === k ? 'primary' : 'ghost', {
                      padding: '5px 9px', fontSize: 9, letterSpacing: 0.6,
                    })}>{RES_LABEL[k] || k}</button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <input type="number" min="1" value={hamAdet}
                  onChange={(e) => setHamAdet(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                  style={girdi} />
                <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textFaint }}>
                  altın → {(hamAdet * paket).toLocaleString('tr')} {RES_LABEL[kaynak] || kaynak}
                </span>
              </div>
              <button type="button" disabled={altin < hamAdet}
                onClick={() => yolla('kese_hammadde', { kaynak, adet: hamAdet })}
                style={btn(altin >= hamAdet ? 'primary' : 'ghost', {
                  padding: '7px 10px', fontSize: 9.5, letterSpacing: 1.1,
                  opacity: altin >= hamAdet ? 1 : 0.55,
                })}>SATIN AL</button>
            </div>
          )}

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
