import { useState, useMemo, useRef, useEffect } from 'react';
import BuildMenu from './BuildMenu';
import CapitalPanel from './CapitalPanel';
import EquipmentPanel from './EquipmentPanel';
import UnitTrainingPanel from './UnitTrainingPanel';
import FestivalPanel from './FestivalPanel';
import VILLAGE_DEFS, { towerSlotBonus, SUR_BONUS, HENDEK_BONUS } from '../data/villageDefs';
import { EMBLEM_DY, EMBLEM_SIZE, TEXTURE_EMBLEM, BUILDING_TEXTURE, BUILDING_VIDEO, MERKEZ_IMG } from './buildingArt';
import { popoverStyle, computePopoverPos } from './popoverStyle';
import { C, FONT, RES_COLOR, btn, label as lbl, num, signed, fmtTime } from '../theme';
import { RES_LABEL, NO_WORKER_TYPES, workerTerm, maxWorkersOf } from '../flows';
import Icon, { buildingIcon } from './Icons';
import usePinchPan from './usePinchPan';
import { useHoverable, TAP } from '../responsive';
// Sur taş dokusu — tam tepeden, 2x2 aynalanmış karo (dikişsiz)
import surTexture from '../assets/buildings/sur-doku.jpg';
const EQUIPMENT_BUILDINGS = new Set(['silahci', 'zirh', 'ahir']);
const TRAINING_BUILDINGS  = new Set(['kisla', 'ahir', 'atolye']);

const SQRT3 = Math.sqrt(3);
/**
 * Hex boyutu — köy çerçeveyi doldurur, sur kümeye YAPIŞIR.
 *
 * Sur yarıçapı artık kümeden türüyor (bkz. frameGeom): kümenin sur kenarı
 * yönündeki en dış noktası 6.062·S, surun iç yüzü tam oraya oturuyor.
 * Buradan köy yarıçapı ≈ 7.00·S + (sur/hendek kalınlıkları) ve genişlik
 * 2R ≤ 850 → S = 55.
 */
const S = 55;
/** Karo, hücresinden biraz küçük: aradaki boşluk sokak olur */
const TILE = 0.90;

const RING1 = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
const RING2 = [[2,0],[2,-1],[2,-2],[1,-2],[0,-2],[-1,-1],[-2,0],[-2,1],[-2,2],[-1,2],[0,2],[1,1]];
const RING3 = [
  [3,0],[3,-1],[3,-2],[3,-3],[2,-3],[1,-3],[0,-3],
  [-1,-2],[-2,-1],[-3,0],[-3,1],[-3,2],[-3,3],
  [-2,3],[-1,3],[0,3],[1,2],[2,1],
];

const ALL_SLOTS = [
  { q: 0, r: 0, ring: 0 },
  ...RING1.map(([q, r]) => ({ q, r, ring: 1 })),
  ...RING2.map(([q, r]) => ({ q, r, ring: 2 })),
  ...RING3.map(([q, r]) => ({ q, r, ring: 3 })),
];

// Kategori zeminleri — canlı, birbirinden ayırt edilebilir tonlar
const CAT_FILL = {
  isleme:   '#2f5a34',
  askeri:   '#2b4272',
  depo:     '#453a5e',
  ekonomik: '#5c5320',
  savunma:  '#5c2a30',
  yonetim:  '#5c4a1e',
  nufus:    '#1f5a5a',
  anaBina:  '#5a4820',
  merkez:   '#5a4820',
};

const CAT_EDGE = {
  isleme:   '#7ae07a',
  askeri:   '#8fbcff',
  depo:     '#c0a8f8',
  ekonomik: '#f0d868',
  savunma:  '#ff8080',
  yonetim:  '#e0b357',
  nufus:    '#68e8e0',
  anaBina:  '#f0c860',
  merkez:   '#f0c860',
};



/**
 * Hex'te hangi simge görünüyorsa tooltip ve panel de ONU kullanır.
 * Amblemi olan binada amblem, olmayanda çizgi ikonu — üç yerde tek kaynak.
 */
function hexEmblem(type) {
  const em = TEXTURE_EMBLEM[type];
  if (em) return { icon: em.icon, rot: em.rot || 0, size: em.size || EMBLEM_SIZE };
  return { icon: buildingIcon(type), rot: 0, size: EMBLEM_SIZE };
}


/**
 * Slot türü — hex arazi mi, sur mu, hendek mi, kule köşesi mi?
 * Sunucudaki slotKind() ile aynı kural (bkz. server/index.js).
 */
function slotKindOf(slotKey, towerSet) {
  if (slotKey === 'sur' || slotKey === 'hendek') return slotKey;
  if (towerSet.has(slotKey)) return 'kule';
  return 'hex';
}

/**
 * HÜCRELER DÜZ TEPELİ — üstü ve altı düz, köyün sınırı gibi.
 *
 * Köyün sınırı ayrı çizilen bir altıgen olduğu için kümenin kendi dış hattının
 * şekli artık görünmüyor; hücrelerin yönü serbest. Bu düzende kümenin sınır
 * kenarı yönündeki en dış noktası 6.062·S (sivri düzende 5.500·S), yani
 * kapsayıcı %9 daha geniş olmak zorunda — VILLAGE_R buna göre ayarlı.
 */
function hexToScreen(q, r, cx, cy) {
  return { x: cx + S * (1.5 * q), y: cy + S * ((SQRT3 / 2) * q + SQRT3 * r) };
}

