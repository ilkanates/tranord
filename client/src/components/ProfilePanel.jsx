/**
 * ProfilePanel — oyuncu adı ve köy adı.
 *
 * NEDEN VAR: oyuncular haritada, raporlarda ve köy listesinde e-posta
 * adreslerinin @ öncesiyle görünüyordu. Artık herkes kendi adını veriyor;
 * ad verilmemişse `NameGate` oyunu açar açmaz tek soruluk ekranı gösteriyor.
 *
 * İki parça:
 *   ProfileButton  üst bardaki ad — tıklayınca küçük profil penceresi
 *   NameGate       ilk giriş: ad verilmeden oyuna girilmiyor
 *
 * Sunucu son sözü söylüyor (uzunluk, karakter kümesi, benzersizlik);
 * buradaki denetim yalnız kullanıcıyı boşuna bekletmemek için.
 */
import { useEffect, useRef, useState } from 'react';
import { C, FONT, btn, label as lbl } from '../theme';
import { useViewport } from '../responsive';
import Icon from './Icons';

/** Sunucudaki AD_DESEN'in aynısı — erken uyarı için */
const AD_DESEN = /^[0-9A-Za-zÇĞİIÖŞÜçğıiöşü][0-9A-Za-zÇĞİIÖŞÜçğıiöşü _''\-.]*$/;

function yerelDenetim(ad, enAz, enCok) {
  const t = String(ad || '').replace(/\s+/g, ' ').trim();
  if (t.length < enAz) return `En az ${enAz} karakter`;
  if (t.length > enCok) return `En fazla ${enCok} karakter`;
  if (!AD_DESEN.test(t)) return 'Harf, rakam, boşluk ve - _ . kullanılabilir';
  return null;
}

const kutu = {
  width: '100%', padding: '8px 10px',
  fontFamily: FONT.ui, fontSize: 12, color: C.frost,
  background: 'rgba(4,9,15,0.8)', border: `1px solid ${C.lineSoft}`,
  borderRadius: 5, outline: 'none',
};

/**
 * Tek ad alanı: kutu + kaydet düğmesi + sonuç satırı.
 *
 * `alan` sunucunun `name_result` paketindeki ayrımı ('oyuncu' | 'koy');
 * iki alan aynı olayı dinlediği için hangisinin cevabı olduğunu bununla
 * ayırıyoruz, yoksa köy adı hatası oyuncu adının altında beliriyordu.
 */
