/**
 * GÖREV ZİNCİRİ — rehber görevleri, ölçüm ve ödül durumu.
 *
 * server/index.js'ten AYNEN taşındı (davranış değişmedi). Kendi başına
 * durabiliyor çünkü dışarıdan yalnız iki şeye bakıyor: görev tanımları
 * (data/questDefs) ve dünya arazi bonusu (game/world). Oyuncunun durumu
 * her fonksiyona `session` olarak geliyor.
 *
 * Görev kaydı MERKEZ köyün state'inde tutuluyor — ayrı tablo açmamak için;
 * merkez taşınınca kayıt da taşınıyor (bkz. index.js set_capital).
 */
const { QUESTS } = require('../data/questDefs');
const W = require('./world');
const HERO = require('./kahraman');

// ─── GÖREV ZİNCİRİ ────────────────────────────────────────────────
/**
 * Görev durumu HESAP başına: merkez köyün state'inde tutulur.
 * (Ayrı tablo açmamak için; merkez taşınınca kayıt da taşınıyor.)
 */
function questState(session) {
  const v = session.villages.get(session.capitalSlot)
    || session.villages.values().next().value;
  if (!v) return null;
  if (!v.quests || typeof v.quests !== 'object') {
    v.quests = { claimed: [], done: [], hidden: false };
  }
  if (!Array.isArray(v.quests.claimed)) v.quests.claimed = [];
  /*
    `done` = koşulu BİR KEZ sağlanmış görevler. Ödül almadan devam edip
    sonradan almak için gerekli: koşul geri düşse bile (kılıç birim
    eğitiminde harcandı, işçi başka tarlaya alındı, birim seferde öldü)
    görev tamamlanmış sayılır ve ödül alınabilir kalır.
  */
  if (!Array.isArray(v.quests.done)) v.quests.done = [];
  // Eski kayıtlar: ödülü alınmış görev zaten tamamlanmıştır
  for (const id of v.quests.claimed) {
    if (!v.quests.done.includes(id)) v.quests.done.push(id);
  }
  return v.quests;
}

