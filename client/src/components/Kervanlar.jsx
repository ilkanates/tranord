/**
 * YOLDAKİ KERVANLAR — tüccarlarım şu an nerede.
 *
 * İlkan: *"markette yolladığım pazarcıları görebilmem lazım"*.
 *
 * Liste vardı ama YANLIŞ YERDE ve EKSİKTİ:
 *
 *   1) Yalnız "Oyuncu Pazarı" sekmesinde çiziliyordu. Hammadde gönderen
 *      oyuncu gönderiyi yaptıktan sonra kervanını göremiyordu — başka
 *      bir sekmeye geçmesi gerektiğini bilmesinin hiçbir yolu yoktu.
 *
 *   2) Tek kaynak gösteriyordu (`kaynak` + `miktar`). Hediye gönderisi
 *      beş kaynağı birden taşıyabiliyor; o kervanlar listede BOŞ
 *      görünüyordu.
 *
 *   3) Kalan süre ham saniyeydi ("4210 sn"), tüccar sayısı hiç yoktu —
 *      oysa asıl merak edilen "kaç tüccarım bağlı, ne zaman serbest
 *      kalacak".
 *
 * KERVAN GİDİP GERİ DÖNER: 'gidis' fazında mal yolda, 'donus' fazında
 * tüccarlar boş dönüyor ve ancak varınca serbest kalıyorlar (bkz.
 * server/game/pazarYol.js). İki faz ayrı gösteriliyor çünkü oyuncunun
 * sorusu ikisinde farklı: gidişte "mal ne zaman varır", dönüşte
 * "tüccarım ne zaman boşalır".
 */
import { C, FONT, label as lbl, num, fmtTime } from '../theme';
import { RES_COLOR } from '../theme';
import { RES_LABEL } from '../flows';
import Icon from './Icons';

/**
 * Bir kervanın yükü — hem yeni (`yuk` sözlüğü) hem eski (`kaynak` +
 * `miktar`) biçimi okunuyor. Sunucu da aynı ikiliği taşıyor
 * (pazarYol · yukOf); istemcinin de tek okuma noktası olsun.
 */
function yukOf(g) {
  if (g?.yuk && Object.keys(g.yuk).length) return g.yuk;
  return g?.kaynak ? { [g.kaynak]: Math.max(0, Math.floor(g.miktar) || 0) } : {};
}

export default function Kervanlar({ gonderiler = [], tuccarToplam = 0 }) {
  if (!gonderiler.length) return null;

  const bagliTuccar = gonderiler.reduce((s, g) => s + (g.tuccar || 0), 0);

  return (
    <div style={{
      marginBottom: 11, paddingBottom: 10,
      borderBottom: `1px solid ${C.lineSoft || C.line}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <Icon name="tekerlek" size={12} color={C.iceSoft} />
        <span style={lbl({ fontSize: 8, flex: 1 })}>Yoldaki kervanlar</span>
        <span style={num({ fontSize: 10.5, color: C.frost })}>{gonderiler.length}</span>
        <span style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint }}>
          kervan · <span style={num({ fontSize: 9.5, color: C.warn })}>{bagliTuccar}</span>
          {tuccarToplam ? `/${tuccarToplam}` : ''} tüccar bağlı
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {gonderiler.map((g) => {
          const yuk = yukOf(g);
          const kalemler = Object.entries(yuk).filter(([, n]) => n > 0);
          const gidis = g.faz === 'gidis';
          return (
            <div key={g.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              padding: '6px 9px', borderRadius: 6,
              background: 'rgba(8,17,28,0.5)',
              border: `1px solid ${gidis ? `${C.warn}44` : C.lineSoft}`,
            }}>
              <Icon name={gidis ? 'yukari' : 'asagi'} size={11}
                color={gidis ? C.warn : C.iceSoft} strokeWidth={2.3} />

              {/*
                YÜKÜN TAMAMI. Tek kalem gösterip gerisini yutmak, beş
                kaynaklı bir hediyeyi "1500 odun" diye yanlış tanıtırdı.
                Dönüş fazında kervan BOŞ — yükü göstermek "mal hâlâ
                yolda" izlenimi verirdi.
              */}
              {gidis ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  {kalemler.map(([k, n]) => (
                    <span key={k} title={RES_LABEL[k] || k}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Icon name={k} size={16} color={RES_COLOR[k] || C.iceSoft} />
                      <span style={num({ fontSize: 10, color: C.frost })}>
                        {n.toLocaleString('tr-TR')}
                      </span>
                    </span>
                  ))}
                </span>
              ) : (
                <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute }}>
                  boş dönüyor
                </span>
              )}

              <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textDim }}>
                {gidis ? `→ ${g.hedefAd}` : `← ${g.hedefAd}`}
              </span>

              <span style={{ flex: 1, minWidth: 8 }} />

              {g.tuccar > 0 && (
                <span style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint }}>
                  <span style={num({ fontSize: 9.5, color: C.textDim })}>{g.tuccar}</span> tüccar
                </span>
              )}
              <span style={{ textAlign: 'right', minWidth: 58 }}>
                <div style={lbl({ fontSize: 7, letterSpacing: 0.8 })}>
                  {gidis ? 'VARIŞ' : 'SERBEST'}
                </div>
                <div style={num({ fontSize: 11, color: gidis ? C.warn : C.good })}>
                  {fmtTime(Math.max(0, Math.round(g.kalanSn || 0)))}
                </div>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
