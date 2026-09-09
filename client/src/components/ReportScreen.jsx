/**
 * RAPORLAR EKRANI — kendi sekmesi.
 *
 * Ordu sekmesindeki daralmış liste yerine tam ekran: solda rapor listesi,
 * sağda seçilen raporun ayrıntısı. Filtreler: hepsi / saldırılarım /
 * bana gelenler / keşifler.
 *
 * Okundu takibi localStorage'da (`tranord_reports_read`): hangi raporu
 * okuduğunun bilgisi tarayıcıya ait, sunucuda yeri yok. Okuma/yazma
 * try/catch içinde — gizli pencerede erişim hata atabiliyor.
 */
import { useEffect, useMemo, useState } from 'react';
import { C, FONT, panel, btn, label as lbl, num, short } from '../theme';
import { RES_LABEL } from '../flows';
import { unitImage } from '../data/unitImages';
import Icon from './Icons';

const MODE_LABEL = { raid: 'Yağma', attack: 'Tam saldırı', scout: 'Keşif' };
const MODE_ICON  = { raid: 'depo', attack: 'kilic', scout: 'harita' };

const sum = (o) => Object.values(o || {}).reduce((a, b) => a + (b || 0), 0);

/**
 * OKUNDU TAKİBİ — okunan raporların ID'leri.
 *
 * Eskiden "en son bakılan zaman" tutuluyordu; ekranı bir kez açmak bütün
 * raporları okunmuş sayıyordu. Artık okunmuş sayılmak için rapora TIKLAMAK
 * gerekiyor, "okuduğum rapor" ile "gelmiş rapor" ayrışıyor.
 *
 * Ayrıştırılmış küme modül düzeyinde önbelleklenir: sayaç her tick'te
 * (saniyede bir) çağrılıyor, her seferinde JSON çözmek gereksiz.
 */
const READ_KEY = 'tranord_reports_read';
const MAX_READ_IDS = 400;
let _readCache = null;

export function readIds() {
  if (_readCache) return _readCache;
  try {
    const arr = JSON.parse(localStorage.getItem(READ_KEY) || '[]');
    _readCache = new Set(Array.isArray(arr) ? arr : []);
  } catch { _readCache = new Set(); }
  return _readCache;
}
function markRead(id) {
  const set = new Set(readIds());
  set.add(id);
  const trimmed = [...set].slice(-MAX_READ_IDS);
  _readCache = new Set(trimmed);
  try { localStorage.setItem(READ_KEY, JSON.stringify(trimmed)); } catch { /* yok say */ }
  return _readCache;
}
/** Üst bardaki sayaç için: okunmamış rapor sayısı */
export function unseenCount(reports = []) {
  const set = readIds();
  return reports.filter(r => !set.has(r.id)).length;
}

const FILTERS = [
  { key: 'all',    label: 'HEPSİ' },
  { key: 'out',    label: 'SALDIRILARIM' },
  { key: 'in',     label: 'BANA GELENLER' },
  { key: 'scout',  label: 'KEŞİFLER' },
];

/**
 * Sabit saat. "3 dk önce" gibi göreli zaman KULLANILMIYOR: payload saniyede
 * bir geldiği için o yazı sürekli değişiyor ve liste huzursuz görünüyordu.
 * Aynı günse yalnız saat, değilse gün + saat.
 */
function fmtWhen(at) {
  if (!at) return '';
  const d = new Date(at);
  const hm = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const sameDay = d.toDateString() === new Date().toDateString();
  if (sameDay) return hm;
  return `${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} ${hm}`;
}

/** Rapor bir kazanç mı kayıp mı — saldıran/savunan tarafına göre */
function verdictOf(r) {
  if (r.outcome === 'kesif') return { txt: 'keşif tamam', col: C.ice, won: null };
  if (r.outcome === 'hedef_yok') return { txt: 'hedef bulunamadı', col: C.textMute, won: null };
  const won = r.dir === 'in' ? r.winner === 'defender' : r.winner === 'attacker';
  return { txt: won ? 'kazandın' : 'kaybettin', col: won ? C.good : C.danger, won };
}

function titleOf(r) {
  if (r.dir === 'in') return `${r.fromName} köyüne saldırdı`;
  if (r.outcome === 'kesif') return `${r.toName} keşfedildi`;
  return `${r.toName} — ${MODE_LABEL[r.mode] || r.mode}`;
}

