/**
 * YİYECEK UYARISI — açlık BAŞLAMADAN önce.
 *
 * Eskiden oyuncu açlığı ancak başladıktan sonra öğreniyordu: kaynak
 * rayındaki küçük kırmızı "AÇLIK" rozeti, o da nüfus kaybı çoktan
 * başlamışken. Ölçüldü: yeni bir köy hiçbir şey yapılmazsa 36 oyun
 * saatinde açlığa giriyor, 45. saatte ilk köylüsünü kaybediyor — yani
 * uyarılabileceği ~3,5 saatlik bir pencere vardı ve boş geçiyordu.
 *
 * İKİ KADEME:
 *   SARI  akış eksi ama stok var → "X sonra bitecek"
 *   KIRMIZI stok bitti, nüfus eriyor → "her X saatte bir köylü"
 *
 * SEBEP ve ÇÖZÜM de yazıyor. "Aç kalıyorsun" tek başına işe yaramıyor;
 * oyuncu ne yapacağını bilmiyordu. Sebebi sunucu söylüyor (zincirin akış
 * yönünde: tahıl → değirmen → fırın → ordu), metni burada.
 *
 * Üst barın hemen altında ve HER sekmede duruyor: açlık tek bir ekranın
 * sorunu değil, köyün tamamını durduruyor.
 */
import { C, FONT, num } from '../theme';
import { useViewport } from '../responsive';
import { gameHoursToRealSeconds } from '../flows';
import Icon from './Icons';

/** Oyun saati → okunur gerçek süre ("2 sa 10 dk") */
function sure(oyunSaati, hourSeconds, speed) {
  const sn = gameHoursToRealSeconds(oyunSaati, hourSeconds, speed);
  if (!Number.isFinite(sn)) return '—';
  const dk = Math.round(sn / 60);
  if (dk < 60) return `${Math.max(1, dk)} dakika`;
  const sa = Math.floor(dk / 60);
  const kalan = dk % 60;
  return kalan ? `${sa} saat ${kalan} dk` : `${sa} saat`;
}

/**
 * SEBEP → NE YAPMALI.
 * Sıra zincirin akış yönünde; ilk kopan halka söyleniyor, hepsi değil.
 */
const COZUM = {
  tahilIsci: {
    baslik: 'Tahıl tarlalarında işçi yok',
    ne: 'Haritadan bir tahıl tarlasına tıkla ve işçi ata. Tarla kendi kendine üretmez.',
  },
  degirmen: {
    baslik: 'Değirmen çalışmıyor',
    ne: 'Değirmen kur ya da içine işçi ata — tahıl una dönüşmeden ekmek çıkmaz.',
  },
  firin: {
    baslik: 'Fırın çalışmıyor',
    ne: 'Fırın kur ya da içine işçi ata. Ekmek en verimli yiyecek: '
      + 'ham tahılla beslenmek 2,5 katı kaynak yiyor.',
  },
  ordu: {
    baslik: 'Ordun köyünün besleyebileceğinden büyük',
    ne: 'Asker köylünün iki katı yer. Tahıl tarlalarını yükseltip işçi ekle '
      + 'ya da orduyu küçük tut.',
  },
};

export default function FoodWarning({ yiyecek, hourSeconds = 3600, worldSpeed = 1 }) {
  const vp = useViewport();
  if (!yiyecek) return null;

  const { netSaat = 0, stokSaat = null, aclik = false, sebep = null,
    uretim = 0, tuketim = 0 } = yiyecek;

  // Akış artıda ve açlık yoksa söylenecek bir şey yok
  if (!aclik && netSaat >= 0) return null;

  const kirmizi = aclik;
  const cozum = COZUM[sebep] || COZUM.ordu;

  return (
    <div style={{
      flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: vp.mobile ? 8 : 11,
      padding: vp.mobile ? '7px 10px' : '8px 16px',
      background: kirmizi ? 'rgba(74,18,24,0.55)' : 'rgba(58,44,14,0.5)',
      borderBottom: `1px solid ${kirmizi ? C.dangerDim : 'rgba(242,187,96,0.38)'}`,
    }}>
      <Icon name="uyari" size={vp.mobile ? 14 : 16}
        color={kirmizi ? C.danger : C.warn}
        className={kirmizi ? 'tn-pulse' : undefined}
        style={{ flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT.ui, fontSize: vp.mobile ? 10.5 : 11.5, fontWeight: 600,
          color: kirmizi ? '#ffb8bd' : '#ffd98a',
        }}>
          {kirmizi
            ? 'KÖYÜN AÇ — nüfusun eriyor'
            : `Ekmek bitiyor: ${sure(stokSaat ?? 0, hourSeconds, worldSpeed)} sonra köyün aç kalacak`}
        </div>
        <div style={{
          fontFamily: FONT.ui, fontSize: vp.mobile ? 9 : 10, color: C.textDim,
          marginTop: 2, lineHeight: 1.5,
          /* Telefonda tek satırda kesilsin — şerit ekranı yemesin */
          ...(vp.mobile
            ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
            : {}),
        }}>
          <b style={{ color: kirmizi ? '#ffb8bd' : '#ffd98a' }}>{cozum.baslik}.</b>{' '}
          {cozum.ne}
        </div>
      </div>

      {/* Sayılar: ne kadar üretiyorum, ne kadar yiyorum — masaüstünde */}
      {!vp.mobile && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={num({ fontSize: 13, color: kirmizi ? C.danger : C.warn, lineHeight: 1.1 })}>
            {netSaat > 0 ? '+' : ''}{netSaat.toFixed(1)}
            <span style={{ fontSize: 9, color: C.textMute }}> ekmek/sa</span>
          </div>
          <div style={num({ fontSize: 9, color: C.textMute, marginTop: 1 })}>
            üretim {uretim.toFixed(1)} · tüketim {tuketim.toFixed(1)}
          </div>
        </div>
      )}
    </div>
  );
}
