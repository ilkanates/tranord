/**
 * Ordu paneli — tüm eğitilmiş birimlerin dökümü + toplam güç özeti.
 * Props:
 *   army         — { fjordvakt: 5, skjoldvakt: 2, ... }
 *   unitDefs     — TRAINABLE_UNITS (server'dan)
 *   equipmentDefs — ekipman iconları
 */

const CAT_LABEL = {
  piyade:  'Piyade',
  suvari:  'Süvari',
  kusatma: 'Kuşatma'
};

const CAT_COLOR = {
  piyade:  '#6a8858',
  suvari:  '#8a6050',
  kusatma: '#8a7050'
};

export default function ArmyPanel({ army = {}, unitDefs = {}, equipmentDefs = {} }) {
  const entries = Object.entries(army).filter(([, c]) => c > 0);
  const totalCount = entries.reduce((s, [, c]) => s + c, 0);

  // Toplam güç hesapları
  const totals = entries.reduce((acc, [type, count]) => {
    const def = unitDefs[type];
    if (!def) return acc;
    acc.saldiri  += (def.stats.saldiri  || 0) * count;
    acc.yayaSav  += (def.stats.yayaSav  || 0) * count;
    acc.atliSav  += (def.stats.atliSav  || 0) * count;
    acc.kapasite += (def.stats.kapasite || 0) * count;
    return acc;
  }, { saldiri: 0, yayaSav: 0, atliSav: 0, kapasite: 0 });

  // Kategoriye göre gruplama
  const byCategory = entries.reduce((acc, [type, count]) => {
    const def = unitDefs[type];
    if (!def) return acc;
    const cat = def.category || 'diger';
    (acc[cat] ||= []).push({ type, count, def });
    return acc;
  }, {});

  return (
    <div style={{ padding: 20, color: '#e8d4a0', overflow: 'auto', flex: 1 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ color: '#c8a44a', fontSize: 18, letterSpacing: 3, marginBottom: 16 }}>
          ⚔ ORDU
        </div>

        {/* Özet kartı */}
        <div style={{
          background: '#14100a', border: '1px solid #3a2808',
          borderRadius: 4, padding: 14, marginBottom: 20,
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10
        }}>
          <SummaryCell label="Toplam Asker" value={totalCount} color="#c8a44a" />
          <SummaryCell label="Toplam Saldırı" value={totals.saldiri} color="#c86060" />
          <SummaryCell label="Yaya Savunma" value={totals.yayaSav} color="#6a8858" />
          <SummaryCell label="Atlı Savunma" value={totals.atliSav} color="#6a8058" />
          <SummaryCell label="Taşıma Kap." value={totals.kapasite} color="#7080a0" />
        </div>

        {totalCount === 0 ? (
          <div style={{
            background: '#14100a', border: '1px solid #3a2808',
            borderRadius: 4, padding: 30, textAlign: 'center',
            color: '#5a5040', fontStyle: 'italic'
          }}>
            Henüz asker yok. Köy Merkezi sekmesinden bir Kışla veya Ahır inşa et,
            sonra ekipman üretip asker eğit.
          </div>
        ) : (
          Object.entries(byCategory).map(([cat, units]) => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{
                color: CAT_COLOR[cat] || '#c8a44a',
                fontSize: 13, letterSpacing: 2, marginBottom: 8,
                borderBottom: `1px solid ${CAT_COLOR[cat] || '#3a2808'}`,
                paddingBottom: 4
              }}>
                {CAT_LABEL[cat] || cat.toUpperCase()} — {units.reduce((s, u) => s + u.count, 0)} asker
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                {units.map(({ type, count, def }) => (
                  <div key={type} style={{
                    background: '#14100a', border: '1px solid #3a2808',
                    borderRadius: 4, padding: 10
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 22 }}>
                        {cat === 'suvari' ? '🐎' : cat === 'kusatma' ? '🏗️' : '🛡️'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#e8d4a0', fontSize: 13, fontWeight: 600 }}>
                          {def.name}
                        </div>
                        <div style={{ color: '#7a8878', fontSize: 10 }}>
                          {(def.equipment || []).map(eq => {
                            const eqDef = equipmentDefs[eq];
                            return eqDef ? `${eqDef.icon}${eqDef.name}` : eq;
                          }).join(' + ')}
                        </div>
                      </div>
                      <div style={{
                        background: '#2a1a08', border: '1px solid #4a2a08',
                        borderRadius: 3, padding: '4px 10px',
                        color: '#c8a44a', fontSize: 16, fontWeight: 'bold'
                      }}>
                        × {count}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: '#7080a0', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span>⚔ Saldırı: <strong style={{ color: '#c86060' }}>{def.stats.saldiri}</strong></span>
                      <span>🛡 Yaya: <strong style={{ color: '#8ab870' }}>{def.stats.yayaSav}</strong></span>
                      <span>🛡 Atlı: <strong style={{ color: '#8ab870' }}>{def.stats.atliSav}</strong></span>
                      <span>⚡ Hız: <strong style={{ color: '#c8a44a' }}>{def.stats.hiz}</strong></span>
                      <span>📦 Kap: <strong>{def.stats.kapasite}</strong></span>
                    </div>
                    <div style={{ fontSize: 10, color: '#5a5040', marginTop: 4 }}>
                      Birlik toplamı: ⚔ {def.stats.saldiri * count} · 🛡 {def.stats.yayaSav * count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SummaryCell({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: '#7a8878', fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color, fontSize: 22, fontWeight: 'bold' }}>
        {value}
      </div>
    </div>
  );
}
