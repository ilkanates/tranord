/**
 * AYARLAR — üst bardaki dişli ve açtığı pencere.
 *
 * İlkan: *"bir ayarlar menüsü yapalım ve bütün ayarları oraya
 * dolduralım"*.
 *
 * Bugüne kadar tek ayar müzikti ve üst bardaki hoparlörün ARKASINA
 * gizlenmişti: oyuncunun "ayarlar nerede" sorusunun cevabı yoktu. Artık
 * var ve yeni her ayar buraya giriyor.
 *
 * ÜÇ BÖLÜM
 *   GÖRÜNÜM — arayüz ölçeği (yazı büyüklüğü)
 *   MÜZİK   — arka plan müziği
 *   SESLER  — ana ses + her olay için ayrı anahtar ve seviye
 *
 * Hoparlör düğmesi üst barda DURUYOR: tek tıkla susturmak sık yapılan
 * bir şey ve onu iki tık arkasına koymak bir iyileştirme olmazdı. İkisi
 * aynı depoyu yazıyor, ayrışamazlar.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, label as lbl, num } from '../theme';
import Icon from './Icons';
import {
  ayarlar, ayarlariDinle, olcekAyarla, sesAcikAyarla, sesSeviyesiAyarla,
  olayAyarla, ayarlariSifirla, SES_OLAYLARI, OLCEK_ADIMLARI,
  OLCEK_EN_AZ, OLCEK_EN_COK,
} from '../ayarlar';
import { setMuted, setVolume, nextTrack, subscribe } from '../audio';
import { sesCal } from '../ses';

export default function AyarlarMenu({ dar = false }) {
  const [acik, setAcik] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setAcik(true)} title="Ayarlar"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', display: 'grid',
          placeItems: 'center', padding: 0,
          width: dar ? 30 : 22, height: dar ? 30 : 22,
        }}>
        <Disli size={15} color={C.textMute} />
      </button>
      {/*
        PENCERE GÖVDEYE TAŞINIYOR (portal).

        Üst barda `backdropFilter` var; filtre uygulanan bir öğe, içindeki
        `position: fixed` katmanlar için YENİ bir kapsayıcı blok kuruyor.
        Sonuç ölçüldü: perde görüntü alanına değil üst bara göre
        hizalanıyor ve pencere ekranın üstünden taşıyordu (top: -177).
        Gövdeye taşımak filtreli atayı tamamen aradan çıkarıyor.
      */}
      {acik && createPortal(
        <AyarlarPenceresi onKapat={() => setAcik(false)} />, document.body)}
    </>
  );
}

/** Dişli — Icons.jsx'te bir ayar simgesi yok, tek kullanımlık olduğu için burada */
function Disli({ size = 15, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.6v2.2M12 19.2v2.2M21.4 12h-2.2M4.8 12H2.6M18.6 5.4l-1.6 1.6M7 17l-1.6 1.6M18.6 18.6L17 17M7 7L5.4 5.4" />
    </svg>
  );
}

