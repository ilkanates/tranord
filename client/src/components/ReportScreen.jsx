/**
 * RAPORLAR EKRANI — kendi sekmesi.
 *
 * Ordu sekmesindeki daralmış liste yerine tam ekran: solda rapor listesi,
 * sağda seçilen raporun ayrıntısı. Filtreler: hepsi / saldırılarım /
 * bana gelenler / keşifler.
 *
 * Okundu takibi localStorage'da (`tranord_reports_read`): hangi raporu
 * okuduğunun bilgisi tarayıcıya ait, sunucuda yeri yok. Okuma/yazma
 * try/catch içinde — gizli pencerede erişim hata atabiliyor.
 */
import { useEffect, useMemo, useState } from 'react';
import { C, FONT, RES_COLOR, panel, btn, label as lbl, num, short, fmtTime } from '../theme';
import { useViewport } from '../responsive';
import { RES_LABEL } from '../flows';
import VILLAGE_DEFS from '../data/villageDefs';
import { unitImage } from '../data/unitImages';
import Icon from './Icons';
import { ITEM_IMAGE } from './itemArt';
import { PARA_GORSEL } from './paraArt';
import Amblem from './Amblem';

const MODE_LABEL = { raid: 'Yağma', attack: 'Tam saldırı', scout: 'Keşif', yerlesim: 'Yerleşim', takviye: 'Takviye', macera: 'Macera' };
const MODE_ICON  = { raid: 'depo', attack: 'kilic', scout: 'harita', yerlesim: 'koy', takviye: 'kalkan' };

/**
 * SEFER TÜRÜNÜN RENGİ — listede tür bir bakışta okunsun.
 *
 * Sonuç rengi (kazandın/kaybettin) ayrı bir eksen; ikisini tek renge
 * bindirmek "kaybettiğim yağma" ile "kazandığım saldırı"yı ayırt
 * edilemez yapıyordu. Tür rengi soldaki şeritte ve rozette, sonuç rengi
 * yazıda duruyor.
 */
const MODE_COLOR = {
  raid: '#e0b357',        // yağma — altın
  attack: '#e8636f',      // tam saldırı — kan
  scout: '#8fdcff',       // keşif — buz
  yerlesim: '#4ecfa8',    // yerleşim — yeşil
  takviye: '#6cdda3',     // takviye — savunma yeşili
};
const modeColor = (r) => MODE_COLOR[r?.mode] || C.ice;

const sum = (o) => Object.values(o || {}).reduce((a, b) => a + (b || 0), 0);

/**
 * YÖN — bu raporu ben mi yazdırdım, bana mı geldi?
 *
 * En sık sorulan soruydu: "ben mi saldırmışım bana mı saldırmışlar".
 * Başlıkta kelimelerle anlatmak yetmiyor; listede de ayrıntıda da
 * renkli bir rozet var ve ok yönü konuşuyor.
 */
function yonBilgisi(r) {
  // Gelen takviye tehdit değil — kırmızı rozet onu "saldırı geldi" gibi
  // gösteriyordu. Dost hareket savunma yeşiliyle işaretleniyor.
  const takviye = r?.outcome === 'takviye_vardi';
  /*
    HEDİYE de dost bir hareket ama DESTEK DEĞİL: "DESTEK GİTTİ" yazmak
    asker yolladığını düşündürürdü. Kendi etiketi var.
  */
  const hediye = r?.outcome === 'hammadde_yolda';
  const dost = takviye || hediye;
  const yesil = '#6cdda3';
  if (hediye) {
    return r?.dir === 'in'
      ? { etiket: 'HAMMADDE GELDİ', ikon: 'asagi', renk: yesil }
      : { etiket: 'HAMMADDE GİTTİ', ikon: 'yukari', renk: '#c4ecff' };
  }
  return r?.dir === 'in'
    ? { etiket: dost ? 'DESTEK GELDİ' : 'BANA GELDİ', ikon: 'asagi', renk: dost ? yesil : '#e8636f' }
    : { etiket: dost ? 'DESTEK GİTTİ' : 'BEN GİTTİM', ikon: 'yukari', renk: dost ? yesil : '#8fdcff' };
}

/**
 * YAĞMACI NE KADAR DOLU DÖNDÜ?
 *
 * Sağ kalan askerlerin toplam taşıma kapasitesi ile getirdikleri ganimet
 * karşılaştırılıyor. Boş dönen sefer, ordunun küçük olmasından değil
 * hedefin fakir olmasından kaynaklanır — oyuncu bunu görmeden hedef
 * seçmeyi öğrenemiyor.
 *
 * Kapasite SAĞ KALANLARDAN hesaplanıyor: ölen asker yük taşımıyor.
 */
function tasimaDurumu(r, unitDefs) {
  if (r?.dir === 'in' || r?.mode === 'scout') return null;
  const kalan = r?.survivors || {};
  let kapasite = 0;
  for (const [u, n] of Object.entries(kalan)) {
    kapasite += (n || 0) * (unitDefs?.[u]?.stats?.kapasite || 0);
  }
  if (kapasite <= 0) return null;
  const yuk = sum(r?.loot);
  return { kapasite, yuk, oran: Math.min(1, yuk / kapasite) };
}

/**
 * OKUNDU TAKİBİ — okunan raporların ID'leri.
 *
 * Eskiden "en son bakılan zaman" tutuluyordu; ekranı bir kez açmak bütün
 * raporları okunmuş sayıyordu. Artık okunmuş sayılmak için rapora TIKLAMAK
 * gerekiyor, "okuduğum rapor" ile "gelmiş rapor" ayrışıyor.
 *
 * Ayrıştırılmış küme modül düzeyinde önbelleklenir: sayaç her tick'te
 * (saniyede bir) çağrılıyor, her seferinde JSON çözmek gereksiz.
 */
const READ_KEY = 'tranord_reports_read';
const MAX_READ_IDS = 400;
let _readCache = null;

export function readIds() {
  if (_readCache) return _readCache;
  try {
    const arr = JSON.parse(localStorage.getItem(READ_KEY) || '[]');
    _readCache = new Set(Array.isArray(arr) ? arr : []);
  } catch { _readCache = new Set(); }
  return _readCache;
}
function markRead(id) {
  const set = new Set(readIds());
  set.add(id);
  const trimmed = [...set].slice(-MAX_READ_IDS);
  _readCache = new Set(trimmed);
  try { localStorage.setItem(READ_KEY, JSON.stringify(trimmed)); } catch { /* yok say */ }
  return _readCache;
}
/** Üst bardaki sayaç için: okunmamış rapor sayısı */
export function unseenCount(reports = []) {
  const set = readIds();
  return reports.filter(r => !set.has(r.id)).length;
}

const FILTERS = [
  { key: 'all',    label: 'HEPSİ' },
  { key: 'out',    label: 'GİDENLER' },
  { key: 'in',     label: 'BANA GELENLER' },
  { key: 'scout',  label: 'KEŞİFLER' },
];

/**
 * Sabit saat. "3 dk önce" gibi göreli zaman KULLANILMIYOR: payload saniyede
 * bir geldiği için o yazı sürekli değişiyor ve liste huzursuz görünüyordu.
 * Aynı günse yalnız saat, değilse gün + saat.
 */
function fmtWhen(at) {
  if (!at) return '';
  const d = new Date(at);
  const hm = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const sameDay = d.toDateString() === new Date().toDateString();
  if (sameDay) return hm;
  return `${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} ${hm}`;
}

/**
 * KEŞİF RAPOR TÜRLERİ — dört ayrı sonuç var.
 *
 *   kesif             benim keşfim başardı, bilgi geldi
 *   kesif_basarisiz   karşı izciler durdurdu, bilgi YOK
 *   kesfedildim       köyüm keşfedildi (izcim vardı, fark ettim ama yetmedi)
 *   kesif_engellendi  izcilerim casusu durdurdu, bilgi sızmadı
 *
 * İzcisi olmayan oyuncu keşfedildiğini HİÇ görmez — rapor yazılmıyor.
 */
/*
  Hangi sonuçların keşif sayıldığı artık BURADA DEĞİL: sunucu her rapora
  `kesif` bayrağını iliştiriyor (bkz. server/game/raporTur.js). Listeyi
  burada da tutsaydık sayfalamanın sayıları sunucudan, sekmelerin süzmesi
  buradan gelirdi ve ikisi ilk yeni sonuç türünde birbirinden ayrılırdı.
*/
const kesifMi = (r) => !!r?.kesif;

/**
 * KEŞİFTE ÇARPIŞMA OLDU MU?
 *
 * Karşı köyde izci varsa keşif bir savaşla çözülüyor (bkz. army.js ·
 * mode 'scout'). İzci yoksa çarpışma da yok: o durumda kayıp kutuları
 * sıfır gösterip yer kaplardı.
 *
 * Kayıplara da bakılıyor, yalnız sayıya değil: eski raporlarda
 * `savunanIzci` alanı olmayabilir ama kayıp listesi durur.
 */
const kesifCarpismasi = (r) => (
  (r?.savunanIzci ?? r?.karsiIzci ?? 0) > 0
  || sum(r?.myLosses) > 0
  || sum(r?.theirLosses) > 0
);

