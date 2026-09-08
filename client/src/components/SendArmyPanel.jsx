/**
 * ORDU GÖNDERME EKRANI — haritada bir yabancı köy seçiliyken açılır.
 *
 * Üç mod: yağma (kayıplar yarı, deponun yarısı taşınır), tam saldırı
 * (kayıplar tam, savunma silinir), keşif (çarpışma yok, bilgi getirir).
 *
 * Tahmin: sunucudan `simulate_battle` ile istenir — savaş formülü tek yerde
 * (server/game/combat.js) durmalı, istemcide kopyası olmamalı. Tahmin ancak
 * hedefi DAHA ÖNCE KEŞFETTİYSEN yapılabilir; keşif verisi yoksa ekran bunu
 * söyler. `tag` alanı yanıtı bu ekrana ait olduğunu doğrulamak için (savaş
 * simülatörü de aynı olayı kullanıyor).
 *
 * DİKKAT: createPortal ile body'ye çiziliyor — harita popover'ının
 * backdropFilter'ı position:fixed'i hapsediyor (bkz. UnitDetail.jsx).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, btn, label as lbl, num, short, fmtTime } from '../theme';
import { unitImage } from '../data/unitImages';
import Icon from './Icons';

const MODES = [
  { key: 'raid',   label: 'YAĞMA',       icon: 'depo',   color: C.warn,
    desc: 'Kayıplar yarıya iner, deposunun yarısı taşınır. Düzenli gelir için.' },
  { key: 'attack', label: 'TAM SALDIRI', icon: 'kilic',  color: C.danger,
    desc: 'Kayıplar tam. Kazanırsan savunması silinir, deposu tamamen yağmalanır.' },
  { key: 'scout',  label: 'KEŞİF',       icon: 'harita', color: C.ice,
    desc: 'Çarpışma yok. Ordusunu, surunu ve deposunu öğrenir. Yalnız izci gider.' },
];

const ERR = {
  konum_yok: 'Köyünün dünya konumu yok.',
  kendi_koyun: 'Kendi köyüne saldıramazsın.',
  sefer_limiti: 'Aynı anda daha fazla sefer yürütemezsin.',
  gecersiz_hedef: 'Bu hedefe sefer açılamaz.',
  oyuncu_hedefi_kapali: 'Oyuncu köylerine saldırı henüz kapalı.',
  gecersiz_mod: 'Geçersiz sefer türü.',
  bilinmeyen_birim: 'Bilinmeyen birim.',
  yetersiz_asker: 'O kadar askerin yok.',
  asker_secilmedi: 'Hiç asker seçmedin.',
  kesif_icin_izci_gerek: 'Keşfe yalnızca izci gönderilebilir.',
  saldiri_gucu_yok: 'Seçtiğin birimlerin saldırı gücü yok.',
  gecersiz_koy: 'Hedef köy bulunamadı.',
};

/**
 * Yürüyüş süresi — sunucudaki army.js ile AYNI kural.
 * Birim hızı = saatte kaç hex; en yavaş birim belirler. Oyun saati gerçek
 * saniyeye `hourSeconds` ile çevrilir (1× → 3600).
 */
function marchSeconds(units, unitDefs, distance, hourSeconds, minMinutes = 1) {
  let hiz = Infinity;
  for (const [k, n] of Object.entries(units)) {
    if (!(n > 0)) continue;
    const h = unitDefs[k]?.stats?.hiz;
    if (h > 0 && h < hiz) hiz = h;
  }
  if (!Number.isFinite(hiz)) return 0;
  const gameHours = Math.max(minMinutes / 60, distance / hiz);
  return Math.round(gameHours * hourSeconds);
}

function carryCapacity(units, unitDefs) {
  return Object.entries(units).reduce(
    (s, [k, n]) => s + (unitDefs[k]?.stats?.kapasite || 0) * n, 0);
}

