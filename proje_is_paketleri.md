# Proje İş Paketleri — Oturum Bazlı Yol Haritası

Her paket tek bir oturumda tamamlanacak şekilde tasarlandı.  
Tamamlanan paketi ✅ ile işaretle, sonraki oturumda sadece o paketi ver.

---

## FAZ 0 — Altyapı

### P0-A · Proje İskeleti
- `server/` klasörü: Node + Express kurulumu, `index.js` giriş noktası
- `client/` klasörü: Vite + React projesi (`npm create vite`)
- `package.json` workspace/monorepo ayarı (ya da ayrı ayrı)
- `.env.example` (PORT, DB_URL, JWT_SECRET)
- `.gitignore`

### P0-B · Socket.io Bağlantısı
- Server tarafı: `socket.io` kurulumu, `connection` / `disconnect` log
- Client tarafı: `socket.io-client`, bağlantı hook'u (`useSocket`)
- Test: client bağlandığında server'da "client connected" mesajı

---

## FAZ 1 — Oyun Mekaniği (Backend)

### P1-A · Tick Motoru
- `tickEngine.js`: `setInterval` bazlı tick döngüsü (örn. 5 sn)
- Tick sayacı, tick bazlı event sistemi (`onTick` callback listesi)
- Tüm oyun state'i memory'de tek obje (`gameState`)

### P1-B · Nüfus Döngüsü
- `population.js`: `currentPop`, `maxPopulation` hesabı
- Tick'te büyüme formülü (örn. `+1` her tick, max dolunca dur)
- Socket event: `population_update` → client'a gönder

### P1-C · Kaynak Tick Sistemi
- `resources.js`: odun, kil, taş, demir, tahıl başlangıç değerleri
- Tick'te üretim miktarı ekleme (işçi atamasız, flat rate)
- Socket event: `resource_update`

### P1-D · Açlık Mekaniği
- Tahıl tüketimi: her tick nüfus × `GRAIN_PER_POP` kadar tahıl azalt
- Tahıl 0 olduğunda nüfus kaybı (her tick `−1` kişi)
- Açlık durumu bayrağı: `isStarving: true/false`

### P1-E · Depo Sistemi — Data
- `storage.js`: `WAREHOUSE` (hammadde), `PROCESSED_STORE` (işlenmiş), `GRANARY` (tahıl)
- Her deponun `capacity` ve `current` değerleri
- Kaynak ekleme fonksiyonu: kapasite aşımını engelle

### P1-F · Lonca Data Tanımları
- `guildDefs.js`: lonca türleri, seviyeleri, bonus değerleri
- Lonca unlock koşulları (örn. belirli bina seviyesi)
- (Bu pakette sadece veri tanımı, UI yok)

### P1-G · Askeri/Savunma Data Tanımları
- `equipmentDefs.js`: EQUIPMENT_DEFS (kılıç, zırh, yay, vb.)
- `unitDefs.js`: UNIT_DEFS (piyade, okçu, süvari, vb.)
- `defenseDefs.js`: SUR_BONUS, HENDEK_BONUS, KULE_BONUS sabitleri

---

## FAZ 1 — Bina Sistemi (Backend)

### P1-H · Hex Grid Motoru
- `hexGrid.js`: Ring 1 (6 hücre) + Ring 2 (12 hücre) koordinat hesabı
- Komşuluk fonksiyonu: hangi hücreler birbirine komşu?
- Hex state: `{ id, ring, occupied, buildingId }`

### P1-I · Üretim Binası CRUD
- `buildings.js`: bina inşa / yükseltme / yıkım fonksiyonları
- Maliyet kontrolü (kaynak yeterli mi?)
- Hex'e bina ata, komşuluk kuralını zorla (Ring 1 dolmadan Ring 2 açılmaz)

### P1-J · Köy Merkezi
- Tower slot: 1 adet tower bina slotu (merkez hücre)
- Unique bina kuralı: aynı türden max 1
- Kule limiti: köyde max 4 kule

### P1-K · İşleme Zinciri — Data + Logic
- `processingChain.js`: Keresteci, Tuğlacı, Taşçı, Demirci, Değirmen, Fırın
- Her bina: girdi kaynaklar → çıktı işlenmiş kaynak, dönüşüm oranı
- Tick'te zincir çalıştır: hammadde var mı? → işlenmiş üret

### P1-L · İşçi Atama Sistemi
- `workers.js`: toplam işçi = nüfusun bir oranı
- İşçi havuzu: `available`, `assigned { buildingId: count }`
- Production binasına işçi atama → üretim çarpanı artar
- Village binasına işçi atama → özel bonus

---

## FAZ 1 — Frontend (UI)

### P1-M · ResourceBar Bileşeni
- Üst bar: odun / kil / taş / demir / tahıl / nüfus ikonları + değerler
- Socket'ten `resource_update` dinle → state güncelle
- Depo doluluk göstergesi (opsiyonel: renk uyarısı)

### P1-N · Hex Grid + BuildingSlot UI
- `HexGrid.jsx`: Ring 1 + Ring 2 hücrelerini SVG veya CSS grid ile çiz
- `BuildingSlot.jsx`: boş hücre tıklanınca BuildMenu aç
- Dolu hücre: bina adı + seviye göster, sağ tık → yıkım seçeneği

### P1-O · BuildMenu Bileşeni
- Seçilen hücreye inşa edilebilecek binaları listele
- Maliyet göster, kaynak yetersizse buton disabled
- İnşa → Socket emit → server onayı → grid güncelle

