import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import MapView         from './components/MapView';
import VillageCenter   from './components/VillageCenter';
import HelpScreen      from './components/HelpScreen';
import MusicButton     from './components/MusicButton';
import VillageSwitcher from './components/VillageSwitcher';
import { ProfileButton, NameGate } from './components/ProfilePanel';
import DevMenu        from './components/DevMenu';
import WorkerScreen   from './components/WorkerScreen';
import { startMusic }  from './audio';
import ArmyPanel       from './components/ArmyPanel';
import BattleSimulator from './components/BattleSimulator';
import { MarchPanel, IncomingAlert } from './components/WarPanel';
import ReportScreen, { unseenCount } from './components/ReportScreen';
import QuestScreen, { QuestCard, Spotlight } from './components/QuestGuide';
import LoginScreen from './components/LoginScreen';
import LoginBackdrop from './components/LoginBackdrop';
import StatsScreen from './components/StatsScreen';
import ResourceRail    from './components/ResourceRail';
import StatusRail      from './components/StatusRail';
import NordicBackdrop  from './components/NordicBackdrop';
import VideoBackdrop   from './components/VideoBackdrop';
import Icon            from './components/Icons';
import { computeFlows, extrapolate } from './flows';
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

const TABS = [
  { key: 'harita',    label: 'Harita',           icon: 'harita' },
  { key: 'koy',       label: 'Köy Merkezi',      icon: 'koy' },
  { key: 'isciler',   label: 'Köylüler',         icon: 'isci' },
  { key: 'ordu',      label: 'Ordu',             icon: 'ordu' },
  { key: 'sefer',     label: 'Seferler',         icon: 'harita' },
  { key: 'gorevler',  label: 'Görevler',         icon: 'bilgi' },
  { key: 'raporlar',  label: 'Raporlar',         icon: 'savas' },
  { key: 'istatistik', label: 'İstatistik',      icon: 'bonus' },
  { key: 'simulator', label: 'Savaş Simülatörü', icon: 'kilic' },
  { key: 'yardim',    label: 'Yardım',           icon: 'bilgi' },
];

const SPEED_STEPS = [0.1, 0.5, 1, 2, 4, 8, 16, 32, 64, 128];
// Ray genişliği artık ekrana göre: bkz. responsive.js -> useViewport().railW

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

