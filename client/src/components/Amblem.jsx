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

export default function Amblem({ type, size = 28, color = 'currentColor',
                                 opacity = 1, title, style }) {
  const src = unitEmblem(type);
  if (!src) return null;
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