/** Rapor bir kazanç mı kayıp mı — saldıran/savunan tarafına göre */
function verdictOf(r) {
  // Takviye bir savaş değil: kazanan/kaybeden ekseni burada anlamsız.
  // Bu satır yokken rapor aşağıdaki winner testine düşüyor ve destek
  // gönderen oyuncuya 'kaybettin' yazıyordu.
  if (r.outcome === 'takviye_vardi') {
    return r.dir === 'in'
      ? { txt: 'destek geldi', col: C.good, won: null }
      : { txt: 'destek ulaştı', col: C.good, won: null };
  }
  if (r.outcome === 'takviye_geri_yollandi') {
    return { txt: 'ev sahibi geri yolladı', col: C.warn, won: null };
  }
  if (r.outcome === 'takviye_savasti') {
    const tuttu = r.winner === 'defender';
    return {
      txt: tuttu ? 'takviyen savundu' : 'takviyen savaşı kaybetti',
      col: tuttu ? C.good : C.danger, won: tuttu,
    };
  }
  /*
    YERLEŞİM bir savaş değil. Bu iki satır yokken rapor aşağıdaki
    winner testine düşüyor ve `winner: 'none'` olduğu için köyü
    BAŞARIYLA kurduğunda bile "kaybettin" yazıyordu.
  */
  if (r.outcome === 'koy_kuruldu') {
    return { txt: 'köy kuruldu', col: C.good, won: null };
  }
  if (r.outcome === 'arazi_dolu') {
    return { txt: 'köy kurulamadı — göçmenler dönüyor', col: C.warn, won: null };
  }
  if (r.outcome === 'kesif') return { txt: 'keşif tamam', col: C.ice, won: null };
  if (r.outcome === 'kesif_basarisiz') return { txt: 'keşif durduruldu', col: C.danger, won: false };
  if (r.outcome === 'kesfedildim') return { txt: 'köyün keşfedildi', col: C.warn, won: false };
  if (r.outcome === 'kesif_engellendi') return { txt: 'casusu durdurdun', col: C.good, won: true };
  if (r.outcome === 'hedef_yok') return { txt: 'hedef bulunamadı', col: C.textMute, won: null };
  /*
    HAMMADDE GÖNDERİSİ bir savaş değil. Bu satır yokken rapor aşağıdaki
    winner testine düşüyor ve hediye gönderene "kaybettin" yazardı.
  */
  if (r.outcome === 'hammadde_yolda') {
    return r.dir === 'in'
      ? { txt: 'sana hammadde yolda', col: C.good, won: null }
      : { txt: 'hammadde yolladın', col: C.iceSoft, won: null };
  }
  /*
    MACERA bir savaş değil — kazanan/kaybeden ekseni burada da anlamsız.
    Bayılma ayrı yazılıyor: oyuncu kahramanının neden kullanılamadığını
    rapor listesinde görebilmeli.
  */
  if (r.outcome === 'macera') {
    return r.macera?.bayildi
      ? { txt: 'kahraman bayıldı', col: C.danger, won: false }
      : { txt: 'macera tamam', col: C.good, won: null };
  }
  const won = r.dir === 'in' ? r.winner === 'defender' : r.winner === 'attacker';
  return { txt: won ? 'kazandın' : 'kaybettin', col: won ? C.good : C.danger, won };
}

/**
 * Başlık ÖZNE ile başlıyor: "Kim kime?" sorusu ilk kelimede cevaplanıyor.
 * Eskiden giden sefer yalnız hedef adıyla yazılıyordu ("Ulvhavn — Yağma")
 * ve gelen saldırıdan ayırt etmek zordu.
 */
function titleOf(r) {
  if (r.outcome === 'takviye_vardi') {
    return r.dir === 'in'
      ? `${r.fromName} sana destek gönderdi`
      : `${r.toName} köyünü destekledin`;
  }
  if (r.outcome === 'takviye_geri_yollandi') return `${r.fromName} takviyeni geri yolladı`;
  /*
    HAMMADDE başlığı dir SATIRINDAN ÖNCE: aşağıdaki genel "sana saldırdı"
    satırı bütün gelen raporları yakalıyor ve hediye de saldırı gibi
    başlıklanırdı.
  */
  if (r.outcome === 'hammadde_yolda') {
    return r.dir === 'in'
      ? `${r.fromName} sana hammadde yolladı`
      : `${r.toName} köyüne hammadde yolladın`;
  }
  if (r.outcome === 'macera') return `Kahramanın maceradan döndü — ${r.fromName}`;
  if (r.outcome === 'takviye_savasti') return `${r.toName} köyündeki takviyen savaştı`;
  if (r.outcome === 'kesfedildim') return `${r.fromName} seni keşfetti`;
  if (r.outcome === 'kesif_engellendi') return `${r.fromName} keşfe geldi, durduruldu`;
  if (r.dir === 'in') return `${r.fromName} sana saldırdı`;
  if (r.outcome === 'kesif') return `${r.toName} köyünü keşfettin`;
  if (r.outcome === 'kesif_basarisiz') return `${r.toName} — keşfin durduruldu`;
  if (r.outcome === 'hedef_yok') return `${r.toName} — hedef bulunamadı`;
  // Yağmalamak belirtme hâli ister (köyÜNÜ), saldırmak yönelme hâli (köyÜNE)
  return r.mode === 'raid'
    ? `${r.toName} köyünü yağmaladın`
    : `${r.toName} köyüne saldırdın`;
}

/**
 * Sol liste satırı.
 *
 * OKUNMAMIŞ: dolu renk, kalın başlık, sol kenarda sonuç rengi şeridi, YENİ
 * etiketi. OKUNMUŞ: soluk zemin, kısık yazı, şerit gri. Ayrım tek bir noktaya
 * (küçük bir nokta) bırakılmayacak kadar önemli — listeye bakınca hangisini
 * okuduğun bir bakışta görünmeli.
 */
/**
 * MACERA ÖDÜL SATIRI — amblem ve renk oyunun geri kalanıyla AYNI.
 *
 * Hammaddede `RES_COLOR` ve kaynağın kendi ikonu kullanılıyor (kaynak
 * rayı, pazar ve depo da bunları kullanıyor): aynı şeyi iki farklı
 * simgeyle göstermek oyuncuyu ekrandan ekrana yeniden öğrenmeye
 * zorlardı.
 *
 * EŞYADA ÜRETİLMİŞ GÖRSEL var (itemArt) ve nadirlik rengiyle
 * çerçeveleniyor — çantada nasıl görünüyorsa burada da öyle. Görseli
 * olmayan eşya sessizce ikona düşüyor, yani listeyi tek tek doldurmak
 * ekranı hiçbir aşamada bozmuyor.
 */
function MaceraOdul({ o, unitDefs }) {
  const esya = o.tur === 'esya';
  const gumus = o.tur === 'gumus';
  /*
    YEDEK RENK NÖTR OLMALI. Eskiden `|| C.warn` yazıyordu ve C.warn
    turuncu — yani EFSANEVİ nadirliğin rengi. Rengi olmayan her eski
    rapor satırı sıradan bir eşyayı efsanevi gibi gösteriyordu (İlkan
    bildirdi). Bir yedek değer asla anlamlı bir değerin yerine
    geçmemeli; hele en nadir olanın.

    Bilgi kaybolmuyor: eşyanın ADI zaten nadirliği taşıyor
    ("Efsanevi Bozkır Atı"), yalnız renk susuyor.
  */
  const nadirlikRenk = o.renk || C.frost;

  const renk = esya ? nadirlikRenk
    : gumus ? C.iceSoft
      : o.tur === 'asker' ? C.ice
        : (RES_COLOR[o.res] || C.ice);

  const ad = esya ? o.ad
    : gumus ? 'Gümüş'
      : o.tur === 'asker' ? (unitDefs?.[o.birim]?.name || o.birim)
        : (RES_LABEL[o.res] || o.res);

  /*
    GÜMÜŞ DE BÜYÜK RESİMLE (İlkan'ın isteği). Ödül satırında para ile
    eşya aynı ağırlıkta iki kazanç; birini resimle, ötekini küçük bir
    çizgiyle göstermek gümüşü ikinci sınıf gösterirdi.
  */
  const resim = esya ? ITEM_IMAGE[o.key] : gumus ? PARA_GORSEL.gumus : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 11,
      padding: resim ? '9px 11px' : '7px 10px', borderRadius: 5,
      background: 'rgba(8,17,28,0.55)',
      border: `1px solid ${esya ? `${nadirlikRenk}66` : C.lineSoft}`,
    }}>
      {/*
        GÖRSEL BÜYÜK (İlkan: *"raporlarda düşen itemin görselini daha da
        büyüt"*). Maceradan eşya düşmesi seyrek ve oyuncunun o an en çok
        baktığı şey; 42 px'lik bir pul onu satırdaki başka bir simge
        gibi gösteriyordu. 76 px'te eşya raporun konusu hâline geliyor.
      */}
      {resim ? (
        <img src={resim} alt="" style={{
          width: 76, height: 76, objectFit: 'cover', flexShrink: 0,
          borderRadius: gumus ? '50%' : 6,
          border: `1px solid ${gumus ? `${C.iceSoft}66` : `${nadirlikRenk}88`}`,
        }} />
      ) : (
        <Icon name={esya ? 'migfer' : gumus ? 'sikke' : o.tur === 'asker' ? 'kilic' : o.res}
          size={esya ? 18 : 15} color={renk} strokeWidth={1.6} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT.ui, fontSize: resim ? 12.5 : 11,
          color: esya ? nadirlikRenk : C.frost,
        }}>
          {ad}
          {/* Seviye rozeti — dünyanın yaşı belirliyor (bkz. dunyaYasi.js) */}
          {esya && o.seviye > 1 && (
            <span style={{ color: C.gold, marginLeft: 5, fontSize: 9.5 }}>Lvl {o.seviye}</span>
          )}
        </div>
        {esya && (
          <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textMute }}>
            çantana düştü
          </div>
        )}
      </div>
      {!esya && (
        <span style={num({ fontSize: 12, color: C.good })}>+{o.adet}</span>
      )}
    </div>
  );
}

