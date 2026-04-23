# TRANORD — Proje Context Dosyası
> Bu dosyayı yeni session'ın başına yapıştır. Hiçbir dosya okumadan projeyi anlayabilirsin.

---

## Proje Nedir?
Tarayıcı tabanlı, gerçek zamanlı köy yönetimi + strateji oyunu.  
Stack: **Node.js + Express + Socket.io** (server) · **Vite + React** (client)  
Test modu: 1 gerçek saniye = 1 oyun saati. Tick her 1 saniyede çalışır.

---

## Klasör Yapısı

```
tranord/
├── server/
│   ├── index.js               ← Ana sunucu (Express + Socket.io + tüm event'ler + tick döngüsü)
│   ├── game/
│   │   ├── tick.js            ← Oyun motoru (üretim, işleme, ekipman kuyruğu, depo tavanı)
│   │   └── villageState.js    ← Başlangıç state (kaynaklar, binalar, hex slotları)
│   ├── data/
│   │   ├── index.js           ← Merkezi export noktası (buradan import et)
│   │   ├── buildingDefs.js    ← Üretim alanı bina tanımları (odun/kil/taş/demir/tahıl)
│   │   ├── villageDefs.js     ← Köy merkezi bina tanımları + SUR/HENDEK/KULE bonusları
│   │   ├── militaryDefs.js    ← EQUIPMENT_DEFS, UNIT_DEFS, BASE_STATS, EQUIPMENT_RULES
│   │   └── productionDefs.js  ← Üretim alanı ek tanımları (buildingDefs ile örtüşür)
│   └── package.json
├── client/
│   └── src/
│       ├── App.jsx                        ← Socket bağlantısı, tab nav, tüm emit fonksiyonları
│       ├── components/
│       │   ├── ResourceBar.jsx            ← Üst kaynak barı (ham/işlenmiş/granary/nüfus)
│       │   ├── ProductionArea.jsx         ← Hex grid üretim alanı (Ring 1 + Ring 2)
│       │   ├── VillageCenter.jsx          ← Köy merkezi hex grid + işleme binaları
│       │   ├── BuildMenu.jsx              ← Bina inşa menüsü
│       │   ├── BuildingSlot.jsx           ← Tek hex slot bileşeni
│       │   └── EquipmentPanel.jsx         ← Ekipman üretim kuyruğu paneli
│       └── data/
│           ├── buildingDefs.js            ← Client-side üretim bina tanımları (server ile aynı mantık)
│           └── villageDefs.js             ← Client-side köy bina tanımları
└── proje_is_paketleri.md                  ← İş paketi listesi (32 paket, session bazlı)
```

---

## Bağımlılık Haritası

```
villageState.js   →  index.js (import)
tick.js           →  data/index.js (BUILDING_DEFS, VILLAGE_DEFS, EQUIPMENT_DEFS)
index.js (server) →  villageState.js + tick.js + data/index.js

data/index.js     →  buildingDefs.js + villageDefs.js + militaryDefs.js

App.jsx           →  socket.io-client
App.jsx           →  ResourceBar + ProductionArea + VillageCenter
ProductionArea.jsx →  BuildMenu + BuildingSlot
VillageCenter.jsx  →  BuildMenu + BuildingSlot + EquipmentPanel
```

**Socket Event Akışı:**
```
Client emit → server/index.js handler → villageState güncelle
→ io.emit('village_update', buildPayload()) → App.jsx setVillage()
→ tüm component'ler re-render
```

---

## Oyun Mekaniği Özeti

### Kaynaklar
**Ham maddeler:** odun, kil, taş, demir, tahıl  
**İşlenmiş:** kereste, tugla, yontmaTas, demirKulce  
**Yiyecek:** un, ekmek  
**Askeri envanter:** kilic, mizrak, kalkan, zirh, at

### Hex Grid Sistemi
İki ayrı hex grid vardır:

**1. Üretim Alanı** (hammadde üretim binaları):
```
Ring 1 (6 slot): '1,0','1,-1','0,-1','-1,0','-1,1','0,1'
Ring 2 (12 slot): '2,0','2,-1','2,-2','1,-2','0,-2','-1,-1','-2,0','-2,1','-2,2','-1,2','0,2','1,1'
Merkez: '0,0' = Ana Bina (upgrade edilebilir, üretim slotunu açar)
Kural: Ring 2 slotu ancak komşusu dolu ya da '0,0' ise aktif olur.
Kapasite: Lvl1=6slot, her Ana Bina seviyesi +1, max 16
```

**2. Köy Merkezi** (işleme/depo/askeri/nüfus binaları):
```
Merkez: '0,0' = Ana Bina (sabit, Lvl1 başlar)
Tower Slots: '0,-2','2,-1','0,2','-2,1' (sadece kule inşa edilebilir)
Kule limiti: max 4 kule
Unique binalar: aynı türden yalnızca 1 adet (ev hariç)
```