/** Koşul ölçümü — oyuncunun BÜTÜN köylerine bakar, en iyisi sayılır */
function questOlcu(cond, session) {
  const koyler = [...session.villages.values()];
  switch (cond.tur) {
    case 'tarla': {
      if (cond.adet) {
        return Math.max(0, ...koyler.map(v => Object.values(v.productionTiles || {})
          .filter(t => (t.level || 0) >= 1 && (!cond.tip || t.type === cond.tip)).length));
      }
      return Math.max(0, ...koyler.map(v => Math.max(0, ...Object.values(v.productionTiles || {})
        .filter(t => !cond.tip || t.type === cond.tip).map(t => t.level || 0), 0)));
    }
    case 'bina':
      return Math.max(0, ...koyler.map(v => Math.max(0, ...Object.values(v.villageBuildings || {})
        .filter(b => b.type === cond.tip).map(b => b.level || 0), 0)));
    case 'isci':
      // tip verilirse yalnız o cins tarlalardaki işçiler sayılır
      return Math.max(0, ...koyler.map(v => Object.values(v.productionTiles || {})
        .filter(t => !cond.tip || t.type === cond.tip)
        .reduce((s2, t) => s2 + (t.workers || 0), 0)));
    case 'bonusTarla':
      /*
        Bonuslu hex'e DOĞRU üretimi dikmiş tarla sayısı. Bonus hex'e
        bağlı ve sabit; oraya aynı cinsten ocak kurmak üretimi %X
        artırıyor. Rehber bunu bir görevle öğretiyor.
      */
      return Math.max(0, ...koyler.map(v => Object.entries(v.productionTiles || {})
        .filter(([k, t]) => {
          if (!(t.level >= 1)) return false;
          const [lq, lr] = k.split(',').map(Number);
          const bns = W.worldTileBonus((v.worldQ || 0) + lq, (v.worldR || 0) + lr);
          return bns && bns.resource === t.type;
        }).length));
    case 'binaIsci3':
      // birden çok bina türündeki işçilerin toplamı
      return Math.max(0, ...koyler.map(v => Object.values(v.villageBuildings || {})
        .filter(b => (cond.tipler || []).includes(b.type))
        .reduce((s2, b) => s2 + (b.workers || 0), 0)));
    case 'binaIsci':
      return Math.max(0, ...koyler.map(v => Object.values(v.villageBuildings || {})
        .filter(b => b.type === cond.tip)
        .reduce((s2, b) => s2 + (b.workers || 0), 0)));
    case 'kaynak':
      return Math.max(0, ...koyler.map(v => Math.floor(v.resources?.[cond.res] || 0)));
    case 'ordu':
      return koyler.reduce((s2, v) => s2 + Object.values(v.army || {})
        .reduce((a, b) => a + b, 0), 0);
    case 'ekipman':
      return Math.max(0, ...koyler.map(v => v.equipment?.[cond.tip] || 0));
    case 'arastirma':
      return Math.max(0, ...koyler.map(v => Object.values(v.research || {}).filter(Boolean).length));
    case 'sefer':
      return koyler.reduce((s2, v) => s2 + (v.stats?.attacksSent || 0) + (v.stats?.scoutsSent || 0), 0);
    case 'nufus':
      return Math.max(0, ...koyler.map(v => v.population || 0));
    /*
      KAHRAMAN SEVİYESİ. Kayıt merkez köyün state'inde (görev kaydıyla
      aynı yerde), o yüzden köyler üzerinde MAX değil — kahraman tek ve
      bir tane. Yine de bütün köylere bakıyoruz: merkez taşınmış bir
      hesapta kayıt bir süre eski köyde kalabiliyor.
    */
    case 'kahramanSeviye': {
      const kah = koyler.map(v => v.kahraman).find(Boolean);
      if (!kah) return 0;
      return HERO.xpSeviyesi(kah.xp || 0);
    }
    /*
      TAMAMLANAN MACERA — başlatılan değil. Haktan ölçseydik macerayı
      yola çıkarmak görevi bitirirdi ve oyuncu ödülü sonucu görmeden
      alırdı; maceranın öğrettiği şey tam da sonucu.
    */
    case 'maceraTamam': {
      const kah = koyler.map(v => v.kahraman).find(Boolean);
      return kah ? (kah.maceraTamamlanan || 0) : 0;
    }
    /*
      KUŞANILMIŞ EŞYA SAYISI — envanterdeki değil. Eşya kuşanılmadan
      hiçbir işe yaramıyor; envanteri saysaydık görev, oyuncuya asıl
      öğretmek istediği hareketi (slota tak) yaptırmadan biterdi.
    */
    case 'kusanilanEsya': {
      const kah = koyler.map(v => v.kahraman).find(Boolean);
      if (!kah) return 0;
      return Object.values(kah.kusanilan || {}).filter(Boolean).length;
    }
    default: return 0;
  }
}

const questHedef = (cond) => cond.seviye || cond.adet || 1;
/** ŞU AN koşul sağlanıyor mu (anlık ölçüm) */
const questOlculuyor = (def, session) => questOlcu(def.cond, session) >= questHedef(def.cond);

/**
 * Tamamlananları KALICI işaretle.
 *
 * Her emitVillage'da (questPayload üzerinden) çalışır; oyun durumunu
 * değiştiren her şey zaten bir emit tetiklediği için koşulun sağlandığı
 * an kaçmaz. Bir kez `done`'a girdikten sonra ölçüm geri düşse de görev
 * tamam kalır — oyuncu ödülü istediği zaman alır.
 */
function questSync(session) {
  const st = questState(session);
  if (!st) return null;
  let degisti = false;
  for (const q of QUESTS) {
    if (st.done.includes(q.id)) continue;
    if (questOlculuyor(q, session)) { st.done.push(q.id); degisti = true; }
  }
  if (degisti) {
    const key = session.villages.has(session.capitalSlot)
      ? session.capitalSlot : session.villages.keys().next().value;
    if (key) session.dirtySlots.add(key);
  }
  return st;
}