/**
 * Sol liste satırı.
 *
 * OKUNMAMIŞ: dolu renk, kalın başlık, sol kenarda sonuç rengi şeridi, YENİ
 * etiketi. OKUNMUŞ: soluk zemin, kısık yazı, şerit gri. Ayrım tek bir noktaya
 * (küçük bir nokta) bırakılmayacak kadar önemli — listeye bakınca hangisini
 * okuduğun bir bakışta görünmeli.
 */
function Row({ r, active, unread, onClick }) {
  const v = verdictOf(r);
  const accent = unread ? v.col : C.line;
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
      padding: '9px 10px', borderRadius: 6,
      background: active
        ? 'rgba(143,220,255,0.12)'
        : unread ? 'rgba(14,28,44,0.72)' : 'rgba(8,15,23,0.34)',
      border: `1px solid ${active ? C.lineBright : unread ? `${v.col}3d` : C.lineSoft}`,
      borderLeft: `3px solid ${active ? C.ice : accent}`,
      opacity: unread || active ? 1 : 0.62,
      transition: 'opacity .14s, background .14s',
    }}>
      <Icon name={r.dir === 'in' ? 'kalkan' : MODE_ICON[r.mode] || 'kilic'}
        size={15} color={unread ? v.col : C.textMute} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT.ui, fontSize: 11.5,
          color: unread ? C.frost : C.textFaint,
          fontWeight: unread ? 600 : 400,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{titleOf(r)}</div>
        <div style={{
          fontFamily: FONT.ui, fontSize: 9.5, marginTop: 1,
          color: unread ? v.col : C.textMute,
        }}>
          {v.txt}
          {r.outcome === 'savas' && (
            <span style={{ color: C.textMute }}>
              {' · '}kaybım {sum(r.myLosses)}
              {sum(r.loot) > 0 ? ` · ${r.dir === 'in' ? 'çalınan' : 'ganimet'} ${short(sum(r.loot))}` : ''}
            </span>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        {unread && (
          <span style={{
            padding: '1px 5px', borderRadius: 3,
            background: `${v.col}26`, border: `1px solid ${v.col}66`,
            fontFamily: FONT.ui, fontSize: 7.5, letterSpacing: 0.9,
            fontWeight: 700, color: v.col,
          }}>YENİ</span>
        )}
        <div style={{
          fontFamily: FONT.num, fontSize: 10, whiteSpace: 'nowrap',
          color: unread ? C.textDim : C.textMute,
        }}>{fmtWhen(r.at)}</div>
      </div>
    </div>
  );
}

// ── Sağ ayrıntı ──────────────────────────────────────────────────────
function UnitGrid({ units, unitDefs, color }) {
  const items = Object.entries(units || {}).filter(([, n]) => n > 0);
  if (!items.length) {
    return <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textMute }}>yok</div>;
  }
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
      {items.map(([u, n]) => {
        const img = unitImage(u);
        return (
          <div key={u} title={unitDefs[u]?.name || u} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 8px 4px 4px', borderRadius: 5,
            background: 'rgba(8,17,28,0.6)', border: `1px solid ${color}33`,
          }}>
            <div style={{ width: 20, height: 28, borderRadius: 3, overflow: 'hidden', background: '#0b1420' }}>
              {img && <img src={img} alt="" draggable={false} style={{
                width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%',
              }} />}
            </div>
            <div>
              <div style={num({ fontSize: 13, color, lineHeight: 1.1 })}>{n}</div>
              <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute }}>
                {unitDefs[u]?.name || u}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResGrid({ res, color }) {
  const items = Object.entries(res || {}).filter(([, n]) => n > 0);
  if (!items.length) {
    return <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textMute }}>yok</div>;
  }
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
      {items.map(([r, n]) => (
        <div key={r} style={{
          padding: '4px 9px', borderRadius: 5,
          background: 'rgba(8,17,28,0.6)', border: `1px solid ${color}33`,
        }}>
          <div style={num({ fontSize: 13, color, lineHeight: 1.1 })}>{short(n)}</div>
          <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute }}>
            {RES_LABEL[r] || r}
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={lbl({ fontSize: 8, letterSpacing: 1.4, marginBottom: 5 })}>{title}</div>
      {children}
    </div>
  );
}