### Tick Motoru (her 1 saniye)
1. Üretim tile'ları → ham madde üret (işçi × baseProductionPerWorker)
2. Köy binaları → işleme zinciri (ham → işlenmiş, oran: 8 odun → 6 kereste vb.)
3. Depo tavanı uygula (kapasite aşımını kes)
4. Bina inşaat/yükseltme timer'larını kontrol et (bitenleri tamamla)
5. Ekipman üretim kuyruklarını işle (maliyeti düş, envantere ekle)
6. Her 10 tick'te nüfus +1 (max dolmadıysa)
7. io.emit('village_update', buildPayload()) → client güncelle

### İşleme Zinciri (VILLAGE_DEFS.processes)
```
keresteci: odun × 8/sa → kereste × 6/sa (per işçi)
tuglaci:   kil  × 8/sa → tugla   × 6/sa
tasci:     taş  × 8/sa → yontmaTas × 6/sa
demirci:   demir× 5/sa → demirKulce × 4/sa
degirmen:  tahıl× 10/sa → un × 8/sa
firin:     un   × 8/sa → ekmek × 6/sa
```

### Nüfus & İşçi
```
maxPopulation = 50 + Σ(ev_binaları × 50 × level)
population artışı: her 10 tick +1 kişi (max dolmadıysa)
freeWorkers: toplam işçi havuzu, üretim/inşaat/işleme atamaları düşülür
```

### Depo Sistemi
```
Varsayılan kapasiteler: ham maddeler 300, işlenmiş 200, granary 150
hammaddeDepo: +1000/seviye (odun/kil/taş/demir)
islenmisMalDepo: +800/seviye (kereste/tugla/yontmaTas/demirKulce)
tahilAmbar: +2000/seviye (tahıl)
granary: +500/seviye (un + ekmek, ortak kapasite havuzu)
```

---

## Bina Tanımı Yapıları

### buildingDefs.js (Üretim Alanı Binaları)
```js
{
  odun: {
    name, icon, color,
    baseProductionPerWorker: 2,  // 1 işçi → 2/sa
    workersPerLevel: 5,           // lvl1=max5, lvl2=max10
    upgradeBaseWork: 20,
    upgradeMultiplier: 1.8,
    levels: [{ cost:{...}, sureSaat:X, workers:N }, ...]  // index = seviye-1
  },
  // aynı yapı: kil, tas, demir, tahil
}
```

### villageDefs.js (Köy Merkezi Binaları)
```js
{
  anaBina:    { unique:true, maxLevel:11, upgradeCostBase:{...}, upgradeCostMultiplier:1.7 },
  keresteci:  { unique:true, processes:{ input:'odun', inputPerHour:8, output:'kereste', outputPerHour:6 }, workersPerLevel:3 },
  ev:         { unique:false, populationPerLevel:50, maxLevel:5 },
  hammaddeDepo: { stores:['odun','kil','tas','demir'], baseCapacity:1000, capacityPerLevel:500 },
  granary:    { stores:['un','ekmek'], baseCapacity:500, capacityPerLevel:250 },
  loncaDemir: { unique:true, maxLevel:5, bonusPerLevel:5, affects:'demir' },
  sur:        { unique:true, maxLevel:20, bonusTable:SUR_BONUS },
  hendek:     { unique:true, maxLevel:20, bonusTable:HENDEK_BONUS },
  kule:       { unique:false, maxLevel:20, maxInstances:4, bonusTable:KULE_BONUS }
}
```

### militaryDefs.js (Askeri)
```js
BASE_STATS = { saldiri:0, yayaSav:10, atliSav:10, hiz:10, kapasite:60 }

EQUIPMENT_DEFS = {
  kilic:  { cost:{ demirKulce:10, kereste:5 },  productionHours:2,   producedAt:'silahci' },
  mizrak: { cost:{ demirKulce:5, kereste:10 },  productionHours:1,   producedAt:'silahci' },
  kalkan: { cost:{ kereste:15, demirKulce:5 },  productionHours:1.5, producedAt:'zirh'    },
  zirh:   { cost:{ demirKulce:20, kereste:5 },  productionHours:3,   producedAt:'zirh'    },
  at:     { cost:{ tahil:40, kereste:10 },       productionHours:4,   producedAt:'ahir'    }
}

EQUIPMENT_BY_BUILDING = {
  silahci: ['kilic','mizrak'],
  zirh:    ['kalkan','zirh'],
  ahir:    ['at']
}

UNIT_DEFS = { fjordvakt, skjoldvakt, nordkamper, ulvSavasci, spydvakt, isbjorn,
              kuzeyIzcisi, demirAtli, skjoldreiter, buzSuvarisi, jernridder, vindreiter, stormridder, ... }
// Her unit: { category, trainedAt, equipment:[], stats:{saldiri,yayaSav,atliSav,hiz,kapasite} }

SUR_BONUS    = [0, 3.0, 6.1, ...] // index = seviye
HENDEK_BONUS = SUR_BONUS / 2
KULE_BONUS   = SUR_BONUS × 2
```

