/**
 * MapView — TEK harita.
 *
 * Dünya haritası ve üretim tarlaları artık aynı yüzey. Zoom'a göre üç kademe:
 *   • uzak  (< 0.42)  → dünya görünümü: köyler kademe renginde, kademe halkaları
 *   • orta  (< 1.0)   → köy toprakları küme olarak, isimler
 *   • yakın (>= 1.0)  → tek tek hex arazi; kendi toprağın etkileşimli tarlalar
 *
 * Kendi tarlalarının anahtarı YEREL (örn. '2,0'); arazi bonusu ise DÜNYA
 * koordinatından okunur (worldConfig.fieldMultiplier) — sunucuyla birebir aynı.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BUILDING_DEFS from '../data/buildingDefs';
import tahilImg  from '../assets/tahil_tile.png';
import ormanImg  from '../assets/orman_tile.png';
import demirImg  from '../assets/demir_madeni.png';
import kilImg    from '../assets/kil_ocagi.png';
import tasImg    from '../assets/tas_ocagi.png';
import bosImg    from '../assets/bos.png';
import merkezImg from '../assets/merkez2.png';
import {
  CLAIM_OFFSETS, HEX_NEIGHBORS, SQRT3,
  rand01, hexDistance, worldTileBonus, hexToPixel, pixelToHex, hexPoints,
} from '../data/worldConfig';
import { computePopoverPos } from './popoverStyle';
import { C, FONT, btn, label as lbl, num, short, fmtTime } from '../theme';
import { RES_LABEL, gameMinutesToRealSeconds } from '../flows';
import Icon from './Icons';
import SendArmyPanel from './SendArmyPanel';
import {
  AnaBinaPanel, FieldPanel, BuildFieldPanel, ForeignVillagePanel,
  TYPE_FILL, TYPE_EDGE, Row,
} from './mapPanels';

const S = 24;                 // hex yarıçapı (dünya birimi)
const REFRESH_MS = 15000;

const Z_MIN = 0.12, Z_MAX = 3.2;
const Z_TERRAIN = 1.0;        // bu zoom'dan sonra tek tek arazi
const Z_CLUSTER = 0.42;       // bu zoom'dan sonra köy toprakları küme
const Z_LABEL   = 1.5;        // tarla etiketleri
const MAX_WILD  = 2600;       // güvenlik freni
// Görünen alanın dışına fazladan çizilen kenar payı (px). Sürükleme sırasında
// SVG yeniden rasterize edilmez, katman GPU'da bu pay içinde kaydırılır.
const PAD = 300;
const COMMIT_AT = PAD * 0.75;

// Kademe renkleri — YEŞİL YOK. Yeşil yalnızca KENDİ toprağımın sınırı;
// T1 eskiden #6cdda3 (yeşil) olduğu için AI köyleri "benim gibi" görünüyordu.
const TIER_COLOR = { 1: '#9fb4c9', 2: '#8fdcff', 3: '#c0a8f8', 4: '#f2c86e', 5: '#ff8f7a' };
// DİKKAT: PLAYER_COL bunlara modül yüklenirken erişiyor — aşağıda kalırlarsa
// "Cannot access 'FOE_COLOR' before initialization" atıp uygulamayı hiç
// başlatmıyor (siyah ekran). Bu iki satır palet bloğunun ÜSTÜNDE kalmalı.
const SELF_COLOR = '#ffe89a';
const FOE_COLOR  = '#ff6f78';

/**
 * KÖY BAŞINA AYRI RENK.
 *
 * Kademe rengi paylaşıldığı için komşu köylerin toprağı ayırt edilemiyordu.
 * Rastgele hue de yetmiyor: 20 halka içinde iki komşu aynı tona düşüyordu
 * (ölçüm: Frostgard 263° / Havnfjell II 263°). Bu yüzden AÇGÖZLÜ BOYAMA —
 * her köy, 9 hex çevresindeki köylerin kullanmadığı ilk paletten alır.
 * Sıralama key'e göre deterministik, yani renkler her açılışta aynı.
 *
 * Palet 65–160° arasını atlar: yeşil yalnızca OYUNCUNUN toprağı.
 */
const PALETTE_H = [205, 30, 300, 45, 265, 340, 185, 15, 320, 230, 285, 355, 245, 170];
const hueColor = (h) => ({
  line: `hsl(${h} 80% 68%)`,
  soft: `hsla(${h}, 72%, 52%, 0.32)`,
});
const PLAYER_COL = { line: FOE_COLOR, soft: 'rgba(255,111,120,0.32)' };

/**
 * NPC KÖYLERİ GRİ.
 *
 * Köy başına ayrı hue rengarenk bir harita üretiyordu ve göz asıl önemli
 * şeyi (kendi toprağım / gerçek oyuncular) seçemiyordu. NPC'ler artık tek
 * nötr gri; renk yalnızca anlam taşıyanlara ayrıldı:
 *   sarı = benim · kırmızı = rakip oyuncu · koyu yeşil = birliğim (planlı)
 * `assignVillageHues` ve PALETTE_H hâlâ duruyor — birlik dışı ayrım gerekirse
 * geri dönmek için.
 */
const NPC_COL = { line: '#93a1ad', soft: 'rgba(147,161,173,0.26)' };

/**
 * Renge saydamlık ekle.
 *
 * DİKKAT — BU FONKSİYON BİR HATANIN İLACI: `${color}26` gibi dize birleştirme
 * YALNIZCA 6 haneli hex renklerde çalışır. NPC köy renkleri hsl() olduğu için
 * o birleştirme `hsl(205 80% 68%)26` gibi GEÇERSİZ bir renk üretiyordu;
 * tarayıcı geçersiz bir fill'i başlangıç değerine düşürüyor, yani OPAK SİYAH
 * yapıyor. Yabancı köy merkezlerindeki resmin üstünü kapatan şey buydu
 * (kendi köyümün rengi hex olduğu için orada sorun görünmüyordu).
 */