function NameField({
  socket, alan, baslik, ipucu, deger, enAz, enCok, gonder,
  otoOdak = false, dugme = 'KAYDET',
}) {
  const [taslak, setTaslak] = useState(deger || '');
  const [durum, setDurum] = useState(null);      // {ok, message}
  const [bekliyor, setBekliyor] = useState(false);
  const ref = useRef(null);

  // Sunucudan yeni değer gelirse (başka sekmede değiştirildi) kutuyu tazele
  useEffect(() => { setTaslak(deger || ''); }, [deger]);
  useEffect(() => { if (otoOdak) ref.current?.focus(); }, [otoOdak]);

  useEffect(() => {
    if (!socket) return;
    const onSonuc = (r) => {
      if (!r || r.alan !== alan) return;
      setBekliyor(false);
      setDurum({ ok: !!r.ok, message: r.ok ? 'Kaydedildi' : (r.message || 'Olmadı') });
      if (r.ok && r.name) setTaslak(r.name);
    };
    socket.on('name_result', onSonuc);
    return () => socket.off('name_result', onSonuc);
  }, [socket, alan]);

  const yerel = yerelDenetim(taslak, enAz, enCok);
  const degisti = taslak.trim() !== String(deger || '').trim();
  const gonderilebilir = !yerel && degisti && !bekliyor;

  const kaydet = () => {
    if (!gonderilebilir) return;
    setDurum(null); setBekliyor(true);
    gonder(taslak.replace(/\s+/g, ' ').trim());
  };

  return (
    <div>
      <div style={lbl({ fontSize: 8.5, marginBottom: 4 })}>{baslik}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <input ref={ref} value={taslak} maxLength={enCok}
          onChange={(e) => { setTaslak(e.target.value); setDurum(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') kaydet(); }}
          placeholder={ipucu}
          style={{ ...kutu, flex: 1, minWidth: 120 }} />
        <button onClick={kaydet} disabled={!gonderilebilir}
          style={btn(gonderilebilir ? 'primary' : 'disabled',
            { padding: '7px 12px', fontSize: 9.5, flexShrink: 0 })}>
          {bekliyor ? '…' : dugme}
        </button>
      </div>
      {(yerel && degisti) || durum ? (
        <div style={{
          marginTop: 5, fontFamily: FONT.ui, fontSize: 9,
          color: durum ? (durum.ok ? C.good : C.danger) : C.warn,
        }}>
          {durum ? durum.message : yerel}
        </div>
      ) : null}
    </div>
  );
}

/**
 * ÜST BARDAKİ AD. Tıklayınca altında profil penceresi açılır.
 * Dar ekranda yalnız simge görünüyor — 375 px'te ad + çıkış + bağlantı
 * noktası yan yana sığmıyor.
 */
export function ProfileButton({ socket, playerName, email, villages = [], activeSlot = null, dar = false }) {
  const [acik, setAcik] = useState(false);
  const sarmal = useRef(null);
  const aktifKoy = villages.find(v => v.slotKey === activeSlot) || null;

  // Dışarı tıklayınca ve ESC ile kapansın
  useEffect(() => {
    if (!acik) return;
    const disari = (e) => { if (!sarmal.current?.contains(e.target)) setAcik(false); };
    const esc = (e) => { if (e.key === 'Escape') setAcik(false); };
    document.addEventListener('pointerdown', disari);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', disari);
      document.removeEventListener('keydown', esc);
    };
  }, [acik]);

  return (
    <div ref={sarmal} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button onClick={() => setAcik(o => !o)} title={email || 'Profil'}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: acik ? 'rgba(61,159,214,0.14)' : 'none',
          border: `1px solid ${acik ? C.lineBright : 'transparent'}`,
          borderRadius: 5, cursor: 'pointer', padding: dar ? '4px 6px' : '4px 8px',
        }}>
        <Icon name="isci" size={13} color={acik ? C.iceSoft : C.textMute} />
        {!dar && (
          <span style={{
            fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim,
            maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{playerName || '—'}</span>
        )}
      </button>

      {acik && (
        <div className="tn-rise" style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6,
          /* Dar ekranda sağa yaslı 260 px pencere taşıyordu */
          width: 'min(260px, calc(100vw - 24px))', zIndex: 60,
          background: 'rgba(8,15,24,0.96)', border: `1px solid ${C.lineBright}`,
          borderRadius: 8, padding: 12,
          boxShadow: '0 18px 40px rgba(0,0,0,0.6)',
          display: 'grid', gap: 12,
        }}>
          <div>
            <div style={{ fontFamily: FONT.head, fontSize: 13, color: C.frost }}>Profil</div>
            <div style={{
              fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint, marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{email}</div>
          </div>

          <NameField socket={socket} alan="oyuncu"
            baslik="Oyuncu adın" ipucu="haritada görünecek ad"
            deger={playerName} enAz={3} enCok={18}
            gonder={(ad) => socket?.emit('set_player_name', { name: ad })} />

          {aktifKoy && (
            <NameField socket={socket} alan="koy"
              baslik={villages.length > 1 ? 'Bu köyün adı (aktif köy)' : 'Köyünün adı'}
              ipucu="köy adı"
              deger={aktifKoy.name} enAz={2} enCok={22}
              gonder={(ad) => socket?.emit('rename_village', { slotKey: activeSlot, name: ad })} />
          )}

          {villages.length > 1 && (
            <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint, lineHeight: 1.5 }}>
              Başka bir köyün adını değiştirmek için önce üst bardan o köye geç.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * İLK GİRİŞ — ad verilmeden oyuna girilmiyor.
 *
 * Kapatma düğmesi YOK: amaç kimsenin e-postasıyla dolaşmaması. Sunucu
 * adı kabul edince `adVerilmedi` false oluyor ve bu ekran kendiliğinden
 * kayboluyor.
 */
export function NameGate({ socket, email }) {
  const vp = useViewport();
  const oneri = String(email || '').split('@')[0];
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'grid', placeItems: 'center',
      background: 'rgba(3,7,12,0.86)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      padding: 16,
    }}>
      <div className="tn-rise" style={{
        width: 'min(360px, 100%)',
        background: 'rgba(8,15,24,0.97)', border: `1px solid ${C.lineBright}`,
        borderRadius: 10, padding: vp.mobile ? 16 : 20,
        boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
          <Icon name="koy" size={18} color={C.iceDeep} />
          <div style={{ fontFamily: FONT.head, fontSize: 17, letterSpacing: 2, color: C.frost }}>
            HOŞ GELDİN
          </div>
        </div>
        <div style={{
          fontFamily: FONT.ui, fontSize: 10.5, lineHeight: 1.6,
          color: C.textMute, marginBottom: 14,
        }}>
          Fiyortta seni ne diye çağıralım? Bu ad haritada, savaş raporlarında
          ve sıralamalarda görünecek. Sonradan profilden değiştirebilirsin.
        </div>

        <NameField socket={socket} alan="oyuncu"
          baslik="Oyuncu adın" ipucu={oneri || 'adın'}
          deger="" enAz={3} enCok={18} otoOdak dugme="BAŞLA"
          gonder={(ad) => socket?.emit('set_player_name', { name: ad })} />

        <div style={{
          marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.lineSoft}`,
          fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint, lineHeight: 1.5,
        }}>
          Her oyuncunun adı benzersiz — aynı ad iki kişide olamaz.
        </div>
      </div>
    </div>
  );
}

export default ProfileButton;
