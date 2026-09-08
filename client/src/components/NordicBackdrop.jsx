/**
 * NordicBackdrop — kodla çizilmiş fiyort manzarası.
 * Ek görsel dosyası yok; katmanlı SVG + CSS animasyon.
 *
 * Katmanlar (arkadan öne): gökyüzü → yıldızlar → aurora → uzak dağlar →
 * orta dağlar → fiyort suyu → yakın kıyı + köy silueti → sis
 *
 * parallax: {x, y} verilirse katmanlar farklı hızlarda kayar (harita pan'ı ile).
 */
import { memo, useMemo } from 'react';

function Stars({ seed = 1, count = 90 }) {
  const stars = useMemo(() => {
    let s = seed * 9301 + 49297;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    return Array.from({ length: count }, () => ({
      x: rnd() * 1600,
      y: rnd() * 380,
      r: 0.4 + rnd() * 1.1,
      o: 0.25 + rnd() * 0.6,
      d: 2 + rnd() * 5,
    }));
  }, [seed, count]);

  return (
    <g>
      {stars.map((st, i) => (
        <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#dceefc" opacity={st.o}>
          <animate attributeName="opacity"
            values={`${st.o};${st.o * 0.3};${st.o}`}
            dur={`${st.d}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

function NordicBackdropInner({ parallax = { x: 0, y: 0 }, variant = 'fjord', dim = 0 }) {
  // Parallax'ı 12px'lik adımlara yuvarla — sürüklerken her pikselde
  // 110 yıldız + aurora yeniden çizilmesin.
  const px = Math.round((parallax.x || 0) / 12) * 12;
  const py = Math.round((parallax.y || 0) / 12) * 12;

  // Katman kayma katsayıları — uzak katman az, yakın katman çok kayar
  const L = (f) => `translate(${(px * f).toFixed(1)} ${(py * f * 0.35).toFixed(1)})`;

  const isCourtyard = variant === 'courtyard';

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      pointerEvents: 'none', zIndex: 0,
    }}>
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <linearGradient id="nb-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#040810" />
            <stop offset="38%"  stopColor="#081725" />
            <stop offset="68%"  stopColor="#123a52" />
            <stop offset="100%" stopColor="#1b5678" />
          </linearGradient>

          <linearGradient id="nb-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#1f668c" />
            <stop offset="45%"  stopColor="#0e304a" />
            <stop offset="100%" stopColor="#071b28" />
          </linearGradient>

          <linearGradient id="nb-aurora1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#3fe0b0" stopOpacity="0" />
            <stop offset="30%"  stopColor="#4ff0c0" stopOpacity="0.62" />
            <stop offset="60%"  stopColor="#6bb8ff" stopOpacity="0.52" />
            <stop offset="100%" stopColor="#9d7ce8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="nb-aurora2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#5aa8ff" stopOpacity="0" />
            <stop offset="45%"  stopColor="#4ff0c0" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#5aa8ff" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="nb-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a5f7d" />
            <stop offset="100%" stopColor="#1a4058" />
          </linearGradient>
          <linearGradient id="nb-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#204a66" />
            <stop offset="100%" stopColor="#123145" />
          </linearGradient>
          <linearGradient id="nb-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b1d2c" />
            <stop offset="100%" stopColor="#060f18" />
          </linearGradient>

          <filter id="nb-blur-sm"><feGaussianBlur stdDeviation="8" /></filter>
          <filter id="nb-blur-lg"><feGaussianBlur stdDeviation="34" /></filter>

          <radialGradient id="nb-vignette" cx="50%" cy="46%" r="72%">
            <stop offset="60%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.42" />
          </radialGradient>
        </defs>

        {/* ── Gökyüzü ── */}
        <rect x="0" y="0" width="1600" height="900" fill="url(#nb-sky)" />

        {/* ── Yıldızlar ── */}
        <g transform={L(0.012)} opacity={isCourtyard ? 0.5 : 1}>
          <Stars seed={7} count={110} />
        </g>

        {/* ── Aurora ── */}
        <g transform={L(0.025)} filter="url(#nb-blur-lg)" opacity={isCourtyard ? 0.4 : 0.95}>
          <path d="M-200 250 C 200 120, 520 300, 880 180 S 1500 240, 1800 130 L1800 330 C1500 430, 1160 300, 880 380 S 200 320, -200 430 Z"
            fill="url(#nb-aurora1)">
            <animateTransform attributeName="transform" type="translate"
              values="0 0; 60 -22; -40 14; 0 0" dur="26s" repeatCount="indefinite" />
          </path>
          <path d="M-200 380 C 260 300, 600 430, 960 340 S 1520 400, 1800 300 L1800 470 C1480 545, 1080 440, 780 500 S 180 460, -200 540 Z"
            fill="url(#nb-aurora2)">
            <animateTransform attributeName="transform" type="translate"
              values="0 0; -70 18; 50 -12; 0 0" dur="34s" repeatCount="indefinite" />
          </path>
        </g>

        {/* ── Uzak dağlar (karlı zirveler) ── */}
        <g transform={L(0.05)}>
          <path fill="url(#nb-far)" d="
            M-100 560
            L 90 430 L 190 480 L 320 360 L 430 452 L 520 400 L 640 470
            L 760 372 L 880 462 L 1010 402 L 1130 476 L 1250 392 L 1380 470
            L 1500 420 L 1700 520 L 1700 620 L -100 620 Z" />
          {/* Kar örtüsü */}
          <path fill="#e8f4fb" opacity="0.62" d="
            M 320 360 L 366 398 L 344 402 L 372 428 L 268 428 L 296 400 L 276 396 Z
            M 760 372 L 806 412 L 782 416 L 812 442 L 706 442 L 736 414 L 714 410 Z
            M 1250 392 L 1294 430 L 1272 434 L 1300 458 L 1198 458 L 1226 432 L 1206 428 Z" />
        </g>

        {/* ── Orta dağlar ── */}
        <g transform={L(0.09)}>
          <path fill="url(#nb-mid)" d="
            M-100 620
            L 130 512 L 260 570 L 400 486 L 540 566 L 700 500 L 860 578
            L 1020 508 L 1180 580 L 1340 520 L 1480 586 L 1700 540
            L 1700 700 L -100 700 Z" />
          <path fill="#cfe4f2" opacity="0.36" d="
            M 400 486 L 438 520 L 418 524 L 442 546 L 356 546 L 382 522 L 364 518 Z
            M 1020 508 L 1056 540 L 1038 544 L 1062 566 L 978 566 L 1004 542 L 986 538 Z" />
        </g>

        {/* ── Fiyort suyu ── */}
        <g transform={L(0.14)}>
          <rect x="-100" y="668" width="1800" height="300" fill="url(#nb-water)" />
          {/* Yansıma çizgileri */}
          {[688, 706, 726, 748, 774, 804, 838].map((y, i) => (
            <g key={y} opacity={0.22 - i * 0.018}>
              <rect x={-100 + (i % 3) * 120} y={y} width={520 + i * 90} height="1.6" fill="#9fd8f4">
                <animate attributeName="x"
                  values={`${-100 + (i % 3) * 120}; ${40 + (i % 3) * 120}; ${-100 + (i % 3) * 120}`}
                  dur={`${11 + i * 2.5}s`} repeatCount="indefinite" />
              </rect>
              <rect x={760 - (i % 2) * 180} y={y + 6} width={420 + i * 60} height="1.2" fill="#7fc9e8">
                <animate attributeName="x"
                  values={`${760 - (i % 2) * 180}; ${640 - (i % 2) * 180}; ${760 - (i % 2) * 180}`}
                  dur={`${14 + i * 2}s`} repeatCount="indefinite" />
              </rect>
            </g>
          ))}
        </g>

        {/* ── Yakın kıyı + köy silueti ── */}
        <g transform={L(0.22)}>
          <path fill="url(#nb-near)" d="
            M-100 790
            C 180 754, 420 786, 640 764
            C 900 738, 1140 782, 1380 756
            C 1500 744, 1620 762, 1700 750
            L 1700 980 L -100 980 Z" />

          {/* Köy silueti — uzun ev + evler + palisad */}
          <g fill="#04101a" opacity="0.94">
            {/* Uzun ev (longhouse) */}
            <path d="M 660 764 L 700 726 L 860 726 L 900 764 Z" />
            <rect x="672" y="762" width="216" height="34" />
            {/* Çatı tepe direkleri */}
            <path d="M 700 726 L 694 712 L 706 720 Z M 860 726 L 866 712 L 854 720 Z" />
            {/* Küçük evler */}
            <path d="M 520 776 L 548 750 L 576 776 Z" /><rect x="528" y="774" width="40" height="24" />
            <path d="M 960 772 L 986 748 L 1012 772 Z" /><rect x="968" y="770" width="38" height="26" />
            <path d="M 1060 780 L 1082 758 L 1104 780 Z" /><rect x="1066" y="778" width="32" height="22" />
            <path d="M 430 786 L 452 764 L 474 786 Z" /><rect x="436" y="784" width="32" height="20" />
            {/* Palisad çitleri */}
            {Array.from({ length: 26 }, (_, i) => (
              <rect key={i} x={318 + i * 44} y={792 - (i % 3) * 3} width="5" height="30" />
            ))}
          </g>

          {/* Pencere ışıkları */}
          <g fill="#ffcf7a">
            {[[690, 776], [712, 776], [820, 776], [846, 776], [540, 782], [978, 780], [1076, 786]].map(([x, y], i) => (
              <rect key={i} x={x} y={y} width="5" height="7" opacity="0.85">
                <animate attributeName="opacity" values="0.85;0.5;0.85"
                  dur={`${3 + i * 0.7}s`} repeatCount="indefinite" />
              </rect>
            ))}
          </g>

          {/* Baca dumanı */}
          <g opacity="0.16" filter="url(#nb-blur-sm)">
            <ellipse cx="780" cy="700" rx="46" ry="22" fill="#cfe4f2">
              <animate attributeName="cy" values="700;640;700" dur="18s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.16;0.04;0.16" dur="18s" repeatCount="indefinite" />
            </ellipse>
          </g>
        </g>

        {/* ── Sis / vignette ── */}
        <rect x="0" y="0" width="1600" height="900" fill="url(#nb-vignette)" />
        {dim > 0 && (
          <rect x="0" y="0" width="1600" height="900" fill="#050a12" opacity={Math.min(0.85, dim)} />
        )}
      </svg>
    </div>
  );
}

// Aynı parallax adımında yeniden render etmeyi engelle.
export default memo(NordicBackdropInner, (a, b) =>
  Math.round((a.parallax?.x || 0) / 12) === Math.round((b.parallax?.x || 0) / 12) &&
  Math.round((a.parallax?.y || 0) / 12) === Math.round((b.parallax?.y || 0) / 12) &&
  a.variant === b.variant && a.dim === b.dim
);