---

## FAZ 2 — Askeri Sistem

### P2-A · Askere Ekipman Atama
- `militaryManager.js`: asker havuzu (işçilerden ayrılan pay)
- Ekipman atama: her askere `EQUIPMENT_DEFS`'ten item seç
- Birim tipi hesaplama: ekipman kombinasyonuna göre `UNIT_DEFS` eşleştir

### P2-B · Savaş Gücü Formülü + Ordu Özeti
- `combatCalc.js`: saldırı gücü = Σ(asker_gücü × ekipman_çarpanı)
- Savunma gücü = saldırı_gücü + SUR + HENDEK + KULE bonusları
- `ArmyPanel.jsx`: toplam güç, birim dağılımı, ekipman özeti

### P2-C · Saldırı Timer Sistemi
- `attackTimer.js`: saldırı başlatınca geri sayım (configurable süre)
- Timer bitince savaş hesapla, kazanan/kaybeden belirle
- Socket event: `attack_started`, `attack_resolved`

### P2-D · Savaş Raporu
- `battleReport.js`: saldırı/savunma gücü, kayıplar, ele geçirilen kaynak
- `BattleReport.jsx`: modal veya panel olarak göster
- Geçmiş raporlar listesi (son 5 savaş)

### P2-E · Savunma Yapıları Entegrasyonu
- Kale, Sur, Hendek, Kule binalarını hex grid'e ekle
- İnşaat → `defenseDefs` bonusları aktif hale gelir
- Savunma gücü hesabında çarpan uygula

---

## FAZ 3 — Kalıcı Altyapı

### P3-A · PostgreSQL + Migration
- Docker ya da hosted Postgres bağlantısı
- `migrations/`: `villages`, `buildings`, `resources`, `players` tabloları
- `db.js`: bağlantı pool, sorgu helper'ları

### P3-B · Oyuncu Kaydı + JWT Auth
- `POST /register`, `POST /login` endpointleri
- JWT üret, `Authorization: Bearer` doğrulama middleware
- Kayıt sonrası otomatik başlangıç köyü oluştur (default kaynak + bina)

### P3-C · State Kalıcılığı
- Tick bitiminde `gameState` → Postgres'e yaz (upsert)
- Server restart'ta state'i DB'den yükle
- Player bazlı state izolasyonu

### P3-D · Dünya Haritası — Backend
- `worldMap.js`: hex koordinat sistemi, köy yerleşimi
- Komşu köyleri sorgulama (saldırı hedef listesi)
- `GET /map` endpoint: tüm köy konumları + semboller

### P3-E · Dünya Haritası — Frontend
- `WorldMap.jsx`: büyük hex grid, zoom + pan (CSS transform veya SVG viewBox)
- Köy sembolleri (güç seviyesine göre ikon)
- Tıklama → köy profili mini paneli

### P3-F · WebSocket Genişlemesi
- Yeni event'ler: `attack_incoming`, `battle_report`, `alliance_message`
- Kullanıcıya anlık bildirim sistemi (toast / notification panel)
- Odadan (room) çıkma/girme: her player kendi room'unda

### P3-G · İttifak Sistemi
- `alliance.js`: oluşturma, davet gönder/kabul et/reddet
- Diplomasi durumları: `neutral`, `allied`, `war`
- İttifak içi mesajlaşma: `POST /alliance/:id/message`, Socket broadcast

---

## FAZ 4 — Denge + Deployment

### P4-A · Yeni Oyuncu Koruma Süresi
- Kayıt sonrası X saat boyunca saldırılamaz bayrağı
- UI'da koruma sayacı göster
- Koruma biterken bildirim

### P4-B · Ekonomi Dengesi
- Asker beslenme maliyeti: her asker için tahıl tüketimi
- Büyük ordu → hızlı açlık riski (balans testi)
- Config dosyası: tüm sayısal dengeleri tek yerden ayarla (`balanceConfig.js`)

### P4-C · Deployment
- Server → Render.com (Node + Postgres)
- Client → Vercel (Vite build)
- Domain bağlama + SSL (Cloudflare veya Render)
- Otomatik DB backup (günlük cron)

### P4-D · Kapalı Beta Hazırlığı
- Telemetri: kritik event'leri logla (bina inşa, savaş, kayıt)
- Geri bildirim kanalı: in-game "Bug Bildir" butonu → webhook (Discord/email)
- Beta davetiye kodu sistemi (kayıt sırasında kod kontrolü)

---

## Oturum Başlatma Şablonu

Her yeni oturumda şu formatı kullan:

```
Paket: P1-C — Kaynak Tick Sistemi
Bağımlılıklar: P1-A (tick motoru hazır)
Mevcut dosyalar: server/tickEngine.js, server/gameState.js
Hedef: resources.js yaz, tick'e bağla, socket event gönder
```

---

## Bağımlılık Özeti

```
P0-A → P0-B → P1-A → P1-B, P1-C, P1-H
P1-C → P1-D, P1-E, P1-K
P1-H → P1-I → P1-J
P1-B + P1-I → P1-L
P1-L → P2-A
P1-G → P2-A → P2-B → P2-C → P2-D
P2-B + P1-J → P2-E
P1-M, P1-N, P1-O → (paralel, P1-A sonrası)
P3-A → P3-B → P3-C
P3-B → P3-D → P3-E
P3-F → P3-G
P4-A, P4-B → P4-C → P4-D
```
