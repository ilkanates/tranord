/**
 * EquipmentUpgradePanel — silahçı ve zırhçıdaki ekipman yükseltmeleri.
 *
 * Yükseltme o ekipmanın KENDİ katkısını büyütüyor: kılıç saldırı ağırlıklı
 * olduğu için kılıç yükseltmesi saldırıyı, kalkan savunmayı artırıyor.
 * 20 seviye, Lvl 20'de katkı %35 daha fazla ve etki ordunun TAMAMINA anında
 * işliyor — eski askerler de güçleniyor.
 *
 * Bir sonraki seviyenin bedeli ve süresi SUNUCUDAN geliyor (`equipmentUpgrade`);
 * burada formülün ikizi tutulmuyor, yoksa denge değişince panel yanlış rakam
 * gösterirdi.
 */
import { C, FONT, btn, label as lbl, num, fmtTime } from '../theme';
import { EQ_LABEL, gameMinutesToRealSeconds } from '../flows';
import { CostRow } from './mapPanels';
import { WAIT_LABEL } from './queueUI';
import Icon from './Icons';

/** Bu ekipman neyi büyütüyor — katkı tablosundan okunuyor, elle yazılmıyor */
function etkiMetni(def) {
  if (!def) return '';
  const parcalar = [];
  if ((def.saldiri || 0) > 0) parcalar.push(`saldırı +${def.saldiri}`);
  if ((def.yayaSav || 0) > 0) parcalar.push(`yaya sav +${def.yayaSav}`);
  if ((def.atliSav || 0) > 0) parcalar.push(`atlı sav +${def.atliSav}`);
  return parcalar.join(' · ');
}

