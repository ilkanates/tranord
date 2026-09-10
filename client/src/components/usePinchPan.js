/**
 * usePinchPan — parmakla kaydırma + iki parmakla yakınlaştırma.
 *
 * Köy sahnesi 860×860 sabit bir SVG. Telefonda ekrana sığdırınca altıgenler
 * ~20 px kalıyor ve parmakla doğru hücreye basmak imkânsızlaşıyor; bu yüzden
 * sığdırma ölçeğinin ÜSTÜNE oyuncunun kendi yakınlaştırması geliyor.
 *
 * Neden hazır kütüphane değil: tek ihtiyaç iki jest ve tıklamayı bozmamak.
 * Kritik nokta ORADA: sürükledikten sonra parmağı kaldırınca tarayıcı yine de
 * `click` üretiyor ve altındaki altıgenin paneli açılıyordu. `moved` eşiği
 * (6 px) aşıldıysa bir sonraki click yakalama aşamasında yutuluyor.
 *
 * Pointer olayları kullanılıyor: fare, parmak ve kalem aynı kodla çalışıyor.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const MOVE_EPS = 6;   // bu kadar px'ten azı tıklama sayılır

export default function usePinchPan({
  min = 1, max = 3, viewW = 0, viewH = 0, contentW = 0, contentH = 0,
  enabled = true,
} = {}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const ptrs = useRef(new Map());
  const drag = useRef(null);
  const pinch = useRef(null);
  const swallow = useRef(false);

  /** İçerik ekrandan taşmıyorsa kaydırmaya izin yok — ortada dursun */
  const clamp = useCallback((p, k) => {
    const limX = Math.max(0, (contentW * k - viewW) / 2 + 10);
    const limY = Math.max(0, (contentH * k - viewH) / 2 + 10);
    return {
      x: Math.max(-limX, Math.min(limX, p.x)),
      y: Math.max(-limY, Math.min(limY, p.y)),
    };
  }, [contentW, contentH, viewW, viewH]);

  // Ölçek küçülünce eski kaydırma sınır dışında kalabilir
  useEffect(() => { setPan(p => clamp(p, zoom)); }, [zoom, clamp]);

  const reset = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const onPointerDown = (e) => {
    if (!enabled) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      pinch.current = {
        d: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        z: zoom, pan: { ...pan },
      };
      drag.current = null;
      swallow.current = true;         // iki parmak sonrası tıklama olmasın
    } else if (ptrs.current.size === 1) {
      drag.current = { x: e.clientX, y: e.clientY, pan: { ...pan }, moved: false, id: e.pointerId };
    }
  };

  const onPointerMove = (e) => {
    if (!enabled) return;
    const p = ptrs.current.get(e.pointerId);
    if (p) { p.x = e.clientX; p.y = e.clientY; }

    if (pinch.current && ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const k = Math.max(min, Math.min(max, pinch.current.z * (d / pinch.current.d)));
      setZoom(+k.toFixed(3));
      return;
    }

    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved) {
      if (Math.abs(dx) + Math.abs(dy) < MOVE_EPS) return;
      d.moved = true;
      swallow.current = true;
      setDragging(true);
      try { e.currentTarget.setPointerCapture(e.pointerId); d.cap = true; } catch { /* yoksay */ }
    }
    setPan(clamp({ x: d.pan.x + dx, y: d.pan.y + dy }, zoom));
  };

  const end = (e) => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) pinch.current = null;
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      if (d.cap) { try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* yoksay */ } }
      drag.current = null;
      setDragging(false);
    }
    // Sürükleme bittiği KAREDE gelen click yutulur, sonrakiler geçer
    if (swallow.current) setTimeout(() => { swallow.current = false; }, 0);
  };

  /** Fare tekerleği — masaüstünde de yakınlaştırma */
  const onWheel = (e) => {
    if (!enabled || !e.ctrlKey && !e.metaKey) return;   // sayfa kaydırmasını çalma
    e.preventDefault();
    setZoom(z => Math.max(min, Math.min(max, +(z * (e.deltaY < 0 ? 1.12 : 0.893)).toFixed(3))));
  };

  const onClickCapture = (e) => {
    if (swallow.current) { e.stopPropagation(); e.preventDefault(); }
  };

  return {
    zoom, pan, dragging, reset, setZoom,
    handlers: {
      onPointerDown, onPointerMove,
      onPointerUp: end, onPointerCancel: end, onPointerLeave: end,
      onWheel, onClickCapture,
      style: { touchAction: 'none' },
    },
  };
}
