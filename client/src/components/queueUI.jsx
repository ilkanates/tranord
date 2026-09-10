/**
 * Ekipman ve birim kuyruğu panellerinin paylaştığı parçalar (nordic).
 */
import { C, FONT, btn, label as lbl, num, fmtTime } from '../theme';
import Icon from './Icons';

export const WAIT_LABEL = {
  isci_yok:            'işçi yok',
  cephane_dolu:        'havuz dolu',
  ahir_dolu:           'ahır dolu',
  kaynak_yok:          'kaynak yok',
  egitmen_yok:         'eğitmen yok',
  ekipman_yok:         'ekipman yok',
  asker_icin_isci_yok: 'boş işçi yok',
  // Rún Salonu araştırma kuyruğu (server/game/tick.js)
  arastirmaci_yok:      'araştırmacı yok',
  salon_seviyesi_dusuk: 'salon seviyesi düşük',
};

export function PanelShell({ icon, title, children, note, status, compact = false }) {
  return (
    <div style={{
      background: 'rgba(8,17,28,0.55)',
      border: `1px solid ${C.lineSoft}`,
      borderRadius: 7,
      padding: compact ? 7 : 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon name={icon} size={13} color={C.iceDeep} />
        <span style={lbl({ fontSize: 8.5, letterSpacing: 1.5 })}>{title}</span>
      </div>
      {note}
      {status}
      {/* Ürün listesi | kuyruk — yan yana, dikey scroll'a gerek kalmasın */}
      <div style={{
        /* compact: kuyruk sütunu dar — kutu içeriği kadar yer kaplasın */
        display: 'grid',
        gridTemplateColumns: compact ? 'minmax(0,1fr) 118px' : '1.15fr 1fr',
        gap: compact ? 8 : 10, alignItems: 'start',
      }}>
        {children}
      </div>
    </div>
  );
}

export function WorkerNote({ workers, ok, warn }) {
  return (
    <div style={{
      display: 'flex', gap: 7, alignItems: 'flex-start',
      padding: '4px 7px', borderRadius: 5, marginBottom: 6,
      background: workers === 0 ? 'rgba(224,179,87,0.08)' : 'rgba(78,207,168,0.06)',
      border: `1px solid ${workers === 0 ? 'rgba(224,179,87,0.3)' : 'rgba(78,207,168,0.22)'}`,
    }}>
      <Icon name={workers === 0 ? 'uyari' : 'isci'} size={12}
        color={workers === 0 ? C.warn : C.good} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{
        fontFamily: FONT.ui, fontSize: 9.5, lineHeight: 1.5,
        color: workers === 0 ? '#e8cf9a' : C.textDim,
      }}>
        {workers === 0 ? warn : ok}
      </span>
    </div>
  );
}

export function Qty({ value, onChange, max = 50 }) {
  const set = (n) => onChange(Math.max(1, Math.min(max, n)));
  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexShrink: 0,
      border: `1px solid ${C.lineSoft}`, borderRadius: 4, overflow: 'hidden',
    }}>
      <button onClick={() => set(value - 1)} className="tn-step" style={{
        width: 20, height: 22, border: 'none', background: 'rgba(28,51,73,0.6)',
        color: C.iceSoft, cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0,
      }}>−</button>
      <input type="number" min={1} max={max} value={value}
        onChange={(e) => set(+e.target.value || 1)}
        style={{
          width: 32, height: 22, border: 'none', textAlign: 'center',
          background: 'rgba(8,17,28,0.8)', color: C.frost,
          fontFamily: FONT.num, fontSize: 11, MozAppearance: 'textfield',
        }} />
      <button onClick={() => set(value + 1)} className="tn-step" style={{
        width: 20, height: 22, border: 'none', background: 'rgba(28,51,73,0.6)',
        color: C.iceSoft, cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0,
      }}>+</button>
    </div>
  );
}