/** Hücre altıgeni — köşeler 60k (düz tepe: üst ve alt kenar düz) */
function hexPoints(cx, cy, s = S * TILE) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return `${(cx + (s - 2) * Math.cos(a)).toFixed(1)},${(cy + (s - 2) * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

const EMPTY_LABEL = {
  sur:    'Sur — köyü çevreler',
  hendek: 'Hendek — surun dışı',
  kule:   'Kule Slotu — sur köşesi',
  hex:    'Boş Arazi',
};

// ── KÖY ÇERÇEVESİ: sınır, hendek, sur, kuleler, yollar, dekor, tarlalar ──
/**
 * Köy TEK bir dünya hex'idir; bu görünüm o hex'in yakınlaştırılmış hâli.
 * Bu yüzden köyün sınırı düz tepeli bir altıgen, komşu dünya hex'leri
 * (üretim tarlaları) AYNI ölçekte ve sınıra değecek şekilde çevresinde durur;
 * çerçeve onları kırpar — haritayla birebir aynı yerleşim.
 *
 * Ölçü zinciri (hepsi S'den türer, göz kararı yok):
 *   • kümenin sınır kenarı yönündeki en dış noktası  5.50·S
 *   • altıgende kenar mesafesi R·cos30  →  R = 5.90·S / cos30 = 6.813·S
 *     (5.90 payı: kenarda ~0.40·S boşluk kalır)
 *   • komşu hex merkezleri √3·R uzakta → kenarlar birbirine DEĞER
 */
/**
 * Kümenin sur kenarı normali yönündeki en dış noktası — ölçüldü.
 * (düz-tepe hücre + düz-tepe kapsayıcı)
 */
const CLUSTER_REACH = 6.062 * S;

/**
 * Çerçeve ölçüleri sur/hendek seviyesinden türer: surun İÇ yüzü kümeye teğet,
 * hendek surun dışında, köyün sınırı da hendeğin dışında.
 */
function frameGeom(surLv, henLv) {
  const thick = wallThick(surLv);
  const band  = moatBand(henLv);
  const wallR = (CLUSTER_REACH + thick / 2) / Math.cos(Math.PI / 6);
  // Sınır çerçeveyi taşmasın: sur 20 + hendek 20'de genişlik 887 px'e çıkıyor,
  // 860'lık görünüme sığmıyordu. Tavan 425 → genişlik 850, yükseklik 736.
  const villageR = Math.min(wallR + thick / 2 + BERM + band + 2, 425);
  return { thick, band, wallR, villageR };
}
const wallThick = (lv) => (0.16 + Math.min(20, lv) * 0.010) * S * 1.2;
const moatBand  = (lv) => (0.26 + Math.min(20, lv) * 0.010) * S;
const BERM      = 0.10 * S;
const WALL_TEX  = 0.85 * S;             // taş dokusu karo boyutu (küçük karo = ince taş)
const GATE_EDGE = 5;                    // alt kenar
/**
 * Kule altıgeninin yarıçapı. SAT çakışma testiyle ölçüldü: 0.76·S'te en
 * yakın bina hücresiyle 13.6 px boşluk kalıyor, sur seviyesi 0–20 aralığının
 * tamamında surun iç yüzünü aşmıyor. (Normal karo 0.90·S)
 */
const TOWER_R   = 0.76 * S;
const KULE_TEX  = BUILDING_TEXTURE.kule;

/** Düz tepeli altıgen (köşeler 60k) — köyün sınırı ve komşu hex'ler */
function bigHex(R, cx, cy) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
  });
}
/** Düz tepeli küçük altıgen (köşeler 60k) — kuleler; hücrelerle aynı yön */
function cellHex(r, cx, cy) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}
const ptsOf  = (a) => a.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
const pathOf = (a) => `M${ptsOf(a).replace(/ /g, 'L')}Z`;
const lerpPt = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** Dekor yerleşimi sabit kalsın diye deterministik gürültü */
const noise = (i, s = 1) => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function VillageFrame({
  cx, cy, sur, hendek, towerSlots = [], villageBuildings = {},
  selected, hovered, onSlot, onHover,
}) {
  const surLv = sur?.level || 0;
  const henLv = hendek?.level || 0;
  const { thick, band, wallR, villageR } = frameGeom(surLv, henLv);
  const VH    = bigHex(villageR, cx, cy);
  const mOut  = bigHex(villageR - 2, cx, cy);
  const mIn   = bigHex(villageR - 2 - band, cx, cy);
  const WALL  = bigHex(wallR, cx, cy);
  const mark  = (key) => (selected === key ? '#f0c860' : hovered === key ? C.ice : null);

  // ── Yollar: hücre kenarları boyunca (binaların arası) ──
  /* Yollar hem çok genişti hem toprak rengiydi; genişlik yarıya indi
     ve renkler kara döndü — bkz. YOLLAR bloğu. */
  const roadW = Math.max(2, 0.11 * S);
  const roadSegs = useMemo(() => {
    const seen = new Set(), out = [];
    for (const { q, r } of ALL_SLOTS) {
      const c = hexToScreen(q, r, cx, cy);
      const v = cellHex(S, c.x, c.y);
      for (let i = 0; i < 6; i++) {
        const p1 = v[i], p2 = v[(i + 1) % 6];
        const k = `${((p1[0] + p2[0]) / 2).toFixed(0)}_${((p1[1] + p2[1]) / 2).toFixed(0)}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push([p1, p2]);
      }
    }
    return out;
  }, [cx, cy]);

  // ── Dekor: köşe ceplerine çam ve kaya ──
  const decor = useMemo(() => {
    const inner = wallR - thick / 2;
    const out = [];
    for (let k = 0; k < 6; k++) {
      const ang = (Math.PI / 3) * k;              // sınırın köşe yönü = en geniş cep
      for (let j = 0; j < 3; j++) {
        const rr = inner * (0.83 + 0.11 * noise(k * 7 + j));
        const sp = ang + (noise(k * 13 + j, 2) - 0.5) * 0.26;
        out.push({
          x: cx + rr * Math.cos(sp), y: cy + rr * Math.sin(sp),
          rock: (k + j) % 4 === 0, i: k + j,
        });
      }
    }
    return out;
  }, [cx, cy, wallR, thick]);

  const gp = lerpPt(WALL[GATE_EDGE], WALL[(GATE_EDGE + 1) % 6], 0.5);
  const gdx = gp[0] - cx, gdy = gp[1] - cy, gL = Math.hypot(gdx, gdy) || 1;

  return (
    <g>
      {/* KÖY ZEMİNİ */}
      <polygon points={ptsOf(VH)} fill="url(#vc-ground)" />
      <polygon points={ptsOf(VH)} fill="none" stroke="rgba(190,214,236,0.10)" strokeWidth={1.2} />

      {/* HENDEK — sınırın hemen içinde, surun dışında.
        * Tek düz bant kaba duruyordu: iki yanına toprak şev, suya derinlik
        * gradyanı ve iki ince dalga çizgisi eklendi.
        */}
      {henLv > 0 ? (
        <g>
          {/* toprak şevler */}
          <path d={`${pathOf(bigHex(villageR - 1, cx, cy))} ${pathOf(bigHex(villageR - 2 - band - 2.5, cx, cy))}`}
            fill="#3b2f22" fillRule="evenodd" opacity={0.85} />
          {/* su */}
          <path d={`${pathOf(mOut)} ${pathOf(mIn)}`} fill="url(#vc-moat)" fillRule="evenodd" />
          {/* dalgalar */}
          <polygon points={ptsOf(bigHex(villageR - 2 - band * 0.34, cx, cy))} fill="none"
            stroke="rgba(178,226,248,0.16)" strokeWidth={Math.max(1, band * 0.10)} />
          <polygon points={ptsOf(bigHex(villageR - 2 - band * 0.72, cx, cy))} fill="none"
            stroke="rgba(178,226,248,0.10)" strokeWidth={Math.max(1, band * 0.08)} />
          {/* kıyı çizgileri — ince */}
          <polygon points={ptsOf(mOut)} fill="none" stroke="rgba(16,28,38,0.6)" strokeWidth={1} />
          <polygon points={ptsOf(mIn)} fill="none" stroke="rgba(150,205,235,0.20)" strokeWidth={1} />
        </g>
      ) : (
        <polygon points={ptsOf(mIn)} fill="none" stroke="rgba(140,170,190,0.13)"
          strokeWidth={2} strokeDasharray="7 9" />
      )}

      {/* DEKOR */}
      {decor.map((d, i) => (d.rock ? (
        <g key={i}>
          <ellipse cx={d.x} cy={d.y + S * 0.09} rx={S * 0.16} ry={S * 0.05} fill="rgba(6,12,20,0.35)" />
          <polygon fill="#5d6570" points={
            `${(d.x - S * 0.16).toFixed(1)},${(d.y + S * 0.07).toFixed(1)} `
            + `${(d.x - S * 0.06).toFixed(1)},${(d.y - S * 0.10).toFixed(1)} `
            + `${(d.x + S * 0.06).toFixed(1)},${(d.y - S * 0.12).toFixed(1)} `
            + `${(d.x + S * 0.16).toFixed(1)},${(d.y + S * 0.07).toFixed(1)}`} />
        </g>
      ) : (
        <g key={i}>
          <ellipse cx={d.x} cy={d.y + S * 0.22} rx={S * 0.17} ry={S * 0.05} fill="rgba(6,12,20,0.4)" />
          <rect x={d.x - S * 0.02} y={d.y + S * 0.08} width={S * 0.04} height={S * 0.13} fill="#3a2b1e" />
          <polygon fill={d.i % 3 ? '#3f5c3c' : '#4d6b46'} points={
            `${d.x.toFixed(1)},${(d.y - S * 0.26).toFixed(1)} `
            + `${(d.x + S * 0.16).toFixed(1)},${(d.y + S * 0.11).toFixed(1)} `
            + `${(d.x - S * 0.16).toFixed(1)},${(d.y + S * 0.11).toFixed(1)}`} />
          <polygon fill="#e8f2fb" fillOpacity={0.26} points={
            `${d.x.toFixed(1)},${(d.y - S * 0.14).toFixed(1)} `
            + `${(d.x + S * 0.10).toFixed(1)},${(d.y + S * 0.01).toFixed(1)} `
            + `${(d.x - S * 0.10).toFixed(1)},${(d.y + S * 0.01).toFixed(1)}`} />
        </g>
      )))}

      {/* YOLLAR */}
      <g>
        {roadSegs.map(([p1, p2], i) => (
          <line key={`a${i}`} x1={p1[0].toFixed(1)} y1={p1[1].toFixed(1)}
            x2={p2[0].toFixed(1)} y2={p2[1].toFixed(1)}
            stroke="rgba(14,26,38,0.55)" strokeWidth={roadW + 3} strokeLinecap="round" />
        ))}
        {roadSegs.map(([p1, p2], i) => (
          <line key={`b${i}`} x1={p1[0].toFixed(1)} y1={p1[1].toFixed(1)}
            x2={p2[0].toFixed(1)} y2={p2[1].toFixed(1)}
            stroke="#7e94a6" strokeWidth={roadW} strokeLinecap="round" />
        ))}
        {roadSegs.map(([p1, p2], i) => (
          <line key={`c${i}`} x1={p1[0].toFixed(1)} y1={p1[1].toFixed(1)}
            x2={p2[0].toFixed(1)} y2={p2[1].toFixed(1)}
            stroke="#a6bccc" strokeWidth={Math.max(1, roadW * 0.42)} strokeLinecap="round" />
        ))}
      </g>
    </g>
  );
}

/**
 * Sur, kuleler ve kapı — HÜCRELERİN ÜSTÜNE çizilir, o yüzden ayrı bileşen.
 * (Zemin/yol/dekor/tarlalar VillageFrame'de, hücrelerin altında kalıyor.)
 */
