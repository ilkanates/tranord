/**
 * YAMA NOTLARI PANELİ — sol kenarda yüzen kart.
 *
 * Oyun açılınca, oyuncu o sürümü daha önce kapatmadıysa görünür. Çarpıya
 * basınca kapanır ve AYNI SÜRÜM için bir daha açılmaz; yeni bir yama
 * geldiğinde (data/yamaNotlari.js'e yeni kayıt eklendiğinde) bir kez daha
 * açılır. "Görüldü" bilgisi tarayıcıda (localStorage) durur — sunucuya
 * yazmaya değmeyecek kadar kişisel ve önemsiz bir tercih.
 *
 * KONUM: sol ray (kaynak çubuğu) ÜZERİNDE duruyor. Kasıtlı — yama notu bir
 * kez okunup kapatılan bir şey, kalıcı olarak yer kaplaması gerekmiyor.
 * Kapatılınca kaynak çubuğu olduğu gibi geri geliyor.
 *
 * `acik`/`onKapat` dışarıdan veriliyor ki ileride üst menüdeki bir düğme
 * paneli elle açabilsin (bkz. App.jsx yamaAcik).
 */
import { YAMA_NOTLARI, TUR_ETIKET } from '../data/yamaNotlari';
import { C, FONT } from '../theme';
import Icon from './Icons';

const TUR_RENK = {
  yenilik: C.gold,
  duzeltme: C.ice,
  denge: C.good,
};

export default function YamaNotlari({ acik, onKapat, mobile = false, railW = 186 }) {
  if (!acik) return null;
  const yama = YAMA_NOTLARI[0];
  if (!yama) return null;

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
        <span style={{ fontFamily: FONT.num, fontSize: 9, color: C.textMute }}>
          {yama.tarih}
        </span>
        <button
          onClick={onKapat}
          title="Kapat — bu yama bir daha gösterilmez"
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
        <div style={{
          fontFamily: FONT.head, fontSize: 17, fontWeight: 600,
          letterSpacing: 0.4, color: C.frost, lineHeight: 1.25, marginBottom: 10,
        }}>{yama.baslik}</div>

        {yama.notlar.map((n, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 9 }}>
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
    </div>
  );
}
