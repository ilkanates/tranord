/**
 * WorkerScreen — köylülerin TAMAMI tek listede, buradan dağıtılabiliyor.
 *
 * Neden gerekti: "boşta köylü kalmamış" durumunda kimin nerede olduğunu
 * görmenin tek yolu 30+ hex'i tek tek açmaktı. Bu ekran nüfusun her kişisini
 * bir kovaya yazıyor ve toplamın nüfusa eşit olduğunu ekranda gösteriyor:
 *
 *     nüfus = boş + tarla + tarla yükseltme + bina personeli + inşaat
 *           + ordu + eğitim kuyruğu rezervi + seferdeki asker
 *
 * Atanabilir satırlar buradan değiştirilebiliyor (aynı `assign_*` olayları).
 * İnşaat, ordu, sefer ve kuyruk kovaları salt okunur — oradaki kişiler ancak
 * o iş bitince ya da iptal edilince havuza döner.
 *
 * Yalnız AÇIK köyü gösterir; başka köy için üstteki köy değiştiriciyi kullan.
 */
import { useMemo, useState } from 'react';
import VILLAGE_DEFS from '../data/villageDefs';
import BUILDING_DEFS from '../data/buildingDefs';
import { C, FONT, btn, label as lbl, num } from '../theme';
import { RES_LABEL, takesWorkers, maxWorkersOf, workerTerm } from '../flows';
import Icon from './Icons';

const RES_ICON = { odun: 'odun', kil: 'kil', tas: 'tas', demir: 'demir', tahil: 'tahil' };

function Sayac({ etiket, deger, renk, ipucu, vurgu = false }) {
  return (
    <div title={ipucu} style={{
      flex: '1 1 90px', minWidth: 90, padding: '7px 10px', borderRadius: 6,
      background: vurgu ? 'rgba(127,212,255,0.09)' : 'rgba(8,17,28,0.55)',
      border: `1px solid ${vurgu ? 'rgba(127,212,255,0.35)' : C.lineSoft}`,
    }}>
      <div style={lbl({ fontSize: 7.5, letterSpacing: 1.2 })}>{etiket}</div>
      <div style={num({ fontSize: 19, color: renk || C.frost, lineHeight: 1.15, marginTop: 2 })}>
        {deger}
      </div>
    </div>
  );
}