function UnitRow({ u, def, have, value, onChange, disabled, reason }) {
  const img = unitImage(u);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 7px', borderRadius: 5,
      background: value > 0 ? 'rgba(143,220,255,0.07)' : 'rgba(8,17,28,0.5)',
      border: `1px solid ${value > 0 ? C.lineBright : C.lineSoft}`,
      opacity: disabled ? 0.45 : 1,
    }} title={disabled ? reason : ''}>
      <div style={{
        width: 26, height: 36, borderRadius: 3, overflow: 'hidden',
        background: '#0b1420', flexShrink: 0,
      }}>
        {img && <img src={img} alt="" draggable={false} style={{
          width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%',
        }} />}
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontFamily: FONT.head, fontSize: 11.5, color: C.frost,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{def?.name || u}</div>
        <div style={{ display: 'flex', gap: 7, marginTop: 1 }}>
          <span style={num({ fontSize: 8.5, color: C.textMute })}>
            sal {def?.stats?.saldiri ?? '—'}
          </span>
          <span style={num({ fontSize: 8.5, color: C.textMute })}>
            hız {def?.stats?.hiz ?? '—'}
          </span>
          <span style={num({ fontSize: 8.5, color: C.textMute })}>
            yük {def?.stats?.kapasite ?? '—'}
          </span>
        </div>
      </div>

      <span style={num({ fontSize: 10, color: C.textDim, minWidth: 34, textAlign: 'right' })}>
        /{have}
      </span>

      <input type="number" min={0} max={have} value={value} disabled={disabled}
        onChange={(e) => onChange(Math.max(0, Math.min(have, Math.floor(Number(e.target.value) || 0))))}
        style={{
          width: 58, padding: '3px 5px', textAlign: 'right',
          fontFamily: FONT.num, fontSize: 11, color: C.frost,
          background: 'rgba(4,9,15,0.75)', border: `1px solid ${C.lineSoft}`,
          borderRadius: 4, outline: 'none',
        }} />

      <button onClick={() => onChange(have)} disabled={disabled} title="Tümünü seç"
        style={btn('ghost', { padding: '3px 6px', fontSize: 8, letterSpacing: 0.6 })}>
        TÜM
      </button>
    </div>
  );
}

