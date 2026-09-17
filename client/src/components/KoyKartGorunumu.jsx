/**
 * KÖY — KART GÖRÜNÜMÜ (hex sahneye alternatif).
 *
 * İlkan'ın tarifi: *"üstte kategori sekmeleri, seçilen kategorinin
 * binaları altta kart olarak açılır; oyuncu binayı köy görselinden değil
 * karttan seçer ve NE SEÇTİĞİNİ NET GÖRÜR."*
 *
 * TELEFON İÇİN. Hex sahne dikeyde yerin yarısını boş bırakıyor ve küçük
 * ekranda doğru altıgene basmak zor; kartlar bütün genişliği kullanıyor
 * ve hedefleri parmak boyunda.
 *
 * YENİ PANEL YAZILMADI — yalnız BİNAYA ULAŞMA YOLU değişiyor. Karta
 * basmak hex'e basmakla aynı şeyi yapıyor (`onSec(slotKey)`); açılan
 * panel, kuyruklar, işçi atama, yükseltme hepsi aynı kod. İkinci bir
 * panel yazsaydık her yeni bina özelliği iki yerde bakım isterdi — bu
 * projede "aynı şey iki yerde" hatası defalarca patladı.
 *
 * BOŞ ALAN AYRI BİR SEKME. Hex sahnede boş yer aramak için gözle
 * taramak gerekiyordu; burada hepsi tek listede ve HALKAYA göre sıralı,
 * çünkü üretim çarpanı halkaya bağlı — merkeze yakın slot daha değerli.
 */
import { useMemo, useState } from 'react';
import { C, FONT, btn, label as lbl, num } from '../theme';
import VILLAGE_DEFS from '../data/villageDefs';
import { BUILDING_TEXTURE, TEXTURE_EMBLEM, MERKEZ_IMG } from './buildingArt';

/**
 * GÖRÜNÜM ANAHTARININ GENİŞLİĞİ — tek sayı, iki okuyucu.
 *
 * Anahtarı VillageCenter çiziyor (hex görünümünde de gerekiyor) ama
 * yerini kart şeridinin ayırması gerekiyor. Ayrı ayrı tahmin edilince
 * ikisi ayrıştı ve sekmeler anahtarın altına girdi; şimdi anahtara bu
 * genişlik VERİLİYOR, şerit de aynı sayıyı okuyor.
 */
export const GORUNUM_ANAHTARI_W = 118;
import Icon, { buildingIcon } from './Icons';
import Amblem from './Amblem';

const CAT_LABEL = {
  merkez: 'Merkez', isleme: 'İşleme', askeri: 'Askeri', depo: 'Depo',
  ekonomik: 'Ekonomik', nufus: 'Nüfus', savunma: 'Savunma', yonetim: 'Yönetim',
};

/* Hex sahnedeki kenar renkleriyle AYNI — iki görünüm aynı dili konuşsun */
const CAT_EDGE = {
  isleme: '#7ae07a', askeri: '#8fbcff', depo: '#c0a8f8',
  ekonomik: '#f0d868', savunma: '#ff8080', yonetim: '#e0b357',
  nufus: '#68e8e0', anaBina: '#f0c860', merkez: '#f0c860',
};

/** Sur/hendek/kule gibi adı olan slotlar — savunma sekmesinde toplanıyor */
const SLOT_LABEL = { sur: 'Sur', hendek: 'Hendek' };

const kategoriOf = (tip, slotKey) => {
  if (slotKey === '0,0') return 'merkez';
  return VILLAGE_DEFS[tip]?.category || 'yonetim';
};

/**
 * TEK BİNA KARTI — görsel tam genişlik, poster gibi.
 *
 * Seviye ve kuyruk durumu görselin ÜSTÜNDE duruyor: kartın altına
 * yazsaydık göz her kartta aşağı inip geri çıkardı, oysa aranan bilgi
 * "bu bina kaçıncı seviyede ve çalışıyor mu".
 */