function VillageWall({
  cx, cy, sur, hendek, towerSlots = [], villageBuildings = {},
  selected, hovered, onSlot, onHover,
}) {
  const surLv = sur?.level || 0;
  const henLv = hendek?.level || 0;
  const { thick, band, wallR, villageR } = frameGeom(surLv, henLv);
  const WALL  = bigHex(wallR, cx, cy);
  const mark  = (key) => (selected === key ? '#f0c860' : hovered === key ? C.ice : null);
  /* Yollar hem çok genişti hem toprak rengiydi; genişlik yarıya indi
     ve renkler kara döndü — bkz. YOLLAR bloğu. */
  const roadW = Math.max(2, 0.11 * S);

  /**
   * MAZGAL DİŞLERİ — eskiden surun üstüne dizilmiş yuvarlak noktalardı ve
   * bu yüzden sur "kaba" görünüyordu. Şimdi her diş, o kenarın YÖNÜNE
   * hizalanmış küçük bir dikdörtgen: dişin üstü açık, yan yüzü koyu.
   */
  const merlons = [];
  if (surLv > 0) {
    const mw = 0.19 * S;                 // diş genişliği (kenar boyunca)
    const md = thick * 0.40;             // diş derinliği (dışa doğru)
    for (let i = 0; i < 6; i++) {
      const a = WALL[i], b = WALL[(i + 1) % 6];
      const segL = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const dx = (b[0] - a[0]) / segL, dy = (b[1] - a[1]) / segL;   // kenar yönü
      const n = Math.max(6, Math.round(segL / (mw * 2)));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        if (i === GATE_EDGE && t > 0.40 && t < 0.60) continue;
        const p = lerpPt(a, b, t);
        const ox = p[0] - cx, oy = p[1] - cy, L = Math.hypot(ox, oy) || 1;
        const nx = ox / L, ny = oy / L;                             // dışa normal
        const i0 = [p[0] + nx * (thick / 2 - md * 0.15), p[1] + ny * (thick / 2 - md * 0.15)];
        const o0 = [p[0] + nx * (thick / 2 + md * 0.85), p[1] + ny * (thick / 2 + md * 0.85)];
        const hw = mw / 2;
        merlons.push(
          <polygon key={`${i}-${k}`} points={ptsOf([
            [i0[0] - dx * hw, i0[1] - dy * hw],
            [o0[0] - dx * hw, o0[1] - dy * hw],
            [o0[0] + dx * hw, o0[1] + dy * hw],
            [i0[0] + dx * hw, i0[1] + dy * hw],
          ])} fill="url(#vc-surtex)" stroke="rgba(24,20,16,0.75)" strokeWidth={0.8} />
        );
      }
    }
  }

  const gp = lerpPt(WALL[GATE_EDGE], WALL[(GATE_EDGE + 1) % 6], 0.5);
  const gdx = gp[0] - cx, gdy = gp[1] - cy, gL = Math.hypot(gdx, gdy) || 1;
  const g1 = [gp[0] - gdx / gL * thick * 0.95, gp[1] - gdy / gL * thick * 0.95];
  const g2 = [gp[0] + gdx / gL * thick * 0.95, gp[1] + gdy / gL * thick * 0.95];
  const gOut = [gp[0] + gdx / gL * (band + BERM + 8), gp[1] + gdy / gL * (band + BERM + 8)];

  return (
    <g>
      {surLv > 0 ? (
        <g>
          {/* 1) surun içe düşen gölgesi — duvarı zeminden ayırır */}
          <polygon points={ptsOf(bigHex(wallR - thick * 0.62, cx, cy))} fill="none"
            stroke="rgba(6,10,16,0.34)" strokeWidth={thick * 0.5} strokeLinejoin="round" />
          {/* 2) taş gövde: koyu kontur + doku */}
          <polygon points={ptsOf(WALL)} fill="none" stroke="#1d1a15" strokeWidth={thick + 5} strokeLinejoin="round" />
          <polygon points={ptsOf(WALL)} fill="none" stroke="url(#vc-surtex)" strokeWidth={thick} strokeLinejoin="round" />
          {/* 3) iç yüz koyu, dış yüz açık — hacim hissi */}
          <polygon points={ptsOf(bigHex(wallR - thick * 0.34, cx, cy))} fill="none"
            stroke="rgba(10,14,20,0.30)" strokeWidth={thick * 0.32} strokeLinejoin="round" />
          <polygon points={ptsOf(bigHex(wallR + thick * 0.30, cx, cy))} fill="none"
            stroke="rgba(228,238,248,0.10)" strokeWidth={thick * 0.28} strokeLinejoin="round" />
          {/* 4) tepe kaplama (harpuşta) çizgisi */}
          <polygon points={ptsOf(WALL)} fill="none"
            stroke="rgba(20,17,13,0.5)" strokeWidth={1.2} strokeLinejoin="round" />
          {/* 5) buzul tonu — sahnenin geneliyle uyum, çok hafif */}
          <polygon points={ptsOf(WALL)} fill="none" stroke="rgba(74,104,136,0.10)"
            strokeWidth={thick} strokeLinejoin="round" />
          {merlons}
          {/* kapı + kapıdan çıkan yol */}
          <line x1={gp[0]} y1={gp[1]} x2={gOut[0]} y2={gOut[1]} stroke="#7e94a6" strokeWidth={roadW + 3} />
          <line x1={g1[0]} y1={g1[1]} x2={g2[0]} y2={g2[1]} stroke="#2a1c10" strokeWidth={thick * 1.6} />
          <line x1={g1[0]} y1={g1[1]} x2={g2[0]} y2={g2[1]} stroke="#6b4a28" strokeWidth={thick * 1.15} />
        </g>
      ) : (
        <polygon points={ptsOf(WALL)} fill="none" stroke="#4a4032" strokeWidth={6}
          strokeDasharray="14 9" opacity={0.7} strokeLinejoin="round" />
      )}

      {/* Tıklama hedefleri: hendek ve sur */}
      {/*
        * Tıklama hedefleri DAR tutuluyor: saydam kalın çizgi de hit-test
        * aldığı için geniş bir halka, altındaki hücre tıklamalarını yutuyor.
        * Sur bandının kendisi + 2 px yeter; hendek kendi bandı kadar.
        */}
      <polygon points={ptsOf(bigHex(villageR - 2 - band / 2, cx, cy))} fill="none"
        stroke={mark('hendek') || 'transparent'} strokeOpacity={mark('hendek') ? 0.9 : 0}
        strokeWidth={Math.max(band, 10)} style={{ cursor: 'pointer' }}
        onClick={() => onSlot('hendek')}
        onMouseEnter={() => onHover('hendek')} onMouseLeave={() => onHover(null)} />
      <polygon points={ptsOf(WALL)} fill="none"
        stroke={mark('sur') || 'transparent'} strokeOpacity={mark('sur') ? 0.9 : 0}
        strokeWidth={thick + 2} style={{ cursor: 'pointer' }}
        onClick={() => onSlot('sur')}
        onMouseEnter={() => onHover('sur')} onMouseLeave={() => onHover(null)} />

      {/* KULELER — sınırın altı köşesi (cepler orada) */}
      {WALL.map((wp, i) => {
        const key = towerSlots[i];
        if (!key) return null;
        const b = villageBuildings[key];
        const lv = b?.level || 0;
        /**
         * Kule artık taş blok değil, köyün diğer hücreleri gibi RESİMLİ
         * normal bir altıgen. Yarıçap ölçüldü: 0.76·S'te en yakın hücreyle
         * 13.6 px boşluk kalıyor ve surun iç yüzünü aşmıyor (bkz. SAT testi).
         */
        const rr = TOWER_R;
        const dx = wp[0] - cx, dy = wp[1] - cy, L = Math.hypot(dx, dy) || 1;
        const inset = thick / 2 + rr + 3;
        const p = [wp[0] - dx / L * inset, wp[1] - dy / L * inset];
        const hp = cellHex(rr, p[0], p[1]);
        const hov = hovered === key, sel = selected === key;
        const hi = sel ? '#f0c860' : hov ? C.ice : null;
        const edge = CAT_EDGE.savunma || C.ice;
        const cid = `vc-kule-${i}`;
        const em = TEXTURE_EMBLEM.kule;
        const es = (em?.size || EMBLEM_SIZE) * 0.85;
        return (
          <g key={key} style={{
              cursor: 'pointer',
              transition: 'transform .18s ease-out, filter .18s ease-out',
              filter: hov ? `brightness(1.14) drop-shadow(0 0 8px ${edge}55)` : undefined,
            }}
            transform={hov ? `translate(${p[0]} ${p[1]}) scale(1.07) translate(${-p[0]} ${-p[1]})` : undefined}
            onClick={() => onSlot(key)}
            onMouseEnter={() => onHover(key)} onMouseLeave={() => onHover(null)}>
            {b ? (
              <g>
                <defs><clipPath id={cid}><polygon points={ptsOf(hp)} /></clipPath></defs>
                <polygon points={ptsOf(hp)} fill={CAT_FILL.savunma || '#2a3a44'} opacity={0.94} />
                <image href={KULE_TEX} x={p[0] - rr} y={p[1] - rr} width={rr * 2} height={rr * 2}
                  clipPath={`url(#${cid})`} opacity={b.building ? 0.45 : 1}
                  preserveAspectRatio="xMidYMid slice" />
                <polygon points={ptsOf(hp)} fill="none"
                  stroke={hi || `${edge}88`} strokeWidth={sel ? 3.2 : hov ? 3 : 1.4} />
                {em && (
                  <g opacity={b.building ? 0.4 : 1}>
                    <circle cx={p[0]} cy={p[1] - rr * 0.44} r={es / 2 + 3.5}
                      fill="rgba(8,14,24,0.62)" stroke={`${edge}66`} strokeWidth={1} />
                    <g transform={`translate(${p[0]} ${p[1] - rr * 0.44}) rotate(${em.rot}) translate(${-es / 2} ${-es / 2})`}>
                      <Icon name={em.icon} size={es} color={edge} strokeWidth={1.5} />
                    </g>
                  </g>
                )}
                {b.building && (
                  <g transform={`translate(${p[0] + rr * 0.34} ${p[1] - rr * 0.92})`} className="tn-pulse">
                    <Icon name="insaat" size={13} color={C.ice} />
                  </g>
                )}
                {/* OKÇU sayacı — kulede personel "işçi" değil okçu */}
                {!b.building && lv >= 1 && (() => {
                  const maxA = lv * (VILLAGE_DEFS.kule?.workersPerLevel || 4);
                  const now = b.workers || 0;
                  return (
                    <g transform={`translate(${p[0] - 16} ${p[1] + 2})`}>
                      <rect x="0" y="0" width="32" height="14" rx="3"
                        fill={now === 0 ? 'rgba(58,20,26,0.9)' : 'rgba(8,20,32,0.88)'}
                        stroke={now === 0 ? C.dangerDim : 'rgba(45,76,115,0.7)'} strokeWidth="0.8" />
                      <text x="16" y="7.5" textAnchor="middle" dominantBaseline="middle"
                        fontFamily={FONT.num} fontSize="9" fontWeight="500"
                        fill={now === 0 ? '#f0b8bd' : C.iceSoft} style={{ userSelect: 'none' }}>
                        {now}/{maxA}
                      </text>
                    </g>
                  );
                })()}
                <text x={p[0]} y={p[1] + rr - 8} textAnchor="middle" dominantBaseline="middle"
                  fontFamily={FONT.head} fontSize={10} fontWeight="700"
                  fill={b.building ? C.ice : C.frost}
                  stroke="#04121e" strokeWidth={2.6} paintOrder="stroke"
                  style={{ userSelect: 'none' }}>
                  {b.building ? fmtTime(b.buildTimeLeft) : `LVL ${lv}`}
                </text>
              </g>
            ) : (
              <g>
                <polygon points={ptsOf(hp)} fill="#1b2630" fillOpacity={0.8}
                  stroke={hi || `${edge}70`} strokeWidth={hi ? 2.6 : 1.5} strokeDasharray="6 5" />
                <g transform={`translate(${p[0] - 11} ${p[1] - 11})`} opacity={0.75}>
                  <Icon name="kule" size={22} color={edge} strokeWidth={1.3} />
                </g>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

// ── Hover bilgi kartı ────────────────────────────────────────────────
function VCHover({ slotKey, building, isTower, isCenter, ring, kind = 'hex', flows, processingRates, railInset = 0 }) {
  const def = building ? VILLAGE_DEFS[building.type] : null;
  const cat = isCenter ? 'merkez' : (building?.type === 'anaBina' ? 'anaBina' : def?.category || '');
  const edge = CAT_EDGE[cat] || C.lineBright;

  const title = isCenter ? 'Ana Bina'
    : building ? (def?.name || building.type)
    : (EMPTY_LABEL[kind] || EMPTY_LABEL.hex);

  const proc = def?.processes;
  const rate = proc ? processingRates?.[proc.output] : null;
  const maxW = building && def ? building.level * (def.workersPerLevel || 3) : 0;

  const Row = ({ k, v, c = C.frost, strong }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '2.5px 0' }}>
      <span style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim }}>{k}</span>
      <span style={num({ fontSize: 11, color: c, fontWeight: strong ? 500 : 400, textAlign: 'right' })}>{v}</span>
    </div>
  );

  // Hex'te kullanılan bina görseli ve AYNI amblem kartta da görünsün
  const tex = isCenter ? MERKEZ_IMG : (building ? BUILDING_TEXTURE[building.type] : null);
  // Videosu olan bina kartta hareketli oynasın; durağan görsel poster olur
  const vid = building ? BUILDING_VIDEO[building.type] : null;
  const hoverEm = building
    ? hexEmblem(building.type)
    : { icon: isTower ? 'kule' : 'ekle', rot: 0, size: EMBLEM_SIZE };

  return (
    <div style={{
      position: 'absolute', top: 10, right: (railInset || 0) + 10, width: 252, zIndex: 40,
      background: 'linear-gradient(180deg, rgba(12,25,40,0.78), rgba(8,17,28,0.78))',
      border: `1px solid ${edge}55`, borderRadius: 8, padding: 11,
      boxShadow: `0 10px 34px rgba(0,0,0,.5), 0 0 14px ${edge}22`,
      backdropFilter: 'blur(20px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.2)', pointerEvents: 'none',
    }} className="tn-rise">
      {/* Bina görseli — KARE kutu, kartın TAM genişliği.
        * DİKKAT: kartın `width: 252` değeri İÇERİK genişliği (content-box),
        * dış genişlik padding'lerle 274. Görsel 252 verilince sağda 11 px
        * boşluk kalıyordu. `calc(100% + 22px)` iki padding'i de kapsar;
        * `aspectRatio` ile kutu kare kalır, kare kaynak kırpılmaz. */}
      {tex && (
        <div style={{
          position: 'relative', width: 'calc(100% + 22px)', aspectRatio: '1 / 1',
          overflow: 'hidden', margin: '-11px -11px 9px', borderRadius: '8px 8px 0 0',
        }}>
          {/* Videosu varsa DOĞRUDAN video; yoksa durağan görsel. */}
          {vid ? (
            <video key={slotKey} src={vid} autoPlay muted loop playsInline preload="auto"
              style={{
                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                backgroundColor: '#0b1420',
              }} />
          ) : (
            <img src={tex} alt="" draggable={false} style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            }} />
          )}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(180deg, rgba(6,12,20,0) 62%, rgba(8,17,28,0.92) 100%)',
          }} />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon name={hoverEm.icon} size={19} color={edge}
          style={hoverEm.rot ? { transform: `rotate(${hoverEm.rot}deg)` } : undefined} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT.head, fontSize: 14, fontWeight: 600, letterSpacing: 0.8, color: C.frost }}>
            {title}
          </div>
          <div style={lbl({ fontSize: 8 })}>{slotKey} · ring {ring}{def?.category ? ` · ${def.category}` : ''}</div>
        </div>
        {building && !building.building && (
          <span style={num({ fontSize: 11, color: C.iceSoft })}>Lvl {building.level}</span>
        )}
      </div>

      {building?.building ? (
        <>
          <Row k={building.level === 0 ? 'İnşa ediliyor' : `Lvl ${building.level} → ${building.level + 1}`}
            v={fmtTime(building.buildTimeLeft)} c={C.ice} strong />
          {building.level >= 1 && (
            <div style={{ marginTop: 5, fontFamily: FONT.ui, fontSize: 9, color: C.good, lineHeight: 1.45 }}>
              Bina çalışmaya devam ediyor — üretim ve kapasite düşmüyor.
            </div>
          )}
        </>
      ) : building ? (
        <>
          {def?.description && (
            <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, lineHeight: 1.5, marginBottom: 7 }}>
              {def.description}
            </div>
          )}
          {/* Sur ve hendek personel almaz: işçi satırı hiç çıkmasın.
            * Kulede personel var ama adı OKÇU. */}
          {maxW > 0 && !NO_WORKER_TYPES.has(building.type) && (
            <Row k={workerTerm(building.type)} v={`${building.workers || 0} / ${maxW}`}
              c={(building.workers || 0) === 0 ? C.danger : C.frost} strong />
          )}

          {/* SAVUNMA BONUSU — kulede okçu dolulukla ölçeklenir */}
          {(() => {
            const lv = Math.min(building.level || 0, 20);
            if (building.type === 'sur') {
              return <Row k="Savunma bonusu" v={`+${SUR_BONUS[lv] || 0}%`} c={C.good} strong />;
            }
            if (building.type === 'hendek') {
              return <Row k="Savunma bonusu" v={`+${HENDEK_BONUS[lv] || 0}%`} c={C.good} strong />;
            }
            if (building.type === 'kule') {
              const pct = towerSlotBonus(building.level, building.workers || 0);
              return (
                <>
                  <Row k="Savunma bonusu" v={`+${pct}%`}
                    c={pct > 0 ? C.good : C.danger} strong />
                  {pct === 0 && (
                    <div style={{ marginTop: 4, fontFamily: FONT.ui, fontSize: 9, color: '#f0b8bd', lineHeight: 1.45 }}>
                      Kule boş — okçu atanmadan savunmaya katkı vermez.
                    </div>
                  )}
                </>
              );
            }
            return null;
          })()}

          {proc && (
            <>
              <div style={{ height: 1, background: C.lineSoft, margin: '6px 0 4px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <Icon name={proc.input} size={13} color={RES_COLOR[proc.input]} />
                <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textDim }}>
                  {RES_LABEL[proc.input]}
                </span>
                <Icon name="artis" size={10} color={C.textMute}
                  style={{ transform: 'rotate(90deg)' }} />
                <Icon name={proc.output} size={13} color={RES_COLOR[proc.output]} />
                <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textDim }}>
                  {RES_LABEL[proc.output]}
                </span>
              </div>
              <Row k="Girdi tüketimi"
                v={rate?.inputPerHour > 0 ? `−${rate.inputPerHour}/sa` : '—'}
                c={rate?.inputPerHour > 0 ? C.warn : C.textMute} />
              <Row k="Çıktı üretimi"
                v={rate?.outputPerHour > 0 ? `+${rate.outputPerHour}/sa` : '—'}
                c={rate?.outputPerHour > 0 ? C.good : C.textMute} />
              {flows?.[proc.input] && (
                <Row k={`${RES_LABEL[proc.input]} net`} v={`${signed(flows[proc.input].net)}/sa`}
                  c={flows[proc.input].net >= 0 ? C.good : C.danger} />
              )}
              {flows?.[proc.output] && (
                <Row k={`${RES_LABEL[proc.output]} stok`}
                  v={flows[proc.output].capacity > 0
                    ? `${Math.floor(flows[proc.output].value)} / ${flows[proc.output].capacity}`
                    : Math.floor(flows[proc.output].value)}
                  c={flows[proc.output].etaKind === 'full' ? C.warn : C.frost} />
              )}
            </>
          )}

          {def?.baseCapacity && (
            <Row k="Kapasite"
              v={(def.baseCapacity + (building.level - 1) * def.capacityPerLevel).toLocaleString('tr-TR')}
              c={C.iceSoft} />
          )}
          {def?.populationPerLevel && (
            <Row k="Nüfus katkısı" v={`+${building.level * def.populationPerLevel}`} c={C.iceSoft} />
          )}
          {def?.bonusTable && (
            <Row k="Savunma bonusu" v={`%${def.bonusTable[building.level] ?? 0}`} c={C.iceSoft} />
          )}
          {building.type === 'ahir' && (
            <Row k="At kapasitesi" v={building.level * (def?.horseCapPerLevel || 5)} c={C.iceSoft} />
          )}
          {building.type === 'cephane' && (
            <Row k="Ortak ekipman havuzu" v={building.level * (def?.poolCapPerLevel || 200)} c={C.iceSoft} />
          )}
        </>
      ) : (
        <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textFaint, lineHeight: 1.5 }}>
          {isTower
            ? `Bu slota yalnızca Kule inşa edilebilir (en fazla ${VILLAGE_DEFS.kule?.maxInstances || 6} kule).`
            : 'İnşa menüsünü açmak için tıkla.'}
        </div>
      )}
    </div>
  );
}