export function OrderButton({ children, disabled, title, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      style={btn(disabled ? 'disabled' : 'primary', {
        flexShrink: 0, padding: '5px 10px', fontSize: 10, letterSpacing: 0.8,
      })}>
      {children}
    </button>
  );
}

/**
 * KUYRUK KUTUSU SABİT YÜKSEKLİKTE.
 * 1 sipariş de olsa 20 sipariş de olsa aynı yeri kaplar; taşınca yalnız
 * kendi içinde kayar. Böylece sıraya iş eklenince panelde hiçbir şey
 * büyümez, küçülmez, yeniden ölçeklenmez.
 */
const QUEUE_BOX_H = 116;

export function QueueList({
  queue, nameOf, iconOf, onCancel,
  emptyText = 'kuyruk boş', boxHeight = QUEUE_BOX_H, compact = false,
}) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, marginBottom: 4 }}>
        <span style={lbl({ fontSize: 8.5 })}>Kuyruk</span>
        <span style={num({ fontSize: 10, color: queue.length ? C.iceSoft : C.textMute })}>
          {queue.length}
        </span>
      </div>

      {queue.length === 0 ? (
        <div style={{
          height: boxHeight, flexShrink: 0,
          fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute, padding: '3px 2px',
        }}>
          {emptyText}
        </div>
      ) : (
        <div className="tn-scroll" style={{
          display: 'flex', flexDirection: 'column', gap: 4,
          height: boxHeight, flexShrink: 0,
          overflowY: 'auto', overflowX: 'hidden', paddingRight: 2,
        }}>
          {queue.map((o, i) => {
            const active = i === 0 && !o.waiting;
            return (
              <div key={o.id} style={{
                display: 'flex', alignItems: 'center', gap: compact ? 4 : 7, flexShrink: 0,
                padding: compact ? '4px 5px' : '5px 7px', borderRadius: 5, minWidth: 0,
                background: active ? 'rgba(61,159,214,0.14)' : 'rgba(8,17,28,0.6)',
                border: `1px solid ${active ? 'rgba(61,159,214,0.45)' : C.lineSoft}`,
              }}>
                {/* Dar sütunda sıra numarası ve ürün adı yok: simge + adet yeter */}
                {!compact && (
                  <span style={num({ fontSize: 9, color: C.textMute, width: 14 })}>{i + 1}</span>
                )}
                {iconOf && <Icon name={iconOf(o)} size={compact ? 11 : 13}
                  color={active ? C.iceSoft : C.textFaint} />}
                <span style={{
                  flex: 1, minWidth: 0, fontFamily: FONT.ui, fontSize: 10,
                  color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }} title={compact ? nameOf(o) : undefined}>
                  {!compact && nameOf(o)}
                  <span style={num({ color: C.textFaint, marginLeft: compact ? 0 : 4 })}>
                    ×{o.remaining}{o.total > 1 && o.remaining !== o.total ? `/${o.total}` : ''}
                  </span>
                </span>

                {o.waiting ? (
                  <span title={WAIT_LABEL[o.waitingReason] || 'bekliyor'} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0,
                    fontFamily: FONT.ui, fontSize: 9, color: C.warn,
                  }}>
                    <Icon name="uyari" size={10} color={C.warn} />
                    {!compact && (WAIT_LABEL[o.waitingReason] || 'bekliyor')}
                  </span>
                ) : (
                  <span style={num({ fontSize: compact ? 9.5 : 11, color: C.good, flexShrink: 0 })}>
                    {fmtTime(o.timeLeft)}
                  </span>
                )}

                <button onClick={() => onCancel(o.id)} title="İptal"
                  style={{
                    width: compact ? 15 : 19, height: compact ? 15 : 19,
                    flexShrink: 0, padding: 0, display: 'grid',
                    placeItems: 'center', borderRadius: 3, cursor: 'pointer',
                    background: 'rgba(74,29,36,0.6)', border: `1px solid ${C.dangerDim}`,
                  }}>
                  <Icon name="kapat" size={9} color="#f0b8bd" strokeWidth={2.2} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
