/**
 * BİRLİK GÜNLÜĞÜ — birliğin hafızası.
 *
 * Travian'ın ittifak günlüğünün karşılığı. "Neden atıldım", "bu savaşı
 * kim ilan etti", "kim ne zaman katıldı" sorularının tek cevabı burası;
 * bunlar olmadan birliğin içindeki her tartışma hafızaya dayanıyordu.
 *
 * KAYITLAR İSTENDİĞİNDE ÇEKİLİYOR, pakette taşınmıyor: yüzlerce satırı
 * saniyede birkaç kez yollamanın anlamı yok, ekran açılınca bir kez
 * isteniyor (birlik listesi ve istatistikler de aynı desende).
 *
 * METİN SUNUCUDA ÜRETİLİYOR. Burada yalnız çiziliyor — istemcinin
 * yazdığı bir metni günlüğe koymak, oyuncuya birliğin geçmişini
 * yazdırmak olurdu.
 */
import { useEffect, useState } from 'react';
import { C, FONT, btn, label as lbl, num } from '../theme';
import Icon from './Icons';

/*
  TÜRE GÖRE RENK VE İKON. Günlük düz bir metin listesi olsaydı "savaş
  ilan edildi" satırı "açıklama güncellendi" satırıyla aynı ağırlıkta
  görünürdü; oysa biri birliğin kaderi, öteki bir yazım düzeltmesi.
*/
const TUR_BICIM = {
  kuruldu: { renk: '#7fe04d', ikon: 'kilicKalkan' },
  katildi: { renk: '#7fe04d', ikon: 'ekle' },
  ayrildi: { renk: '#f2bb60', ikon: 'cikis' },
  atildi: { renk: '#ff6f78', ikon: 'cikis' },
  jarl_oldu: { renk: '#8fdcff', ikon: 'kupa' },
  jarl_indi: { renk: '#f2bb60', ikon: 'kupa' },
  ad_degisti: { renk: '#8fdcff', ikon: 'kitap' },
  profil_degisti: { renk: '#8fdcff', ikon: 'kitap' },
  diplomasi_teklif: { renk: '#8fdcff', ikon: 'parsomen' },
  diplomasi_kabul: { renk: '#7fe04d', ikon: 'parsomen' },
  diplomasi_red: { renk: '#f2bb60', ikon: 'parsomen' },
  diplomasi_bitti: { renk: '#f2bb60', ikon: 'parsomen' },
  savas_ilan: { renk: '#ff6f78', ikon: 'kilic' },
};
const VARSAYILAN = { renk: C.textMute, ikon: 'bilgi' };

function fmtZaman(at) {
  if (!at) return '';
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  const hm = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const bugun = d.toDateString() === new Date().toDateString();
  return bugun ? hm
    : `${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} ${hm}`;
}

export default function BirlikGunluk({ socket }) {
  const [kayitlar, setKayitlar] = useState(null);   // null = henüz gelmedi

  useEffect(() => {
    if (!socket) return undefined;
    const al = (d) => setKayitlar(d?.kayitlar || []);
    socket.on('birlik_gunluk', al);
    socket.emit('birlik_gunluk');
    return () => socket.off('birlik_gunluk', al);
  }, [socket]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={lbl({ fontSize: 8 })}>Günlük</span>
        <span style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint }}>
          son {kayitlar?.length || 0} kayıt
        </span>
        <button type="button" onClick={() => socket?.emit('birlik_gunluk')}
          style={btn('ghost', { marginLeft: 'auto', fontSize: 8.5, padding: '2px 9px' })}>
          YENİLE
        </button>
      </div>

      {kayitlar === null ? (
        <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute }}>
          Yükleniyor…
        </div>
      ) : kayitlar.length === 0 ? (
        <div style={{
          fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute, lineHeight: 1.6,
        }}>
          Henüz kayıt yok. Katılan, ayrılan, terfi eden ve diplomasi hamleleri
          buraya yazılır.
        </div>
      ) : (
        <div className="tn-scroll" style={{
          display: 'flex', flexDirection: 'column', gap: 3,
          maxHeight: 280, overflowY: 'auto', paddingRight: 2,
        }}>
          {kayitlar.map((k) => {
            const b = TUR_BICIM[k.tur] || VARSAYILAN;
            return (
              <div key={k.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 7,
                padding: '5px 8px', borderRadius: 4,
                background: 'rgba(8,17,28,0.5)',
                borderLeft: `2px solid ${b.renk}66`,
              }}>
                <div style={{ paddingTop: 1, flexShrink: 0 }}>
                  <Icon name={b.ikon} size={11} color={b.renk} />
                </div>
                <div style={{
                  flex: 1, minWidth: 0,
                  fontFamily: FONT.ui, fontSize: 9.5, lineHeight: 1.5, color: C.textDim,
                }}>{k.metin}</div>
                <span style={num({
                  fontSize: 8, color: C.textFaint, flexShrink: 0, paddingTop: 2,
                })}>{fmtZaman(k.at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