function BinaKarti({ slotKey, bina, secili, onSec }) {
  const tip = bina?.type;
  const kat = kategoriOf(tip, slotKey);
  const kenar = CAT_EDGE[kat] || C.lineBright;
  const gorsel = slotKey === '0,0' ? MERKEZ_IMG : BUILDING_TEXTURE[tip];
  const amblem = TEXTURE_EMBLEM[tip];
  const ad = slotKey === '0,0' ? 'Ana Bina'
    : SLOT_LABEL[slotKey] || VILLAGE_DEFS[tip]?.name || tip;
  const calisiyor = bina?.building || bina?.upgrading;

  return (
    <button type="button" onClick={() => onSec(slotKey)} style={{
      display: 'block', width: '100%', padding: 0, cursor: 'pointer',
      textAlign: 'left', borderRadius: 8, overflow: 'hidden',
      background: 'rgba(8,15,23,0.6)',
      border: `1px solid ${secili ? kenar : C.lineSoft}`,
      boxShadow: secili ? `0 0 0 1px ${kenar}55` : 'none',
    }}>
      {/* Görsel şeridi — tam genişlik, panelin posteri gibi */}
      <div style={{
        position: 'relative', height: 74, overflow: 'hidden',
        background: gorsel ? undefined : 'rgba(12,20,32,0.7)',
      }}>
        {gorsel ? (
          <img src={gorsel} alt="" draggable={false} style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          }} />
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            <Amblem type={amblem?.icon || buildingIcon(tip)} size={26} color={kenar} />
          </div>
        )}
        {/* Okunurluk şeridi: açık görsellerde yazı kayboluyordu */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(4,9,15,0.92) 0%,'
            + ' rgba(4,9,15,0.45) 45%, rgba(4,9,15,0.05) 100%)',
        }} />
        <div style={{
          position: 'absolute', left: 9, right: 9, bottom: 6,
          display: 'flex', alignItems: 'flex-end', gap: 7,
        }}>
          <span style={{
            flex: 1, minWidth: 0, fontFamily: FONT.head, fontSize: 13,
            color: C.frost, whiteSpace: 'nowrap', overflow: 'hidden',
            textOverflow: 'ellipsis', textShadow: '0 1px 3px rgba(0,0,0,0.9)',
          }}>{ad}</span>
          <span style={num({
            fontSize: 12, color: kenar, textShadow: '0 1px 3px rgba(0,0,0,0.9)',
          })}>Lvl {bina?.level ?? 0}</span>
        </div>
        {calisiyor && (
          <span style={{
            position: 'absolute', top: 6, right: 7,
            fontFamily: FONT.ui, fontSize: 8, letterSpacing: 0.6,
            padding: '2px 7px', borderRadius: 8, color: '#04121c',
            background: C.ice,
          }}>{bina.building ? 'İNŞA' : 'YÜKSELİYOR'}</span>
        )}
      </div>
    </button>
  );
}

/** Boş slot kartı — inşa edilebilir yer */
function BosKart({ slotKey, ring, secili, onSec }) {
  return (
    <button type="button" onClick={() => onSec(slotKey)} style={{
      display: 'flex', alignItems: 'center', gap: 9, width: '100%',
      padding: '10px 11px', cursor: 'pointer', textAlign: 'left',
      borderRadius: 8, background: 'rgba(8,15,23,0.45)',
      border: `1px dashed ${secili ? C.lineBright : C.line}`,
    }}>
      <Icon name="ekle" size={15} color={C.textMute} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT.ui, fontSize: 11.5, color: C.textDim }}>
          Boş arazi
        </div>
        <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint }}>
          {ring === 0 ? 'merkez' : `${ring}. halka`} · {slotKey}
        </div>
      </div>
      <span style={btn('ghost', { fontSize: 8.5, padding: '3px 10px' })}>İNŞA ET</span>
    </button>
  );
}