function alpha(color, a) {
  if (typeof color !== 'string') return color;
  const c = color.trim();
  const hex2 = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
  if (c[0] === '#') {
    if (c.length === 7) return c + hex2;                       // #rrggbb
    if (c.length === 4) {                                      // #rgb
      return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}${hex2}`;
    }
    return c;                                                  // zaten alfalı
  }
  // hsl()/rgb() — hem virgüllü hem boşluklu sözdizimini ayrıştır ve DAİMA
  // eski dörtlü biçimde yaz. Virgülle boşluğu karıştırmak (hsl(30, 80%, 68% / .3))
  // geçersiz; hsla(30, 80%, 68%, .3) her yerde geçerli.
  const m = c.match(/^(hsl|rgb)a?\((.*)\)$/i);
  if (m) {
    const parts = m[2].replace(/\//g, ' ').split(/[\s,]+/).filter(Boolean);
    const [p1, p2, p3] = parts;              // 4. bileşen varsa eski alfa, atılır
    if (p1 && p2 && p3) return `${m[1].toLowerCase()}a(${p1}, ${p2}, ${p3}, ${a})`;
    return c;
  }
  return c;
}

function assignVillageHues(villages) {
  const sorted = villages.filter(v => v.kind !== 'self')
    .sort((a, b) => a.key.localeCompare(b.key));
  const out = new Map();
  const placed = [];
  for (const v of sorted) {
    const used = new Set();
    for (const p of placed) {
      const dq = v.q - p.q, dr = v.r - p.r;
      if ((Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2 <= 9) used.add(p.h);
    }
    const h = PALETTE_H.find(x => !used.has(x)) ?? PALETTE_H[0];
    out.set(v.key, h);
    placed.push({ q: v.q, r: v.r, h });
  }
  return out;
}

const TEXTURE = { tahil: tahilImg, odun: ormanImg, demir: demirImg, kil: kilImg, tas: tasImg };

// Vahşi doğa — canlı doğal tonlar (mavi katman YOK)
const WILD_FILL = ['#2e3d21', '#354527', '#293620', '#3c4029', '#2b3a2a', '#43442c'];

const kk = (q, r) => `${q},${r}`;

const CLAIM_GREEN = '#7fe04d';

/**
 * ARAZİ CANVAS'TA ÇİZİLİR.
 *
 * Neden: SVG'de ~700-1500 vahşi hex, her transform değişiminde binlerce düğümün
 * yeniden rasterize edilmesi demekti; pan sırasında takılmaya yol açıyordu.
 * Canvas'ta hex başına TEK drawImage var, DOM düğümü yok. Etkileşimli parçalar
 * (kendi tarlalarım, köy merkezleri, sınır çizgileri) SVG'de kalır — onlar ~100 düğüm.
 *
 * Her doku bir kez hex maskeli "sprite"a pişirilir; çizim sırasında yalnızca blit edilir.
 */
const SPRITE = 96;                       // sprite çözünürlüğü (2S'nin 2 katı, zoom'a yeter)
const TEX_SRC = {
  bos: bosImg, odun: ormanImg, kil: kilImg, tas: tasImg, demir: demirImg, tahil: tahilImg,
};
const soilKey = (q, r) => `bos${Math.floor(rand01(q, r, 31) * WILD_FILL.length)}`;

function hexPath2D(cx, cy, s) {
  const p = new Path2D();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const x = cx + s * Math.cos(a), y = cy + s * Math.sin(a);
    if (i) p.lineTo(x, y); else p.moveTo(x, y);
  }
  p.closePath();
  return p;
}

let _sprites = null;
let _spritesPromise = null;

function buildSprites() {
  if (_sprites) return Promise.resolve(_sprites);
  if (_spritesPromise) return _spritesPromise;
  _spritesPromise = Promise.all(
    Object.entries(TEX_SRC).map(([k, src]) => new Promise((res) => {
      const im = new Image();
      im.onload = () => res([k, im]);
      im.onerror = () => res([k, null]);
      im.src = src;
    }))
  ).then((pairs) => {
    const imgs = Object.fromEntries(pairs);
    const out = {};
    const half = SPRITE / 2;
    const mask = hexPath2D(half, half, half);
    const mk = (key, img, tint) => {
      const c = document.createElement('canvas');
      c.width = c.height = SPRITE;
      const g = c.getContext('2d');
      g.save();
      g.clip(mask);
      if (img) g.drawImage(img, 0, 0, SPRITE, SPRITE);
      else { g.fillStyle = tint || '#2e3d21'; g.fillRect(0, 0, SPRITE, SPRITE); }
      if (tint) { g.globalAlpha = 0.45; g.fillStyle = tint; g.fillRect(0, 0, SPRITE, SPRITE); }
      g.restore();
      out[key] = c;
    };
    WILD_FILL.forEach((t, i) => mk(`bos${i}`, imgs.bos, t));
    ['odun', 'kil', 'tas', 'demir', 'tahil'].forEach((k) => mk(k, imgs[k], null));
    _sprites = out;
    return out;
  });
  return _spritesPromise;
}

/**
 * Görünür vahşi hex'leri hesapla (saf). Hem React memo'su hem de commit anındaki
 * imperatif canvas çizimi bunu kullanır — böylece ikisi hep aynı listeyi görür.
 */
function computeWild({ w, h, scale, pan, myClaim, tileOwners, radius }) {
  if (scale < Z_TERRAIN) return [];
  const halfW = (w / 2 + PAD) / scale + 2 * S;
  const halfH = (h / 2 + PAD) / scale + 2 * S;
  const cullX = Math.round(pan.x / S) * S;
  const cullY = Math.round(pan.y / S) * S;
  const xMin = -halfW - cullX, xMax = halfW - cullX;
  const yMin = -halfH - cullY, yMax = halfH - cullY;
  const qMin = Math.floor(xMin / (1.5 * S)) - 1;
  const qMax = Math.ceil(xMax / (1.5 * S)) + 1;
  const out = [];
  for (let q = qMin; q <= qMax; q++) {
    if (Math.abs(q) > radius) continue;
    const base = -q / 2;
    const rMin = Math.floor(yMin / (S * SQRT3) + base) - 1;
    const rMax = Math.ceil(yMax / (S * SQRT3) + base) + 1;
    for (let r = rMin; r <= rMax; r++) {
      if (hexDistance(q, r) > radius) continue;
      const key = kk(q, r);
      if (myClaim.has(key)) continue;
      out.push([q, r, tileOwners.get(key) || null]);
      if (out.length >= MAX_WILD) return out;
    }
  }
  return out;
}

/**
 * UZAK ZOOM ARAZİ RENKLERİ.
 *
 * Uzaklaştırınca dokular kapanıyor ve harita bomboş kalıyordu. Artık kaynak
 * hex'leri DÜZ renkle boyanıyor: resim yok, hex başına çizim yok — kaynak
 * türü başına TEK `fill()`. Tonlar bilinçli olarak soluk ve düşük doygunlukta;
 * amaç "bu ne" sorusunu uzaktan cevaplamak, harita rengarenk olmasın.
 * Bonussuz vahşi arazi hiç boyanmaz, zemin olarak kalır.
 */
const RES_FLAT = {
  odun:  '#3b5733',   // orman — yeşil
  tahil: '#7d7038',   // tahıl — buğday sarısı
  tas:   '#666b70',   // taş — gri
  kil:   '#7d5a41',   // kil — kiremit
  demir: '#4a5e6e',   // demir — çelik mavisi
};

/**
 * Tüm dünyanın kaynak hex'leri kaynak türüne göre TEK Path2D'de toplanır.
 * Deterministik (worldTileBonus) olduğu için yarıçap başına bir kez kurulur:
 * 60 yarıçapta ~2.160 hex, beş yol. Çizim maliyeti beş `fill()`.
 */
let _farPaths = null, _farRadius = -1;
function farResourcePaths(radius) {
  if (_farRadius === radius && _farPaths) return _farPaths;
  const paths = new Map();
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (hexDistance(q, r) > radius) continue;
      const b = worldTileBonus(q, r);
      if (!b || !RES_FLAT[b.resource]) continue;
      let p = paths.get(b.resource);
      if (!p) { p = new Path2D(); paths.set(b.resource, p); }
      const { x, y } = hexToPixel(q, r, S);
      p.addPath(hexPath2D(x, y, S));
    }
  }
  _farPaths = paths; _farRadius = radius;
  return paths;
}

/** Vahşi araziyi canvas'a çiz. Yalnızca pan/zoom commit'inde çağrılır. */
function drawTerrain(cv, { w, h, scale, pan, list, showBadge, radius = 60, worked = null }) {
  if (!cv) return;
  // Uzak zoom: sprite beklemeye gerek yok, düz renk yeter
  const far = scale < Z_TERRAIN;
  if (!far && !_sprites) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = w + 2 * PAD, H = h + 2 * PAD;
  const pxW = Math.round(W * dpr), pxH = Math.round(H * dpr);
  if (cv.width !== pxW || cv.height !== pxH) {
    cv.width = pxW; cv.height = pxH;
    cv.style.width = `${W}px`; cv.style.height = `${H}px`;
  }
  const ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, pxW, pxH);
  // dünya koordinatı → canvas pikseli
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale,
    dpr * (W / 2 + pan.x * scale), dpr * (H / 2 + pan.y * scale));

  // ── UZAK ZOOM: kaynak hex'leri düz renk, beş fill ──
  if (far) {
    // 1) dünyanın ham kaynak hex'leri — soluk
    const paths = farResourcePaths(radius);
    ctx.globalAlpha = 0.72;
    for (const [res, path] of paths) {
      ctx.fillStyle = RES_FLAT[res];
      ctx.fill(path);
    }
    /**
     * 2) İŞLENMİŞ TARLALAR — kurulu tarlanın TÜRÜ boyanır (ham bonus değil).
     * Oyuncu bonussuz bir hex'e de tarla kurabiliyor; o hex ham kaynak
     * listesinde olmadığı için uzak zoom'da bomboş kalıyordu. Kurulu tarlalar
     * ayrıca daha parlak çizilir: "işlenmiş toprak" ham araziden ayrılsın.
     */
    if (worked && worked.size) {
      ctx.globalAlpha = 1;
      for (const [res, pts] of worked) {
        const fill = RES_FLAT[res];
        if (!fill) continue;
        const path = new Path2D();
        for (const [x, y] of pts) path.addPath(hexPath2D(x, y, S));
        ctx.fillStyle = fill;
        ctx.fill(path);
      }
    }
    ctx.globalAlpha = 1;
    return;
  }

  // 1) dokular — hex başına tek blit.
  // Yabancı köyün KURULU tarlası varsa o kaynağın dokusu çizilir (boş arazi değil),
  // böylece AI köylerinin toprağı gerçekten işlenmiş görünür.
  const owned = [];
  const labels = [];

  // Ele geçirilmemiş arazi SOLUK çizilir; alınmış hex'ler tam parlaklıkta.
  // Böylece "kimin toprağı" bakışta ayrılıyor.
  ctx.globalAlpha = 0.5;
  for (const [q, r, owner] of list) {
    if (owner) continue;
    const { x, y } = hexToPixel(q, r, S);
    const b = worldTileBonus(q, r);
    const sp = _sprites[b ? b.resource : soilKey(q, r)];
    if (sp) ctx.drawImage(sp, x - S, y - S, S * 2, S * 2);
  }
  ctx.globalAlpha = 1;

  for (const [q, r, owner] of list) {
    if (!owner) continue;
    const { x, y } = hexToPixel(q, r, S);
    const b = worldTileBonus(q, r);
    const key = owner.tile ? owner.tile[0] : (b ? b.resource : soilKey(q, r));
    const sp = _sprites[key];
    if (sp) ctx.drawImage(sp, x - S, y - S, S * 2, S * 2);
    owned.push([x, y, owner]);
    // Seviye 0 = yabancı köyün tarlası (sunucu seviyeyi göndermiyor): rozet yok
    if (owner.tile && showBadge && owner.tile[1] > 0) labels.push([x, y, owner.tile[1]]);
  }

  // 2) sahiplik tonları — renge göre gruplanmış tek fill
  if (owned.length) {
    const byFill = new Map();
    for (const [x, y, owner] of owned) {
      let p = byFill.get(owner.fill);
      if (!p) { p = new Path2D(); byFill.set(owner.fill, p); }
      p.addPath(hexPath2D(x, y, S - 1));
    }
    for (const [fill, path] of byFill) { ctx.fillStyle = fill; ctx.fill(path); }
  }

  // 3) kenarlar — stile göre gruplanmış tek stroke.
  // Sahipsiz hex'ler çok soluk; alınmış hex'ler köyün KENDİ renginde ve kalın.
  const byStroke = new Map();
  const addStroke = (style, sw, x, y) => {
    const k = `${style}|${sw}`;
    let e = byStroke.get(k);
    if (!e) { e = { style, sw, path: new Path2D() }; byStroke.set(k, e); }
    e.path.addPath(hexPath2D(x, y, S - 1));
  };
  for (const [q, r, owner] of list) {
    const { x, y } = hexToPixel(q, r, S);
    const b = worldTileBonus(q, r);
    if (owner) addStroke(owner.col.line, owner.center ? 2.6 : 1.9, x, y);
    else if (b) addStroke(`${TYPE_EDGE[b.resource]}44`, 0.9, x, y);
    else addStroke('rgba(150,170,120,0.10)', 0.6, x, y);
  }
  for (const { style, sw, path } of byStroke.values()) {
    ctx.strokeStyle = style; ctx.lineWidth = sw; ctx.stroke(path);
  }

  // 3.5) yabancı tarlaların seviye etiketi
  if (labels.length) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 8px ${FONT.head}`;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(8,12,8,0.85)';
    for (const [x, y, lvl] of labels) {
      const t = `LVL ${lvl}`;
      ctx.strokeText(t, x, y + S - 7);
      ctx.fillStyle = '#e8f0ff';
      ctx.fillText(t, x, y + S - 7);
    }
  }

  // 4) bonus rozetleri — yabancı tarlanın üstüne basmasın
  if (showBadge) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `6.4px ${FONT.num}`;
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.75;
    for (const [q, r, owner] of list) {
      const b = worldTileBonus(q, r);
      if (!b || owner?.tile) continue;
      const { x, y } = hexToPixel(q, r, S);
      ctx.fillStyle = 'rgba(14,20,10,0.8)';
      ctx.fillRect(x - 11, y - 5, 22, 10);
      ctx.strokeStyle = `${TYPE_EDGE[b.resource]}99`;
      ctx.strokeRect(x - 11, y - 5, 22, 10);
      ctx.fillStyle = TYPE_EDGE[b.resource];
      ctx.fillText(`+${b.amount}%`, x, y + 0.3);
    }
    ctx.globalAlpha = 1;
  }
}

// Kenar i (köşe i → i+1) hangi komşuya bakıyor — dış normal 30°+60i
const EDGE_N = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
const CLAIM_LOCAL = ['0,0', ...CLAIM_OFFSETS.map(([q, r]) => kk(q, r))];
const CLAIM_SET = new Set(CLAIM_LOCAL);

/**
 * Bir hex kümesinin kesin sınırı: kümede olmayan komşuya bakan kenarların birleşimi.
 * Küme keyfi olabilir → hem tüm toprağın hem de yalnızca sahip olunan hex'lerin
 * çevresi aynı fonksiyonla çizilir.
 */
const _outlineCache = new Map();
function outlinePath(localKeys, cq, cr) {
  const inside = localKeys instanceof Set ? localKeys : new Set(localKeys);
  const ck = `${cq},${cr}|${[...inside].sort().join(';')}`;
  const hit = _outlineCache.get(ck);
  if (hit !== undefined) return hit;

  let d = '';
  for (const key of inside) {
    const [lq, lr] = key.split(',').map(Number);
    const { x, y } = hexToPixel(cq + lq, cr + lr, S);
    for (let i = 0; i < 6; i++) {
      const [dq, dr] = EDGE_N[i];
      if (inside.has(kk(lq + dq, lr + dr))) continue;
      const a0 = (Math.PI / 3) * i, a1 = (Math.PI / 3) * (i + 1);
      d += `M${(x + S * Math.cos(a0)).toFixed(1)} ${(y + S * Math.sin(a0)).toFixed(1)}`
        + `L${(x + S * Math.cos(a1)).toFixed(1)} ${(y + S * Math.sin(a1)).toFixed(1)}`;
    }
  }
  // 200+ köyün tamamı uzak zoom'da çiziliyor; sınır düşük kalırsa önbellek
  // her karede temizlenip yeniden hesaplanıyordu.
  if (_outlineCache.size > 4000) _outlineCache.clear();
  _outlineCache.set(ck, d);
  return d;
}

// ── Vahşi hex ────────────────────────────────────────────────────────
// ── Yabancı köy merkezi (yakın zoom) ─────────────────────────────────
function ForeignCore({ v, color, hovered, onEnter, onLeave, onClick }) {
  const { x, y } = hexToPixel(v.q, v.r, S);
  const pts = hexPoints(x, y, S - 1);
  const clipId = `vc-${v.q}-${v.r}`;
  return (
    <g onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onClick}
      transform={hovered ? `translate(${x} ${y}) scale(1.08) translate(${-x} ${-y})` : undefined}
      style={{ cursor: 'pointer', transition: 'transform .12s ease-out' }}>
      <defs><clipPath id={clipId}><polygon points={pts} /></clipPath></defs>
      <polygon points={pts} fill="#39310f" />
      <image href={merkezImg} x={x - S} y={y - S} width={S * 2} height={S * 2}
        clipPath={`url(#${clipId})`} preserveAspectRatio="xMidYMid slice" />
      <polygon points={pts} fill={alpha(color, 0.15)} />
      <polygon points={pts} fill="none" stroke={color} strokeWidth={hovered ? 2.6 : 1.8} />
    </g>
  );
}

