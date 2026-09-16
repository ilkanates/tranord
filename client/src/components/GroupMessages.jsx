/**
 * GRUP MESAJLARI — konulu, çok kişili yazışma.
 *
 * İlkan'ın tarifi: *"mesajlaşmalarda yeni bir mesaj kısmı oluştur birlik
 * oyuncuları için. yeni mesaj grubu oluşturulabilsin, bu bir kişi ya da
 * birden fazla kişi olabilsin ya da direk birlik seçilebilsin. mesaj
 * gruplarında konu yazılabilmeli. mesela defans konulu bir birlik içi
 * toplu mesajlaşma yapılabilmeli."*
 *
 * DOĞRUDAN MESAJDAN AYRI BİR EKRAN, aynı ekranın içinde bir sekme değil
 * bir liste karışımı: ikisinin listesi birbirine karışsaydı "bu kime
 * gidiyor" sorusu her satırda yeniden sorulurdu. Grup yazışmasında
 * yanlış kişiye yazmak, bir savunma planını düşmana yazmak olabilir.
 *
 * DURUM SUNUCUDA. Liste (`grup_listesi`) son mesajı ve okunmamış sayısını
 * hazır getiriyor; akış ayrı isteniyor (`grup_ac`). Açık olmayan grubun
 * bütün mesajlarını taşımak, altmış kişilik bir birlikte her ekran
 * açılışında bütün yazışmayı indirmek olurdu.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { C, FONT, panel, btn, num } from '../theme';
import { useViewport } from '../responsive';
import Icon from './Icons';

const GOVDE_EN_COK = 2000;
const KONU_EN_COK = 60;
const EN_COK_UYE = 20;

function fmtZaman(at) {
  if (!at) return '';
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  const hm = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const bugun = d.toDateString() === new Date().toDateString();
  return bugun ? hm
    : `${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} ${hm}`;
}

/** Liste satırı — konu, son mesaj, okunmamış sayısı */
function GrupSatiri({ g, secili, onClick }) {
  const birlikMi = g.tip === 'birlik';
  const kenar = secili ? C.lineBright : g.okunmamis ? `${C.ice}3d` : C.lineSoft;
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
      padding: '9px 10px', borderRadius: 6,
      background: secili ? 'rgba(143,220,255,0.12)'
        : g.okunmamis ? 'rgba(14,28,44,0.72)' : 'rgba(8,15,23,0.34)',
      /*
        DÖRT KENAR AYRI YAZILIYOR, `border` kısayolu YOK: kısayolla sol
        kenarı birlikte kullanmak React'in yeniden çizimde ikisini ayrı
        uygulamasına ve sıraya bağlı bir sonuca yol açıyor (konsolda
        uyarı veriyordu). Sol şerit anlam taşıdığı için kaybolması
        sessiz bir gerileme olurdu.

        BİRLİK GRUBU YEŞİL ŞERİTLE ayrılıyor — haritadaki birlik
        çerçevesiyle aynı renk. Oyuncu "bu yazdığım bütün birliğe mi
        gidiyor" sorusunu satıra bakarak cevaplayabilmeli.
      */
      borderTop: `1px solid ${kenar}`,
      borderRight: `1px solid ${kenar}`,
      borderBottom: `1px solid ${kenar}`,
      borderLeft: `3px solid ${birlikMi ? '#7fe04d' : g.okunmamis ? C.ice : C.line}`,
      opacity: g.okunmamis || secili ? 1 : 0.76,
    }}>
      <div style={{
        display: 'grid', placeItems: 'center', flexShrink: 0,
        width: 28, height: 28, borderRadius: 6,
        background: birlikMi ? 'rgba(127,224,77,0.12)' : 'rgba(127,212,255,0.10)',
        border: `1px solid ${birlikMi ? 'rgba(127,224,77,0.35)' : C.lineSoft}`,
      }}>
        <Icon name={birlikMi ? 'kalkan' : 'bilgi'} size={13}
          color={birlikMi ? '#7fe04d' : C.iceSoft} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT.ui, fontSize: 11.5,
          fontWeight: g.okunmamis ? 600 : 500,
          color: g.okunmamis ? C.frost : C.textDim,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{g.konu}</div>
        <div style={{
          fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute, marginTop: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {g.son
            ? <>{g.son.ad && <span style={{ color: C.textFaint }}>{g.son.ad}: </span>}
              {g.son.govde}</>
            : <span style={{ color: C.textFaint }}>henüz mesaj yok</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {g.okunmamis > 0 && (
          <span style={num({
            fontSize: 9, color: '#04121c', background: C.ice,
            padding: '1px 6px', borderRadius: 8,
          })}>{g.okunmamis}</span>
        )}
        <div style={num({ fontSize: 8.5, color: C.textFaint, marginTop: 3 })}>
          {fmtZaman(g.son?.at || g.at)}
        </div>
      </div>
    </div>
  );
}

/** Tek mesaj balonu — grupta GÖNDEREN ADI şart, kim yazdı belli olmalı */
function Balon({ m, benim }) {
  return (
    <div style={{
      display: 'flex', justifyContent: benim ? 'flex-end' : 'flex-start',
    }}>
      <div style={{
        maxWidth: '82%', padding: '7px 10px', borderRadius: 8,
        background: benim ? 'rgba(31,77,112,0.35)' : 'rgba(8,17,28,0.7)',
        border: `1px solid ${benim ? C.iceDeep : C.lineSoft}`,
      }}>
        {!benim && (
          <div style={{
            fontFamily: FONT.ui, fontSize: 9, color: C.iceSoft, marginBottom: 2,
          }}>{m.ad || 'bilinmeyen'}</div>
        )}
        <div style={{
          fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 1.65, color: C.textDim,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>{m.govde}</div>
        <div style={{ textAlign: 'right', marginTop: 4 }}>
          <span style={num({ fontSize: 8.5, color: C.textFaint })}>{fmtZaman(m.at)}</span>
        </div>
      </div>
    </div>
  );
}

export default function GroupMessages({ socket, birlik = null }) {
  const vp = useViewport();
  const [gruplar, setGruplar] = useState([]);
  const [acikId, setAcikId] = useState(null);
  const [akis, setAkis] = useState(null);          // { id, konu, tip, uyeler, mesajlar }
  const [taslak, setTaslak] = useState('');
  const [uyari, setUyari] = useState(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  // Yeni grup formu
  const [yeniAcik, setYeniAcik] = useState(false);
  const [konu, setKonu] = useState('');
  const [birlikMi, setBirlikMi] = useState(false);
  const [secilenler, setSecilenler] = useState([]);
  const [arama, setArama] = useState('');
  const [oyuncular, setOyuncular] = useState([]);
  const akisRef = useRef(null);

  const birlikteyim = !!birlik?.ad;

  // ── Sunucu bağlantısı ──
  useEffect(() => {
    if (!socket) return undefined;
    const onListe = (d) => setGruplar(d?.gruplar || []);
    const onAkis = (d) => { if (d?.id) setAkis(d); };
    const onSonuc = (d) => {
      setGonderiliyor(false);
      if (!d?.ok) { setUyari(d?.message || 'Grup işlemi yapılamadı.'); return; }
      if (d.kuruldu) {
        // Yeni grubu hemen aç — kurup boş listeye bakmak kafa karıştırıyor
        setYeniAcik(false); setKonu(''); setSecilenler([]); setBirlikMi(false);
        setAcikId(d.id);
        socket.emit('grup_ac', { id: d.id });
      }
      if (d.mesajId) setTaslak('');
      if (d.ayrildim || d.dagildi) { setAcikId(null); setAkis(null); }
    };
    /*
      YENİ MESAJ GELİNCE AÇIK GRUBU TAZELE. Yalnız açık olanı: kapalı
      grupların akışını çekmek her mesajda bütün yazışmaları indirmek
      olurdu, liste zaten son mesajı taşıyor.
    */
    const onGeldi = (d) => { if (d?.id && d.id === acikId) socket.emit('grup_ac', { id: d.id }); };
    const onOyuncu = (d) => setOyuncular(d?.liste || []);

    socket.on('grup_listesi', onListe);
    socket.on('grup_akis', onAkis);
    socket.on('grup_sonuc', onSonuc);
    socket.on('grup_mesaj_geldi', onGeldi);
    socket.on('grup_ac_yenile', onGeldi);
    socket.on('mesaj_oyuncu_listesi', onOyuncu);
    socket.emit('grup_listesi');
    return () => {
      socket.off('grup_listesi', onListe);
      socket.off('grup_akis', onAkis);
      socket.off('grup_sonuc', onSonuc);
      socket.off('grup_mesaj_geldi', onGeldi);
      socket.off('grup_ac_yenile', onGeldi);
      socket.off('mesaj_oyuncu_listesi', onOyuncu);
    };
  }, [socket, acikId]);

  useEffect(() => {
    if (!uyari) return undefined;
    const z = setTimeout(() => setUyari(null), 5000);
    return () => clearTimeout(z);
  }, [uyari]);

  // Oyuncu arama — doğrudan mesajla aynı olay ve aynı gecikme
  useEffect(() => {
    if (!yeniAcik || birlikMi || !socket) return undefined;
    const z = setTimeout(() => socket.emit('mesaj_oyuncular', { q: arama }), 180);
    return () => clearTimeout(z);
  }, [yeniAcik, birlikMi, arama, socket]);

  /*
    GRUBU AÇMAK OKUNMUŞ SAYAR. Son mesajın kimliği yollanıyor, mesaj
    başına değil: altmış kişilik bir grupta her mesaj için satır yazmak
    tek mesajda altmış yazma demekti.
  */
  useEffect(() => {
    if (!socket || !akis?.mesajlar?.length) return;
    const sonId = akis.mesajlar[akis.mesajlar.length - 1].id;
    socket.emit('grup_okundu', { id: akis.id, sonId });
  }, [socket, akis?.id, akis?.mesajlar?.length]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = akisRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [akis?.id, akis?.mesajlar?.length]);

  const acikGrup = useMemo(
    () => gruplar.find(g => g.id === acikId) || null, [gruplar, acikId]);

  const grupAc = (id) => {
    setAcikId(id); setTaslak(''); setAkis(null); setYeniAcik(false);
    socket?.emit('grup_ac', { id });
  };

  const gonder = () => {
    if (gonderiliyor || !acikId) return;
    if (!taslak.trim()) { setUyari('Mesaj boş olamaz.'); return; }
    setGonderiliyor(true);
    socket?.emit('grup_gonder', { id: acikId, govde: taslak });
  };

  const kur = () => {
    if (!konu.trim()) { setUyari('Grubun bir konusu olmalı.'); return; }
    if (!birlikMi && secilenler.length === 0) {
      setUyari('En az bir oyuncu seç ya da birliği seç.'); return;
    }
    socket?.emit('grup_kur', { konu, adlar: birlikMi ? [] : secilenler, birlik: birlikMi });
  };

  const secimDegistir = (ad) => setSecilenler(s =>
    s.includes(ad) ? s.filter(x => x !== ad) : (s.length >= EN_COK_UYE ? s : [...s, ad]));

  const alan = {
    width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 5,
    background: 'rgba(4,9,15,0.75)', border: `1px solid ${C.lineSoft}`,
    color: C.frost, fontFamily: FONT.ui, fontSize: 11.5, outline: 'none',
  };

  // ── Sol sütun: grup listesi + yeni grup ──
  const solSutun = (
    <div style={panel({ padding: 8, display: 'flex', flexDirection: 'column', gap: 7,
      maxHeight: vp.mobile ? 'none' : 'calc(var(--tn-vh) * 0.72)' })}>
      <button onClick={() => { setYeniAcik(v => !v); setArama(''); }}
        style={btn(yeniAcik ? 'primary' : 'good',
          { padding: '7px 0', fontSize: 9.5, letterSpacing: 1.2 })}>
        {yeniAcik ? 'VAZGEÇ' : 'YENİ GRUP'}
      </button>

      {yeniAcik && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/*
            KONU ÖNCE SORULUYOR. Grubun konusu kalıcı bir başlık, tek
            mesajın özeti değil — İlkan'ın örneği "defans konulu bir
            birlik içi toplu mesajlaşma".
          */}
          <input value={konu} maxLength={KONU_EN_COK} autoFocus
            onChange={(e) => setKonu(e.target.value)}
            placeholder="Konu — örn. Defans çağrısı"
            style={alan} />

          {/*
            BİRLİĞİ SEÇMEK ÜYE SEÇMENİN YERİNE GEÇİYOR, yanına değil:
            birlik grubunun katılımcıları birliğin O ANKİ üyeleri, elle
            seçilen bir liste değil. İkisi birden açık olsaydı "hem
            birlik hem şu üç kişi" beklentisi doğardı ve sunucu elle
            seçilenleri atıyor.
          */}
          <label title={birlikteyim ? '' : 'Bir birlikte değilsin'}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 9px', borderRadius: 5,
              cursor: birlikteyim ? 'pointer' : 'not-allowed',
              opacity: birlikteyim ? 1 : 0.45,
              background: birlikMi ? 'rgba(127,224,77,0.10)' : 'rgba(8,17,28,0.55)',
              border: `1px solid ${birlikMi ? 'rgba(127,224,77,0.45)' : C.lineSoft}`,
            }}>
            <input type="checkbox" checked={birlikMi} disabled={!birlikteyim}
              onChange={(e) => setBirlikMi(e.target.checked)} />
            <Icon name="kalkan" size={12} color={birlikMi ? '#7fe04d' : C.textMute} />
            <span style={{
              fontFamily: FONT.ui, fontSize: 10.5,
              color: birlikMi ? '#d6f5c2' : C.textDim,
            }}>
              Tüm birlik{birlik?.ad ? ` · ${birlik.ad}` : ''}
            </span>
          </label>

          {!birlikMi && (
            <>
              <input value={arama} maxLength={18}
                onChange={(e) => setArama(e.target.value)}
                placeholder="Oyuncu ara…" style={alan} />
              {secilenler.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {secilenler.map(ad => (
                    <button key={ad} onClick={() => secimDegistir(ad)} title="Çıkar"
                      style={btn('ghost', { padding: '2px 8px', fontSize: 9 })}>
                      {ad} ✕
                    </button>
                  ))}
                </div>
              )}
              <div className="tn-scroll" style={{
                maxHeight: 190, overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: 3,
              }}>
                {oyuncular.length === 0 ? (
                  <div style={{
                    padding: '8px 6px', fontFamily: FONT.ui, fontSize: 9.5,
                    color: C.textMute,
                  }}>{arama ? 'Eşleşen oyuncu yok.' : 'Oyuncular yükleniyor…'}</div>
                ) : oyuncular.map(ad => {
                  const secili = secilenler.includes(ad);
                  return (
                    <button key={ad} onClick={() => secimDegistir(ad)}
                      style={{
                        textAlign: 'left', padding: '6px 9px', borderRadius: 5,
                        cursor: 'pointer', fontFamily: FONT.ui, fontSize: 11,
                        background: secili ? 'rgba(127,212,255,0.12)' : 'rgba(8,17,28,0.55)',
                        border: `1px solid ${secili ? C.lineBright : C.lineSoft}`,
                        color: secili ? C.frost : C.textDim,
                      }}>
                      {secili ? '✓ ' : ''}{ad}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint }}>
                {secilenler.length}/{EN_COK_UYE} oyuncu — daha kalabalığı için birliği seç.
              </div>
            </>
          )}

          <button onClick={kur} style={btn('primary',
            { padding: '8px 0', fontSize: 9.5, letterSpacing: 1.2 })}>
            GRUBU KUR
          </button>
        </div>
      )}

      {!yeniAcik && (
        <div className="tn-scroll" style={{
          overflowY: 'auto', minHeight: 0,
          display: 'flex', flexDirection: 'column', gap: 5,
        }}>
          {gruplar.length === 0 ? (
            <div style={{
              padding: 16, textAlign: 'center',
              fontFamily: FONT.ui, fontSize: 10.5, color: C.textMute, lineHeight: 1.7,
            }}>
              Henüz bir grubun yok. <b style={{ color: C.iceSoft }}>YENİ GRUP</b> ile
              konu aç, birkaç oyuncu ya da bütün birliğin seç.
            </div>
          ) : gruplar.map(g => (
            <GrupSatiri key={g.id} g={g} secili={g.id === acikId}
              onClick={() => grupAc(g.id)} />
          ))}
        </div>
      )}
    </div>
  );

  // ── Sağ sütun: açık grup ──
  const benimId = akis?.benimId ?? null;
  const sagSutun = acikId ? (
    <div style={panel({
      padding: 0, display: 'flex', flexDirection: 'column',
      height: vp.mobile ? 'auto' : 'calc(var(--tn-vh) * 0.72)',
    })}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap',
        padding: '11px 14px', borderBottom: `1px solid ${C.lineSoft}`,
      }}>
        {vp.mobile && (
          <button onClick={() => { setAcikId(null); setAkis(null); }}
            style={btn('ghost', { padding: '5px 10px', fontSize: 9 })}>‹</button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT.head, fontSize: 16, color: C.frost,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{akis?.konu || acikGrup?.konu || '…'}</div>
          <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textMute }}>
            {akis?.tip === 'birlik'
              ? <span style={{ color: '#9ae06f' }}>
                Birlik yazışması{akis.birlikAd ? ` · ${akis.birlikAd}` : ''}
                {' '}· {akis.uyeler?.length || 0} üye
              </span>
              : `${akis?.uyeler?.length || 0} kişi`}
            {akis?.mesajlar ? ` · ${akis.mesajlar.length} mesaj` : ''}
          </div>
        </div>
        {/*
          BİRLİK YAZIŞMASINDAN AYRILMA DÜĞMESİ YOK: katılımcılık
          birliğin kendisi. Düğmeyi gösterip reddetmek oyuncuya
          yapamayacağı bir şeyi teklif etmek olurdu.
        */}
        {akis?.tip === 'ozel' && (
          akis.kurucuId === benimId ? (
            <button onClick={() => socket?.emit('grup_dagit', { id: acikId })}
              title="Grubu herkes için kapat"
              style={btn('ghost', { padding: '6px 11px', fontSize: 9, letterSpacing: 0.8 })}>
              GRUBU DAĞIT
            </button>
          ) : (
            <button onClick={() => socket?.emit('grup_ayril', { id: acikId })}
              style={btn('ghost', { padding: '6px 11px', fontSize: 9, letterSpacing: 0.8 })}>
              AYRIL
            </button>
          )
        )}
      </div>

      {/* Üyeler — grupta kimin okuduğu bilinmeli */}
      {akis?.uyeler?.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 4,
          padding: '7px 14px', borderBottom: `1px solid ${C.lineSoft}`,
        }}>
          {akis.uyeler.slice(0, 24).map(u => (
            <span key={u.userId} style={{
              fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute,
              padding: '2px 7px', borderRadius: 8,
              background: 'rgba(8,17,28,0.6)', border: `1px solid ${C.lineSoft}`,
            }}>{u.ad}</span>
          ))}
          {akis.uyeler.length > 24 && (
            <span style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint }}>
              +{akis.uyeler.length - 24}
            </span>
          )}
        </div>
      )}

      <div ref={akisRef} className="tn-scroll" style={{
        flex: 1, minHeight: vp.mobile ? 220 : 0, overflowY: 'auto',
        padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {!akis ? (
          <div style={{
            margin: 'auto', fontFamily: FONT.ui, fontSize: 10.5, color: C.textMute,
          }}>Yükleniyor…</div>
        ) : akis.mesajlar.length === 0 ? (
          <div style={{
            margin: 'auto', textAlign: 'center',
            fontFamily: FONT.ui, fontSize: 10.5, color: C.textMute, lineHeight: 1.7,
          }}>
            <b style={{ color: C.iceSoft }}>{akis.konu}</b> konusunda ilk sözü sen söyle.
          </div>
        ) : akis.mesajlar.map(m => (
          <Balon key={m.id} m={m} benim={m.userId === benimId} />
        ))}
      </div>

      <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.lineSoft}` }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea value={taslak} maxLength={GOVDE_EN_COK} rows={3}
            onChange={(e) => setTaslak(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); gonder(); }
            }}
            placeholder="Gruba yaz…  (Ctrl+Enter gönderir)"
            style={{ ...alan, resize: 'vertical', lineHeight: 1.6 }} />
          <button onClick={gonder} disabled={gonderiliyor}
            style={btn('primary', {
              flexShrink: 0, padding: '10px 16px', letterSpacing: 1.2,
              opacity: gonderiliyor ? 0.6 : 1,
            })}>
            {gonderiliyor ? '…' : 'GÖNDER'}
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
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
      lineHeight: 1.8,
    })}>
      Soldan bir grup seç ya da <b style={{ color: C.iceSoft }}>&nbsp;YENİ GRUP&nbsp;</b> aç.
      <br />
      <span style={{ fontSize: 10, color: C.textFaint }}>
        Bir konu yaz, birkaç oyuncu seç — ya da bütün birliğini.
      </span>
    </div>
  );

  return (
    <>
      {uyari && (
        <div style={{
          marginBottom: 10, padding: '8px 11px', borderRadius: 6,
          fontFamily: FONT.ui, fontSize: 11, color: '#ffb8bd',
          background: 'rgba(255,111,120,0.10)', border: `1px solid ${C.dangerDim}`,
        }}>{uyari}</div>
      )}

      <div style={{
        display: vp.mobile ? 'block' : 'grid',
        gridTemplateColumns: '300px 1fr', gap: 12, alignItems: 'start',
      }}>
        {(!vp.mobile || !acikId) && solSutun}
        {(!vp.mobile || acikId) && sagSutun}
      </div>

      <div style={{
        marginTop: 12, fontFamily: FONT.ui, fontSize: 9, color: C.textFaint, lineHeight: 1.6,
      }}>
        <b style={{ color: C.textMute }}>Birlik yazışması</b> birliğin O ANKİ üyelerine
        açıktır: birliğe katılan konuyu hazır bulur, birlikten çıkan aynı anda erişimini
        kaybeder. Aynı birlik için istediğin kadar konu açabilirsin.
      </div>
    </>
  );
}
