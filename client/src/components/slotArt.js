/**
 * BOŞ KUŞAM SLOTLARININ SİMGELERİ.
 *
 * İlkan: *"bunları kahramanın slotlarındaki simgeler olarak kullan.
 * item yoksa bunlar gözüksün."*
 *
 * Görseller ALFA MASKESİ olarak duruyor: siyah şekil opak, zemin
 * saydam, RGB tamamen beyaz. Dosyayı `<img>` gibi çizmiyoruz —
 * CSS `mask-image` ile kullanıyoruz ve rengi slotun kendisi veriyor.
 *
 * NEDEN MASKE, DÜZ RESİM DEĞİL: boş slot duruma göre sönükleşiyor,
 * seçiliyken vurgulanıyor, sürüklenen eşya uymuyorsa soluyor. Düz bir
 * PNG sabit renkli olurdu ve bu üç durumun hiçbirini gösteremezdi —
 * eski çizgi ikonları `color` ile boyanıyordu, o davranışı kaybetmek
 * geriye gitmek olurdu.
 *
 * Kaynak görseller 1024+ px siyah-beyaz siluetlerdi; kırpılıp 96 px'e
 * indirildi (dosya başına 2,6–6,9 KB). 96 px, 48 px'lik bir simgeye
 * iki kat çözünürlük demek — yüksek yoğunluklu ekranda da net.
 */
import atMask from '../assets/slots/at.png';
import bileklikMask from '../assets/slots/bileklik.png';
import zirhMask from '../assets/slots/zirh.png';
import migferMask from '../assets/slots/migfer.png';
import ayakkabiMask from '../assets/slots/ayakkabi.png';
import pantolonMask from '../assets/slots/pantolon.png';
import solElMask from '../assets/slots/solEl.png';
import sagElMask from '../assets/slots/sagEl.png';

/**
 * Slot anahtarı → maske görseli.
 *
 * `kolye` BURADA YOK — görseli henüz üretilmedi. Eksik slot sessizce
 * eski çizgi ikonuna düşüyor (bkz. HeroPanel · SlotSimgesi), yani
 * listeyi tek tek doldurmak arayüzü hiçbir aşamada bozmuyor.
 */
export const SLOT_MASK = {
  at: atMask,
  bileklik: bileklikMask,
  zirh: zirhMask,
  migfer: migferMask,
  ayakkabi: ayakkabiMask,
  pantolon: pantolonMask,
  solEl: solElMask,
  sagEl: sagElMask,
};
