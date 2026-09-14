/**
 * Üretim binaları — HAM MADDE üreticileri
 * levels[i] = seviye (i+1)'e yükseltme maliyeti ve o seviyedeki max işçi sayısı
 * sureSaat: çalışma birimi (gerçek saniye = oyun saati test modunda), workers ile bölünür
 * cost: upgrade maliyeti — işlenmiş mallar kullanılır
 */

const PRODUCTION_DEFS = {
  odun: {
    name: 'Orman', icon: '🪵', color: '#5a3a1a', slots: 3,
    baseProductionPerWorker: 22,
    levels: [
      { workers:3, cost:{ kereste:12, tugla:30, yontmaTas:18, demirKulce:15 }, sureSaat:5.00 },
      { workers:5, cost:{ kereste:15, tugla:38, yontmaTas:23, demirKulce:19 }, sureSaat:6.40 },
      { workers:7, cost:{ kereste:20, tugla:49, yontmaTas:29, demirKulce:25 }, sureSaat:8.19 },
      { workers:9, cost:{ kereste:25, tugla:63, yontmaTas:38, demirKulce:31 }, sureSaat:10.49 },
      { workers:11, cost:{ kereste:32, tugla:81, yontmaTas:48, demirKulce:40 }, sureSaat:13.42 },
      { workers:13, cost:{ kereste:41, tugla:103, yontmaTas:62, demirKulce:52 }, sureSaat:17.18 },
      { workers:15, cost:{ kereste:53, tugla:132, yontmaTas:79, demirKulce:66 }, sureSaat:21.99 },
      { workers:17, cost:{ kereste:68, tugla:169, yontmaTas:101, demirKulce:84 }, sureSaat:28.15 },
      { workers:19, cost:{ kereste:86, tugla:216, yontmaTas:130, demirKulce:108 }, sureSaat:36.03 },
      { workers:21, cost:{ kereste:111, tugla:277, yontmaTas:166, demirKulce:138 }, sureSaat:46.12 },
      { workers:23, cost:{ kereste:142, tugla:354, yontmaTas:213, demirKulce:177 }, sureSaat:59.03 },
      { workers:25, cost:{ kereste:181, tugla:453, yontmaTas:272, demirKulce:227 }, sureSaat:75.56 },
      { workers:27, cost:{ kereste:232, tugla:580, yontmaTas:348, demirKulce:290 }, sureSaat:96.71 },
      { workers:29, cost:{ kereste:297, tugla:743, yontmaTas:446, demirKulce:371 }, sureSaat:123.79 },
      { workers:31, cost:{ kereste:380, tugla:951, yontmaTas:570, demirKulce:475 }, sureSaat:158.46 },
      { workers:33, cost:{ kereste:487, tugla:1217, yontmaTas:730, demirKulce:608 }, sureSaat:202.82 },
      { workers:35, cost:{ kereste:623, tugla:1558, yontmaTas:935, demirKulce:779 }, sureSaat:259.61 },
      { workers:37, cost:{ kereste:798, tugla:1994, yontmaTas:1196, demirKulce:997 }, sureSaat:332.31 },
      { workers:39, cost:{ kereste:1021, tugla:2552, yontmaTas:1531, demirKulce:1276 }, sureSaat:425.35 },
      { workers:42, cost:{ kereste:1307, tugla:3267, yontmaTas:1960, demirKulce:1633 }, sureSaat:544.45 },
    ]
  },

  demir: {
    name: 'Demir Madeni', icon: '⛏️', color: '#5a6878', slots: 3,
    baseProductionPerWorker: 14,
    levels: [
      { workers:3, cost:{ kereste:14, tugla:24, yontmaTas:27, demirKulce:9 }, sureSaat:5.50 },
      { workers:5, cost:{ kereste:18, tugla:31, yontmaTas:35, demirKulce:12 }, sureSaat:7.04 },
      { workers:7, cost:{ kereste:23, tugla:39, yontmaTas:44, demirKulce:15 }, sureSaat:9.01 },
      { workers:9, cost:{ kereste:29, tugla:50, yontmaTas:57, demirKulce:19 }, sureSaat:11.53 },
      { workers:11, cost:{ kereste:38, tugla:64, yontmaTas:72, demirKulce:24 }, sureSaat:14.76 },
      { workers:13, cost:{ kereste:48, tugla:82, yontmaTas:93, demirKulce:31 }, sureSaat:18.90 },
      { workers:15, cost:{ kereste:62, tugla:106, yontmaTas:119, demirKulce:40 }, sureSaat:24.19 },
      { workers:17, cost:{ kereste:79, tugla:135, yontmaTas:152, demirKulce:51 }, sureSaat:30.96 },
      { workers:19, cost:{ kereste:101, tugla:173, yontmaTas:195, demirKulce:65 }, sureSaat:39.63 },
      { workers:21, cost:{ kereste:129, tugla:221, yontmaTas:249, demirKulce:83 }, sureSaat:50.73 },
      { workers:23, cost:{ kereste:165, tugla:283, yontmaTas:319, demirKulce:106 }, sureSaat:64.93 },
      { workers:25, cost:{ kereste:212, tugla:363, yontmaTas:408, demirKulce:136 }, sureSaat:83.11 },
      { workers:27, cost:{ kereste:271, tugla:464, yontmaTas:522, demirKulce:174 }, sureSaat:106.39 },
      { workers:29, cost:{ kereste:347, tugla:594, yontmaTas:668, demirKulce:223 }, sureSaat:136.17 },
      { workers:31, cost:{ kereste:444, tugla:761, yontmaTas:856, demirKulce:285 }, sureSaat:174.30 },
      { workers:33, cost:{ kereste:568, tugla:974, yontmaTas:1095, demirKulce:365 }, sureSaat:223.11 },
      { workers:35, cost:{ kereste:727, tugla:1246, yontmaTas:1402, demirKulce:467 }, sureSaat:285.58 },
      { workers:37, cost:{ kereste:930, tugla:1595, yontmaTas:1794, demirKulce:598 }, sureSaat:365.54 },
      { workers:39, cost:{ kereste:1191, tugla:2042, yontmaTas:2297, demirKulce:766 }, sureSaat:467.89 },
      { workers:42, cost:{ kereste:1524, tugla:2613, yontmaTas:2940, demirKulce:980 }, sureSaat:598.90 },
    ]
  },

  kil: {
    name: 'Kil Ocağı', icon: '🟫', color: '#9a5030', slots: 3,
    baseProductionPerWorker: 22,
    levels: [
      { workers:3, cost:{ kereste:7, tugla:45, yontmaTas:14, demirKulce:18 }, sureSaat:4.75 },
      { workers:5, cost:{ kereste:9, tugla:58, yontmaTas:18, demirKulce:23 }, sureSaat:6.08 },
      { workers:7, cost:{ kereste:11, tugla:74, yontmaTas:23, demirKulce:29 }, sureSaat:7.78 },
      { workers:9, cost:{ kereste:15, tugla:94, yontmaTas:29, demirKulce:38 }, sureSaat:9.96 },
      { workers:11, cost:{ kereste:19, tugla:121, yontmaTas:38, demirKulce:48 }, sureSaat:12.75 },
      { workers:13, cost:{ kereste:24, tugla:155, yontmaTas:48, demirKulce:62 }, sureSaat:16.32 },
      { workers:15, cost:{ kereste:31, tugla:198, yontmaTas:62, demirKulce:79 }, sureSaat:20.89 },
      { workers:17, cost:{ kereste:39, tugla:253, yontmaTas:79, demirKulce:101 }, sureSaat:26.74 },
      { workers:19, cost:{ kereste:50, tugla:324, yontmaTas:101, demirKulce:130 }, sureSaat:34.23 },
      { workers:21, cost:{ kereste:65, tugla:415, yontmaTas:129, demirKulce:166 }, sureSaat:43.81 },
      { workers:23, cost:{ kereste:83, tugla:531, yontmaTas:165, demirKulce:213 }, sureSaat:56.08 },
      { workers:25, cost:{ kereste:106, tugla:680, yontmaTas:212, demirKulce:272 }, sureSaat:71.78 },
      { workers:27, cost:{ kereste:135, tugla:870, yontmaTas:271, demirKulce:348 }, sureSaat:91.88 },
      { workers:29, cost:{ kereste:173, tugla:1114, yontmaTas:347, demirKulce:446 }, sureSaat:117.60 },
      { workers:31, cost:{ kereste:222, tugla:1426, yontmaTas:444, demirKulce:570 }, sureSaat:150.53 },
      { workers:33, cost:{ kereste:284, tugla:1825, yontmaTas:568, demirKulce:730 }, sureSaat:192.68 },
      { workers:35, cost:{ kereste:363, tugla:2337, yontmaTas:727, demirKulce:935 }, sureSaat:246.63 },
      { workers:37, cost:{ kereste:465, tugla:2991, yontmaTas:930, demirKulce:1196 }, sureSaat:315.69 },
      { workers:39, cost:{ kereste:595, tugla:3828, yontmaTas:1191, demirKulce:1531 }, sureSaat:404.09 },
      { workers:42, cost:{ kereste:762, tugla:4900, yontmaTas:1524, demirKulce:1960 }, sureSaat:517.23 },
    ]
  },

  tas: {
    name: 'Taş Ocağı', icon: '🪨', color: '#7a7068', slots: 3,
    baseProductionPerWorker: 22,
    levels: [
      { workers:3, cost:{ kereste:10, tugla:27, yontmaTas:29, demirKulce:10 }, sureSaat:5.25 },
      { workers:5, cost:{ kereste:13, tugla:35, yontmaTas:37, demirKulce:13 }, sureSaat:6.72 },
      { workers:7, cost:{ kereste:16, tugla:44, yontmaTas:48, demirKulce:16 }, sureSaat:8.60 },
      { workers:9, cost:{ kereste:21, tugla:57, yontmaTas:61, demirKulce:21 }, sureSaat:11.01 },
      { workers:11, cost:{ kereste:27, tugla:72, yontmaTas:78, demirKulce:27 }, sureSaat:14.09 },
      { workers:13, cost:{ kereste:34, tugla:93, yontmaTas:100, demirKulce:34 }, sureSaat:18.04 },
      { workers:15, cost:{ kereste:44, tugla:119, yontmaTas:128, demirKulce:44 }, sureSaat:23.09 },
      { workers:17, cost:{ kereste:56, tugla:152, yontmaTas:163, demirKulce:56 }, sureSaat:29.55 },
      { workers:19, cost:{ kereste:72, tugla:195, yontmaTas:209, demirKulce:72 }, sureSaat:37.83 },
      { workers:21, cost:{ kereste:92, tugla:249, yontmaTas:267, demirKulce:92 }, sureSaat:48.42 },
      { workers:23, cost:{ kereste:118, tugla:319, yontmaTas:342, demirKulce:118 }, sureSaat:61.98 },
      { workers:25, cost:{ kereste:151, tugla:408, yontmaTas:438, demirKulce:151 }, sureSaat:79.34 },
      { workers:27, cost:{ kereste:193, tugla:522, yontmaTas:561, demirKulce:193 }, sureSaat:101.55 },
      { workers:29, cost:{ kereste:248, tugla:668, yontmaTas:718, demirKulce:248 }, sureSaat:129.98 },
      { workers:31, cost:{ kereste:317, tugla:856, yontmaTas:919, demirKulce:317 }, sureSaat:166.38 },
      { workers:33, cost:{ kereste:406, tugla:1095, yontmaTas:1176, demirKulce:406 }, sureSaat:212.97 },
      { workers:35, cost:{ kereste:519, tugla:1402, yontmaTas:1506, demirKulce:519 }, sureSaat:272.60 },
      { workers:37, cost:{ kereste:665, tugla:1794, yontmaTas:1927, demirKulce:665 }, sureSaat:348.92 },
      { workers:39, cost:{ kereste:851, tugla:2297, yontmaTas:2467, demirKulce:851 }, sureSaat:446.62 },
      { workers:42, cost:{ kereste:1089, tugla:2940, yontmaTas:3158, demirKulce:1089 }, sureSaat:571.67 },
    ]
  },

  tahil: {
    name: 'Tarla', icon: '🌾', color: '#8a7818', slots: 6,
    baseProductionPerWorker: 32,
    levels: [
      { workers:3, cost:{ kereste:6, tugla:21, yontmaTas:11, demirKulce:6 }, sureSaat:4.25 },
      { workers:5, cost:{ kereste:8, tugla:27, yontmaTas:14, demirKulce:8 }, sureSaat:5.44 },
      { workers:7, cost:{ kereste:10, tugla:34, yontmaTas:18, demirKulce:10 }, sureSaat:6.96 },
      { workers:9, cost:{ kereste:13, tugla:44, yontmaTas:23, demirKulce:13 }, sureSaat:8.91 },
      { workers:11, cost:{ kereste:16, tugla:56, yontmaTas:30, demirKulce:16 }, sureSaat:11.41 },
      { workers:13, cost:{ kereste:21, tugla:72, yontmaTas:38, demirKulce:21 }, sureSaat:14.60 },
      { workers:15, cost:{ kereste:26, tugla:92, yontmaTas:48, demirKulce:26 }, sureSaat:18.69 },
      { workers:17, cost:{ kereste:34, tugla:118, yontmaTas:62, demirKulce:34 }, sureSaat:23.93 },
      { workers:19, cost:{ kereste:43, tugla:151, yontmaTas:79, demirKulce:43 }, sureSaat:30.62 },
      { workers:21, cost:{ kereste:55, tugla:194, yontmaTas:101, demirKulce:55 }, sureSaat:39.20 },
      { workers:23, cost:{ kereste:71, tugla:248, yontmaTas:130, demirKulce:71 }, sureSaat:50.18 },
      { workers:25, cost:{ kereste:91, tugla:317, yontmaTas:166, demirKulce:91 }, sureSaat:64.22 },
      { workers:27, cost:{ kereste:116, tugla:406, yontmaTas:213, demirKulce:116 }, sureSaat:82.21 },
      { workers:29, cost:{ kereste:149, tugla:520, yontmaTas:272, demirKulce:149 }, sureSaat:105.22 },
      { workers:31, cost:{ kereste:190, tugla:666, yontmaTas:349, demirKulce:190 }, sureSaat:134.69 },
      { workers:33, cost:{ kereste:243, tugla:852, yontmaTas:446, demirKulce:243 }, sureSaat:172.40 },
      { workers:35, cost:{ kereste:312, tugla:1090, yontmaTas:571, demirKulce:312 }, sureSaat:220.67 },
      { workers:37, cost:{ kereste:399, tugla:1396, yontmaTas:731, demirKulce:399 }, sureSaat:282.46 },
      { workers:39, cost:{ kereste:510, tugla:1786, yontmaTas:936, demirKulce:510 }, sureSaat:361.55 },
      { workers:42, cost:{ kereste:653, tugla:2287, yontmaTas:1198, demirKulce:653 }, sureSaat:462.78 },
    ]
  }
};

module.exports = PRODUCTION_DEFS;
