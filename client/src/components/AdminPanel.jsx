/**
 * AdminPanel — oyuncu listesi ve BAŞKA BİR HESABA GİRME.
 *
 * İlkan: *"admin olarak herkesin kullanıcısına girebiliyor olmalıyım."*
 *
 * ── İKİ TASARIM KARARI ─────────────────────────────────────────────
 *
 * 1) PANEL YALNIZ ADMİNE GÖRÜNÜYOR ama bu bir yetki değil: sunucu her
 *    istekte yeniden karar veriyor (server/admin.js · adminGate) ve
 *    admin olmayana bu yollar 404 dönüyor. Buradaki bayrak sadece
 *    düğmeyi çizip çizmemeye karar veriyor.
 *
 * 2) GERİ DÖNÜŞ YOLU ŞART. Başka bir hesaba girmek, kendi hesabını
 *    kaybetmek olmamalı: adminin token'ı ayrı bir anahtarda saklanıyor
 *    ve "kendi hesabıma dön" onu geri yüklüyor. Yoksa admin her
 *    taklitten sonra yeniden şifre girmek zorunda kalırdı.
 */
import { useEffect, useState } from 'react';
import { C, FONT, panel, btn, label as lbl, num } from '../theme';
import Icon from './Icons';
import { adminTokeniSakla } from '../adminOturum';

export default function AdminPanel({ token, onToken, onKapat, serverUrl = '' }) {
  const [liste, setListe] = useState(null);
  const [hata, setHata] = useState(null);
  const [ara, setAra] = useState('');
  const [bekleyen, setBekleyen] = useState(null);

  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const r = await fetch(`${serverUrl}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error(r.status === 404 ? 'Yetki yok' : `Sunucu ${r.status}`);
        const d = await r.json();
        if (!iptal) setListe(d.users || []);
      } catch (e) {
        if (!iptal) setHata(e.message);
      }
    })();
    return () => { iptal = true; };
  }, [token, serverUrl]);

  /**
   * HESABA GİR. Adminin kendi token'ı saklanıyor, sonra o kullanıcının
   * token'ı yükleniyor — uygulama yeni kimlikle baştan bağlanıyor.
   */
  const gir = async (u) => {
    setBekleyen(u.id); setHata(null);
    try {
      const r = await fetch(`${serverUrl}/admin/impersonate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: u.id }),
      });
      if (!r.ok) throw new Error(`Sunucu ${r.status}`);
      const d = await r.json();
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
        Kimlik değişimi nadir ve kesin bir olay; yeniden yükleme en
        güvenli yol.
      */
      window.location.reload();
    } catch (e) {
      setHata(e.message);
      setBekleyen(null);
    }
  };

  const suzulmus = (liste || []).filter(u => {
    if (!ara.trim()) return true;
    const q = ara.trim().toLowerCase();
    return String(u.id) === q
      || (u.email || '').toLowerCase().includes(q)
      || (u.name || '').toLowerCase().includes(q);
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80, display: 'grid', placeItems: 'center',
      background: 'rgba(4,9,15,0.72)', backdropFilter: 'blur(6px)',
    }} onClick={onKapat}>
      <div onClick={(e) => e.stopPropagation()} style={{
        ...panel({ padding: 16 }), width: 'min(560px, 94vw)',
        maxHeight: '86vh', display: 'flex', flexDirection: 'column', gap: 11,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Icon name="kilit" size={17} color={C.warn} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT.head, fontSize: 17, letterSpacing: 2, color: C.frost }}>
              ADMİN PANELİ
            </div>
            <div style={lbl({ fontSize: 8.5, letterSpacing: 1.4 })}>
              bir oyuncuya tıkla, o hesaba gir
            </div>
          </div>
          <button type="button" onClick={onKapat}
            style={btn('ghost', { padding: '5px 10px', fontSize: 10 })}>KAPAT</button>
        </div>

        <input value={ara} onChange={(e) => setAra(e.target.value)}
          placeholder="e-posta, ad ya da numara"
          style={{
            padding: '8px 10px', borderRadius: 5,
            background: 'rgba(8,17,28,0.8)', border: `1px solid ${C.lineSoft}`,
            color: C.frost, fontFamily: FONT.ui, fontSize: 12,
          }} />

        {hata && (
          <div style={{
            padding: '8px 10px', borderRadius: 5,
            background: 'rgba(58,14,20,0.8)', border: `1px solid ${C.dangerDim}`,
            fontFamily: FONT.ui, fontSize: 11, color: '#f0b8bd',
          }}>{hata}</div>
        )}

        {!liste && !hata && (
          <div style={{ fontFamily: FONT.ui, fontSize: 11, color: C.textMute }}>
            Yükleniyor…
          </div>
        )}

        <div className="tn-scroll" style={{
          overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {suzulmus.map(u => (
            <button key={u.id} type="button" onClick={() => gir(u)}
              disabled={bekleyen != null}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left',
                padding: '8px 10px', borderRadius: 5, cursor: 'pointer',
                background: 'rgba(8,17,28,0.6)', border: `1px solid ${C.lineSoft}`,
                opacity: bekleyen != null && bekleyen !== u.id ? 0.5 : 1,
              }}>
              <span style={num({ fontSize: 10, color: C.textMute, width: 26 })}>#{u.id}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  display: 'block', fontFamily: FONT.ui, fontSize: 12, color: C.frost,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{u.name || '(adsız)'}</span>
                <span style={{
                  display: 'block', fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{u.email}</span>
              </span>
              {u.koySayisi != null && (
                <span style={num({ fontSize: 10, color: C.textDim })}>{u.koySayisi} köy</span>
              )}
              <Icon name="cikis" size={13} color={C.iceSoft} />
            </button>
          ))}
          {liste && !suzulmus.length && (
            <div style={{ fontFamily: FONT.ui, fontSize: 11, color: C.textMute }}>
              Eşleşen oyuncu yok.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
