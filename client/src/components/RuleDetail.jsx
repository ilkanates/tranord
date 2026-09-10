/**
 * RuleDetail — YARDIM ekranındaki "Oyunun kuralları" sayfaları.
 *
 * Buradaki her sayı tanım dosyalarından HESAPLANIYOR, elle yazılmıyor:
 * villageDefs (bina tavanları, kapasiteler, işleme oranları, savunma eğrileri)
 * ve buildingDefs (tarla kadroları, işçi başına üretim). Dengeyi değiştirince
 * bu sayfalar kendiliğinden güncelleniyor — ikinci bir doğruluk kaynağı
 * oluşmuyor.
 *
 * `POP_PER_HOUR_*` ve yiyecek oranları sunucudaki sabitlerin ikizidir; tek
 * yerde durmaları mümkün değil (biri Node, biri tarayıcı), o yüzden burada
 * kaynak dosya adıyla birlikte not düşüldü.
 */
import VILLAGE_DEFS, {
  DEF_BONUS_CAP, SUR_BONUS, HENDEK_BONUS, KULE_BONUS, TOWER_SLOTS, BASE_POPULATION,
} from '../data/villageDefs';
import BUILDING_DEFS from '../data/buildingDefs';
import { C, FONT, label as lbl, num } from '../theme';
import { RES_LABEL } from '../flows';
import Icon from './Icons';

/* ── sunucudaki sabitlerin ikizi ──────────────────────────────────── */
// server/index.js
const POP_PER_HOUR_BASE = 1.0;
const POP_PER_HOUR_STEP = 2.0;
// server/game/tick.js
const FOOD_PER_VILLAGER_PER_DAY = 3;
const FOOD_PER_SOLDIER_PER_DAY  = 6;
const GRAIN_PER_HORSE_PER_DAY   = 3;
const HOURS_PER_DAY             = 24;
// server/index.js — getMaxProductionSlots
const TARLA_TAVANI = (anaBinaLvl) => Math.min(16, 5 + anaBinaLvl);
// server/game/army.js
const RAID_LOOT_SHARE = 0.5;
const LOOTABLE = [
  'odun', 'kil', 'tas', 'demir', 'tahil',
  'kereste', 'tugla', 'yontmaTas', 'demirKulce', 'un', 'ekmek',
];
const MIN_MARCH_MINUTES = 1;

const say = (n) => Math.round(n).toLocaleString('tr-TR');

/* ── küçük parçalar ───────────────────────────────────────────────── */

function P({ children }) {
  return (
    <div style={{
      fontFamily: FONT.ui, fontSize: 11.5, color: C.textDim,
      lineHeight: 1.65, margin: '0 0 10px',
    }}>{children}</div>
  );
}

function Baslik({ children, icon, renk = C.iceDeep }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      margin: '18px 0 7px', paddingBottom: 5,
      borderBottom: `1px solid ${C.lineSoft}`,
    }}>
      {icon && <Icon name={icon} size={13} color={renk} />}
      <span style={lbl({ fontSize: 8.5, letterSpacing: 1.5, color: renk })}>{children}</span>
    </div>
  );
}