// ── Kendi toprağındaki tarla ─────────────────────────────────────────
function FieldHex({
  wq, wr, lq, lr, tile, isCenter, isSelected, isHovered,
  buildable, anaBinaLevel, showLabels, onClick, onEnter, onLeave,
}) {
  const { x, y } = hexToPixel(wq + lq, wr + lr, S);
  const bonus = worldTileBonus(wq + lq, wr + lr);
  const applied = tile && bonus && bonus.resource === tile.type;

  const fill = isCenter ? '#3f3413'
    : tile ? (TYPE_FILL[tile.type] || '#2a4a1a')
    : buildable ? '#243019' : '#1d2415';

  const stroke = isSelected ? '#fff4c0'
    : isHovered ? '#ffe89a'
    : isCenter ? SELF_COLOR
    : tile ? (TYPE_EDGE[tile.type] || '#8a9a78')
    : buildable ? 'rgba(190,235,130,0.55)' : 'rgba(150,170,120,0.3)';

  const texture = isCenter ? merkezImg
    : tile ? (TEXTURE[tile.type] || bosImg)
    : bonus ? (TEXTURE[bonus.resource] || bosImg) : bosImg;

  const clipId = `mv-${wq + lq}-${wr + lr}`;
  const idle = tile && !tile.upgrading && !(tile.workers > 0);
  const maxW = tile ? (BUILDING_DEFS[tile.type]?.levels?.[tile.level - 1]?.workers || 1) : 0;

  return (
    /* data-tile: yerleşim penceresi bu hex'lere karışmasın (bkz. onUp) */
    /* data-tut: rehber spotlight'ının hedefi (tarla cinsi ya da boş hex) */
    <g data-tile="1" data-tut={isCenter ? 'bina-anaBina' : tile ? `tarla-${tile.type}` : 'tarla-bos'}
      onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave}
      transform={isHovered || isSelected
        ? `translate(${x} ${y}) scale(${isSelected ? 1.11 : 1.08}) translate(${-x} ${-y})`
        : undefined}
      style={{ cursor: 'pointer', transition: 'transform .12s ease-out' }}>
      <defs>
        <clipPath id={clipId}><polygon points={hexPoints(x, y, S - 1)} /></clipPath>
      </defs>

      <polygon points={hexPoints(x, y, S - 1)} fill={fill} />
      <image href={texture}
        x={x - S} y={y - S} width={S * 2} height={S * 2}
        clipPath={`url(#${clipId})`}
        opacity={isCenter ? 1 : tile ? 0.95 : 0.55}
        preserveAspectRatio="xMidYMid slice" />
      <polygon points={hexPoints(x, y, S - 1)} fill="none" stroke={stroke}
        strokeWidth={isSelected ? 3 : isHovered ? 2.6 : isCenter ? 2.2 : tile ? 1.6 : 1.2}
        strokeDasharray={!tile && !isCenter ? '4 3' : undefined} />
      {isSelected && (
        <polygon points={hexPoints(x, y, S + 2.5)} fill="none" stroke="#fff4c0"
          strokeWidth={1} opacity={0.5} />
      )}

      {showLabels && bonus && !isCenter && (
        <g>
          <rect x={x - 11} y={y - S + 5.5} width={22} height={9.5} rx={2}
            fill={applied ? 'rgba(28,64,20,0.92)' : 'rgba(20,26,14,0.86)'}
            stroke={applied ? '#9ee06a' : 'rgba(160,210,110,0.5)'} strokeWidth={0.6} />
          <text x={x} y={y - S + 10.5} textAnchor="middle" dominantBaseline="middle"
            fontFamily={FONT.num} fontSize={6.4} fill={applied ? '#d4f5a8' : '#b8d868'}
            style={{ userSelect: 'none' }}>+{bonus.amount}%</text>
        </g>
      )}

      {isCenter ? (
        showLabels && (
          <text x={x} y={y + S - 7} textAnchor="middle" dominantBaseline="middle"
            fontFamily={FONT.head} fontSize={8} fontWeight="700" fill="#fff8d8"
            stroke="#2a1c04" strokeWidth={2} paintOrder="stroke" style={{ userSelect: 'none' }}>
            LVL {anaBinaLevel}
          </text>
        )
      ) : tile ? (
        showLabels && (
          <>
            <g transform={`translate(${x - 11} ${y - 10})`}>
              <rect x="0" y="0" width="22" height="9.5" rx="2"
                fill={idle ? 'rgba(74,20,20,0.9)' : 'rgba(16,26,12,0.85)'}
                stroke={idle ? '#c85050' : 'rgba(200,230,160,0.5)'} strokeWidth="0.6" />
              <text x="11" y="5.1" textAnchor="middle" dominantBaseline="middle"
                fontFamily={FONT.num} fontSize="6.6" fill={idle ? '#ffbcbc' : '#e8f5c8'}
                style={{ userSelect: 'none' }}>{tile.workers || 0}/{maxW}</text>
            </g>
            <text x={x} y={y + S - 7} textAnchor="middle" dominantBaseline="middle"
              fontFamily={FONT.head} fontSize={8} fontWeight="700"
              fill={tile.upgrading ? '#ffd98a' : '#fff8d8'}
              stroke="#2a1c04" strokeWidth={2} paintOrder="stroke" style={{ userSelect: 'none' }}>
              {tile.upgrading ? '⟳' : `LVL ${tile.level}`}
            </text>
          </>
        )
      ) : buildable && (
        <path d={`M ${x - 6} ${y} H ${x + 6} M ${x} ${y - 6} V ${y + 6}`}
          stroke="rgba(205,245,155,0.7)" strokeWidth="1.7" strokeLinecap="round" fill="none" />
      )}
    </g>
  );
}

// ── Köy işareti (her zoom'da) ────────────────────────────────────────
function VillageMark({ v, scale, color, hovered, selected, onEnter, onLeave, onClick }) {
  const { x, y } = hexToPixel(v.q, v.r, S);
  const isSelf = v.kind === 'self';
  const on = hovered || selected;
  const near = scale >= Z_TERRAIN;
  /**
   * Uzaklaştırınca artık toprak şekli asıl görsel; köy işareti yalnızca
   * merkezi belli etsin diye küçük kalıyor (eskiden puana göre büyüyen
   * altıgen toprak şeklini bastırıyordu).
   */
  const rad = near
    ? S * 0.78
    : S * (isSelf ? 0.62 : 0.40 + Math.min(0.16, (v.score || 500) / 40000));

  return (
    <g onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onClick}
      style={{ cursor: 'pointer' }}>
      {isSelf && !near && scale >= Z_CLUSTER && (
        <circle cx={x} cy={y} r={S * 1.7} fill="none" stroke={CLAIM_GREEN}
          strokeWidth={1.2 / scale} opacity={0.5}>
          <animate attributeName="r" values={`${S * 1.4};${S * 2.2};${S * 1.4}`}
            dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="3s" repeatCount="indefinite" />
        </circle>
      )}
      <polygon points={hexPoints(x, y, rad)}
        fill={alpha(color, on ? 0.4 : near ? 0.27 : 0.19)}
        stroke={color} strokeWidth={(on ? 2.4 : isSelf ? 2 : 1.2) / Math.max(0.5, scale)} />
      {near && (
        <path d={`M ${x - 6} ${y + 4} L ${x - 6} ${y - 2} L ${x} ${y - 7} L ${x + 6} ${y - 2} L ${x + 6} ${y + 4} Z`}
          fill="none" stroke={color} strokeWidth={1.2} opacity={0.85} />
      )}
      {scale > 0.72 && (
        <text x={x} y={y + rad + 9 / Math.max(0.5, scale)} textAnchor="middle"
          fontFamily={FONT.ui} fontSize={8 / Math.max(0.5, scale)}
          fill={on ? C.frost : C.textFaint} style={{ userSelect: 'none' }}>
          {v.name}
        </text>
      )}
    </g>
  );
}

// ── Hover kartı ──────────────────────────────────────────────────────
function HoverCard({ title, sub, icon, iconColor, rows, note, railInset = 0 }) {
  return (
    <div style={{
      position: 'absolute', top: 10, right: railInset + 10, width: 232, zIndex: 40,
      background: 'linear-gradient(180deg, rgba(13,26,42,0.78), rgba(9,18,30,0.78))',
      border: `1px solid ${C.lineBright}`, borderRadius: 7, padding: 10,
      boxShadow: '0 10px 30px rgba(0,0,0,.5)',
      backdropFilter: 'blur(20px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.2)', pointerEvents: 'none',
    }} className="tn-rise">
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <Icon name={icon} size={17} color={iconColor || C.ice} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT.head, fontSize: 13.5, fontWeight: 600, letterSpacing: 0.7,
            color: C.frost, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{title}</div>
          <div style={lbl({ fontSize: 8 })}>{sub}</div>
        </div>
      </div>
      {rows.map(([k, v, c, strong]) => <Row key={k} k={k} v={v} c={c} strong={strong} />)}
      {note && (
        <div style={{
          marginTop: 6, fontFamily: FONT.ui, fontSize: 9.5, lineHeight: 1.5, color: C.textFaint,
        }}>{note}</div>
      )}
    </div>
  );
}

// ── Ana bileşen ──────────────────────────────────────────────────────
/** Sunucunun yerleşim ret sebepleri — okunur karşılıkları */
const SETTLE_ERR = {
  koy_hakki_yok:          'Köy hakkın yok — köşk ya da saray seviyesi yetmiyor',
  kultur_puani_yetmez:    'Kültür puanı yetmiyor — taverna şöleni puanı hızlandırır',
  bonus_arazi:            'Bonuslu arazi — köy merkezi bonusu heba eder',
  arazi_bos_degil:        'Bu arazide zaten bir köy var',
  dunya_disi:             'Dünyanın dışı',
  gecersiz_hedef:         'Geçersiz hedef',
  sefer_limiti:           'Sefer limiti dolu',
  yerlesim_yalniz_gocmen: 'Yerleşim seferine yalnız göçmen katılır',
  gocmen_sayisi_yanlis:   'Tam 3 göçmen gerekiyor',
  yetersiz_asker:         'Yeterli göçmen yok',
  konum_yok:              'Köyünün konumu bulunamadı',
};

/**
 * BOŞ ARAZİ PANELİ — göçmen gönderip yeni köy kurma.
 *
 * Yalnız göçmen gider (asker eşlik edemez) ve gidiş TEK YÖN: sefer başladı
 * mı geri çağrılamaz, varışta arazi dolmuşsa göçmenler kaybolur. Sunucu
 * ayrıca köy hakkını (köşk/saray seviyesi + kültür puanı) kontrol eder.
 */