/** Atanabilir tek satır — isim, seviye, x/y ve kaydırıcı */
function Satir({
  ikon, ad, altYazi, seviye, isci, maks, renk, terim = 'İşçi',
  bos, onDegistir,
}) {
  const bosluk = maks - isci;
  const artabilir = Math.min(bosluk, bos);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '6px 9px', borderRadius: 5,
      background: 'rgba(8,17,28,0.5)',
      border: `1px solid ${isci === 0 && maks > 0 ? 'rgba(224,179,87,0.32)' : C.lineSoft}`,
    }}>
      <Icon name={ikon} size={15} color={renk} />

      <div style={{ flex: '1 1 130px', minWidth: 110 }}>
        <div style={{
          fontFamily: FONT.ui, fontSize: 11, color: C.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {ad}
          {seviye != null && (
            <span style={num({ fontSize: 9, color: C.textFaint, marginLeft: 5 })}>Lvl {seviye}</span>
          )}
        </div>
        {altYazi && (
          <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint, marginTop: 1 }}>
            {altYazi}
          </div>
        )}
      </div>

      {/* Doluluk çubuğu */}
      <div style={{ flex: '0 0 62px' }}>
        <div style={{
          height: 5, borderRadius: 3, overflow: 'hidden',
          background: 'rgba(255,255,255,0.07)',
        }}>
          <div style={{
            width: `${maks ? (isci / maks) * 100 : 0}%`, height: '100%',
            background: isci >= maks ? C.good : isci === 0 ? C.dangerDim : renk,
          }} />
        </div>
      </div>

      <span style={num({ fontSize: 11.5, color: isci === 0 ? C.warn : C.frost, minWidth: 44, textAlign: 'right' })}
        title={`${isci} / ${maks} ${terim.toLowerCase()}`}>
        {isci}<span style={{ color: C.textFaint }}>/{maks}</span>
      </span>

      <input type="range" min={0} max={maks} step={1} value={isci}
        onChange={(e) => onDegistir(Number(e.target.value))}
        // Havuzda olmayan işçiyi atamaya izin verilmiyor: sunucu da reddediyor,
        // kaydırıcının geri sıçraması sinir bozucu olurdu.
        style={{ flex: '0 0 96px', height: 4 }}
        title={`En çok ${isci + artabilir} atanabilir (havuzda ${bos} boş)`} />

      <div style={{ display: 'flex', gap: 3 }}>
        <button type="button" onClick={() => onDegistir(Math.max(0, isci - 1))}
          disabled={isci <= 0}
          style={btn(isci > 0 ? 'ghost' : 'disabled', { padding: '2px 7px', fontSize: 11, lineHeight: 1 })}>−</button>
        <button type="button" onClick={() => onDegistir(Math.min(maks, isci + 1))}
          disabled={artabilir <= 0}
          style={btn(artabilir > 0 ? 'ghost' : 'disabled', { padding: '2px 7px', fontSize: 11, lineHeight: 1 })}>+</button>
        <button type="button" onClick={() => onDegistir(Math.min(maks, isci + artabilir))}
          disabled={artabilir <= 0}
          title="Kapasiteye kadar doldur"
          style={btn(artabilir > 0 ? 'ghost' : 'disabled', { padding: '2px 7px', fontSize: 8.5 })}>MAKS</button>
      </div>
    </div>
  );
}

/** Salt okunur kova — buradaki kişiler kaydırıcıyla oynatılamaz */
function Kova({ ikon, ad, sayi, renk, aciklama }) {
  if (!sayi) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '6px 9px', borderRadius: 5,
      background: 'rgba(8,17,28,0.35)', border: `1px dashed ${C.lineSoft}`,
    }}>
      <Icon name={ikon} size={15} color={renk} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT.ui, fontSize: 11, color: C.textDim }}>{ad}</div>
        {aciklama && (
          <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint, marginTop: 1 }}>
            {aciklama}
          </div>
        )}
      </div>
      <span style={num({ fontSize: 11.5, color: C.textDim })}>{sayi}</span>
    </div>
  );
}

function Baslik({ children, sayi }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, margin: '12px 0 5px' }}>
      <span style={lbl({ fontSize: 8, letterSpacing: 1.5 })}>{children}</span>
      {sayi != null && <span style={num({ fontSize: 9, color: C.textFaint })}>{sayi} kişi</span>}
      <span style={{ flex: 1, height: 1, background: C.lineSoft }} />
    </div>
  );
}