export default function EquipmentUpgradePanel({
  buildingType,
  equipmentByBuilding = {}, equipmentDefs = {},
  equipmentUpgrade = {}, queue = [], resources = {}, flows = {},
  buildingWorkers = 0,
  onUpgrade, onCancel,
  hourSeconds = 3600, worldSpeed = 1,
}) {
  // At yükseltilmiyor: bir alet değil, canlı
  const liste = (equipmentByBuilding[buildingType] || []).filter(e => e !== 'at');
  if (!liste.length) return null;

  const siradaSayisi = (eq) => queue.filter(o => o.type === eq).length;

  return (
    <div style={{
      background: 'rgba(8,17,28,0.55)',
      border: `1px solid ${C.lineSoft}`,
      borderRadius: 7, padding: 9,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Icon name="yukari" size={13} color={C.iceDeep} />
        <span style={lbl({ fontSize: 8.5, letterSpacing: 1.5, flex: 1 })}>Ekipman yükseltme</span>
        <span style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textMute }}>
          ordunun tamamına işler
        </span>
      </div>

      {buildingWorkers === 0 && (
        <div style={{
          display: 'flex', gap: 7, alignItems: 'center',
          padding: '5px 8px', borderRadius: 5, marginBottom: 8,
          background: 'rgba(224,179,87,0.08)', border: '1px solid rgba(224,179,87,0.3)',
        }}>
          <Icon name="uyari" size={11} color={C.warn} />
          <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: '#e8cf9a' }}>
            Bu binada işçi yok — yükseltme kuyruğa girer ama başlamaz.
          </span>
        </div>
      )}

      {/*
        AYRI KUYRUK LİSTESİ YOK.
        Durum ekipmanın KENDİ satırında duruyor: çalışan yükseltme geri
        sayımı, arkadan gelen "sırada" yazısını gösteriyor. Sunucu zaten
        tek tek işliyor — kılıca bastıysan o başlar, mızrağa da basarsan
        kılıç bitince mızrak başlar.
      */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {liste.map(eq => {
          const bilgi = equipmentUpgrade[eq];
          if (!bilgi) return null;
          const tavanda = bilgi.level >= bilgi.maxLevel;
          const sirada = siradaSayisi(eq);
          const dolu = bilgi.level + sirada >= bilgi.maxLevel;
          // Bu ekipmanın kuyruktaki ilk işi — satırın durumunu o belirliyor
          const isSira  = queue.findIndex(o => o.type === eq);
          const is      = isSira >= 0 ? queue[isSira] : null;
          const calisan = !!is && isSira === 0 && !is.waiting;
          const sure = bilgi.minutes == null ? null : gameMinutesToRealSeconds(
            buildingWorkers > 0 ? Math.max(1, bilgi.minutes / buildingWorkers) : bilgi.minutes,
            hourSeconds, worldSpeed);

          return (
            <div key={eq} style={{
              padding: '6px 8px', borderRadius: 5,
              background: 'rgba(8,17,28,0.6)',
              border: `1px solid ${tavanda ? 'rgba(108,221,163,0.32)' : C.lineSoft}`,
            }}>
              {/*
                Etki metni ("saldırı +5 · yaya sav +25") ipucuna taşındı ve
                doluluk çubuğu kaldırıldı: panel kaydırma gerektiriyordu,
                seviye sayısı zaten aynı bilgiyi veriyor.
              */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}
                title={etkiMetni(equipmentDefs[eq])}>
                <Icon name={eq} size={15} color={C.iceSoft} />
                <span style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.text }}>
                  {EQ_LABEL[eq] || equipmentDefs[eq]?.name || eq}
                </span>
                <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'baseline', gap: 5 }}>
                  {bilgi.bonusPct > 0 && (
                    <span style={num({ fontSize: 9.5, color: C.good })}>+%{bilgi.bonusPct}</span>
                  )}
                  <span style={num({ fontSize: 10.5, color: C.frost })}>
                    Lvl {bilgi.level}<span style={{ color: C.textMute }}>/{bilgi.maxLevel}</span>
                  </span>
                </span>
              </div>

              {is ? (
                /* Bu ekipmanın işi var: geri sayım ya da "sırada" + iptal */
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{
                    flex: 1, minWidth: 0, display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontFamily: FONT.ui, fontSize: 9.5,
                    color: calisan ? C.iceSoft : C.warn,
                  }}>
                    {!calisan && <Icon name="uyari" size={10} color={C.warn} />}
                    {calisan ? 'yükseltiliyor' : (WAIT_LABEL[is.waitingReason] || 'sırada')}
                    {is.toLevel ? (
                      <span style={num({ color: C.textFaint })}>→ Lvl {is.toLevel}</span>
                    ) : null}
                  </span>
                  {calisan && (
                    <span style={num({ fontSize: 10.5, color: C.good, flexShrink: 0 })}>
                      {fmtTime(is.timeLeft)}
                    </span>
                  )}
                  <button type="button" onClick={() => onCancel?.(is.id)} title="İptal (kaynak iade)"
                    style={btn('ghost', {
                      flexShrink: 0, padding: '4px 9px', fontSize: 9.5, letterSpacing: 0.8,
                    })}>
                    İPTAL
                  </button>
                </div>
              ) : tavanda ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontFamily: FONT.ui, fontSize: 9.5, color: C.good,
                }}>
                  <Icon name="bonus" size={10} color={C.good} />
                  en üst seviye — katkı %{bilgi.bonusPct} fazla
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <CostRow cost={bilgi.cost} resources={resources} flows={flows}
                      hourSeconds={hourSeconds} worldSpeed={worldSpeed} />
                  </div>
                  <span style={num({ fontSize: 9.5, color: C.textFaint, flexShrink: 0 })}
                    title={buildingWorkers > 1 ? `${buildingWorkers} işçiyle` : undefined}>
                    {fmtTime(sure)}
                  </span>
                  <button type="button" disabled={dolu}
                    onClick={() => onUpgrade?.(eq)}
                    title={dolu ? 'Kuyrukla birlikte tavana ulaşıldı'
                      : `Lvl ${bilgi.level + sirada} → ${bilgi.level + sirada + 1}`}
                    style={btn(dolu ? 'disabled' : 'primary', {
                      flexShrink: 0, padding: '4px 11px', fontSize: 9.5, letterSpacing: 0.8,
                    })}>
                    YÜKSELT
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
