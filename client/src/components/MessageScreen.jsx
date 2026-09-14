/**
 * MESAJLAR — oyuncu bazında SOHBET görünümü.
 *
 * Eskiden gelen/giden diye iki ayrı kutu vardı ve aynı kişiyle yazışmak
 * iki sekme arasında gidip gelmek demekti: attığın mesaj karşı tarafın
 * cevabının yanında değil, bambaşka bir listede duruyordu. Artık tek
 * akış var ve KARŞI OYUNCUYA göre gruplanıyor — gönderdiğin de aldığın
 * da aynı sohbetin içinde, sırayla.
 *
 * Durum SUNUCUDA: liste soketle isteniyor (`mesaj_kutusu` bütün yazışmayı
 * tek seferde veriyor), okundu/sil orada işleniyor. Gruplama burada,
 * çünkü sunucunun sohbet diye bir kaydı yok — mesajların kendisi var.
 *
 * ALICI seçimi: hem listeden seçilebiliyor hem elle yazılabiliyor. Liste
 * bir kolaylık, kapı değil — sunucu adı yine veritabanından çözüyor.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { C, FONT, panel, btn, label as lbl, num } from '../theme';
import { useViewport } from '../responsive';
import Icon from './Icons';

const GOVDE_EN_COK = 2000;

/** Sabit saat — göreli zaman ("3 dk önce") listeyi huzursuz gösteriyordu */
function fmtZaman(at) {
  if (!at) return '';
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  const hm = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const bugun = d.toDateString() === new Date().toDateString();
  return bugun ? hm
    : `${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} ${hm}`;
}

/** Sohbet listesindeki satır — karşı oyuncu, son mesaj, okunmamış sayısı */
function SohbetSatiri({ s, secili, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
      padding: '9px 10px', borderRadius: 6,
      background: secili ? 'rgba(143,220,255,0.12)'
        : s.okunmamis ? 'rgba(14,28,44,0.72)' : 'rgba(8,15,23,0.34)',
      border: `1px solid ${secili ? C.lineBright
        : s.okunmamis ? `${C.ice}3d` : C.lineSoft}`,
      borderLeft: `3px solid ${s.okunmamis ? C.ice : C.line}`,
      opacity: s.okunmamis || secili ? 1 : 0.72,
    }}>
      <div style={{
        display: 'grid', placeItems: 'center', flexShrink: 0,
        width: 28, height: 28, borderRadius: 14,
        background: 'rgba(127,212,255,0.10)', border: `1px solid ${C.lineSoft}`,
        fontFamily: FONT.head, fontSize: 12, color: C.iceSoft,
      }}>{(s.ad || '?').slice(0, 1).toLocaleUpperCase('tr')}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT.ui, fontSize: 11.5,
          fontWeight: s.okunmamis ? 600 : 500,
          color: s.okunmamis ? C.frost : C.textDim,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{s.ad}</div>
        <div style={{
          fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute, marginTop: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {s.son.benden && <span style={{ color: C.textFaint }}>sen: </span>}
          {s.son.govde}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {s.okunmamis > 0 && (
          <span style={{
            display: 'inline-block', minWidth: 16, padding: '1px 5px',
            borderRadius: 8, marginBottom: 3,
            background: C.ice, color: '#06101a',
            fontFamily: FONT.num, fontSize: 9, fontWeight: 700, textAlign: 'center',
          }}>{s.okunmamis}</span>
        )}
        <div style={num({ fontSize: 9.5, color: C.textMute, whiteSpace: 'nowrap' })}>
          {fmtZaman(s.son.at)}
        </div>
      </div>
    </div>
  );
}