export default function KoyKartGorunumu({
  villageBuildings = {}, allSlots = [], towerSlots = [],
  secili = null, railInset = 0, onSec,
}) {
  const [kategori, setKategori] = useState('hepsi');

  /*
    BİNALAR VE BOŞ SLOTLAR TEK GEÇİŞTE ayrılıyor. İki ayrı döngü
    yazsaydık "hangi slot boş" sorusu iki yerde cevaplanır ve biri
    kule/sur gibi adı olan slotları unuturdu.
  */
  const { binalar, bosSlotlar } = useMemo(() => {
    const b = [];
    const bos = [];
    for (const s of allSlots) {
      const key = `${s.q},${s.r}`;
      const bina = villageBuildings[key];
      if (bina) b.push({ key, bina, kat: kategoriOf(bina.type, key) });
      else bos.push({ key, ring: s.ring });
    }
    /* Adı olan slotlar (sur, hendek, kule1…) savunma sekmesine düşüyor */
    for (const key of ['sur', 'hendek', ...towerSlots]) {
      const bina = villageBuildings[key];
      if (bina) b.push({ key, bina, kat: 'savunma' });
    }
    /*
      BOŞ SLOTLAR HALKAYA GÖRE: üretim çarpanı halkaya bağlı, merkeze
      yakın slot daha değerli. Anahtar sırasına göre bıraksaydık liste
      oyuncuya hiçbir şey söylemeyen bir koordinat yığını olurdu.
    */
    bos.sort((x, y) => x.ring - y.ring || x.key.localeCompare(y.key));
    return { binalar: b, bosSlotlar: bos };
  }, [villageBuildings, allSlots, towerSlots]);

  /* Yalnız DOLU kategoriler sekme oluyor — boş sekme tıklanacak bir yalan */
  const kategoriler = useMemo(() => {
    const sayac = new Map();
    for (const x of binalar) sayac.set(x.kat, (sayac.get(x.kat) || 0) + 1);
    const sira = ['merkez', 'isleme', 'ekonomik', 'askeri', 'savunma',
      'depo', 'nufus', 'yonetim'];
    return sira.filter(k => sayac.has(k)).map(k => [k, sayac.get(k)]);
  }, [binalar]);

  const gosterilen = kategori === 'hepsi' ? binalar
    : kategori === 'bos' ? []
      : binalar.filter(x => x.kat === kategori);

  const sekme = (k, ad, adet) => (
    <button key={k} type="button" onClick={() => setKategori(k)}
      style={btn(kategori === k ? 'primary' : 'ghost', {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        /*
          BÜZÜLME YOK. Şerit yatay kaydırmalı; `flexShrink` açık
          kalınca tarayıcı kaydırmaya başvurmadan önce düğmeleri
          eziyordu ve `nowrap` yazı kutudan taşıp komşu sekmenin
          üstüne biniyordu.
        */
        flexShrink: 0,
        fontSize: 9, padding: '6px 12px', letterSpacing: 0.6, whiteSpace: 'nowrap',
      })}>
      <span>{ad}</span>
      {/*
        SAYI AYRI ROZETTE. Etiketle aynı akışta duruyordu ve telefonda
        bir sonraki sekmenin adına yapışık okunuyordu ("HEPSİ 21MERKEZ").
      */}
      {adet != null && (
        <span style={{
          fontFamily: FONT.ui, fontSize: 8, opacity: 0.65,
          padding: '1px 5px', borderRadius: 7,
          background: 'rgba(255,255,255,0.10)',
        }}>{adet}</span>
      )}
    </button>
  );

  return (
    <div className="tn-scroll" style={{
      position: 'absolute', inset: 0, overflowY: 'auto', zIndex: 2,
      /*
        YAN ŞERİTLERİN ALTINA GİRMESİN. Köy ekranının solunda kaynak,
        sağında nüfus/ordu şeridi sahnenin üstünde duruyor; hex sahne
        ortalandığı için sorun değildi, tam genişlik kullanan liste
        için sorun. Sabit sayı yerine `railInset`: şerit genişliği
        değişirse ikisi ayrışmasın.
      */
      padding: `10px ${railInset + 14}px 24px`,
    }}>
      {/*
        SEKME ŞERİDİ YATAY KAYDIRMALI, açılır liste değil: kategoriler az
        (en çok sekiz) ve şerit tek dokunuşla geziliyor; açılır liste her
        kategori değişimine fazladan bir tık eklerdi.
      */}
      <div className="tn-scroll" style={{
        display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 8,
        /*
          GÖRÜNÜM ANAHTARININ YANINDAN BAŞLASIN. Anahtar bu şeridin
          değil sahnenin çocuğu (hex görünümünde de duruyor), yani
          yerini tarayıcı ayıramıyor — biz ayırıyoruz. Anahtar
          `railInset + 10`'da, şeridin içeriği `railInset + 14`'te
          başlıyor: aradaki 4 px düşülüyor, kalan 10 px nefes payı.
        */
        paddingLeft: GORUNUM_ANAHTARI_W + 6,
        position: 'sticky', top: 0, zIndex: 3,
        background: 'linear-gradient(to bottom, rgba(6,11,18,0.96) 70%, transparent)',
      }}>
        {sekme('hepsi', 'HEPSİ', binalar.length)}
        {kategoriler.map(([k, n]) => sekme(k, (CAT_LABEL[k] || k).toUpperCase(), n))}
        {bosSlotlar.length > 0 && sekme('bos', 'BOŞ ALAN', bosSlotlar.length)}
      </div>

      {kategori === 'bos' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={lbl({ fontSize: 8, marginBottom: 2 })}>
            Boş araziler · merkeze yakın olan daha verimli
          </div>
          {bosSlotlar.map(s => (
            <BosKart key={s.key} slotKey={s.key} ring={s.ring}
              secili={secili === s.key} onSec={onSec} />
          ))}
        </div>
      ) : (
        <div style={{
          display: 'grid', gap: 8,
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
        }}>
          {gosterilen.map(x => (
            <BinaKarti key={x.key} slotKey={x.key} bina={x.bina}
              secili={secili === x.key} onSec={onSec} />
          ))}
        </div>
      )}

      {gosterilen.length === 0 && kategori !== 'bos' && (
        <div style={{
          padding: 20, textAlign: 'center',
          fontFamily: FONT.ui, fontSize: 10.5, color: C.textMute,
        }}>Bu kategoride bina yok.</div>
      )}
    </div>
  );
}