function Row({ r, active, unread, onClick, ok = false }) {
  const v = verdictOf(r);
  const mc = modeColor(r);
  const yon = yonBilgisi(r);
  // Sol şerit SEFER TÜRÜNÜ gösteriyor; sonuç rengi alt satırdaki yazıda
  const accent = unread ? mc : C.line;
  const kenar = active ? C.lineBright : unread ? `${v.col}3d` : C.lineSoft;
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
      padding: '9px 10px', borderRadius: 6,
      background: active
        ? 'rgba(143,220,255,0.12)'
        : unread ? 'rgba(14,28,44,0.72)' : 'rgba(8,15,23,0.34)',
      /*
        Kısayol yok: `border` + `borderLeft` karışımı React'te yeniden
        çizimde çakışıyor (konsolda uyarı). Sol şerit seferin türünü
        söylüyor, kaybolması sessiz bir gerileme olurdu.
      */
      borderTop: `1px solid ${kenar}`,
      borderRight: `1px solid ${kenar}`,
      borderBottom: `1px solid ${kenar}`,
      borderLeft: `3px solid ${active ? C.ice : accent}`,
      opacity: unread || active ? 1 : 0.62,
      transition: 'opacity .14s, background .14s',
    }}>
      {/* Yön oku + sefer türü simgesi: kim kime, hangi tür — tek bakışta */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        flexShrink: 0, width: 17,
      }}>
        <Icon name={yon.ikon} size={11} color={unread ? yon.renk : C.textMute} strokeWidth={2.4} />
        <Icon name={MODE_ICON[r.mode] || 'kilic'} size={13}
          color={unread ? mc : C.textMute} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT.ui, fontSize: 11.5,
          color: unread ? C.frost : C.textFaint,
          fontWeight: unread ? 600 : 400,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{titleOf(r)}</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap',
          fontFamily: FONT.ui, fontSize: 9.5, marginTop: 2,
        }}>
          <span style={{
            padding: '0px 4px', borderRadius: 3, fontSize: 7.5, letterSpacing: 0.7,
            fontWeight: 700, color: unread ? yon.renk : C.textMute,
            background: unread ? `${yon.renk}1f` : 'transparent',
            border: `1px solid ${unread ? `${yon.renk}55` : C.lineSoft}`,
          }}>{yon.etiket}</span>
          {/*
            HANGİ KÖYÜM — liste artık BÜTÜN köylerin raporlarını taşıyor
            (İlkan: *"raporlar her köye ayrı geliyor"*). Köy adını
            yazmasaydık liste birleşmiş ama okunaksız olurdu: "hangi
            köyüme saldırdılar" sorusunun cevabı kaybolurdu.
          */}
          {r.koyAd && (
            <span style={{
              padding: '0px 4px', borderRadius: 3, fontSize: 7.5, letterSpacing: 0.5,
              color: C.textMute, border: `1px solid ${C.lineSoft}`,
            }}>{r.koyAd}</span>
          )}
          <span style={{ color: unread ? v.col : C.textMute }}>{v.txt}</span>


      {r.outcome === 'savas' && (
            <span style={{ color: C.textMute }}>
              {'· kaybım '}{sum(r.myLosses)}
              {sum(r.loot) > 0 && (
                <span style={{ color: r.dir === 'in' ? C.danger : C.warn }}>
                  {' · '}{r.dir === 'in' ? '−' : '+'}{short(sum(r.loot))} kaynak
                </span>
              )}
            </span>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        {unread && (
          <span style={{
            padding: '1px 5px', borderRadius: 3,
            background: `${v.col}26`, border: `1px solid ${v.col}66`,
            fontFamily: FONT.ui, fontSize: 7.5, letterSpacing: 0.9,
            fontWeight: 700, color: v.col,
          }}>YENİ</span>
        )}
        <div style={{
          fontFamily: FONT.num, fontSize: 10, whiteSpace: 'nowrap',
          color: unread ? C.textDim : C.textMute,
        }}>{fmtWhen(r.at)}</div>
      </div>
      {/*
        GENİŞLET OKU — yalnız mobilde, çünkü akordeon yalnız orada var.
        Açıkken yukarı dönüyor: hangi raporun açık olduğu listeye
        bakınca anlaşılsın.
      */}
      {ok && (
        <span aria-hidden="true" style={{
          flexShrink: 0, marginLeft: 2,
          fontFamily: FONT.ui, fontSize: 11, lineHeight: 1,
          color: active ? C.frost : C.textMute,
          transform: active ? 'rotate(180deg)' : 'none',
          transition: 'transform .15s',
        }}>▾</span>
      )}
    </div>
  );
}

// ── Sağ ayrıntı ──────────────────────────────────────────────────────
function UnitGrid({ units, unitDefs, color }) {
  const items = Object.entries(units || {}).filter(([, n]) => n > 0);
  if (!items.length) {
    return <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textMute }}>yok</div>;
  }
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
      {items.map(([u, n]) => {
        const img = unitImage(u);
        return (
          <div key={u} title={unitDefs[u]?.name || u} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 8px 4px 4px', borderRadius: 5,
            background: 'rgba(8,17,28,0.6)', border: `1px solid ${color}33`,
          }}>
            {/* Resim 20×28'di — asker tanınmıyordu. 44×60 ile yüz ve
                teçhizat seçiliyor, kart hâlâ tek satıra sığıyor. */}
            <div style={{ width: 44, height: 60, borderRadius: 4, overflow: 'hidden', background: '#0b1420' }}>
              {img ? (
                <img src={img} alt="" draggable={false} style={{
                  width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 10%',
                }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                  <Amblem type={u} size={30} color={color} opacity={0.8} />
                </div>
              )}
            </div>
            <div>
              <div style={num({ fontSize: 16, color, lineHeight: 1.1 })}>{n}</div>
              <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute }}>
                {unitDefs[u]?.name || u}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResGrid({ res, color }) {
  const items = Object.entries(res || {}).filter(([, n]) => n > 0);
  if (!items.length) {
    return <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textMute }}>yok</div>;
  }
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
      {items.map(([r, n]) => (
        <div key={r} style={{
          padding: '4px 9px', borderRadius: 5,
          background: 'rgba(8,17,28,0.6)', border: `1px solid ${color}33`,
        }}>
          <div style={num({ fontSize: 13, color, lineHeight: 1.1 })}>{short(n)}</div>
          <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute }}>
            {RES_LABEL[r] || r}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Kahraman satırındaki tek ölçü — ad üstte, sayı altta */
function KahOlcu({ ad, deger, renk }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={lbl({ fontSize: 7, letterSpacing: 0.9 })}>{ad}</div>
      <div style={num({ fontSize: 12, color: renk })}>{deger}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={lbl({ fontSize: 8, letterSpacing: 1.4, marginBottom: 5 })}>{title}</div>
      {children}
    </div>
  );
}

/**
 * Rapordan simülatör kurulumu — yoksa `null` (tuş çizilmiyor).
 *
 * Tek cümle: hem tuşun görünüp görünmeyeceğini hem ne göndereceğini
 * buradan okuyoruz. İkiye bölünseydi "tuş var ama boş açılıyor"
 * durumu kaçınılmazdı.
 */
function simKurulumu(r) {
  if (!r) return null;
  const dolu = (o) => o && Object.values(o).some(n => n > 0);

  if (r.intel && dolu(r.intel.army)) {
    return {
      id: r.id, attacker: {}, defender: { ...r.intel.army },
      surLevel: r.intel.surLevel || 0,
      hendekLevel: r.intel.hendekLevel || 0,
      kulePct: r.intel.kulePct || 0,
      mode: 'normal',
      not: 'Keşifte görülen savunma yüklendi — saldıran tarafı sen doldur.',
    };
  }

  if (r.outcome !== 'savas') return null;

  if (r.dir === 'out' && (dolu(r.sent) || dolu(r.theirSent))) {
    return {
      id: r.id, attacker: { ...(r.sent || {}) }, defender: { ...(r.theirSent || {}) },
      surLevel: 0, hendekLevel: 0, kulePct: r.wallBonusPct || 0, mode: r.mode,
      not: 'Bu savaşın iki ordusu da yüklendi.',
    };
  }

  if (r.dir === 'in' && dolu(r.attackerUnits)) {
    return {
      id: r.id, attacker: { ...r.attackerUnits }, defender: {},
      surLevel: 0, hendekLevel: 0, kulePct: r.wallBonusPct || 0, mode: r.mode,
      not: 'Sana gelen ordu yüklendi — savunmayı "ORDUMU YÜKLE" ile doldur.',
    };
  }

  return null;
}

