/**
 * REHBER — görev zinciri arayüzü.
 *
 * Üç parça:
 *   Spotlight   ekranı karartıp hedef öğenin etrafını kesip yanıp söndürür
 *   QuestCard   sağ altta yüzen aktif görev kartı (kapatılınca rozete iner)
 *   QuestScreen "Görevler" sekmesindeki tam liste
 *
 * Durum SUNUCUDA: koşullar orada ölçülüyor, ödül orada veriliyor. Burası
 * yalnız gösterim ve iki olay: claim_quest, toggle_quests.
 *
 * Spotlight hedefi `data-tut="..."` özniteliğiyle işaretlenen öğedir;
 * bulunamazsa hiçbir şey çizilmez (arayüz değişse de patlamaz).
 */
import { useEffect, useState } from 'react';
import { C, FONT, btn, label as lbl, num } from '../theme';
import { RES_LABEL } from '../flows';
import Icon from './Icons';

/* ── Ödül rozetleri ──────────────────────────────────────────────── */
function Reward({ reward = {}, size = 9 }) {
  const { res = {}, isci = 0, kp = 0 } = reward;
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
      {Object.entries(res).map(([r, a]) => (
        <span key={r} title={RES_LABEL[r] || r}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <Icon name={r} size={size + 1} color={C.goldSoft} />
          <span style={num({ fontSize: size, color: C.textDim })}>{a}</span>
        </span>
      ))}
      {isci > 0 && (
        <span title="Boş işçi" style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <Icon name="isci" size={size + 1} color={C.iceSoft} />
          <span style={num({ fontSize: size, color: C.textDim })}>{isci}</span>
        </span>
      )}
      {kp > 0 && (
        <span title="Kültür puanı" style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <Icon name="bonus" size={size + 1} color="#a99cf0" />
          <span style={num({ fontSize: size, color: C.textDim })}>{kp}</span>
        </span>
      )}
    </div>
  );
}

/* ── Spotlight ───────────────────────────────────────────────────── */
export function Spotlight({ anchor, on }) {
  const [box, setBox] = useState(null);

  useEffect(() => {
    if (!on || !anchor) { setBox(null); return undefined; }
    let raf = 0;
    const olc = () => {
      const el = document.querySelector(`[data-tut="${anchor}"]`);
      if (!el) { setBox(null); return; }
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) { setBox(null); return; }
      /*
        HEDEF GERÇEKTEN GÖRÜNÜYOR MU?
        Bina paneli gibi bir pencere açıkken hedef arkada kalıyor ve halka
        pencerenin üstünde boşlukta duruyordu. Merkez noktadaki en üst
        öğe hedefin kendisi (ya da içindeki bir şey) değilse çizme.
      */
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const ust = document.elementFromPoint(cx, cy);
      /*
        Dolgusuz SVG şekilleri (sur çemberi gibi) merkez noktada isabet
        vermez; aynı SVG'nin içinden bir şey dönüyorsa görünür sayılır.
        Panel HTML olduğu için "üstünü kapatan pencere" ayrımı bozulmaz.
      */
      const svg = el.ownerSVGElement || (el.tagName === 'svg' ? el : null);
      const gorunur = ust && (el === ust || el.contains(ust) || ust.contains(el)
        || (svg && svg.contains(ust)));
      if (!gorunur) { setBox(null); return; }
      setBox({ x: r.left, y: r.top, w: r.width, h: r.height });
    };
    olc();
    // Sekme değişimi, kaydırma, yeniden boyutlanma: konumu takip et
    const tik = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(olc); };
    window.addEventListener('resize', tik);
    window.addEventListener('scroll', tik, true);
    const iv = setInterval(olc, 600);
    return () => {
      cancelAnimationFrame(raf); clearInterval(iv);
      window.removeEventListener('resize', tik);
      window.removeEventListener('scroll', tik, true);
    };
  }, [anchor, on]);

  if (!box) return null;
  const pad = 6;
  const x = box.x - pad, y = box.y - pad;
  const w = box.w + pad * 2, h = box.h + pad * 2;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, pointerEvents: 'none' }}>
      {/* Halka — tıklamayı engellemez, yalnız gösterir */}
      <div className="tn-pulse" style={{
        position: 'fixed', left: x, top: y, width: w, height: h,
        borderRadius: 10, border: '2px solid #ffd36b',
        boxShadow: '0 0 0 3px rgba(255,211,107,0.25), 0 0 26px 6px rgba(255,211,107,0.35)',
      }} />
    </div>
  );
}