function Detail({ r, unitDefs }) {
  if (!r) {
    return (
      <div style={{
        height: '100%', display: 'grid', placeItems: 'center',
        fontFamily: FONT.ui, fontSize: 11, color: C.textMute,
      }}>
        Soldan bir rapor seç.
      </div>
    );
  }
  const v = verdictOf(r);
  const inc = r.dir === 'in';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      <div>
        <div style={{
          fontFamily: FONT.head, fontSize: 22, fontWeight: 600, letterSpacing: 0.8,
          color: C.frost, lineHeight: 1.15,
        }}>{titleOf(r)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 4 }}>
          <span style={{
            padding: '2px 9px', borderRadius: 4,
            background: `${v.col}1f`, border: `1px solid ${v.col}55`,
            fontFamily: FONT.ui, fontSize: 9.5, letterSpacing: 1.1, color: v.col, fontWeight: 600,
          }}>{v.txt.toUpperCase()}</span>
          <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute }}>
            {MODE_LABEL[r.mode] || r.mode} · {fmtWhen(r.at)}
            {r.toKey ? ` · ${r.toKey}` : r.fromKey ? ` · ${r.fromKey}` : ''}
          </span>
        </div>
      </div>

      {r.outcome === 'savas' && (
        <>
          {/* Kuvvet karşılaştırması */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>SALDIRI GÜCÜ</div>
              <div style={num({ fontSize: 18, color: inc ? C.danger : C.frost })}>
                {short(r.attackTotal)}
              </div>
            </div>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>SAVUNMA GÜCÜ</div>
              <div style={num({ fontSize: 18, color: inc ? C.good : C.frost })}>
                {short(r.defenseTotal)}
              </div>
            </div>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>SUR + HENDEK</div>
              <div style={num({ fontSize: 18, color: r.wallBonusPct > 0 ? C.warn : C.textMute })}>
                {r.wallBonusPct > 0 ? `%${r.wallBonusPct}` : '—'}
              </div>
            </div>
          </div>

          {!inc && r.sent && (
            <Section title="GÖNDERDİĞİM ORDU">
              <UnitGrid units={r.sent} unitDefs={unitDefs} color={C.frost} />
            </Section>
          )}
          {inc && r.attackerUnits && (
            <Section title="SALDIRAN ORDU">
              <UnitGrid units={r.attackerUnits} unitDefs={unitDefs} color={C.danger} />
            </Section>
          )}

          <Section title="KAYBIM">
            <UnitGrid units={r.myLosses} unitDefs={unitDefs} color={C.danger} />
          </Section>

          <Section title={inc ? 'SALDIRANIN KAYBI' : 'KARŞI TARAFIN KAYBI'}>
            <UnitGrid units={r.theirLosses} unitDefs={unitDefs} color={C.good} />
          </Section>

          {!inc && r.survivors && (
            <Section title="DÖNEN ASKERLER">
              <UnitGrid units={r.survivors} unitDefs={unitDefs} color={C.iceSoft} />
            </Section>
          )}

          <Section title={inc ? 'ÇALINAN KAYNAK' : 'GANİMET'}>
            <ResGrid res={r.loot} color={inc ? C.danger : C.warn} />
          </Section>

          {r.lootLost && sum(r.lootLost) > 0 && (
            <div style={panel({
              padding: '9px 11px', background: 'rgba(242,187,96,0.09)',
              border: `1px solid ${C.warn}44`,
            })}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Icon name="uyari" size={14} color={C.warn} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim, lineHeight: 1.6 }}>
                  Deponun yeri yetmediği için <b style={{ color: C.warn }}>{short(sum(r.lootLost))}</b>
                  {' '}ganimet kayboldu. Depo/ambar yükseltmek yağmayı doğrudan kârlı hâle getirir.
                  <div style={{ marginTop: 5 }}><ResGrid res={r.lootLost} color={C.warn} /></div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {r.outcome === 'kesif' && r.intel && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>ORDU</div>
              <div style={num({ fontSize: 18, color: C.frost })}>{short(r.intel.armyTotal)}</div>
            </div>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>SUR / HENDEK</div>
              <div style={num({ fontSize: 18, color: C.warn })}>
                {r.intel.surLevel} / {r.intel.hendekLevel}
              </div>
              {r.intel.kulePct ? (
                <div style={num({ fontSize: 10, color: C.dangerDim })}>
                  kule +{r.intel.kulePct}%
                </div>
              ) : null}
            </div>
            <div style={panel({ padding: '9px 11px', background: 'rgba(11,23,37,0.7)' })}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>NÜFUS</div>
              <div style={num({ fontSize: 18, color: C.textDim })}>{short(r.intel.population)}</div>
            </div>
          </div>
          <Section title="SAVUNAN BİRİMLER">
            <UnitGrid units={r.intel.army} unitDefs={unitDefs} color={C.frost} />
          </Section>
          <Section title="DEPOSUNDAKİLER">
            <ResGrid res={r.intel.resources} color={C.warn} />
          </Section>
        </>
      )}

      {r.outcome === 'hedef_yok' && (
        <div style={{ fontFamily: FONT.ui, fontSize: 11, color: C.textDim, lineHeight: 1.7 }}>
          Hedef köy varış anında haritada yoktu; ordu kayıpsız geri döndü.
        </div>
      )}
    </div>
  );
}