export function TopBar({ tab, setTab, tickMs, setSpeed, userEmail, connected, onLogout, badges = {}, hourSeconds = 3600, socket = null,
  villages = [], activeSlot = null, onSwitchVillage, playerName = '',
  vp = { mobile: false, railW: 186 }, onOpenStatus }) {
  const dar = vp.mobile;
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
        width: dar ? 'auto' : vp.railW, flexShrink: 0,
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
        */}
        <div style={{ lineHeight: 1, display: (dar && villages.length > 1) ? 'none' : 'block' }}>
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
      <nav className="tn-scroll"
        style={{ flex: 1, display: dar ? 'none' : 'flex', alignItems: 'stretch', paddingLeft: 6, minWidth: 0, overflowX: 'auto' }}>
        {TABS.map(t => {
          const on = tab === t.key;
          return (
            <button key={t.key} data-tut={`tab-${t.key}`} onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '0 15px', border: 'none', background: 'transparent',
                borderBottom: `2px solid ${on ? C.ice : 'transparent'}`,
                color: on ? C.frost : C.textFaint,
                fontFamily: FONT.head, fontSize: 13.5, fontWeight: on ? 600 : 500,
                letterSpacing: 1.1, cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'color .14s, border-color .14s, background .14s',
                ...(on ? { background: 'linear-gradient(180deg, rgba(127,212,255,0.03), rgba(127,212,255,0.11))' } : {}),
              }}
              onMouseOver={(e) => { if (!on) e.currentTarget.style.color = C.textDim; }}
              onMouseOut={(e) => { if (!on) e.currentTarget.style.color = C.textFaint; }}
            >
              <Icon name={t.icon} size={15} color={on ? C.ice : C.textMute} />
              {t.label}
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
      </nav>

      {/* Hız + kullanıcı */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: dar ? 4 : 12,
        padding: dar ? '0 6px' : '0 14px', flexShrink: 0,
        marginLeft: dar ? 'auto' : 0,
        borderLeft: `1px solid ${C.lineSoft}`,
      }}>
        {/* Durum rayi telefonda cekmecede — buradan acilir */}
        {dar && (
          <button type="button" onClick={onOpenStatus} title="Durum"
            style={{
              width: TAP - 8, height: TAP - 8, display: 'grid', placeItems: 'center',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}>
            <Icon name="nufus" size={17} color={C.iceDeep} />
          </button>
        )}
        {/* Müzik — tam ayarlar menüsü gelene kadar tek denetim burası */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 2px' }}>
          <MusicButton />
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
  return (
    <nav className="tn-scroll" style={{
      flexShrink: 0, display: 'flex', alignItems: 'stretch',
      overflowX: 'auto', overflowY: 'hidden',
      background: 'linear-gradient(0deg, rgba(9,15,21,0.96) 0%, rgba(12,20,28,0.88) 100%)',
      borderTop: `1px solid ${C.lineSoft}`,
      backdropFilter: 'blur(16px) saturate(1.15)',
      WebkitBackdropFilter: 'blur(16px) saturate(1.15)',
      /* iPhone'da alt cubugun altinda kalmasin */
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
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
   * Yardım sayfasına DERİN BAĞLANTI: bina panelindeki "?" düğmesi buraya
   * 'bina:kisla' gibi bir konu yazıp sekmeyi değiştiriyor. HelpScreen konuyu
   * uyguladıktan sonra geri temizliyor, yoksa sekmeye her dönüşte zıplardı.
   */
  const [helpTopic, setHelpTopic] = useState(null);
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
    socket.on('village_update', onUpdate);
    socket.on('connect', onConn);
    socket.on('disconnect', onDisc);
    socket.on('build_refused', onRefused);
    return () => {
      clearTimeout(zaman);
      socket.off('village_update', onUpdate);
      socket.off('connect', onConn);
      socket.off('disconnect', onDisc);
      socket.off('build_refused', onRefused);
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

  if (!village) {
    return (
      <div style={{ position: 'relative', height: '100dvh', background: C.abyss }}>
        {/* Giris ekraniyla ayni arka plan - gecis sirasinda goruntu atlamasin */}
        <LoginBackdrop />
        <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: FONT.head, fontSize: 34, fontWeight: 700,
              letterSpacing: 9, color: C.frost,
            }}>TRANORD</div>
            <div className="tn-pulse" style={{
              fontFamily: FONT.ui, fontSize: 11, letterSpacing: 3,
              color: C.iceDeep, marginTop: 10, textTransform: 'uppercase',
            }}>fiyorda bağlanıyor…</div>
          </div>
        </div>
      </div>
    );
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

  const queueEquipment  = (buildingType, equipmentType, quantity) => socket.emit('queue_equipment', { buildingType, equipmentType, quantity });
  const cancelEquipment = (buildingType, orderId) => socket.emit('cancel_equipment_order', { buildingType, orderId });
  const trainUnit       = (buildingType, unitType, quantity) => socket.emit('train_unit', { buildingType, unitType, quantity });
  const cancelUnitOrder = (buildingType, orderId) => socket.emit('cancel_unit_order', { buildingType, orderId });
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
            sefer: (village.marches || []).length + (village.incoming || []).length }}
        hourSeconds={village.marchInfo?.hourSeconds || 3600}
        socket={socket}
        villages={village.villages || []}
        activeSlot={village.activeSlot || null}
        onSwitchVillage={switchVillage}
        playerName={village.playerName || ''}
        vp={vp} onOpenStatus={() => setStatusOpen(o => !o)} />

      {/*
        İLK GİRİŞ: adı olmayan oyuncuya tek soruluk ekran. Sunucu
        `adVerilmedi` diyorsa gösteriliyor; ad kabul edilince paket
        güncelleniyor ve ekran kendiliğinden kapanıyor.
      */}
      {village.adVerilmedi && <NameGate socket={socket} email={userEmail} />}

      {/* Telefonda kaynak rayi ust barin ALTINDA yatay serit olur */}
      {vp.mobile && (
        <ResourceRail flows={flows} isStarving={village.isStarving} mobile />
      )}

      {/* Gelen saldırı: hangi sekmede olursam olayım görünür. Seferler
          sekmesinde uyarı listenin başında zaten var, orada tekrar etmesin. */}
      {tab !== 'sefer' && (village.incoming || []).length > 0 && (
        <div onClick={() => setTab('sefer')} style={{
          position: 'fixed', top: vp.mobile ? 96 : 62, left: '50%', transform: 'translateX(-50%)',
          zIndex: 900, width: 'min(420px, 92vw)', cursor: 'pointer',
        }} title="Seferler sekmesine git">
          <IncomingAlert incoming={village.incoming} />
        </div>
      )}

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
              world={village.world}
              hourSeconds={village.marchInfo?.hourSeconds || 3600}
              worldSpeed={village.worldSpeed || 1}
              culture={village.culture || null}
              expansion={village.expansion || null}
              festival={village.festival || null}
              festivalDefs={village.festivalDefs || {}}
              onStartFestival={startFestival}
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
              onOpenHelp={openHelp}
              onQueueEquipment={queueEquipment}
              onCancelEquipment={cancelEquipment}
              onTrainUnit={trainUnit}
              onCancelUnitOrder={cancelUnitOrder}
            />
          )}

          {tab === 'isciler' && (
            <div className="tn-scroll" style={{
              height: '100%', overflowY: 'auto',
              paddingLeft: railInset, paddingRight: railInset,
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
            }}>
              <ArmyPanel
                army={village.army || {}}
                unitDefs={village.unitDefs || {}}
                equipmentDefs={village.equipmentDefs || {}}
                unitStatsNow={village.unitStatsNow || {}}
              />
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
            }}>
              <div style={{ maxWidth: 1240, margin: '0 auto', paddingTop: 12 }}>
                <IncomingAlert incoming={village.incoming || []} />
                <MarchPanel
                  marches={village.marches || []}
                  incoming={village.incoming || []}
                  unitDefs={village.unitDefs || {}}
                  maxMarches={village.marchInfo?.maxMarches || 8} />
              </div>
            </div>
          )}

          {tab === 'gorevler' && (
            <div className="tn-scroll" style={{
              height: '100%', overflowY: 'auto',
              paddingLeft: railInset, paddingRight: railInset,
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
            }}>
              <ReportScreen
                reports={village.reports || []}
                unitDefs={village.unitDefs || {}} />
            </div>
          )}

          {tab === 'istatistik' && (
            <div className="tn-scroll" style={{
              height: '100%', overflowY: 'auto',
              paddingLeft: railInset, paddingRight: railInset,
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

          {tab === 'simulator' && (
            <div className="tn-scroll" style={{
              height: '100%', overflowY: 'auto',
              paddingLeft: railInset, paddingRight: railInset,
            }}>
              <BattleSimulator socket={socket} unitDefs={village.unitDefs || {}} army={village.army || {}} />
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
          width: 'min(300px, 86vw)', overflowY: 'auto',
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
            hourSeconds={village.marchInfo?.hourSeconds || 3600}
            worldSpeed={village.worldSpeed || 1}
            isStarving={village.isStarving || false}
            consumption={village.consumption || {}}
            equipment={village.equipment || {}}
            equipmentCaps={village.equipmentCaps || {}}
            equipmentPool={village.equipmentPool || { capacity: 0, used: 0, free: 0 }}
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
            sefer: (village.marches || []).length + (village.incoming || []).length }} />
      )}

      {/*
        REHBER — her ekranın üstünde. Kart aktif görevi gösterir, spotlight
        gidilecek yeri yakıp söndürür. Rehber kapalıyken kart rozete iner
        ama görevler arka planda işlemeye devam eder.
      */}
      <QuestCard quests={village.quests || null} mobile={vp.mobile} focus={questFocus}
        bastir={panelAcik}
        onClaim={(id) => socket?.emit('claim_quest', { id })}
        onToggle={(hidden) => socket?.emit('toggle_quests', { hidden })}
        onGoTab={(t) => t && setTab(t)} />
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