export default function WorkerScreen({
  population = 0, freeWorkers = 0,
  villageBuildings = {}, productionTiles = {}, army = {},
  unitQueues = {}, marches = [], unitDefs = {},
  // Ekmek tüketimi — dağıtıcı önce açlığı kapatıyor
  consumption = null,
  villageName = null,
  onAssignVillageWorkers, onAssignProductionWorkers,
}) {
  const [gizleBos, setGizleBos] = useState(false);

  // ── Kovalar ───────────────────────────────────────────────────────
  const d = useMemo(() => {
    const tarlalar = Object.entries(productionTiles)
      .filter(([, t]) => t.level >= 1)
      .map(([key, t]) => {
        const def = BUILDING_DEFS[t.type];
        return {
          key, tip: t.type, seviye: t.level, isci: t.workers || 0,
          // Sunucu maxWorkers'ı yolluyor; yoksa tanımdan hesapla
          maks: t.maxWorkers || def?.levels?.[t.level - 1]?.workers || 1,
          yuks: t.upgradeWorkersAssigned || 0,
          verim: t.efficiency,
          // Üretim işçi sayısıyla DOĞRU ORANTILI; seviye yalnız kadro tavanını
          // açıyor. Bu yüzden işçi başına değer (base × verim) dağıtımın
          // tek ölçütü.
          birim: (def?.baseProductionPerWorker || 0) * (t.efficiency ?? 1),
        };
      })
      .sort((a, b) => a.tip.localeCompare(b.tip, 'tr') || a.key.localeCompare(b.key));

    const binalar = [];
    let insaat = 0;
    for (const [key, b] of Object.entries(villageBuildings)) {
      if (b.buildWorkers) insaat += b.buildWorkers;
      const def = VILLAGE_DEFS[b.type];
      if (!def || b.level < 1) continue;
      const maks = maxWorkersOf(b.type, def, b.level);
      if (!takesWorkers(b.type, def) || maks <= 0) continue;
      binalar.push({
        key, tip: b.type, ad: def.name, seviye: b.level,
        isci: b.workers || 0, maks,
        terim: workerTerm(b.type),
        kategori: def.category,
        isliyor: !!def.processes,
        proc: def.processes || null,
        yapim: !!b.building,
      });
    }
    binalar.sort((a, b) => (b.isliyor - a.isliyor)
      || a.ad.localeCompare(b.ad, 'tr'));

    const tarlaIsci = tarlalar.reduce((s, t) => s + t.isci, 0);
    const tarlaYuks = tarlalar.reduce((s, t) => s + t.yuks, 0);
    const binaIsci = binalar.reduce((s, b) => s + b.isci, 0);
    const ordu = Object.values(army).reduce((s, n) => s + (n || 0), 0);

    let kuyruk = 0;
    for (const q of Object.values(unitQueues)) {
      for (const o of q || []) if (o?.workerReserved) kuyruk++;
    }
    let seferde = 0;
    for (const m of marches || []) {
      for (const n of Object.values(m.units || {})) seferde += n || 0;
    }

    const toplam = freeWorkers + tarlaIsci + tarlaYuks + binaIsci + insaat + ordu + kuyruk + seferde;
    return {
      tarlalar, binalar,
      tarlaIsci, tarlaYuks, binaIsci, insaat, ordu, kuyruk, seferde,
      toplam, fark: population - toplam,
      calisan: tarlaIsci + binaIsci,
      bosSlot: tarlalar.reduce((s, t) => s + (t.maks - t.isci), 0)
        + binalar.reduce((s, b) => s + (b.maks - b.isci), 0),
    };
  }, [villageBuildings, productionTiles, army, unitQueues, marches, freeWorkers, population]);

  /**
   * BOŞLARI DAĞIT — sırayla değil, ÜRETİMİ DENGELEYEREK.
   *
   * Üretim işçi sayısıyla doğru orantılı (seviye yalnız kadro tavanını açar),
   * dolayısıyla "en verimli tarlaya hepsini yığmak" matematiksel olarak en
   * çok kaynağı verir ama oyunu tek kaynağa mahkûm eder. Bunun yerine sıra:
   *
   *   1) EKMEK ZİNCİRİ — açlık en pahalı hata. Tüketimi %15 payla karşılayacak
   *      kadar tahıl → değirmen → fırın işçisi ayrılır. Zincir oranları
   *      tanımlardan çıkarılıyor: 1 ekmek/sa için 1/6 fırın + 1/6 değirmen +
   *      (10/6)/(8×verim) tahıl işçisi.
   *   2) HAM KAYNAKLAR — odun/kil/taş/demir üretimleri EŞİTLENİR. Her adımda
   *      üretimi en düşük kaynağa, o kaynağın en verimli boş tarlasına 1 işçi.
   *   3) İŞLEME BİNALARI — ham üretiminin taşıyabileceği kadar. Fazlası boşa
   *      bekler: bina girdisi yoksa işçi hiçbir şey üretmez.
   *   4) ASKERİ BİNALAR — kalan varsa.
   *
   * Sonuçta her iş için TEK hedef sayı hesaplanıp tek olay gönderiliyor;
   * işçi başına ayrı istek atılmıyor.
   */
  const dagit = () => {
    let kalan = freeWorkers;
    if (kalan <= 0) return;

    // Hedefler mevcut atamadan başlar; kimseyi işten almıyoruz
    const hedefT = new Map(d.tarlalar.map(t => [t.key, t.isci]));
    const hedefB = new Map(d.binalar.map(b => [b.key, b.isci]));
    const yer = (t) => t.maks - (hedefT.get(t.key) || 0);
    const yerB = (b) => b.maks - (hedefB.get(b.key) || 0);

    /** Bir tarlaya en fazla n işçi ekle, gerçekte eklenen kadarını döndür */
    const ekleT = (t, n) => {
      const ver = Math.max(0, Math.min(n, yer(t), kalan));
      if (ver > 0) { hedefT.set(t.key, (hedefT.get(t.key) || 0) + ver); kalan -= ver; }
      return ver;
    };
    const ekleB = (b, n) => {
      const ver = Math.max(0, Math.min(n, yerB(b), kalan));
      if (ver > 0) { hedefB.set(b.key, (hedefB.get(b.key) || 0) + ver); kalan -= ver; }
      return ver;
    };

    const turden = (tip) => d.tarlalar.filter(t => t.tip === tip)
      .sort((a, b) => b.birim - a.birim);       // en verimli önce
    const binaTip = (tip) => d.binalar.filter(b => b.tip === tip);
    /** Bir gruba n işçiyi en verimli slottan başlayarak yay */
    const yayT = (liste, n) => { let k = n; for (const t of liste) { if (k <= 0) break; k -= ekleT(t, k); } return n - k; };
    const yayB = (liste, n) => { let k = n; for (const b of liste) { if (k <= 0) break; k -= ekleB(b, k); } return n - k; };

    // ── 1) EKMEK ZİNCİRİ ────────────────────────────────────────────
    const ekmekIhtiyac = (consumption?.foodPerHour || 0) * 1.15;
    if (ekmekIhtiyac > 0) {
      const firin = binaTip('firin');
      const degirmen = binaTip('degirmen');
      const firinProc = firin[0]?.proc;         // { input:'un', inputPerHour:8, outputPerHour:6 }
      const degProc = degirmen[0]?.proc;        // { input:'tahil', inputPerHour:10, outputPerHour:8 }
      if (firinProc && degProc) {
        // Fırın: her işçi outputPerHour kadar ekmek
        const firinIsci = Math.ceil(ekmekIhtiyac / firinProc.outputPerHour);
        const verilenFirin = yayB(firin, Math.max(0, firinIsci - firin.reduce((s, b) => s + b.isci, 0)));
        const firinToplam = firin.reduce((s, b) => s + (hedefB.get(b.key) || 0), 0);
        // Değirmen: fırının tükettiği un kadar un üretmeli
        const unGerek = firinToplam * firinProc.inputPerHour;
        const degIsci = Math.ceil(unGerek / degProc.outputPerHour);
        yayB(degirmen, Math.max(0, degIsci - degirmen.reduce((s, b) => s + b.isci, 0)));
        const degToplam = degirmen.reduce((s, b) => s + (hedefB.get(b.key) || 0), 0);
        // Tahıl: değirmenin tükettiği tahılı üretecek kadar
        const tahilGerek = degToplam * degProc.inputPerHour;
        const tahillar = turden('tahil');
        let uretilen = tahillar.reduce((s, t) => s + t.isci * t.birim, 0);
        for (const t of tahillar) {
          if (uretilen >= tahilGerek || kalan <= 0) break;
          const eksik = tahilGerek - uretilen;
          const gerekli = t.birim > 0 ? Math.ceil(eksik / t.birim) : 0;
          uretilen += ekleT(t, gerekli) * t.birim;
        }
        void verilenFirin;
      }
    }

    // ── 2) HAM KAYNAKLAR: üretimleri eşitle ─────────────────────────
    const HAM = ['odun', 'kil', 'tas', 'demir'];
    const gruplar = HAM.map(tip => ({ tip, liste: turden(tip) })).filter(g => g.liste.length);
    if (gruplar.length) {
      const uretim = new Map(gruplar.map(g => [g.tip,
        g.liste.reduce((s, t) => s + (hedefT.get(t.key) || 0) * t.birim, 0)]));
      // Her turda en düşük üretimli kaynağa bir grup işçi ver. Adım büyüklüğü
      // 1 değil: 500 işçide 500 tur dönmek yerine kabaca %2'lik dilimler.
      const adim = Math.max(1, Math.floor(kalan / 60));
      let guvenlik = 5000;
      while (kalan > 0 && guvenlik-- > 0) {
        const uygun = gruplar.filter(g => g.liste.some(t => yer(t) > 0));
        if (!uygun.length) break;
        uygun.sort((a, b) => (uretim.get(a.tip) || 0) - (uretim.get(b.tip) || 0));
        const g = uygun[0];
        const onceKalan = kalan;
        for (const t of g.liste) {
          if (kalan <= 0) break;
          const ver = ekleT(t, Math.min(adim, yer(t)));
          uretim.set(g.tip, (uretim.get(g.tip) || 0) + ver * t.birim);
          if (ver > 0) break;                   // tek adımda tek slot
        }
        if (kalan === onceKalan) break;         // hiç yer kalmadı
      }
    }

    // ── 3) İŞLEME BİNALARI: ham üretiminin taşıdığı kadar ───────────
    const hamUretim = (tip) => turden(tip)
      .reduce((s, t) => s + (hedefT.get(t.key) || 0) * t.birim, 0);
    const islemeler = d.binalar.filter(b => b.proc && b.tip !== 'firin' && b.tip !== 'degirmen');
    for (const b of islemeler) {
      if (kalan <= 0) break;
      const girdi = b.proc.input;
      const uretilen = ['odun', 'kil', 'tas', 'demir', 'tahil'].includes(girdi)
        ? hamUretim(girdi) : Infinity;
      // Aynı girdiyi kullanan diğer binaların tükettiğini düş
      const rakipTuketim = d.binalar
        .filter(x => x.proc?.input === girdi && x.key !== b.key)
        .reduce((s, x) => s + (hedefB.get(x.key) || 0) * x.proc.inputPerHour, 0);
      const tasiyabilir = Math.max(0, uretilen - rakipTuketim);
      const isciSiniri = isFinite(tasiyabilir)
        ? Math.floor(tasiyabilir / b.proc.inputPerHour) : b.maks;
      ekleB(b, Math.max(0, isciSiniri - (hedefB.get(b.key) || 0)));
    }

    // ── 4) ASKERİ BİNALAR ───────────────────────────────────────────
    for (const b of d.binalar.filter(x => !x.proc)) {
      if (kalan <= 0) break;
      ekleB(b, yerB(b));
    }

    // ── Uygula: değişen her iş için tek olay ────────────────────────
    for (const t of d.tarlalar) {
      const h = hedefT.get(t.key) || 0;
      if (h !== t.isci) onAssignProductionWorkers?.(t.key, h);
    }
    for (const b of d.binalar) {
      const h = hedefB.get(b.key) || 0;
      if (h !== b.isci) onAssignVillageWorkers?.(b.key, h);
    }
  };

  const bosalt = () => {
    for (const t of d.tarlalar) if (t.isci > 0) onAssignProductionWorkers?.(t.key, 0);
    for (const b of d.binalar) if (b.isci > 0) onAssignVillageWorkers?.(b.key, 0);
  };

  const gorunenTarla = gizleBos ? d.tarlalar.filter(t => t.isci > 0) : d.tarlalar;
  const gorunenBina = gizleBos ? d.binalar.filter(b => b.isci > 0) : d.binalar;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '12px 0 26px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 9 }}>
        <Icon name="isci" size={17} color={C.iceDeep} />
        <span style={{
          fontFamily: FONT.head, fontSize: 19, fontWeight: 600,
          letterSpacing: 1.4, color: C.frost,
        }}>Köylüler</span>
        {villageName && (
          <span style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textFaint }}>
            {villageName}
          </span>
        )}
      </div>

      {/* Sayaçlar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        <Sayac etiket="Nüfus" deger={population} ipucu="Köyde yaşayan herkes" />
        <Sayac etiket="Boşta" deger={freeWorkers} vurgu
          renk={freeWorkers > 0 ? C.good : C.textMute}
          ipucu="Hiçbir işte olmayan, hemen atanabilir köylü" />
        <Sayac etiket="Çalışan" deger={d.calisan}
          ipucu="Tarla ve binalarda üretim yapanlar" />
        <Sayac etiket="İnşaatta" deger={d.insaat} renk={d.insaat ? C.ice : C.textMute}
          ipucu="İnşaat/yükseltme bitince havuza dönerler" />
        <Sayac etiket="Asker" deger={d.ordu + d.seferde} renk={C.danger}
          ipucu="Asker olan köylü havuza geri dönmez" />
        <Sayac etiket="Boş kadro" deger={d.bosSlot}
          renk={d.bosSlot ? C.warn : C.good}
          ipucu="Kapasitesi dolmamış iş yeri sayısı" />
      </div>

      {/* Muhasebe — toplam nüfusa eşit mi? */}
      <div style={{
        marginTop: 8, padding: '7px 10px', borderRadius: 5,
        display: 'flex', alignItems: 'center', gap: 8,
        background: d.fark === 0 ? 'rgba(108,221,163,0.07)' : 'rgba(224,179,87,0.10)',
        border: `1px solid ${d.fark === 0 ? 'rgba(108,221,163,0.3)' : 'rgba(224,179,87,0.45)'}`,
        fontFamily: FONT.ui, fontSize: 9.5, lineHeight: 1.5,
        color: d.fark === 0 ? '#c8f0d8' : '#e8cf9a',
      }}>
        <Icon name={d.fark === 0 ? 'bonus' : 'uyari'} size={12}
          color={d.fark === 0 ? C.good : C.warn} />
        <span>
          {d.fark === 0
            ? `Muhasebe tutuyor: ${freeWorkers} boş + ${d.calisan} çalışan + ${d.insaat} inşaat`
              + ` + ${d.ordu} asker${d.seferde ? ` + ${d.seferde} seferde` : ''}`
              + `${d.kuyruk ? ` + ${d.kuyruk} eğitimde` : ''} = ${population} nüfus`
            : `${Math.abs(d.fark)} köylü hesaba katılamadı (nüfus ${population},`
              + ` kovaların toplamı ${d.toplam}). Sunucu yeniden başlatılınca onarılır.`}
        </span>
      </div>

      {/* Toplu işlemler */}
      <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
        <button type="button" onClick={dagit}
          disabled={freeWorkers <= 0 || d.bosSlot <= 0}
          title="Sıra: 1) ekmek zinciri (tüketim + %15), 2) odun/kil/taş/demir üretimlerini eşitle, 3) işleme binaları ham üretimin taşıdığı kadar, 4) askeri binalar"
          style={btn(freeWorkers > 0 && d.bosSlot > 0 ? 'primary' : 'disabled',
            { padding: '5px 11px', fontSize: 9.5 })}>
          BOŞLARI DAĞIT
        </button>
        <button type="button" onClick={bosalt} disabled={d.calisan <= 0}
          title="Bütün tarla ve binalardaki personeli havuza al"
          style={btn(d.calisan > 0 ? 'ghost' : 'disabled', { padding: '5px 11px', fontSize: 9.5 })}>
          HEPSİNİ BOŞALT
        </button>
        <button type="button" onClick={() => setGizleBos(g => !g)}
          style={btn('ghost', { padding: '5px 11px', fontSize: 9.5, marginLeft: 'auto' })}>
          {gizleBos ? 'BOŞLARI GÖSTER' : 'YALNIZ ÇALIŞANLAR'}
        </button>
      </div>

      {/* ── Üretim tarlaları ── */}
      <Baslik sayi={d.tarlaIsci}>Üretim tarlaları</Baslik>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {gorunenTarla.map(t => (
          <Satir key={t.key}
            ikon={RES_ICON[t.tip] || 'odun'}
            ad={RES_LABEL[t.tip] || t.tip}
            altYazi={`slot ${t.key}`
              + (t.verim != null ? ` · verim ×${Number(t.verim).toFixed(2)}` : '')
              + (t.birim ? ` · ${Math.round(t.isci * t.birim)}/sa` : '')
              + (t.yuks ? ` · yükseltmede ${t.yuks} işçi` : '')}
            seviye={t.seviye} isci={t.isci} maks={t.maks}
            renk="#7ae07a" bos={freeWorkers}
            onDegistir={(n) => onAssignProductionWorkers?.(t.key, n)} />
        ))}
        {!gorunenTarla.length && (
          <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute, padding: '3px 2px' }}>
            {gizleBos ? 'Personelli tarla yok.' : 'Kurulmuş üretim tarlası yok.'}
          </div>
        )}
      </div>

      {/* ── Binalar ── */}
      <Baslik sayi={d.binaIsci}>Binalar</Baslik>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {gorunenBina.map(b => (
          <Satir key={b.key}
            ikon={b.isliyor ? 'lonca' : 'kalkan'}
            ad={b.ad}
            altYazi={(b.proc
              ? `${b.isci * b.proc.inputPerHour}/sa ${RES_LABEL[b.proc.input] || b.proc.input}`
                + ` → ${b.isci * b.proc.outputPerHour}/sa ${RES_LABEL[b.proc.output] || b.proc.output}`
              : 'askeri')
              + (b.terim !== 'İşçi' ? ` · ${b.terim.toLowerCase()}` : '')
              + (b.yapim ? ' · yükseltiliyor' : '')}
            seviye={b.seviye} isci={b.isci} maks={b.maks}
            terim={b.terim}
            renk={b.isliyor ? '#7fd4ff' : '#e0b357'} bos={freeWorkers}
            onDegistir={(n) => onAssignVillageWorkers?.(b.key, n)} />
        ))}
        {!gorunenBina.length && (
          <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute, padding: '3px 2px' }}>
            {gizleBos ? 'Personelli bina yok.' : 'Personel alan bina yok.'}
          </div>
        )}
      </div>

      {/* ── Değiştirilemeyenler ── */}
      {(d.insaat || d.ordu || d.seferde || d.kuyruk) > 0 && (
        <>
          <Baslik sayi={d.insaat + d.ordu + d.seferde + d.kuyruk}>
            Buradan değiştirilemez
          </Baslik>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Kova ikon="insaat" ad="İnşaat / yükseltme işçisi" sayi={d.insaat} renk={C.ice}
              aciklama="İş bitince ya da iptal edilince havuza dönerler" />
            <Kova ikon="isci" ad="Eğitim kuyruğunda rezerve" sayi={d.kuyruk} renk={C.warn}
              aciklama="Sipariş iptal edilirse havuza döner" />
            <Kova ikon="ordu" ad="Köydeki asker" sayi={d.ordu} renk={C.danger}
              aciklama="İşçi askere dönüşür, geri dönmez" />
            <Kova ikon="savas" ad="Seferde olan asker" sayi={d.seferde} renk={C.danger}
              aciklama="Sefer dönünce köyün ordusuna katılır" />
          </div>
        </>
      )}
    </div>
  );
}
