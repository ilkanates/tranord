# TODO — Savaş Sistemi

Faz 1'de yapılacak: saf bir `server/game/combat.js` modülü (piyade + süvari, sur/hendek bonusu, Normal/Yağma modları, Kirilloid tarzı kayıplar) ve client tarafında **Savaş Simülatörü** sekmesi.

Aşağıdaki maddeler Faz 1 dışında — sıralı olarak sonra ele alınacak.

## Tamamlandı

### Üretim Haritası UI (23 Nisan 2026)
- Hex'lerden üretim yüzdesi (`%{totalPct}`, `R{ring} · %{distPct}`) metinleri kaldırıldı — bonus rozetleri korundu.
- Hover efektleri: sarı kenarlık (`#ffe030`), %10 zoom (`scale(1.1)`) ve sağ üstte canlı bilgi paneli (mesafe verimi, tile bonusu, seviye, işçi, toplam çarpan, üretim/sa).
- Merkez hex'i `merkez.png` texture'ı ile render ediliyor (emoji yerine).
- Merkeze tıklamak artık `AnaBinaPanel` yan panelini değil doğrudan **Köy Merkezi** sekmesini açıyor (`onEnterVillageCenter` callback).
- Kamera 3D eğim: `perspective: 1400px` + `rotateX(20deg)` ile üst açı görünümü (sağa-sola yatma yok).

### Savaş Simülatörü Sekmesi
- `BattleSimulator` componenti client'a eklendi.
- Server'da `combat.js` modülü ile entegre (Kirilloid tarzı kayıp hesabı).

## Ertelendi

### Savunma Kulesi
- `KULE_BONUS` tablosu zaten `villageDefs.js`'te tanımlı (sur'un 2 katı).
- Kuleye asker atama mekaniği eklenecek: atanan askerlere savunma hesabında 2× çarpan uygulanır.
- `kule` binası `maxInstances: 4` — dört kuleye kadar ayrı ayrı asker atanabilmeli.
- UI: Ordu / Köy Merkezi sekmesinde kuleye asker atama arayüzü.

### Kuşatma Birimleri (Koç Başı, Mancınık)
- Normal savaştan **sonra** çalışan ayrı bir faz olarak modellenecek.
- Koç Başı: saldırgan kazanırsa toplam `saldiri × sayı` değerine orantılı olarak sur + hendek seviyelerini düşürür.
- Mancınık: saldırgan, hedef bir binayı seçer; kazanan tarafın mancınık gücüne göre seviye düşürülür.
- Faz 1'de kuşatma birimleri savaş hesabına **hiç dahil edilmez** (simülatörde de seçilemez).

### Sağlık Çadırı
- `saglikCadiri` binası tanımlı, mekaniği yok.
- Savaş sonrası savunan tarafın kayıplarının bir kısmı iyileştirilip geri kazandırılacak.
- Önerilen: `heal_rate = min(0.5, saglikCadiri_level × 0.05)` — Lvl 10'da %50 tavan.
- Sağlık çadırı sadece **savunanı** iyileştirir (saldırgan uzakta olduğu için).

### Moral Bonusu
- Travian mantığı: küçük köy büyük köye saldırırsa saldırgana moral bonusu (fazla ezilmesin diye).
- Formül: `morale = min(1.0, (attacker_pop / defender_pop)^0.2)` gibi, saldırı gücünü çarpan olarak etkiler.
- Köy nüfusu / puan sistemi netleşince eklenir.

### Harita + Gerçek Saldırı Sistemi
- Dünya haritası tamamlanınca köy-köy saldırı altyapısı kurulacak.
- Yürüyüş süresi: mesafe / ordu_hızı (ordunun en yavaş biriminin hızı).
- Ordu gönderme → yoldayken görünür → hedefe varınca `combat.js` çalışır → kalan asker geri döner.
- Ganimet taşıma: kazanan saldırgan, savunanın deposundaki malların bir kısmını asker kapasitesi kadar taşır.
- İkinci dalga saldırılar, geri çağırma, casusluk vb. bu sistemin üstüne eklenir.
