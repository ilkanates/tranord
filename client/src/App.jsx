import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import MapView         from './components/MapView';
import VillageCenter   from './components/VillageCenter';
import HelpScreen      from './components/HelpScreen';
import MusicButton     from './components/MusicButton';
import AyarlarMenu     from './components/AyarlarMenu';
import VillageSwitcher from './components/VillageSwitcher';
import { ProfileButton, NameGate } from './components/ProfilePanel';
import Tutorial from './components/Tutorial';
import MessageScreen from './components/MessageScreen';
import HeroPanel from './components/HeroPanel';
import FoodWarning from './components/FoodWarning';
import DevMenu        from './components/DevMenu';
import WorkerScreen   from './components/WorkerScreen';
import { startMusic }  from './audio';
import ArmyPanel       from './components/ArmyPanel';
import BattleSimulator from './components/BattleSimulator';
import { MarchPanel, IncomingAlert } from './components/WarPanel';
import ReportScreen, { unseenCount } from './components/ReportScreen';
import QuestScreen, { QuestCard, Spotlight } from './components/QuestGuide';
import LoginScreen from './components/LoginScreen';
import YamaNotlari from './components/YamaNotlari';
import { okunanlariYukle, okunanlariKaydet, gosterilecekBolumler }
  from './data/yamaNotlari';
import LoginBackdrop from './components/LoginBackdrop';
import StatsScreen from './components/StatsScreen';
import ResourceRail    from './components/ResourceRail';
import StatusRail      from './components/StatusRail';
import NordicBackdrop  from './components/NordicBackdrop';
import VideoBackdrop   from './components/VideoBackdrop';
import Icon            from './components/Icons';
import { computeFlows, extrapolate, RES_LABEL } from './flows';
import { useViewport, TAP } from './responsive';
import { C, FONT, btn, label as lbl, num } from './theme';

/**
 * SUNUCU ADRESİ — üretimde AYNI ORIGIN.
 *
 * Tek sunucuda (nginx + node) istemci ve API aynı adreste duruyor; boş dize
 * socket.io'yu ve göreli fetch'i sayfanın kendi origin'ine yönlendiriyor,
 * böylece CORS diye bir mesele kalmıyor. Yerel geliştirmede Vite 5180'de ve
 * sunucu 3311'de olduğu için adres açıkça yazılıyor.
 */
const SERVER_URL = import.meta.env.VITE_SERVER_URL
  || (import.meta.env.DEV ? 'http://localhost:3311' : '');

const TOKEN_KEY = 'tranord_token';

/** Token: URL param → localStorage → yok. Giriş artık oyunun İÇİNDE. */
function getToken() {
  const urlToken = new URLSearchParams(window.location.search).get('token');
  if (urlToken) {
    localStorage.setItem(TOKEN_KEY, urlToken);
    window.history.replaceState({}, '', window.location.origin + window.location.pathname);
    return urlToken;
  }
  return localStorage.getItem(TOKEN_KEY) || null;
}

function makeSocket(token, onAuthFail) {
  /**
   * YENİDEN BAĞLANMA SINIRSIZ.
   *
   * Eskiden `reconnectionAttempts: 5` vardı: sunucu yeniden başlatıldığında
   * istemci beş kez deneyip KALICI olarak vazgeçiyordu. Bu, kaynaklar sunucu
   * paketiyle ilerlerken hemen belli oluyordu (sayılar donardı); artık
   * kaynakları istemci kendi hesapladığı için ekran canlı görünüyor ve hiçbir
   * komutun işlemediği fark edilmiyor. Sınırsız deneme + aşağıdaki uyarı
   * şeridi bu sessiz hatayı ortadan kaldırıyor.
   */
  const s = io(SERVER_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
    timeout: 8000,
  });
  s.on('connect_error', (err) => {
    if (err.message === 'auth:token_missing' || err.message === 'auth:token_invalid') onAuthFail();
  });

  /**
   * TEŞHİS KANCASI (yalnız geliştirme).
   *
   * Konsola `__tnDebug()` yazınca bağlantının gerçekten ayakta olup olmadığı,
   * son paketin ne kadar önce geldiği ve sunucunun komutlara cevap verip
   * vermediği tek satırda görünür. "Ekran canlı ama hiçbir tuş işlemiyor"
   * durumunun sessizce sürmesini engelliyor.
   */
  if (import.meta.env.DEV) {
    window.__tnSocket = s;
    s.on('village_update', () => { window.__tnLastPacket = Date.now(); });
    window.__tnDebug = () => {
      const age = window.__tnLastPacket ? Math.round((Date.now() - window.__tnLastPacket) / 1000) : null;
      const out = {
        bagli: s.connected,
        socketId: s.id || '(yok)',
        sonPaket: age == null ? 'hiç gelmedi' : age + ' sn önce',
        transport: s.io?.engine?.transport?.name || '(yok)',
        denemeSayisi: s.io?.backoff?.attempts ?? 0,
      };
      console.log('[TN]', JSON.stringify(out));
      // Sunucu komutlara cevap veriyor mu? request_stats -> stats_snapshot
      const t0 = Date.now();
      const done = () => console.log('[TN] sunucu cevabi:', (Date.now() - t0) + ' ms');
      s.once('stats_snapshot', done);
      s.emit('request_stats');
      setTimeout(() => {
        s.off('stats_snapshot', done);
        console.log('[TN] cevap gelmediyse yukarida "sunucu cevabi" satiri yok demektir');
      }, 4000);
      return out;
    };
  }
  return s;
}

/**
 * TEK SOCKET — modül seviyesinde tutulur.
 *
 * Socket `useMemo` içinde kuruluyordu; React StrictMode geliştirmede render'ı
 * iki kez çalıştırdığı için useMemo fabrikası da iki kez koşuyor ve İKİ socket
 * açılıyordu. Sunucu oturum başına son bağlanan socket'e yayın yaptığından
 * paket, dinleyicisi olmayan yetim socket'e gidiyor ve arayüz donuyordu
 * (komut sunucuda işlense bile). Modül seviyesindeki tekil, bu sınıf hatayı
 * kökten kaldırıyor; sunucu tarafında da yayın artık kullanıcı odasına gidiyor.
 */
let _socket = null;
let _socketToken = null;
function getSocket(token, onAuthFail) {
  if (_socket && _socketToken === token) return _socket;
  if (_socket) { try { _socket.close(); } catch { /* zaten kapalı */ } }
  _socketToken = token;
  _socket = makeSocket(token, onAuthFail);
  return _socket;
}
function dropSocket() {
  if (_socket) { try { _socket.close(); } catch { /* zaten kapalı */ } }
  _socket = null; _socketToken = null;
}

/**
 * SEKMELER ve AMBLEMLERİ.
 *
 * Amblemler bir kez elden geçirildi: çoğu ya genel bir ikondu ya da
 * BAŞKA bir sekmenin ikonuydu — Harita ile Seferler aynı, Görevler ile
 * Yardım aynı, Mesajlar "bilgi" ikonundaydı. İkon sekmeyi ayırt
 * etmiyorsa hiç yok sayılır; telefonda alt barda zaten yalnız ikon var.
 *
 * Tek liste: üst bar da alt bar da buradan besleniyor.
 */
const TABS = [
  { key: 'harita',    label: 'Harita',           icon: 'harita' },
  { key: 'koy',       label: 'Köy Merkezi',      icon: 'koy' },
  { key: 'isciler',   label: 'Köylüler',         icon: 'ciftci' },
  { key: 'ordu',      label: 'Ordu',             icon: 'kilic' },
  /*
    KAHRAMAN Ordu ile Seferler arasında: askerî bir şey ve kararı
    "kimi göndereyim"in yanında veriliyor. Sona koysaydık oyuncu onu
    Yardım/İstatistik gibi bir yan ekran sanırdı.
  */
  { key: 'kahraman',  label: 'Kahraman',         icon: 'migfer' },
  { key: 'sefer',     label: 'Seferler',         icon: 'tekerlek' },
  { key: 'gorevler',  label: 'Görevler',         icon: 'kitap' },
  { key: 'raporlar',  label: 'Raporlar',         icon: 'parsomen' },
  { key: 'mesajlar',  label: 'Mesajlar',         icon: 'mektup' },
  { key: 'istatistik', label: 'İstatistik',      icon: 'grafik' },
  /*
    SAVAŞ SİMÜLATÖRÜ ÜST BARDAN KALKTI — artık Ordu sekmesinin altında
    (İlkan'ın isteği). İki sebep: üst bar on bir sekmeyle taşıyordu ve
    simülatör zaten ORDUNUN bir aracı — "bu orduyla ne olur" sorusu,
    ordunun kendisine baktığın yerde sorulur.
  */
  { key: 'yardim',    label: 'Yardım',           icon: 'bilgi' },
];

const SPEED_STEPS = [0.1, 0.5, 1, 2, 4, 8, 16, 32, 64, 128];
// Ray genişliği artık ekrana göre: bkz. responsive.js -> useViewport().railW

/**
 * ORDU ALT SEKMELERİ — ordu listesi ve savaş simülatörü.
 *
 * Simülatör üst barda ayrı bir sekmeydi; İlkan Ordu'nun altına aldırdı.
 * Doğru yer: simülatör ORDUNUN bir aracı — "bu orduyla ne olur" sorusu
 * ordunun kendisine baktığın yerde sorulur. Üst bar da on bir sekmeyle
 * taşıyordu.
 */
function OrduSekmesi({ alt, setAlt }) {
  const SEKME = [
    { id: 'ordu', ad: 'Ordum', ikon: 'ordu' },
    { id: 'simulator', ad: 'Savaş simülatörü', ikon: 'kilicKalkan' },
  ];
  return (
    <div style={{
      maxWidth: 1240, margin: '0 auto', padding: '14px 24px 0',
      display: 'flex', gap: 6,
    }}>
      {SEKME.map(s => {
        const secili = alt === s.id;
        return (
          <button key={s.id} type="button" onClick={() => setAlt(s.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              padding: '7px 13px', borderRadius: 5,
              background: secili ? 'rgba(143,220,255,0.10)' : 'transparent',
              border: '1px solid ' + (secili ? C.ice : C.lineSoft),
              fontFamily: FONT.ui, fontSize: 10.5, letterSpacing: 0.8,
              color: secili ? C.frost : C.textMute,
            }}>
            <Icon name={s.ikon} size={13} color={secili ? C.ice : C.textMute} />
            {s.ad}
          </button>
        );
      })}
    </div>
  );
}

function emailFromToken(tok) {
  try { return JSON.parse(atob(tok.split('.')[1])).email || ''; } catch { return ''; }
}

// ── Üst bar ───────────────────────────────────────────────────────────
/** "1 oyun saati = X" — çubuğun ne anlama geldiğini yazar */
function scaleLabel(hourSeconds, mult) {
  const s = (hourSeconds || 3600) / (mult || 1);
  if (s >= 3600) return `1 oyun saati = ${(s / 3600).toFixed(s % 3600 ? 1 : 0)} sa`;
  if (s >= 60) return `1 oyun saati = ${(s / 60).toFixed(s % 60 ? 1 : 0)} dk`;
  return `1 oyun saati = ${s.toFixed(s < 10 ? 1 : 0)} sn`;
}

