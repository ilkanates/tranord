# TraNord — Hetzner CX23 kurulumu

Tek sunucu. nginx istemciyi servis eder, `/auth` ve `/socket.io` isteklerini
aynı makinedeki Node sunucusuna geçirir, PostgreSQL de aynı makinede ve dışa
kapalı. Tek origin olduğu için CORS diye bir mesele yok; Vercel/Cloudflare
gerekmiyor.

```
tarayıcı ──► nginx :80 ──/────────────► client/dist (statik dosyalar)
                        ──/auth───────► node 127.0.0.1:3311
                        ──/socket.io──► node 127.0.0.1:3311 (websocket)
                                              └──► postgres 127.0.0.1:5432
```

CX23: 2 paylaşımlı vCPU · 4 GB RAM · 40 GB NVMe · 20 TB trafik · ~€3.49–4.49/ay.
Ölçülen yük: tick işi saniyede ~1.8 ms (bir çekirdeğin %0.2'si), oyuncu başına
ağ trafiği 0.30 KB/s — 100 oyuncu ayda ~78 GB, 20 TB'ın yanında yok.

---

## 1. SSH anahtarı (Windows'ta, bir kez)

PowerShell:

```powershell
ssh-keygen -t ed25519 -C "ilkan-windows"
type $env:USERPROFILE\.ssh\id_ed25519.pub
```

Çıkan satırı kopyala — Hetzner'de sunucu oluştururken yapıştıracaksın.

## 2. Sunucuyu oluştur

console.hetzner.cloud → New Project ("tranord") → Add Server:

| Alan | Seçim |
|---|---|
| Location | Nuremberg veya Falkenstein (Türkiye'ye en yakın gecikme) |
| Image | **Ubuntu 24.04** |
| Type | Shared vCPU · **CX23** |
| Networking | IPv4 + IPv6 açık |
| SSH keys | 1. adımdaki anahtarı ekle |
| Firewall | boş bırak (sunucuda ufw kuruluyor) |
| Backups | isteğe bağlı (+%20; gecelik pg_dump zaten kurulacak) |
| Name | tranord-1 |

Oluştuktan sonra IP adresini not al.

## 3. Kurulum betiğini yükle ve çalıştır

Repo klasöründe, PowerShell:

```powershell
scp deploy\kurulum.sh root@<IP>:/root/
ssh root@<IP> "bash /root/kurulum.sh git@github.com:ilkanates/tranord.git"
```

**İlk çalıştırma bir deploy key yazdırıp duracak** — repo private olduğu için
sunucunun kendi okuma anahtarı olmalı. Yazdırdığı `ssh-ed25519 ...` satırını:

GitHub → tranord → Settings → **Deploy keys** → Add deploy key
(başlık `hetzner-cx23`, **"Allow write access" işaretlenmeden**)

Sonra aynı komutu bir daha çalıştır. Bu kez sonuna kadar gider:
Node 22, PostgreSQL, nginx, systemd servisi, ufw (yalnız 22/80/443),
gecelik yedek ve istemci derlemesi.

Betik sırları kendisi üretir (`openssl rand`) ve `/etc/tranord.env` içine
`chmod 600` ile yazar: veritabanı şifresi ve `JWT_SECRET`. Sen de görmek
zorunda değilsin, ben de görmüyorum.

## 4. Aç

`http://<IP>` → giriş ekranı → **hesap aç** → oyun.

> HTTP üzerinden şifreler düz metin gider. Kendi testin için sorun değil;
> gerçek oyuncu almadan önce alan adı + sertifika şart (aşağıda).

---

## Günlük işler

| İş | Komut |
|---|---|
| Kodu güncelle | `ssh root@<IP> "bash /opt/tranord/deploy/guncelle.sh"` |
| Kayıtları izle | `ssh root@<IP> "journalctl -u tranord -f"` |
| Servisi yeniden başlat | `ssh root@<IP> "systemctl restart tranord"` |
| Elle yedek | `ssh root@<IP> "tranord-yedek"` |
| Yedekler | `/var/backups/tranord` (gecelik 03:15, 14 gün) |
| Dünya durumu | `curl http://<IP>:3311/` sunucuda: `curl 127.0.0.1:3311/` |

`guncelle.sh` derleme başarısız olursa servise dokunmaz — bozuk sürüm canlıya
çıkmaz.

## Alan adı alınca

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d alanadi.com -d www.alanadi.com
nano /etc/tranord.env      # CLIENT_URL=https://alanadi.com
systemctl restart tranord
```

DNS tarafında tek iş: `A` kaydı → sunucu IP'si.

## Bilinmesi gerekenler

- **Dünya 7/24 akar.** 1× hızda 1 oyun saati = 1 gerçek saat; sunucu kapalı
  kalırsa açılışta her köy kendi kayıt zamanından telafi edilir (en fazla 72
  oyun saati). Yani yeniden başlatma veri kaybı değil.
- **İlk açılış ~11 saniye** sürer: 200 NPC köyü gerçek motorla tohumlanır.
  Sonraki açılışlar ~50 ms (kayıtlı dünya yüklenir).
- **Diske yazma** olaya bağlı: NPC'ler yalnız yapısal değişiklikte kaydedilir
  (~3.8 MB/gün), oyuncu köyleri 30 saniyede bir.
- **Node yalnız 127.0.0.1'de dinler**; dışarıya sadece nginx bakar.