// ── Ekran ────────────────────────────────────────────────────────────
export default function ReportScreen({ reports = [], unitDefs = {} }) {
  const [filter, setFilter] = useState('all');
  const [selId, setSelId] = useState(null);
  const [read, setRead] = useState(() => new Set(readIds()));

  // Açık raporu okunmuş işaretle. Ekrana girmek TÜM raporları okunmuş
  // saymıyor; yalnız açtığın rapor okunur.
  const openReport = (id) => {
    setSelId(id);
    if (id && !read.has(id)) setRead(new Set(markRead(id)));
  };

  const list = useMemo(() => reports.filter(r => {
    if (filter === 'out') return r.dir === 'out' && r.outcome !== 'kesif';
    if (filter === 'in') return r.dir === 'in';
    if (filter === 'scout') return r.outcome === 'kesif';
    return true;
  }), [reports, filter]);

  const sel = list.find(r => r.id === selId) || list[0] || null;

  // Otomatik seçilen (ilk) rapor da ekranda AÇIK duruyor — onu da okunmuş say
  useEffect(() => {
    if (sel?.id && !read.has(sel.id)) setRead(new Set(markRead(sel.id)));
  }, [sel?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => ({
    all: reports.length,
    out: reports.filter(r => r.dir === 'out' && r.outcome !== 'kesif').length,
    in: reports.filter(r => r.dir === 'in').length,
    scout: reports.filter(r => r.outcome === 'kesif').length,
  }), [reports]);

  if (!reports.length) {
    return (
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 0' }}>
        <div style={panel({ padding: 26, textAlign: 'center' })}>
          <Icon name="savas" size={30} color={C.lineBright} strokeWidth={1.1} />
          <div style={{
            fontFamily: FONT.head, fontSize: 17, color: C.textDim, marginTop: 10,
          }}>Henüz rapor yok</div>
          <div style={{
            fontFamily: FONT.ui, fontSize: 11, color: C.textMute, marginTop: 6, lineHeight: 1.7,
          }}>
            Haritadan bir NPC köyü seçip <b>ORDU GÖNDER</b> ile yağma, saldırı ya da
            keşif gönder. Sefer hedefe vardığında sonucu burada göreceksin.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', paddingTop: 12, paddingBottom: 16 }}>
      {/* Filtreler */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Icon name="savas" size={15} color={C.iceDeep} />
        <span style={lbl({ fontSize: 9, letterSpacing: 1.5, marginRight: 6 })}>Savaş raporları</span>
        {FILTERS.map(f => {
          const on = filter === f.key;
          return (
            <button key={f.key} onClick={() => { setFilter(f.key); setSelId(null); }}
              style={btn(on ? 'primary' : 'ghost', {
                padding: '5px 11px', fontSize: 9, letterSpacing: 1.1,
              })}>
              {f.label}
              <span style={{ color: on ? C.iceSoft : C.textMute, marginLeft: 5 }}>
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: 12 }}>
        {/* Liste */}
        <div className="tn-scroll" style={{
          display: 'flex', flexDirection: 'column', gap: 5,
          maxHeight: 'calc(100vh - 190px)', overflowY: 'auto', paddingRight: 3,
        }}>
          {list.length === 0 ? (
            <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textMute, padding: 10 }}>
              Bu filtrede rapor yok.
            </div>
          ) : list.map(r => (
            <Row key={r.id} r={r}
              active={sel?.id === r.id}
              unread={!read.has(r.id)}
              onClick={() => openReport(r.id)} />
          ))}
        </div>

        {/* Ayrıntı */}
        <div className="tn-scroll" style={{
          ...panel({ padding: 15 }),
          maxHeight: 'calc(100vh - 190px)', overflowY: 'auto',
        }}>
          <Detail r={sel} unitDefs={unitDefs} />
        </div>
      </div>
    </div>
  );
}