---

## villageState.js — Başlangıç State Yapısı
```js
{
  population: 50, maxPopulation: 50, freeWorkers: 50, tickCount: 0,
  resources: { odun:200, kil:150, tas:150, demir:50, tahil:300,
               kereste:0, tugla:0, yontmaTas:0, demirKulce:0, un:0, ekmek:0 },
  equipment:  { kilic:0, mizrak:0, kalkan:0, zirh:0, at:0 },
  equipmentQueues: { silahci:[], zirh:[], ahir:[] },
  nextOrderId: 1,

  productionTiles: {
    '1,0':{ type:'odun', level:1, workers:0, upgrading:false, ... },
    // Ring1'deki 6 slot baştan dolu
  },
  villageBuildings: {
    '0,0': { type:'anaBina',   level:1 },
    '1,0': { type:'keresteci', level:1, workers:0 },
    // keresteci, tuglaci, tasci, demirci, degirmen, firin baştan Lvl1
  },
  TOWER_SLOTS: Set(['0,-2','2,-1','0,2','-2,1']),
  PRODUCTION_RING_1: [...], PRODUCTION_RING_2: [...], PRODUCTION_SLOTS: Set(...)
}
```

---

## Socket Events (server/index.js)

| Event (client → server) | Ne Yapar |
|---|---|
| `build_production` | `{ slotKey, type, workers }` → üretim tile inşa |
| `upgrade_production` | `{ slotKey, workers }` → tile yükselt |
| `demolish_production` | `{ slotKey }` → tile yık |
| `assign_production_workers` | `{ slotKey, workers }` → üretim işçi ata |
| `build_village` | `{ slotKey, buildingType, workers }` → köy binası inşa |
| `upgrade_village` | `{ slotKey, workers }` → köy binası yükselt |
| `demolish_village` | `{ slotKey }` → köy binası yık |
| `assign_village_workers` | `{ slotKey, workers }` → işleme işçi ata |
| `queue_equipment` | `{ buildingType, equipmentType, quantity }` → ekipman kuyruğa ekle |
| `cancel_equipment_order` | `{ buildingType, orderId }` → sipariş iptal |

| Event (server → client) | Ne Taşır |
|---|---|
| `village_update` | Tüm state snapshot (buildPayload()) — her tick + her action sonrası |

---

## Tamamlanan / Tamamlanmayan İşler

### ✅ Bitti (Faz 1 büyük bölümü)
- Node + Express + Socket.io + Vite/React kurulumu
- Tick motoru (1sn interval)
- Nüfus döngüsü (10 tick'te +1, maxPop hesabı)
- Kaynak tick sistemi (5 ham madde)
- İşçi atama (üretim + köy binaları)
- Hex grid (Ring1/Ring2, komşuluk kuralı)
- Üretim binası inşa/yükseltme/yıkım
- Köy merkezi (tower slot, unique bina, kule max 4)
- İşleme zinciri (keresteci→tuğlacı→taşçı→demirci→değirmen→fırın)
- Depo sistemi (kapasiteler, granary)
- Lonca data tanımları (loncaDemir, loncaOdun, loncaTas, loncaKil, loncaTahil)
- Askeri/savunma data defs (EQUIPMENT_DEFS, UNIT_DEFS, SUR/HENDEK/KULE_BONUS)
- ResourceBar + BuildMenu + BuildingSlot + ProductionArea + VillageCenter UI
- Ekipman üretim kuyruğu (queue, cancel, envanter)

### ❌ Henüz Yok
- **Açlık mekaniği** — tahıl=0 → her tick nüfus kaybı (tick.js'e eklenecek)
- **Lonca bonus uygulaması** — data var ama tick'te üretim çarpanı yok
- **Faz 2:** Askere ekipman atama, birim tipi hesaplama, savaş gücü formülü, saldırı timer, savaş raporu, savunma çarpanı entegrasyonu
- **Faz 3:** PostgreSQL + migration, JWT auth, kalıcı state, dünya haritası, ittifak sistemi
- **Faz 4:** Denge, deployment, kapalı beta

---

## Önemli Kurallar / Gotcha'lar
- `server/index.js` çok büyüdü — yeni event eklerken dosyaya append et, refactor bekliyor
- `buildPayload()` her event'te tüm state'i serialize eder (performans ileride sorun olabilir)
- Client-side `data/` klasöründeki dosyalar server-side ile senkronize tutulmalı (ayrı dosyalar)
- Test modunda `productionHours` değeri saniyeye direkt eşlenir (örn. 2h = 2sn)
- Üretim tile ve köy binası **ayrı hex grid**'dir — ikisi birbirini ezmez
- `freeWorkers` global sayaç — inşaat/yükseltme/üretim atama hepsi aynı havuzdan düşer