/*
  ÜST BAR ÖLÇEK TABANLARI — TEK KAYNAK.

  ETIKET_TABANI hem "ne kadar küçülebilir" hem de "ne zaman etiketler
  düşer" sorusunun cevabı. İki ayrı sayı olsaydı aralarında bir aralık
  kalır ve şerit orada kırpılırdı — nitekim kalmıştı.
*/
const ETIKET_TABANI = 0.70;   // 13.5 px yazı ~9.5 px olur, hâlâ okunuyor
const IKON_TABANI = 0.55;     // ikon 15 px; yarıya insa da taniniyor

export function TopBar({ tab, setTab, tickMs, setSpeed, userEmail, connected, onLogout, badges = {}, hourSeconds = 3600, socket = null,
  villages = [], activeSlot = null, onSwitchVillage, playerName = '',
  vp = { mobile: false, railW: 186 }, onOpenStatus, nufus = null }) {
  const dar = vp.mobile;

  /*
    SEKME ŞERİDİ SIĞMIYORSA ÖLÇEKLENİYOR (İlkan'ın isteği: "scroll
    çıkmasın, scale olsun"). Sekmeler bir MENÜ — hepsinin aynı anda
    görünmesi gerekiyor; kaydırma, varlığını bilmediğin bir sekmeyi
    ekran dışında saklamak olurdu.
  */
  const navRef = useRef(null);
  const navIcRef = useRef(null);
  const [navOlcek, setNavOlcek] = useState(1);
  const [navIkonSadece, setNavIkonSadece] = useState(false);
  /*
    ETİKETLİ doğal genişlik burada saklanıyor. İkon moduna geçince şerit
    daralıyor; kararı o daralmış genişliğe göre verseydik "artık sığıyor"
    deyip etiketleri geri açar, sonra yine sığmaz bulup kapatırdık.
  */
  const tamGenislikRef = useRef(0);
  const ikonSadeceRef = useRef(false);
  /*
    Ölçüm işlevi dışarıdan da çağrılabilsin diye ref'te: mod değişince
    yeniden ölçmek gerekiyor ve bu, gözlemcinin yakalayamadığı bir
    değişim (şeridin kutusu değil, yalnız içeriği değişiyor).
  */
  const olcRef = useRef(null);

  useEffect(() => {
    const kap = navRef.current;
    const ic = navIcRef.current;
    if (!kap || !ic || dar) { setNavOlcek(1); setNavIkonSadece(false); return undefined; }
    const olc = () => {
      const yer = kap.clientWidth;
      if (!yer) return;
      /*
        DOĞAL genişlik yalnız ETİKETLİ hâlde ölçülüyor ve saklanıyor.
        Dönüşüm yerleşimi değiştirmediği için `scrollWidth` ölçek
        uygulanmışken de doğru okunuyor — `getBoundingClientRect()`
        ölçeklenmiş genişliği okur, ondan yeni ölçek üretir ve şerit her
        karede küçülürdü.
      */
      if (!ikonSadeceRef.current && ic.scrollWidth) tamGenislikRef.current = ic.scrollWidth;
      const tam = tamGenislikRef.current;
      if (!tam) return;

      /*
        İKİ EŞİK: 0,72'nin altına inince etiketler düşüyor, 0,80'in
        üstüne çıkınca geri geliyor. Tek eşik olsaydı pencere tam
        sınırda birkaç piksel oynadığında şerit titrerdi.
      */
      const oran = yer / tam;
      /*
        EŞİK TABANLA AYNI SAYI OLMAK ZORUNDA. Ayrı seçilince arada
        bir aralık kalıyordu: gereken ölçek 0,73 iken mod hâlâ
        etiketli, taban ise 0,78 — şerit kırpılıyordu (ölçüldü).
        Kural tek cümle: gereken ölçek tabanın altına düşüyorsa
        etiketler düşer. Çıkış eşiği 0,86 — tam sınırda pencere
        birkaç piksel oynadığında şerit titremesin diye.
      */
      const yeniIkon = ikonSadeceRef.current ? oran < 0.86 : oran < ETIKET_TABANI;
      if (yeniIkon !== ikonSadeceRef.current) {
        ikonSadeceRef.current = yeniIkon;
        setNavIkonSadece(yeniIkon);
        /*
          Ölçeği ŞİMDİ hesaplamıyoruz: şerit hâlâ eski hâlinde çizili.
          Aşağıdaki efekt, yeni hâl çizildikten sonra yeniden ölçüyor.
        */
        return;
      }

      /*
        TABAN MODA GÖRE: etiketliyken 0,78 (altında yazı okunmuyor),
        yalnız ikonken 0,55 — ikon 15 px, yarıya inse bile tanınıyor
        ve buradaki tek amaç kaydırmayı tamamen bitirmek.
      */
      const suanki = ic.scrollWidth || tam;
      const taban = ikonSadeceRef.current ? IKON_TABANI : ETIKET_TABANI;
      setNavOlcek(suanki <= yer ? 1 : Math.max(taban, yer / suanki));
    };
    olcRef.current = olc;
    olc();
    /*
      Yalnız KAP izleniyor: şeridin kendi kutusu kaba sıkıştığı için
      değişmiyor, onu izlemek hiçbir zaman tetiklenmeyen bir dinleyici
      olurdu.
    */
    const go = new ResizeObserver(olc);
    go.observe(kap);
    /*
      PENCERE OLAYI DA DİNLENİYOR. ResizeObserver bazı ortamlarda
      görünüm alanı değişiminde tetiklenmiyor (tarayıcı panelinde
      ölçüldü: kap 328 → 928 oldu, geri çağrı hiç koşmadı ve şerit
      eski ölçekte kaldı). İkisi birlikte hiçbir durumu kaçırmıyor.
    */
    window.addEventListener('resize', olc);
    return () => {
      go.disconnect();
      window.removeEventListener('resize', olc);
      olcRef.current = null;
    };
  }, [dar]);

  /*
    MOD DEĞİŞTİKTEN SONRA YENİDEN ÖLÇ.

    `requestAnimationFrame` ile denendi ve yetmedi: geri çağrı React'in
    yeni durumu ÇİZMESİNDEN ÖNCE koşuyor, yani şerit hâlâ etiketliyken
    ölçülüyor ve ölçek tabana yapışıyordu (0,55, oysa 0,71 yetiyordu).
    Efekt çizimden sonra koşuyor.
  */
  useEffect(() => { olcRef.current?.(); }, [navIkonSadece]);

  return (
    <header style={{
      flexShrink: 0, zIndex: 20, position: 'relative',
      display: 'flex', alignItems: 'stretch',
      background: 'linear-gradient(180deg, rgba(9,15,21,0.55) 0%, rgba(12,20,28,0.32) 100%)',
      borderBottom: `1px solid ${C.lineSoft}`,
      backdropFilter: 'blur(16px) saturate(1.15)',
      WebkitBackdropFilter: 'blur(16px) saturate(1.15)',
      boxShadow: '0 2px 20px rgba(0,0,0,0.35)',
    }}>
      {/* Marka */}
      <div style={{
        width: dar ? 'auto' : vp.railW,
        /*
          DAR EKRANDA MARKA DARALABİLİR — sağdaki düğmeler daralamaz.
          `flexShrink: 0` iken marka yer bırakmıyordu ve 320 px'de ÇIKIŞ
          düğmesi tamamen ekranın dışında kalıyordu (340–376, ekran 320;
          ölçüldü). Bu emniyet kemeri: aşağıdaki gizleme kuralı yetmezse
          bile marka kırpılır, düğme erişilebilir kalır.
        */
        flexShrink: dar ? 1 : 0, minWidth: 0, overflow: 'hidden',
        display: 'flex', alignItems: 'center', gap: dar ? 6 : 9,
        padding: dar ? '7px 9px' : '10px 14px',
        borderRight: `1px solid ${C.lineSoft}`,
      }}>
        <svg width={dar ? 18 : 22} height={dar ? 18 : 22} viewBox="0 0 24 24" fill="none"
          stroke={C.ice} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z" />
          <path d="M12 7.5 16 10v4l-4 2.5L8 14v-4z" opacity=".7" />
        </svg>
        {/*
          OLCUM: 390 px'te marka + koy secici + kullanici yan yana sigmiyor,
          cikis dugmesi ekranin 18 px disinda kaliyordu. Oyunun adi her
          ekranda durmak zorunda degil; koyun adi onemli. Tek koyde yazi
          kaliyor — ust bar zaten bos.

          KOSUL KOY SAYISINA BAGLIYDI, YERE DEGIL: tek koylu bir oyuncuda
          yazi kaliyor ve 320 px'de CIKIS dugmesini tamamen ekran disina
          itiyordu (340–376). Artik yer de olcute giriyor — sag gruba
          ~200 px, arma ve bosluklara ~60 px gerekiyor.
        */}
        <div style={{
          lineHeight: 1,
          display: (dar && (villages.length > 1 || (vp.w || 9999) < 380)) ? 'none' : 'block',
        }}>
          <div style={{
            fontFamily: FONT.head, fontSize: dar ? 14 : 19, fontWeight: 700,
            letterSpacing: dar ? 2 : 4, color: C.frost,
          }}>TRANORD</div>
          {/* Alt baslik dar ekranda yer kaplıyor — yalnız masaustunde */}
          {!dar && (
            <div style={lbl({ fontSize: 7.5, letterSpacing: 2, marginTop: 3 })}>fiyort krallığı</div>
          )}
        </div>
      </div>

      {/* Köy değiştirici — tek köyde kendini gizler */}
      {villages.length > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', padding: '0 8px',
          borderRight: `1px solid ${C.lineSoft}`,
        }}>
          <VillageSwitcher villages={villages} activeSlot={activeSlot}
            onSwitch={onSwitchVillage} />
        </div>
      )}

      {/* Sekmeler */}
      {/*
        Sekmeler: masaustunde ust barda, TELEFONDA alt barda (BottomTabs).
        Alt bar hem basparmakla ulasilabilir hem de ust barda marka +
        koy secici + kullanici ile birlikte 8 sekme 390 px'e sigmiyordu.
      */}
      {/*
        ŞERİT KAYDIRMIYOR, ÖLÇEKLENİYOR (İlkan'ın isteği). Sekmeler bir
        MENÜ: hepsinin aynı anda görünmesi gerekiyor. Kaydırma, varlığını
        bilmediğin bir sekmeyi ekran dışında saklamak olurdu.
      */}
      <nav ref={navRef}
        style={{
          flex: 1, display: dar ? 'none' : 'flex', alignItems: 'stretch',
          paddingLeft: 6, minWidth: 0, overflow: 'hidden',
        }}>
        <div ref={navIcRef} style={{
          display: 'flex', alignItems: 'stretch',
          transform: `scale(${navOlcek})`,
          transformOrigin: 'left center',
          /* Ölçek değişimi ani olmasın — pencere sürüklenirken zıplıyordu */
          transition: 'transform .12s ease-out',
        }}>
        {TABS.map(t => {
          const on = tab === t.key;
          return (
            <button key={t.key} data-tut={`tab-${t.key}`} onClick={() => setTab(t.key)}
              /* İkon modunda etiket yok — fare için başlık şart */
              title={navIkonSadece ? t.label : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: navIkonSadece ? '0 11px' : '0 15px',
                border: 'none', background: 'transparent',
                borderBottom: `2px solid ${on ? C.ice : 'transparent'}`,
                color: on ? C.frost : C.textFaint,
                fontFamily: FONT.head, fontSize: 13.5, fontWeight: on ? 600 : 500,
                letterSpacing: 1.1, cursor: 'pointer', whiteSpace: 'nowrap',
                // filter/transform da listede: basma geri bildirimi index.css'te
                // bu ikisiyle veriliyor, satır içi transition onu eziyordu.
                transition: 'color .14s, border-color .14s, background .14s,'
                  + ' filter .14s ease, transform .1s ease',
                ...(on ? { background: 'linear-gradient(180deg, rgba(127,212,255,0.03), rgba(127,212,255,0.11))' } : {}),
              }}
              onMouseOver={(e) => { if (!on) e.currentTarget.style.color = C.textDim; }}
              onMouseOut={(e) => { if (!on) e.currentTarget.style.color = C.textFaint; }}
            >
              <Icon name={t.icon} size={15} color={on ? C.ice : C.textMute} />
              {/*
                DAR PENCEREDE YALNIZ İKON. İkonlar bilerek birbirinden
                ayrı seçilmişti (bkz. yukarıdaki TABS yorumu), yani tek
                başına ikon sekmeyi ayırt ediyor. Etiket düşünce şerit
                üçte birine iniyor ve kaydırma gerekmeden sığıyor.
              */}
              {!navIkonSadece && t.label}
              {/* Okunmamış rapor sayacı — sekmeyi açınca sıfırlanır */}
              {badges[t.key] > 0 && (
                <span style={{
                  minWidth: 17, height: 17, padding: '0 4px', borderRadius: 9,
                  display: 'inline-grid', placeItems: 'center',
                  background: C.danger, color: '#1a0508',
                  fontFamily: FONT.num, fontSize: 10, fontWeight: 700, lineHeight: 1,
                }}>{badges[t.key] > 99 ? '99+' : badges[t.key]}</span>
              )}
            </button>
          );
        })}
        </div>
      </nav>

      {/* Hız + kullanıcı */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: dar ? 4 : 12,
        padding: dar ? '0 6px' : '0 14px', flexShrink: 0,
        marginLeft: dar ? 'auto' : 0,
        borderLeft: `1px solid ${C.lineSoft}`,
      }}>
{/*
          NÜFUS TELEFONDA ÜST BARDA.

          Durum rayı telefonda çekmecede duruyor; nüfus da oradaydı, yani
          oyuncu açmadan göremiyordu. Oysa nüfus ve BOŞ İŞÇİ oyunun her
          adımında bakılan iki sayı: işçi atarken, asker basarken, inşaat
          başlatırken. Çekmeceyi açan düğmenin üstüne sayıları da yazdık —
          düğme hem bilgi veriyor hem kapıyı açmaya devam ediyor.

          Aç kalan köyde sayı kırmızıya dönüyor: sessiz kalsaydı oyuncu
          nüfusunun neden durduğunu göremezdi.
        */}
        {dar && (
          <button type="button" onClick={onOpenStatus} title="Nüfus ve durum"
            style={{
              height: TAP - 8, display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
            }}>
            <Icon name="nufus" size={15}
              color={nufus?.isStarving ? C.danger : C.iceDeep} />
            {nufus && (
              <span style={{
                display: 'flex', alignItems: 'baseline', gap: 3,
                fontFamily: FONT.num, lineHeight: 1,
              }}>
                <span style={{
                  fontSize: 12, color: nufus.isStarving ? C.danger : C.frost,
                }}>{nufus.population}</span>
                <span style={{ fontSize: 9, color: C.textMute }}>/{nufus.maxPopulation}</span>
                <span style={{ fontSize: 10, color: C.good, marginLeft: 2 }}
                  title="Boş işçi">·{nufus.freeWorkers}</span>
              </span>
            )}
          </button>
        )}
        {/*
          Hoparlör HIZLI SUSTURMA olarak duruyor: tek tıkla susturmak sık
          yapılan bir şey, onu ayarlar penceresinin iki tık arkasına
          koymak bir iyileştirme olmazdı. Dişli ise bütün ayarların evi.
          İkisi de aynı depoyu yazıyor, ayrışamazlar.
        */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 2px' }}>
          <MusicButton />
          <AyarlarMenu dar={dar} />
        </div>

        {/*
          TEST menüsü — yalnız geliştirme derlemesinde. HIZ KAYDIRICISI da
          buraya taşındı: üst bar sekmeler taşacak kadar kalabalıklaşmıştı ve
          hız zaten bir test aracı (128×'e kadar çıkıyor), oyuncunun sürekli
          göreceği bir denetim değil.
        */}
        {import.meta.env.DEV && (
          <DevMenu socket={socket} tickMs={tickMs} setSpeed={setSpeed}
            hourSeconds={hourSeconds} speedSteps={SPEED_STEPS}
            scaleLabel={scaleLabel} />
        )}

        <div style={{ width: 1, alignSelf: 'stretch', background: C.lineSoft, margin: '10px 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 6, height: 6, borderRadius: 3, flexShrink: 0,
            background: connected ? C.good : C.danger,
            boxShadow: `0 0 6px ${connected ? C.good : C.danger}`,
          }} />
          {/*
            Eskiden burada E-POSTA yazıyordu. Artık oyuncu adı duruyor ve
            tıklanabilir: profil penceresinden hem oyuncu adı hem aktif
            köyün adı değiştiriliyor. Dar ekranda yalnız simge görünür.
          */}
          <ProfileButton socket={socket} playerName={playerName} email={userEmail}
            villages={villages} activeSlot={activeSlot} dar={dar} />
          <button onClick={onLogout} title="Çıkış"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', display: 'grid',
              placeItems: 'center', padding: 0,
              width: dar ? TAP - 8 : 22, height: dar ? TAP - 8 : 22,
            }}>
            <Icon name="cikis" size={15} color={C.textMute} />
          </button>
        </div>
      </div>
    </header>
  );
}

