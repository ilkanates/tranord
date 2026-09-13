/**
 * MESAJLAR — gelen kutusu, giden kutusu ve yazma.
 *
 * Durum SUNUCUDA: liste soketle isteniyor (`mesaj_kutusu`), okundu/sil
 * orada işleniyor. Burada yalnız gösterim ve dört olay.
 *
 * DÜZEN raporlarla AYNI: solda liste, sağda seçilenin gövdesi. Oyuncu
 * iki ekran arasında yeni bir düzen öğrenmesin diye kasten benzetildi.
 *
 * ALICI ADLA seçiliyor, listeden değil: oyuncu listesi vermek hem
 * haritadaki herkesi tek ekranda dökmek hem de toplu mesaj atmayı
 * kolaylaştırmak demek olurdu.
 */
import { useEffect, useMemo, useState } from 'react';
import { C, FONT, panel, btn, label as lbl, num } from '../theme';
import { useViewport } from '../responsive';
import Icon from './Icons';

const KONU_EN_COK = 60;
const GOVDE_EN_COK = 2000;

/** Sabit saat — göreli zaman ("3 dk önce") liste huzursuz gösteriyordu */
function fmtZaman(at) {
  if (!at) return '';
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  const hm = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const bugun = d.toDateString() === new Date().toDateString();
  return bugun ? hm
    : `${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} ${hm}`;
}

function Satir({ m, secili, okunmamis, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
      padding: '9px 10px', borderRadius: 6,
      background: secili ? 'rgba(143,220,255,0.12)'
        : okunmamis ? 'rgba(14,28,44,0.72)' : 'rgba(8,15,23,0.34)',
      border: `1px solid ${secili ? C.lineBright : okunmamis ? `${C.ice}3d` : C.lineSoft}`,
      borderLeft: `3px solid ${okunmamis ? C.ice : C.line}`,
      opacity: okunmamis || secili ? 1 : 0.68,
    }}>
      <Icon name={m.yon === 'gelen' ? 'asagi' : 'yukari'} size={11}
        color={okunmamis ? C.ice : C.textMute} strokeWidth={2.4} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT.ui, fontSize: 11.5,
          fontWeight: okunmamis ? 600 : 400,
          color: okunmamis ? C.frost : C.textFaint,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{m.konu}</div>
        <div style={{
          fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute, marginTop: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {m.yon === 'gelen' ? 'kimden ' : 'kime '}
          <b style={{ color: okunmamis ? C.iceSoft : C.textDim }}>{m.karsiAd || '—'}</b>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {okunmamis && (
          <span style={{
            display: 'block', padding: '1px 5px', borderRadius: 3, marginBottom: 3,
            background: `${C.ice}26`, border: `1px solid ${C.ice}66`,
            fontFamily: FONT.ui, fontSize: 7.5, letterSpacing: 0.9,
            fontWeight: 700, color: C.ice,
          }}>YENİ</span>
        )}
        <div style={num({ fontSize: 10, color: C.textMute, whiteSpace: 'nowrap' })}>
          {fmtZaman(m.at)}
        </div>
      </div>
    </div>
  );
}

