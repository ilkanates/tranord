import { useState } from 'react';
import { C, FONT, panel, label as lbl, num } from '../theme';
import { EQ_LABEL } from '../flows';
import { unitImage } from '../data/unitImages';
import UnitDetail from './UnitDetail';
import Icon from './Icons';

const CAT_LABEL = { piyade: 'Piyade', suvari: 'Süvari', kusatma: 'Kuşatma', diger: 'Diğer' };
const CAT_COLOR = { piyade: '#7fd4ff', suvari: '#a99cf0', kusatma: '#d9c069', diger: C.textDim };
const CAT_ICON  = { piyade: 'kalkan', suvari: 'at', kusatma: 'atolye', diger: 'ordu' };

function Summary({ label, value, color, icon }) {
  return (
    <div style={panel({
      padding: '10px 12px', background: 'rgba(11,23,37,0.78)',
      display: 'flex', alignItems: 'center', gap: 10,
    })}>
      <Icon name={icon} size={20} color={color} />
      <div style={{ minWidth: 0 }}>
        <div style={lbl({ fontSize: 8.5 })}>{label}</div>
        <div style={num({ fontSize: 21, color, lineHeight: 1.15, fontWeight: 500 })}>
          {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
        </div>
      </div>
    </div>
  );
}

function StatChip({ icon, label, value, color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} title={label}>
      <Icon name={icon} size={12} color={color} />
      <span style={num({ fontSize: 10.5, color: C.text })}>{value}</span>
    </span>
  );
}

