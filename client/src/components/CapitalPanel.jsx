/**
 * CapitalPanel — Saray içindeki "bu köyü merkez yap" denetimi.
 *
 * Saray oyuncu çapında TEK: hangi köyde kuruluysa merkez oraya taşınabiliyor.
 * Başka köye taşımak için oradaki saray yıkılıp yenisi kurulmalı — bu panel
 * de o yüzden yalnız sarayda görünüyor.
 *
 * Merkez henüz sadece bir işaret (taç + saray hakkı). Merkeze özel etkiler
 * (fetih koruması, sınırsız tarla vb.) ayrıca kararlaştırılacak — bkz. TODO.
 */
import { C, FONT, btn, label as lbl } from '../theme';
import Icon from './Icons';

function Crown({ size = 11, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M3 18h18l-1.6-9-4.4 3.6L12 5l-3 7.6L4.6 9 3 18Z" />
    </svg>
  );
}

export default function CapitalPanel({
  level = 0, building = false,
  isCapital = false, capitalName = null, villageName = 'bu köy',
  onSetCapital,
}) {
  const hazir = level >= 1 && !building;

  return (
    <div style={{
      background: 'rgba(8,17,28,0.55)',
      border: `1px solid ${C.lineSoft}`,
      borderRadius: 7, padding: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Crown size={13} color="#f0c860" />
        <span style={lbl({ fontSize: 8.5, letterSpacing: 1.5, flex: 1 })}>Merkez köy</span>
        {isCapital && (
          <span style={{ fontFamily: FONT.ui, fontSize: 9, color: '#f0c860' }}>
            burası merkez
          </span>
        )}
      </div>

      {isCapital ? (
        <div style={{
          padding: '7px 9px', borderRadius: 5,
          background: 'rgba(240,200,96,0.09)', border: '1px solid rgba(240,200,96,0.32)',
          fontFamily: FONT.ui, fontSize: 9.5, color: '#e8dcb0', lineHeight: 1.5,
        }}>
          <b>{villageName}</b> zaten merkez köyün. Merkezi taşımak için buradaki
          sarayı yıkıp başka köye saray kurman gerekiyor.
        </div>
      ) : (
        <>
          <div style={{
            fontFamily: FONT.ui, fontSize: 9.5, color: C.textDim,
            lineHeight: 1.5, marginBottom: 7,
          }}>
            Merkez şu an <b>{capitalName || 'başka bir köy'}</b>. Saray burada
            olduğu için merkezi bu köye taşıyabilirsin; eski merkez normal köy olur.
          </div>

          {!hazir && (
            <div style={{
              fontFamily: FONT.ui, fontSize: 9.5, color: C.warn, marginBottom: 7,
            }}>
              {building ? 'Saray inşaatı bitmeden merkez taşınamaz.' : 'Saray henüz kurulmadı.'}
            </div>
          )}

          <button type="button" disabled={!hazir}
            onClick={() => onSetCapital?.()}
            style={btn(hazir ? 'primary' : 'ghost', {
              width: '100%', padding: '6px 0', fontSize: 10,
              opacity: hazir ? 1 : 0.5, cursor: hazir ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            })}>
            <Icon name="koy" size={12} color={hazir ? C.frost : C.textMute} />
            BU KÖYÜ MERKEZ YAP
          </button>
        </>
      )}
    </div>
  );
}