/* ── Sağ altta yüzen kart ────────────────────────────────────────── */
export function QuestCard({ quests, onClaim, onToggle, onGoTab, focus = null, mobile = false,
  bastir = false }) {
  /**
   * TELEFONDA VARSAYILAN ROZET.
   *
   * Genişletilmiş kart 320×213 ve ekranın sağ-altına sabitli. 414×896'lık
   * bir iPhone'da bu, ekranın ALT ÜÇTE BİRİ demek: Ordu, Köylüler,
   * Raporlar ve İstatistik ekranlarında listelerin altı kartın arkasında
   * kalıyordu — panel açık olmadığı için `bastir` da devreye girmiyordu.
   *
   * Telefonda kart rozetle başlıyor, dokununca açılıyor. Bu YEREL bir
   * durum: sunucudaki `quests.hidden` tercihine dokunmuyor, yani
   * masaüstünde oyuncunun gizleme kararı aynen korunuyor.
   */
  const [mobilAcik, setMobilAcik] = useState(false);
  if (!quests || quests.bitti) return null;
  // Oyuncu listeden bir görev seçtiyse kart onu gösterir
  const secili = focus && quests.liste.find(q => q.id === focus && !q.alindi);
  const aktif = secili || quests.liste.find(q => q.id === quests.aktif);
  if (!aktif) return null;

  /**
   * ROZETE İN — oyuncu gizlediği için ya da EKRANDA BİR PANEL AÇIK olduğu için.
   *
   * Genişletilmiş kart (320x213) ekranın sağ-alt köşesine sabitli; oyunun en
   * sık kullanılan denetimleri de oraya konuyor. Ölçüldü (1280x600):
   *   YÜKSELT düğmesi       %68 örtülü, merkezi tıklanamıyor
   *   işçi "+" düğmesi      %100 örtülü
   *   KÖYÜME DÖN (harita)   %100 örtülü
   * Telefonda (375x812) yükselt düğmesinin 15 noktasından SIFIRI tıklanabiliyordu:
   * kart bina panelini komple yutuyordu. Rozet biçimi (73x31) aynı ölçümde hiçbir
   * denetimi örtmüyor — o yüzden panel açıkken kart rozete iniyor.
   *
   * `bastir` SUNUCU durumuna dokunmuyor: panel kapanınca kart kendiliğinden geri
   * açılır, oyuncunun gizleme tercihi (quests.hidden) ayrı durur.
   */
  if (quests.hidden || bastir || (mobile && !mobilAcik)) {
    return (
      <button
        onClick={() => {
          if (quests.hidden) onToggle(false);
          if (mobile) setMobilAcik(true);
        }}
        title="Rehberi aç"
        style={{
          position: 'fixed', bottom: mobile ? 74 : 52, zIndex: 1200,
          /*
            Panel açıkken rozet SOLA geçiyor. Panelin denetimleri kendi sağ-alt
            köşesinde duruyor; rozet sağda kalınca telefonda YÜKSELT düğmesinin
            15 noktasından 3'ünü örtmeye devam ediyordu (ölçüldü). Sol-alt köşede
            yalnızca bina adı var — tıklanabilir bir şey yok.
          */
          ...(bastir ? { left: 14 } : { right: 14 }),
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 11px', borderRadius: 20, cursor: 'pointer',
          background: 'rgba(8,15,24,0.92)',
          border: `1px solid ${aktif.tamam ? C.good : C.lineBright}`,
        }}>
        <Icon name="bilgi" size={13} color={aktif.tamam ? C.good : C.iceDeep} />
        <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.frost }}>
          {aktif.tamam ? 'Ödülün hazır' : 'Rehber'}
        </span>
      </button>
    );
  }

  return (
    <div className="tn-rise" style={{
      position: 'fixed', right: 14, bottom: mobile ? 74 : 52, zIndex: 1200,
      width: 'min(320px, 92vw)',
      background: 'rgba(8,15,24,0.95)',
      border: `1px solid ${aktif.tamam ? 'rgba(108,221,163,0.5)' : C.lineBright}`,
      borderRadius: 10, padding: 12,
      boxShadow: '0 18px 44px rgba(0,0,0,0.6)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <Icon name="bilgi" size={14} color={C.iceDeep} />
        <span style={lbl({ fontSize: 8, letterSpacing: 1.4, flex: 1 })}>Rehber</span>
        <span style={num({ fontSize: 9, color: C.textMute })}>
          {quests.liste.filter(q => q.alindi).length}/{quests.liste.length}
        </span>
        {/* Telefonda kapatmak yalnız kartı toplar; sunucudaki gizleme
            tercihi masaüstüne ait, onu bozmuyoruz. */}
        <button onClick={() => (mobile ? setMobilAcik(false) : onToggle(true))}
          title="Rehberi gizle (görevler işlemeye devam eder)"
          style={{
            width: 20, height: 20, padding: 0, display: 'grid', placeItems: 'center',
            borderRadius: 10, cursor: 'pointer',
            background: 'rgba(8,14,24,0.7)', border: `1px solid ${C.lineSoft}`,
          }}>
          <Icon name="kapat" size={10} color={C.textDim} strokeWidth={2} />
        </button>
      </div>

      <div style={{
        fontFamily: FONT.head, fontSize: 14, fontWeight: 600,
        color: C.frost, marginBottom: 4,
      }}>{aktif.title}</div>

      <div style={{
        fontFamily: FONT.ui, fontSize: 10, lineHeight: 1.55, color: C.textDim, marginBottom: 6,
      }}>{aktif.text}</div>

      {!aktif.tamam && aktif.hint && (
        <div style={{
          display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 7,
          padding: '5px 7px', borderRadius: 5,
          background: 'rgba(143,220,255,0.06)', border: `1px solid ${C.lineSoft}`,
        }}>
          <Icon name="bilgi" size={10} color={C.ice} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontFamily: FONT.ui, fontSize: 9, lineHeight: 1.5, color: C.textFaint }}>
            {aktif.hint}
          </span>
        </div>
      )}

      {/* İlerleme çubuğu — koşul sayısal olduğu için hep gösterilebilir */}
      <div style={{ marginBottom: 8 }}>
        <div style={{
          height: 5, borderRadius: 3, overflow: 'hidden',
          background: 'rgba(8,17,28,0.8)', border: `1px solid ${C.lineSoft}`,
        }}>
          <div style={{
            width: `${Math.min(100, (aktif.olculen / Math.max(1, aktif.hedef)) * 100)}%`,
            height: '100%', background: aktif.tamam ? C.good : C.iceDeep,
            transition: 'width .3s',
          }} />
        </div>
        <div style={{
          display: 'flex', marginTop: 3, fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute,
        }}>
          <span style={{ flex: 1 }}>ilerleme</span>
          <span style={num({ color: aktif.tamam ? C.good : C.textDim })}>
            {aktif.olculen}/{aktif.hedef}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={lbl({ fontSize: 7.5, marginBottom: 2 })}>Ödül</div>
          <Reward reward={aktif.reward} />
        </div>
        {aktif.tamam ? (
          <button onClick={() => onClaim(aktif.id)}
            style={btn('good', { padding: '7px 12px', fontSize: 10, letterSpacing: 0.8 })}>
            ÖDÜLÜ AL
          </button>
        ) : (
          <button onClick={() => onGoTab?.(aktif.tab)}
            title="Görevin yapılacağı ekrana git"
            style={btn('ghost', { padding: '7px 12px', fontSize: 10, letterSpacing: 0.8 })}>
            GÖSTER
          </button>
        )}
      </div>
    </div>
  );
}

