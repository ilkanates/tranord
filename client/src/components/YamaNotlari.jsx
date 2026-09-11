/**
 * YAMA NOTLARI PANELİ — sol kenarda yüzen kart.
 *
 * Yalnızca OKUNMAMIŞ notları gösterir. Çarpıya basınca o an ekranda duran
 * notlar "okundu" işaretlenir ve bir daha ASLA gelmez; sonraki yamada sadece
 * YENİ notlar çıkar. Okunmamış not kalmadıysa panel hiç açılmaz.
 *
 * KONUM: sol ray (kaynak çubuğu) ÜZERİNDE. Kasıtlı — yama notu bir kez
 * okunup kapatılan bir şey, kalıcı yer kaplaması gerekmiyor. Kapatılınca
 * kaynak çubuğu olduğu gibi geri geliyor.
 *
 * `hepsi` ileride üst menüdeki düğme için: okundu durumunu yok sayıp
 * geçmişin tamamını gösterir.
 */
import { gosterilecekBolumler, TUR_ETIKET } from '../data/yamaNotlari';
import { C, FONT } from '../theme';
import Icon from './Icons';

const TUR_RENK = {
  yenilik: C.gold,
  duzeltme: C.ice,
  denge: C.good,
};

export default function YamaNotlari({
  acik, onKapat, okunan, hepsi = false, mobile = false, railW = 186,
}) {
  if (!acik) return null;
  const bolumler = gosterilecekBolumler(okunan || new Set(), hepsi);
  if (!bolumler.length) return null;

  const notSayisi = bolumler.reduce((s, b) => s + b.notlar.length, 0);

  return (
    <div
      className="tn-rise"
      style={{
        position: 'fixed',
        left: 8,
        // Üst bardan sonra başla; telefonda kaynak çipleri de üstte duruyor
        top: mobile ? 180 : 52,
        width: mobile ? 'calc(100vw - 16px)' : Math.max(280, railW + 110),
        maxHeight: mobile ? 'calc(100dvh - 260px)' : 'calc(100dvh - 80px)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1100,
        background: 'linear-gradient(180deg, rgba(20,31,42,0.97) 0%, rgba(12,20,27,0.97) 100%)',
        border: `1px solid ${C.lineBright}`,
        borderRadius: 10,
        boxShadow: '0 18px 44px rgba(0,0,0,0.6), 0 0 0 1px rgba(143,220,255,0.06)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        overflow: 'hidden',
      }}
    >
      {/* Başlık */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 11px',
        borderBottom: `1px solid ${C.line}`,
        background: 'linear-gradient(180deg, rgba(143,220,255,0.07), transparent)',
        flexShrink: 0,
      }}>
        <Icon name="bilgi" size={14} color={C.iceDeep} />
        <span style={{
          fontFamily: FONT.ui, fontSize: 8.5, letterSpacing: 1.6,
          textTransform: 'uppercase', color: C.textFaint, flex: 1,
        }}>Yama Notları</span>
        {!hepsi && (
          <span style={{
            fontFamily: FONT.num, fontSize: 9, color: C.iceDeep,
            padding: '1px 6px', borderRadius: 8,
            border: `1px solid ${C.iceDeep}44`, background: `${C.iceDeep}14`,
          }}>{notSayisi} yeni</span>
        )}
        <button
          onClick={onKapat}
          title={hepsi ? 'Kapat' : 'Okudum — bu notlar bir daha gösterilmez'}
          style={{
            width: 22, height: 22, padding: 0, marginLeft: 2,
            display: 'grid', placeItems: 'center',
            borderRadius: 11, cursor: 'pointer', flexShrink: 0,
            background: 'rgba(8,14,24,0.75)', border: `1px solid ${C.line}`,
          }}
        >
          <Icon name="kapat" size={10} color={C.textDim} strokeWidth={2} />
        </button>
      </div>

      {/* Gövde — uzun listede İÇERİDE kayar, panel büyümez */}
      <div style={{ padding: '11px 12px 13px', overflowY: 'auto', minHeight: 0 }}>
        {bolumler.map((yama, bi) => (
          <div key={yama.surum} style={{ marginTop: bi ? 14 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 9 }}>
              <div style={{
                fontFamily: FONT.head, fontSize: 17, fontWeight: 600,
                letterSpacing: 0.4, color: C.frost, lineHeight: 1.25, flex: 1,
              }}>{yama.baslik}</div>
              <span style={{ fontFamily: FONT.num, fontSize: 9, color: C.textMute, whiteSpace: 'nowrap' }}>
                {yama.tarih}
              </span>
            </div>

            {yama.notlar.map((n) => (
              <div key={n.id} style={{ display: 'flex', gap: 8, marginBottom: 9 }}>
                <span style={{
                  flexShrink: 0, marginTop: 1,
                  fontFamily: FONT.ui, fontSize: 7.5, letterSpacing: 0.9,
                  padding: '2px 5px', borderRadius: 3,
                  color: TUR_RENK[n.tur] || C.textDim,
                  border: `1px solid ${TUR_RENK[n.tur] || C.line}55`,
                  background: `${TUR_RENK[n.tur] || C.line}14`,
                  whiteSpace: 'nowrap',
                }}>{TUR_ETIKET[n.tur] || '—'}</span>
                <span style={{
                  fontFamily: FONT.ui, fontSize: 10.5, lineHeight: 1.55,
                  color: C.textDim,
                }}>{n.metin}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
