/**
 * GRUP MESAJLAŞMASI — konulu, çok kişili yazışma.
 *
 * İlkan'ın tarifi: *"mesajlaşmalarda yeni bir mesaj kısmı oluştur birlik
 * oyuncuları için. yeni mesaj grubu oluşturulabilsin, bu bir kişi ya da
 * birden fazla kişi olabilsin ya da direk birlik seçilebilsin. mesaj
 * gruplarında konu yazılabilmeli. mesela defans konulu bir birlik içi
 * toplu mesajlaşma yapılabilmeli."*
 *
 * İKİ TİP GRUP, TEK TABLO:
 *
 *   ÖZEL   — üyeler kuruluşta seçiliyor ve sabit kalıyor.
 *   BİRLİK — üye listesi YOK; katılımcılar her okumada birliğin O ANKİ
 *            üyeleridir. Birliğe katılan grubu hazır buluyor, birlikten
 *            çıkan erişimini aynı anda kaybediyor. Üyeleri kuruluşta
 *            kopyalasaydık birlikten atılan biri savunma yazışmasını
 *            okumaya devam ederdi — birlik yazışmasında bu bir güvenlik
 *            açığı, kozmetik bir tutarsızlık değil.
 *
 * AYNI BİRLİK İÇİN BİRDEN ÇOK KONU AÇILABİLİR. İlkan'ın örneği
 * ("defans konulu") tek bir birlik sohbeti değil, KONUYA göre ayrılmış
 * yazışma istiyor. Tek bir birlik kanalı olsaydı savunma çağrısı sohbetin
 * içinde kaybolurdu.
 *
 * KURALLAR BURADA, VERİ DEĞİL. Bu dosya veritabanı görmüyor, oturum
 * bilmiyor; `birlik.js` ile aynı desen. Sunucu açmadan sınanabiliyor.
 */

const { temizMetin, KONU_EN_COK, GOVDE_EN_COK } = require('./mesaj');

/** Konu ZORUNLU ve en az iki karakter — "a" başlıklı grup konu değil */
const KONU_EN_AZ = 2;

/**
 * ÖZEL GRUPTA ÜYE TAVANI.
 *
 * Birlik grubunda tavan yok: orada zaten birliğin kendi tavanı geçerli
 * (elçilik seviyesi × 3, en çok 60). Özel grupta tavan gerekiyor çünkü
 * tek istekle 200 kişiye bildirim göndermek bir spam aracıdır; sayı
 * birlik tavanının altında bilerek tutuldu ki kalabalık yazışmanın yolu
 * birlik olsun.
 */
const EN_COK_UYE = 20;

const TIPLER = ['ozel', 'birlik'];

/**
 * KONUYU DOĞRULA.
 * Doğrudan mesajda konu boşsa gövdeden türetiliyor; GRUPTA türetilmiyor
 * çünkü grubun konusu kalıcı bir başlık, tek mesajın özeti değil.
 */
function konuDogrula(ham) {
  const konu = temizMetin(ham, KONU_EN_COK).replace(/\n/g, ' ').trim();
  if (konu.length < KONU_EN_AZ) return { ok: false, reason: 'konu_kisa' };
  return { ok: true, konu };
}

/**
 * GRUP KURULABİLİR Mİ?
 *
 * @param {object} p
 * @param {string} p.konu         başlık
 * @param {number[]} p.uyeIdler   özel grupta seçilen üyeler (kurucu HARİÇ)
 * @param {number|null} p.birlikId  dolu ise birlik grubu
 * @param {number} p.kurucuId
 * @returns {{ok:true, tip, konu, uyeIdler} | {ok:false, reason}}
 */