/**
 * BottomTabs — telefonda sekmeler ekranin ALTINDA.
 *
 * Ust barda 8 sekme 390 px'e sigmiyor, sigsa da basparmakla en uzak yer
 * ekranin ust kenari. Alt bar yatay kaydirilabilir; her hedef en az
 * TAP (44 px) yuksekliginde.
 */
export function BottomTabs({ tab, setTab, badges = {} }) {
  /**
   * AÇIK SEKME GÖRÜNÜR KALSIN.
   *
   * On sekme 414 px'e sığmıyor; şerit yatay kayıyor ama seçili sekme
   * ekranın dışında kalabiliyordu. Telefonda son dört sekme (Raporlar,
   * İstatistik, Simülatör, Yardım) hiç görünmüyor, oyuncu oraya
   * gidebildiğini bilmiyordu. Sekme değişince seçili olan görüş alanına
   * kaydırılıyor.
   */
  const seritRef = useRef(null);
  useEffect(() => {
    const el = seritRef.current?.querySelector(`[data-tut="tab-${tab}"]`);
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [tab]);

  return (
    <nav ref={seritRef} className="tn-scroll" style={{
      flexShrink: 0, display: 'flex', alignItems: 'stretch',
      overflowX: 'auto', overflowY: 'hidden',
      background: 'linear-gradient(0deg, rgba(9,15,21,0.96) 0%, rgba(12,20,28,0.88) 100%)',
      borderTop: `1px solid ${C.lineSoft}`,
      backdropFilter: 'blur(16px) saturate(1.15)',
      WebkitBackdropFilter: 'blur(16px) saturate(1.15)',
      /* iPhone'da alt cubugun altinda kalmasin */
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      /*
        SAĞ KENARDA SOLMA: şeridin devamı olduğunu söylüyor. Kaydırma
        çubuğu gizli (tn-scroll), o yüzden başka bir ipucu yok ve oyuncu
        son dört sekmenin varlığını fark etmiyordu.
      */
      maskImage: 'linear-gradient(90deg, #000 0, #000 calc(100% - 22px), transparent 100%)',
      WebkitMaskImage: 'linear-gradient(90deg, #000 0, #000 calc(100% - 22px), transparent 100%)',
    }}>
      {TABS.map(t => {
        const on = tab === t.key;
        return (
          <button key={t.key} data-tut={`tab-${t.key}`} onClick={() => setTab(t.key)}
            style={{
              position: 'relative', flex: '0 0 auto',
              minWidth: 62, minHeight: TAP + 6,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
              padding: '5px 8px', border: 'none', background: 'transparent',
              borderTop: `2px solid ${on ? C.ice : 'transparent'}`,
              color: on ? C.frost : C.textFaint,
              fontFamily: FONT.ui, fontSize: 8.5, letterSpacing: 0.4,
              cursor: 'pointer', whiteSpace: 'nowrap',
              ...(on ? { background: 'linear-gradient(0deg, rgba(127,212,255,0.03), rgba(127,212,255,0.12))' } : {}),
            }}>
            <Icon name={t.icon} size={17} color={on ? C.ice : C.textMute} />
            {t.label}
            {badges[t.key] > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 8,
                minWidth: 15, height: 15, padding: '0 3px', borderRadius: 8,
                display: 'grid', placeItems: 'center',
                background: C.danger, color: '#1a0508',
                fontFamily: FONT.num, fontSize: 9, fontWeight: 700, lineHeight: 1,
              }}>{badges[t.key] > 99 ? '99+' : badges[t.key]}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * BAĞLANIYOR EKRANI — birkaç saniye sonra NE OLDUĞUNU söyler.
 *
 * Eskiden yalnız "fiyorda bağlanıyor…" yazıp susuyordu. Telefondan bu
 * ekranda takılı kalan bir oyuncunun elinde hiçbir bilgi olmuyor, bizim
 * elimizde de: sunucu kaydından bağlantının kurulduğu görülüyor ama
 * ekranın neden boş kaldığı anlaşılmıyordu.
 *
 * Altı saniye sonra bağlantının gerçek durumu yazılıyor: soket bağlı mı,
 * hangi taşıyıcıyı kullanıyor, kaç kez denedi, son hata ne. Bu satırların
 * ekran görüntüsü sorunu tahmin etmeden çözmeye yetiyor.
 */
function BaglaniyorEkrani({ socket, onLogout }) {
  const [gecen, setGecen] = useState(0);
  const [sonHata, setSonHata] = useState(null);

  useEffect(() => {
    const t0 = Date.now();
    const iv = setInterval(() => setGecen(Math.round((Date.now() - t0) / 1000)), 1000);
    const onErr = (e) => setSonHata(e?.message || String(e));
    socket?.on('connect_error', onErr);
    return () => { clearInterval(iv); socket?.off('connect_error', onErr); };
  }, [socket]);

  const gecikti = gecen >= 6;
  const durum = gecikti ? {
    bagli: socket?.connected ? 'evet' : 'hayır',
    tasiyici: socket?.io?.engine?.transport?.name || '—',
    deneme: socket?.io?.backoff?.attempts ?? 0,
    hata: sonHata || '—',
  } : null;

  return (
    <div style={{ position: 'relative', height: 'var(--tn-vh)', background: C.abyss }}>
      {/* Giris ekraniyla ayni arka plan - gecis sirasinda goruntu atlamasin */}
      <LoginBackdrop />
      <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', padding: 16, maxWidth: 420 }}>
          <div style={{
            fontFamily: FONT.head, fontSize: 34, fontWeight: 700,
            letterSpacing: 9, color: C.frost,
          }}>TRANORD</div>
          <div className="tn-pulse" style={{
            fontFamily: FONT.ui, fontSize: 11, letterSpacing: 3,
            color: C.iceDeep, marginTop: 10, textTransform: 'uppercase',
          }}>fiyorda bağlanıyor… {gecen > 2 ? `${gecen} sn` : ''}</div>

          {durum && (
            <div style={{
              marginTop: 18, padding: '10px 12px', borderRadius: 6, textAlign: 'left',
              background: 'rgba(8,15,24,0.72)', border: `1px solid ${C.lineSoft}`,
              fontFamily: FONT.ui, fontSize: 10, color: C.textDim, lineHeight: 1.7,
            }}>
              <div style={{ color: C.warn, marginBottom: 4 }}>
                Beklenenden uzun sürdü — durum:
              </div>
              <div>soket bağlı: <span style={{ color: C.frost }}>{durum.bagli}</span></div>
              <div>taşıyıcı: <span style={{ color: C.frost }}>{durum.tasiyici}</span></div>
              <div>deneme: <span style={{ color: C.frost }}>{durum.deneme}</span></div>
              <div>son hata: <span style={{ color: C.frost }}>{durum.hata}</span></div>
              <div style={{
                display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap',
              }}>
                <button onClick={() => window.location.reload()}
                  style={btn('primary', { fontSize: 10 })}>Yeniden dene</button>
                <button onClick={onLogout} style={btn('ghost', { fontSize: 10 })}>Çıkış yap</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Oyun ──────────────────────────────────────────────────────────────
function Game({ token, onLogout }) {
  /**
   * Socket token'a bağlı: çıkış yapıp başka hesapla girince yenisi kurulur.
   *
   * DİKKAT — socket'i efekt temizliğinde KAPATMAYIN. StrictMode geliştirmede
   * efektleri mount → temizlik → mount diye iki kez çalıştırıyor; temizlikte
   * çağrılan socket.close() bağlantıyı kesmekle kalmıyor, yeniden bağlanmayı
   * da kapatıyor. Sonuç: sunucu CONNECT'in hemen ardından DISCONNECT görüyor,
   * istemci hiç paket alamıyor ve "fiyorda bağlanıyor…" ekranında kalıyor.
   * Kapatma yalnızca AÇIK bir çıkışta yapılır (handleLogout).
   */
  const logoutRef = useRef(onLogout);
  logoutRef.current = onLogout;
  const socket = getSocket(token, () => logoutRef.current());
  const handleLogout = () => {
    dropSocket();
    logoutRef.current();
  };

  /**
   * SUNUCU DOĞRUSU vs EKRANDAKİ DEĞER.
   *
   * `serverVillage` sunucudan gelen son paket; ekranda gösterilen `village`
   * ise onun üzerine geçen sürenin eklenmiş hâli. Sunucu artık her saniye
   * paket yollamıyor (yalnız yapısal değişiklik + 30 sn kalp atışı), bu yüzden
   * kaynakların artışını ve geri sayımları aradaki sürede istemci hesaplıyor.
   *
   * Gelen paket öncekinin ÜZERİNE birleştiriliyor: sunucu değişmeyen alanları
   * (birim tanımları gibi sabitler, değişmemiş rapor listesi) göndermiyor.
   */
  const [serverVillage, setServerVillage] = useState(null);
  const stampRef = useRef(0);
  const [beat, setBeat] = useState(0);
  const [tab, setTab] = useState('harita');
  /*
    BİRLİK HATASI elçilik panelinin İÇİNDE gösteriliyor, ekranın
    üstündeki geçici şeritte değil: bu bir formun cevabı ("bu ad
    alınmış", "böyle bir oyuncu yok") ve oyuncu tam o anda formun
    başında — gözünü ekranın üstüne kaldırmamalı.
  */
  const [birlikHata, setBirlikHata] = useState(null);
  /*
    GELEN SALDIRI ŞERİDİ KAPATILABİLİR.

    İlkan: *"saldırı geliyor görseli başka şeylere basmamı engelliyor
    özellikle telefonda"*. Şerit `position: fixed` ve telefonda ekran
    genişliğinin %92'si kadar; altına denk gelen her düğmeyi yutuyordu
    ve saldırı varış saatine kadar orada duruyordu.

    Uyarıyı silmek çözüm değil — saldırının haberi hayati. Kapatılan
    şeridin ANAHTARLARI saklanıyor: YENİ bir saldırı yola çıkınca
    (anahtar listede yoksa) şerit kendiliğinden geri geliyor. Saldırı
    zaten Seferler sekmesinde de duruyor.
  */
  const [uyariKapali, setUyariKapali] = useState([]);
  // Rehber kartında gösterilecek görev (listeden seçilirse); yoksa sunucunun sırası
  const [questFocus, setQuestFocus] = useState(null);
  /**
   * EKRANDA PANEL AÇIK MI — rehber kartı buna göre rozete iniyor.
   *
   * Kart ekranın sağ-alt köşesine sabitli ve oyunun en sık kullanılan
   * denetimleri de oraya konuyor; ölçümde YÜKSELT düğmesinin %68'ini,
   * işçi "+" düğmesinin %100'ünü örtüyordu (telefonda paneli komple).
   */
  const [panelAcik, setPanelAcik] = useState(false);

  /**
   * YAMA NOTLARI — oyuncu bu sürümü daha önce kapattıysa açılmaz.
   *
   * Kayıt SÜRÜME bağlı: yeni bir yama eklendiğinde panel bir kez daha
   * açılır, yoksa ilk kapatmadan sonra oyuncu hiçbir yeniliği göremezdi.
   * localStorage bazı ortamlarda (gizli sekme, site verisi kapalı) okurken
   * bile hata atıyor — o yüzden her erişim try/catch içinde ve hata
   * durumunda panel GÖSTERİLİYOR (bir kez fazla göstermek, hiç
   * göstermemekten iyi).
   */
  const [yamaOkunan, setYamaOkunan] = useState(okunanlariYukle);
  const [yamaAcik, setYamaAcik] = useState(
    () => gosterilecekBolumler(okunanlariYukle()).length > 0);

  /**
   * Çarpıya basınca O AN EKRANDA DURAN notlar okundu sayılır ve bir daha
   * gösterilmez. Ekranda olmayanı işaretlemiyoruz: oyuncu okumadığı bir notu
   * kaçırmasın.
   */
  const kapatYama = () => {
    const goruluyor = gosterilecekBolumler(yamaOkunan)
      .flatMap((b) => b.notlar.map((n) => n.id));
    const yeni = new Set([...yamaOkunan, ...goruluyor]);
    setYamaOkunan(yeni);
    okunanlariKaydet(yeni);
    setYamaAcik(false);
  };
  /**
   * Yardım sayfasına DERİN BAĞLANTI: bina panelindeki "?" düğmesi buraya
   * 'bina:kisla' gibi bir konu yazıp sekmeyi değiştiriyor. HelpScreen konuyu
   * uyguladıktan sonra geri temizliyor, yoksa sekmeye her dönüşte zıplardı.
   */
  const [helpTopic, setHelpTopic] = useState(null);
  /*
    ORDU SEKMESİNİN ALT SEKMESİ — ordu listesi mi, simülatör mü.
    Durum App'te: sekmeler arasında gezinirken seçim korunsun, oyuncu
    simülatöre her dönüşünde baştan tıklamasın.
  */
  const [orduAlt, setOrduAlt] = useState('ordu');
  const openHelp = (topic) => { setHelpTopic(topic); setTab('yardim'); };
  const [connected, setConnected] = useState(socket.connected);
  /**
   * SUNUCU REDDİ — kısa bir uyarı şeridi.
   *
   * Eskiden sunucu inşa/merkez isteğini sessizce reddediyordu: oyuncu düğmeye
   * basıyor, hiçbir şey olmuyor, sebebi de hiçbir yerde yazmıyordu ("saray
   * kuramıyorum"). Artık sunucu `build_refused` yolluyor ve sebebi burada
   * beliriyor.
   */
  const [refusal, setRefusal] = useState(null);
  const userEmail = emailFromToken(token || '');
  /**
   * OLCU. Raylarin genisligi ve sekmelerin yeri buradan geliyor; sabit
   * artik yalnizca varsayilan (bkz. responsive.js).
   */
  const vp = useViewport();
  const railInset = vp.mobile ? 8 : vp.railW + 8;
  /** Telefonda sag ray cekmece — ust bardaki nufus dugmesi aciyor */
  const [statusOpen, setStatusOpen] = useState(false);
  // Sekme degisince cekmece kapansin, ustunde asili kalmasin
  useEffect(() => { setStatusOpen(false); }, [tab]);

  useEffect(() => {
    const onUpdate = (v) => {
      stampRef.current = Date.now();
      setServerVillage(prev => (prev ? { ...prev, ...v } : v));
    };
    const onConn = () => setConnected(true);
    const onDisc = () => setConnected(false);
    let zaman = null;
    const onRefused = (r) => {
      setRefusal({ text: r?.reason || 'İşlem reddedildi.', at: Date.now() });
      clearTimeout(zaman);
      zaman = setTimeout(() => setRefusal(null), 7000);
    };
    /*
      Takas reddi de aynı şeride düşüyor. Sunucu kısa bir kod yolluyor
      (`depo_dolu` gibi); oyuncunun okuyacağı cümleye burada çevriliyor.
      Sebebi göstermezsek düğmeye basmak hiçbir şey yapmıyormuş gibi olur.
    */
    const PAZAR_SEBEP = {
      depo_dolu: 'Alacağın kaynak depoya sığmıyor.',
      kaynak_yetersiz: 'Verecek kadar kaynağın yok.',
      miktar_az: 'Miktar takas oranının altında.',
      pazar_yok: 'Önce pazar kurman gerekiyor.',
      gecersiz_yon: 'Bu takas yönü kapalı.',
    };
    const onPazar = (r) => {
      if (r?.ok) return;                       // başarılıysa kaynaklar zaten değişti
      const ek = r?.sebep === 'depo_dolu' && r.sigan != null
        ? ` Yalnızca ${Math.floor(r.sigan)} birim yer var.` : '';
      onRefused({ reason: (PAZAR_SEBEP[r?.sebep] || 'Takas reddedildi.') + ek });
    };
    socket.on('village_update', onUpdate);
    socket.on('connect', onConn);
    socket.on('disconnect', onDisc);
    /*
      SEFER HATALARI da aynı şeride. Geri çağırma penceresi kapandıysa
      düğme hâlâ görünüyor olabilir (yayınlar arası gecikme); oyuncu
      "bastım, bir şey olmadı" demesin diye sebebi yazıyoruz.
    */
    const SEFER_SEBEP = {
      sefer_yok: 'Bu sefer artık listede değil.',
      zaten_donuyor: 'Sefer zaten dönüşte.',
      sure_doldu: 'Geri çağırma süresi doldu — ordu yoluna devam ediyor.',
    };
    const onSeferHata = (r) => {
      const metin = SEFER_SEBEP[r?.reason];
      if (metin) onRefused({ reason: metin });
    };
    /*
      KAHRAMAN HATALARI da aynı şeride. Puan dağıtımı sunucuda KISMÎ
      uygulanmıyor: yetmiyorsa istek tamamen reddediliyor. Sebebi
      yazmazsak "+ düğmesi çalışmıyor" gibi görünürdü.
    */
    const KAHRAMAN_SEBEP = {
      kahraman_yok: 'Önce Kahraman Konağı kurman gerekiyor.',
      puan_yetmiyor: 'O kadar dağıtılmamış puanın yok.',
      skil_tavani: 'Bu skil dolu — bir skile en çok 100 puan verilebilir.',
      skil_yok: 'Böyle bir skil yok.',
      gecersiz_adet: 'Geçersiz puan miktarı.',
      yetersiz_kaynak: 'Sıfırlama bedeli için kaynağın yetmiyor.',
      // Macera ve kuşam
      macera_yok: 'Biriken macera hakkın yok.',
      can_dusuk: 'Kahramanın canı çok düşük — önce iyileşmesini bekle.',
      baygin: 'Kahramanın baygın.',
      mesgul: 'Kahraman şu an seferde ya da macerada.',
      konak_yok: 'Önce Kahraman Konağı kurman gerekiyor.',
      gecersiz_tip: 'Böyle bir macera yok.',
      esya_yok: 'O eşya çantanda değil.',
      olu: 'Kahramanın ölü — önce diriltmen gerekiyor.',
      olu_degil: 'Kahramanın zaten yaşıyor.',
      takviyede_degil: 'Kahramanın takviyede değil.',
      kusanilmaz: 'Bu eşya kuşanılmaz, kullanılır.',
      kullanilamaz: 'Bu eşya kullanılabilir değil.',
      slot_yok: 'Böyle bir kuşam slotu yok.',
      slot_bos: 'O slotta zaten eşya yok.',
    };
    /*
      BİRLİK SEBEPLERİ. Sunucu anahtar yolluyor, metin burada — aynı
      sebep hem kur formunda hem davet kutusunda çıkabiliyor ve ikisinde
      de aynı cümle görünmeli.
    */
    const BIRLIK_SEBEP = {
      zaten_birlikte: 'Zaten bir birliktesin.',
      elcilik_yok: 'Önce Elçilik kurman gerekiyor.',
      ad_alinmis: 'Bu ad başka bir birlikte kullanılıyor.',
      gecersiz_amblem: 'Geçersiz amblem.',
      birlikte_degilsin: 'Bir birlikte değilsin.',
      yetki_yok: 'Bunu yapma yetkin yok.',
      oyuncu_yok: 'Böyle bir oyuncu yok.',
      kendini_davet: 'Kendini davet edemezsin.',
      zaten_davetli: 'Bu oyuncuya zaten davet gönderilmiş.',
      davet_yok: 'Bu davet artık geçerli değil.',
      birlik_yok: 'Birlik bulunamadı.',
      birlik_dolu: 'Birlik dolu — Konung elçiliği büyütmeli.',
      uye_degil: 'Bu oyuncu birliğinde değil.',
      kendini_atamazsin: 'Kendini atamazsın; ayrılmak için AYRIL de.',
      konung_ayrilamaz: 'Konung ayrılamaz — önce birliği dağıtman gerekiyor.',
      konung_degistirilemez: 'Konung’un rütbesi değiştirilemez.',
      jarl_tavani: 'Jarl tavanı dolu — önce birini indir.',
      /* ── Diplomasi ── */
      tur_yok: 'Böyle bir ilişki türü yok.',
      kendi_birligin: 'Kendi birliğinle ilişki kuramazsın.',
      senin_teklifin: 'Bu teklifi sen gönderdin — cevabı karşı taraf verir.',
      teklif_yok: 'Cevaplanacak bir teklif yok.',
      iliski_yok: 'Bu birlikle bir ilişkin yok.',
      sunucu: 'Sunucu hatası, tekrar dene.',
    };
    const onBirlikHata = (r) => {
      const anahtar = r?.reason;
      /*
        TANINMAYAN SEBEP OLDUĞU GİBİ GÖSTERİLİYOR. Ad doğrulaması
        sunucudan HAZIR CÜMLE olarak geliyor ("En az 3 karakter
        olmalı"); anahtar sözlüğüne koymak onları burada tekrarlamak
        olurdu ve iki yer ayrışırdı.
      */
      setBirlikHata(BIRLIK_SEBEP[anahtar] || anahtar || 'Birlik işlemi reddedildi.');
    };

    const onKahramanHata = (r) => {
      const metin = KAHRAMAN_SEBEP[r?.reason] || 'Kahraman işlemi reddedildi.';
      onRefused({ reason: r?.metin ? `${metin} (${r.metin})` : metin });
    };
    socket.on('build_refused', onRefused);
    socket.on('pazar_sonuc', onPazar);
    socket.on('army_error', onSeferHata);
    socket.on('birlik_error', onBirlikHata);
    socket.on('kahraman_error', onKahramanHata);
    return () => {
      clearTimeout(zaman);
      socket.off('village_update', onUpdate);
      socket.off('connect', onConn);
      socket.off('disconnect', onDisc);
      socket.off('build_refused', onRefused);
      socket.off('pazar_sonuc', onPazar);
      socket.off('army_error', onSeferHata);
      socket.off('birlik_error', onBirlikHata);
      socket.off('kahraman_error', onKahramanHata);
    };
  }, []);

  // Ekran saati: sunucu sessizken de sayaçlar aksın
  useEffect(() => {
    const id = setInterval(() => setBeat(b => b + 1), 1000);
    return () => clearInterval(id);
  }, []);

  /**
   * Bağlantı kopukken ara doldurma DURUR: sayılar donar, böylece oyuncu
   * "canlı ama hiçbir şey işlemiyor" durumuna düşmez.
   */
  const village = useMemo(
    () => (connected ? extrapolate(serverVillage, Date.now() - stampRef.current) : serverVillage),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serverVillage, beat, connected]);

  const flows = useMemo(() => (village ? computeFlows(village) : {}), [village]);

  /*
    Karşılama anlatımını yeni bitiren oyuncu için geçmiş notlar okunmuş
    sayılır — oyuna başlar başlamaz eski yamaların duvarıyla karşılaşmasın.
    Yalnız BİR KEZ çalışır: `egitimBitti` false'tan true'ya döndüğünde.
  */
  const egitimOnceki = useRef(null);
  useEffect(() => {
    const simdi = village?.egitimBitti;
    if (egitimOnceki.current === false && simdi === true) {
      const hepsi = gosterilecekBolumler(new Set(), true)
        .flatMap(b => b.notlar.map(n => n.id));
      setYamaOkunan(prev => {
        const yeni = new Set([...prev, ...hepsi]);
        okunanlariKaydet(yeni);
        return yeni;
      });
      setYamaAcik(false);
    }
    if (simdi !== undefined) egitimOnceki.current = simdi;
  }, [village?.egitimBitti]);

  if (!village) {
    return <BaglaniyorEkrani socket={socket} onLogout={handleLogout} />;
  }

  const buildProduction         = (slotKey, type, workers) => socket.emit('build_production',          { slotKey, type, workers });
  const upgradeProduction       = (slotKey, workers)       => socket.emit('upgrade_production',        { slotKey, workers });
  const demolishProduction      = (slotKey)                => socket.emit('demolish_production',       { slotKey });
  const assignProductionWorkers = (slotKey, workers)       => socket.emit('assign_production_workers', { slotKey, workers });

  const buildVillage         = (slotKey, buildingType, workers) => socket.emit('build_village',          { slotKey, buildingType, workers });
  const upgradeVillage       = (slotKey, workers)               => socket.emit('upgrade_village',        { slotKey, workers });
  const demolishVillage      = (slotKey)                        => socket.emit('demolish_village',       { slotKey });
  const assignVillageWorkers = (slotKey, workers)               => socket.emit('assign_village_workers', { slotKey, workers });
  const cancelProductionBuild = (slotKey) => socket.emit('cancel_production_build', { slotKey });
  const cancelVillageBuild    = (slotKey) => socket.emit('cancel_village_build',    { slotKey });
  const cancelDemolishVillage = (slotKey) => socket.emit('cancel_demolish_village', { slotKey });
  const seferGeriCagir        = (marchId) => socket.emit('sefer_geri_cagir',        { marchId });

  const queueEquipment  = (buildingType, equipmentType, quantity) => socket.emit('queue_equipment', { buildingType, equipmentType, quantity });
  const cancelEquipment = (buildingType, orderId) => socket.emit('cancel_equipment_order', { buildingType, orderId });
  const trainUnit       = (buildingType, unitType, quantity) => socket.emit('train_unit', { buildingType, unitType, quantity });
  const cancelUnitOrder = (buildingType, orderId) => socket.emit('cancel_unit_order', { buildingType, orderId });
  /* Kuyruk sırası — sunucu çalışan işi baştan kaldırtmıyor (game/kuyruk.js) */
  const reorderUnitOrder = (buildingType, orderId, yon) =>
    socket.emit('reorder_unit_order', { buildingType, orderId, yon });
  const reorderEquipmentOrder = (buildingType, orderId, yon) =>
    socket.emit('reorder_equipment_order', { buildingType, orderId, yon });
  /**
   * ARAŞTIRMA — Rún Salonu. Kaynak sıraya alırken değil, iş başlarken
   * düşülüyor (sunucu tarafı), o yüzden burada kontrol yok: reddedilirse
   * sunucu `build_refused` ile sebebini yolluyor.
   */
  const researchUnit   = (unitType) => socket.emit('research_unit', { unitType });
  const cancelResearch = (orderId)  => socket.emit('cancel_research', { orderId });
  const upgradeEquipment = (buildingType, equipment) =>
    socket.emit('upgrade_equipment', { buildingType, equipment });
  const cancelEquipmentUpgrade = (buildingType, orderId) =>
    socket.emit('cancel_equipment_upgrade', { buildingType, orderId });
  const setSpeed        = (ms) => socket.emit('set_speed', { tickMs: ms });
  const startFestival = (kind) => socket.emit('start_festival', { kind });
  /*
    REVİR — seçilen yaralıların tedavisini başlat. `indeksler` null ise
    hepsi (bkz. saglik.js · iyilesmeyeBasla).
  */
  const saglikIyilestir = (indeksler) => socket.emit('saglik_iyilestir', { indeksler });
  const pazarTakas = (p) => socket.emit('pazar_takas', p);
  /* Oyuncular arası pazar — mal ve tüccar sunucuda ayrılıyor */
  const pazarTeklifAc = (p) => socket.emit('pazar_teklif_ac', p);
  const pazarTeklifIptal = (p) => socket.emit('pazar_teklif_iptal', p);
  const pazarTeklifKabul = (p) => socket.emit('pazar_teklif_kabul', p);

  /*
    BİRLİK OLAYLARI. Hepsi tek yönlü: sunucu kabul ederse yeni durum
    `village_update` ile geliyor, reddederse `birlik_error`. Panel
    kendi başına iyimser güncelleme yapmıyor — birlik durumu birden
    çok oyuncuyu ilgilendiriyor ve tek doğru kaynak sunucu.
  */
  const birlikKur = (p) => { setBirlikHata(null); socket.emit('birlik_kur', p); };

  const birlikDavet = (ad) => { setBirlikHata(null); socket.emit('birlik_davet', { ad }); };
  const birlikDavetGeriAl = (hedefUserId) => socket.emit('birlik_davet_geri_al', { hedefUserId });
  const birlikDavetCevap = (birlikId, kabul) => socket.emit('birlik_davet_cevap', { birlikId, kabul });
  const birlikAyril = () => socket.emit('birlik_ayril');
  const birlikUyeAt = (hedefUserId) => socket.emit('birlik_uye_at', { hedefUserId });
  const birlikJarl = (hedefUserId, jarl) => socket.emit('birlik_jarl', { hedefUserId, jarl });
  const birlikDagit = () => socket.emit('birlik_dagit');
  /**
   * KÖY DEĞİŞTİR. Sunucu yeni köyün payload'unu statiklerle birlikte
   * gönderiyor. Harita sekmesi açıkken de anlık görüntü yenilenmeli —
   * yoksa harita eski köyün çevresinde kalıyor.
   */
  const switchVillage = (slotKey) => {
    socket.emit('switch_village', { slotKey });
    socket.emit('request_world');
  };
  /**
   * MERKEZ KÖYÜ TAŞI — saray panelinden. Sunucu sarayın o köyde ve
   * tamamlanmış olmasını şart koşuyor; reddederse `build_refused` geliyor.
   */
  const setCapital = (slotKey) => socket.emit('set_capital', { slotKey });

  const tickMs = village.tickMs || 1000;

  return (
    <>
      {!connected && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9000,
          background: 'rgba(120,26,32,0.96)', borderBottom: '1px solid #ff8f8f',
          padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: FONT.ui, fontSize: 12, color: '#ffe4e6',
        }}>
          <Icon name="uyari" size={15} color="#ffb8bd" />
          <span>
            <b>Sunucu bağlantısı kopuk.</b> Yeniden bağlanmaya çalışıyorum —
            bu sırada hiçbir komut (inşa, iptal, asker) işlemez. Sunucu penceresi açık mı?
          </span>
          <button onClick={() => window.location.reload()}
            style={btn('ghost', { marginLeft: 'auto', padding: '3px 10px', fontSize: 9.5, letterSpacing: 1 })}>
            YENİLE
          </button>
        </div>
      )}

      {refusal && (
        <div onClick={() => setRefusal(null)}
          title="Kapatmak için tıkla"
          style={{
            position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9100, maxWidth: 520, cursor: 'pointer',
            background: 'rgba(78,58,16,0.96)', border: '1px solid rgba(224,179,87,0.6)',
            borderRadius: 7, padding: '9px 14px',
            display: 'flex', alignItems: 'flex-start', gap: 9,
            boxShadow: '0 12px 34px rgba(0,0,0,.55)',
            fontFamily: FONT.ui, fontSize: 11.5, color: '#f0ddb0', lineHeight: 1.5,
          }}>
          <Icon name="kilit" size={14} color="#e0b357" />
          <span>{refusal.text}</span>
        </div>
      )}

      <TopBar tab={tab} setTab={setTab} tickMs={tickMs} setSpeed={setSpeed}
        userEmail={userEmail} connected={connected} onLogout={handleLogout}
        badges={{ raporlar: unseenCount(village.reports || []),
            mesajlar: village.mesajOkunmamis || 0,
            /*
              GÖREV ÖDÜLÜ SEKMEDE. Telefonda yüzen rehber rozeti kaldırıldı;
              "ödülün hazır" haberi Görevler sekmesinin sayacıyla veriliyor,
              hiçbir şeyin üstünü örtmeden.
            */
            gorevler: (village.quests?.liste || []).filter((q) => q.tamam && !q.alindi).length,
            sefer: (village.marches || []).length + (village.incoming || []).length }}
        hourSeconds={village.marchInfo?.hourSeconds || 3600}
        nufus={{
          population: Math.floor(village.population || 0),
          maxPopulation: Math.floor(village.maxPopulation || 0),
          freeWorkers: Math.floor(village.freeWorkers || 0),
          isStarving: !!village.isStarving,
        }}
        socket={socket}
        villages={village.villages || []}
        activeSlot={village.activeSlot || null}
        onSwitchVillage={switchVillage}
        playerName={village.playerName || ''}
        vp={vp} onOpenStatus={() => setStatusOpen(o => !o)} />

      {/*
        YİYECEK UYARISI — üst barın hemen altında, HER sekmede.
        Açlık tek bir ekranın sorunu değil; köyün tamamını durduruyor.
        Akış artıdayken hiç çizilmiyor, yer kaplamıyor.
      */}
      <FoodWarning yiyecek={village.yiyecek}
        hourSeconds={village.marchInfo?.hourSeconds || 3600}
        worldSpeed={village.worldSpeed || 1} />

      {/*
        İLK GİRİŞ: adı olmayan oyuncuya tek soruluk ekran. Sunucu
        `adVerilmedi` diyorsa gösteriliyor; ad kabul edilince paket
        güncelleniyor ve ekran kendiliğinden kapanıyor.
      */}
      {village.adVerilmedi && <NameGate socket={socket} email={userEmail} />}
      {/*
        KARŞILAMA ANLATIMI — adı olan ama anlatımı görmemiş oyuncuya.
        Ad kapısıyla AYNI ANDA çıkmasın: önce kim olduğunu söylesin,
        sonra oyunu anlatalım. Geçilemez, kapatma düğmesi yok.
      */}
      {!village.adVerilmedi && !village.egitimBitti && <Tutorial socket={socket} />}

      {/* Telefonda kaynak rayi ust barin ALTINDA yatay serit olur */}
      {vp.mobile && (
        <ResourceRail flows={flows} isStarving={village.isStarving} mobile />
      )}

      {/* Gelen saldırı: hangi sekmede olursam olayım görünür. Seferler
          sekmesinde uyarı listenin başında zaten var, orada tekrar etmesin. */}
      {(() => {
        /*
          TAKVİYE ŞERİT AÇMAZ. `dost` seferler yardım; kırmızı "SALDIRI
          YOLDA" şeridini onlar için açmak (İlkan bildirdi) olmayan bir
          tehdide karşı ordu toplatırdı. Süzgeç burada da lazım: yalnız
          dost sefer varken eski kod BOŞ ama `position: fixed` bir kutu
          çiziyor, o kutu da altındaki düğmeleri yutuyordu.
        */
        const dusman = (village.incoming || []).filter(i => !i.dost);
        const kapali = new Set(uyariKapali);
        const acik = dusman.filter(i => !kapali.has(i.key));
        if (tab === 'sefer' || !acik.length) return null;
        return (
          <div onClick={() => setTab('sefer')} style={{
            position: 'fixed', top: vp.mobile ? 96 : 62, left: '50%', transform: 'translateX(-50%)',
            zIndex: 900, width: 'min(420px, calc(var(--tn-vw) * 0.92))', cursor: 'pointer',
          }} title="Seferler sekmesine git">
            <IncomingAlert incoming={acik}
              onKapat={() => setUyariKapali(dusman.map(i => i.key))} />
          </div>
        );
      })()}

      <main style={{
        flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden',
        background: C.abyss,
      }}>
        {/* MANZARA — en arkada, tüm genişlik */}
        {/* Harita sekmesinde manzara YOK — arazi hex'leri zemin */}
        {/*
          Köy Merkezi'nin arkasında ANA BİNA videosu dönüyor; diğer
          sekmelerde çizilmiş fiyort manzarası kalıyor. Video yoksa
          (varlık eksikse) sessizce eski manzaraya düşüyor.
        */}
        {tab !== 'harita' && (
          tab === 'koy'
            ? <VideoBackdrop dim={0.45} blur={1} />
            : <NordicBackdrop variant="fjord" dim={0.38} />
        )}

        {/* SAHNE — tam genişlik: harita rayların ALTINA kadar uzanır */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          {tab === 'harita' && (
            <MapView
              onPanelChange={setPanelAcik}
              socket={socket}
              world={village.world}
              kahraman={village.kahraman}
              activeSlot={village.activeSlot}
              kendiKoyler={village.villages || []}
              birlikId={village.birlik?.id || null}
              pazar={village.pazar || null}
              hourSeconds={village.marchInfo?.hourSeconds || 3600}
              worldSpeed={village.worldSpeed || 1}
              productionTiles={village.productionTiles || {}}
              maxProductionSlots={village.maxProductionSlots || 6}
              anaBina={village.villageBuildings?.['0,0']}
              freeWorkers={village.freeWorkers}
              resources={village.resources}
              flows={flows}
              railInset={railInset}
              myArmy={Object.values(village.army || {}).reduce((a, b) => a + b, 0)}
              army={village.army || {}}
              unitDefs={village.unitDefs || {}}
              unitStatsNow={village.unitStatsNow || {}}
              intel={village.intel || {}}
              saldirilarim={village.saldirilarim || {}}
              yoldakiSeferler={village.yoldakiSeferler || {}}
              tarlaTavani={village.tarlaTavani || 20}
              tarlaTavanlari={village.tarlaTavanlari || null}
              merkezMi={!!village.isCapital}
              marchInfo={village.marchInfo || {}}
              onBuild={buildProduction}
              onUpgrade={upgradeProduction}
              onDemolish={demolishProduction}
              onAssignWorkers={assignProductionWorkers}
              onCancelBuild={(area, slotKey) => (area === 'production'
                ? cancelProductionBuild(slotKey)
                : cancelVillageBuild(slotKey))}
              onUpgradeAnaBina={(w) => upgradeVillage('0,0', w)}
              onEnterVillageCenter={() => setTab('koy')}
            />
          )}

          {tab === 'koy' && (
            <VillageCenter
              onPanelChange={setPanelAcik}
              productionTiles={village.productionTiles || {}}
              world={village.world}
              hourSeconds={village.marchInfo?.hourSeconds || 3600}
              worldSpeed={village.worldSpeed || 1}
              culture={village.culture || null}
              expansion={village.expansion || null}
              festival={village.festival || null}
              festivalDefs={village.festivalDefs || {}}
              onStartFestival={startFestival}
              pazar={village.pazar || null}
              saglik={village.saglik || null}
              merkezTasimaBedeli={village.merkezTasimaBedeli || null}
              tarlaTavanlari={village.tarlaTavanlari || null}
              onIyilestir={saglikIyilestir}
              onPazarTakas={pazarTakas}
              socket={socket}
              onPazarTeklifAc={pazarTeklifAc}
              onPazarTeklifIptal={pazarTeklifIptal}
              onPazarTeklifKabul={pazarTeklifKabul}
              birlik={village.birlik || null}
              birlikDavetlerim={village.birlikDavetlerim || []}
              birlikTanim={village.birlikTanim || null}
              birlikHata={birlikHata}
              onBirlikKur={birlikKur}
              onBirlikDavet={birlikDavet}
              onBirlikDavetGeriAl={birlikDavetGeriAl}
              onBirlikDavetCevap={birlikDavetCevap}
              onBirlikAyril={birlikAyril}
              onBirlikUyeAt={birlikUyeAt}
              onBirlikJarl={birlikJarl}
              onBirlikDagit={birlikDagit}
              villages={village.villages || []}
              activeSlot={village.activeSlot || null}
              capitalSlot={village.capitalSlot || null}
              uniqueOwners={village.uniqueOwners || {}}
              onSetCapital={setCapital}
              research={village.research || {}}
              researchQueue={village.researchQueue || []}
              onResearchUnit={researchUnit}
              onCancelResearch={cancelResearch}
              equipmentUpgrade={village.equipmentUpgrade || {}}
              upgradeQueues={village.upgradeQueues || {}}
              unitStatsNow={village.unitStatsNow || {}}
              onUpgradeEquipment={upgradeEquipment}
              onCancelEquipmentUpgrade={cancelEquipmentUpgrade}
              villageBuildings={village.villageBuildings || {}}
              towerSlots={village.towerSlots || []}
              freeWorkers={village.freeWorkers}
              resources={village.resources}
              processingRates={village.processingRates || {}}
              flows={flows}
              railInset={railInset}
              equipment={village.equipment || {}}
              equipmentCaps={village.equipmentCaps || {}}
              equipmentPool={village.equipmentPool || { capacity: 0, used: 0, free: 0 }}
              equipmentQueues={village.equipmentQueues || {}}
              equipmentByBuilding={village.equipmentByBuilding || {}}
              equipmentDefs={village.equipmentDefs || {}}
              unitQueues={village.unitQueues || {}}
              unitsByBuilding={village.unitsByBuilding || {}}
              unitDefs={village.unitDefs || {}}
              onBuild={buildVillage}
              onUpgrade={upgradeVillage}
              onDemolish={demolishVillage}
              onAssignVillageWorkers={assignVillageWorkers}
              onCancelBuild={cancelVillageBuild}
              onCancelDemolish={cancelDemolishVillage}
              onOpenHelp={openHelp}
              onQueueEquipment={queueEquipment}
              onCancelEquipment={cancelEquipment}
              onTrainUnit={trainUnit}
              onCancelUnitOrder={cancelUnitOrder}
              onReorderUnitOrder={reorderUnitOrder}
              onReorderEquipment={reorderEquipmentOrder}
            />
          )}

          {tab === 'isciler' && (
            <div className="tn-scroll" style={{
              height: '100%', overflowY: 'auto',
              paddingLeft: railInset, paddingRight: railInset,
              /*
                TELEFONDA ALT BOŞLUK. Rehber rozeti ekranın sol-altında
                yüzüyor; boşluk olmadan listenin son satırları onun altında
                kalıyor ve işçi +/- düğmeleri tıklanamıyordu (ölçüldü:
                Köylüler'de 3, Köy Merkezi'nde 2 denetim örtülüydü).
              */
              paddingBottom: vp.mobile ? 64 : 0,
            }}>
              <WorkerScreen
                population={village.population || 0}
                freeWorkers={village.freeWorkers || 0}
                villageBuildings={village.villageBuildings || {}}
                productionTiles={village.productionTiles || {}}
                army={village.army || {}}
                unitQueues={village.unitQueues || {}}
                marches={village.marches || []}
                unitDefs={village.unitDefs || {}}
                consumption={village.consumption || null}
                villageName={(village.villages || [])
                  .find(v => v.slotKey === village.activeSlot)?.name || null}
                onAssignVillageWorkers={assignVillageWorkers}
                onAssignProductionWorkers={assignProductionWorkers} />
            </div>
          )}

          {tab === 'ordu' && (
            <div className="tn-scroll" style={{
              height: '100%', overflowY: 'auto',
              paddingLeft: railInset, paddingRight: railInset,
              /*
                TELEFONDA ALT BOŞLUK. Rehber rozeti ekranın sol-altında
                yüzüyor; boşluk olmadan listenin son satırları onun altında
                kalıyor ve işçi +/- düğmeleri tıklanamıyordu (ölçüldü:
                Köylüler'de 3, Köy Merkezi'nde 2 denetim örtülüydü).
              */
              paddingBottom: vp.mobile ? 64 : 0,
            }}>
              <OrduSekmesi
                alt={orduAlt} setAlt={setOrduAlt}
                socket={socket}
                unitDefs={village.unitDefs || {}}
                army={village.army || {}} />
              {orduAlt === 'ordu' && (
              <ArmyPanel
                army={village.army || {}}
                savunmaYapilari={village.savunmaYapilari || null}
                kahraman={village.kahraman || null}
                unitDefs={village.unitDefs || {}}
                equipmentDefs={village.equipmentDefs || {}}
                unitStatsNow={village.unitStatsNow || {}}
                takviyeler={village.takviyeler || []}
                takviyelerim={village.takviyelerim || []}
                /*
                  Kısmî geri çağırma: panel { hostKey, slotKey, units }
                  yolluyor. `units` verilmezse sunucu hepsini çekiyor.
                */
                onGeriCagir={(istek) =>
                  socket?.emit('takviye_geri_cagir', istek)}
                /*
                  Ev sahibi misafiri geri yollar. Ekmeğini ödeyen taraf o;
                  vazgeçmiş bir oyuncunun bıraktığı takviye köyü sessizce
                  aç bırakabiliyordu ve çıkış yolu yoktu.
                */
                onGeriYolla={(istek) =>
                  socket?.emit('takviye_geri_yolla', istek)}
              />
              )}
              {orduAlt === 'simulator' && (
                <BattleSimulator socket={socket}
                  unitDefs={village.unitDefs || {}} army={village.army || {}} />
              )}
            </div>
          )}

          {/*
            SEFERLER — giden ve gelen her hareket tek ekranda: saldırı,
            yağma, keşif ve göçmen seferleri. Ordu sekmesi yalnız köydeki
            birimleri gösteriyor.
          */}
          {tab === 'sefer' && (
            <div className="tn-scroll" style={{
              height: '100%', overflowY: 'auto',
              paddingLeft: railInset, paddingRight: railInset,
              /*
                TELEFONDA ALT BOŞLUK. Rehber rozeti ekranın sol-altında
                yüzüyor; boşluk olmadan listenin son satırları onun altında
                kalıyor ve işçi +/- düğmeleri tıklanamıyordu (ölçüldü:
                Köylüler'de 3, Köy Merkezi'nde 2 denetim örtülüydü).
              */
              paddingBottom: vp.mobile ? 64 : 0,
            }}>
              <div style={{ maxWidth: 1240, margin: '0 auto', paddingTop: 12 }}>
                <IncomingAlert incoming={village.incoming || []} />
                <MarchPanel
                  marches={village.marches || []}
                  incoming={village.incoming || []}
                  unitDefs={village.unitDefs || {}}
                  maxMarches={village.marchInfo?.maxMarches || 8}
                  kahraman={village.kahraman}
                  digerSeferler={village.digerKoySeferleri || []}
                  hourSeconds={village.marchInfo?.hourSeconds || 3600}
                  worldSpeed={village.worldSpeed || 1}
                  onRecall={seferGeriCagir} />
              </div>
            </div>
          )}

          {tab === 'gorevler' && (
            <div className="tn-scroll" style={{
              height: '100%', overflowY: 'auto',
              paddingLeft: railInset, paddingRight: railInset,
              /*
                TELEFONDA ALT BOŞLUK. Rehber rozeti ekranın sol-altında
                yüzüyor; boşluk olmadan listenin son satırları onun altında
                kalıyor ve işçi +/- düğmeleri tıklanamıyordu (ölçüldü:
                Köylüler'de 3, Köy Merkezi'nde 2 denetim örtülüydü).
              */
              paddingBottom: vp.mobile ? 64 : 0,
            }}>
              <QuestScreen quests={village.quests || null} focus={questFocus}
                onFocus={setQuestFocus}
                onClaim={(id) => socket?.emit('claim_quest', { id })}
                onToggle={(hidden) => socket?.emit('toggle_quests', { hidden })}
                onGoTab={(t) => t && setTab(t)} />
            </div>
          )}

          {tab === 'raporlar' && (
            <div className="tn-scroll" style={{
              height: '100%', overflowY: 'auto',
              paddingLeft: railInset, paddingRight: railInset,
              /*
                TELEFONDA ALT BOŞLUK. Rehber rozeti ekranın sol-altında
                yüzüyor; boşluk olmadan listenin son satırları onun altında
                kalıyor ve işçi +/- düğmeleri tıklanamıyordu (ölçüldü:
                Köylüler'de 3, Köy Merkezi'nde 2 denetim örtülüydü).
              */
              paddingBottom: vp.mobile ? 64 : 0,
            }}>
              <ReportScreen
                reports={village.reports || []}
                unitDefs={village.unitDefs || {}} />
            </div>
          )}

          {tab === 'kahraman' && (
            <div className="tn-scroll" style={{
              height: '100%', overflowY: 'auto',
              paddingLeft: railInset, paddingRight: railInset,
              paddingBottom: vp.mobile ? 64 : 0,
            }}>
              <HeroPanel
                kahraman={village.kahraman}
                villages={village.villages || []}
                hourSeconds={village.marchInfo?.hourSeconds || 3600}
                worldSpeed={village.worldSpeed || 1}
                onGoTab={setTab}
                onMacera={(tip) => socket.emit('macera_baslat', { tip })}
                onKusan={(indeks) => socket.emit('kusam_kusan', { indeks })}
                onCikar={(slot) => socket.emit('kusam_cikar', { slot })}
                onAt={(indeks) => socket.emit('kusam_at', { indeks })}
                onGeriCagir={() => socket.emit('kahraman_geri_cagir')}
                onDirilt={(yol) => {
                  /*
                    HAMMADDEYLE DİRİLTME GERİ ALINAMAZ bir harcama ve bedel
                    seviyeyle büyüyor — onay şart. İksir yolu da tek ve
                    nadir bir eşyayı tüketiyor, o da sorulmalı.
                  */
                  const k = village.kahraman;
                  const metin = yol === 'iksir'
                    ? ['Diriltme İksiri kullanılsın mı?', '',
                      'İksir tükenir, geri gelmez.'].join('\n')
                    : ['Kahramanın hammadde ödenerek diriltilsin mi?', '', 'Bedel: '].join('\n')
                      + Object.entries(k?.dirilmeBedeli || {})
                        .map(([kk, n]) => `${n} ${RES_LABEL[kk] || kk}`).join(', ');
                  if (window.confirm(metin)) socket.emit('kahraman_dirilt', { yol });
                }}
                onPuan={(skil, adet) => socket.emit('kahraman_puan', { skil, adet })}
                onSifirla={() => {
                  /*
                    SIFIRLAMA GERİ ALINAMAZ ve BEDELLİ — onay şart.
                    Yanlış tıklama oyuncunun kaynağını yakıp bütün
                    puanlarını yeniden dağıtmasını gerektirirdi.
                  */
                  const bedel = Object.entries(village.kahraman?.sifirlamaBedeli || {})
                    .map(([k, n]) => `${n} ${k}`).join(', ');
                  if (window.confirm(
                    'Kahramanın bütün skil puanları geri verilsin mi?\n\n'
                    + `• Bedel: ${bedel}\n`
                    + '• Bir sonraki sıfırlama İKİ KATI tutar.')) {
                    socket.emit('kahraman_sifirla');
                  }
                }}
              />
            </div>
          )}

          {tab === 'mesajlar' && (
            <div className="tn-scroll" style={{
              height: '100%', overflowY: 'auto',
              paddingLeft: railInset, paddingRight: railInset,
              paddingBottom: vp.mobile ? 64 : 0,
            }}>
              <MessageScreen socket={socket} playerName={village.playerName || ''}
                birlik={village.birlik || null} />
            </div>
          )}

          {tab === 'istatistik' && (
            <div className="tn-scroll" style={{
              height: '100%', overflowY: 'auto',
              paddingLeft: railInset, paddingRight: railInset,
              /*
                TELEFONDA ALT BOŞLUK. Rehber rozeti ekranın sol-altında
                yüzüyor; boşluk olmadan listenin son satırları onun altında
                kalıyor ve işçi +/- düğmeleri tıklanamıyordu (ölçüldü:
                Köylüler'de 3, Köy Merkezi'nde 2 denetim örtülüydü).
              */
              paddingBottom: vp.mobile ? 64 : 0,
            }}>
              <StatsScreen socket={socket} />
            </div>
          )}

          {tab === 'yardim' && (
            <div style={{
              height: '100%', minHeight: 0,
              padding: `8px ${railInset}px`,
              boxSizing: 'border-box',
            }}>
              <HelpScreen
                unitDefs={village.unitDefs || {}}
                equipmentDefs={village.equipmentDefs || {}}
                equipmentByBuilding={village.equipmentByBuilding || {}}
                hourSeconds={village.marchInfo?.hourSeconds || 3600}
                worldSpeed={village.worldSpeed || 1}
                topic={helpTopic}
                onTopicHandled={() => setHelpTopic(null)} />
            </div>
          )}


        </div>

        {/* SOL RAY — sahnenin üstünde yüzen cam panel (telefonda üstteki şerit) */}
        {!vp.mobile && (
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 6, display: 'flex' }}>
            <ResourceRail flows={flows} isStarving={village.isStarving} railW={vp.railW} />
          </div>
        )}

        {/* Çekmece perdesi — dışına dokununca kapanır */}
        {vp.mobile && statusOpen && (
          <div onClick={() => setStatusOpen(false)} style={{
            position: 'absolute', inset: 0, zIndex: 39, background: 'rgba(0,0,0,0.45)',
          }} />
        )}

        {/* SAĞ RAY — telefonda sağdan açılan çekmece */}
        <div className="tn-scroll" style={vp.mobile ? {
          position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 40,
          display: statusOpen ? 'flex' : 'none',
          width: 'min(300px, calc(var(--tn-vw) * 0.86))', overflowY: 'auto',
          background: 'linear-gradient(180deg, rgba(10,18,28,0.97), rgba(7,13,21,0.97))',
          borderLeft: `1px solid ${C.lineSoft}`,
          boxShadow: '-14px 0 40px rgba(0,0,0,.55)',
        } : { position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 6, display: 'flex' }}>
          <StatusRail
            population={village.population}
            civilians={village.civilians ?? null}
            maxPopulation={village.maxPopulation}
            freeWorkers={village.freeWorkers}
            populationGrowthRate={village.populationGrowthRate || 0}
            populationPerHour={village.populationPerHour || 0}
            culture={village.culture || null}
            festival={village.festival || null}
            kahraman={village.kahraman}
            hourSeconds={village.marchInfo?.hourSeconds || 3600}
            worldSpeed={village.worldSpeed || 1}
            isStarving={village.isStarving || false}
            consumption={village.consumption || {}}
            equipment={village.equipment || {}}
            equipmentCaps={village.equipmentCaps || {}}
            equipmentPool={village.equipmentPool || { capacity: 0, used: 0, free: 0 }}
            kusatmaHavuz={village.kusatmaHavuz || { capacity: 0, used: 0, free: 0 }}
            buildQueue={village.buildQueue || []}
            onCancelBuild={(item) => (item.area === 'production'
              ? cancelProductionBuild(item.slotKey)
              : cancelVillageBuild(item.slotKey))}
            army={village.army || {}}
            unitDefs={village.unitDefs || {}}
            tickMs={tickMs}
            railW={vp.mobile ? '100%' : vp.railW}
            mobile={vp.mobile}
          />
        </div>
      </main>

      {/* Telefonda sekmeler altta */}
      {vp.mobile && (
        <BottomTabs tab={tab} setTab={setTab}
          badges={{ raporlar: unseenCount(village.reports || []),
            /*
              GÖREV ÖDÜLÜ SEKMEDE. Telefonda yüzen rehber rozeti kaldırıldı;
              "ödülün hazır" haberi Görevler sekmesinin sayacıyla veriliyor,
              hiçbir şeyin üstünü örtmeden.
            */
            gorevler: (village.quests?.liste || []).filter((q) => q.tamam && !q.alindi).length,
            sefer: (village.marches || []).length + (village.incoming || []).length }} />
      )}

      {/*
        REHBER — her ekranın üstünde. Kart aktif görevi gösterir, spotlight
        gidilecek yeri yakıp söndürür. Rehber kapalıyken kart rozete iner
        ama görevler arka planda işlemeye devam eder.
      */}
{/*
        YAMA NOTLARI YENİ OYUNCUYA AÇILMAZ.

        İlk girişte 60+ eski not karşılama anlatımının önüne yığılıyordu:
        oyuna hiç başlamamış birine "koçbaşı artık yalnız suru indiriyor"
        yazmanın anlamı yok. Anlatım bitene kadar panel hiç çizilmiyor;
        bittikten sonra da yalnız BUNDAN SONRAKİ notlar gelsin diye
        eskiler okunmuş sayılıyor (aşağıdaki effect).
      */}
      <YamaNotlari acik={yamaAcik && village.egitimBitti !== false}
        onKapat={kapatYama} okunan={yamaOkunan}
        mobile={vp.mobile} railW={vp.railW} />
      {/*
        TELEFONDA YÜZEN REHBER YOK.

        Rozet ekranın alt köşesinde yüzüyordu; kaydırılan bir listede yüzen
        her şey er geç bir denetimin üstüne gelir — ölçüldü: Köylüler'de 3,
        Köy Merkezi'nde 2 denetim örtülüydü, işçi +/- düğmeleri
        tıklanamıyordu. Alt boşluk da çözmüyor, çünkü örtme listenin
        ORTASINDA oluyor.

        Telefonda görev durumu Görevler sekmesinin sayacında; kart
        masaüstünde aynen duruyor.
      */}
      {/*
        ÖLÇÜT YİNE GENİŞLİKTİ — YATAY TELEFONDA KART GERİ GELİYORDU.

        `!vp.mobile` yan çevrilmiş telefonda (896×414) doğru dönüyor,
        kart açılıyor ve yukarıda anlatılan örtme sorunu aynen tekrar
        ediyordu: Görevler'de GÖSTER, Köylüler'de ±/MAKS, Simülatör'de
        SAVAŞ düğmelerinin üstünü kapatıyordu (denetim taramasıyla
        ölçüldü). Kısa ekranda yüzen karta yer yok.
      */}
      {/*
        GÖREVLER SEKMESİNDEYKEN KART GEREKSİZ — ve zararlı.
        Aynı görevler zaten tam ekran listede; yüzen kart üstüne biniyor
        ve 768×1024 tablette listedeki ÖDÜL ile GÖSTER düğmelerinin
        üstünü kapatıyordu (denetim taramasıyla ölçüldü).
      */}
      {/*
        ÖLÇÜT EKRAN GENİŞLİĞİ DEĞİL, İÇERİĞE KALAN BANT.

        `!vp.mobile` 768×1024 tablette doğru dönüyor ve kart geri geliyor;
        ama raylar iki yandan 300 px yediği için içerik sütunu 468 px'e
        düşüyor, denetimler kartın yüzdüğü sağ-alt köşeye kadar uzanıyor
        ve kart onları örtüyor — Köylüler'de kaydırıcılar, Simülatör'de
        sayı kutuları (denetim taramasıyla ölçüldü). Yukarıdaki yorumun
        anlattığı sorunun aynısı, bu kez tablette.

        Kart ancak yanında GERÇEKTEN boş yer varken yüzer.
      */}
      {!vp.mobile && vp.h >= 520 && tab !== 'gorevler'
        && (vp.w - 2 * (vp.railW || 0)) >= 700 && (
        <QuestCard quests={village.quests || null} mobile={vp.mobile} focus={questFocus}
          bastir={panelAcik || yamaAcik}
          onClaim={(id) => socket?.emit('claim_quest', { id })}
          onToggle={(hidden) => socket?.emit('toggle_quests', { hidden })}
          onGoTab={(t) => t && setTab(t)} />
      )}
      <Spotlight
        on={!!village.quests && !village.quests.hidden && tab !== 'gorevler'}
        anchor={(() => {
          const liste = village.quests?.liste || [];
          const q = liste.find(x => x.id === (questFocus || village.quests?.aktif));
          if (!q || q.tamam) return null;
          /*
            İKİ KADEMELİ: yanlış sekmedeysem SEKME düğmesi, doğru
            sekmedeysem sayfadaki asıl hedef (tarla, boş arazi, işçi
            kaydıracı, YÜKSELT düğmesi) işaretlenir.
          */
          if (q.tab && q.tab !== tab) return `tab-${q.tab}`;
          return q.anchor || null;
        })()} />
    </>
  );
}

/**
 * KÖK — token yoksa giriş ekranı, varsa oyun.
 *
 * Giriş eskiden ayrı bir siteye (Cloudflare Pages'teki landing) yönlendirmeyle
 * yapılıyordu; oyun tek sunucuda servis edileceği için o ayrı parçaya gerek
 * kalmadı ve senkron tutulacak bir yer eksildi.
 */
export default function App() {
  const [token, setToken] = useState(() => getToken());

  /**
   * Müzik oyun AÇILIR AÇILMAZ başlar — giriş ekranı dahil. Tarayıcı sesli
   * otomatik oynatmayı engellerse çalar ilk tıklamayı bekler (bkz. audio.js).
   */
  useEffect(() => { startMusic(); }, []);

  const onToken = (t) => { localStorage.setItem(TOKEN_KEY, t); setToken(t); };
  const onLogout = () => { localStorage.removeItem(TOKEN_KEY); setToken(null); };

  if (!token) return <LoginScreen serverUrl={SERVER_URL} onToken={onToken} />;
  return <Game token={token} onLogout={onLogout} />;
}