function Sat({ k, v, c = C.frost, not }) {
  return (
    <div style={{ padding: '4px 0', borderBottom: `1px solid ${C.lineSoft}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <span style={{ fontFamily: FONT.ui, fontSize: 11, color: C.textDim }}>{k}</span>
        <span style={num({ fontSize: 11.5, color: c, textAlign: 'right' })}>{v}</span>
      </div>
      {not && (
        <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, marginTop: 2, lineHeight: 1.45 }}>
          {not}
        </div>
      )}
    </div>
  );
}

/** Vurgulu kutu — bir kuralın özü */
function Kutu({ children, renk = '#7fd4ff', baslik }) {
  return (
    <div style={{
      margin: '10px 0', padding: '9px 11px', borderRadius: 6,
      background: `${renk}0f`, border: `1px solid ${renk}55`,
    }}>
      {baslik && (
        <div style={lbl({ fontSize: 8, letterSpacing: 1.3, color: renk, marginBottom: 4 })}>
          {baslik}
        </div>
      )}
      <div style={{ fontFamily: FONT.ui, fontSize: 11, color: C.text, lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}

/** Tek satırlık akış şeması: A → B → C */
function Akis({ adimlar }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', gap: 0, flexWrap: 'wrap',
      margin: '10px 0 14px',
    }}>
      {adimlar.map((a, i) => (
        <div key={a.ad} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            padding: '7px 10px', borderRadius: 6, minWidth: 92,
            background: 'rgba(8,17,28,0.6)', border: `1px solid ${a.renk}66`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {a.ikon && <Icon name={a.ikon} size={12} color={a.renk} />}
              <span style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.frost }}>{a.ad}</span>
            </div>
            <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint, marginTop: 2 }}>
              {a.alt}
            </div>
          </div>
          {i < adimlar.length - 1 && (
            <span style={{ padding: '0 6px', color: C.textMute, fontSize: 14 }}>→</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── hesaplanan ortak değerler ────────────────────────────────────── */

const tarlaKadro = (lv) => BUILDING_DEFS.odun?.levels?.[lv - 1]?.workers || 0;
const TARLA_MAKS_LV = BUILDING_DEFS.odun?.levels?.length || 20;
const binaKadro = (tip, lv) => lv * (VILLAGE_DEFS[tip]?.workersPerLevel || 3);
const depoKap = (tip, lv) => {
  const d = VILLAGE_DEFS[tip];
  return d ? d.baseCapacity + Math.max(0, lv - 1) * d.capacityPerLevel : 0;
};
const anaBinaMaks = VILLAGE_DEFS.anaBina?.maxLevel || 11;
const evMaks = VILLAGE_DEFS.ev?.maxLevel || 5;
const evBasina = VILLAGE_DEFS.ev?.populationPerLevel || 100;
const popHiz = (lv) => (lv < 1 ? 0 : POP_PER_HOUR_BASE + (lv - 1) * POP_PER_HOUR_STEP);

/** Zincirin tavanı: değirmen + fırın tam kadroyla kaç ekmek/sa */
function ekmekZinciri() {
  const dg = VILLAGE_DEFS.degirmen, fr = VILLAGE_DEFS.firin;
  const dKad = binaKadro('degirmen', dg?.maxLevel || 20);
  const fKad = binaKadro('firin', fr?.maxLevel || 20);
  const un = dKad * (dg?.processes?.outputPerHour || 0);
  const tahilYer = dKad * (dg?.processes?.inputPerHour || 0);
  const ekmekKap = fKad * (fr?.processes?.outputPerHour || 0);
  const unYer = fKad * (fr?.processes?.inputPerHour || 0);
  return { dKad, fKad, un, tahilYer, ekmekKap, unYer, ekmek: Math.min(ekmekKap, un * (fr?.processes?.outputPerHour || 1) / (fr?.processes?.inputPerHour || 1)) };
}

/* ── sayfalar ─────────────────────────────────────────────────────── */

function Dongu() {
  const z = ekmekZinciri();
  const tarlaSayi = TARLA_TAVANI(anaBinaMaks);
  const tahilMaks = tarlaSayi * tarlaKadro(TARLA_MAKS_LV) * (BUILDING_DEFS.tahil?.baseProductionPerWorker || 8);
  return (
    <>
      <P>
        Oyunun bütün ekonomisi tek bir döngüde toplanıyor. Her halka bir
        sonrakini besliyor; en dardaki halka senin gerçek sınırın oluyor.
      </P>
      <Akis adimlar={[
        { ad: 'Ev', alt: 'sivil tavanı', ikon: 'ev', renk: '#68e8e0' },
        { ad: 'Ana bina', alt: 'büyüme hızı', ikon: 'anaBina', renk: '#f0c860' },
        { ad: 'Köylü', alt: 'üretim + asker', ikon: 'isci', renk: '#7fd4ff' },
        { ad: 'Tahıl', alt: 'herkesi besler', ikon: 'tahil', renk: '#7ae07a' },
      ]} />
      <Kutu baslik="Kısa hâli" renk="#7ae07a">
        <b>Ev</b> kaç köylün olabileceğini, <b>ana bina</b> ne kadar çabuk
        dolacağını belirler. Köylü ya üretimde çalışır ya askere gider.
        Asker sivil tavanına sayılmaz, yani askere aldığın köylünün yeri
        boşalır ve yenisi doğar. Herkesi <b>tahıl</b> besler — kalıcı sınır
        odur.
      </Kutu>

      <Baslik icon="nufus" renk="#68e8e0">Asker tavana sayılmaz</Baslik>
      <P>
        Bu kural oyunun kilidini açan yerdir. Asker de nüfusun parçasıdır ama
        <b> ev tavanı yalnız sivilleri sınırlar</b>: asker evden çıkıp kışlaya
        gider. Böylece işçiyi askere çevirdiğinde yer açılır, nüfus yerini
        doldurur ve tekrar asker basabilirsin.
      </P>
      <Kutu baslik="Neden böyle" renk="#e0b357">
        Asker tavana sayılsaydı, tavana oturmuş bir köyde işçiyi askere
        çevirmek yer açmazdı; büyüme dururdu ve toplam ordun sonsuza dek
        “tavan − elde tuttuğun işçi” ile sınırlı kalırdı.
      </Kutu>

      <Baslik icon="tahil" renk="#7ae07a">Gerçek sınır: tahıl</Baslik>
      <Sat k="En fazla üretim alanı" v={`${tarlaSayi} tarla`}
        not={`min(16, 5 + ana bina seviyesi) — ana bina Lvl ${anaBinaMaks}'de tavan.`} />
      <Sat k={`${tarlaSayi} tahıl tarlası Lvl ${TARLA_MAKS_LV} tam kadro`} v={`${say(tahilMaks)} tahıl/sa`}
        c="#7ae07a"
        not={`${tarlaSayi} × ${tarlaKadro(TARLA_MAKS_LV)} işçi × ${BUILDING_DEFS.tahil?.baseProductionPerWorker} tahıl.`} />
      <Sat k="Değirmen + fırın kapasitesi" v={`${say(z.tahilYer)} tahıl/sa`}
        not="Zincir bilerek tarlalardan büyük tutuldu: darboğaz tahıl üretimi olsun, zincir olmasın." />
      <Sat k="Bu tahılla beslenen ordu" v={`~${say((tahilMaks * 0.77 * 24) / FOOD_PER_SOLDIER_PER_DAY)} asker`}
        c={C.warn}
        not="Kabaca; sivillerin ekmeği düşüldükten sonra kalan tahılın karşılığı." />
    </>
  );
}

function Nufus() {
  const kademeler = [1, 5, anaBinaMaks];
  return (
    <>
      <P>
        Nüfus kendiliğinden artar. <b>Ne kadar hızlı</b> arttığını ana bina,
        <b> nereye kadar</b> arttığını evler belirler.
      </P>

      <Baslik icon="ev" renk="#68e8e0">Tavan — evler</Baslik>
      <Sat k="Evsiz köyün tabanı" v={`${BASE_POPULATION} kişi`} />
      <Sat k="Ev başına" v={`+${evBasina} / seviye`}
        not={`Ev en fazla Lvl ${evMaks}, yani tam bir ev +${evBasina * evMaks} kapasite. Ev tek değil, birden fazla kurulabilir.`} />
      <Sat k="Tavan formülü" v={`${BASE_POPULATION} + Σ (ev seviyesi × ${evBasina})`} />
      <Sat k="Neyi sınırlar" v="yalnız sivilleri" c="#68e8e0"
        not="Asker ve seferdeki birlikler tavana sayılmaz." />

      <Baslik icon="anaBina" renk="#f0c860">Hız — ana bina</Baslik>
      <Sat k="Formül" v={`${POP_PER_HOUR_BASE} + (seviye − 1) × ${POP_PER_HOUR_STEP}`}
        not="Oyun saati başına kişi. Ana bina yoksa nüfus hiç artmaz." />
      {kademeler.map(lv => (
        <Sat key={lv} k={`Ana bina Lvl ${lv}`} v={`${popHiz(lv)} kişi/oyun saati`}
          c={lv === anaBinaMaks ? '#f0c860' : C.frost}
          not={lv === anaBinaMaks ? 'en yüksek seviye' : null} />
      ))}

      <Baslik icon="uyari" renk="#ff8080">Büyüme ne zaman durur</Baslik>
      <P>
        İki durumda: <b>sivil nüfus tavana</b> dayandığında ya da köy
        <b> açlık</b> çektiğinde. Açlıkta büyüme durmakla kalmaz, kayıp da
        verirsin — önce askerler, onlar bitince siviller ölür.
      </P>
    </>
  );
}

function Isci() {
  const orn = [1, 5, 10, 15, TARLA_MAKS_LV];
  return (
    <>
      <P>
        Köylü bu oyunda üretimin motoru. Tarlalar ve binalar kendi başına
        üretmez — <b>kaç işçi atadığın</b> kadar üretir.
      </P>
      <Kutu baslik="Üretim formülü" renk="#7ae07a">
        işçi × işçi başına üretim × arazi çarpanı
        <div style={{ fontSize: 10, color: C.textFaint, marginTop: 4 }}>
          Tarlanın <b>seviyesi üretime doğrudan katkı vermez</b>; yalnız kaç
          işçi alabileceğini (kadro tavanını) açar.
        </div>
      </Kutu>

      <Baslik icon="tahil" renk="#7ae07a">İşçi başına üretim</Baslik>
      {Object.entries(BUILDING_DEFS).map(([k, d]) => (
        <Sat key={k} k={RES_LABEL[k] || k} v={`${d.baseProductionPerWorker}/sa`} />
      ))}

      <Baslik icon="isci">Tarla kadro tavanı</Baslik>
      {orn.map(lv => (
        <Sat key={lv} k={`Lvl ${lv}`} v={`${tarlaKadro(lv)} işçi`}
          not={lv === TARLA_MAKS_LV ? 'en yüksek seviye' : null} />
      ))}
      <Baslik icon="kalkan" renk="#8fbcff">Bina kadro tavanı</Baslik>
      <Sat k="Formül" v="seviye × işçi/seviye"
        not="İşleme binaları ve kışla/ahır/atölye/silahçı/zırhçı 3, kuleler 4 (okçu)." />
      <Sat k={`İşleme binası Lvl 20`} v={`${binaKadro('keresteci', 20)} işçi`} />
      <Sat k={`Kule Lvl 20`} v={`${binaKadro('kule', 20)} okçu`} />
      <Sat k="Personel almayanlar" v="sur, hendek" c={C.textMute} />

      <Baslik icon="bonus" renk="#e0b357">Köylüler ekranı</Baslik>
      <P>
        Üst menüdeki <b>Köylüler</b> sekmesi nüfusun her kişisini bir kovada
        gösterir ve toplamın nüfusa eşit olduğunu yazar. <b>Boşları dağıt</b>
        {' '}düğmesi sırayla doldurmaz; şu sırayı izler:
      </P>
      <Sat k="1) Ekmek zinciri" v="tüketim + %15" not="Açlık en pahalı hata." />
      <Sat k="2) Ham kaynaklar" v="üretimleri eşitlenir"
        not="Her adımda üretimi en düşük kaynağın en verimli boş tarlasına." />
      <Sat k="3) İşleme binaları" v="ham üretimin taşıdığı kadar"
        not="Girdisi olmayan binaya işçi koymak boşa." />
      <Sat k="4) Askeri binalar" v="kalan varsa" />
    </>
  );
}

function Yiyecek() {
  const z = ekmekZinciri();
  const dg = VILLAGE_DEFS.degirmen?.processes, fr = VILLAGE_DEFS.firin?.processes;
  return (
    <>
      <P>
        Kimse doğrudan tahıl yemez. Tahıl önce una, un ekmeğe dönüşür; köylü de
        asker de <b>ekmek</b> yer. Atlar ise ham tahıl tüketir.
      </P>
      <Akis adimlar={[
        { ad: 'Tahıl', alt: 'tarla', ikon: 'tahil', renk: '#7ae07a' },
        { ad: 'Değirmen', alt: 'un', ikon: 'degirmen', renk: '#7fd4ff' },
        { ad: 'Fırın', alt: 'ekmek', ikon: 'firin', renk: '#e0b357' },
        { ad: 'Köylü + asker', alt: 'tüketim', ikon: 'nufus', renk: '#ff8080' },
      ]} />

      <Baslik icon="firin" renk="#e0b357">Zincir</Baslik>
      <Sat k="Değirmen (1 işçi)" v={`${dg?.inputPerHour} tahıl → ${dg?.outputPerHour} un/sa`} />
      <Sat k="Fırın (1 işçi)" v={`${fr?.inputPerHour} un → ${fr?.outputPerHour} ekmek/sa`} />
      <Sat k="Tam kadro zincir" v={`${say(z.ekmek)} ekmek/sa`} c="#e0b357"
        not={`Değirmen ${z.dKad} + fırın ${z.fKad} işçi. Zincir ${say(z.tahilYer)} tahıl/sa işleyebilir — tarlaların verebileceğinden fazla, yani darboğaz tahıl üretimidir.`} />

      <Baslik icon="nufus" renk="#ff8080">Tüketim</Baslik>
      <Sat k="Köylü" v={`${FOOD_PER_VILLAGER_PER_DAY} ekmek/gün`}
        not={`Saatte ${(FOOD_PER_VILLAGER_PER_DAY / HOURS_PER_DAY).toFixed(3)} — 1.000 köylü ${((1000 * FOOD_PER_VILLAGER_PER_DAY) / HOURS_PER_DAY).toFixed(0)} ekmek/sa.`} />
      <Sat k="Asker" v={`${FOOD_PER_SOLDIER_PER_DAY} ekmek/gün`} c={C.warn}
        not={`Köylünün ${FOOD_PER_SOLDIER_PER_DAY / FOOD_PER_VILLAGER_PER_DAY} katı — 1.000 asker ${((1000 * FOOD_PER_SOLDIER_PER_DAY) / HOURS_PER_DAY).toFixed(0)} ekmek/sa.`} />
      <Sat k="At" v={`${GRAIN_PER_HORSE_PER_DAY} ham tahıl/gün`}
        not="At ekmek değil, doğrudan tahıl yer." />

      <Baslik icon="uyari" renk="#ff8080">Açlık</Baslik>
      <P>
        Ekmek yetmezse köy açlığa düşer: nüfus artışı durur ve düzenli aralıklarla
        kayıp verirsin. Ölüm sırası <b>önce asker, sonra sivil</b>; nüfus 10'un
        altına inmez.
      </P>
      <Kutu baslik="Açlıktan çıkmanın yolu" renk="#7ae07a">
        Tahıl tarlalarına ve değirmen/fırına işçi at. En hızlısı Köylüler
        ekranındaki <b>Boşları dağıt</b> — ilk işi ekmek zincirini kapatmaktır.
      </Kutu>
    </>
  );
}

function Depo() {
  const depolar = ['hammaddeDepo', 'islenmisMalDepo', 'tahilAmbar', 'granary'];
  return (
    <>
      <P>
        Depolar üretimi değil <b>biriktirmeyi</b> sınırlar. Tavan dolduğunda
        fazla üretim boşa gider — işleme binaları bile çıktı için yer yoksa
        girdiyi tüketmeyi bırakır.
      </P>

      <Baslik icon="depo" renk="#c0a8f8">Kapasiteler</Baslik>
      {depolar.map(k => {
        const d = VILLAGE_DEFS[k];
        if (!d) return null;
        return (
          <Sat key={k} k={d.name}
            v={`${say(depoKap(k, 1))} → ${say(depoKap(k, d.maxLevel || 20))}`}
            not={`Lvl 1 → Lvl ${d.maxLevel || 20}. Sakladığı: ${(d.stores || []).map(r => RES_LABEL[r] || r).join(', ')}.`} />
        );
      })}
      <Sat k="Ölçüt" v="Lvl 20 ≈ 1 günlük tam üretim" c="#c0a8f8" />
      <Sat k="Un ve ekmek" v="ORTAK yer paylaşır"
        not="İkisinin toplamı granary kapasitesini aşamaz." />

      <Baslik icon="ekle" renk="#7ae07a">İkinci depo</Baslik>
      <P>
        Dört depo türü de birden fazla kurulabilir — ama <b>mevcut olanların
        hepsi Lvl 20 ve inşaatı bitmiş</b> olmalı. Böylece yarım depo yığıp
        yer israf etmezsin. Kapasiteler toplanır.
      </P>
    </>
  );
}

function Seviye() {
  const grup = {};
  for (const [k, d] of Object.entries(VILLAGE_DEFS)) {
    const lv = d.maxLevel || 20;
    (grup[lv] = grup[lv] || []).push(d.name);
  }
  return (
    <>
      <P>
        Her binanın bir seviye tavanı var; tavana ulaşan bina daha fazla
        yükseltilemez.
      </P>
      <Baslik icon="yukari">Tavanlar</Baslik>
      {Object.entries(grup).sort((a, b) => a[0] - b[0]).map(([lv, isimler]) => (
        <Sat key={lv} k={`Lvl ${lv}`} v={`${isimler.length} bina`}
          not={isimler.sort((a, b) => a.localeCompare(b, 'tr')).join(', ')} />
      ))}
      <Sat k="Üretim alanları" v={`Lvl ${TARLA_MAKS_LV}`} />

      <Baslik icon="bonus" renk="#e0b357">Yükseltme maliyeti</Baslik>
      <P>
        Her binanın <b>her seviyesi</b> için maliyet tanımlı: taban maliyet
        seviye başına bir çarpanla büyür. Bir binanın kendi sayfasında
        seviye seviye maliyet ve süre tablosu var.
      </P>
    </>
  );
}

function Ordu({ unitDefs = {} }) {
  const kisla = Object.entries(unitDefs).filter(([, d]) => d.trainedAt === 'kisla')
    .sort((a, b) => (a[1].minLevel || 1) - (b[1].minLevel || 1));
  const ahir = Object.entries(unitDefs).filter(([, d]) => d.trainedAt === 'ahir')
    .sort((a, b) => (a[1].minLevel || 1) - (b[1].minLevel || 1));
  return (
    <>
      <P>
        Asker eğitmek için üç şey gerekir: <b>boş işçi</b> (askere dönüşür),
        <b> ekipman</b> ve binada <b>eğitmen</b> (o binaya atanmış işçi).
      </P>
      <Kutu baslik="İşçi askere dönüşür" renk="#8fbcff">
        Her asker bir boş işçi tüketir ve o işçi havuza geri dönmez. Ama asker
        sivil tavanına sayılmadığı için yeri boşalır ve nüfus yerini doldurur —
        yiyecek yettiği sürece asker basmaya devam edebilirsin.
      </Kutu>

      <Baslik icon="kilit" renk="#e0b357">Birim seviye kilitleri</Baslik>
      <P>
        İyi asker iyi kışla ister. Her birim, eğitildiği binanın belli bir
        seviyesinde açılır; en iyi birim Lvl 10'da gelir.
      </P>
      {kisla.length > 0 && (
        <>
          <div style={lbl({ fontSize: 8, margin: '8px 0 3px' })}>Kışla</div>
          {kisla.map(([k, d]) => (
            <Sat key={k} k={d.name} v={`Lvl ${d.minLevel || 1}`}
              not={`saldırı ${d.stats?.saldiri} · savunma ${d.stats?.yayaSav}/${d.stats?.atliSav}`} />
          ))}
        </>
      )}
      {ahir.length > 0 && (
        <>
          <div style={lbl({ fontSize: 8, margin: '12px 0 3px' })}>Ahır</div>
          {ahir.map(([k, d]) => (
            <Sat key={k} k={d.name} v={`Lvl ${d.minLevel || 1}`}
              not={`saldırı ${d.stats?.saldiri} · savunma ${d.stats?.yayaSav}/${d.stats?.atliSav}`} />
          ))}
        </>
      )}
    </>
  );
}

function Savunma() {
  const enYuksek = (t) => t[t.length - 1];
  return (
    <>
      <P>
        Savunma yapıları köyün içinde hex kaplamaz: sur köyü çevreler, hendek
        surun dışındadır, kuleler surun altı köşesindedir. Her biri
        <b> yalnız kendi slotuna</b> kurulur.
      </P>

      <Baslik icon="sur" renk="#ff8080">Bonus payları</Baslik>
      <Sat k="Sur (Lvl 20)" v={`%${enYuksek(SUR_BONUS)}`} />
      <Sat k="Hendek (Lvl 20)" v={`%${enYuksek(HENDEK_BONUS)}`} />
      <Sat k={`Kule × ${TOWER_SLOTS} (Lvl 20, tam kadro)`} v={`%${enYuksek(KULE_BONUS)}`} />
      <Sat k="TOPLAM TAVAN" v={`%${DEF_BONUS_CAP}`} c="#ff8080"
        not="Üçünün toplamı bu tavanı aşamaz." />

      <Baslik icon="kule" renk="#ff8080">Kuleler okçuya bağlı</Baslik>
      <P>
        Kule bonusu <b>okçu dolulukla orantılıdır</b>: boş kule hiç katkı
        vermez, tam kadro kulenin seviye bonusunun tamamını verir. Kule
        başına kapasite = seviye × {VILLAGE_DEFS.kule?.workersPerLevel || 4} okçu.
      </P>
      <P>
        Sur ve hendek personel almaz — onların bonusu yalnız seviyeden gelir.
      </P>
    </>
  );
}

function Koyler() {
  const kosk = VILLAGE_DEFS.kosk, saray = VILLAGE_DEFS.saray;
  return (
    <>
      <P>
        Yeni köy kurmak için iki şart birden gerekir: yeterli <b>kültür puanı</b>
        {' '}ve <b>köşk ya da saray</b> seviyesinden gelen köy hakkı. Hangisi
        daha azsa gerçek tavan odur.
      </P>

      <Baslik icon="kultur" renk="#e0b357">Kültür puanı</Baslik>
      <P>
        Her bina her seviyesinde günlük kültür puanı üretir. Taverna'da
        düzenlenen şölenler puanı sıçratır: küçük şölen bu köyün, büyük şölen
        bütün köylerin günlük üretimi kadar puan verir.
      </P>

      <Baslik icon="kosk" renk="#e0b357">Köy hakkı</Baslik>
      <Sat k="Köşk" v={(kosk?.expansionAt || []).map(l => `Lvl ${l}`).join(', ')}
        not={`Her eşik bir köy hakkı. En fazla Lvl ${kosk?.maxLevel || 20}.`} />
      <Sat k="Saray" v={(saray?.expansionAt || []).map(l => `Lvl ${l}`).join(', ')}
        not={`Saray oyuncunun YALNIZ BİR köyünde olabilir. Köşkle aynı köyde bulunamaz.`} />

      <Baslik icon="koy" renk="#f0c860">Merkez köy</Baslik>
      <P>
        Sarayın bulunduğu köyün panelinden <b>“bu köyü merkez yap”</b>
        {' '}denilebilir. Merkezi başka köye taşımak için önce mevcut sarayı
        yıkıp yeni köye saray kurman gerekir.
      </P>
      <P>
        Bütün köyler arka planda çalışmaya devam eder — açık olmayan köy
        donmaz. Üst bardaki köy değiştiriciyle geçiş yaparsın.
      </P>
    </>
  );
}

function Sefer({ unitDefs = {} }) {
  const birimler = Object.entries(unitDefs)
    .filter(([, d]) => (d.stats?.kapasite || 0) > 0)
    .sort((a, b) => (b[1].stats?.kapasite || 0) - (a[1].stats?.kapasite || 0));
  const enIyiTasiyici = birimler[0];
  const izciler = Object.entries(unitDefs)
    .filter(([, d]) => (d.stats?.kapasite || 0) >= 100 && (d.stats?.saldiri || 0) <= 10);
  const hizlar = Object.entries(unitDefs)
    .filter(([, d]) => (d.stats?.hiz || 0) > 0)
    .sort((a, b) => (a[1].stats?.hiz || 0) - (b[1].stats?.hiz || 0));
  const enYavas = hizlar[0], enHizli = hizlar[hizlar.length - 1];

  return (
    <>
      <P>
        Sefer üç modda gider. Fark yalnız <b>ne kadar yağmalanabildiği</b> ve
        kimin gidebildiği; savaş hesabı üçünde de aynı.
      </P>
      <Sat k="Yağma" v={`hedefin stoğunun %${RAID_LOOT_SHARE * 100}`}
        not="Kısa vuruş: köyü boşaltmaz, sık sık tekrarlanır." />
      <Sat k="Tam saldırı" v="stoğun tamamı"
        not="Bütün depoyu hedefler; karşı taraf savunmasını toplamışsa kayıp da büyük olur." />
      <Sat k="Keşif" v="ganimet yok"
        not={izciler.length
          ? `Yalnız yük taşıyan ama savaşmayan birimler: ${izciler.map(([, d]) => d.name).join(', ')}.`
          : 'Yalnız yük taşıyan ama savaşmayan birimler.'} />

      <Baslik icon="ordu" renk="#8fbcff">Ganimet ne kadar</Baslik>
      <Kutu baslik="Taşıyan hayatta kalanlardır" renk="#8fbcff">
        Ganimet, savaştan <b>sağ çıkan</b> birimlerin taşıma kapasitesi
        kadardır — gönderdiğin ordu değil, dönen ordu. Ağır kayıp verdiysen
        hedefin deposu dolu olsa bile az mal getirirsin.
      </Kutu>
      <P>
        İki tavan aynı anda geçerli: <b>taşıma kapasitesi</b> ve <b>moda göre
        yağmalanabilir stok</b>. Hangisi küçükse o belirler — 5.000 kapasiteyle
        gidip hedefte 2.000 bulursan yağmada en fazla 1.000 alırsın.
      </P>
      {enIyiTasiyici && (
        <>
          <div style={lbl({ fontSize: 8, margin: '10px 0 3px' })}>Birim başına kapasite</div>
          {birimler.map(([k, d]) => (
            <Sat key={k} k={d.name} v={`${say(d.stats.kapasite)} birim`} />
          ))}
        </>
      )}
      <P>
        Alınan mal tek kaynağı süpürmez: hedefin deposunda hangi kaynaktan ne
        oranda varsa yük o oranda dağıtılır. {LOOTABLE.length} kaynağın hepsi
        yağmalanabilir — ham maddeler, işlenmiş mallar, un ve ekmek dâhil.
      </P>

      <Baslik icon="depo" renk="#ff6f78">Eve dönüş</Baslik>
      <Kutu baslik="Sığmayan mal çöp olur" renk="#ff6f78">
        Ordu deponda yer olup olmadığına bakmadan yükler. Eve varışta depo
        tavanını aşan kısım <b>kaybolur</b> ve savaş raporunda ne kadarının
        ziyan olduğu yazar. Büyük yağmadan önce depo yükseltmek işin parçası.
      </Kutu>

      <Baslik icon="harita" renk="#7fd4ff">Süre</Baslik>
      <P>
        Hız = <b>saatte kaç hex</b>. Sefer süresini <b>en yavaş birim</b>
        belirler, yani hızlı süvariyi yavaş piyadeyle göndermek ikisini de
        yavaşlatır. Gidiş ve dönüş ayrı ayrı sayılır.
      </P>
      {enYavas && enHizli && (
        <>
          <Sat k={`En yavaş — ${enYavas[1].name}`} v={`${enYavas[1].stats.hiz} hex/sa`} />
          <Sat k={`En hızlı — ${enHizli[1].name}`} v={`${enHizli[1].stats.hiz} hex/sa`} />
          <Sat k="En kısa sefer" v={`${MIN_MARCH_MINUTES} dk`}
            not="Bitişik köye bile en az bu kadar sürer." />
        </>
      )}
      <P>
        Sefer süresi oyun saatine bağlı, gerçek saate değil: dünya hızı
        değişince seferler de aynı oranda hızlanır.
      </P>
    </>
  );
}

/* ── dışa açılan tablo ────────────────────────────────────────────── */

export const RULE_PAGES = {
  dongu:   { name: 'Oyunun döngüsü',      icon: 'bonus',  Comp: Dongu },
  nufus:   { name: 'Nüfus ve büyüme',     icon: 'nufus',  Comp: Nufus },
  isci:    { name: 'İşçi ve üretim',      icon: 'isci',   Comp: Isci },
  yiyecek: { name: 'Yiyecek ve açlık',    icon: 'firin',  Comp: Yiyecek },
  depo:    { name: 'Depolar',             icon: 'depo',   Comp: Depo },
  seviye:  { name: 'Seviye tavanları',    icon: 'yukari', Comp: Seviye },
  ordu:    { name: 'Ordu ve birimler',    icon: 'ordu',   Comp: Ordu },
  sefer:   { name: 'Saldırı ve yağma',    icon: 'savas',  Comp: Sefer },
  savunma: { name: 'Savunma bonusu',      icon: 'sur',    Comp: Savunma },
  koyler:  { name: 'Köyler ve kültür',    icon: 'koy',    Comp: Koyler },
};

export default function RuleDetail({ id, unitDefs = {} }) {
  const sayfa = RULE_PAGES[id];
  if (!sayfa) return null;
  const { Comp } = sayfa;
  return <Comp unitDefs={unitDefs} />;
}