export default function SendArmyPanel({
  socket, target, army = {}, unitDefs = {}, marchInfo = {}, intel = null, onClose,
}) {
  const [mode, setMode] = useState('raid');
  const [sel, setSel] = useState({});
  const [err, setErr] = useState(null);
  const [sent, setSent] = useState(null);
  const [pred, setPred] = useState(null);

  const [noReply, setNoReply] = useState(false);
  const pending = useRef(false);   // gönderim yanıt bekliyor mu

  /**
   * Sunucu sefer sistemini tanıyor mu? `marchInfo` yalnızca yeni sunucudan
   * gelir. Eski sunucu çalışıyorsa `send_army` olayını kimse dinlemez: tıklama
   * sessizce kaybolur, hiçbir hata görünmez. Bunu ekranda söylemek şart.
   */
  const serverReady = !!marchInfo?.hourSeconds;

  const hourSeconds = marchInfo.hourSeconds || 3600;
  const minMarchMin = marchInfo.minMarchMinutes || 1;
  /**
   * Keşif birimleri normalde sunucudan gelir; gelmiyorsa istemcide aynı kuralla
   * türetilir (kapasite ≥ 100, saldırı ≤ 10). Aksi hâlde liste boş kalıyor ve
   * keşif modunda BÜTÜN birimler devre dışı görünüyordu.
   */
  const scoutSet = useMemo(() => {
    if (marchInfo.scoutUnits?.length) return new Set(marchInfo.scoutUnits);
    return new Set(Object.entries(unitDefs)
      .filter(([, d]) => (d?.stats?.kapasite || 0) >= 100 && (d?.stats?.saldiri || 0) <= 10)
      .map(([k]) => k));
  }, [marchInfo.scoutUnits, unitDefs]);
  const distance  = target?.distance ?? 0;

  const available = useMemo(
    () => Object.entries(army).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]),
    [army]);

  // Mod değişince uygun olmayan seçimleri temizle
  useEffect(() => {
    setSel(s => Object.fromEntries(Object.entries(s).filter(
      ([k]) => (mode === 'scout' ? scoutSet.has(k) : true))));
    setPred(null);
  }, [mode, scoutSet]);

  const chosen = useMemo(
    () => Object.fromEntries(Object.entries(sel).filter(([, n]) => n > 0)),
    [sel]);
  const chosenTotal = Object.values(chosen).reduce((a, b) => a + b, 0);
  const secs = marchSeconds(chosen, unitDefs, distance, hourSeconds, minMarchMin);
  const cap  = carryCapacity(chosen, unitDefs);

  // ── Sonuç/hata dinleyicileri ──
  useEffect(() => {
    if (!socket) return;
    const onErr = ({ reason }) => {
      pending.current = false; setNoReply(false);
      setErr(ERR[reason] || reason || 'Sefer açılamadı.');
    };
    const onSentOk = (d) => { pending.current = false; setNoReply(false); setSent(d); };
    const onBattle = (d) => { if (d?.tag === 'sendpanel') setPred(d.ok ? d.result : null); };
    socket.on('army_error', onErr);
    socket.on('army_sent', onSentOk);
    socket.on('battle_result', onBattle);
    return () => {
      socket.off('army_error', onErr);
      socket.off('army_sent', onSentOk);
      socket.off('battle_result', onBattle);
    };
  }, [socket]);

  // ── Tahmin: keşif verisi varsa sunucudan sor ──
  useEffect(() => {
    if (!socket || mode === 'scout' || !intel || chosenTotal <= 0) { setPred(null); return; }
    const t = setTimeout(() => {
      socket.emit('simulate_battle', {
        tag: 'sendpanel', attacker: chosen, defender: intel.army || {},
        surLevel: intel.surLevel || 0, hendekLevel: intel.hendekLevel || 0,
        mode: mode === 'raid' ? 'raid' : 'normal',
      });
    }, 220);   // yazarken her tuşta istek atma
    return () => clearTimeout(t);
  }, [socket, mode, intel, chosenTotal, JSON.stringify(chosen)]);

  // ESC ile kapat
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!target) return null;
  const modeDef = MODES.find(m => m.key === mode);

  const send = () => {
    setErr(null); setNoReply(false);
    pending.current = true;
    socket?.emit('send_army', { targetKey: target.key, mode, units: chosen });
    // Sunucu ne 'army_sent' ne 'army_error' döndürmezse olayı kimse dinlemiyor
    // demektir — sessiz başarısızlık yerine bunu söyle.
    setTimeout(() => { if (pending.current) setNoReply(true); }, 3000);
  };

  const box = {
    padding: '8px 10px', borderRadius: 6,
    background: 'rgba(8,17,28,0.55)', border: `1px solid ${C.lineSoft}`,
  };

  return createPortal(
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 3200,
      background: 'rgba(4,8,13,0.74)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'grid', placeItems: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="tn-rise" style={{
        width: 'min(660px, 100%)', maxHeight: '100%', overflow: 'auto',
        borderRadius: 10, padding: 16,
        background: 'linear-gradient(180deg, rgba(13,26,42,0.97), rgba(9,18,30,0.99))',
        border: `1px solid ${modeDef.color}55`,
        boxShadow: '0 24px 70px rgba(0,0,0,0.75)',
        display: 'flex', flexDirection: 'column', gap: 11,
      }}>
        {/* Başlık */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Icon name="koy" size={20} color={modeDef.color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT.head, fontSize: 20, fontWeight: 600, letterSpacing: 1,
              color: C.frost, lineHeight: 1.15,
            }}>{target.name}</div>
            <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute, marginTop: 2 }}>
              {target.tierLabel || 'köy'} · {target.key} · {distance} hex
              {target.army != null ? ` · ordu ~${short(target.army)}` : ''}
            </div>
          </div>
          <button onClick={onClose} title="Kapat (Esc)" style={{
            display: 'grid', placeItems: 'center', width: 26, height: 26, padding: 0,
            borderRadius: 5, cursor: 'pointer',
            background: 'rgba(4,9,15,0.7)', border: `1px solid ${C.lineBright}`,
          }}>
            <Icon name="kapat" size={12} color={C.textDim} strokeWidth={2} />
          </button>
        </div>

        {sent ? (
          /* ── Gönderildi ── */
          <div style={{ ...box, borderColor: `${C.good}66`, background: 'rgba(108,221,163,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="ordu" size={16} color={C.good} />
              <span style={{ fontFamily: FONT.head, fontSize: 14, color: C.frost }}>
                Ordu yolda
              </span>
            </div>
            <div style={{ fontFamily: FONT.ui, fontSize: 11, color: C.textDim, marginTop: 6, lineHeight: 1.6 }}>
              {sent.toName} — varış {fmtTime(sent.seconds)} sonra, dönüş bir o kadar.
              Seferi Ordu sekmesinden izleyebilirsin; sonuç savaş raporu olarak gelir.
            </div>
            <button onClick={onClose} style={btn('primary', { width: '100%', marginTop: 10, padding: 8 })}>
              TAMAM
            </button>
          </div>
        ) : (
          <>
            {/* Mod seçimi */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {MODES.map(m => {
                const on = m.key === mode;
                return (
                  <button key={m.key} onClick={() => { setMode(m.key); setErr(null); }} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: '7px 6px', borderRadius: 6, cursor: 'pointer',
                    fontFamily: FONT.ui, fontSize: 9.5, letterSpacing: 1.1, fontWeight: 600,
                    color: on ? C.frost : C.textDim,
                    background: on ? `${m.color}22` : 'rgba(8,17,28,0.6)',
                    border: `1px solid ${on ? m.color : C.lineSoft}`,
                  }}>
                    <Icon name={m.icon} size={12} color={on ? m.color : C.textFaint} />
                    {m.label}
                  </button>
                );
              })}
            </div>
            <div style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textFaint, lineHeight: 1.5 }}>
              {modeDef.desc}
            </div>

            {/* Birim seçimi */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Icon name="ordu" size={12} color={C.iceDeep} />
                <span style={lbl({ fontSize: 8.5, letterSpacing: 1.4 })}>Gönderilecek birimler</span>
                <span style={num({ fontSize: 9.5, color: C.textMute, marginLeft: 'auto' })}>
                  {chosenTotal} asker
                </span>
              </div>

              {available.length === 0 ? (
                <div style={{ ...box, fontFamily: FONT.ui, fontSize: 10.5, color: C.warn }}>
                  Hiç askerin yok. Kışla veya ahırdan birim eğit.
                </div>
              ) : (
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5,
                  maxHeight: 250, overflowY: 'auto',
                }}>
                  {available.map(([u, have]) => {
                    const scoutOnly = mode === 'scout' && !scoutSet.has(u);
                    return (
                      <UnitRow key={u} u={u} def={unitDefs[u]} have={have}
                        value={sel[u] || 0} disabled={scoutOnly}
                        reason="Keşfe yalnızca izci gidebilir"
                        onChange={(n) => setSel(s => ({ ...s, [u]: n }))} />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Özet */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              <div style={box}>
                <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>TEK YÖN</div>
                <div style={num({ fontSize: 15, color: chosenTotal ? C.frost : C.textMute })}>
                  {chosenTotal ? fmtTime(secs) : '—'}
                </div>
              </div>
              <div style={box}>
                <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>GİDİŞ-DÖNÜŞ</div>
                <div style={num({ fontSize: 15, color: chosenTotal ? C.textDim : C.textMute })}>
                  {chosenTotal ? fmtTime(secs * 2) : '—'}
                </div>
              </div>
              <div style={box}>
                <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>TAŞIMA</div>
                <div style={num({ fontSize: 15, color: chosenTotal ? C.warn : C.textMute })}>
                  {mode === 'scout' ? '—' : short(cap)}
                </div>
              </div>
            </div>

            {/* Tahmin */}
            {mode !== 'scout' && (
              intel ? (
                <div style={{
                  ...box,
                  borderColor: pred ? (pred.winner === 'attacker' ? `${C.good}55` : `${C.danger}55`) : C.lineSoft,
                  background: pred ? (pred.winner === 'attacker' ? 'rgba(108,221,163,0.07)' : 'rgba(255,111,120,0.07)') : box.background,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <Icon name="savas" size={12} color={C.iceDeep} />
                    <span style={lbl({ fontSize: 8, letterSpacing: 1.3 })}>Keşif verisine göre tahmin</span>
                  </div>
                  {!chosenTotal ? (
                    <div style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textMute }}>
                      Birim seç, tahmin hesaplanır.
                    </div>
                  ) : !pred ? (
                    <div style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textMute }}>
                      hesaplanıyor…
                    </div>
                  ) : (
                    <div style={{ fontFamily: FONT.ui, fontSize: 11, lineHeight: 1.7, color: C.text }}>
                      <div style={{ color: pred.winner === 'attacker' ? C.good : C.danger, fontWeight: 600 }}>
                        {pred.winner === 'attacker' ? 'Kazanırsın' : pred.winner === 'defender' ? 'Kaybedersin' : 'Berabere'}
                        {' · '}atak {short(pred.attackTotal)} / savunma {short(pred.defenseTotal)}
                        {pred.wallBonusPct > 0 ? ` (sur %${pred.wallBonusPct})` : ''}
                      </div>
                      <div style={{ color: C.textDim }}>
                        Beklenen kaybın {Math.round(pred.attackerLossRate * 100)}% ·
                        {' '}onların kaybı {Math.round(pred.defenderLossRate * 100)}%
                      </div>
                      <div style={{ color: C.textFaint, fontSize: 9.5 }}>
                        Keşif verisi eskiyebilir — ordusu bu arada büyümüş olabilir.
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ ...box, background: 'rgba(242,187,96,0.07)', borderColor: `${C.warn}44` }}>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <Icon name="uyari" size={13} color={C.warn} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim, lineHeight: 1.6 }}>
                      Bu köyü hiç keşfetmedin — savunmasını bilmiyorsun, tahmin yapılamaz.
                      Önce izci gönder.
                    </span>
                  </div>
                </div>
              )
            )}

            {/* Keşif verisi özeti */}
            {mode === 'scout' && intel && (
              <div style={box}>
                <div style={lbl({ fontSize: 8, letterSpacing: 1.3, marginBottom: 4 })}>
                  Son keşif
                </div>
                <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim, lineHeight: 1.6 }}>
                  Ordu {short(intel.armyTotal)} · sur {intel.surLevel} / hendek {intel.hendekLevel} ·
                  {' '}depo {short(Object.values(intel.resources || {}).reduce((a, b) => a + b, 0))}
                </div>
              </div>
            )}

            {(!serverReady || noReply) && (
              <div style={{
                ...box, background: 'rgba(255,111,120,0.1)', borderColor: C.dangerDim,
              }}>
                <div style={{ display: 'flex', gap: 7 }}>
                  <Icon name="uyari" size={13} color={C.danger} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontFamily: FONT.ui, fontSize: 10.5, color: '#ffb8bd', lineHeight: 1.6 }}>
                    <b>Sunucu sefer sistemini tanımıyor.</b> Eski sürüm çalışıyor —
                    {' '}<code>stop-tranord.bat</code> sonra <code>start-tranord-dev.bat</code>
                    {' '}ile sunucuyu yeniden başlat, sonra sayfayı yenile.
                    {noReply && ' (Gönderim isteğine 3 saniyede yanıt gelmedi.)'}
                  </span>
                </div>
              </div>
            )}

            {err && (
              <div style={{
                ...box, background: 'rgba(255,111,120,0.1)', borderColor: C.dangerDim,
                fontFamily: FONT.ui, fontSize: 10.5, color: '#ffb8bd',
              }}>{err}</div>
            )}

            <button onClick={send} disabled={chosenTotal <= 0}
              style={btn(chosenTotal > 0 ? (mode === 'scout' ? 'primary' : 'danger') : 'disabled', {
                width: '100%', padding: 10, letterSpacing: 1.6, fontSize: 11,
              })}>
              {mode === 'scout' ? 'İZCİ GÖNDER' : mode === 'raid' ? 'YAĞMAYA GÖNDER' : 'SALDIRIYA GÖNDER'}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