// ── Ana bileşen ──────────────────────────────────────────────────────
export default function VillageCenter({
  villageBuildings = {}, towerSlots = [], freeWorkers = 0, resources = {},
  processingRates = {}, flows = {}, railInset = 0,
  equipment = {}, equipmentCaps = {}, equipmentPool = { capacity: 0, used: 0, free: 0 },
  equipmentQueues = {}, equipmentByBuilding = {}, equipmentDefs = {},
  unitQueues = {}, unitsByBuilding = {}, unitDefs = {},
  onBuild, onUpgrade, onDemolish, onAssignVillageWorkers, onCancelBuild,
  onQueueEquipment, onCancelEquipment, onTrainUnit, onCancelUnitOrder,
  onOpenHelp,
  world = null,
  // Zaman ölçeği: tahmin kutuları oyun dakikasını gerçek saniyeye bunlarla çevirir
  hourSeconds = 3600, worldSpeed = 1,
  culture = null, festival = null, festivalDefs = {}, onStartFestival,
  /**
   * ÇOKLU KÖY: saray oyuncu çapında tek, merkez de saraydan taşınıyor.
   * `uniqueOwners` hangi köyde saray var, `capitalSlot` merkez hangi köy.
   */
  villages = [], activeSlot = null, capitalSlot = null, uniqueOwners = {},
  onSetCapital,
}) {
  const [selected, setSelected] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [viewSize, setViewSize] = useState({ w: 900, h: 720 });
  const containerRef = useRef(null);

  const W = 860, H = 860;
  const cx = W / 2, cy = H / 2;
  const towerSet = new Set(towerSlots);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      const rect = containerRef.current.getBoundingClientRect();
      setViewSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  /**
   * SAHNE ÖLÇEĞİ.
   *
   * Sahne 860×860 sabit çiziliyordu ve kaba sığmayınca kırpılıyordu: 390 px'lik
   * bir telefonda köyün yalnız ortası görünüyordu. Artık iki çarpan var —
   * `fitScale` sahneyi kaba sığdırır, `zoom` oyuncunun iki parmakla yaptığı
   * yakınlaştırmadır. Popover konumu da bu ölçeği kullandığı için paneller
   * doğru yerde açılmaya devam ediyor.
   */
  const fitScale = useMemo(() => {
    const bandW = Math.max(220, (viewSize.w || W) - 2 * railInset);
    const bandH = Math.max(220, (viewSize.h || H) - 12);
    return Math.min(1, bandW / W, bandH / H);
  }, [viewSize.w, viewSize.h, railInset]);

  const hoverable = useHoverable();
  const pinch = usePinchPan({
    min: 1, max: 3.2,
    viewW: viewSize.w, viewH: viewSize.h,
    contentW: W * fitScale, contentH: H * fitScale,
  });
  const VC_SCALE = fitScale * pinch.zoom;
  const selB = selected ? villageBuildings[selected] : null;
  // Yükseltme sırasında da bina çalıştığı için kuyruk paneli açık kalır
  const hasQueuePanel = !!selB && selB.level >= 1
    && (EQUIPMENT_BUILDINGS.has(selB.type) || TRAINING_BUILDINGS.has(selB.type));

  // Eğitim binalarında birim kartları görselli ve 4 sütun — pencere daha geniş olmalı
  const isTraining = !!selB && selB.level >= 1 && TRAINING_BUILDINGS.has(selB.type)
    && (unitsByBuilding[selB.type] || []).length > 0;

  /**
   * POSTER BİÇİMİ: dar pencere (430) + üstte büyük bina görseli + tek sütun.
   * Geniş pencerede kare görsel ya kırpılıyor ya da yanlarda boş bant
   * bırakıyordu; dar pencerede görsel neredeyse tam sığıyor.
   * İSTİSNA — eğitim binaları: birim kartları 4 sütun olarak isteniyor,
   * 430'a sığmaz. Onlar geniş kalır, görsel de o pencerede daha çok kırpılır.
   */
  const POSTER_W = 860;   // 430 -> 860: birim kartlari ve govde daha genis gorunsun
  const POSTER_H = 800;
  // HER bina paneli aynı boyutta açılır; içerik değişse de kutu oynamaz
  // Ekran darsa panel tasmasin: en az 430, en cok POSTER_W
  const panelW = Math.min(POSTER_W, Math.max(430, (viewSize.w || POSTER_W) - 24));
  // Panel ekrandan tasmasin: dikey kaydirma ihtiyaci kalmasin
  const prefH = Math.min(POSTER_H, Math.max(420, (viewSize.h || POSTER_H) - 20));

  const popoverPos = useMemo(() => {
    if (!selected || !showMenu) return null;
    // İsimli slotlar (sur, hendek, kule1…) koordinat DEĞİL — merkezden hesapla
    const isHex = selected.includes(',');
    const [sq, sr] = isHex ? selected.split(',').map(Number) : [0, 0];
    const { x: hx, y: hy } = isHex ? hexToScreen(sq, sr, cx, cy) : { x: cx, y: cy };
    return computePopoverPos({
      hexScreenX: viewSize.w / 2 + (hx - cx) * VC_SCALE,
      hexScreenY: viewSize.h / 2 + (hy - cy) * VC_SCALE * 0.95,
      hexRadius: S * VC_SCALE,
      viewW: viewSize.w, viewH: viewSize.h,
      panelW, prefH,
      insetLeft: railInset, insetRight: railInset,
      center: true,      // panel hep ekranın ortasında açılsın
    });
  }, [selected, showMenu, viewSize.w, viewSize.h, cx, cy, panelW, prefH, railInset]);

  function handleSlotClick(slotKey) {
    if (selected === slotKey) { setSelected(null); setShowMenu(false); }
    else { setSelected(slotKey); setShowMenu(true); }
  }

  const selectedBuilding = selected ? villageBuildings[selected] : null;
  const hoveredSlot = hovered ? ALL_SLOTS.find(s => `${s.q},${s.r}` === hovered) : null;
  const hoveredKind  = hovered  ? slotKindOf(hovered, towerSet)  : 'hex';
  const selectedKind = selected ? slotKindOf(selected, towerSet) : 'hex';

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div ref={containerRef} {...pinch.handlers} style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', zIndex: 2,
        perspective: '1400px', perspectiveOrigin: '50% 50%',
        cursor: pinch.dragging ? 'grabbing' : 'pointer',
        ...pinch.handlers.style,
      }}>
        <svg width={W} height={H} style={{
          cursor: 'pointer', flexShrink: 0,
          transform: `translate3d(${pinch.pan.x}px, ${pinch.pan.y}px, 0)`
            + ` scale(${VC_SCALE}) rotateX(16deg)`,
          transformStyle: 'preserve-3d', transformOrigin: 'center center',
          transition: pinch.dragging ? 'none' : 'transform .12s ease-out',
        }}>
          <defs>
            {/*
              Köy zemini yeşil çimendi ve arayüzün nordic buz paletiyle
              çarpışıyordu. Artık karlı-buzlu soğuk mavi: ortada ışık alan
              açık buz, kenarlarda gölgeli lacivert.
            */}
            <radialGradient id="vc-ground" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#3c5872" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#16232f" stopOpacity="0.55" />
            </radialGradient>
            <linearGradient id="vc-water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#12384d" />
              <stop offset="100%" stopColor="#071a26" />
            </linearGradient>
            {/* Hendek suyu: kıyıda sığ, ortada derin */}
            <radialGradient id="vc-moat" cx="50%" cy="50%" r="52%">
              <stop offset="82%" stopColor="#0a2534" />
              <stop offset="93%" stopColor="#17475f" />
              <stop offset="100%" stopColor="#0d2c3d" />
            </radialGradient>
            <linearGradient id="vc-stone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8d8478" />
              <stop offset="100%" stopColor="#5e574c" />
            </linearGradient>
            <pattern id="vc-surtex" patternUnits="userSpaceOnUse"
              width={WALL_TEX} height={WALL_TEX}>
              <image href={surTexture} x="0" y="0"
                width={WALL_TEX} height={WALL_TEX} preserveAspectRatio="none" />
            </pattern>
          </defs>

          {/* KÖY ÇERÇEVESİ: tarlalar, zemin, hendek, dekor, yollar — hücrelerin ALTINDA */}
          <VillageFrame
            cx={cx} cy={cy}
            sur={villageBuildings.sur} hendek={villageBuildings.hendek}
            towerSlots={towerSlots} villageBuildings={villageBuildings}
            selected={selected} hovered={hovered}
            onSlot={handleSlotClick} onHover={hoverable ? setHovered : () => {}} />

          {ALL_SLOTS.map(({ q, r, ring }) => {
            const key = `${q},${r}`;
            const { x, y } = hexToScreen(q, r, cx, cy);
            const building = villageBuildings[key];
            const isTower = towerSet.has(key);
            const isCenter = key === '0,0';
            const isSelected = selected === key;
            const isHovered = hovered === key;
            const isRing3 = ring === 3;

            const cat = isCenter ? 'merkez'
              : building ? (building.type === 'anaBina' ? 'anaBina' : VILLAGE_DEFS[building.type]?.category || '')
              : '';

            let fill = isRing3 ? '#1e2d3b' : '#284054';
            if (isCenter) fill = CAT_FILL.merkez;
            else if (isTower) fill = '#2a3a44';
            else if (building) fill = CAT_FILL[cat] || '#284054';

            const edge = CAT_EDGE[cat] || C.lineBright;
            const stroke = isSelected || isHovered ? edge
              : isTower ? 'rgba(143,188,255,0.6)'
              : isCenter ? '#f0c860'
              : building ? `${edge}88`
              : isRing3 ? 'rgba(150,186,220,0.25)'
              : 'rgba(158,200,234,0.4)';
            const sw = isSelected ? 3.2 : isHovered ? 3 : isCenter ? 2.4 : 1.4;

            const tex = isCenter ? MERKEZ_IMG : (building ? BUILDING_TEXTURE[building.type] : null);
            const hasTex = !!tex;
            const clipId = `vc-${q}-${r}`;
            const idle = building && building.level >= 1
              && (VILLAGE_DEFS[building.type]?.processes || ['silahci','zirh','ahir','kisla','atolye'].includes(building.type))
              && !(building.workers > 0);

            return (
              <g key={key}
                onClick={() => handleSlotClick(key)}
                onMouseEnter={() => hoverable && setHovered(key)}
                onMouseLeave={() => setHovered(prev => (prev === key ? null : prev))}
                transform={isHovered ? `translate(${x} ${y}) scale(1.06) translate(${-x} ${-y})` : undefined}
                style={{
                  cursor: 'pointer',
                  transition: 'transform .18s ease-out, filter .18s ease-out',
                  filter: isHovered ? `brightness(1.14) drop-shadow(0 0 8px ${edge}55)` : undefined,
                }}>

                {hasTex && (
                  <defs><clipPath id={clipId}><polygon points={hexPoints(x, y)} /></clipPath></defs>
                )}

                <polygon points={hexPoints(x, y)} fill={fill} stroke="none" opacity={0.94} />

                {hasTex && (
                  <image href={tex} x={x - S} y={y - S} width={S * 2} height={S * 2}
                    clipPath={`url(#${clipId})`}
                    opacity={building?.building ? 0.45 : 1}
                    preserveAspectRatio="xMidYMid slice" />
                )}

                <polygon points={hexPoints(x, y)} fill="none" stroke={stroke} strokeWidth={sw} />

                {/* Texture'lı binalarda tepe amblemi */}
                {building && hasTex && TEXTURE_EMBLEM[building.type] && (() => {
                  const em = TEXTURE_EMBLEM[building.type];
                  const es = em.size || EMBLEM_SIZE;
                  const ey = y - EMBLEM_DY;
                  return (
                    <g opacity={building.building ? 0.4 : 1}>
                      <circle cx={x} cy={ey} r={es / 2 + 4} fill="rgba(8,14,24,0.62)" stroke={`${edge}66`} strokeWidth={1} />
                      <g transform={`translate(${x} ${ey}) rotate(${em.rot}) translate(${-es / 2} ${-es / 2})`}>
                        <Icon name={em.icon} size={es} color={edge} strokeWidth={1.5} />
                      </g>
                    </g>
                  );
                })()}

                {/* Bina ikonu (texture'lı olanlar hariç) */}
                {building && !hasTex && (
                  <g transform={`translate(${x - 13} ${y - 20})`}
                    opacity={building.building ? 0.4 : 1}>
                    <Icon name={buildingIcon(building.type)} size={26} color={edge} strokeWidth={1.4} />
                  </g>
                )}

                {/* İnşaat göstergesi */}
                {building?.building && (
                  <g transform={`translate(${x + 13} ${y - 30})`} className="tn-pulse">
                    <Icon name="insaat" size={15} color={C.ice} />
                  </g>
                )}

                {/* İşçisiz uyarısı */}
                {idle && (
                  <g transform={`translate(${x + 14} ${y - 30})`}>
                    <Icon name="uyari" size={14} color={C.warn} />
                  </g>
                )}

                {/* İşçi sayacı */}
                {building && building.level >= 1 && (() => {
                  const d = VILLAGE_DEFS[building.type];
                  // Tek kaynak flows.js: buradaki elle yazılmış kopyada `kule`
                  // eksikti, o yüzden kulelerin okçu sayacı hiç görünmüyordu.
                  const maxW = maxWorkersOf(building.type, d, building.level);
                  if (maxW <= 0) return null;
                  return (
                    <g transform={`translate(${x - 16} ${y + 4})`}>
                      <rect x="0" y="0" width="32" height="14" rx="3"
                        fill={idle ? 'rgba(58,20,26,0.9)' : 'rgba(8,20,32,0.88)'}
                        stroke={idle ? C.dangerDim : 'rgba(45,76,115,0.7)'} strokeWidth="0.8" />
                      <text x="16" y="7.5" textAnchor="middle" dominantBaseline="middle"
                        fontFamily={FONT.num} fontSize="9" fontWeight="500"
                        fill={idle ? '#f0b8bd' : C.iceSoft} style={{ userSelect: 'none' }}>
                        {building.workers || 0}/{maxW}
                      </text>
                    </g>
                  );
                })()}

                {/* Seviye / süre */}
                {building && (
                  <text x={x} y={y + S - 12} textAnchor="middle" dominantBaseline="middle"
                    fontFamily={FONT.head} fontSize={11} fontWeight="700"
                    fill={building.building ? C.ice : C.frost}
                    stroke="#04121e" strokeWidth={2.6} paintOrder="stroke"
                    style={{ userSelect: 'none' }}>
                    {building.building ? fmtTime(building.buildTimeLeft) : `LVL ${building.level}`}
                  </text>
                )}

                {/* Boş slot işareti */}
                {!building && !isCenter && (
                  isTower ? (
                    <g transform={`translate(${x - 11} ${y - 11})`} opacity="0.5">
                      <Icon name="kule" size={22} color="#7fb4ff" strokeWidth={1.3} />
                    </g>
                  ) : (
                    <path d={`M ${x - 8} ${y} H ${x + 8} M ${x} ${y - 8} V ${y + 8}`}
                      stroke={isRing3 ? 'rgba(127,212,255,0.2)' : 'rgba(127,212,255,0.35)'}
                      strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  )
                )}
              </g>
            );
          })}
          {/* SUR · KULELER · KAPI — hücrelerin ÜSTÜNDE */}
          <VillageWall
            cx={cx} cy={cy}
            sur={villageBuildings.sur} hendek={villageBuildings.hendek}
            towerSlots={towerSlots} villageBuildings={villageBuildings}
            selected={selected} hovered={hovered}
            onSlot={handleSlotClick} onHover={hoverable ? setHovered : () => {}} />
        </svg>

        {/*
          YAKINLAŞTIRMA — dokunmatikte iki parmak zaten çalışıyor, bu düğmeler
          tek elle kullananlar ve fare için. Sahne kaba sığdırıldığı için
          "sığdır" başlangıç durumuna döner.
        */}
        {(!hoverable || pinch.zoom !== 1) && (
          <div style={{
            position: 'absolute', left: railInset, bottom: 10, zIndex: 8,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {[
              { t: '−', f: () => pinch.setZoom(z => Math.max(1, +(z / 1.3).toFixed(3))), title: 'Uzaklaş' },
              { t: '+', f: () => pinch.setZoom(z => Math.min(3.2, +(z * 1.3).toFixed(3))), title: 'Yakınlaş' },
            ].map(b => (
              <button key={b.t} type="button" onClick={b.f} title={b.title}
                style={{
                  width: TAP - 8, height: TAP - 8, display: 'grid', placeItems: 'center',
                  borderRadius: 6, cursor: 'pointer',
                  background: 'rgba(12,20,28,0.72)', border: `1px solid ${C.lineSoft}`,
                  color: C.iceSoft, fontFamily: FONT.ui, fontSize: 17, lineHeight: 1,
                }}>{b.t}</button>
            ))}
            {pinch.zoom !== 1 && (
              <button type="button" onClick={pinch.reset} title="Ekrana sığdır"
                style={{
                  height: TAP - 8, padding: '0 10px', borderRadius: 6, cursor: 'pointer',
                  background: 'rgba(12,20,28,0.72)', border: `1px solid ${C.lineSoft}`,
                  color: C.iceSoft, fontFamily: FONT.ui, fontSize: 10, letterSpacing: 0.6,
                }}>SIĞDIR</button>
            )}
          </div>
        )}

        {/* Hover bilgi kartı */}
        {hovered && !showMenu && (hoveredSlot || hoveredKind !== 'hex') && (
          <VCHover slotKey={hovered} building={villageBuildings[hovered]}
            isTower={hoveredKind === 'kule'} isCenter={hovered === '0,0'}
            kind={hoveredKind}
            ring={hoveredSlot?.ring} flows={flows} processingRates={processingRates}
            railInset={railInset} />
        )}

        {/* İnşa / yönetim paneli */}
        {showMenu && selected && popoverPos && (() => {
          /**
           * Bina görseli panelin ARKA PLANI olur, yazılar yarı saydam bir cam
           * zeminde durur (asker kartlarındaki düzenin aynısı). Görsel
           * kutunun kendisine boyandığı için içerik kaydırılırken sabit kalır.
           */
          const panelTex = selected === '0,0'
            ? MERKEZ_IMG
            : (selectedBuilding ? BUILDING_TEXTURE[selectedBuilding.type] : null);
          const panelEm = selectedBuilding ? TEXTURE_EMBLEM[selectedBuilding.type] : null;
          const panelTitle = selected === '0,0' ? 'Ana Bina'
            : selectedBuilding
              ? (VILLAGE_DEFS[selectedBuilding.type]?.name || selectedBuilding.type)
              : (towerSet.has(selected) ? 'Kule Slotu' : 'Boş Arazi');
          const panelEdge = CAT_EDGE[
            selected === '0,0' ? 'merkez'
              : selectedBuilding?.type === 'anaBina' ? 'anaBina'
              : (selectedBuilding ? VILLAGE_DEFS[selectedBuilding.type]?.category : '')
          ] || C.lineBright;

          // Bu binanin panel arka planinda oynayacak videosu (varsa)
          const panelVid = selectedBuilding ? BUILDING_VIDEO[selectedBuilding.type] : null;

          // Govde sirasi: savascilar gorselin hemen altinda, digerleri altta
          const hasEquipment = !!selectedBuilding && selectedBuilding.level >= 1
            && EQUIPMENT_BUILDINGS.has(selectedBuilding.type);
          const hasTraining = !!selectedBuilding && selectedBuilding.level >= 1
            && TRAINING_BUILDINGS.has(selectedBuilding.type)
            && (unitsByBuilding[selectedBuilding.type] || []).length > 0;
          // Taverna: şölen paneli (kültür puanı üretimi)
          const hasFestival = selectedBuilding?.type === 'taverna';
          // Saray: merkez taşıma denetimi burada
          const hasCapital  = selectedBuilding?.type === 'saray';

          /**
           * ARKA PLAN: görsel panelin tamamına yayılır ama KOYU bir gradyanla
           * bastırılır — yazı katmanı saydam olduğu için altındaki görselin
           * kontrastı düşük kalmalı.
           */
          const bgStyle = panelTex ? {
            padding: 0,
            backgroundColor: '#0b1420',
            // Gövdenin arkasında görselin çok soluk bir kopyası — poster
            // hissi sürsün ama yazıların kontrastı düşmesin
            backgroundImage:
              'linear-gradient(180deg, rgba(6,12,20,0.86) 0%, rgba(6,12,20,0.93) 100%), '
              + `url(${panelTex})`,
            backgroundSize: '100% 100%, cover',
            backgroundPosition: 'top center, center',
            backgroundRepeat: 'no-repeat, no-repeat',
          } : {};

          const glass = panelTex ? {
            // Daha saydam: bina görseli yazıların ardından okunsun
            background: 'rgba(8,15,24,0.40)',
            backdropFilter: 'blur(11px) saturate(1.1)',
            WebkitBackdropFilter: 'blur(11px) saturate(1.1)',
            borderTop: '1px solid rgba(255,255,255,0.09)',
          } : {};

          return (
          <div style={popoverStyle(popoverPos, { overflowY: 'auto', ...bgStyle })}
            className="tn-rise tn-scroll">
            {/* Görsel penceresi — panelin tepesinde bina net görünür */}
            {panelTex && (
              /**
               * POSTER BAŞLIĞI — pencere KARE (aspect-ratio 1/1), görseller de
               * kare olduğu için HİÇ KIRPILMAZ. Dikdörtgen pencerede `cover`
               * her seferinde bir yerden kesiyordu (önce çatı, sonra taban).
               * Bina adı ve düğmeler görselin üstüne biner.
               */
              <div style={{
                position: 'relative', width: '100%',
                // video varsa 16:9 pencere + contain => HIC kirpilmaz; jpg'de genis banner
                aspectRatio: panelVid ? '16 / 9' : '18 / 5',
                backgroundColor: '#0b1420',
                flexShrink: 0, overflow: 'hidden',
              }}>
                {panelVid ? (
                  <video src={panelVid} poster={panelTex} autoPlay muted loop playsInline
                    style={{
                      width: '100%', height: '100%', objectFit: 'contain', display: 'block',
                      backgroundColor: '#0b1420',
                    }} />
                ) : (
                  <img src={panelTex} alt="" draggable={false} style={{
                    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                  }} />
                )}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'linear-gradient(180deg, rgba(6,12,20,0) 40%,'
                    + ' rgba(6,12,20,0.62) 74%, rgba(8,15,24,0.94) 100%)',
                }} />

                {/* Sağ üst: amblem + yık + kapat */}
                <div style={{
                  position: 'absolute', top: 9, right: 10, zIndex: 2,
                  display: 'flex', alignItems: 'center', gap: 7,
                }}>
                  {panelEm && (
                    <div style={{
                      display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 15,
                      background: 'rgba(8,14,24,0.66)', border: `1px solid ${panelEdge}66`,
                      transform: panelEm.rot ? `rotate(${panelEm.rot}deg)` : undefined,
                    }}>
                      <Icon name={panelEm.icon} size={panelEm.size || 17} color={panelEdge} strokeWidth={1.5} />
                    </div>
                  )}
                  {selectedBuilding && selectedBuilding.type !== 'anaBina' && !selectedBuilding.building && (
                    <button onClick={() => { onDemolish(selected); setShowMenu(false); setSelected(null); }}
                      title="Yık" style={{
                        display: 'grid', placeItems: 'center', width: 30, height: 30, padding: 0,
                        borderRadius: 15, cursor: 'pointer',
                        background: 'rgba(74,29,36,0.72)', border: `1px solid ${C.dangerDim}`,
                      }}>
                      <Icon name="yik" size={15} color="#f0b8bd" strokeWidth={2.3} />
                    </button>
                  )}
                  {/* Yardım — bu binanın ansiklopedi sayfasına git */}
                  {selectedBuilding && onOpenHelp && (
                    <button onClick={() => onOpenHelp(`bina:${selectedBuilding.type}`)}
                      title={`${panelTitle} — yardım sayfası`} style={{
                        display: 'grid', placeItems: 'center', width: 30, height: 30, padding: 0,
                        borderRadius: 15, cursor: 'pointer',
                        background: 'rgba(8,14,24,0.66)', border: `1px solid ${panelEdge}66`,
                      }}>
                      <Icon name="bilgi" size={15} color={panelEdge} strokeWidth={1.7} />
                    </button>
                  )}
                  <button onClick={() => { setShowMenu(false); setSelected(null); }}
                    title="Kapat" style={{
                      display: 'grid', placeItems: 'center', width: 30, height: 30, padding: 0,
                      borderRadius: 15, cursor: 'pointer',
                      background: 'rgba(8,14,24,0.66)', border: `1px solid ${C.lineBright}`,
                    }}>
                    <Icon name="kapat" size={14} color={C.textDim} strokeWidth={2} />
                  </button>
                </div>

                {/* Sol alt: bina adı + seviye, görselin üstünde */}
                <div style={{ position: 'absolute', left: 13, right: 13, bottom: 9, zIndex: 2 }}>
                  <div style={{
                    fontFamily: FONT.head, fontSize: 25, fontWeight: 600, letterSpacing: 1.1,
                    color: C.frost, lineHeight: 1.1, textShadow: '0 2px 8px rgba(0,0,0,0.95)',
                  }}>{panelTitle}</div>
                  <div style={{
                    fontFamily: FONT.ui, fontSize: 9, letterSpacing: 1.5, marginTop: 2,
                    color: C.textDim, textTransform: 'uppercase',
                    textShadow: '0 1px 5px rgba(0,0,0,0.95)',
                  }}>
                    {selectedBuilding && !selectedBuilding.building
                      ? `LVL ${selectedBuilding.level} · ${selected}`
                      : `slot ${selected}`}
                  </div>
                </div>
              </div>
            )}

            <div style={{ ...glass, display: 'flex', flexDirection: 'column' }}>

            {/* SIRA: bina gorseli -> savascilar -> isci/yukseltme + ekipman */}
            {hasCapital && (
              <div style={{ padding: '0 12px 10px', order: 1 }}>
                <CapitalPanel
                  level={selectedBuilding.level}
                  building={!!selectedBuilding.building}
                  isCapital={!capitalSlot || capitalSlot === activeSlot}
                  capitalName={villages.find(v => v.slotKey === capitalSlot)?.name || null}
                  villageName={villages.find(v => v.slotKey === activeSlot)?.name || 'bu köy'}
                  onSetCapital={() => onSetCapital?.(activeSlot)} />
              </div>
            )}

            {hasFestival && (
              <div style={{ padding: '0 12px 10px', order: 1 }}>
                <FestivalPanel
                  level={selectedBuilding.level}
                  culture={culture}
                  festival={festival}
                  festivalDefs={festivalDefs}
                  resources={resources}
                  hourSeconds={hourSeconds}
                  worldSpeed={worldSpeed}
                  onStartFestival={onStartFestival} />
              </div>
            )}

            {hasTraining && (
              <div style={{ padding: '0 12px 10px', order: 1 }}>
                <UnitTrainingPanel
                  buildingType={selectedBuilding.type}
                  buildingLevel={selectedBuilding.level || 0}
                  buildingName={VILLAGE_DEFS[selectedBuilding.type]?.name || 'Bina'}
                  unitsByBuilding={unitsByBuilding}
                  unitDefs={unitDefs}
                  equipmentDefs={equipmentDefs}
                  equipment={equipment}
                  queue={unitQueues[selectedBuilding.type] || []}
                  freeWorkers={freeWorkers}
                  trainerWorkers={selectedBuilding.workers || 0}
                  hourSeconds={hourSeconds} worldSpeed={worldSpeed}
                  onTrain={(type, qty) => onTrainUnit(selectedBuilding.type, type, qty)}
                  onCancel={(orderId) => onCancelUnitOrder(selectedBuilding.type, orderId)}
                />
              </div>
            )}

            <div style={{
              order: 2, display: 'grid',
              gridTemplateColumns: hasEquipment ? '1fr 1fr' : '1fr',
              alignItems: 'start',
            }}>
            <div style={{ minWidth: 0 }}>
            <BuildMenu
              posterHeader={!!panelTex}
              onOpenHelp={onOpenHelp}
              uniqueOwners={uniqueOwners}
              villages={villages}
              activeSlot={activeSlot}
              hourSeconds={hourSeconds} worldSpeed={worldSpeed}
              slotKey={selected}
              building={selectedBuilding}
              isTower={selectedKind === 'kule'}
              slotKind={selectedKind}
              isCenter={selected === '0,0'}
              placedBuildings={villageBuildings}
              freeWorkers={freeWorkers}
              resources={resources}
              processingRates={processingRates}
              flows={flows}
              onBuild={(type, workers) => { onBuild(selected, type, workers); setShowMenu(false); setSelected(null); }}
              onUpgrade={(workers) => { onUpgrade(selected, workers); setShowMenu(false); setSelected(null); }}
              onDemolish={() => { onDemolish(selected); setShowMenu(false); setSelected(null); }}
              onAssignVillageWorkers={(workers) => onAssignVillageWorkers(selected, workers)}
              onCancelBuild={() => { onCancelBuild?.(selected); setShowMenu(false); setSelected(null); }}
              onClose={() => { setShowMenu(false); setSelected(null); }}
            />
            </div>

            <div style={{ minWidth: 0 }}>
            {selectedBuilding && EQUIPMENT_BUILDINGS.has(selectedBuilding.type)
              && selectedBuilding.level >= 1 && (
              <div style={{ padding: '0 12px 12px' }}>
                <EquipmentPanel
                  buildingType={selectedBuilding.type}
                  equipmentByBuilding={equipmentByBuilding}
                  equipmentDefs={equipmentDefs}
                  equipment={equipment}
                  equipmentCaps={equipmentCaps}
                  equipmentPool={equipmentPool}
                  queue={equipmentQueues[selectedBuilding.type] || []}
                  resources={resources}
                  buildingWorkers={selectedBuilding.workers || 0}
                  hourSeconds={hourSeconds} worldSpeed={worldSpeed}
                  onQueue={(type, qty) => onQueueEquipment(selectedBuilding.type, type, qty)}
                  onCancel={(orderId) => onCancelEquipment(selectedBuilding.type, orderId)}
                />
              </div>
            )}

            </div>
            </div>
            </div>{/* cam katman */}
          </div>
          );
        })()}

        {/* Sol alt — kategori anahtarı */}
        <div style={{
          position: 'absolute', bottom: 10, left: railInset + 10, zIndex: 30,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 11px', borderRadius: 7,
          background: 'rgba(9,18,30,0.55)', border: `1px solid ${C.lineSoft}`,
          backdropFilter: 'blur(12px) saturate(1.15)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.15)',
        }}>
          {[['isleme', 'İşleme'], ['askeri', 'Askeri'], ['depo', 'Depo'],
            ['nufus', 'Nüfus'], ['savunma', 'Savunma']].map(([k, t]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: CAT_EDGE[k] }} />
              <span style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint }}>{t}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