function SettlePanel({ slot, distance, gocmen, gerekli, unitDefs, engel = null,
  sunucuHatasi = null, box = { w: 900, h: 700 },
  /*
    DOKUNMATIK: "Sahibi" ve "arazi bonusu" bilgisi eskiden YALNIZ fareyle
    uzerine gelince cikan kartta vardi. Parmakla dokununca hover kartı hic
    olusmuyor, dokunma dogrudan bu paneli aciyordu — yani telefonda arazinin
    kime ait oldugu hicbir yerde gorunmuyordu. Artik panelin kendisi yaziyor.
  */
  owner = null, bonus = null, ownerColor = null,
  hourSeconds, worldSpeed, onSend, onClose }) {
  const hiz = unitDefs?.gocmen?.stats?.hiz || 5;
  const secs = gameMinutesToRealSeconds(Math.max(10, (distance / hiz) * 60),
    hourSeconds, worldSpeed);
  const yeter = gocmen >= gerekli && !engel;

  return (
    <div className="tn-rise"
      /*
        Panelin ÜSTÜNDEKİ tıklamalar haritaya sızmasın: sızarsa harita
        onPointerUp'ı yeni bir hex seçip paneli yeniden kuruyor ve
        düğmeye basılamıyordu.
      */
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
      position: 'absolute',
      left: Math.max(8, Math.min((slot.sx ?? box.w - 290) + 14, box.w - 276)),
      top: Math.max(8, Math.min((slot.sy ?? box.h - 240) + 14, box.h - 250)),
      width: 268, zIndex: 30,
      background: 'rgba(8,15,24,0.94)', border: `1px solid ${C.lineBright}`,
      borderRadius: 9, padding: 12,
      boxShadow: '0 18px 40px rgba(0,0,0,0.6)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
        <Icon name="koy" size={16} color={C.iceDeep} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT.head, fontSize: 14, color: C.frost }}>Boş Arazi</div>
          <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint }}>
            {slot.key} · {distance} hex
          </div>
        </div>
        <button onClick={onClose} title="Kapat" style={{
          width: 24, height: 24, display: 'grid', placeItems: 'center', padding: 0,
          borderRadius: 12, cursor: 'pointer',
          background: 'rgba(8,14,24,0.7)', border: `1px solid ${C.lineSoft}`,
        }}>
          <Icon name="kapat" size={12} color={C.textDim} strokeWidth={2} />
        </button>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '6px 8px', borderRadius: 5, marginBottom: 9,
        background: yeter ? 'rgba(78,207,168,0.07)' : 'rgba(224,179,87,0.08)',
        border: `1px solid ${yeter ? 'rgba(78,207,168,0.25)' : 'rgba(224,179,87,0.3)'}`,
      }}>
        <Icon name={yeter ? 'isci' : 'uyari'} size={12} color={yeter ? C.good : C.warn} />
        <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: yeter ? C.textDim : '#e8cf9a', flex: 1 }}>
          Göçmen {gocmen}/{gerekli}
        </span>
        <span style={num({ fontSize: 10, color: C.iceDeep })}>{fmtTime(secs)}</span>
      </div>

      {/* Arazi künyesi — dokunmatikte hover kartının yerini tutar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '3px 12px', marginBottom: 9,
        padding: '5px 8px', borderRadius: 5,
        background: 'rgba(8,14,24,0.55)', border: `1px solid ${C.lineSoft}`,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint }}>Sahibi</span>
          <span style={{
            fontFamily: FONT.ui, fontSize: 9.5,
            color: owner ? (ownerColor || C.frost) : C.good,
          }}>
            {owner
              ? (owner.kind === 'player' && owner.owner
                ? `${owner.name} · ${owner.owner}` : owner.name)
              : 'sahipsiz'}
          </span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint }}>Arazi bonusu</span>
          <span style={num({ fontSize: 9.5, color: bonus ? C.warn : C.textMute })}>
            {bonus ? `+%${bonus.amount} ${RES_LABEL[bonus.resource] || bonus.resource}` : 'yok'}
          </span>
        </span>
      </div>

      {(engel || sunucuHatasi) ? (
        <div style={{
          display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 9,
          padding: '6px 8px', borderRadius: 5,
          background: 'rgba(232,99,111,0.08)', border: '1px solid rgba(232,99,111,0.3)',
        }}>
          <Icon name="uyari" size={11} color={C.danger} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontFamily: FONT.ui, fontSize: 9, lineHeight: 1.5, color: '#f0b8bd' }}>
            {sunucuHatasi || engel}
          </span>
        </div>
      ) : (
        <div style={{ fontFamily: FONT.ui, fontSize: 9, lineHeight: 1.5, color: C.textMute, marginBottom: 9 }}>
          Üç göçmen buraya yerleşip yeni bir köy kurar. Gidiş tek yön —
          sefer geri çağrılamaz.
        </div>
      )}

      <button onClick={onSend} disabled={!yeter}
        title={engel || (yeter ? 'Göçmenleri gönder'
          : `${gerekli} göçmen gerekiyor (köşk ya da sarayda eğitilir)`)}
        style={btn(yeter ? 'good' : 'disabled', {
          width: '100%', padding: '7px 0', letterSpacing: 1, fontSize: 10.5,
        })}>
        KÖY KUR
      </button>
    </div>
  );
}

export default function MapView({
  socket, world, productionTiles = {}, maxProductionSlots = 6, anaBina,
  freeWorkers = 0, resources = {}, flows = {}, railInset = 0, myArmy = 0,
  army = {}, unitDefs = {}, unitStatsNow = {}, intel = {}, marchInfo = {},
  onBuild, onUpgrade, onDemolish, onAssignWorkers, onCancelBuild,
  onUpgradeAnaBina, onEnterVillageCenter,
  // Panel açıkken rehber kartı rozete iner (bkz. QuestGuide.jsx)
  onPanelChange,
  hourSeconds = 3600, worldSpeed = 1,
}) {
  const wq = world?.q || 0;
  const wr = world?.r || 0;
  /** Yeni köy için gereken göçmen — sunucudaki SETTLERS_REQUIRED ile aynı */
  const GOCMEN_GEREKLI = 3;
  const gocmenSayisi = army?.gocmen || 0;

  const [snap, setSnap] = useState(null);
  const [scale, setScale] = useState(1.6);
  const [pan, setPan] = useState(() => {
    const p = hexToPixel(wq, wr, S);
    return { x: -p.x, y: -p.y };
  });
  const [size, setSize] = useState({ w: 900, h: 700 });
  const [dragging, setDragging] = useState(false);
  const [hoverField, setHoverField] = useState(null);   // yerel anahtar
  const [hoverVillage, setHoverVillage] = useState(null);
  const [hoverWild, setHoverWild] = useState(null);      // dünya anahtarı
  const [spritesReady, setSpritesReady] = useState(!!_sprites);
  const [snapSeq, setSnapSeq] = useState(0);
  const [dbg, setDbg] = useState(null);      // D tuşu: imleç/hex ölçümü
  const [selField, setSelField] = useState(null);       // yerel anahtar
  // Göçmen gönderilecek boş dünya slotu (yeni köy)
  const [selEmpty, setSelEmpty] = useState(null);
  // Yerleşim seferinde sunucudan dönen ret sebebi
  const [settleErr, setSettleErr] = useState(null);
  const [selVillage, setSelVillage] = useState(null);
  /*
    Tarla / boş arazi / köy panellerinden biri açık mı — rehber kartı bu
    paneller açıkken rozete iniyor (bkz. QuestGuide.jsx).
  */
  useEffect(() => {
    onPanelChange?.(!!(selField || selEmpty || selVillage));
  }, [selField, selEmpty, selVillage, onPanelChange]);
  /*
    Sekme değişince bu bileşen sökülüyor ama panel bayrağı App'te asılı
    kalıyordu: rehber kartı başka ekranda da rozette takılı kalırdı.
    Sıfırlamayı bileşenin kendisi yapıyor — App'e sekmeye bağlı ayrı bir
    efekt koymak yerine (setState-in-effect) sahiplik burada duruyor.
  */
  useEffect(() => () => onPanelChange?.(false), [onPanelChange]);
  const [filterTier, setFilterTier] = useState(null);
  const [sendTarget, setSendTarget] = useState(null);   // ordu gönderme ekranı

  const ref = useRef(null);
  const layerRef = useRef(null);
  const gRef = useRef(null);
  const canvasRef = useRef(null);
  const svgRef = useRef(null);       // sürüklenebilir yüzeyi tanımak için
  const layerOff = useRef({ x: 0, y: 0 });   // katmanın CANLI CSS ofseti (px)
  const suppressClick = useRef(false);       // sürüklemeden sonra tıklamayı yut
  const dragRef = useRef(null);

  // ── Arazi dokularını bir kez pişir ──
  useEffect(() => {
    let alive = true;
    buildSprites().then(() => { if (alive) setSpritesReady(true); });
    return () => { alive = false; };
  }, []);

  // ── Dünya verisi ──
  useEffect(() => {
    if (!socket) return;
    const onSnap = (d) => { setSnap(d); setSnapSeq(n => n + 1); };
    socket.on('world_snapshot', onSnap);
    socket.emit('request_world');
    const iv = setInterval(() => socket.emit('request_world'), REFRESH_MS);
    return () => { socket.off('world_snapshot', onSnap); clearInterval(iv); };
  }, [socket]);

  // ── Ölçü ──
  useEffect(() => {
    if (!ref.current) return;
    const update = () => {
      const r = ref.current.getBoundingClientRect();
      setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const recenter = useCallback((z = 1.6) => {
    const p = hexToPixel(wq, wr, S);
    const next = { x: -p.x, y: -p.y };
    setPan(next); setScale(z);
  }, [wq, wr]);

  // Köy konumu ilk kez gelince/değişince köyüne ortala
  const centeredAt = useRef(null);
  useEffect(() => {
    const key = kk(wq, wr);
    if (centeredAt.current === key) return;
    centeredAt.current = key;
    const p = hexToPixel(wq, wr, S);
    setPan({ x: -p.x, y: -p.y });
  }, [wq, wr]);

  // ── Girdi ──
  /**
   * Basış/kaydırma HARİTA YÜZEYİNDE mi başladı?
   *
   * Popover'lar (tarla paneli, yabancı köy paneli), zoom düğmeleri ve kademe
   * filtresi haritanın DOM ÇOCUĞU. Onlara basınca olay yukarı baloncuklanıp
   * sürükleme başlatıyordu; sürükleme 3 px sonra setPointerCapture çağırdığı
   * için tarayıcı 'click' olayını da harita kabına taşıyordu — panel içindeki
   * düğmeye basılamıyor, harita kayıyordu ("ORDU GÖNDER'e basamıyorum,
   * arka planda haritadan yerler seçiyor"). Yalnızca kabın kendisi, katman ve
   * ana SVG sürüklenebilir sayılır.
   */
  const onMapSurface = (e) => {
    const t = e.target;
    if (!t) return false;
    if (t === ref.current || t === layerRef.current || t === canvasRef.current) return true;
    return !!(svgRef.current && svgRef.current.contains(t));
  };

  function onWheel(e) {
    if (!onMapSurface(e)) return;   // panel içinde kaydırırken harita zoom yapmasın
    e.preventDefault();
    setScale(s => Math.max(Z_MIN, Math.min(Z_MAX, +(s * (e.deltaY < 0 ? 1.13 : 0.885)).toFixed(3))));
  }
  /** İç <g>'nin transform'u — React'in üreteceğiyle BİREBİR aynı olmalı */
  const panTransform = (px, py) =>
    `translate(${size.w / 2 + PAD} ${size.h / 2 + PAD}) scale(${scale}) translate(${px} ${py})`;

  /** Katmanı ve pan'i doğrudan DOM'dan yaz — React render'ı yok, GPU kompozisyonu var */
  const shiftLayer = (dx, dy) => {
    layerOff.current = { x: dx, y: dy };
    const el = layerRef.current;
    if (el) el.style.transform = (dx || dy) ? `translate3d(${dx}px,${dy}px,0)` : '';
  };

  /**
   * Pan'i commit et. Kritik nokta: yeni pan ile katman sıfırlaması AYNI karede,
   * ikisi de doğrudan DOM'a yazılır. setPan sonradan tam aynı değeri render eder,
   * bu yüzden React yakaladığında hiçbir görsel kayma olmaz.
   * (Bunu flushSync ile yapmak bırakma anında bir kare zıplamaya yol açıyordu.)
   */
  const drawSig = useRef('');
  // TAM hassasiyet: commit'te çizilen pan ile effect'in gördüğü pan birebir aynı olmalı,
  // yoksa küçük pan değişimlerinde canvas eski konumda kalır.
  const sigOf = (px, py, sc) => `${size.w}|${size.h}|${sc}|${px}|${py}|${snapSeq}`;

  const paint = (px, py) => {
    const np = { x: px, y: py };
    drawTerrain(canvasRef.current, {
      w: size.w, h: size.h, scale, pan: np, showBadge: scale >= Z_LABEL, radius,
      worked: workedTiles,
      list: computeWild({ w: size.w, h: size.h, scale, pan: np, myClaim, tileOwners, radius }),
    });
    drawSig.current = sigOf(px, py, scale);
  };

  const commitPan = (px, py) => {
    // Üç DOM yazısı da AYNI karede: SVG transform, canvas içeriği, katman sıfırlaması.
    if (gRef.current) gRef.current.setAttribute('transform', panTransform(px, py));
    if (spritesReady || scale < Z_TERRAIN) paint(px, py);
    shiftLayer(0, 0);
    setPan({ x: px, y: py });
  };

  // Pointer capture'ı SADECE gerçek sürüklemede al.
  // Capture aktifken tarayıcı click olayını da capture elemanına yönlendirir,
  // hex'in onClick'i hiç tetiklenmez — panellerin açılmamasının nedeni buydu.
  /**
   * İKİ PARMAKLA YAKINLAŞTIRMA.
   *
   * Zoom yalnız fare tekerleğine bağlıydı; telefonda haritayı yakınlaştırmanın
   * hiçbir yolu yoktu (sayfanın kendi pinch'i de kapalı, `touchAction: none`).
   * İkinci parmak inince sürükleme iptal edilir ve parmaklar arası mesafenin
   * oranı ölçeğe uygulanır.
   */
  const ptrsRef = useRef(new Map());
  const pinchRef = useRef(null);

  function onDown(e) {
    if (!onMapSurface(e)) return;
    ptrsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrsRef.current.size === 2) {
      const [a, b] = [...ptrsRef.current.values()];
      pinchRef.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: scale };
      // Tek parmak sürüklemesi vardıysa kapat, yoksa harita kayarak zıplıyor
      if (dragRef.current) { endDrag(e); }
      suppressClick.current = true;
      return;
    }
    if (e.button === 1 || e.button === 2) e.preventDefault();
    dragRef.current = {
      id: e.pointerId, el: e.currentTarget,
      x: e.clientX, y: e.clientY, px: pan.x, py: pan.y,
      cx: 0, cy: 0,            // commit edilmiş piksel ofseti
      dx: 0, dy: 0,            // son bilinen toplam ofset
      moved: false, captured: false,
    };
  }
  function onMove(e) {
    const pt = ptrsRef.current.get(e.pointerId);
    if (pt) { pt.x = e.clientX; pt.y = e.clientY; }
    if (pinchRef.current && ptrsRef.current.size >= 2) {
      const [a, b] = [...ptrsRef.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const k = pinchRef.current.z * (dist / pinchRef.current.d);
      setScale(Math.max(Z_MIN, Math.min(Z_MAX, +k.toFixed(3))));
      return;
    }
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved) {
      if (Math.abs(dx) + Math.abs(dy) <= 3) return;   // tıklama titremesi
      d.moved = true;
      try { d.el.setPointerCapture(e.pointerId); d.captured = true; } catch (_) { /* yok say */ }
      setDragging(true);
    }
    d.dx = dx; d.dy = dy;
    const ox = dx - d.cx, oy = dy - d.cy;
    if (Math.abs(ox) > COMMIT_AT || Math.abs(oy) > COMMIT_AT) {
      d.cx = dx; d.cy = dy;                            // kenar payı tükendi
      commitPan(d.px + dx / scale, d.py + dy / scale);
    } else {
      shiftLayer(ox, oy);
    }
  }
  /**
   * Sürüklemeyi bitir. Olay nesnesi OLMADAN da çağrılabilir, çünkü fare pencere
   * dışında bırakıldığında pointerup hiç gelmiyor: dragRef.moved true kalıyor
   * (hover donuyor) ve katmanın CSS ofseti sıfırlanmadığı için harita pan'a göre
   * kaymış kalıyor — imlecin yanlış yerde algılanmasının sebebi buydu.
   */
  const endDrag = (e) => {
    const d = dragRef.current;
    if (!d) return;
    if (Number.isFinite(e?.clientX)) { d.dx = e.clientX - d.x; d.dy = e.clientY - d.y; }
    if (d.moved) commitPan(d.px + d.dx / scale, d.py + d.dy / scale);
    else shiftLayer(0, 0);
    if (d.captured) {
      try { d.el.releasePointerCapture(d.id); } catch (_) { /* yok say */ }
    }
    suppressClick.current = d.moved;
    dragRef.current = null;
    setDragging(false);
    setTimeout(() => { suppressClick.current = false; }, 0);
  };
  const onUp = (e) => {
    ptrsRef.current.delete(e.pointerId);
    if (ptrsRef.current.size < 2) pinchRef.current = null;
    const surukledi = !!dragRef.current?.moved;
    endDrag(e);
    /*
      BOŞ ARAZİYE TIKLAMA — küçük yerleşim penceresini açar.
      Ayrı bir "köy kur" modu yok: haritada boş bir hex'e basmak yeter,
      açılan pencerede KÖY KUR düğmesi var (göçmen yetmiyorsa kapalı).
      Köy işaretleri ve kendi topraklarım kendi tıklamalarını yönetiyor,
      onlara dokunmuyoruz. Kuralları sunucu denetliyor.
    */
    /*
      Kendi tarlalarımın ve "+" hex'lerimin üstüne tıklandıysa karışma:
      onların kendi tıklamaları var (data-tile). Hex'i piksel→hex
      hesabıyla bulmak birkaç piksellik sapma yapabildiği için DOM
      hedefine bakmak daha güvenilir.
    */
    const tarlayaBasti = !!e.target?.closest?.('[data-tile]');
    const haritayaBasti = !!e.target?.closest?.('[data-map]');
    if (!surukledi && haritayaBasti && !tarlayaBasti) {
      const h = hexFromEvent(e);
      if (h && !koyluHexler.has(h.key) && !myClaim.has(h.key)) {
        // Pencere tıklanan yerin YANINDA açılsın: kap içi piksel konumu
        const rc = ref.current?.getBoundingClientRect();
        const sx = rc ? e.clientX - rc.left : 0;
        const sy = rc ? e.clientY - rc.top : 0;
        setSelField(null); setSelVillage(null);
        setSelEmpty(prev => (prev?.key === h.key
          ? null
          : { key: h.key, q: h.q, r: h.r, name: 'Boş Arazi', sx, sy }));
      }
    }
  };
  // Fare pencere dışında bırakılsa da sürükleme kapanır
  const endDragRef = useRef(endDrag);
  endDragRef.current = endDrag;
  useEffect(() => {
    if (!dragging) return;
    const fin = (e) => endDragRef.current(e);
    window.addEventListener('pointerup', fin);
    window.addEventListener('pointercancel', fin);
    window.addEventListener('blur', fin);
    return () => {
      window.removeEventListener('pointerup', fin);
      window.removeEventListener('pointercancel', fin);
      window.removeEventListener('blur', fin);
    };
  }, [dragging]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const step = 80 / scale;
      if (e.key === 'ArrowLeft') setPan(p => ({ ...p, x: p.x + step }));
      else if (e.key === 'ArrowRight') setPan(p => ({ ...p, x: p.x - step }));
      else if (e.key === 'ArrowUp') setPan(p => ({ ...p, y: p.y + step }));
      else if (e.key === 'ArrowDown') setPan(p => ({ ...p, y: p.y - step }));
      else if (e.key === '+' || e.key === '=') setScale(s => Math.min(Z_MAX, s * 1.15));
      else if (e.key === '-') setScale(s => Math.max(Z_MIN, s / 1.15));
      else if (e.key === 'Home') recenter();
      else if (e.key === 'Escape') { setSelField(null); setSelVillage(null); setSelEmpty(null); }
      else if (e.key === 'd' || e.key === 'D') setDbg(d => (d ? null : { on: true }));
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scale, recenter]);

  // ── Köyler ve toprak sahipliği ──
  const villages = useMemo(() => snap?.villages || [], [snap]);
  /** Üzerinde köy olan hex'ler — bunlara tıklamak yerleşim penceresi açmaz */
  const koyluHexler = useMemo(() => new Set(villages.map(v => v.key)), [villages]);

  const shownVillages = useMemo(() => {
    if (!filterTier) return villages;
    return villages.filter(v => v.kind !== 'npc' || v.tier === filterTier);
  }, [villages, filterTier]);

  /** dünya hex anahtarı → sahibi (kendi köyün hariç) */
  /**
   * İKİ AYRI KATMAN:
   *  • claimBlocked — başka köyün toprağı (kurulamaz). Renklendirilmez, çünkü
   *    "almadıkları alanı renklendirme" isteği bu. Yalnızca benim + işaretlerimin
   *    oraya çıkmasını engeller.
   *  • tileOwners  — GERÇEKTEN alınmış hex'ler: köy merkezi + kurulu tarlalar.
   *    Renk, çerçeve ve tam parlaklık yalnızca bunlara uygulanır.
   */
  const villageHues = useMemo(() => assignVillageHues(villages), [villages]);
  const colOf = useCallback((v) => (
    v.kind === 'player' ? PLAYER_COL
      : v.kind === 'npc' ? NPC_COL
      : hueColor(villageHues.get(v.key) ?? PALETTE_H[0])
  ), [villageHues]);

  /*
    YAYILMA YALNIZ YABANCI TOPRAKTA DURUR.
    Kendi köylerimin alanları birbirine girebilir — bu bilinçli bir
    karar (ileride ticaret rotaları). Yani sınır ölçütü "başka köy"
    değil, "başka OYUNCUNUN/NPC'nin köyü".
  */
  const claimBlocked = useMemo(() => {
    const s2 = new Set();
    for (const v of villages) {
      if (v.key === kk(wq, wr)) continue;            // aktif köy
      if (v.kind === 'self') {
        /*
          Kendi öbür köyüm: yalnız GERÇEKTEN aldığı hex'ler kapalı.
          Bir hex'i tek köy işleyebilir; ama aradaki boş hex'lere
          bu köyden de yayılabilirim (alanlar iç içe girebilir).
        */
        s2.add(kk(v.q, v.r));
        for (const lk of Object.keys(v.tiles || {})) {
          const [lq, lr] = lk.split(',').map(Number);
          s2.add(kk(v.q + lq, v.r + lr));
        }
        continue;
      }
      // Yabancı köy: bütün toprağı kapalı
      s2.add(kk(v.q, v.r));
      for (const [dq, dr] of CLAIM_OFFSETS) s2.add(kk(v.q + dq, v.r + dr));
    }
    return s2;
  }, [villages, wq, wr]);

  const tileOwners = useMemo(() => {
    const m = new Map();
    for (const v of villages) {
      if (v.key === kk(wq, wr)) continue;            // aktif köy kendi çizimini yapıyor
      const col = colOf(v);
      const info = { v, col, fill: col.soft, edge: col.line };
      m.set(kk(v.q, v.r), { ...info, center: true });
      if (v.tiles) {
        for (const [lk, t] of Object.entries(v.tiles)) {
          const [lq, lr] = lk.split(',').map(Number);
          m.set(kk(v.q + lq, v.r + lr), { ...info, tile: t });
        }
      }
    }
    return m;
  }, [villages, wq, wr, colOf]);

  const myCenterPx = useMemo(() => hexToPixel(wq, wr, S), [wq, wr]);

  /**
   * Etkileşimli hex'lerim = sahip olduklarım + onların boş komşuları (yayılma sınırı).
   * Sabit claim halkası YOK: her yeni tarla yeni komşular açar.
   * Başka bir köyün toprağındaki komşular listeye girmez.
   */
  const myFieldKeys = useMemo(() => {
    const owned = ['0,0', ...Object.keys(productionTiles)];
    const seen = new Set(owned);
    const out = [...owned];
    for (const k of owned) {
      const [q, r] = k.split(',').map(Number);
      for (const [dq, dr] of HEX_NEIGHBORS) {
        const n = kk(q + dq, r + dr);
        if (seen.has(n)) continue;
        seen.add(n);
        if (claimBlocked.has(kk(wq + q + dq, wr + r + dr))) continue;
        out.push(n);
      }
    }
    return out;
  }, [productionTiles, claimBlocked, wq, wr]);

  /** Gerçekten SAHİP olduğum hex'ler: ana bina + kurulu/inşa halindeki tarlalar */
  const ownedKeys = useMemo(
    () => ['0,0', ...Object.keys(productionTiles)],
    [productionTiles]
  );

  const myClaim = useMemo(() => {
    const s = new Set();
    for (const k of myFieldKeys) {
      const [lq, lr] = k.split(',').map(Number);
      s.add(kk(wq + lq, wr + lr));
    }
    return s;
  }, [myFieldKeys, wq, wr]);

  /**
   * UZAK ZOOM'DA İŞLENMİŞ TARLALAR.
   * Kendi tarlalarım (productionTiles, yerel anahtar) ve veri gelen yabancı
   * köylerin kurulu tarlaları — kaynak türüne göre gruplanmış dünya pikselleri.
   * Sadece tarla verisi değişince yeniden kurulur.
   */
  const workedTiles = useMemo(() => {
    const byRes = new Map();
    const add = (q, r, res) => {
      if (!res) return;
      let a = byRes.get(res);
      if (!a) { a = []; byRes.set(res, a); }
      const { x, y } = hexToPixel(q, r, S);
      a.push([x, y]);
    };
    for (const [lk, t] of Object.entries(productionTiles)) {
      const [lq, lr] = lk.split(',').map(Number);
      add(wq + lq, wr + lr, t?.type);
    }
    for (const [wk, info] of tileOwners) {
      if (!info.tile) continue;
      const [q, r] = wk.split(',').map(Number);
      add(q, r, info.tile[0]);
    }
    return byRes;
  }, [productionTiles, tileOwners, wq, wr]);

  // ── Görünür vahşi hex'ler (viewport kırpma) ──
  // Kırpma penceresi S adımlarına yuvarlanır → küçük pan'lerde liste değişmez
  const cullX = Math.round(pan.x / S) * S;
  const cullY = Math.round(pan.y / S) * S;
  const radius = snap?.radius || 134;

  const wildHexes = useMemo(
    () => computeWild({ w: size.w, h: size.h, scale, pan, myClaim, tileOwners, radius }),
    // pan yerine yuvarlanmış cullX/cullY: küçük pan'lerde yeniden hesaplanmaz
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size.w, size.h, scale, cullX, cullY, myClaim, tileOwners, radius]
  );

  // ── Yakın zoom'da görünen yabancı köyler ──
  /**
   * Toprak şekilleri ZOOM'DAN BAĞIMSIZ hesaplanır: sadece köy listesi ve
   * renkler değişince yeniden kurulur. Zoom/pan sırasında tek yaptığı şey
   * hazır `d` dizelerini basmak — pan akıcı kalıyor.
   */
  const territories = useMemo(() => shownVillages.map(v => {
    const color = v.kind === 'self' ? CLAIM_GREEN : colOf(v).line;
    // ownedOf aşağıda tanımlı (TDZ) — aynı ifade burada satır içi
    const owned = ['0,0', ...Object.keys(v.tiles || {})];
    const solo = owned.length <= 1;
    return {
      key: v.key, solo,
      d: outlinePath(owned, v.q, v.r),
      fill: alpha(color, solo ? 0.14 : 0.11),
      stroke: alpha(color, solo ? 0.45 : 0.6),
    };
  }), [shownVillages, colOf]);

  const visibleForeign = useMemo(() => {
    if (scale < Z_TERRAIN) return [];
    const halfW = (size.w / 2 + PAD) / scale + 4 * S;
    const halfH = (size.h / 2 + PAD) / scale + 4 * S;
    return shownVillages.filter(v => {
      if (v.kind === 'self') return false;
      const p = hexToPixel(v.q, v.r, S);
      return Math.abs(p.x + cullX) <= halfW && Math.abs(p.y + cullY) <= halfH;
    });
  }, [shownVillages, scale, size.w, size.h, cullX, cullY]);

  // Köy başına ayrı renk — kademe rengi değil
  const colorOf = (v) => colOf(v).line;
  /** Köyün gerçekten sahip olduğu YEREL hex anahtarları */
  const ownedOf = (v) => ['0,0', ...Object.keys(v.tiles || {})];

  // ── Kendi tarlaların ──
  const tileCount = Object.keys(productionTiles).length;
  const slotsFull = tileCount >= maxProductionSlots;

  const isConnected = useCallback((localKey) => {
    const [q, r] = localKey.split(',').map(Number);
    return HEX_NEIGHBORS.some(([dq, dr]) => {
      const n = kk(q + dq, r + dr);
      return n === '0,0' || !!productionTiles[n];
    });
  }, [productionTiles]);

  const canBuildAt = useCallback((localKey) => {
    if (localKey === '0,0' || productionTiles[localKey] || slotsFull) return false;
    return isConnected(localKey);
  }, [productionTiles, slotsFull, isConnected]);

  // ── Popover konumu ──
  const selectedTile = selField && selField !== '0,0' ? productionTiles[selField] : null;
  const selectedBuildable = selField && selField !== '0,0' && !selectedTile && canBuildAt(selField);

  const panelW = selVillage ? 268
    : !selField ? 300
    : selField === '0,0' ? 480
    : selectedTile ? 520 : 500;
  const prefH = selVillage ? 300
    : selField === '0,0' ? 300
    : selectedTile ? 350 : 340;

  const popTarget = useMemo(() => {
    if (selVillage) return { q: selVillage.q, r: selVillage.r };
    if (selField) {
      const [lq, lr] = selField.split(',').map(Number);
      return { q: wq + lq, r: wr + lr };
    }
    return null;
  }, [selVillage, selField, wq, wr]);

  const popoverPos = useMemo(() => {
    if (!popTarget) return null;
    const p = hexToPixel(popTarget.q, popTarget.r, S);
    return computePopoverPos({
      hexScreenX: size.w / 2 + (p.x + pan.x) * scale,
      hexScreenY: size.h / 2 + (p.y + pan.y) * scale,
      hexRadius: S * scale,
      viewW: size.w, viewH: size.h,
      panelW, prefH,
      insetLeft: railInset, insetRight: railInset,
    });
  }, [popTarget, pan.x, pan.y, scale, size.w, size.h, panelW, prefH, railInset]);

  /**
   * Arazi canvas'ta çizildiği için DOM hover'ı yok — imleç konumundan hex'i
   * matematikle bulup vurguluyoruz (pixelToHex). Sürüklerken hover kapalı.
   */
  const onHoverProbe = useCallback((e) => {
    if (scale < Z_TERRAIN) { setHoverWild(null); return; }
    // Panel/düğme üzerindeyken altta kalan hex'i vurgulamasın (ref'ler sabit,
    // bağımlılık listesini etkilemez).
    const t = e.target;
    const onSurface = t === ref.current || t === layerRef.current || t === canvasRef.current
      || !!(svgRef.current && svgRef.current.contains(t));
    if (!onSurface) { setHoverWild(null); return; }
    const el = ref.current;
    if (!el) return;
    const rc = el.getBoundingClientRect();
    // DİKKAT: merkez için rc.width/height DEĞİL, render'ın kullandığı `size` alınır.
    // İkisi ayrışırsa (ResizeObserver gecikmesi, pencere boyutu değişimi) imleç
    // farkın yarısı kadar kayıyor — ölçtüm: 900×700 vs 811×926'da 32 px sapma,
    // geniş pencerede yüzlerce piksele çıkar. `size` kullanmak tam ters dönüşüm.
    // Katmanın CANLI CSS ofseti de düşülür: pan state'i henüz commit edilmemişken
    // (sürükleme ortası ya da beklenmedik biçimde sonlanmış bir sürükleme) harita
    // ekranda bu kadar kaymış durumdadır.
    const ox = layerOff.current.x, oy = layerOff.current.y;
    const wx = (e.clientX - rc.left - ox - size.w / 2) / scale - pan.x;
    const wy = (e.clientY - rc.top - oy - size.h / 2) / scale - pan.y;
    const { q, r } = pixelToHex(wx, wy, S);
    const key = kk(q, r);
    if (dbg) {
      // hesaplanan hex'in merkezi ekranda nereye düşüyor? fareye uzaklığı ne?
      const p = hexToPixel(q, r, S);
      const sx = rc.left + ox + size.w / 2 + (p.x + pan.x) * scale;
      const sy = rc.top + oy + size.h / 2 + (p.y + pan.y) * scale;
      setDbg({
        on: true,
        m: `${Math.round(e.clientX)},${Math.round(e.clientY)}`,
        rc: `${Math.round(rc.left)},${Math.round(rc.top)} ${Math.round(rc.width)}x${Math.round(rc.height)}`,
        size: `${size.w}x${size.h}`,
        off: `${Math.round(ox)},${Math.round(oy)}`,
        pan: `${pan.x.toFixed(0)},${pan.y.toFixed(0)}`,
        sc: scale.toFixed(2),
        hex: key,
        err: Math.round(Math.hypot(e.clientX - sx, e.clientY - sy)),
      });
    }
    if (myClaim.has(key) || hexDistance(q, r) > (snap?.radius || 134)) { setHoverWild(null); return; }
    setHoverWild(prev => (prev === key ? prev : key));
  }, [scale, pan.x, pan.y, size.w, size.h, myClaim, snap?.radius, dbg]);

  /**
   * Fare olayından dünya hex'i. Hareket işleyicisindeki hesabın aynısı;
   * oradaki blok hata ayıklama çıktısıyla iç içe olduğu için ayrı yazıldı.
   */
  const hexFromEvent = (e) => {
    const el = ref.current;
    if (!el || !Number.isFinite(e?.clientX)) return null;
    const rc = el.getBoundingClientRect();
    const ox = layerOff.current.x, oy = layerOff.current.y;
    const wx = (e.clientX - rc.left - ox - size.w / 2) / scale - pan.x;
    const wy = (e.clientY - rc.top - oy - size.h / 2) / scale - pan.y;
    const { q, r } = pixelToHex(wx, wy, S);
    if (hexDistance(q, r) > (snap?.radius || 134)) return null;
    return { q, r, key: kk(q, r) };
  };

  /* Yerleşim seferi reddedilirse sebebini panelde göster */
  useEffect(() => {
    if (!socket) return;
    const onErr = ({ reason } = {}) => setSettleErr(SETTLE_ERR[reason] || reason || 'Gönderilemedi');
    const onSent = ({ mode } = {}) => { if (mode === 'yerlesim') { setSettleErr(null); setSelEmpty(null); } };
    socket.on('army_error', onErr);
    socket.on('army_sent', onSent);
    return () => { socket.off('army_error', onErr); socket.off('army_sent', onSent); };
  }, [socket]);

  const clickField = (localKey) => {
    if (suppressClick.current) return;
    setSelVillage(null);
    setSelField(prev => (prev === localKey ? null : localKey));
  };
  const clickVillage = (v) => {
    if (suppressClick.current) return;
    if (v.kind === 'self') { recenter(Math.max(scale, 1.6)); return; }
    setSelField(null);
    setSelVillage(prev => (prev?.key === v.key ? null : v));
  };

  // ── Hover kartı içeriği ──
  const hoverCard = useMemo(() => {
    if (selField || selVillage) return null;
    if (hoverVillage && hoverVillage.kind !== 'self') {
      const v = hoverVillage;
      const ratio = myArmy && v.army ? v.army / Math.max(1, myArmy) : null;
      return {
        title: v.name,
        // Oyuncu köyünde SAHİBİNİN adı; NPC'de kademe etiketi
        sub: `${v.kind === 'player' ? (v.owner || 'oyuncu') : v.tierLabel} · ${v.key}`,
        icon: 'koy',
        iconColor: colorOf(v),
        rows: [
          ...(v.kind === 'player' && v.owner ? [['Sahibi', v.owner, PLAYER_COL.line]] : []),
          ['Mesafe', v.distance != null ? `${v.distance} hex` : '—', C.iceSoft],
          ['Nüfus', v.population != null ? short(v.population) : '—'],
          /*
            ORDU SATIRI: oyuncu köyünde sunucu artık asker sayısı
            yollamıyor (bkz. server/index.js · worldSnapshot) — fare
            gezdirerek bütün dünyanın ordusu okunuyordu. NPC'de duruyor:
            PvE hedefi seçmek keşif gerektirmesin.
          */
          ['Ordu', v.army != null ? short(v.army) : 'bilinmiyor',
            v.army == null ? C.textMute
              : ratio == null ? C.frost
                : ratio > 1.2 ? C.danger : ratio < 0.7 ? C.good : C.warn, true],
        ],
        note: 'Detay için tıkla.',
      };
    }
    if (hoverWild) {
      const [q, r] = hoverWild.split(',').map(Number);
      const bonus = worldTileBonus(q, r);
      const owner = tileOwners.get(hoverWild)?.v || null;
      return {
        title: bonus ? `${RES_LABEL[bonus.resource]} bonus arazisi` : 'Vahşi arazi',
        sub: `dünya ${q},${r}`,
        icon: bonus ? bonus.resource : 'harita',
        iconColor: bonus ? TYPE_EDGE[bonus.resource] : C.textFaint,
        rows: [
          ['Arazi bonusu', bonus ? `+%${bonus.amount}` : 'yok', bonus ? C.warn : C.textMute],
          // Sahibi = KÖYÜN adı; oyuncu köyündeyse sahibinin adı da ayrı satır
          ['Sahibi', owner ? owner.name : 'sahipsiz', owner ? colorOf(owner) : C.good],
          ...(owner?.kind === 'player' && owner.owner
            ? [['Oyuncu', owner.owner, PLAYER_COL.line]] : []),
        ],
        note: owner
          ? `${owner.kind === 'player' ? (owner.owner || 'Oyuncu') : owner.tierLabel} köyünün toprağı.`
          : 'Boş arazi — 3 göçmenle buraya köy kurulabilir.',
      };
    }
    if (hoverField) {
      const [lq, lr] = hoverField.split(',').map(Number);
      const tile = productionTiles[hoverField];
      const bonus = worldTileBonus(wq + lq, wr + lr);
      const isCenter = hoverField === '0,0';
      const def = tile ? BUILDING_DEFS[tile.type] : null;
      const maxW = def?.levels?.[tile.level - 1]?.workers || 0;
      const f = tile ? flows?.[tile.type] : null;
      return {
        title: isCenter ? (world?.name || 'Ana Bina')
          : tile ? (def?.name || tile.type)
          : bonus ? `${RES_LABEL[bonus.resource]} bonus arazisi` : 'Boş arazi',
        sub: `dünya ${wq + lq},${wr + lr} · ring ${hexDistance(lq, lr)}`,
        icon: isCenter ? 'anaBina' : tile ? tile.type : bonus ? bonus.resource : 'ekle',
        iconColor: tile ? TYPE_EDGE[tile.type] : isCenter ? SELF_COLOR : C.textFaint,
        rows: [
          ['Arazi bonusu', bonus ? `+%${bonus.amount} ${RES_LABEL[bonus.resource]}` : 'yok',
            bonus ? (tile && bonus.resource === tile.type ? C.good : C.warn) : C.textMute],
          ...(tile ? [
            ['İşçi', `${tile.workers || 0} / ${maxW}`, (tile.workers || 0) === 0 ? C.danger : C.frost],
            ['Çarpan', `×${(tile.efficiency ?? 1).toFixed(2)}`, C.iceSoft],
          ] : []),
          ...(f ? [[`${RES_LABEL[tile.type]} net`, `${f.net >= 0 ? '+' : ''}${f.net.toFixed(1)}/sa`,
            f.net > 0 ? C.good : f.net < 0 ? C.danger : C.textMute, true]] : []),
        ],
        note: isCenter ? 'Köy merkezi — açmak için tıkla.'
          : tile ? null
          : canBuildAt(hoverField) ? 'İnşa edilebilir — tıkla.'
          : slotsFull ? 'Tarla limiti dolu — Ana Bina’yı yükselt.'
          : 'Bağlantısız: önce komşusunu kur.',
      };
    }
    return null;
  }, [hoverField, hoverVillage, hoverWild, selField, selVillage, productionTiles, flows,
      wq, wr, myArmy, canBuildAt, slotsFull, tileOwners, claimBlocked, world?.name]);

  // ── Araziyi canvas'a çiz: yalnızca pan/zoom commit'inde ya da veri değişince ──
  useEffect(() => {
    // Uzak zoom düz renk kullanıyor; sprite yüklenmesini beklemesin
    if (!spritesReady && scale >= Z_TERRAIN) return;
    const sig = sigOf(pan.x, pan.y, scale);
    if (drawSig.current === sig) return;          // commit anında çizilmişti
    drawTerrain(canvasRef.current, {
      w: size.w, h: size.h, scale, pan, radius,
      list: wildHexes, showBadge: scale >= Z_LABEL, worked: workedTiles,
    });
    drawSig.current = sig;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spritesReady, size.w, size.h, scale, pan.x, pan.y, wildHexes, workedTiles, snapSeq]);

  // ── Kademe halkaları ──
  const tierRings = useMemo(() => (snap?.tiers || []).filter(t => t.maxRing < 90), [snap]);

  const zoomLabel = scale >= Z_TERRAIN ? 'ARAZİ' : scale >= Z_CLUSTER ? 'BÖLGE' : 'DÜNYA';
  const svgW = size.w + 2 * PAD, svgH = size.h + 2 * PAD;

  return (
    <div ref={ref}
      style={{
        position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 2,
        cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none',
        /* Parmakla kaydırma/yakınlaştırma bize gelsin, tarayıcı çalmasın */
        touchAction: 'none',
        background: 'radial-gradient(circle at 50% 45%, #1b2418 0%, #141a13 55%, #0d1210 100%)',
      }}
      onWheel={onWheel}
      onPointerDown={onDown} onPointerMove={onMove}
      onPointerUp={onUp} onPointerCancel={onUp}
      onMouseMove={onHoverProbe}
      onMouseLeave={() => setHoverWild(null)}
      onContextMenu={(e) => e.preventDefault()}>

      <div ref={layerRef} style={{ position: 'absolute', inset: 0, willChange: 'transform' }}>
      <canvas ref={canvasRef}
        style={{ display: 'block', position: 'absolute', left: -PAD, top: -PAD, pointerEvents: 'none' }} />
      {/* data-map: yerleşim penceresi YALNIZ haritanın kendisine yapılan
          tıklamalarda açılsın; panellerin üstündeki tıklamalar haritaya
          sayılmasın (İNŞA ET düğmesi bu yüzden arkadaki hex'i seçiyordu) */}
      <svg data-map="1" ref={svgRef} width={svgW} height={svgH}
        style={{ display: 'block', position: 'absolute', left: -PAD, top: -PAD }}>
        <g ref={gRef} transform={panTransform(pan.x, pan.y)}>

          {/* Kademe halkaları — uzaktan */}
          {scale < Z_TERRAIN && tierRings.map(t => (
            <g key={t.tier}>
              <circle cx={0} cy={0} r={t.maxRing * S * SQRT3} fill="none"
                stroke={TIER_COLOR[t.tier]} strokeWidth={0.7 / scale}
                strokeDasharray={`${5 / scale} ${7 / scale}`} opacity={0.28} />
              <text x={0} y={-t.maxRing * S * SQRT3 - 5 / scale} textAnchor="middle"
                fontFamily={FONT.ui} fontSize={9 / scale} fill={TIER_COLOR[t.tier]}
                opacity={0.5} style={{ userSelect: 'none' }}>{t.label}</text>
            </g>
          ))}

          {/* Vahşi arazi canvas'ta; burada yalnızca imleçteki hex'in vurgusu */}
          {hoverWild && (() => {
            const [hq, hr] = hoverWild.split(',').map(Number);
            const p = hexToPixel(hq, hr, S);
            return (
              <polygon points={hexPoints(p.x, p.y, S - 0.5)} fill="rgba(255,232,154,0.10)"
                stroke="#ffe89a" strokeWidth={2.4} pointerEvents="none" />
            );
          })()}

          {/* Yabancı köy toprakları + merkezleri — benimkiyle aynı görünüm */}
          {scale >= Z_TERRAIN && (
            <g>
              {/* Çerçeve yalnızca ALINMIŞ hex'lerin çevresi — claim halkası değil.
                  Tarla verisi gelmeyen uzak köyler için sadece merkez hex'i sarar. */}
              {visibleForeign.map(v => {
                const d = outlinePath(ownedOf(v), v.q, v.r);
                const c = colorOf(v);
                return (
                  <g key={`o${v.key}`}>
                    <path d={d} fill="none" stroke="rgba(6,10,14,0.6)"
                      strokeWidth={6 / scale} strokeLinejoin="round" />
                    <path d={d} fill="none" stroke={c}
                      strokeWidth={2.2 / scale} strokeLinejoin="round" opacity={0.95} />
                  </g>
                );
              })}
              {visibleForeign.map(v => (
                <ForeignCore key={`k${v.key}`} v={v} color={colorOf(v)}
                  hovered={hoverVillage?.key === v.key || selVillage?.key === v.key}
                  onEnter={() => setHoverVillage(v)}
                  onLeave={() => setHoverVillage(h => (h?.key === v.key ? null : h))}
                  onClick={() => clickVillage(v)} />
              ))}
              {scale >= Z_LABEL && visibleForeign.map(v => {
                const p = hexToPixel(v.q, v.r, S);
                return (
                  <text key={`n${v.key}`} x={p.x} y={p.y + S * 2.9} textAnchor="middle"
                    fontFamily={FONT.ui} fontSize={7.5} fill={colorOf(v)} opacity={0.85}
                    stroke="rgba(8,12,8,0.8)" strokeWidth={1.8} paintOrder="stroke"
                    style={{ userSelect: 'none' }}>{v.name}</text>
                );
              })}
            </g>
          )}

          {/* UZAKLAŞTIRINCA: GERÇEK TOPRAK ŞEKLİ
            * Eskiden her köy 2.6·S yarıçaplı UYDURMA bir altıgenle çiziliyordu —
            * kimin nereyi aldığı görünmüyordu. Şimdi gerçekten sahip olunan
            * hex'lerin birleşim sınırı çiziliyor (yakın zoom'daki aynı
            * `outlinePath`). Resim yok, doku yok: sade dolgu + ince kontur,
            * yani uzaklaştıkça harita hafifliyor.
            *
            * Sunucu tarla verisini yalnızca 30 hex yarıçapında gönderiyor;
            * daha uzak köyler için elde sadece merkez var, o yüzden tek hex
            * çiziliyor — şişirilmiş sahte alan değil.
            */}
          {scale < Z_TERRAIN && territories.map(t => (
            <path key={`c${t.key}`} d={t.d}
              fill={t.fill} stroke={t.stroke}
              strokeWidth={(t.solo ? 0.9 : 1.3) / scale}
              strokeLinejoin="round" />
          ))}

          {/*
            Boş slotlar — göçmen varsa TIKLANABİLİR: yeni köy buraya kurulur.
            Görünen nokta küçük; üstünde geniş görünmez bir tıklama alanı var,
            yoksa isabet ettirmek imkânsız olurdu.
          */}
          {scale >= Z_CLUSTER && scale < Z_TERRAIN && (snap?.emptySlots || []).map(s => {
            const p = hexToPixel(s.q, s.r, S);
            const secili = selEmpty?.key === s.key;
            return (
              <g key={s.key}>
                <circle cx={p.x} cy={p.y} r={(secili ? 3.6 : 2.2) / scale}
                  fill={secili ? CLAIM_GREEN : C.textMute} opacity={secili ? 0.95 : 0.5} />
              </g>
            );
          })}

          {/* Kendi toprağın — yakın zoom'da etkileşimli tarlalar */}
          {scale >= Z_TERRAIN && (
            <g>
              {/* KENDİ ALANIM — yalnızca sahip olduğum hex'lerin çevresi */}
              {(() => {
                const d = outlinePath(ownedKeys, wq, wr);
                return (
                  <g>
                    <path d={d} fill="none" stroke="#0a1206"
                      strokeWidth={9 / scale} opacity={0.5} strokeLinejoin="round" />
                    <path d={d} fill="none" stroke={CLAIM_GREEN}
                      strokeWidth={6 / scale} opacity={0.3} strokeLinejoin="round" />
                    <path d={d} fill="none" stroke="#c8ff8a"
                      strokeWidth={2.6 / scale} opacity={1} strokeLinejoin="round" />
                  </g>
                );
              })()}
              {myFieldKeys.map(localKey => {
                const [lq, lr] = localKey.split(',').map(Number);
                const tile = localKey === '0,0' ? null : productionTiles[localKey];
                return (
                  <FieldHex key={`f${localKey}`}
                    wq={wq} wr={wr} lq={lq} lr={lr} tile={tile}
                    isCenter={localKey === '0,0'}
                    isSelected={selField === localKey}
                    isHovered={hoverField === localKey}
                    buildable={canBuildAt(localKey)}
                    anaBinaLevel={anaBina?.level || 1}
                    showLabels={scale >= Z_LABEL}
                    onClick={() => clickField(localKey)}
                    onEnter={() => setHoverField(localKey)}
                    onLeave={() => setHoverField(p => (p === localKey ? null : p))} />
                );
              })}
            </g>
          )}

          {/* Köy işaretleri — yalnızca uzak/orta zoom */}
          {/*
            İşaretler uzak/orta zumda. Yakın zumda her köy — kendi ikinci
            köyüm dahil — merkez hex'i ve tarlalarıyla normal köy gibi
            çiziliyor (bkz. tileOwners), ayrıca işaret gerekmiyor.
          */}
          {scale < Z_TERRAIN && shownVillages.map(v => (
            <VillageMark key={v.key} v={v} scale={scale}
              color={v.kind === 'self' ? CLAIM_GREEN : colorOf(v)}
              hovered={hoverVillage?.key === v.key}
              selected={selVillage?.key === v.key}
              onEnter={() => setHoverVillage(v)}
              onLeave={() => setHoverVillage(h => (h?.key === v.key ? null : h))}
              onClick={() => clickVillage(v)} />
          ))}
        </g>
      </svg>
      </div>

      {!snap && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <div className="tn-pulse" style={{
            fontFamily: FONT.ui, fontSize: 11, letterSpacing: 2.5, color: C.iceDeep,
            textTransform: 'uppercase',
          }}>dünya yükleniyor…</div>
        </div>
      )}

      {hoverCard && <HoverCard {...hoverCard} railInset={railInset} />}

      {dbg?.m && (
        <div style={{
          position: 'absolute', top: 10, left: railInset + 10, zIndex: 50,
          padding: '7px 9px', borderRadius: 6, pointerEvents: 'none',
          background: 'rgba(0,0,0,0.8)', border: `1px solid ${C.lineBright}`,
          font: '11px/1.5 ui-monospace, monospace',
          color: dbg.err > S * scale ? '#ff8f7a' : '#8fe08f', whiteSpace: 'pre',
        }}>
{`fare      ${dbg.m}
kutu      ${dbg.rc}
size      ${dbg.size}      katman ofs ${dbg.off}
pan       ${dbg.pan}      zoom ${dbg.sc}
hex       ${dbg.hex}
sapma     ${dbg.err} px  (hex yarıçapı ${Math.round(S * scale)} px)`}
        </div>
      )}

      {/* Alt bar */}
      <div style={{
        position: 'absolute', bottom: 10, left: railInset + 10, right: railInset + 10, zIndex: 30,
        display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap',
        padding: '6px 11px', borderRadius: 7,
        background: 'rgba(9,18,30,0.55)', border: `1px solid ${C.lineSoft}`,
        backdropFilter: 'blur(14px) saturate(1.15)',
        WebkitBackdropFilter: 'blur(14px) saturate(1.15)',
      }}>
        <Icon name="harita" size={12} color={C.iceDeep} />
        <span style={lbl({ fontSize: 8 })}>{zoomLabel}</span>
        <span style={num({ fontSize: 10, color: C.textFaint })}>{scale.toFixed(2)}×</span>

        <div style={{ width: 1, height: 14, background: C.lineSoft }} />

        <span style={lbl({ fontSize: 8 })}>Tarla</span>
        <span style={num({ fontSize: 12, color: slotsFull ? C.warn : C.frost })}>
          {tileCount}<span style={{ color: C.textMute, fontSize: 9.5 }}>/{maxProductionSlots}</span>
        </span>

        <div style={{ width: 1, height: 14, background: C.lineSoft }} />

        <span style={num({ fontSize: 10, color: C.textFaint })}>
          {villages.length} köy · r{snap?.radius ?? '—'}
        </span>

        {(snap?.tiers || []).map(t => {
          const on = filterTier === t.tier;
          const count = villages.filter(v => v.kind === 'npc' && v.tier === t.tier).length;
          return (
            <button key={t.tier} onClick={() => setFilterTier(on ? null : t.tier)}
              title={`${t.label} — ${count} köy`}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '2px 6px', borderRadius: 4, cursor: 'pointer',
                fontFamily: FONT.ui, fontSize: 8.5,
                background: on ? `${TIER_COLOR[t.tier]}26` : 'rgba(12,20,28,0.5)',
                border: `1px solid ${on ? TIER_COLOR[t.tier] : C.lineSoft}`,
                color: on ? C.frost : C.textFaint,
              }}>
              {t.label}<span style={num({ fontSize: 8, color: C.textMute })}>{count}</span>
            </button>
          );
        })}

        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint }}>
          sürükle · tekerlek zoom · ok tuşları
        </span>
        <button onClick={() => setScale(s => Math.max(Z_MIN, s / 1.6))}
          style={btn('ghost', { padding: '2px 7px', fontSize: 9 })}>UZAKLAŞ</button>
        <button onClick={() => recenter(1.6)}
          style={btn('ghost', { padding: '2px 8px', fontSize: 8.5 })}>KÖYÜME DÖN</button>
      </div>

      {/* Paneller */}
      {selField === '0,0' && popoverPos && (
        <AnaBinaPanel anaBina={anaBina} resources={resources} freeWorkers={freeWorkers}
          popoverPos={popoverPos} worldName={world?.name} flows={flows}
          hourSeconds={hourSeconds} worldSpeed={worldSpeed}
          onUpgrade={(w) => { onUpgradeAnaBina(w); setSelField(null); }}
          onEnterVillage={() => { setSelField(null); onEnterVillageCenter?.(); }}
          onCancelBuild={() => { onCancelBuild?.('village', '0,0'); setSelField(null); }}
          onClose={() => setSelField(null)} />
      )}

      {selField && selField !== '0,0' && selectedTile && popoverPos && (
        <FieldPanel localKey={selField} wq={wq} wr={wr} tile={selectedTile}
          resources={resources} freeWorkers={freeWorkers} flows={flows} popoverPos={popoverPos}
          hourSeconds={hourSeconds} worldSpeed={worldSpeed}
          onUpgrade={(w) => { onUpgrade(selField, w); setSelField(null); }}
          onDemolish={() => { onDemolish(selField); setSelField(null); }}
          onAssignWorkers={(w) => onAssignWorkers(selField, w)}
          onCancelBuild={() => { onCancelBuild?.('production', selField); setSelField(null); }}
          onClose={() => setSelField(null)} />
      )}

      {selField && selField !== '0,0' && !selectedTile && popoverPos && (
        <BuildFieldPanel localKey={selField} wq={wq} wr={wr}
          freeWorkers={freeWorkers} resources={resources} flows={flows}
          hourSeconds={hourSeconds} worldSpeed={worldSpeed}
          slotsFull={slotsFull} connected={isConnected(selField)} popoverPos={popoverPos}
          onBuild={(type, w) => { onBuild(selField, type, w); setSelField(null); }}
          onClose={() => setSelField(null)} />
      )}

      {selVillage && popoverPos && (
        <ForeignVillagePanel v={selVillage} myArmy={myArmy} popoverPos={popoverPos}
          intel={intel[selVillage.key] || null}
          /*
            PvP AÇIK: NPC ve başka oyuncuların köyleri hedef olabilir.
            'self' kendi köyün — panel zaten açılmıyor, sunucu da
            sahibe bakıp reddediyor (kendi_koyun).
          */
          canAttack={selVillage.kind === 'npc' || selVillage.kind === 'player'}
          onAttack={() => { setSendTarget(selVillage); setSelVillage(null); }}
          onClose={() => setSelVillage(null)} />
      )}

      {selEmpty && (
        <SettlePanel slot={selEmpty}
          distance={hexDistance(selEmpty.q - wq, selEmpty.r - wr)}
          gocmen={gocmenSayisi} gerekli={GOCMEN_GEREKLI}
          box={size}
          {...(() => {
            // Hover kartındaki "Sahibi / Arazi bonusu" ile aynı kaynak
            const o = tileOwners.get(selEmpty.key)?.v || null;
            return { owner: o, ownerColor: o ? colorOf(o) : null,
              bonus: worldTileBonus(selEmpty.q, selEmpty.r) };
          })()}
          /*
            Sunucu zaten denetliyor; buradaki ön-denetim yalnız düğmeyi
            kapatıp sebebini yazsın diye. Kendi köylerime mesafe sınırı yok.
          */
          sunucuHatasi={settleErr}
          engel={(() => {
            const bns = worldTileBonus(selEmpty.q, selEmpty.r);
            if (bns) {
              return `Buraya köy merkezi kurulamaz: bu hex +%${bns.amount} `
                + `${RES_LABEL[bns.resource] || bns.resource} bonuslu bir TARLA. `
                + 'Bonusu kullanmak için yanına kur, sonra bu hex\'e o üretimi dik.';
            }
            // Mesafe sınırı yok; tek engel dolu hex ve bonuslu arazi
            const dolu = villages.find(v => v.key === selEmpty.key);
            if (dolu) return `Burada zaten bir köy var: ${dolu.name}`;
            return null;
          })()}
          hourSeconds={hourSeconds} worldSpeed={worldSpeed}
          unitDefs={unitDefs}
          onSend={() => {
            setSettleErr(null);
            socket?.emit('send_army', {
              targetKey: selEmpty.key, mode: 'yerlesim',
              units: { gocmen: GOCMEN_GEREKLI },
            });
            // Pencere açık kalır: sunucu onaylarsa kapanır, reddederse
            // sebebini burada gösteririz (bkz. army_error dinleyicisi).
          }}
          onClose={() => { setSelEmpty(null); setSettleErr(null); }} />
      )}

      {sendTarget && (
        <SendArmyPanel socket={socket} target={sendTarget}
          army={army} unitDefs={unitDefs} unitStatsNow={unitStatsNow} marchInfo={marchInfo}
          intel={intel[sendTarget.key] || null}
          onClose={() => setSendTarget(null)} />
      )}
    </div>
  );
}