export default function MessageScreen({ socket, playerName = '' }) {
  const vp = useViewport();
  const [yon, setYon] = useState('gelen');
  const [liste, setListe] = useState([]);
  const [engelliler, setEngelliler] = useState([]);
  const [selId, setSelId] = useState(null);
  const [yaziyor, setYaziyor] = useState(null);   // { alici, konu, govde } | null
  const [uyari, setUyari] = useState(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  // ── Sunucu bağlantısı ──
  useEffect(() => {
    if (!socket) return;
    const onListe = (d) => {
      if (d?.yon) setYon(d.yon);
      setListe(d?.liste || []);
      setEngelliler(d?.engelliler || []);
    };
    const onSonuc = (d) => {
      setGonderiliyor(false);
      if (d?.ok) {
        setUyari(d.silindi ? { iyi: true, metin: 'Mesaj silindi.' }
          : { iyi: true, metin: 'Mesaj gönderildi.' });
        if (!d.silindi) setYaziyor(null);
        socket.emit('mesaj_kutusu', { yon });
      } else {
        setUyari({ iyi: false, metin: d?.message || 'Mesaj gönderilemedi.' });
      }
    };
    const onEngel = (d) => setEngelliler(d?.liste || []);
    const onGeldi = () => socket.emit('mesaj_kutusu', { yon });
    socket.on('mesaj_listesi', onListe);
    socket.on('mesaj_sonuc', onSonuc);
    socket.on('mesaj_engel_listesi', onEngel);
    socket.on('mesaj_geldi', onGeldi);
    socket.emit('mesaj_kutusu', { yon });
    return () => {
      socket.off('mesaj_listesi', onListe);
      socket.off('mesaj_sonuc', onSonuc);
      socket.off('mesaj_engel_listesi', onEngel);
      socket.off('mesaj_geldi', onGeldi);
    };
  }, [socket, yon]);

  // Uyarı kendiliğinden sönsün — kalıcı şerit ekranı kirletiyor
  useEffect(() => {
    if (!uyari) return undefined;
    const z = setTimeout(() => setUyari(null), 5000);
    return () => clearTimeout(z);
  }, [uyari]);

  const sel = useMemo(
    () => liste.find(m => m.id === selId) || null, [liste, selId]);

  /* Açılan mesaj okunmuş sayılır — listeye bakmak yetmiyor, TIKLAMAK gerek */
  const ac = (m) => {
    setSelId(m.id);
    setYaziyor(null);
    if (m.yon === 'gelen' && !m.okundu) {
      socket?.emit('mesaj_okundu', { id: m.id });
      setListe(l => l.map(x => (x.id === m.id ? { ...x, okundu: true } : x)));
    }
  };

  const yeni = (alici = '') => { setYaziyor({ alici, konu: '', govde: '' }); setSelId(null); };

  const gonder = () => {
    if (!yaziyor || gonderiliyor) return;
    if (!yaziyor.alici.trim()) { setUyari({ iyi: false, metin: 'Alıcı adı gerekli.' }); return; }
    if (!yaziyor.govde.trim()) { setUyari({ iyi: false, metin: 'Mesaj boş olamaz.' }); return; }
    setGonderiliyor(true);
    socket?.emit('mesaj_gonder', {
      alici: yaziyor.alici.trim(), konu: yaziyor.konu, govde: yaziyor.govde });
  };

  const engelli = (ad) => engelliler.some(e => e.ad === ad);
  const engelDegistir = (ad) =>
    socket?.emit('mesaj_engelle', { ad, kaldir: engelli(ad) });

  const alan = {
    width: '100%', padding: '8px 10px', borderRadius: 5,
    background: 'rgba(4,9,15,0.75)', border: `1px solid ${C.lineSoft}`,
    color: C.frost, fontFamily: FONT.ui, fontSize: 11.5, outline: 'none',
  };

  // ── Sağ taraf: yazma formu ya da seçilen mesaj ──
  const sagTaraf = yaziyor ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontFamily: FONT.head, fontSize: 18, color: C.frost }}>Yeni mesaj</div>
      <div>
        <div style={lbl({ fontSize: 8, letterSpacing: 1.3, marginBottom: 4 })}>Kime (oyuncu adı)</div>
        <input value={yaziyor.alici} maxLength={18} autoFocus
          onChange={(e) => setYaziyor(y => ({ ...y, alici: e.target.value }))}
          style={alan} />
      </div>
      <div>
        <div style={lbl({ fontSize: 8, letterSpacing: 1.3, marginBottom: 4 })}>
          Konu <span style={{ color: C.textFaint }}>· isteğe bağlı</span>
        </div>
        <input value={yaziyor.konu} maxLength={KONU_EN_COK}
          onChange={(e) => setYaziyor(y => ({ ...y, konu: e.target.value }))}
          placeholder="Boş bırakırsan ilk satırdan alınır"
          style={alan} />
      </div>
      <div>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4,
        }}>
          <span style={lbl({ fontSize: 8, letterSpacing: 1.3 })}>Mesaj</span>
          <span style={num({
            fontSize: 9, marginLeft: 'auto',
            color: yaziyor.govde.length > GOVDE_EN_COK - 100 ? C.warn : C.textMute,
          })}>{yaziyor.govde.length}/{GOVDE_EN_COK}</span>
        </div>
        <textarea value={yaziyor.govde} maxLength={GOVDE_EN_COK} rows={vp.mobile ? 7 : 11}
          onChange={(e) => setYaziyor(y => ({ ...y, govde: e.target.value }))}
          style={{ ...alan, resize: 'vertical', lineHeight: 1.6 }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={gonder} disabled={gonderiliyor}
          style={btn('primary', { flex: 1, padding: '9px 0', letterSpacing: 1.4 })}>
          {gonderiliyor ? 'GÖNDERİLİYOR…' : 'GÖNDER'}
        </button>
        <button onClick={() => setYaziyor(null)}
          style={btn('ghost', { padding: '9px 14px', letterSpacing: 1 })}>VAZGEÇ</button>
      </div>
    </div>
  ) : sel ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{
          fontFamily: FONT.head, fontSize: 19, color: C.frost, lineHeight: 1.25,
        }}>{sel.konu}</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap',
        }}>
          <span style={{
            padding: '2px 9px', borderRadius: 4,
            background: `${C.ice}1f`, border: `1px solid ${C.ice}55`,
            fontFamily: FONT.ui, fontSize: 9.5, letterSpacing: 1, color: C.ice, fontWeight: 600,
          }}>{sel.yon === 'gelen' ? 'GELEN' : 'GİDEN'}</span>
          <span style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim }}>
            {sel.yon === 'gelen' ? 'Gönderen' : 'Alıcı'}: <b style={{ color: C.frost }}>{sel.karsiAd}</b>
          </span>
          <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute }}>
            {fmtZaman(sel.at)}
          </span>
        </div>
      </div>

      {/*
        Gövde `pre-wrap`: oyuncunun yazdığı satır sonları korunuyor.
        React metni zaten kaçırdığı için HTML olarak yorumlanmıyor.
      */}
      <div style={panel({
        padding: '12px 14px', background: 'rgba(8,15,24,0.6)',
        fontFamily: FONT.ui, fontSize: 12, lineHeight: 1.75, color: C.textDim,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      })}>{sel.govde}</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {sel.yon === 'gelen' && (
          <button onClick={() => yeni(sel.karsiAd)}
            style={btn('primary', { padding: '8px 16px', letterSpacing: 1.2 })}>
            CEVAPLA
          </button>
        )}
        <button onClick={() => { socket?.emit('mesaj_sil', { id: sel.id }); setSelId(null); }}
          style={btn('danger', { padding: '8px 14px', letterSpacing: 1 })}>SİL</button>
        {sel.yon === 'gelen' && (
          <button onClick={() => engelDegistir(sel.karsiAd)}
            title={engelli(sel.karsiAd)
              ? 'Bu oyuncu yeniden mesaj gönderebilsin'
              : 'Bu oyuncudan mesaj alma'}
            style={btn('ghost', { padding: '8px 14px', letterSpacing: 1, marginLeft: 'auto' })}>
            {engelli(sel.karsiAd) ? 'ENGELİ KALDIR' : 'ENGELLE'}
          </button>
        )}
      </div>
    </div>
  ) : (
    <div style={{
      height: '100%', display: 'grid', placeItems: 'center',
      fontFamily: FONT.ui, fontSize: 11, color: C.textMute, padding: 24, textAlign: 'center',
    }}>
      Soldan bir mesaj seç ya da <b style={{ color: C.iceSoft }}>&nbsp;YENİ MESAJ&nbsp;</b> ile yaz.
    </div>
  );

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '10px 0 24px' }}>
      {/* Üst şerit: kutu seçimi + yeni mesaj */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, flexWrap: 'wrap',
      }}>
        <Icon name="bilgi" size={14} color={C.iceDeep} />
        <span style={lbl({ fontSize: 9, letterSpacing: 1.5 })}>Mesajlar</span>
        <div style={{ display: 'flex', gap: 5, marginLeft: 10 }}>
          {[['gelen', 'GELEN KUTUSU'], ['giden', 'GÖNDERDİKLERİM']].map(([k, e]) => (
            <button key={k} onClick={() => { setYon(k); setSelId(null); setYaziyor(null); }}
              style={btn(yon === k ? 'primary' : 'ghost',
                { padding: '5px 11px', fontSize: 9, letterSpacing: 1 })}>{e}</button>
          ))}
        </div>
        <button onClick={() => yeni()}
          style={btn('good', { marginLeft: 'auto', padding: '6px 14px', fontSize: 9.5, letterSpacing: 1.2 })}>
          YENİ MESAJ
        </button>
      </div>

      {uyari && (
        <div style={{
          marginBottom: 10, padding: '8px 11px', borderRadius: 6,
          fontFamily: FONT.ui, fontSize: 11,
          color: uyari.iyi ? '#a8e8c8' : '#ffb8bd',
          background: uyari.iyi ? 'rgba(78,207,168,0.10)' : 'rgba(255,111,120,0.10)',
          border: `1px solid ${uyari.iyi ? 'rgba(78,207,168,0.32)' : C.dangerDim}`,
        }}>{uyari.metin}</div>
      )}

      {engelliler.length > 0 && (
        <div style={{
          marginBottom: 10, padding: '7px 11px', borderRadius: 6,
          background: 'rgba(8,17,28,0.55)', border: `1px solid ${C.lineSoft}`,
          fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute,
          display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap',
        }}>
          <Icon name="kilit" size={11} color={C.textMute} />
          <span>Engellediklerin:</span>
          {engelliler.map(e => (
            <button key={e.userId} onClick={() => engelDegistir(e.ad)}
              title="Engeli kaldır"
              style={btn('ghost', { padding: '2px 8px', fontSize: 9 })}>
              {e.ad} ✕
            </button>
          ))}
        </div>
      )}

      <div style={{
        display: vp.mobile ? 'block' : 'grid',
        gridTemplateColumns: '320px 1fr', gap: 12, alignItems: 'start',
      }}>
        {/* Sol: liste. Telefonda mesaj açılınca liste gizlenir — iki
            sütun 375 px'e sığmıyor, ikisi de okunmaz oluyordu. */}
        {(!vp.mobile || (!sel && !yaziyor)) && (
          <div style={panel({ padding: 8, maxHeight: vp.mobile ? 'none' : '72vh', overflowY: 'auto' })}>
            {liste.length === 0 ? (
              <div style={{
                padding: 18, textAlign: 'center',
                fontFamily: FONT.ui, fontSize: 10.5, color: C.textMute, lineHeight: 1.7,
              }}>
                {yon === 'gelen'
                  ? 'Gelen kutun boş. Başka oyuncular sana buradan yazabilir.'
                  : 'Henüz mesaj göndermedin.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {liste.map(m => (
                  <Satir key={m.id} m={m} secili={m.id === selId}
                    okunmamis={m.yon === 'gelen' && !m.okundu}
                    onClick={() => ac(m)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sağ: ayrıntı ya da form */}
        {(!vp.mobile || sel || yaziyor) && (
          <div style={panel({ padding: vp.mobile ? 12 : 16, minHeight: vp.mobile ? 0 : 320 })}>
            {vp.mobile && (sel || yaziyor) && (
              <button onClick={() => { setSelId(null); setYaziyor(null); }}
                style={btn('ghost', { marginBottom: 10, padding: '6px 12px', fontSize: 9.5 })}>
                ‹ LİSTEYE DÖN
              </button>
            )}
            {sagTaraf}
          </div>
        )}
      </div>

      <div style={{
        marginTop: 12, fontFamily: FONT.ui, fontSize: 9, color: C.textFaint, lineHeight: 1.6,
      }}>
        Adın <b style={{ color: C.textMute }}>{playerName || '—'}</b> olarak görünür.
        Rahatsız eden bir oyuncuyu mesajı açıp <b>ENGELLE</b> ile susturabilirsin;
        engellediğin kişi bunu göremez, mesajı sana ulaşmaz.
      </div>
    </div>
  );
}
