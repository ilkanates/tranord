/**
 * FestivalPanel — Taverna'da şölen düzenleme.
 *
 * Şölen bitince kültür puanı yazılır (sunucu tarafı), yani yeni köy kurma
 * hakkını hızlandırmanın tek aktif yolu. Küçük şölen bu köyün, büyük şölen
 * bütün köylerin günlük CP üretimi kadar puan verir; büyük şölen ayrıca
 * ×2 katsayılı ve daha yüksek taverna seviyesi istiyor.
 *
 * Aynı anda TEK şölen olabilir — süren varsa geri sayım gösterilir ve
 * düğmeler kapatılır.
 */
import { C, FONT, btn, label as lbl, num, fmtTime } from '../theme';
import { RES_LABEL } from '../flows';
import Icon from './Icons';

function CostRow({ cost, resources }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '5px 0 6px' }}>
      {Object.entries(cost || {}).map(([r, amt]) => {
        const have = resources[r] || 0;
        const ok = have >= amt;
        return (
          <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
            title={`${RES_LABEL[r] || r}: ${Math.floor(have)} / ${amt}`}>
            <Icon name={r} size={11} />
            <span style={num({ fontSize: 9.5, color: ok ? C.frost : C.danger })}>{amt}</span>
          </span>
        );
      })}
    </div>
  );
}

export default function FestivalPanel({
  level = 0, culture = null, festival = null, festivalDefs = {},
  resources = {}, hourSeconds = 3600, worldSpeed = 1, onStartFestival,
}) {
  const cpDay = culture?.cpPerDay || 0;
  // Oyun saati → gerçek saniye (tek çevirici zaten flows'ta; burada süre
  // yalnız bilgi amaçlı gösteriliyor)
  const realSecs = (gameHours) =>
    Math.ceil(gameHours * hourSeconds / Math.max(0.01, worldSpeed));

  const kinds = ['kucuk', 'buyuk'].filter(k => festivalDefs[k]);

  return (
    <div style={{
      background: 'rgba(8,17,28,0.55)',
      border: `1px solid ${C.lineSoft}`,
      borderRadius: 7, padding: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Icon name="solen" size={13} color={C.iceDeep} />
        <span style={lbl({ fontSize: 8.5, letterSpacing: 1.5, flex: 1 })}>Şölen</span>
        {culture && (
          <span style={num({ fontSize: 9.5, color: C.textFaint })}>
            {Math.floor(culture.points || 0)} CP
          </span>
        )}
      </div>
      {level < 1 && (
        <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.warn, marginBottom: 7 }}>
          Taverna henüz kurulmadı.
        </div>
      )}

      {festival ? (
        <div style={{
          padding: '8px 10px', borderRadius: 5,
          background: 'rgba(224,179,87,0.10)', border: '1px solid rgba(224,179,87,0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="solen" size={13} color={C.warn} className="tn-pulse" />
            <span style={{ fontFamily: FONT.ui, fontSize: 11, color: C.frost, flex: 1 }}>
              {festival.label} sürüyor
            </span>
            <span style={num({ fontSize: 12, color: C.warn })}>
              {fmtTime(festival.timeLeft)}
            </span>
          </div>
          <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, marginTop: 4 }}>
            Bitince kültür puanı yazılacak. Aynı anda tek şölen düzenlenebilir.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {kinds.map(kind => {
            const f = festivalDefs[kind];
            const levelOk = level >= f.minLevel;
            const afford = Object.entries(f.cost || {})
              .every(([r, a]) => (resources[r] || 0) >= a);
            const ready = levelOk && afford;
            const kazanc = Math.round(cpDay * (f.multiplier || 1));
            return (
              <div key={kind} style={{
                padding: '7px 9px', borderRadius: 5,
                background: 'rgba(8,17,28,0.6)',
                border: `1px solid ${ready ? 'rgba(224,179,87,0.35)' : C.lineSoft}`,
                opacity: levelOk ? 1 : 0.55,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontFamily: FONT.ui, fontSize: 11, fontWeight: 500, color: C.text, flex: 1 }}>
                    {f.label}
                  </span>
                  <span style={num({ fontSize: 9.5, color: C.textFaint })}>
                    {fmtTime(realSecs(f.hours))}
                  </span>
                </div>

                <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textDim, marginTop: 2 }}>
                  {f.scope === 'tum' ? 'Bütün köylerin' : 'Bu köyün'} günlük üretimi
                  {f.multiplier > 1 ? ` × ${f.multiplier}` : ''}
                  {' → '}
                  <span style={num({ color: C.good })}>+{kazanc} CP</span>
                </div>

                <CostRow cost={f.cost} resources={resources} />

                {!levelOk ? (
                  <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.warn }}>
                    Taverna Lvl {f.minLevel} gerekiyor (şu an {level})
                  </div>
                ) : (
                  <button type="button" disabled={!ready}
                    onClick={() => onStartFestival?.(kind)}
                    style={btn(ready ? 'primary' : 'ghost', {
                      width: '100%', padding: '5px 0', fontSize: 10,
                      opacity: ready ? 1 : 0.5,
                      cursor: ready ? 'pointer' : 'not-allowed',
                    })}>
                    {afford ? 'ŞÖLEN DÜZENLE' : 'KAYNAK YETMİYOR'}
                  </button>
                )}
              </div>
            );
          })}

          {cpDay === 0 && (
            <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, lineHeight: 1.5 }}>
              Köyün henüz kültür puanı üretmiyor; şölen de sıfır puan verir.
              Bina kurup yükselttikçe üretim artar.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
