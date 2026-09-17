/**
 * Amblem — birim / ekipman amblemini çizer.
 *
 * Görsel `<img>` olarak DEĞİL, CSS maskesi olarak basılıyor: dosyada renk yok
 * (beyaz siluet + alfa), renk `color` ile veriliyor. Böylece aynı dosya menüde
 * soluk gri, raporda tehlike kırmızısı, seçiliyken buz mavisi olabiliyor —
 * 23 dosyayı üç kez üretmeye gerek kalmıyor.
 *
 * Amblemi olmayan bir anahtar `null` döner; çağıran taraf eski çizgi ikona
 * düşer, arayüz hiçbir aşamada boş kutu göstermez.
 */
import { unitEmblem } from '../data/unitEmblems';
import Icon from './Icons';

/**
 * @param {string} [yedekIkon] Amblem yoksa çizilecek çizgi ikon adı.
 *   Varsayılan `type`'ın kendisi: ekipman anahtarları (kilic, zirh…)
 *   zaten ikon adıyla aynı. `null` verilirse hiçbir şey çizilmiyor.
 */
export default function Amblem({ type, size = 28, color = 'currentColor',
                                 opacity = 1, title, style,
                                 yedekIkon = undefined, strokeWidth = 1.6 }) {
  const src = unitEmblem(type);
  if (!src) {
    /*
      AMBLEM YOKSA ÇİZGİ İKON. Eskiden `null` dönüyordu ve çağıran
      tarafın kendi yedeğini düşünmesi gerekiyordu; kimi düşündü kimi
      düşünmedi, ekranlar birbirinden ayrıştı (İlkan: "yarısı farklı
      yarısı farklı"). Karar artık burada, tek yerde.
    */
    const ad = yedekIkon === undefined ? type : yedekIkon;
    if (!ad) return null;
    return <Icon name={ad} size={size} color={color} strokeWidth={strokeWidth}
      title={title} style={style} />;
  }
  return (
    <span
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      title={title}
      style={{
        display: 'inline-block',
        width: size, height: size, flexShrink: 0,
        backgroundColor: color,
        opacity,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        ...style,
      }}
    />
  );
}