/* ── "Görevler" sekmesi ──────────────────────────────────────────── */
export default function QuestScreen({ quests, onClaim, onToggle, onGoTab, onFocus, focus = null }) {
  if (!quests) {
    return (
      <div style={{ padding: 20, fontFamily: FONT.ui, fontSize: 11, color: C.textMute }}>
        Görev listesi yükleniyor…
      </div>
    );
  }
  const alinan = quests.liste.filter(q => q.alindi).length;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '12px 0 24px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12,
        padding: '10px 12px', borderRadius: 8,
        background: 'rgba(8,17,28,0.55)', border: `1px solid ${C.lineSoft}`,
      }}>
        <Icon name="bilgi" size={16} color={C.iceDeep} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT.head, fontSize: 15, color: C.frost }}>Rehber görevleri</div>
          <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint }}>
            Sırayla ilerler; rehberi kapatsan da görevler işlemeye devam eder.
          </div>
        </div>
        <span style={num({ fontSize: 13, color: C.frost })}>
          {alinan}<span style={{ color: C.textMute }}>/{quests.liste.length}</span>
        </span>
        <button onClick={() => onToggle(!quests.hidden)}
          style={btn(quests.hidden ? 'primary' : 'ghost', { padding: '6px 10px', fontSize: 9.5 })}>
          {quests.hidden ? 'REHBERİ AÇ' : 'REHBERİ KAPAT'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {quests.liste.map((q, i) => {
          const aktif = q.id === (focus || quests.aktif);
          return (
            <div key={q.id}
              onClick={() => !q.alindi && onFocus?.(q.id)}
              title={q.alindi ? undefined : 'Bu görevi karta al'}
              style={{
              cursor: q.alindi ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
              flexWrap: 'wrap', rowGap: 6,
              padding: '9px 11px', borderRadius: 7,
              background: q.alindi ? 'rgba(78,207,168,0.05)' : 'rgba(8,17,28,0.55)',
              border: `1px solid ${q.alindi ? 'rgba(78,207,168,0.22)'
                : aktif ? C.lineBright : C.lineSoft}`,
              opacity: q.alindi ? 0.75 : 1,
            }}>
              <span style={num({ fontSize: 10, color: C.textMute, width: 18 })}>{i + 1}</span>
              <Icon name={q.alindi ? 'bonus' : aktif ? 'bilgi' : 'kilit'} size={13}
                color={q.alindi ? C.good : aktif ? C.iceSoft : C.textMute} />
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{
                  fontFamily: FONT.ui, fontSize: 11.5, fontWeight: 500,
                  color: q.alindi ? C.textDim : C.frost,
                }}>{q.title}</div>
                <div style={{
                  fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint,
                  /*
                    TEK SATIR + ellipsis TELEFONDA GÖREVİ OKUNAMAZ YAPIYORDU:
                    415 px'lik ekranda bu sütuna yalnız 131 px kalıyor, ölçüldü —
                    açıklamanın ilk üç kelimesi dışında hepsi kesiliyordu.
                    Artık sarıyor; satır yüksekliği de kaçmasın diye 2 satırda
                    kırpılıyor.
                  */
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                  overflow: 'hidden',
                  overflowWrap: 'anywhere',
                }}>{q.text}</div>
              </div>
              {/*
                ÖDÜL · SAYAÇ · DÜĞME TEK GRUP.
                Ayrı kardeşlerken satır sarmıyordu ve açıklamaya 375 px'lik
                ekranda yalnız 91 px kalıyordu. Grup halinde, sığmadığı anda
                tamamı alt satıra iniyor; başlık ve açıklama tam genişliği
                alıyor. Geniş ekranda davranış değişmiyor — orada sığıyor.
              */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginLeft: 'auto', flex: '0 0 auto',
              }}>
              <Reward reward={q.reward} size={8.5} />
              <span style={num({ fontSize: 9.5, color: q.tamam ? C.good : C.textMute, width: 46, textAlign: 'right' })}>
                {q.olculen}/{q.hedef}
              </span>
              {q.alindi ? (
                <span style={{ fontFamily: FONT.ui, fontSize: 9, color: C.good, width: 62, textAlign: 'right' }}>
                  alındı
                </span>
              ) : q.tamam ? (
                <button onClick={() => onClaim(q.id)}
                  style={btn('good', { padding: '5px 9px', fontSize: 9, width: 62 })}>
                  ÖDÜL
                </button>
              ) : (
                <button onClick={() => onGoTab?.(q.tab)}
                  style={btn('ghost', { padding: '5px 9px', fontSize: 9, width: 62 })}>
                  GÖSTER
                </button>
              )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