/**
 * KARŞILAMA ANLATIMI GÖRÜLDÜ MÜ?
 *
 * Bilgi SUNUCUDA duruyor, localStorage'da değil: anlatım geçilemez
 * olduğu için istemciye bırakılsaydı depoyu temizleyen (ya da başka
 * tarayıcıdan giren) oyuncu her seferinde baştan görür, geliştirici
 * konsolundan bir satırla da atlayabilirdi.
 *
 * Görev durumuyla aynı yerde (merkez köyün `quests` kaydı) — ayrı tablo
 * açmamak için; merkez taşınınca kayıt da taşınıyor.
 */
function egitimGoruldu(session) {
  const st = questState(session);
  return !!st?.egitim;
}

function egitimBitir(session) {
  const st = questState(session);
  if (!st || st.egitim) return false;
  st.egitim = true;
  const key = session.villages.has(session.capitalSlot)
    ? session.capitalSlot : session.villages.keys().next().value;
  if (key) session.dirtySlots.add(key);
  return true;
}

/** Görev tamam mı — bir kez sağlandıysa kalıcı olarak tamam */
const questTamam = (def, session) => {
  const st = questState(session);
  return (st && st.done.includes(def.id)) || questOlculuyor(def, session);
};

/**
 * İstemciye giden görev paketi: zincir sırayla açılır — bir görev
 * ödülü alınmadan sonraki görev "aktif" olmaz, ama koşulu erken
 * tamamlandıysa bu görünür (oyuncu sırayla ödülleri toplar).
 */
function questPayload(session) {
  const st = questSync(session);
  if (!st) return null;
  const claimed = new Set(st.claimed);
  const done = new Set(st.done);
  const liste = QUESTS.map(q => {
    const tamam = done.has(q.id);
    const olculen = questOlcu(q.cond, session);
    const hedef = questHedef(q.cond);
    return {
      id: q.id, title: q.title, text: q.text, hint: q.hint,
      tab: q.tab, anchor: q.anchor, reward: q.reward,
      zorunlu: !!q.zorunlu,
      hedef,
      // Tamamlanmış görevin çubuğu geri düşmesin (kılıç harcandı vb.)
      olculen: tamam ? Math.max(olculen, hedef) : olculen,
      tamam,
      alindi: claimed.has(q.id),
    };
  });
  /*
    KART NEYİ GÖSTERİR — sıra: hazır ödül > sıradaki ZORUNLU > sıradaki.

    Zincir katı değil, oyuncu listeden istediğini yapabilir. Ama kart tek
    bir şey gösterebiliyor ve yeni oyuncuya ANA HATTI göstermeli: opsiyonel
    bir görev (pazar, taverna) kartı kapatırsa oyuncu ana hattın nerede
    kaldığını göremiyordu.
  */
  const aktif = liste.find(q => !q.alindi && q.tamam)
    || liste.find(q => !q.alindi && q.zorunlu)
    || liste.find(q => !q.alindi)
    || null;
  /*
    "Rehber bitti" ölçüsü ZORUNLU görevler: opsiyonelleri yapmayan oyuncu
    da ana hattı bitirmiş sayılır, rehber onu sonsuza kadar meşgul etmez.
  */
  const zorunluKalan = liste.filter(q => q.zorunlu && !q.alindi).length;
  return {
    hidden: !!st.hidden,
    aktif: aktif?.id || null,
    bitti: zorunluKalan === 0,
    zorunluKalan,
    toplamKalan: liste.filter(q => !q.alindi).length,
    liste,
  };
}

/** Görev ilerlemesi de parmak izine girsin — yoksa kart 30 sn donuyor */
function questFingerprint(session) {
  const st = questState(session);
  if (!st) return '';
  const p = questPayload(session);
  const aktif = p?.liste.find(q => q.id === p.aktif);
  return `${st.claimed.length}|${st.done.length}|${st.hidden ? 'H' : ''}|${aktif ? aktif.id + aktif.olculen : ''}`;
}

module.exports = {
  questState, questOlcu, questHedef, questOlculuyor,
  questSync, questTamam, questPayload, questFingerprint,
  egitimGoruldu, egitimBitir,
};