function AyarlarPenceresi({ onKapat }) {
  const [a, setA] = useState(ayarlar);
  const [muzik, setMuzik] = useState({ muted: false, volume: 0.45, playing: false, track: '' });
  const [sekme, setSekme] = useState('gorunum');

  useEffect(() => ayarlariDinle(setA), []);
  useEffect(() => subscribe(setMuzik), []);

  /* ESC ile kapanmalı: pencere açıkken oyuna dokunulamıyor */
  useEffect(() => {
    const on = (e) => { if (e.key === 'Escape') onKapat(); };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onKapat]);

  const SEKMELER = [
    { id: 'gorunum', ad: 'Görünüm', ikon: 'bilgi' },
    { id: 'muzik', ad: 'Müzik', ikon: 'bilgi' },
    { id: 'sesler', ad: 'Sesler', ikon: 'bilgi' },
  ];

  return (
    <div
      onClick={onKapat}
      style={{
        position: 'fixed', top: 0, left: 0, zIndex: 9400,
        /*
          PENCERE DE ÖLÇEKLENİYOR. Portal gövdeye açıldığı için #root
          üzerindeki zoom buraya İŞLEMİYOR: yazıyı büyüten oyuncu, tam da
          büyütmeyi yaptığı pencereyi küçücük görüyordu. Aynı zoom burada
          da uygulanıyor; ölçüler ölçeğe BÖLÜNÜYOR ki perde tam olarak
          görüntü alanını kaplasın — inset:0 zoom ile çarpılıp taşardı.
        */
        zoom: 'var(--tn-olcek, 1)',
        width: 'calc(100vw / var(--tn-olcek, 1))',
        height: 'calc(100dvh / var(--tn-olcek, 1))',
        background: 'rgba(4,8,13,0.72)',
        display: 'grid', placeItems: 'center', padding: 14,
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, 100%)',
          /*
            TAVAN DA ÖLÇEĞE BÖLÜNÜYOR. Düz 86vh, zoom ile çarpılınca
            ekranı aşıyordu: %130 ölçekte pencerenin başlığı görüntü
            alanının üstünde kalıyordu (ölçüldü).
          */
          maxHeight: 'calc(86dvh / var(--tn-olcek, 1))',
          display: 'flex', flexDirection: 'column',
          background: C.panelSolid, border: `1px solid ${C.lineBright}`,
          borderRadius: 10, boxShadow: '0 18px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}>

        {/* ── Başlık ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '11px 13px', borderBottom: `1px solid ${C.lineSoft}`,
        }}>
          <Disli size={16} color={C.iceDeep} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.head, fontSize: 16, color: C.frost }}>Ayarlar</div>
            <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint }}>
              Tercihler bu tarayıcıda saklanır — başka cihazda yeniden ayarlaman gerekir.
            </div>
          </div>
          <button type="button" onClick={onKapat} title="Kapat (Esc)"
            style={{
              background: 'none', border: `1px solid ${C.lineSoft}`, borderRadius: 5,
              color: C.textMute, cursor: 'pointer', width: 24, height: 24,
              fontFamily: FONT.ui, fontSize: 12, lineHeight: 1,
            }}>✕</button>
        </div>

        {/* ── Sekmeler ── */}
        <div style={{
          display: 'flex', gap: 4, padding: '8px 10px 0',
          borderBottom: `1px solid ${C.lineSoft}`,
        }}>
          {SEKMELER.map(s => (
            <button key={s.id} type="button" onClick={() => setSekme(s.id)}
              style={{
                flex: 1, padding: '7px 8px', cursor: 'pointer',
                background: sekme === s.id ? 'rgba(143,220,255,0.10)' : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${sekme === s.id ? C.ice : 'transparent'}`,
                borderRadius: '4px 4px 0 0',
                fontFamily: FONT.ui, fontSize: 10.5, letterSpacing: 0.5,
                color: sekme === s.id ? C.frost : C.textMute,
              }}>
              {s.ad}
            </button>
          ))}
        </div>

        {/* ── İçerik ── */}
        {/*
          minHeight: 0 ŞART. Esnek sütunda kaydırılabilir çocuk
          varsayılan olarak içeriğinden kısalmıyor: pencere 86vh tavanını
          aşıp üstten ekranın dışına taşıyordu (ölçüldü — başlık ve
          sekmeler görünmüyordu).
        */}
        <div className="tn-scroll" style={{ overflowY: 'auto', minHeight: 0, padding: '12px 13px 14px' }}>
          {sekme === 'gorunum' && <Gorunum a={a} />}
          {sekme === 'muzik' && <Muzik m={muzik} />}
          {sekme === 'sesler' && <Sesler a={a} />}
        </div>

        {/* ── Alt ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 13px', borderTop: `1px solid ${C.lineSoft}`,
        }}>
          <span style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint, flex: 1 }}>
            Değişiklikler anında uygulanır.
          </span>
          <button type="button" onClick={ayarlariSifirla}
            title="Bütün ayarları fabrika değerine döndür"
            style={dugme(false)}>
            VARSAYILANA DÖN
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── GÖRÜNÜM ─────────────────────────────────────────────────────── */

function Gorunum({ a }) {
  return (
    <>
      <Baslik>Arayüz ölçeği</Baslik>
      <Not>
        Yazılar küçük geliyorsa buradan büyüt. Yalnız yazı değil arayüzün
        TAMAMI ölçeklenir — kutular da birlikte büyür, böylece sayılar
        kırpılmaz. Büyüdükçe ekrana daha az şey sığar.
      </Not>

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', margin: '9px 0 10px' }}>
        {OLCEK_ADIMLARI.map(s => {
          const secili = Math.abs(a.olcek - s.deger) < 0.001;
          return (
            <button key={s.deger} type="button" onClick={() => olcekAyarla(s.deger)}
              style={{
                flex: '1 1 auto', padding: '7px 9px', borderRadius: 5, cursor: 'pointer',
                background: secili ? 'rgba(143,220,255,0.12)' : 'transparent',
                border: `1px solid ${secili ? C.ice : C.lineSoft}`,
                color: secili ? C.frost : C.textDim,
                fontFamily: FONT.ui, fontSize: 10,
              }}>
              {s.ad}
              <div style={num({ fontSize: 9.5, color: secili ? C.ice : C.textMute, marginTop: 2 })}>
                %{Math.round(s.deger * 100)}
              </div>
            </button>
          );
        })}
      </div>

      <Kaydirici
        etiket="İnce ayar"
        deger={a.olcek} enAz={OLCEK_EN_AZ} enCok={OLCEK_EN_COK} adim={0.05}
        yaz={`%${Math.round(a.olcek * 100)}`}
        onDeger={olcekAyarla} />

      {/*
        ÖRNEK METİN — ölçek değişince ekranın tamamı değişiyor ama oyuncu
        pencereye bakıyor; burada bir örnek olmadan "ne kadar büyüdü"
        sorusunu ancak pencereyi kapatıp anlayabilirdi.
      */}
      <div style={{
        marginTop: 11, padding: '9px 10px', borderRadius: 6,
        border: `1px solid ${C.lineSoft}`, background: 'rgba(8,17,28,0.5)',
      }}>
        <div style={lbl({ fontSize: 7.5, letterSpacing: 1.2, marginBottom: 4 })}>ÖRNEK</div>
        <div style={{ fontFamily: FONT.ui, fontSize: 11, color: C.text }}>
          Fjordvakt eğitimi tamamlandı.
        </div>
        <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, marginTop: 2 }}>
          Kışla · 3 işçi · kalan süre <span style={num({ color: C.frost })}>12:40</span>
        </div>
      </div>
    </>
  );
}

/* ── MÜZİK ───────────────────────────────────────────────────────── */

function Muzik({ m }) {
  return (
    <>
      <Baslik>Arka plan müziği</Baslik>
      <Anahtar
        ad="Müzik"
        aciklama="Kuzey esintili parçalar sırayla çalar."
        acik={!m.muted}
        onDegis={(v) => setMuted(!v)} />

      <Kaydirici
        etiket="Ses seviyesi"
        deger={m.muted ? 0 : m.volume} enAz={0} enCok={1} adim={0.05}
        yaz={`%${Math.round((m.muted ? 0 : m.volume) * 100)}`}
        onDeger={setVolume} />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginTop: 11,
        padding: '8px 10px', borderRadius: 6,
        border: `1px solid ${C.lineSoft}`, background: 'rgba(8,17,28,0.5)',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={lbl({ fontSize: 7.5, letterSpacing: 1.2 })}>ŞU AN ÇALAN</div>
          <div style={{
            fontFamily: FONT.ui, fontSize: 10.5, color: m.playing ? C.frost : C.textMute,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2,
          }}>
            {m.track || (m.muted ? 'kapalı' : 'henüz başlamadı')}
          </div>
        </div>
        <button type="button" onClick={nextTrack} disabled={m.muted}
          style={dugme(!m.muted)}>SIRADAKİ PARÇA</button>
      </div>

      <Not>
        Tarayıcılar sayfaya dokunulmadan ses çalmayı engelliyor; müzik ilk
        tıklamandan sonra başlar. Telefonda tek parça döner — her parça
        ~6 MB ve mobil bağlantıda listeyi dolaşmak oyunun kendi trafiğiyle
        yarışıyordu.
      </Not>
    </>
  );
}

/* ── SESLER ──────────────────────────────────────────────────────── */

function Sesler({ a }) {
  return (
    <>
      <Baslik>Olay sesleri</Baslik>
      <Anahtar
        ad="Bütün sesler"
        aciklama="Ana anahtar. Kapalıyken aşağıdakilerin hiçbiri çalmaz."
        acik={a.sesAcik}
        onDegis={sesAcikAyarla} />

      <Kaydirici
        etiket="Ana ses seviyesi"
        deger={a.sesAcik ? a.sesSeviyesi : 0} enAz={0} enCok={1} adim={0.05}
        yaz={`%${Math.round((a.sesAcik ? a.sesSeviyesi : 0) * 100)}`}
        onDeger={sesSeviyesiAyarla} />

      <Not>
        Her olayın kendi anahtarı ve seviyesi var: saldırı uyarısını
        duymak isteyip inşaat sesini istememek en sık yapılan ayardır.
        Olay seviyesi ANA SESLE ÇARPILIR — ana ses %50 ve olay %50 ise
        gerçek seviye %25 olur.
      </Not>

      <div style={{
        marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6,
        opacity: a.sesAcik ? 1 : 0.45,
        pointerEvents: a.sesAcik ? 'auto' : 'none',
      }}>
        {SES_OLAYLARI.map(o => {
          const s = a.olaylar[o.anahtar] || { acik: true, ses: 0.7 };
          return (
            <div key={o.anahtar} style={{
              padding: '8px 10px', borderRadius: 6,
              border: `1px solid ${s.acik ? C.lineSoft : 'rgba(96,128,150,0.16)'}`,
              background: 'rgba(8,17,28,0.45)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: FONT.ui, fontSize: 10.5,
                    color: s.acik ? C.text : C.textMute,
                  }}>{o.ad}</div>
                  <div style={{
                    fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint, marginTop: 1,
                  }}>{o.aciklama}</div>
                </div>
                {/*
                  DİNLE düğmesi olayın kendi anahtarını AŞAR: oyuncu sesi
                  denemek için önce açmak zorunda kalmamalı.
                */}
                <button type="button" onClick={() => sesCal(o.anahtar, { zorla: true })}
                  title="Sesi dinle" style={dugme(true, { padding: '4px 7px', fontSize: 8.5 })}>
                  DİNLE
                </button>
                <Salter acik={s.acik}
                  onDegis={(v) => olayAyarla(o.anahtar, { acik: v })} />
              </div>
              <input type="range" min={0} max={1} step={0.05} value={s.ses}
                onChange={(e) => olayAyarla(o.anahtar, { ses: Number(e.target.value) })}
                style={{ width: '100%', marginTop: 6, accentColor: C.ice }} />
            </div>
          );
        })}
      </div>

      {/*
        SES DOSYALARI HENÜZ YOK. Bunu gizlemek, oyuncunun ayarları
        kurcalayıp "ses çıkmıyor, bozuk" diye düşünmesine yol açardı.
      */}
      <Not>
        Ses dosyaları henüz eklenmedi: ayarlar şimdiden kaydediliyor,
        dosyalar geldiğinde burada yaptığın seçim olduğu gibi işlemeye
        başlayacak.
      </Not>
    </>
  );
}

/* ── Ortak parçalar ──────────────────────────────────────────────── */

function Baslik({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 7px' }}>
      <span style={lbl({ fontSize: 8, letterSpacing: 1.3, color: C.iceDeep })}>{children}</span>
      <div style={{ flex: 1, height: 1, background: C.lineSoft }} />
    </div>
  );
}

function Not({ children }) {
  return (
    <div style={{
      fontFamily: FONT.ui, fontSize: 9, color: C.textFaint,
      lineHeight: 1.55, marginTop: 9,
    }}>{children}</div>
  );
}

function Anahtar({ ad, aciklama, acik, onDegis }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '9px 10px', borderRadius: 6,
      border: `1px solid ${C.lineSoft}`, background: 'rgba(8,17,28,0.5)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT.ui, fontSize: 11, color: C.text }}>{ad}</div>
        <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint, marginTop: 1 }}>
          {aciklama}
        </div>
      </div>
      <Salter acik={acik} onDegis={onDegis} />
    </div>
  );
}

/** Açma/kapama şalteri — checkbox yerine, dokunmatikte de rahat */
function Salter({ acik, onDegis }) {
  return (
    <button type="button" role="switch" aria-checked={acik}
      onClick={() => onDegis(!acik)}
      title={acik ? 'Kapat' : 'Aç'}
      style={{
        width: 34, height: 18, borderRadius: 9, flexShrink: 0, cursor: 'pointer',
        background: acik ? 'rgba(108,221,163,0.22)' : 'rgba(96,128,150,0.14)',
        border: `1px solid ${acik ? C.good : C.lineSoft}`,
        position: 'relative', padding: 0, transition: 'background .14s',
      }}>
      <span style={{
        position: 'absolute', top: 2, left: acik ? 17 : 2,
        width: 12, height: 12, borderRadius: 6,
        background: acik ? C.good : C.textMute, transition: 'left .14s',
      }} />
    </button>
  );
}

function Kaydirici({ etiket, deger, enAz, enCok, adim, yaz, onDeger }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
        <span style={lbl({ fontSize: 7.5, letterSpacing: 1, flex: 1 })}>{etiket}</span>
        <span style={num({ fontSize: 10.5, color: C.frost })}>{yaz}</span>
      </div>
      <input type="range" min={enAz} max={enCok} step={adim} value={deger}
        onChange={(e) => onDeger(Number(e.target.value))}
        style={{ width: '100%', accentColor: C.ice }} />
    </div>
  );
}

function dugme(aktif, ek = {}) {
  return {
    padding: '6px 9px', borderRadius: 4, flexShrink: 0,
    fontFamily: FONT.ui, fontSize: 9, letterSpacing: 0.6,
    cursor: aktif ? 'pointer' : 'not-allowed',
    background: 'transparent',
    border: `1px solid ${aktif ? C.lineSoft : 'rgba(96,128,150,0.16)'}`,
    color: aktif ? C.textDim : C.textMute,
    ...ek,
  };
}
