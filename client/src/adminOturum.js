/**
 * Admin taklidi — token saklama.
 *
 * Bileşenden AYRI dosyada: bileşen dosyasından sabit/işlev dışa açmak
 * hızlı yenilemeyi (fast refresh) bozuyor ve lint bunu haklı olarak
 * hata sayıyor.
 *
 * GERİ DÖNÜŞ YOLU ŞART. Başka bir hesaba girmek kendi hesabını
 * kaybetmek olmamalı: adminin token'ı burada bekliyor ve "kendi
 * hesabıma dön" onu geri yüklüyor. Yoksa admin her taklitten sonra
 * yeniden şifre girmek zorunda kalırdı.
 *
 * localStorage her ortamda çalışmıyor (gizli sekme, site verisi kapalı);
 * her erişim try/catch içinde ve okunamayan durum "taklit yok" sayılıyor
 * — güvenli taraf.
 */
export const ADMIN_TOKEN_KEY = 'tn.adminToken';

/** Şu an başka bir oyuncunun hesabında mıyım? */
export function adminTakliteMi() {
  try { return !!localStorage.getItem(ADMIN_TOKEN_KEY); } catch { return false; }
}

/** Kendi token'ını sakla (taklide girmeden ÖNCE çağrılıyor) */
export function adminTokeniSakla(token) {
  try { localStorage.setItem(ADMIN_TOKEN_KEY, token); } catch { /* gizli sekme */ }
}

/** Saklanan admin token'ını al ve sil — yoksa null */
export function adminTokeniGeriAl() {
  try {
    const t = localStorage.getItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    return t || null;
  } catch { return null; }
}
