/**
 * Üretim binaları — HAM MADDE üreticileri
 * levels[i] = seviye (i+1)'e yükseltme maliyeti ve o seviyedeki max işçi sayısı
 * sureSaat: çalışma birimi (gerçek saniye = oyun saati test modunda), workers ile bölünür
 * cost: upgrade maliyeti — işlenmiş mallar kullanılır
 */

const PRODUCTION_DEFS = {
  odun: {
    name: 'Orman', icon: '🪵', color: '#5a3a1a', slots: 3,
    baseProductionPerWorker: 7,
    levels: [
      { workers:1,   cost:{ kereste:40,    tugla:100,    yontmaTas:60,    demirKulce:50    }, sureSaat:5.00    },
      { workers:2,   cost:{ kereste:64,    tugla:160,    yontmaTas:96,    demirKulce:80    }, sureSaat:7.00    },
      { workers:3,   cost:{ kereste:102,   tugla:256,    yontmaTas:154,   demirKulce:128   }, sureSaat:9.80    },
      { workers:4,   cost:{ kereste:164,   tugla:410,    yontmaTas:246,   demirKulce:205   }, sureSaat:13.72   },
      { workers:6,   cost:{ kereste:262,   tugla:655,    yontmaTas:393,   demirKulce:328   }, sureSaat:19.21   },
      { workers:10,  cost:{ kereste:419,   tugla:1049,   yontmaTas:629,   demirKulce:524   }, sureSaat:26.89   },
      { workers:14,  cost:{ kereste:671,   tugla:1678,   yontmaTas:1007,  demirKulce:839   }, sureSaat:37.65   },
      { workers:20,  cost:{ kereste:1074,  tugla:2684,   yontmaTas:1611,  demirKulce:1342  }, sureSaat:52.71   },
      { workers:29,  cost:{ kereste:1718,  tugla:4295,   yontmaTas:2577,  demirKulce:2147  }, sureSaat:73.79   },
      { workers:40,  cost:{ kereste:2749,  tugla:6872,   yontmaTas:4123,  demirKulce:3436  }, sureSaat:103.31  },
      { workers:56,  cost:{ kereste:4398,  tugla:10995,  yontmaTas:6597,  demirKulce:5498  }, sureSaat:144.63  },
      { workers:75,  cost:{ kereste:7037,  tugla:17592,  yontmaTas:10555, demirKulce:8796  }, sureSaat:202.48  },
      { workers:99,  cost:{ kereste:11259, tugla:28147,  yontmaTas:16888, demirKulce:14074 }, sureSaat:283.47  },
      { workers:127, cost:{ kereste:18014, tugla:45036,  yontmaTas:27022, demirKulce:22518 }, sureSaat:396.86  },
      { workers:160, cost:{ kereste:28823, tugla:72058,  yontmaTas:43235, demirKulce:36029 }, sureSaat:555.60  },
      { workers:200, cost:{ kereste:46117, tugla:115292, yontmaTas:69175, demirKulce:57646 }, sureSaat:777.84  },
      { workers:260, cost:{ kereste:73787, tugla:184467, yontmaTas:110680,demirKulce:92234 }, sureSaat:1088.98 },
      { workers:320, cost:{ kereste:118059,tugla:295148, yontmaTas:177089,demirKulce:147574}, sureSaat:1524.57 },
      { workers:400, cost:{ kereste:188895,tugla:472237, yontmaTas:283342,demirKulce:236118}, sureSaat:2134.39 },
      { workers:490, cost:{ kereste:302231,tugla:755579, yontmaTas:453347,demirKulce:377789}, sureSaat:2988.15 },
    ]
  },

  demir: {
    name: 'Demir Madeni', icon: '⛏️', color: '#5a6878', slots: 3,
    baseProductionPerWorker: 5,
    levels: [
      { workers:1,   cost:{ kereste:48,    tugla:80,     yontmaTas:90,    demirKulce:30    }, sureSaat:5.50    },
      { workers:2,   cost:{ kereste:77,    tugla:128,    yontmaTas:144,   demirKulce:48    }, sureSaat:7.70    },
      { workers:3,   cost:{ kereste:122,   tugla:205,    yontmaTas:231,   demirKulce:77    }, sureSaat:10.78   },
      { workers:4,   cost:{ kereste:197,   tugla:328,    yontmaTas:369,   demirKulce:123   }, sureSaat:15.09   },
      { workers:6,   cost:{ kereste:314,   tugla:524,    yontmaTas:590,   demirKulce:197   }, sureSaat:21.13   },
      { workers:10,  cost:{ kereste:503,   tugla:839,    yontmaTas:944,   demirKulce:314   }, sureSaat:29.58   },
      { workers:14,  cost:{ kereste:805,   tugla:1342,   yontmaTas:1511,  demirKulce:503   }, sureSaat:41.41   },
      { workers:20,  cost:{ kereste:1289,  tugla:2147,   yontmaTas:2417,  demirKulce:805   }, sureSaat:57.98   },
      { workers:29,  cost:{ kereste:2062,  tugla:3436,   yontmaTas:3866,  demirKulce:1288  }, sureSaat:81.17   },
      { workers:40,  cost:{ kereste:3299,  tugla:5498,   yontmaTas:6185,  demirKulce:2062  }, sureSaat:113.64  },
      { workers:56,  cost:{ kereste:5278,  tugla:8796,   yontmaTas:9896,  demirKulce:3299  }, sureSaat:159.09  },
      { workers:75,  cost:{ kereste:8444,  tugla:14074,  yontmaTas:15833, demirKulce:5278  }, sureSaat:222.73  },
      { workers:99,  cost:{ kereste:13511, tugla:22518,  yontmaTas:25332, demirKulce:8444  }, sureSaat:311.82  },
      { workers:127, cost:{ kereste:21617, tugla:36029,  yontmaTas:40533, demirKulce:13511 }, sureSaat:436.55  },
      { workers:160, cost:{ kereste:34588, tugla:57646,  yontmaTas:64853, demirKulce:21617 }, sureSaat:611.16  },
      { workers:200, cost:{ kereste:55340, tugla:92234,  yontmaTas:103763,demirKulce:34588 }, sureSaat:855.62  },
      { workers:260, cost:{ kereste:88544, tugla:147574, yontmaTas:166020,demirKulce:55340 }, sureSaat:1197.88 },
      { workers:320, cost:{ kereste:141671,tugla:236118, yontmaTas:265634,demirKulce:88544 }, sureSaat:1677.03 },
      { workers:400, cost:{ kereste:226674,tugla:377790, yontmaTas:425013,demirKulce:141671}, sureSaat:2347.83 },
      { workers:490, cost:{ kereste:362677,tugla:604463, yontmaTas:680021,demirKulce:226673}, sureSaat:3286.97 },
    ]
  },

  kil: {
    name: 'Kil Ocağı', icon: '🟫', color: '#9a5030', slots: 3,
    baseProductionPerWorker: 6,
    levels: [
      { workers:1,   cost:{ kereste:24,    tugla:150,    yontmaTas:48,    demirKulce:60    }, sureSaat:4.75    },
      { workers:2,   cost:{ kereste:38,    tugla:240,    yontmaTas:77,    demirKulce:96    }, sureSaat:6.65    },
      { workers:3,   cost:{ kereste:61,    tugla:384,    yontmaTas:123,   demirKulce:154   }, sureSaat:9.31    },
      { workers:4,   cost:{ kereste:98,    tugla:615,    yontmaTas:197,   demirKulce:246   }, sureSaat:13.03   },
      { workers:6,   cost:{ kereste:157,   tugla:983,    yontmaTas:314,   demirKulce:394   }, sureSaat:18.25   },
      { workers:10,  cost:{ kereste:251,   tugla:1574,   yontmaTas:503,   demirKulce:629   }, sureSaat:25.55   },
      { workers:14,  cost:{ kereste:403,   tugla:2517,   yontmaTas:806,   demirKulce:1007  }, sureSaat:35.77   },
      { workers:20,  cost:{ kereste:644,   tugla:4026,   yontmaTas:1289,  demirKulce:1610  }, sureSaat:50.07   },
      { workers:29,  cost:{ kereste:1031,  tugla:6443,   yontmaTas:2062,  demirKulce:2576  }, sureSaat:70.10   },
      { workers:40,  cost:{ kereste:1649,  tugla:10308,  yontmaTas:3298,  demirKulce:4123  }, sureSaat:98.14   },
      { workers:56,  cost:{ kereste:2639,  tugla:16493,  yontmaTas:5278,  demirKulce:6598  }, sureSaat:137.40  },
      { workers:75,  cost:{ kereste:4222,  tugla:26388,  yontmaTas:8444,  demirKulce:10555 }, sureSaat:192.36  },
      { workers:99,  cost:{ kereste:6755,  tugla:42221,  yontmaTas:13510, demirKulce:16889 }, sureSaat:269.30  },
      { workers:127, cost:{ kereste:10808, tugla:67554,  yontmaTas:21618, demirKulce:27022 }, sureSaat:377.02  },
      { workers:160, cost:{ kereste:17294, tugla:108087, yontmaTas:34588, demirKulce:43235 }, sureSaat:527.82  },
      { workers:200, cost:{ kereste:27670, tugla:172938, yontmaTas:55340, demirKulce:69175 }, sureSaat:738.95  },
      { workers:260, cost:{ kereste:44272, tugla:276701, yontmaTas:88544, demirKulce:110681}, sureSaat:1034.53 },
      { workers:320, cost:{ kereste:70835, tugla:442722, yontmaTas:141671,demirKulce:177089}, sureSaat:1448.34 },
      { workers:400, cost:{ kereste:113337,tugla:708356, yontmaTas:226674,demirKulce:283342}, sureSaat:2027.67 },
      { workers:490, cost:{ kereste:181339,tugla:1133369,yontmaTas:362678,demirKulce:453347}, sureSaat:2838.74 },
    ]
  },

  tas: {
    name: 'Taş Ocağı', icon: '🪨', color: '#7a7068', slots: 3,
    baseProductionPerWorker: 6,
    levels: [
      { workers:1,   cost:{ kereste:32,    tugla:90,     yontmaTas:96,    demirKulce:35    }, sureSaat:5.25    },
      { workers:2,   cost:{ kereste:51,    tugla:144,    yontmaTas:154,   demirKulce:56    }, sureSaat:7.35    },
      { workers:3,   cost:{ kereste:82,    tugla:230,    yontmaTas:246,   demirKulce:90    }, sureSaat:10.29   },
      { workers:4,   cost:{ kereste:131,   tugla:369,    yontmaTas:394,   demirKulce:144   }, sureSaat:14.41   },
      { workers:6,   cost:{ kereste:210,   tugla:590,    yontmaTas:629,   demirKulce:230   }, sureSaat:20.17   },
      { workers:10,  cost:{ kereste:335,   tugla:944,    yontmaTas:1006,  demirKulce:367   }, sureSaat:28.23   },
      { workers:14,  cost:{ kereste:537,   tugla:1510,   yontmaTas:1611,  demirKulce:587   }, sureSaat:39.53   },
      { workers:20,  cost:{ kereste:859,   tugla:2416,   yontmaTas:2578,  demirKulce:939   }, sureSaat:55.35   },
      { workers:29,  cost:{ kereste:1374,  tugla:3866,   yontmaTas:4123,  demirKulce:1503  }, sureSaat:77.48   },
      { workers:40,  cost:{ kereste:2199,  tugla:6185,   yontmaTas:6597,  demirKulce:2405  }, sureSaat:108.48  },
      { workers:56,  cost:{ kereste:3518,  tugla:9896,   yontmaTas:10555, demirKulce:3849  }, sureSaat:151.86  },
      { workers:75,  cost:{ kereste:5630,  tugla:15833,  yontmaTas:16888, demirKulce:6157  }, sureSaat:212.60  },
      { workers:99,  cost:{ kereste:9007,  tugla:25332,  yontmaTas:27021, demirKulce:9852  }, sureSaat:297.64  },
      { workers:127, cost:{ kereste:14411, tugla:40532,  yontmaTas:43235, demirKulce:15763 }, sureSaat:416.70  },
      { workers:160, cost:{ kereste:23058, tugla:64852,  yontmaTas:69176, demirKulce:25220 }, sureSaat:583.38  },
      { workers:200, cost:{ kereste:36894, tugla:103763, yontmaTas:110680,demirKulce:40352 }, sureSaat:816.73  },
      { workers:260, cost:{ kereste:59030, tugla:166020, yontmaTas:177088,demirKulce:64564 }, sureSaat:1143.43 },
      { workers:320, cost:{ kereste:94447, tugla:265633, yontmaTas:283342,demirKulce:103302}, sureSaat:1600.80 },
      { workers:400, cost:{ kereste:151116,tugla:425013, yontmaTas:453347,demirKulce:165283}, sureSaat:2241.11 },
      { workers:490, cost:{ kereste:241785,tugla:680021, yontmaTas:725355,demirKulce:264452}, sureSaat:3137.56 },
    ]
  },

  tahil: {
    name: 'Tarla', icon: '🌾', color: '#8a7818', slots: 6,
    baseProductionPerWorker: 8,
    levels: [
      { workers:1,   cost:{ kereste:20,    tugla:70,     yontmaTas:36,    demirKulce:20    }, sureSaat:4.25    },
      { workers:2,   cost:{ kereste:32,    tugla:112,    yontmaTas:58,    demirKulce:32    }, sureSaat:5.95    },
      { workers:3,   cost:{ kereste:51,    tugla:179,    yontmaTas:92,    demirKulce:51    }, sureSaat:8.33    },
      { workers:4,   cost:{ kereste:82,    tugla:287,    yontmaTas:148,   demirKulce:82    }, sureSaat:11.66   },
      { workers:6,   cost:{ kereste:131,   tugla:458,    yontmaTas:236,   demirKulce:131   }, sureSaat:16.33   },
      { workers:10,  cost:{ kereste:210,   tugla:734,    yontmaTas:377,   demirKulce:210   }, sureSaat:22.86   },
      { workers:14,  cost:{ kereste:336,   tugla:1175,   yontmaTas:604,   demirKulce:336   }, sureSaat:32.00   },
      { workers:20,  cost:{ kereste:537,   tugla:1879,   yontmaTas:967,   demirKulce:537   }, sureSaat:44.80   },
      { workers:29,  cost:{ kereste:859,   tugla:3007,   yontmaTas:1546,  demirKulce:859   }, sureSaat:62.72   },
      { workers:40,  cost:{ kereste:1375,  tugla:4810,   yontmaTas:2474,  demirKulce:1374  }, sureSaat:87.81   },
      { workers:56,  cost:{ kereste:2199,  tugla:7696,   yontmaTas:3958,  demirKulce:2199  }, sureSaat:122.94  },
      { workers:75,  cost:{ kereste:3519,  tugla:12314,  yontmaTas:6333,  demirKulce:3518  }, sureSaat:172.11  },
      { workers:99,  cost:{ kereste:5630,  tugla:19703,  yontmaTas:10133, demirKulce:5630  }, sureSaat:240.95  },
      { workers:127, cost:{ kereste:9007,  tugla:31525,  yontmaTas:16213, demirKulce:9007  }, sureSaat:337.33  },
      { workers:160, cost:{ kereste:14412, tugla:50441,  yontmaTas:25941, demirKulce:14412 }, sureSaat:472.26  },
      { workers:200, cost:{ kereste:23059, tugla:80704,  yontmaTas:41505, demirKulce:23058 }, sureSaat:661.16  },
      { workers:260, cost:{ kereste:36894, tugla:129127, yontmaTas:66408, demirKulce:36894 }, sureSaat:925.63  },
      { workers:320, cost:{ kereste:59030, tugla:206604, yontmaTas:106253,demirKulce:59030 }, sureSaat:1295.88 },
      { workers:400, cost:{ kereste:94448, tugla:330566, yontmaTas:170005,demirKulce:94447 }, sureSaat:1814.23 },
      { workers:490, cost:{ kereste:151116,tugla:528905, yontmaTas:272008,demirKulce:151116}, sureSaat:2539.93 },
    ]
  }
};

module.exports = PRODUCTION_DEFS;