export default function ArmyPanel({ army = {}, unitDefs = {}, equipmentDefs = {} }) {
  const [detail, setDetail] = useState(null);
  const entries = Object.entries(army).filter(([, c]) => c > 0);
  const total = entries.reduce((s, [, c]) => s + c, 0);

  const t = entries.reduce((acc, [type, count]) => {
    const d = unitDefs[type];
    if (!d) return acc;
    acc.saldiri  += (d.stats.saldiri  || 0) * count;
    acc.yayaSav  += (d.stats.yayaSav  || 0) * count;
    acc.atliSav  += (d.stats.atliSav  || 0) * count;
    acc.kapasite += (d.stats.kapasite || 0) * count;
    return acc;
  }, { saldiri: 0, yayaSav: 0, atliSav: 0, kapasite: 0 });

  const byCat = entries.reduce((acc, [type, count]) => {
    const d = unitDefs[type];
    if (!d) return acc;
    (acc[d.category || 'diger'] ||= []).push({ type, count, def: d });
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px 24px 32px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18 }}>
          <Icon name="ordu" size={26} color={C.ice} strokeWidth={1.4} />
          <div>
            <h2 style={{ fontFamily: FONT.head, fontSize: 24, letterSpacing: 5, color: C.frost }}>ORDU</h2>
            <div style={lbl({ fontSize: 8.5, letterSpacing: 2 })}>
              {total > 0 ? `${total} asker · ${Object.keys(byCat).length} sınıf` : 'henüz asker yok'}
            </div>
          </div>
        </div>

        {/* Özet */}
        <div style={{
          display: 'grid', gap: 9, marginBottom: 22,
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        }}>
          <Summary label="Toplam asker"  value={total}        color={C.frost}  icon="nufus" />
          <Summary label="Toplam saldırı" value={t.saldiri}   color={C.danger} icon="kilic" />
          <Summary label="Yaya savunma"  value={t.yayaSav}    color={C.good}   icon="kalkan" />
          <Summary label="Atlı savunma"  value={t.atliSav}    color={C.good}   icon="mizrak" />
          <Summary label="Taşıma kap."   value={t.kapasite}   color={C.iceSoft} icon="depo" />
        </div>

        {total === 0 ? (
          <div style={panel({
            padding: 34, textAlign: 'center', background: 'rgba(11,23,37,0.72)',
          })}>
            <Icon name="kisla" size={40} color={C.lineBright} strokeWidth={1.1} />
            <div style={{ fontFamily: FONT.head, fontSize: 17, color: C.textDim, letterSpacing: 2, marginTop: 12 }}>
              Ordu boş
            </div>
            <div style={{
              fontFamily: FONT.ui, fontSize: 11, color: C.textMute,
              marginTop: 7, lineHeight: 1.6, maxWidth: 420, marginInline: 'auto',
            }}>
              Köy Merkezi’nden bir <strong style={{ color: C.textDim }}>Kışla</strong> ya da
              {' '}<strong style={{ color: C.textDim }}>Ahır</strong> kur, ardından
              {' '}<strong style={{ color: C.textDim }}>Silahçı/Zırhçı</strong>’da ekipman üretip asker eğit.
              Her asker 1 boş işçi tüketir.
            </div>
          </div>
        ) : (
          Object.entries(byCat).map(([cat, units]) => {
            const color = CAT_COLOR[cat] || C.textDim;
            return (
              <div key={cat} style={{ marginBottom: 22 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  paddingBottom: 6, marginBottom: 10,
                  borderBottom: `1px solid ${color}44`,
                }}>
                  <Icon name={CAT_ICON[cat] || 'ordu'} size={15} color={color} />
                  <span style={{ fontFamily: FONT.head, fontSize: 15, letterSpacing: 2.5, color }}>
                    {(CAT_LABEL[cat] || cat).toUpperCase()}
                  </span>
                  <span style={num({ fontSize: 11, color: C.textFaint })}>
                    {units.reduce((s, u) => s + u.count, 0)} asker
                  </span>
                </div>

                {/* 4 sütun — bir ekranda 4 üst / 4 alt */}
                <div style={{
                  display: 'grid', gap: 10,
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                }}>
                  {units.map(({ type, count, def }) => {
                    const img = unitImage(type);
                    return (
                    <div key={type} className="tn-card"
                      onClick={() => setDetail(type)} title="Detay için tıkla"
                      style={panel({
                        padding: 0, overflow: 'hidden', cursor: 'pointer',
                        background: 'rgba(11,23,37,0.78)',
                        border: `1px solid ${color}33`,
                      })}>
                      {/* Birim görseli — asker sayısı üstte rozet */}
                      <div style={{ position: 'relative', height: 168, background: '#0b1420' }}>
                        {img ? (
                          <img src={img} alt={def.name || type} draggable={false}
                            style={{
                              width: '100%', height: '100%', display: 'block',
                              objectFit: 'cover', objectPosition: '50% 16%',
                            }} />
                        ) : (
                          <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
                            <Icon name={CAT_ICON[cat] || 'ordu'} size={38}
                              color={C.lineBright} strokeWidth={1.2} />
                          </div>
                        )}
                        <div style={{
                          position: 'absolute', left: 0, right: 0, bottom: 0,
                          padding: '20px 10px 7px',
                          background: 'linear-gradient(180deg, transparent, rgba(4,9,15,0.94))',
                        }}>
                          <div style={{
                            fontFamily: FONT.head, fontSize: 15, fontWeight: 600,
                            color: C.frost, letterSpacing: 0.6,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>{def.name || type}</div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                            {(def.equipment || []).map(eq => (
                              <span key={eq} title={EQ_LABEL[eq] || equipmentDefs[eq]?.name || eq}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                <Icon name={eq} size={10} color={C.textFaint} />
                              </span>
                            ))}
                          </div>
                        </div>
                        <div style={{
                          position: 'absolute', top: 7, right: 7,
                          padding: '3px 9px', borderRadius: 5,
                          background: 'rgba(4,9,15,0.8)', border: `1px solid ${color}66`,
                        }}>
                          <span style={num({ fontSize: 16, color, fontWeight: 500 })}>{count}</span>
                        </div>
                      </div>

                      <div style={{ padding: '0 11px 11px' }}>
                      <div style={{
                        display: 'flex', gap: 10, flexWrap: 'wrap',
                        paddingTop: 8, borderTop: `1px solid ${C.lineSoft}`,
                      }}>
                        <StatChip icon="kilic"  label="Saldırı"       value={def.stats.saldiri}  color={C.danger} />
                        <StatChip icon="kalkan" label="Yaya savunma"  value={def.stats.yayaSav}  color={C.good} />
                        <StatChip icon="mizrak" label="Atlı savunma"  value={def.stats.atliSav}  color={C.good} />
                        <StatChip icon="hiz"    label="Hız"           value={def.stats.hiz}      color={C.iceDeep} />
                        <StatChip icon="depo"   label="Taşıma"        value={def.stats.kapasite} color={C.textDim} />
                      </div>

                      <div style={{
                        marginTop: 7, fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute,
                      }}>
                        Birlik toplamı: saldırı{' '}
                        <span style={num({ color: C.textDim })}>{(def.stats.saldiri * count).toLocaleString('tr-TR')}</span>
                        {' '}· savunma{' '}
                        <span style={num({ color: C.textDim })}>{(def.stats.yayaSav * count).toLocaleString('tr-TR')}</span>
                      </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {detail && (
        <UnitDetail type={detail} def={unitDefs[detail]} count={army[detail]}
          equipmentDefs={equipmentDefs} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}