function grupDogrula({ konu, uyeIdler = [], birlikId = null, kurucuId }) {
  const k = konuDogrula(konu);
  if (!k.ok) return k;

  if (birlikId) {
    /*
      Birlik grubunda elle seçilen üye YOK: katılımcı listesi birliğin
      kendisi. Gelen liste sessizce atılıyor, hata verilmiyor — istemci
      ikisini birden yollarsa kullanıcının niyeti "birlik" demektir.
    */
    return { ok: true, tip: 'birlik', konu: k.konu, uyeIdler: [] };
  }

  const temiz = [...new Set(uyeIdler.map(Number).filter(Number.isFinite))]
    .filter(id => id !== Number(kurucuId));
  if (temiz.length < 1) return { ok: false, reason: 'uye_yok' };
  if (temiz.length > EN_COK_UYE) return { ok: false, reason: 'cok_uye' };
  return { ok: true, tip: 'ozel', konu: k.konu, uyeIdler: temiz };
}

/**
 * BU OYUNCU GRUBU GÖREBİLİR/YAZABİLİR Mİ?
 *
 * Tek kapı: okuma ve yazma AYNI koşula bakıyor. Ayırsaydık "okuyabilen
 * ama yazamayan" bir hâl doğar ve her çağıran hangisini sorduğunu
 * karıştırırdı.
 *
 * @param {{tip:string, birlikId:number|null, uyeIdler:number[]}} grup
 * @param {number} userId
 * @param {number|null} kullanicininBirligi  oyuncunun O ANKİ birlik kimliği
 */
function erisebilirMi(grup, userId, kullanicininBirligi = null) {
  if (!grup) return false;
  const uid = Number(userId);
  if (grup.tip === 'birlik') {
    return !!grup.birlikId && Number(kullanicininBirligi) === Number(grup.birlikId);
  }
  return grup.uyeIdler.map(Number).includes(uid);
}

/** Gövde doğrulaması — konusu olmayan tek mesaj, grubun konusu zaten var */
function govdeDogrula(ham) {
  const govde = temizMetin(ham, GOVDE_EN_COK);
  if (!govde) return { ok: false, reason: 'bos_mesaj' };
  return { ok: true, govde };
}

/**
 * GRUPTAN AYRILMA.
 *
 * Birlik grubundan tek tek ayrılmak YOK: katılımcılık birliğin kendisi,
 * grubun değil. Ayrılmaya izin verseydik birlikte olup grubu görmeyen
 * bir üye durumu çıkar ve Konung'un "herkese duyurdum" varsayımı
 * yalan olurdu. Birlik yazışmasından çıkmanın yolu birlikten çıkmak.
 */
function ayrilabilirMi(grup, userId) {
  if (!grup || grup.tip !== 'ozel') return false;
  return grup.uyeIdler.map(Number).includes(Number(userId));
}

/** Grubu yalnız kuran dağıtabilir — birliği yalnız Konung'un dağıtması gibi */
function dagitabilirMi(grup, userId) {
  return !!grup && Number(grup.kurucuId) === Number(userId);
}

const HATA_METNI = {
  konu_kisa: 'Grubun bir konusu olmalı (en az 2 karakter).',
  uye_yok: 'En az bir oyuncu seç ya da birliği seç.',
  oyuncu_yok: 'Seçtiğin oyunculardan biri bulunamadı.',
  cok_uye: `Bir gruba en fazla ${EN_COK_UYE} oyuncu eklenebilir — `
    + 'daha kalabalığı için birliği seç.',
  bos_mesaj: 'Mesaj boş olamaz.',
  grup_yok: 'Bu grup artık yok ya da erişimin kalmadı.',
  birlik_yok: 'Birlik grubu kurmak için bir birlikte olman gerekiyor.',
  yetki_yok: 'Bunu yapma yetkin yok.',
  birlikten_ayrilinmaz: 'Birlik yazışmasından ayrılmak için birlikten çıkman gerekiyor.',
};

module.exports = {
  grupDogrula, konuDogrula, govdeDogrula,
  erisebilirMi, ayrilabilirMi, dagitabilirMi,
  KONU_EN_AZ, KONU_EN_COK, GOVDE_EN_COK, EN_COK_UYE, TIPLER, HATA_METNI,
};
