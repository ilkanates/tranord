/**
 * PARA GÖRSELLERİ — gümüş ve altın sikke.
 *
 * Eşya görsellerinden (itemArt.js) AYRI: para bir eşya değil, kesenin
 * içeriği. Aynı dosyaya koysaydık "ITEM_IMAGE" haritasında eşya olmayan
 * iki anahtar dolaşır ve eşya listesini gezen her yerde ayıklanmaları
 * gerekirdi.
 *
 * İKİ YERDE KULLANILIYOR: üst bardaki kese rozeti ve macera raporundaki
 * ödül satırı (İlkan: *"coinleri üst menüde ve macerada bulursa büyük
 * resim olarak raporda göster"*). Tek kaynak — iki yere ayrı ayrı
 * import etseydik biri değişince öteki eskirdi.
 */
import gumusImg from '../assets/items/gumusSikke.jpg';
import altinImg from '../assets/items/altinSikke.jpg';

export const PARA_GORSEL = {
  gumus: gumusImg,
  altin: altinImg,
};
