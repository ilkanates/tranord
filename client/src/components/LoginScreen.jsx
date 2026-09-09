/**
 * GİRİŞ / KAYIT — oyunun içinde.
 *
 * Eskiden giriş ayrı bir sitede (Cloudflare Pages landing) yapılıp oyuna
 * ?token= ile dönülüyordu. Oyun tek sunucuda servis edildiği için o ayrı
 * parçaya gerek yok: burada alınan token doğrudan localStorage'a yazılıyor.
 *
 * `serverUrl` boş dize gelebilir — üretimde istemci ve API aynı origin'de
 * olduğu için istek göreli ('/auth/login') gider.
 */
import { useState } from 'react';
import { C, FONT, panel, btn, label as lbl } from '../theme';
import LoginBackdrop from './LoginBackdrop';
import MusicButton from './MusicButton';

const field = {
  width: '100%',
  padding: '10px 12px',
  marginTop: 5,
  borderRadius: 6,
  background: 'rgba(6,13,22,0.72)',
  border: `1px solid ${C.line}`,
  color: C.text,
  fontFamily: FONT.ui,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

export default function LoginScreen({ serverUrl = '', onToken }) {
  const [mode, setMode]  = useState('login');     // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');
  const isRegister = mode === 'register';

  async function submit(e) {
    e?.preventDefault();
    if (busy) return;
    setErr('');

    if (!email.trim() || !pass) { setErr('E-posta ve şifre gerekli.'); return; }
    if (isRegister && pass.length < 6) { setErr('Şifre en az 6 karakter olmalı.'); return; }

    setBusy(true);
    try {
      const res = await fetch(`${serverUrl}/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Sunucunun kendi mesajını göster: "email zaten kayıtlı", deneme
        // sınırı (429) gibi durumları tahmin etmeye gerek yok.
        setErr(data.error || `Sunucu ${res.status} döndü.`);
        return;
      }
      if (!data.token) { setErr('Sunucu token döndürmedi.'); return; }
      onToken(data.token);
    } catch {
      // fetch'in başarısız olması ağ/adres sorunu demek — sunucu bir cevap
      // verse (hatalı şifre dahil) buraya düşmezdik.
      setErr(serverUrl
        ? `Sunucuya ulaşılamadı (${serverUrl}). Sunucu açık mı?`
        : 'Sunucuya ulaşılamadı. Sunucu açık mı?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: C.abyss }}>
      {/* Ana ekran anahtar gorseli - kadin savasci solda, koy sagda */}
      <LoginBackdrop />
      {/* Müzik giriş ekranında da çalıyor — kapatmak isteyen burada bulsun */}
      <div style={{ position: 'absolute', top: 12, right: 14, zIndex: 5 }}>
        <MusicButton />
      </div>
      <div style={{
        position: 'relative', zIndex: 2, minHeight: '100dvh',
        display: 'grid', placeItems: 'center', padding: 20,
      }}>
        <form onSubmit={submit} style={panel({
          width: 'min(92vw, 380px)', padding: '26px 24px 22px',
        })}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div style={{
              fontFamily: FONT.head, fontSize: 30, fontWeight: 700,
              letterSpacing: 8, color: C.frost,
            }}>TRANORD</div>
            <div style={{
              fontFamily: FONT.ui, fontSize: 9.5, letterSpacing: 3,
              color: C.iceDeep, marginTop: 6, textTransform: 'uppercase',
            }}>fiyort krallığı</div>
          </div>

          <div style={{ marginBottom: 13 }}>
            <span style={lbl()}>E-posta</span>
            <input type="email" value={email} autoComplete="username" autoFocus
              onChange={(e) => setEmail(e.target.value)} style={field} />
          </div>

          <div style={{ marginBottom: 6 }}>
            <span style={lbl()}>Şifre</span>
            <input type="password" value={pass}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              onChange={(e) => setPass(e.target.value)} style={field} />
          </div>

          <div style={{
            fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint,
            minHeight: 14, marginBottom: 12,
          }}>
            {isRegister ? 'En az 6 karakter.' : ''}
          </div>

          {err && (
            <div style={{
              fontFamily: FONT.ui, fontSize: 11, lineHeight: 1.5,
              color: '#ffb8bd', background: 'rgba(255,111,120,0.10)',
              border: `1px solid ${C.dangerDim}`, borderRadius: 6,
              padding: '8px 10px', marginBottom: 12,
            }}>{err}</div>
          )}

          <button type="submit" disabled={busy}
            style={btn('primary', {
              width: '100%', padding: '11px 0', fontSize: 10.5, letterSpacing: 2,
              opacity: busy ? 0.6 : 1, cursor: busy ? 'default' : 'pointer',
            })}>
            {busy ? 'BEKLE…' : (isRegister ? 'HESAP AÇ' : 'GİRİŞ YAP')}
          </button>

          <div style={{
            marginTop: 15, textAlign: 'center',
            fontFamily: FONT.ui, fontSize: 10.5, color: C.textMute,
          }}>
            {isRegister ? 'Hesabın var mı? ' : 'Hesabın yok mu? '}
            <button type="button"
              onClick={() => { setMode(isRegister ? 'login' : 'register'); setErr(''); }}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: FONT.ui, fontSize: 10.5, color: C.ice,
                textDecoration: 'underline',
              }}>
              {isRegister ? 'giriş yap' : 'hesap aç'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