function Detail({ r, unitDefs, onSimulate = null }) {
  if (!r) {
    return (
      <div style={{
        height: '100%', display: 'grid', placeItems: 'center',
        fontFamily: FONT.ui, fontSize: 11, color: C.textMute,
      }}>
        Soldan bir rapor seç.
      </div>
    );
  }
  const v = verdictOf(r);
  const inc = r.dir === 'in';
  const mc = modeColor(r);
  const yon = yonBilgisi(r);
  const tasima = tasimaDurumu(r, unitDefs);
  const ganimet = sum(r.loot);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      <div>
        <div style={{
          fontFamily: FONT.head, fontSize: 22, fontWeight: 600, letterSpacing: 0.8,
          color: C.frost, lineHeight: 1.15,
        }}>{titleOf(r)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6, flexWrap: 'wrap' }}>
          {/* YÖN en başta: "ben mi saldırdım bana mı saldırdılar" ilk okunan şey */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 9px', borderRadius: 4,
            background: `${yon.renk}1f`, border: `1px solid ${yon.renk}66`,
            fontFamily: FONT.ui, fontSize: 9.5, letterSpacing: 1.1,
            color: yon.renk, fontWeight: 700,
          }}>
            <Icon name={yon.ikon} size={10} color={yon.renk} strokeWidth={2.6} />
            {yon.etiket}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 9px', borderRadius: 4,
            background: `${mc}1a`, border: `1px solid ${mc}55`,
            fontFamily: FONT.ui, fontSize: 9.5, letterSpacing: 1.1, color: mc, fontWeight: 600,
          }}>
            <Icon name={MODE_ICON[r.mode] || 'kilic'} size={10} color={mc} />
            {(MODE_LABEL[r.mode] || r.mode).toUpperCase()}
          </span>
          <span style={{
            padding: '2px 9px', borderRadius: 4,
            background: `${v.col}1f`, border: `1px solid ${v.col}55`,
            fontFamily: FONT.ui, fontSize: 9.5, letterSpacing: 1.1, color: v.col, fontWeight: 600,
          }}>{v.txt.toUpperCase()}</span>
          <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute }}>
            {fmtWhen(r.at)}
            {r.toKey ? ` · ${r.toKey}` : r.fromKey ? ` · ${r.fromKey}` : ''}
          </span>
        </div>

        {/*
          SİMÜLATÖRE GÖNDER. Yalnız simüle edilecek bir şey varsa
          çiziliyor: ordusu yazılı olmayan bir raporda tuş, boş bir
          simülatör açan yalancı bir düğme olurdu.
        */}
        {onSimulate && simKurulumu(r) && (
          <button type="button" onClick={() => onSimulate(simKurulumu(r))}
            style={btn('ghost', {
              marginTop: 9, padding: '6px 12px', fontSize: 9.5, letterSpacing: 1.2,
              display: 'inline-flex', alignItems: 'center', gap: 7,
            })}>
            <Icon name="savas" size={12} color={C.ice} />
            SİMÜLATÖRDE DENE
          </button>
        )}
      </div>

      {/*
        RAPORUN KENDİ CÜMLESİ. `message` alanı sunucudan geliyordu ama
        bu dosyada hiç çizilmiyordu — "arazi doldu, göçmenler eve
        dönüyor" açıklaması oyuncuya hiçbir zaman ulaşmıyordu.
      */}
      {r.message && (
        <div style={panel({
          padding: '9px 11px',
          background: r.outcome === 'arazi_dolu'
            ? 'rgba(242,187,96,0.10)' : 'rgba(11,23,37,0.7)',
          border: `1px solid ${r.outcome === 'arazi_dolu' ? `${C.warn}55` : C.lineSoft}`,
        })}>
          <div style={{
            fontFamily: FONT.ui, fontSize: 11, lineHeight: 1.5,
            color: r.outcome === 'arazi_dolu' ? '#f5dca8' : C.text,
          }}>
            {r.message}
          </div>
        </div>
      )}

      {r.outcome === 'macera' && r.macera && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>DENEYİM</div>
              <div style={num({ fontSize: 18, color: C.good })}>+{r.macera.xp}</div>
            </div>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>CAN KAYBI</div>
              <div style={num({ fontSize: 18, color: C.danger })}>−{r.macera.can}</div>
              {/*
                ZIRH İŞE YARADIYSA GÖSTER. Yalnız son sayıyı yazsaydık
                oyuncu kuşandığı zırhın bir işe yarayıp yaramadığını
                hiçbir yerde göremezdi.
              */}
              {r.macera.hamCan > r.macera.can && (
                <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.good }}>
                  gücün ve zırhın {r.macera.hamCan - r.macera.can} hasarı engelledi
                </div>
              )}
            </div>
          </div>

          {r.macera.bayildi && (
            <div style={{
              padding: '9px 13px', marginTop: 8, borderRadius: 6,
              background: 'rgba(74,29,36,0.4)', border: `1px solid ${C.dangerDim}`,
              fontFamily: FONT.ui, fontSize: 11, color: '#f0b8bd',
            }}>
              Kahramanın maceradan BAYGIN döndü. Bir süre ne sefere katılabilir
              ne de bonus verir.
            </div>
          )}

          <Section title="GETİRDİKLERİ">
            {r.macera.oduller?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {r.macera.oduller.map((o, i) => <MaceraOdul key={i} o={o} unitDefs={unitDefs} />)}
              </div>
            ) : (
              <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textMute }}>
                Bu seferinde eli boş döndü — deneyim yine de kazandı.
              </div>
            )}
          </Section>
        </>
      )}

      {r.outcome === 'savas' && (
        <>
          {/* Kuvvet karşılaştırması */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>SALDIRI GÜCÜ</div>
              <div style={num({ fontSize: 18, color: inc ? C.danger : C.frost })}>
                {short(r.attackTotal)}
              </div>
            </div>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>SAVUNMA GÜCÜ</div>
              <div style={num({ fontSize: 18, color: inc ? C.good : C.frost })}>
                {short(r.defenseTotal)}
              </div>
            </div>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>SUR + HENDEK</div>
              <div style={num({ fontSize: 18, color: r.wallBonusPct > 0 ? C.warn : C.textMute })}>
                {r.wallBonusPct > 0 ? `%${r.wallBonusPct}` : '—'}
              </div>
            </div>
          </div>

          {/*
            KAHRAMAN SATIRI — sur bonusunun yanında AYRI.

            Tek sayıya karıştırsaydık oyuncu kahramana yaptığı yatırımın
            işe yarayıp yaramadığını hiç ölçemezdi: "savaşı kahraman mı
            çevirdi, sur mu tuttu" sorusunun cevabı burada.
          */}
          {r.kahraman && (
            <div style={panel({
              padding: '9px 11px', marginTop: 8,
              background: 'rgba(11,23,37,0.7)',
              display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap',
            })}>
              <Icon name="migfer" size={16} color={C.frost} strokeWidth={1.5} />
              <span style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.iceSoft }}>
                {inc ? 'KAHRAMAN' : 'KAHRAMANIM'}
              </span>
              {/*
                SINIF raporda da yazıyor: savunan oyuncu bir dahaki sefere
                hangi savunma birimini üreteceğine buna bakarak karar verir.
              */}
              {r.kahraman.suvari != null && (
                <span style={{
                  fontFamily: FONT.ui, fontSize: 8.5,
                  color: r.kahraman.suvari ? '#ffd98a' : C.textMute,
                }}>{r.kahraman.suvari ? 'süvari' : 'yaya'}</span>
              )}
              <div style={{
                display: 'flex', gap: 16, flexWrap: 'wrap', marginLeft: 'auto',
                fontFamily: FONT.ui, fontSize: 9.5,
              }}>
                {!inc && (
                  <>
                    <KahOlcu ad="HAM GÜÇ" deger={`+${short(r.kahraman.gucu || 0)}`}
                      renk={C.frost} />
                    <KahOlcu ad="ORDUYA" deger={(r.kahraman.saldiriYuzde || 0) > 0
                      ? `+%${r.kahraman.saldiriYuzde}` : '—'} renk={C.warn} />
                    <KahOlcu ad="DENEYİM" deger={`+${r.kahraman.xp || 0}`} renk={C.good} />
                    <KahOlcu ad="CAN KAYBI" deger={`-${r.kahraman.hasar || 0}`}
                      renk={(r.kahraman.hasar || 0) > 0 ? C.danger : C.textMute} />
                  </>
                )}
                {inc && (
                  <>
                    <KahOlcu ad="SALDIRANIN GÜCÜ"
                      deger={(r.kahraman.saldiranGucu || 0) > 0
                        ? `+${short(r.kahraman.saldiranGucu)}` : '—'} renk={C.danger} />
                    <KahOlcu ad="SALDIRANIN ORDUSUNA"
                      deger={(r.kahraman.saldiranYuzde || 0) > 0
                        ? `+%${r.kahraman.saldiranYuzde}` : '—'} renk={C.danger} />
                    <KahOlcu ad="KENDİ SAVUNMAMA"
                      deger={(r.kahraman.savunmamYuzde || 0) > 0
                        ? `+%${r.kahraman.savunmamYuzde}` : '—'} renk={C.good} />
                  </>
                )}
              </div>
            </div>
          )}

          {!inc && r.sent && (
            <Section title="GÖNDERDİĞİM ORDU">
              <UnitGrid units={r.sent} unitDefs={unitDefs} color={C.frost} />
            </Section>
          )}
          {inc && r.attackerUnits && (
            <Section title="SALDIRAN ORDU">
              <UnitGrid units={r.attackerUnits} unitDefs={unitDefs} color={C.danger} />
            </Section>
          )}

          <Section title="KAYBIM">
            <UnitGrid units={r.myLosses} unitDefs={unitDefs} color={C.danger} />
          </Section>

          {/*
            SAĞLIK ÇADIRI. Yalnız kalan kaybı gösterseydik oyuncu çadırın
            işe yarayıp yaramadığını hiçbir yerde göremez, onu yükseltmek
            için bir sebep bulamazdı.
          */}
          {(r.saglikCadiri?.toplam > 0 || r.saglikCadiri?.sigmayan > 0) && (
            <Section title={`SAĞLIK ÇADIRI — YARALI PAYI %${r.saglikCadiri.oran}`}>
              {r.saglikCadiri.toplam > 0 && (
                <UnitGrid units={r.saglikCadiri.iyilesen} unitDefs={unitDefs} color={C.good} />
              )}
              <div style={{
                fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, marginTop: 5,
              }}>
                {r.saglikCadiri.toplam > 0
                  ? `Bu ${r.saglikCadiri.toplam} asker yaralı sayıldı ve çadıra alındı.
                     İyileştiklerinde orduna geri dönecekler — kayıp listesinde
                     görünüyorlar çünkü şu an savaşamıyorlar.`
                  : 'Çadır doluydu: bu savaşta hiçbir yaralı alınamadı.'}
              </div>
              {/*
                DOLAN ÇADIR AYRI YAZILIYOR. Yalnız alınanı gösterseydik oyuncu
                çadırının yetmediğini hiçbir yerden anlayamaz, yükseltmek için
                bir sebep göremezdi — kaybettiği asker sessizce ölmüş olurdu.
              */}
              {r.saglikCadiri.sigmayan > 0 && (
                <div style={{
                  fontFamily: FONT.ui, fontSize: 9.5, color: C.danger, marginTop: 4,
                }}>
                  ÇADIR DOLDU — {r.saglikCadiri.sigmayan} yaralıya yatak
                  bulunamadı ve öldüler. Kapasite: {r.saglikCadiri.kapasite} yatak.
                </div>
              )}
            </Section>
          )}

          {/*
            KARŞI TARAFIN ORDUSU — İlkan: *"raporda karşı tarafın kaç
            askeri vardı onu göremiyorum."*

            KAYIPTAN ÖNCE geliyor: "neye çarptım" sorusu "ne kadarını
            öldürdüm"den önce sorulur. Yalnız kaybı gösterirken savunan
            kazandıysa oyuncu neye çarptığını hiç öğrenemiyordu — kayıp
            küçük olur, ordu devasa kalırdı.

            Eski raporlarda bu alan yok; o zaman bölüm hiç çizilmiyor.
          */}
          {sum(r.theirSent) > 0 && (
            <Section title={inc ? 'SALDIRANIN ORDUSU' : 'KARŞI TARAFIN ORDUSU'}>
              <UnitGrid units={r.theirSent} unitDefs={unitDefs} color={C.textDim} />
            </Section>
          )}

          {/*
            KAHRAMANIN ÖDEDİĞİ BEDEL — zırhın gerçekten ne yaptığı.

            Ham hasar ile uygulananı YAN YANA yazmak şart: tek başına
            "−981 can" oyuncuya zırhının işe yarayıp yaramadığını
            söylemiyor. Fark görününce zırh yatırımı ölçülebilir hâle
            geliyor. Eski raporlarda `hasarHam` yok; o zaman yalnız
            uygulanan yazılıyor.
          */}
          {r.kahraman && (r.kahraman.hasar > 0 || r.kahraman.oldu) && (
            <Section title="KAHRAMANIN BEDELİ">
              <div style={{ fontFamily: FONT.ui, fontSize: 11, lineHeight: 1.7, color: C.text }}>
                <div>
                  Can <b style={{ color: C.danger }}>−{r.kahraman.hasar}</b>
                  {r.kahraman.hasarHam > r.kahraman.hasar && (
                    <span style={{ color: C.good }}>
                      {' '}· zırh {r.kahraman.hasarHam - r.kahraman.hasar} hasarı engelledi
                      {' '}({Math.round((1 - r.kahraman.hasar / r.kahraman.hasarHam) * 100)}%)
                    </span>
                  )}
                </div>
                {r.kahraman.xp > 0 && (
                  <div style={{ color: C.iceSoft }}>Deneyim +{r.kahraman.xp}</div>
                )}
                {r.kahraman.oldu && (
                  <div style={{ color: C.danger, fontWeight: 600 }}>
                    KAHRAMAN BAYILDI — diriltmen gerekiyor.
                  </div>
                )}
              </div>
            </Section>
          )}

          <Section title={inc ? 'SALDIRANIN KAYBI' : 'KARŞI TARAFIN KAYBI'}>
            <UnitGrid units={r.theirLosses} unitDefs={unitDefs} color={C.good} />
          </Section>

          {!inc && r.survivors && (
            <Section title="DÖNEN ASKERLER">
              <UnitGrid units={r.survivors} unitDefs={unitDefs} color={C.iceSoft} />
            </Section>
          )}

          {/*
            TOPLAM önce, kalem dökümü sonra. Oyuncunun ilk sorduğu şey
            "ne kadar aldım/kaybettim"; altı kalemi toplamak zorunda
            kalmasın diye tek büyük sayı en üstte.
          */}
          <Section title={inc ? 'KAYBEDİLEN KAYNAK' : 'ELE GEÇEN KAYNAK'}>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7,
            }}>
              <span style={num({
                fontSize: 26, lineHeight: 1,
                color: ganimet > 0 ? (inc ? C.danger : C.warn) : C.textMute,
              })}>
                {inc && ganimet > 0 ? '−' : ''}{short(ganimet)}
              </span>
              <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textMute }}>
                toplam birim{inc ? ' çalındı' : ''}
              </span>
            </div>
            <ResGrid res={r.loot} color={inc ? C.danger : C.warn} />
          </Section>

          {/*
            YAĞMACI NE KADAR DOLU DÖNDÜ — hedef seçmeyi öğreten sayı.
            Boş dönen sefer ordunun küçüklüğünden değil hedefin
            fakirliğinden olur; bu satır olmadan oyuncu farkı göremiyor.
          */}
          {tasima && (
            <Section title="DÖNÜŞ YÜKÜ">
              <div style={panel({ padding: '10px 12px', background: 'rgba(11,23,37,0.7)' })}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 6 }}>
                  <span style={num({
                    fontSize: 20, lineHeight: 1,
                    color: tasima.oran >= 0.95 ? C.good
                      : tasima.oran >= 0.4 ? C.warn : C.danger,
                  })}>%{Math.round(tasima.oran * 100)}</span>
                  <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textDim }}>
                    dolu · {short(tasima.yuk)} / {short(tasima.kapasite)} taşıma
                  </span>
                </div>
                <div style={{
                  height: 6, borderRadius: 3, overflow: 'hidden',
                  background: 'rgba(255,255,255,0.07)',
                }}>
                  <div style={{
                    width: `${Math.max(1, tasima.oran * 100)}%`, height: '100%',
                    background: tasima.oran >= 0.95 ? C.good
                      : tasima.oran >= 0.4 ? C.warn : C.danger,
                  }} />
                </div>
                <div style={{
                  fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute,
                  marginTop: 6, lineHeight: 1.5,
                }}>
                  {tasima.oran >= 0.95
                    ? 'Ordu dolu döndü — hedefte daha fazlası vardı, büyük orduyla daha çok getirirsin.'
                    : tasima.oran < 0.15
                      ? 'Neredeyse boş döndü — hedefin deposu boştu, sık yağmalanan bir köy olabilir.'
                      : 'Kapasitenin bir kısmı boş döndü; hedefte kalan kaynak azdı.'}
                </div>
              </div>
            </Section>
          )}

          {/*
            KUŞATMA SONUCU — iki tarafa da gösterilir.
            Savunan surunun düştüğünü fark etmezse bir sonraki saldırıya
            hazırlıksız yakalanır; saldıran da makinesinin işe yarayıp
            yaramadığını göremezse kuşatmaya yatırım yapmaz.
          */}
          {r.kusatma && (
            <div style={panel({
              padding: '9px 11px', background: 'rgba(217,192,105,0.10)',
              border: '1px solid rgba(217,192,105,0.38)',
            })}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Icon name="atolye" size={14} color="#d9c069" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim, lineHeight: 1.7 }}>
                  <b style={{ color: '#e8d08a' }}>Kuşatma</b>
                  {r.kusatma.sur > 0 && (
                    <div>Sur <b style={{ color: C.danger }}>−{r.kusatma.sur}</b> seviye</div>
                  )}
                  {r.kusatma.hendek > 0 && (
                    <div>Hendek <b style={{ color: C.danger }}>−{r.kusatma.hendek}</b> seviye</div>
                  )}
                  {(r.kusatma.binalar || []).map((b, i) => (
                    <div key={i}>
                      {b.ad || VILLAGE_DEFS[b.tip]?.name || b.tip}
                      {' '}<b style={{ color: C.danger }}>{b.onceki} → {b.sonraki}</b>
                      {b.sonraki === 0 ? ' (yıkıldı)' : ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {r.lootLost && sum(r.lootLost) > 0 && (
            <div style={panel({
              padding: '9px 11px', background: 'rgba(242,187,96,0.09)',
              border: `1px solid ${C.warn}44`,
            })}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Icon name="uyari" size={14} color={C.warn} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim, lineHeight: 1.6 }}>
                  Deponun yeri yetmediği için <b style={{ color: C.warn }}>{short(sum(r.lootLost))}</b>
                  {' '}ganimet kayboldu. Depo/ambar yükseltmek yağmayı doğrudan kârlı hâle getirir.
                  <div style={{ marginTop: 5 }}><ResGrid res={r.lootLost} color={C.warn} /></div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/*
        KEŞİF ÇARPIŞMASI — KAÇ CASUS, KAÇ KAYIP.

        Eskiden yalnız "casusu durdurdun" yazıyordu; kaç casusun geldiği,
        kaçının öldüğü, kendi kaybının ne olduğu hiçbir yerde yoktu.
        Savunan oyuncu için bunlar asıl bilgi: gelen sayı karşı tarafın
        ne kadar ciddi olduğunu, kayıp da bir daha gelirse ne olacağını
        söylüyor.

        BAŞARILI KEŞİFTE DE GÖRÜNÜYOR. Blok `kesif` sonucunu dışarıda
        bırakıyordu: keşif başarınca yalnız istihbarat yazılıyor, kaç
        izcinin öldüğü HİÇBİR yerde geçmiyordu (İlkan bildirdi —
        "çoğu gelmedi ve raporda kaçı öldü yazmıyor"). Oysa bilgiyi almak
        ile bedelini görmek aynı raporun iki yarısı.

        Karşı tarafta izci YOKSA çarpışma da olmamıştır; o zaman blok hiç
        çizilmiyor. "0 kayıp, 0 karşı casus" satırları boş gürültü olurdu.
      */}
      {kesifMi(r) && (r.outcome !== 'kesif' || kesifCarpismasi(r)) && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>
                {inc ? 'GELEN CASUS' : 'GÖNDERDİĞİM CASUS'}
              </div>
              <div style={num({ fontSize: 18, color: inc ? C.danger : C.frost })}>
                {(inc ? (r.gelenCasus ?? sum(r.attackerUnits)) : sum(r.sent)) || '—'}
              </div>
            </div>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>
                {inc ? 'SAVUNAN CASUSUM' : 'KARŞI CASUS'}
              </div>
              <div style={num({ fontSize: 18, color: C.iceSoft })}>
                {r.savunanIzci ?? r.karsiIzci ?? '—'}
              </div>
            </div>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>KAYBIM</div>
              <div style={num({ fontSize: 18, color: sum(r.myLosses) ? C.danger : C.textMute })}>
                {sum(r.myLosses) || 0}
              </div>
            </div>
          </div>

          {inc && r.attackerUnits && sum(r.attackerUnits) > 0 && (
            <Section title="GELEN CASUSLAR">
              <UnitGrid units={r.attackerUnits} unitDefs={unitDefs} color={C.danger} />
            </Section>
          )}
          {!inc && r.sent && sum(r.sent) > 0 && (
            <Section title="GÖNDERDİĞİM CASUSLAR">
              <UnitGrid units={r.sent} unitDefs={unitDefs} color={C.frost} />
            </Section>
          )}
          {sum(r.myLosses) > 0 && (
            <Section title="KAYBIM">
              <UnitGrid units={r.myLosses} unitDefs={unitDefs} color={C.danger} />
            </Section>
          )}
          {sum(r.theirLosses) > 0 && (
            <Section title={inc ? 'ÖLDÜRDÜĞÜM CASUS' : 'ÖLDÜRDÜĞÜM KARŞI İZCİ'}>
              <UnitGrid units={r.theirLosses} unitDefs={unitDefs} color={C.good} />
            </Section>
          )}

        {r.outcome === 'kesif' ? (
          /*
            BAŞARILI KEŞFİN BEDELİ. Karşı taraf izcisiyle karşı koydu ama
            yetmedi: bilgi geldi, izcilerin bir kısmı gelmedi. Oyuncunun
            bir dahaki sefere kaç izci göndereceğini bu sayı belirliyor.
          */
          <div style={{
            padding: '9px 11px', borderRadius: 6,
            background: 'rgba(143,220,255,0.08)',
            border: '1px solid rgba(143,220,255,0.28)',
            fontFamily: FONT.ui, fontSize: 11, color: C.textDim, lineHeight: 1.7,
          }}>
            Köy seni fark etti ve{' '}
            <b style={{ color: C.iceSoft }}>
              {(r.savunanIzci ?? r.karsiIzci ?? 0)} izciyle
            </b>{' '}
            karşı koydu. Keşif yine de geçti — bilgi aşağıda.
            {sum(r.myLosses) > 0 && (
              <> Bedeli <b style={{ color: C.danger }}>{sum(r.myLosses)} izci</b>:
              {' '}gönderdiğin {sum(r.sent)} izciden
              {' '}{Math.max(0, sum(r.sent) - sum(r.myLosses))} tanesi dönüyor.</>
            )}
          </div>
        ) : (
        <div style={{
          padding: '9px 11px', borderRadius: 6,
          background: r.outcome === 'kesif_engellendi'
            ? 'rgba(78,207,168,0.08)' : 'rgba(232,99,111,0.08)',
          border: `1px solid ${r.outcome === 'kesif_engellendi'
            ? 'rgba(78,207,168,0.28)' : 'rgba(232,99,111,0.28)'}`,
          fontFamily: FONT.ui, fontSize: 11, color: C.textDim, lineHeight: 1.7,
        }}>
          {r.outcome === 'kesif_basarisiz' && (
            <>Karşı tarafın izcileri{r.karsiIzci ? ` (${r.karsiIzci} izci)` : ''} keşfi
            durdurdu — hiçbir bilgi gelmedi. Daha fazla izci gönderirsen geçebilirsin.</>
          )}
          {r.outcome === 'kesfedildim' && (
            <>İzcilerin casusu fark etti ama durduramadı: karşı taraf ordunu,
            surunu ve deponu gördü. Yakında saldırı gelebilir.</>
          )}
          {r.outcome === 'kesif_engellendi' && (
            <>İzcilerin casusu durdurdu — köyün hakkında hiçbir bilgi sızmadı.</>
          )}
        </div>
        )}
        </>
      )}

      {r.outcome === 'kesif' && r.intel && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>ORDU</div>
              <div style={num({ fontSize: 18, color: C.frost })}>{short(r.intel.armyTotal)}</div>
            </div>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>SUR / HENDEK</div>
              <div style={num({ fontSize: 18, color: C.warn })}>
                {r.intel.surLevel} / {r.intel.hendekLevel}
              </div>
              {r.intel.kulePct ? (
                <div style={num({ fontSize: 10, color: C.dangerDim })}>
                  kule +{r.intel.kulePct}%
                </div>
              ) : null}
            </div>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>NÜFUS</div>
              <div style={num({ fontSize: 18, color: C.textDim })}>{short(r.intel.population)}</div>
            </div>
          </div>
          <Section title="SAVUNAN BİRİMLER">
            <UnitGrid units={r.intel.army} unitDefs={unitDefs} color={C.frost} />
          </Section>
          <Section title="DEPOSUNDAKİLER">
            <ResGrid res={r.intel.resources} color={C.warn} />
          </Section>
        </>
      )}

      {/*
        TAKVİYE — savaş değil, bu yüzden güç/kayıp/ganimet kutuları yok.
        Gönderen "askerim nerede" sorusunun, alan da "kim ne gönderdi ve
        ekmeğini kim ödüyor" sorusunun cevabını burada buluyor.
      */}
      {/*
        HAMMADDE GÖNDERİSİ — savaş değil, o yüzden güç/kayıp kutuları yok.
        Alan "kimden, ne, ne zaman", gönderen "neyi kime yolladım"
        sorusunun cevabını burada buluyor.
      */}
      {r.outcome === 'hammadde_yolda' && (
        <>
          <Section title={inc ? 'SANA GELEN YÜK' : 'GÖNDERDİĞİN YÜK'}>
            <ResGrid res={r.yuk} color={inc ? C.good : C.iceSoft} />
          </Section>
          <div style={panel({
            padding: '9px 11px', background: 'rgba(143,220,255,0.07)',
            border: '1px solid ' + C.lineSoft,
          })}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Icon name="depo" size={14} color={C.iceSoft}
                style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim, lineHeight: 1.7 }}>
                {inc ? (
                  <>
                    <b style={{ color: C.good }}>{r.fromName}</b> sana
                    {' '}<b style={{ color: C.frost }}>{(r.toplam || 0).toLocaleString('tr-TR')}</b>
                    {' '}birim hammadde yolladı — KARŞILIKSIZ.
                  </>
                ) : (
                  <>
                    <b style={{ color: C.frost }}>{(r.toplam || 0).toLocaleString('tr-TR')}</b>
                    {' '}birim hammadde <b style={{ color: C.iceSoft }}>{r.toName}</b>
                    {' '}köyüne yola çıktı. Geri alınamaz.
                  </>
                )}
                {r.varisSn > 0 && (
                  <> Kervan <b style={{ color: C.frost }}>{fmtTime(r.varisSn)}</b> sonra varıyor
                  {r.mesafe ? ` (${r.mesafe} hex)` : ''}.</>
                )}
                {!inc && r.tuccar > 0 && (
                  <> <b style={{ color: C.textDim }}>{r.tuccar}</b> tüccar bağlı;
                  {' '}dönene kadar başka işte kullanılamıyor.</>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {r.outcome === 'takviye_vardi' && (
        <>
          <Section title={inc ? 'GELEN BİRLİKLER' : 'GÖNDERDİĞİM BİRLİKLER'}>
            <UnitGrid units={r.sent} unitDefs={unitDefs} color={C.good} />
          </Section>
          <div style={panel({
            padding: '9px 11px', background: 'rgba(78,207,168,0.09)',
            border: '1px solid rgba(78,207,168,0.30)',
          })}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Amblem type="kalkan" size={18} color={C.good} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim, lineHeight: 1.7 }}>
                {inc ? (
                  <>
                    <b style={{ color: C.good }}>{r.fromName}</b> köyünden
                    {' '}<b style={{ color: C.good }}>{sum(r.sent)}</b> asker savunmana katıldı.
                    {' '}Bu askerlerin ekmeğini <b>senin köyün</b> ödüyor — üretimin eksiye
                    {' '}düşmesin diye tarlalarına bak.
                  </>
                ) : (
                  <>
                    <b style={{ color: C.good }}>{sum(r.sent)}</b> asker
                    {' '}<b style={{ color: C.good }}>{r.toName}</b> köyünün savunmasına katıldı.
                    {' '}Ekmeğini artık o köy ödüyor. Ordu ekranından istediğin an geri
                    {' '}çağırabilirsin.
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/*
        TAKVİYEM SAVAŞTI — asker benim, savaş başkasının köyünde.
        Kendi savaş raporumdan ayrı: burada sur/ganimet benim değil,
        önemli olan kaç askerimi kaybettim ve orada kaç askerim kaldı.
      */}
      {/*
        EV SAHİBİ GERİ YOLLADI — asker yolda, sebebi burada.
        Bu rapor olmasaydı oyuncu askerinin neden döndüğünü göremez,
        bir hata sanardı.
      */}
      {r.outcome === 'takviye_geri_yollandi' && (
        <>
          <Section title="GERİ YOLLANAN BİRLİKLER">
            <UnitGrid units={r.sent} unitDefs={unitDefs} color={C.warn} />
          </Section>
          <div style={panel({
            padding: '9px 11px', background: 'rgba(242,187,96,0.09)',
            border: `1px solid ${C.warn}44`,
          })}>
            <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim, lineHeight: 1.7 }}>
              <b style={{ color: C.warn }}>{r.fromName}</b> köyü takviyeni geri yolladı.
              Misafir askerin ekmeğini EV SAHİBİ öder; köyü besleyemiyor olabilir.
              Askerlerin yürüyerek dönüyor.
            </div>
          </div>
        </>
      )}

      {r.outcome === 'takviye_savasti' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>KAYBIM</div>
              <div style={num({ fontSize: 18, color: sum(r.myLosses) ? C.danger : C.textMute })}>
                {sum(r.myLosses) || 0}
              </div>
            </div>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>ORADA KALAN</div>
              <div style={num({ fontSize: 18, color: sum(r.kalanTakviye) ? C.good : C.textMute })}>
                {sum(r.kalanTakviye) || 0}
              </div>
            </div>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>SALDIRANIN KAYBI</div>
              <div style={num({ fontSize: 18, color: C.good })}>
                {sum(r.theirLosses) || 0}
                {/*
                  KAÇTA KAÇ — "40 öldürdüm" tek başına anlamsız; 40/45 ile
                  40/900 tamamen farklı iki savaş. Payda yoksa (eski
                  rapor) yalnız sayı yazılıyor.
                */}
                {sum(r.theirSent) > 0 && (
                  <span style={{ fontSize: 11, color: C.textMute }}>
                    {' / '}{sum(r.theirSent)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {r.attackerUnits && (
            <Section title="SALDIRAN ORDU">
              <UnitGrid units={r.attackerUnits} unitDefs={unitDefs} color={C.danger} />
            </Section>
          )}
          {sum(r.myLosses) > 0 && (
            <Section title="KAYBETTİĞİM BİRLİKLER">
              <UnitGrid units={r.myLosses} unitDefs={unitDefs} color={C.danger} />
            </Section>
          )}
          {sum(r.kalanTakviye) > 0 && (
            <Section title="HÂLÂ ORADA DURAN BİRLİKLERİM">
              <UnitGrid units={r.kalanTakviye} unitDefs={unitDefs} color={C.good} />
            </Section>
          )}

          <div style={panel({
            padding: '9px 11px',
            background: r.winner === 'defender' ? 'rgba(78,207,168,0.09)' : 'rgba(232,99,111,0.09)',
            border: `1px solid ${r.winner === 'defender' ? 'rgba(78,207,168,0.30)' : 'rgba(232,99,111,0.30)'}`,
          })}>
            <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim, lineHeight: 1.7 }}>
              <b style={{ color: C.frost }}>{r.toName}</b> köyüne
              {' '}<b style={{ color: C.danger }}>{r.fromName}</b> saldırdı; oradaki
              {' '}takviyen savunmaya katıldı.
              {r.winner === 'defender'
                ? ' Savunma tuttu.'
                : ' Savunma düştü.'}
              {sum(r.kalanTakviye) > 0
                ? ' Kalan askerlerin hâlâ o köyde; ordu ekranından geri çağırabilirsin.'
                : ' Orada askerin kalmadı.'}
            </div>
          </div>
        </>
      )}

      {r.outcome === 'hedef_yok' && (
        <div style={{ fontFamily: FONT.ui, fontSize: 11, color: C.textDim, lineHeight: 1.7 }}>
          Hedef köy varış anında haritada yoktu; ordu kayıpsız geri döndü.
        </div>
      )}
    </div>
  );
}

