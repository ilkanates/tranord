/**
 * Ölümcül hata ekranı.
 *
 * Neden ayrı modül: bir bileşen dosyası MODÜL YÜKLENİRKEN patlarsa (örn. TDZ:
 * "Cannot access 'X' before initialization") React hiç render etmez ve ekran
 * bomboş siyah kalır — hata yalnızca konsolda görünür. App.jsx içindeki bir
 * hata sınırı bunu yakalayamaz, çünkü App.jsx'in kendisi yüklenemez.
 * Bu yüzden ekran burada, App'ten bağımsız duruyor ve main.jsx App'i dinamik
 * import edip hatayı yakalıyor.
 */
import { Component } from 'react';

const WRAP = `position:fixed;inset:0;z-index:9999;overflow:auto;background:#0b1016;
  color:#e8eef6;padding:28px;font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace`;

export function showFatal(err) {
  const el = document.getElementById('root');
  if (!el) return;
  const msg = String(err?.message || err || 'bilinmeyen hata');
  const stack = err?.stack || '';
  el.innerHTML = `<div style="${WRAP}">
    <div style="font:700 22px/1.2 'Cormorant Garamond',Georgia,serif;letter-spacing:3px;color:#ff8f7a;margin-bottom:14px">
      ARAYÜZ HATASI</div>
    <div style="color:#ffb8bd;margin-bottom:12px"></div>
    <pre style="white-space:pre-wrap;color:#8fa3b8;font-size:11px;background:#070b10;
      padding:12px;border-radius:6px;border:1px solid #1c2a38"></pre>
    <button id="tn-reload" style="margin-top:16px;padding:8px 16px;cursor:pointer;
      background:#16283a;color:#cfe4f5;border:1px solid #2d4560;border-radius:5px">
      SAYFAYI YENİLE</button>
  </div>`;
  // metinleri textContent ile bas — innerHTML'e enjeksiyon olmasın
  el.querySelector('div > div:nth-of-type(2)').textContent = msg;
  el.querySelector('pre').textContent = stack || '(yığın yok)';
  el.querySelector('#tn-reload').onclick = () => window.location.reload();
  console.error('[TRANORD] ölümcül hata:', err);
}

/** Yakalanmayan hataları da ekrana taşı */
export function installFatalHandler() {
  window.addEventListener('error', (e) => {
    if (e?.error) showFatal(e.error);
  });
  window.addEventListener('unhandledrejection', (e) => {
    if (e?.reason) showFatal(e.reason);
  });
}

/** Render sırasındaki hatalar için React hata sınırı */
export class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error('[TRANORD] render hatası:', err, info); }
  render() {
    const e = this.state.err;
    if (!e) return this.props.children;
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999, overflow: 'auto',
        background: '#0b1016', color: '#e8eef6', padding: 28,
        font: '13px/1.6 ui-monospace, monospace',
      }}>
        <div style={{
          font: "700 22px/1.2 'Cormorant Garamond', Georgia, serif",
          letterSpacing: 3, color: '#ff8f7a', marginBottom: 14,
        }}>ARAYÜZ HATASI</div>
        <div style={{ color: '#ffb8bd', marginBottom: 12 }}>{String(e.message || e)}</div>
        <pre style={{
          whiteSpace: 'pre-wrap', color: '#8fa3b8', fontSize: 11,
          background: '#070b10', padding: 12, borderRadius: 6, border: '1px solid #1c2a38',
        }}>{e.stack || '(yığın yok)'}</pre>
        <button onClick={() => window.location.reload()}
          style={{
            marginTop: 16, padding: '8px 16px', cursor: 'pointer',
            background: '#16283a', color: '#cfe4f5',
            border: '1px solid #2d4560', borderRadius: 5,
          }}>SAYFAYI YENİLE</button>
      </div>
    );
  }
}
