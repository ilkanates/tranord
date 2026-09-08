/**
 * WorkerAssign — TEK işçi atama kontrolü.
 * Hem üretim haritasındaki tile'larda hem köy merkezindeki binalarda
 * hem de inşaat/yükseltme işçisi seçiminde aynı bileşen kullanılır.
 *
 * mode="assign"  → değer değişince hemen sunucuya gider (çalışan işçi)
 * mode="pick"    → sadece yerel seçim (inşaat işçisi)
 */
import { useEffect, useRef, useState } from 'react';
import { C, FONT, label as lbl, num } from '../theme';
import Icon from './Icons';

const stepBtn = (off) => ({
  width: 24, height: 24, flexShrink: 0,
  display: 'grid', placeItems: 'center',
  background: 'rgba(28,51,73,0.6)',
  border: `1px solid ${C.lineSoft}`,
  borderRadius: 4,
  color: off ? C.textMute : C.iceSoft,
  cursor: off ? 'not-allowed' : 'pointer',
  fontFamily: FONT.ui, fontSize: 14, lineHeight: 1, padding: 0,
});

const quick = (active) => ({
  padding: '2px 7px',
  fontFamily: FONT.ui, fontSize: 8.5, letterSpacing: 0.5,
  background: active ? 'rgba(61,159,214,0.24)' : 'rgba(20,34,50,0.55)',
  border: `1px solid ${active ? C.iceDeep : C.lineSoft}`,
  borderRadius: 3,
  color: active ? C.iceSoft : C.textFaint,
  cursor: 'pointer', whiteSpace: 'nowrap',
});

export default function WorkerAssign({
  value = 0, max = 1, freeWorkers = 0, min = 0,
  mode = 'assign', title = 'İşçi',
  effect, onChange, disabled = false,
}) {
  const [local, setLocal] = useState(value);
  const [flash, setFlash] = useState(false);
  const commitRef = useRef(null);
  const lastSent = useRef(value);

  useEffect(() => { setLocal(value); lastSent.current = value; }, [value]);
  useEffect(() => () => clearTimeout(commitRef.current), []);

  const ceiling = mode === 'assign'
    ? Math.max(min, Math.min(max, value + freeWorkers))
    : Math.max(min, Math.min(max, freeWorkers));

  const clamp = (n) => Math.max(min, Math.min(ceiling, n));

  function push(next, immediate = false) {
    const v = clamp(next);
    setLocal(v);
    if (mode === 'pick') { onChange?.(v); return; }
    clearTimeout(commitRef.current);
    const send = () => {
      if (v === lastSent.current) return;
      lastSent.current = v;
      onChange?.(v);
      setFlash(true);
      setTimeout(() => setFlash(false), 400);
    };
    if (immediate) send(); else commitRef.current = setTimeout(send, 240);
  }

  const atTop = local >= ceiling;
  const atBottom = local <= min;
  const noRoom = ceiling <= min;
  const idle = mode === 'assign' && local === 0 && max > 0;

  return (
    <div style={{
      background: 'rgba(8,17,28,0.5)',
      border: `1px solid ${flash ? C.iceDeep : idle ? 'rgba(224,179,87,0.35)' : C.lineSoft}`,
      borderRadius: 6, padding: '7px 8px',
      transition: 'border-color .3s',
      opacity: disabled ? 0.5 : 1,
      pointerEvents: disabled ? 'none' : 'auto',
    }}>
      {/* Başlık + değer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <Icon name="isci" size={12} color={idle ? C.warn : C.iceDeep} />
        <span style={lbl({ flex: 1, fontSize: 8.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}>
          {title}
        </span>
        <span style={num({ fontSize: 15, color: idle ? C.warn : C.frost, fontWeight: 500, lineHeight: 1 })}>
          {local}
        </span>
        <span style={num({ fontSize: 9.5, color: C.textMute })}>/{max}</span>
      </div>

      {/* Stepper + slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button type="button" style={stepBtn(atBottom)} disabled={atBottom}
          onClick={() => push(local - 1, true)}>−</button>
        <input type="range" min={min} max={Math.max(min + 1, ceiling)} value={local}
          onChange={(e) => push(Number(e.target.value))}
          onPointerUp={() => push(local, true)}
          disabled={noRoom}
          style={{ flex: 1, minWidth: 30, height: 4 }} />
        <button type="button" style={stepBtn(atTop)} disabled={atTop}
          onClick={() => push(local + 1, true)}>+</button>
      </div>

      {/* Kısayollar + havuz */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
        {min === 0 && (
          <button type="button" style={quick(local === 0)} onClick={() => push(0, true)}>0</button>
        )}
        <button type="button" style={quick(ceiling > 1 && local === Math.ceil(ceiling / 2))}
          onClick={() => push(Math.ceil(ceiling / 2), true)}>½</button>
        <button type="button" style={quick(ceiling > 0 && local === ceiling)}
          onClick={() => push(ceiling, true)}>TAM {ceiling}</button>
        <span style={{ marginLeft: 'auto', fontFamily: FONT.ui, fontSize: 9, color: C.textFaint, whiteSpace: 'nowrap' }}>
          havuz <span style={num({ color: freeWorkers > 0 ? C.iceSoft : C.warn })}>{freeWorkers}</span>
        </span>
      </div>

      {/* Etki */}
      {effect && (
        <div style={{
          marginTop: 5, paddingTop: 5, borderTop: `1px solid ${C.lineSoft}`,
          fontFamily: FONT.ui, fontSize: 10, color: idle ? C.warn : C.good, textAlign: 'right',
        }}>
          {idle ? 'çalışmıyor' : effect(local)}
        </div>
      )}
    </div>
  );
}