// ── Ekran ────────────────────────────────────────────────────────────
export default function ReportScreen({ reports = [], unitDefs = {},
  socket = null, toplam = 0, sayfaBoyu = 15, sayilar = null, onSimulate = null }) {
  const vp = useViewport();
  const [filter, setFilter] = useState('all');
  const [selId, setSelId] = useState(null);
  const [read, setRead] = useState(() => new Set(readIds()));
  /*
    SAYFA DURUMU. Sıfırıncı sayfa PAKETTE geliyor (ekran açılır açılmaz
    dolu olsun); sonrakiler sunucudan isteniyor.
  */
  const [sayfa, setSayfa] = useState(0);
  const [sayfaVerisi, setSayfaVerisi] = useState(null);

  useEffect(() => {
    if (!socket) return;
    const gelen = (d) => { if (d && typeof d.sayfa === 'number') setSayfaVerisi(d); };
    socket.on('rapor_sayfasi', gelen);
    return () => socket.off('rapor_sayfasi', gelen);
  }, [socket]);

  /*
    SUNUCUDAN NE ZAMAN İSTİYORUZ? Yalnız "ilk sayfa + HEPSİ" pakette
    hazır geliyor; başka her durumda (ileri sayfa ya da bir sekme)
    süzme SUNUCUDA yapılmalı, çünkü burada raporların yalnız bir
    sayfası var — 3. sayfadaki saldırılar elimizde yok.
  */
  const sunucudan = sayfa > 0 || filter !== 'all';

  /*
    RAPOR İMZASI — "elimdeki dilim bayatladı mı?" sorusunun cevabı.
    Paket saniyede bir ve her seferinde yeni nesnelerle geliyor; nesne
    kimliğine bakan bir etki saniyede bir istek yollardı.
  */
  const raporImza = `${toplam}|${reports[0]?.id || ''}`;

  useEffect(() => {
    if (sunucudan) socket?.emit('rapor_sayfa', { sayfa, filtre: filter });
    /* raporImza: yeni rapor gelince açık sekme de tazelensin */
  }, [sunucudan, sayfa, filter, socket, raporImza]);

  // Açık raporu okunmuş işaretle. Ekrana girmek TÜM raporları okunmuş
  // saymıyor; yalnız açtığın rapor okunur.
  const openReport = (id) => {
    setSelId(id);
    if (id && !read.has(id)) setRead(new Set(markRead(id)));
  };

  /*
    KEŞİFLER sekmesi artık dört sonucu da topluyor (başarılı, durdurulan,
    köyümün keşfedilmesi, casusu durdurmam). Eskiden yalnız 'kesif'e
    bakıyordu; keşif çarpışması gelince başarısız keşifler SALDIRILARIM
    sekmesine düşüyor, savunan tarafın keşif raporu da BANA GELENLER'e
    karışıyordu.
  */
  /*
    GÖSTERİLEN LİSTE üç durumdan biri:

      · paket          — ilk sayfa, HEPSİ sekmesi (istek bile gitmiyor)
      · gelen sayfa    — sunucu bu filtreyi süzüp dilimlemiş
      · ELİMİZDEKİNİN SÜZÜLMÜŞÜ — cevap yoldayken geçici görüntü

    Üçüncüsü olmasa sekmeye her basışta ekran bir an boşalır, oyuncu
    "raporlarım gitti" sanırdı. Geçici liste eksik ama YANLIŞ değil:
    elimizdeki sayfanın doğru süzülmüş hâli, bir an sonra tamamı
    geliyor.
  */
  const list = useMemo(() => {
    if (!sunucudan) return reports;
    if (sayfaVerisi?.filtre === filter) return sayfaVerisi.raporlar || [];
    return reports.filter(r => {
      if (filter === 'out') return r.dir === 'out' && !kesifMi(r);
      if (filter === 'in') return r.dir === 'in' && !kesifMi(r);
      if (filter === 'scout') return kesifMi(r);
      return true;
    });
  }, [sunucudan, reports, sayfaVerisi, filter]);

  /*
    MASAÜSTÜNDE İLK RAPOR KENDİLİĞİNDEN AÇIK: sağdaki ayrıntı kutusu boş
    durmasın. MOBİLDE DEĞİL — akordeonda "kendiliğinden açık" demek,
    ekran her açıldığında ilk raporun kocaman bir blok hâlinde yolu
    kapaması demek.
  */
  const sel = list.find(r => r.id === selId) || (vp.mobile ? null : (list[0] || null));

  // Otomatik seçilen (ilk) rapor da ekranda AÇIK duruyor — onu da okunmuş say
  useEffect(() => {
    if (sel?.id && !read.has(sel.id)) setRead(new Set(markRead(sel.id)));
  }, [sel?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  /*
    ROZET SAYILARI SUNUCUDAN. Buradan saymak sayfalamadan sonra YALAN
    söylüyordu: elimizde 15 rapor var diye 200 raporluk hesapta rozet
    "HEPSİ 15" yazıyordu (İlkan bildirdi). Sunucu yoksa — ilk çizim,
    eski sunucu — elimizdekini sayıyoruz; eksik ama tutarsız değil.
  */
  const counts = useMemo(() => sayilar || ({
    all: reports.length,
    out: reports.filter(r => r.dir === 'out' && !kesifMi(r)).length,
    in: reports.filter(r => r.dir === 'in' && !kesifMi(r)).length,
    scout: reports.filter(r => kesifMi(r)).length,
  }), [sayilar, reports]);

  /*
    SAYFA SAYISI AÇIK SEKMEYE GÖRE. Toplam rapor sayısından hesaplasaydık
    KEŞİFLER sekmesinde 14 sayfa görünür, 13'ü boş çıkardı.
  */
  const suzulmusToplam = counts[filter] ?? toplam;
  const sonSayfa = Math.max(0, Math.ceil((suzulmusToplam || list.length) / (sayfaBoyu || 15)) - 1);

  if (!reports.length) {
    return (
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 0' }}>
        <div style={panel({ padding: 26, textAlign: 'center' })}>
          <Icon name="savas" size={30} color={C.lineBright} strokeWidth={1.1} />
          <div style={{
            fontFamily: FONT.head, fontSize: 17, color: C.textDim, marginTop: 10,
          }}>Henüz rapor yok</div>
          <div style={{
            fontFamily: FONT.ui, fontSize: 11, color: C.textMute, marginTop: 6, lineHeight: 1.7,
          }}>
            Haritadan bir NPC köyü seçip <b>ORDU GÖNDER</b> ile yağma, saldırı ya da
            keşif gönder. Sefer hedefe vardığında sonucu burada göreceksin.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', paddingTop: 12, paddingBottom: 16 }}>
      {/* Filtreler */}
      {/*
        SARMAYAN TEK SATIRDI: telefonda dört süzgeç düğmesi 415 px'e sığmıyor,
        SALDIRILARIM'a 90 px gerekirken 77 px kalıyor ve etiket kesiliyordu.
        Artık satır sarıyor; dar ekranda başlık kendi satırını alıp düğmelere
        tam genişlik bırakıyor.
      */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
        flexWrap: 'wrap',
      }}>
        <Icon name="savas" size={15} color={C.iceDeep} />
        <span style={lbl({
          fontSize: 9, letterSpacing: 1.5, marginRight: 6,
          ...(vp.mobile ? { flex: '1 1 auto' } : null),
        })}>Savaş raporları</span>
        {FILTERS.map(f => {
          const on = filter === f.key;
          return (
            <button key={f.key}
              onClick={() => {
                /*
                  FİLTRE DEĞİŞİNCE BAŞA DÖN. 7. sayfadayken filtre
                  değiştirmek boş bir ekran verirdi. Sıfırlama burada,
                  olayın içinde: etkiye taşımak basamaklı çizim olurdu.
                */
                setFilter(f.key); setSelId(null); setSayfa(0);
              }}
              style={btn(on ? 'primary' : 'ghost', {
                padding: '5px 11px', fontSize: 9, letterSpacing: 1.1,
                whiteSpace: 'nowrap',
              })}>
              {f.label}
              <span style={{ color: on ? C.iceSoft : C.textMute, marginLeft: 5 }}>
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dar ekranda liste ve detay alt alta — 300 px liste + detay sığmıyor */}
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: vp.mobile ? '1fr' : 'minmax(300px, 400px) 1fr',
      }}>
        {/* Liste */}
        <div className="tn-scroll" style={{
          display: 'flex', flexDirection: 'column', gap: 5,
          maxHeight: 'calc(var(--tn-vh) - 190px)', overflowY: 'auto', paddingRight: 3,
        }}>
          {list.length === 0 ? (
            <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textMute, padding: 10 }}>
              Bu filtrede rapor yok.
            </div>
          ) : list.map(r => (
            <div key={r.id}>
              <Row r={r}
                active={sel?.id === r.id}
                unread={!read.has(r.id)}
                ok={vp.mobile}
                onClick={() => ((sel?.id === r.id && vp.mobile)
                  ? setSelId(null)
                  : openReport(r.id))} />
              {/*
                MOBİLDE AYRINTI SATIRIN ALTINDA (İlkan'ın isteği).
                Ayrı kutu telefonda listenin ALTINA düşüyordu: her
                tıklamada aşağı, sonraki rapor için yukarı kaydırmak
                gerekiyordu.
              */}
              {vp.mobile && sel?.id === r.id && (
                <div style={{ ...panel({ padding: 12 }), marginTop: 4 }}>
                  <Detail r={r} unitDefs={unitDefs} onSimulate={onSimulate} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Ayrıntı — yalnız masaüstünde ayrı sütun */}
        {!vp.mobile && (
          <div className="tn-scroll" style={{
            ...panel({ padding: 15 }),
            maxHeight: 'calc(var(--tn-vh) - 190px)', overflowY: 'auto',
          }}>
            <Detail r={sel} unitDefs={unitDefs} onSimulate={onSimulate} />
          </div>
        )}
      </div>

      {/*
        SAYFALAR LİSTENİN ALTINDA (İlkan: "kalanını sayfa sayfa
        ilerleyecek şekilde aşağıya koy"). Tek sayfa varsa hiç
        çizilmiyor — boş bir sayfalayıcı yalnız yer kaplar.
      */}
      {sonSayfa > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, marginTop: 10,
        }}>
          <button type="button" disabled={sayfa <= 0}
            onClick={() => { setSayfa(s => Math.max(0, s - 1)); setSelId(null); }}
            style={{
              ...btn(sayfa > 0 ? 'ghost' : 'disabled'),
              padding: '6px 12px', fontSize: 10, opacity: sayfa > 0 ? 1 : 0.4,
            }}>← ÖNCEKİ</button>
          <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textFaint }}>
            {sayfa + 1} / {sonSayfa + 1}
            <span style={{ color: C.textMute }}> · {suzulmusToplam} rapor</span>
          </span>
          <button type="button" disabled={sayfa >= sonSayfa}
            onClick={() => { setSayfa(s => Math.min(sonSayfa, s + 1)); setSelId(null); }}
            style={{
              ...btn(sayfa < sonSayfa ? 'ghost' : 'disabled'),
              padding: '6px 12px', fontSize: 10, opacity: sayfa < sonSayfa ? 1 : 0.4,
            }}>SONRAKİ →</button>
        </div>
      )}
    </div>
  );
}
