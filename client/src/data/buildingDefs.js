/**
 * Bina tanımları — istemci tarafı (sunucudaki productionDefs.js ile aynı)
 * levels[i] = seviye (i+1)'e yükseltme bilgisi
 */
const BUILDING_DEFS = {
  odun: {
    name: 'Orman', icon: '🪵', color: '#5a3a1a',
    baseProductionPerWorker: 22,
    levels: [
      { workers:3   ,   cost:{ kereste:12,    tugla:30,    yontmaTas:18,    demirKulce:15    }, sureSaat:5.00    },
      { workers:5   ,   cost:{ kereste:19,    tugla:48,    yontmaTas:29,    demirKulce:24    }, sureSaat:7.00    },
      { workers:7   ,   cost:{ kereste:31,   tugla:77,    yontmaTas:46,   demirKulce:38   }, sureSaat:9.80    },
      { workers:9   ,   cost:{ kereste:49,   tugla:123,    yontmaTas:74,   demirKulce:62   }, sureSaat:13.72   },
      { workers:11  ,   cost:{ kereste:79,   tugla:196,    yontmaTas:118,   demirKulce:98   }, sureSaat:19.21   },
      { workers:13  ,  cost:{ kereste:126,   tugla:315,   yontmaTas:189,   demirKulce:157   }, sureSaat:26.89   },
      { workers:15  ,  cost:{ kereste:201,   tugla:503,   yontmaTas:302,  demirKulce:252   }, sureSaat:37.65   },
      { workers:17  ,  cost:{ kereste:322,  tugla:805,   yontmaTas:483,  demirKulce:403  }, sureSaat:52.71   },
      { workers:19  ,  cost:{ kereste:515,  tugla:1288,   yontmaTas:773,  demirKulce:644  }, sureSaat:73.79   },
      { workers:21  ,  cost:{ kereste:825,  tugla:2062,   yontmaTas:1237,  demirKulce:1031  }, sureSaat:103.31  },
      { workers:23  ,  cost:{ kereste:1319,  tugla:3298,  yontmaTas:1979,  demirKulce:1649  }, sureSaat:144.63  },
      { workers:25  ,  cost:{ kereste:2111,  tugla:5278,  yontmaTas:3166, demirKulce:2639  }, sureSaat:202.48  },
      { workers:27  ,  cost:{ kereste:3378, tugla:8444,  yontmaTas:5066, demirKulce:4222 }, sureSaat:283.47  },
      { workers:29  , cost:{ kereste:5404, tugla:13511,  yontmaTas:8107, demirKulce:6755 }, sureSaat:396.86  },
      { workers:31  , cost:{ kereste:8647, tugla:21617,  yontmaTas:12970, demirKulce:10809 }, sureSaat:555.60  },
      { workers:33  , cost:{ kereste:13835, tugla:34588, yontmaTas:20752, demirKulce:17294 }, sureSaat:777.84  },
      { workers:35  , cost:{ kereste:22136, tugla:55340, yontmaTas:33204,demirKulce:27670 }, sureSaat:1088.98 },
      { workers:37  , cost:{ kereste:35418,tugla:88544, yontmaTas:53127,demirKulce:44272}, sureSaat:1524.57 },
      { workers:39  , cost:{ kereste:56668,tugla:141671, yontmaTas:85003,demirKulce:70835}, sureSaat:2134.39 },
      { workers:42  , cost:{ kereste:90669,tugla:226674, yontmaTas:136004,demirKulce:113337}, sureSaat:2988.15 },
    ]
  },

  demir: {
    name: 'Demir Madeni', icon: '⛏️', color: '#5a6878',
    baseProductionPerWorker: 14,
    levels: [
      { workers:3   ,   cost:{ kereste:14,    tugla:24,     yontmaTas:27,    demirKulce:9    }, sureSaat:5.50    },
      { workers:5   ,   cost:{ kereste:23,    tugla:38,    yontmaTas:43,   demirKulce:14    }, sureSaat:7.70    },
      { workers:7   ,   cost:{ kereste:37,   tugla:62,    yontmaTas:69,   demirKulce:23    }, sureSaat:10.78   },
      { workers:9   ,   cost:{ kereste:59,   tugla:98,    yontmaTas:111,   demirKulce:37   }, sureSaat:15.09   },
      { workers:11  ,   cost:{ kereste:94,   tugla:157,    yontmaTas:177,   demirKulce:59   }, sureSaat:21.13   },
      { workers:13  ,  cost:{ kereste:151,   tugla:252,    yontmaTas:283,   demirKulce:94   }, sureSaat:29.58   },
      { workers:15  ,  cost:{ kereste:242,   tugla:403,   yontmaTas:453,  demirKulce:151   }, sureSaat:41.41   },
      { workers:17  ,  cost:{ kereste:387,  tugla:644,   yontmaTas:725,  demirKulce:242   }, sureSaat:57.98   },
      { workers:19  ,  cost:{ kereste:619,  tugla:1031,   yontmaTas:1160,  demirKulce:386  }, sureSaat:81.17   },
      { workers:21  ,  cost:{ kereste:990,  tugla:1649,   yontmaTas:1856,  demirKulce:619  }, sureSaat:113.64  },
      { workers:23  ,  cost:{ kereste:1583,  tugla:2639,   yontmaTas:2969,  demirKulce:990  }, sureSaat:159.09  },
      { workers:25  ,  cost:{ kereste:2533,  tugla:4222,  yontmaTas:4750, demirKulce:1583  }, sureSaat:222.73  },
      { workers:27  ,  cost:{ kereste:4053, tugla:6755,  yontmaTas:7600, demirKulce:2533  }, sureSaat:311.82  },
      { workers:29  , cost:{ kereste:6485, tugla:10809,  yontmaTas:12160, demirKulce:4053 }, sureSaat:436.55  },
      { workers:31  , cost:{ kereste:10376, tugla:17294,  yontmaTas:19456, demirKulce:6485 }, sureSaat:611.16  },
      { workers:33  , cost:{ kereste:16602, tugla:27670,  yontmaTas:31129,demirKulce:10376 }, sureSaat:855.62  },
      { workers:35  , cost:{ kereste:26563, tugla:44272, yontmaTas:49806,demirKulce:16602 }, sureSaat:1197.88 },
      { workers:37  , cost:{ kereste:42501,tugla:70835, yontmaTas:79690,demirKulce:26563 }, sureSaat:1677.03 },
      { workers:39  , cost:{ kereste:68002,tugla:113337, yontmaTas:127504,demirKulce:42501}, sureSaat:2347.83 },
      { workers:42  , cost:{ kereste:108803,tugla:181339, yontmaTas:204006,demirKulce:68002}, sureSaat:3286.97 },
    ]
  },

  kil: {
    name: 'Kil Ocağı', icon: '🟫', color: '#9a5030',
    baseProductionPerWorker: 22,
    levels: [
      { workers:3   ,   cost:{ kereste:7,    tugla:45,    yontmaTas:14,    demirKulce:18    }, sureSaat:4.75    },
      { workers:5   ,   cost:{ kereste:11,    tugla:72,    yontmaTas:23,    demirKulce:29    }, sureSaat:6.65    },
      { workers:7   ,   cost:{ kereste:18,    tugla:115,    yontmaTas:37,   demirKulce:46   }, sureSaat:9.31    },
      { workers:9   ,   cost:{ kereste:29,    tugla:184,    yontmaTas:59,   demirKulce:74   }, sureSaat:13.03   },
      { workers:11  ,   cost:{ kereste:47,   tugla:295,    yontmaTas:94,   demirKulce:118   }, sureSaat:18.25   },
      { workers:13  ,  cost:{ kereste:75,   tugla:472,   yontmaTas:151,   demirKulce:189   }, sureSaat:25.55   },
      { workers:15  ,  cost:{ kereste:121,   tugla:755,   yontmaTas:242,   demirKulce:302  }, sureSaat:35.77   },
      { workers:17  ,  cost:{ kereste:193,   tugla:1208,   yontmaTas:387,  demirKulce:483  }, sureSaat:50.07   },
      { workers:19  ,  cost:{ kereste:309,  tugla:1933,   yontmaTas:619,  demirKulce:773  }, sureSaat:70.10   },
      { workers:21  ,  cost:{ kereste:495,  tugla:3092,  yontmaTas:989,  demirKulce:1237  }, sureSaat:98.14   },
      { workers:23  ,  cost:{ kereste:792,  tugla:4948,  yontmaTas:1583,  demirKulce:1979  }, sureSaat:137.40  },
      { workers:25  ,  cost:{ kereste:1267,  tugla:7916,  yontmaTas:2533,  demirKulce:3166 }, sureSaat:192.36  },
      { workers:27  ,  cost:{ kereste:2026,  tugla:12666,  yontmaTas:4053, demirKulce:5067 }, sureSaat:269.30  },
      { workers:29  , cost:{ kereste:3242, tugla:20266,  yontmaTas:6485, demirKulce:8107 }, sureSaat:377.02  },
      { workers:31  , cost:{ kereste:5188, tugla:32426, yontmaTas:10376, demirKulce:12970 }, sureSaat:527.82  },
      { workers:33  , cost:{ kereste:8301, tugla:51881, yontmaTas:16602, demirKulce:20752 }, sureSaat:738.95  },
      { workers:35  , cost:{ kereste:13282, tugla:83010, yontmaTas:26563, demirKulce:33204}, sureSaat:1034.53 },
      { workers:37  , cost:{ kereste:21250, tugla:132817, yontmaTas:42501,demirKulce:53127}, sureSaat:1448.34 },
      { workers:39  , cost:{ kereste:34001,tugla:212507, yontmaTas:68002,demirKulce:85003}, sureSaat:2027.67 },
      { workers:42  , cost:{ kereste:54402,tugla:340011,yontmaTas:108803,demirKulce:136004}, sureSaat:2838.74 },
    ]
  },

  tas: {
    name: 'Taş Ocağı', icon: '🪨', color: '#7a7068',
    baseProductionPerWorker: 22,
    levels: [
      { workers:3   ,   cost:{ kereste:10,    tugla:27,     yontmaTas:29,    demirKulce:10    }, sureSaat:5.25    },
      { workers:5   ,   cost:{ kereste:15,    tugla:43,    yontmaTas:46,   demirKulce:17    }, sureSaat:7.35    },
      { workers:7   ,   cost:{ kereste:25,    tugla:69,    yontmaTas:74,   demirKulce:27    }, sureSaat:10.29   },
      { workers:9   ,   cost:{ kereste:39,   tugla:111,    yontmaTas:118,   demirKulce:43   }, sureSaat:14.41   },
      { workers:11  ,   cost:{ kereste:63,   tugla:177,    yontmaTas:189,   demirKulce:69   }, sureSaat:20.17   },
      { workers:13  ,  cost:{ kereste:100,   tugla:283,    yontmaTas:302,  demirKulce:110   }, sureSaat:28.23   },
      { workers:15  ,  cost:{ kereste:161,   tugla:453,   yontmaTas:483,  demirKulce:176   }, sureSaat:39.53   },
      { workers:17  ,  cost:{ kereste:258,   tugla:725,   yontmaTas:773,  demirKulce:282   }, sureSaat:55.35   },
      { workers:19  ,  cost:{ kereste:412,  tugla:1160,   yontmaTas:1237,  demirKulce:451  }, sureSaat:77.48   },
      { workers:21  ,  cost:{ kereste:660,  tugla:1856,   yontmaTas:1979,  demirKulce:722  }, sureSaat:108.48  },
      { workers:23  ,  cost:{ kereste:1055,  tugla:2969,   yontmaTas:3166, demirKulce:1155  }, sureSaat:151.86  },
      { workers:25  ,  cost:{ kereste:1689,  tugla:4750,  yontmaTas:5066, demirKulce:1847  }, sureSaat:212.60  },
      { workers:27  ,  cost:{ kereste:2702,  tugla:7600,  yontmaTas:8106, demirKulce:2956  }, sureSaat:297.64  },
      { workers:29  , cost:{ kereste:4323, tugla:12160,  yontmaTas:12970, demirKulce:4729 }, sureSaat:416.70  },
      { workers:31  , cost:{ kereste:6917, tugla:19456,  yontmaTas:20753, demirKulce:7566 }, sureSaat:583.38  },
      { workers:33  , cost:{ kereste:11068, tugla:31129, yontmaTas:33204,demirKulce:12106 }, sureSaat:816.73  },
      { workers:35  , cost:{ kereste:17709, tugla:49806, yontmaTas:53126,demirKulce:19369 }, sureSaat:1143.43 },
      { workers:37  , cost:{ kereste:28334, tugla:79690, yontmaTas:85003,demirKulce:30991}, sureSaat:1600.80 },
      { workers:39  , cost:{ kereste:45335,tugla:127504, yontmaTas:136004,demirKulce:49585}, sureSaat:2241.11 },
      { workers:42  , cost:{ kereste:72536,tugla:204006, yontmaTas:217606,demirKulce:79336}, sureSaat:3137.56 },
    ]
  },

  tahil: {
    name: 'Tarla', icon: '🌾', color: '#8a7818',
    baseProductionPerWorker: 32,
    levels: [
      { workers:3   ,   cost:{ kereste:6,    tugla:21,     yontmaTas:11,    demirKulce:6    }, sureSaat:4.25    },
      { workers:5   ,   cost:{ kereste:10,    tugla:34,    yontmaTas:17,    demirKulce:10    }, sureSaat:5.95    },
      { workers:7   ,   cost:{ kereste:15,    tugla:54,    yontmaTas:28,    demirKulce:15    }, sureSaat:8.33    },
      { workers:9   ,   cost:{ kereste:25,    tugla:86,    yontmaTas:44,   demirKulce:25    }, sureSaat:11.66   },
      { workers:11  ,   cost:{ kereste:39,   tugla:137,    yontmaTas:71,   demirKulce:39   }, sureSaat:16.33   },
      { workers:13  ,  cost:{ kereste:63,   tugla:220,    yontmaTas:113,   demirKulce:63   }, sureSaat:22.86   },
      { workers:15  ,  cost:{ kereste:101,   tugla:352,   yontmaTas:181,   demirKulce:101   }, sureSaat:32.00   },
      { workers:17  ,  cost:{ kereste:161,   tugla:564,   yontmaTas:290,   demirKulce:161   }, sureSaat:44.80   },
      { workers:19  ,  cost:{ kereste:258,   tugla:902,   yontmaTas:464,  demirKulce:258   }, sureSaat:62.72   },
      { workers:21  ,  cost:{ kereste:412,  tugla:1443,   yontmaTas:742,  demirKulce:412  }, sureSaat:87.81   },
      { workers:23  ,  cost:{ kereste:660,  tugla:2309,   yontmaTas:1187,  demirKulce:660  }, sureSaat:122.94  },
      { workers:25  ,  cost:{ kereste:1056,  tugla:3694,  yontmaTas:1900,  demirKulce:1055  }, sureSaat:172.11  },
      { workers:27  ,  cost:{ kereste:1689,  tugla:5911,  yontmaTas:3040, demirKulce:1689  }, sureSaat:240.95  },
      { workers:29  , cost:{ kereste:2702,  tugla:9458,  yontmaTas:4864, demirKulce:2702  }, sureSaat:337.33  },
      { workers:31  , cost:{ kereste:4324, tugla:15132,  yontmaTas:7782, demirKulce:4324 }, sureSaat:472.26  },
      { workers:33  , cost:{ kereste:6918, tugla:24211,  yontmaTas:12452, demirKulce:6917 }, sureSaat:661.16  },
      { workers:35  , cost:{ kereste:11068, tugla:38738, yontmaTas:19922, demirKulce:11068 }, sureSaat:925.63  },
      { workers:37  , cost:{ kereste:17709, tugla:61981, yontmaTas:31876,demirKulce:17709 }, sureSaat:1295.88 },
      { workers:39  , cost:{ kereste:28334, tugla:99170, yontmaTas:51002,demirKulce:28334 }, sureSaat:1814.23 },
      { workers:42  , cost:{ kereste:45335,tugla:158672, yontmaTas:81602,demirKulce:45335}, sureSaat:2539.93 },
    ]
  }
};

export default BUILDING_DEFS;