/** Sohbetteki tek mesaj balonu — benimki sağda, karşınınki solda */
function Balon({ m, onSil }) {
  const benim = m.benden;
  return (
    <div style={{
      display: 'flex', justifyContent: benim ? 'flex-end' : 'flex-start',
    }}>
      <div style={{
        maxWidth: '86%', padding: '8px 11px', borderRadius: 8,
        background: benim ? 'rgba(31,77,112,0.35)' : 'rgba(8,17,28,0.7)',
        border: `1px solid ${benim ? C.iceDeep : C.lineSoft}`,
      }}>
        <div style={{
          fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 1.65, color: C.textDim,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>{m.govde}</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7, marginTop: 5,
          justifyContent: 'flex-end',
        }}>
          {benim && (
            <span style={{ fontFamily: FONT.ui, fontSize: 8, color: C.textFaint }}>
              {m.okundu ? 'okundu' : 'iletildi'}
            </span>
          )}
          <span style={num({ fontSize: 8.5, color: C.textFaint })}>{fmtZaman(m.at)}</span>
          <button onClick={() => onSil(m.id)} title="Bu mesajı kendi kutundan sil"
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              display: 'grid', placeItems: 'center', opacity: 0.55,
            }}>
            <Icon name="kapat" size={9} color={C.textMute} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MessageScreen({ socket, playerName = '' }) {
  const vp = useViewport();
  const [mesajlar, setMesajlar] = useState([]);
  const [engelliler, setEngelliler] = useState([]);
  const [acikAd, setAcikAd] = useState(null);       // seçili sohbetin karşı adı
  const [taslak, setTaslak] = useState('');
  const [yeniAliciAcik, setYeniAliciAcik] = useState(false);
  const [arama, setArama] = useState('');
  const [oyuncular, setOyuncular] = useState([]);
  const [uyari, setUyari] = useState(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const akisRef = useRef(null);

  // ── Sunucu bağlantısı ──
  useEffect(() => {
    if (!socket) return undefined;
    const onListe = (d) => {
      setMesajlar(d?.liste || []);
      setEngelliler(d?.engelliler || []);
    };
    const onSonuc = (d) => {
      setGonderiliyor(false);
      if (d?.ok) {
        if (!d.silindi) setTaslak('');
        socket.emit('mesaj_kutusu');
      } else {
        setUyari(d?.message || 'Mesaj gönderilemedi.');
      }
    };
    const onEngel = (d) => setEngelliler(d?.liste || []);
    const onGeldi = () => socket.emit('mesaj_kutusu');
    const onOyuncu = (d) => setOyuncular(d?.liste || []);
    socket.on('mesaj_listesi', onListe);
    socket.on('mesaj_sonuc', onSonuc);
    socket.on('mesaj_engel_listesi', onEngel);
    socket.on('mesaj_geldi', onGeldi);
    socket.on('mesaj_oyuncu_listesi', onOyuncu);
    socket.emit('mesaj_kutusu');
    return () => {
      socket.off('mesaj_listesi', onListe);
      socket.off('mesaj_sonuc', onSonuc);
      socket.off('mesaj_engel_listesi', onEngel);
      socket.off('mesaj_geldi', onGeldi);
      socket.off('mesaj_oyuncu_listesi', onOyuncu);
    };
  }, [socket]);

  // Uyarı kendiliğinden sönsün — kalıcı şerit ekranı kirletiyor
  useEffect(() => {
    if (!uyari) return undefined;
    const z = setTimeout(() => setUyari(null), 5000);
    return () => clearTimeout(z);
  }, [uyari]);

  // Alıcı kutusu açıkken oyuncuları süz (sunucu en fazla 40 döndürüyor)
  useEffect(() => {
    if (!yeniAliciAcik || !socket) return undefined;
    const z = setTimeout(() => socket.emit('mesaj_oyuncular', { q: arama }), 180);
    return () => clearTimeout(z);
  }, [yeniAliciAcik, arama, socket]);

  /**
   * SOHBETLER — mesajlar karşı oyuncuya göre gruplanıyor.
   *
   * Sunucuda "sohbet" diye bir kayıt yok, mesajların kendisi var; grubu
   * burada kurmak ayrı bir tablo ve onu güncel tutma derdi getirmiyor.
   * Liste en son yazışılan üstte sıralanıyor.
   */
  const sohbetler = useMemo(() => {
    const harita = new Map();
    for (const m of mesajlar) {
      const ad = m.karsiAd || '—';
      if (!harita.has(ad)) harita.set(ad, { ad, mesajlar: [], okunmamis: 0 });
      const s = harita.get(ad);
      s.mesajlar.push(m);
      if (!m.benden && !m.okundu) s.okunmamis++;
    }
    for (const s of harita.values()) {
      // Sunucu yeniden eskiye veriyor; sohbet içi akış eskiden yeniye okunur
      s.mesajlar.sort((a, b) => a.id - b.id);
      s.son = s.mesajlar[s.mesajlar.length - 1];
    }
    return [...harita.values()].sort((a, b) => b.son.id - a.son.id);
  }, [mesajlar]);

  const acik = useMemo(
    () => sohbetler.find(s => s.ad === acikAd) || null, [sohbetler, acikAd]);

  /*
    Sohbeti AÇMAK okunmuş sayar — listeye bakmak değil.

    Durum burada elle güncellenmiyor; okundu yazıldıktan sonra liste
    sunucudan tazeleniyor ve cevabı `mesaj_listesi` işleyicisi yazıyor.
    Effect içinde setState çağırmak zincirleme render üretiyor (React
    uyarısı) ve tek doğru kaynağı ikiye bölerdi.
  */
  useEffect(() => {
    if (!acik || !socket) return undefined;
    const okunmamislar = acik.mesajlar.filter(m => !m.benden && !m.okundu);
    if (!okunmamislar.length) return undefined;
    for (const m of okunmamislar) socket.emit('mesaj_okundu', { id: m.id });
    const z = setTimeout(() => socket.emit('mesaj_kutusu'), 250);
    return () => clearTimeout(z);
  }, [acik?.ad, acik?.mesajlar]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Yeni mesaj gelince akışın sonuna in
  useEffect(() => {
    const el = akisRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [acik?.ad, acik?.mesajlar.length]);

  const gonder = () => {
    if (gonderiliyor) return;
    const alici = acikAd;
    if (!alici) { setUyari('Önce bir oyuncu seç.'); return; }
    if (!taslak.trim()) { setUyari('Mesaj boş olamaz.'); return; }
    setGonderiliyor(true);
    socket?.emit('mesaj_gonder', { alici, govde: taslak });
  };

  const engelli = (ad) => engelliler.some(e => e.ad === ad);
  const engelDegistir = (ad) =>
    socket?.emit('mesaj_engelle', { ad, kaldir: engelli(ad) });

  const sohbetAc = (ad) => {
    setAcikAd(ad);
    setYeniAliciAcik(false);
    setArama('');
    setTaslak('');
  };

  const alan = {
    width: '100%', padding: '8px 10px', borderRadius: 5,
    background: 'rgba(4,9,15,0.75)', border: `1px solid ${C.lineSoft}`,
    color: C.frost, fontFamily: FONT.ui, fontSize: 11.5, outline: 'none',
  };

  // ── Sol sütun: sohbet listesi + yeni sohbet ──
  const solSutun = (
    <div style={panel({ padding: 8, display: 'flex', flexDirection: 'column', gap: 7,
      maxHeight: vp.mobile ? 'none' : 'calc(var(--tn-vh) * 0.72)' })}>
      <button onClick={() => { setYeniAliciAcik(v => !v); setArama(''); }}
        style={btn(yeniAliciAcik ? 'primary' : 'good',
          { padding: '7px 0', fontSize: 9.5, letterSpacing: 1.2 })}>
        {yeniAliciAcik ? 'VAZGEÇ' : 'YENİ SOHBET'}
      </button>

      {/*
        OYUNCU SEÇİCİ — hem listeden seç hem elle yaz.

        Sunucu en fazla 40 ad döndürüyor; binlerce oyuncuda tam listeyi
        yollamak paketi şişirir ve kutuyu okunmaz yapar. Aradığın kişi
        listede çıkmıyorsa adını yazıp doğrudan açabiliyorsun.
      */}
      {yeniAliciAcik && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <input value={arama} autoFocus maxLength={18}
            onChange={(e) => setArama(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && arama.trim()) sohbetAc(arama.trim()); }}
            placeholder="Oyuncu adı yaz ya da aşağıdan seç"
            style={alan} />
          <div className="tn-scroll" style={{
            maxHeight: 220, overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            {oyuncular.length === 0 ? (
              <div style={{
                padding: '8px 6px', fontFamily: FONT.ui, fontSize: 9.5,
                color: C.textMute, lineHeight: 1.6,
              }}>
                {arama ? 'Eşleşen oyuncu yok — adı tam yazıp Enter\'a basabilirsin.'
                  : 'Oyuncular yükleniyor…'}
              </div>
            ) : oyuncular.map(ad => (
              <button key={ad} onClick={() => sohbetAc(ad)}
                style={{
                  textAlign: 'left', padding: '6px 9px', borderRadius: 5, cursor: 'pointer',
                  background: 'rgba(8,17,28,0.55)', border: `1px solid ${C.lineSoft}`,
                  fontFamily: FONT.ui, fontSize: 11, color: C.textDim,
                }}>
                {ad}{engelli(ad) && (
                  <span style={{ color: C.warn, fontSize: 9 }}> · engelli</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {!yeniAliciAcik && (
        <div className="tn-scroll" style={{
          overflowY: 'auto', minHeight: 0,
          display: 'flex', flexDirection: 'column', gap: 5,
        }}>
          {sohbetler.length === 0 ? (
            <div style={{
              padding: 16, textAlign: 'center',
              fontFamily: FONT.ui, fontSize: 10.5, color: C.textMute, lineHeight: 1.7,
            }}>
              Henüz kimseyle yazışmadın. <b style={{ color: C.iceSoft }}>YENİ SOHBET</b> ile
              bir oyuncu seç.
            </div>
          ) : sohbetler.map(s => (
            <SohbetSatiri key={s.ad} s={s} secili={s.ad === acikAd}
              onClick={() => sohbetAc(s.ad)} />
          ))}
        </div>
      )}
    </div>
  );

  // ── Sağ sütun: açık sohbet ──
  const sagSutun = acik || acikAd ? (
    <div style={panel({
      padding: 0, display: 'flex', flexDirection: 'column',
      height: vp.mobile ? 'auto' : 'calc(var(--tn-vh) * 0.72)',
    })}>
      {/* Başlık */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap',
        padding: '11px 14px', borderBottom: `1px solid ${C.lineSoft}`,
      }}>
        {vp.mobile && (
          <button onClick={() => setAcikAd(null)}
            style={btn('ghost', { padding: '5px 10px', fontSize: 9 })}>‹</button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT.head, fontSize: 16, color: C.frost,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{acikAd}</div>
          <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textMute }}>
            {acik ? `${acik.mesajlar.length} mesaj` : 'yeni sohbet'}
            {engelli(acikAd) && <span style={{ color: C.warn }}> · engelli</span>}
          </div>
        </div>
        <button onClick={() => engelDegistir(acikAd)}
          title={engelli(acikAd)
            ? 'Bu oyuncu yeniden mesaj gönderebilsin'
            : 'Bu oyuncudan mesaj alma'}
          style={btn('ghost', { padding: '6px 11px', fontSize: 9, letterSpacing: 0.8 })}>
          {engelli(acikAd) ? 'ENGELİ KALDIR' : 'ENGELLE'}
        </button>
      </div>

      {/* Akış */}
      <div ref={akisRef} className="tn-scroll" style={{
        flex: 1, minHeight: vp.mobile ? 220 : 0, overflowY: 'auto',
        padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {!acik ? (
          <div style={{
            margin: 'auto', textAlign: 'center',
            fontFamily: FONT.ui, fontSize: 10.5, color: C.textMute, lineHeight: 1.7,
          }}>
            <b style={{ color: C.iceSoft }}>{acikAd}</b> ile ilk mesajını aşağıya yaz.
          </div>
        ) : acik.mesajlar.map(m => (
          <Balon key={m.id} m={m}
            onSil={(id) => socket?.emit('mesaj_sil', { id })} />
        ))}
      </div>

      {/* Yazma */}
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.lineSoft}` }}>
        {/*
          KONU ALANI YOK.

          Sohbet görünümünde konu satırı işe yaramıyordu: aynı kişiyle
          süren bir yazışmada her mesaja başlık yazmak (ya da boş
          bırakıp ilk satırdan türetilmesini izlemek) yalnız gürültü.
          Sunucu konuyu yine gövdenin ilk satırından üretiyor — eski
          mesajların ve veritabanı alanının bozulmaması için.
        */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea value={taslak} maxLength={GOVDE_EN_COK} rows={vp.mobile ? 3 : 3}
            onChange={(e) => setTaslak(e.target.value)}
            onKeyDown={(e) => {
              // Ctrl+Enter gönderir; düz Enter satır atlar (uzun mesaj yazılabilsin)
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); gonder(); }
            }}
            placeholder="Mesajını yaz…  (Ctrl+Enter gönderir)"
            style={{ ...alan, resize: 'vertical', lineHeight: 1.6 }} />
          <button onClick={gonder} disabled={gonderiliyor}
            style={btn('primary', {
              flexShrink: 0, padding: '10px 16px', letterSpacing: 1.2,
              opacity: gonderiliyor ? 0.6 : 1,
            })}>
            {gonderiliyor ? '…' : 'GÖNDER'}
          </button>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'flex-end', marginTop: 3,
        }}>
          <span style={num({
            fontSize: 9,
            color: taslak.length > GOVDE_EN_COK - 100 ? C.warn : C.textFaint,
          })}>{taslak.length}/{GOVDE_EN_COK}</span>
        </div>
      </div>
    </div>
  ) : (
    <div style={panel({
      padding: 20, minHeight: 240, display: 'grid', placeItems: 'center',
      fontFamily: FONT.ui, fontSize: 11, color: C.textMute, textAlign: 'center',
    })}>
      Soldan bir sohbet seç ya da <b style={{ color: C.iceSoft }}>&nbsp;YENİ SOHBET&nbsp;</b> aç.
    </div>
  );

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '10px 0 24px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, flexWrap: 'wrap',
      }}>
        <Icon name="bilgi" size={14} color={C.iceDeep} />
        <span style={lbl({ fontSize: 9, letterSpacing: 1.5 })}>Mesajlar</span>
        <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute }}>
          · {sohbetler.length} sohbet
        </span>
        <span style={{
          marginLeft: 'auto', fontFamily: FONT.ui, fontSize: 9, color: C.textFaint,
        }}>
          Adın <b style={{ color: C.textMute }}>{playerName || '—'}</b> olarak görünür.
        </span>
      </div>

      {uyari && (
        <div style={{
          marginBottom: 10, padding: '8px 11px', borderRadius: 6,
          fontFamily: FONT.ui, fontSize: 11, color: '#ffb8bd',
          background: 'rgba(255,111,120,0.10)', border: `1px solid ${C.dangerDim}`,
        }}>{uyari}</div>
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
            <button key={e.userId} onClick={() => engelDegistir(e.ad)} title="Engeli kaldır"
              style={btn('ghost', { padding: '2px 8px', fontSize: 9 })}>
              {e.ad} ✕
            </button>
          ))}
        </div>
      )}

      {/* Telefonda tek sütun: sohbet açıkken liste gizlenir — iki sütun
          375 px'e sığmıyor, ikisi de okunmaz oluyordu. */}
      <div style={{
        display: vp.mobile ? 'block' : 'grid',
        gridTemplateColumns: '300px 1fr', gap: 12, alignItems: 'start',
      }}>
        {(!vp.mobile || !acikAd) && solSutun}
        {(!vp.mobile || acikAd) && sagSutun}
      </div>

      <div style={{
        marginTop: 12, fontFamily: FONT.ui, fontSize: 9, color: C.textFaint, lineHeight: 1.6,
      }}>
        Rahatsız eden bir oyuncuyu sohbetin başındaki <b>ENGELLE</b> ile susturabilirsin;
        engellediğin kişi bunu göremez, mesajı sana ulaşmaz. Sildiğin mesaj yalnız
        senin kutundan kalkar.
      </div>
    </div>
  );
}
