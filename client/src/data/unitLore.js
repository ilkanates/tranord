/**
 * Birim hikâyeleri ve rol açıklamaları.
 *
 * `story`    — kısa anlatı, birimin kim olduğu.
 * `strength` — TEK cümle: neyde iyi olduğu. Cümleler oyunun gerçek
 *              istatistiklerinden çıkarıldı, süs değil:
 *                fjordvakt   sal 30 / yaya 30 / atlı 20 / hız 7  — ucuz, dengesiz
 *                skjoldvakt  sal 35 / yaya 55 — piyade savunmasının bel kemiği
 *                nordkamper  sal 50 / yaya 35 — saldırıya dönük piyade
 *                ulvSavasci  sal 55 / yaya 60 / hız 3 — her yönü iyi, çok yavaş
 *                spydvakt    sal 10 / atlı 40 / hız 8 — sadece süvari kırar
 *                isbjorn     sal 30 / atlı 45 — zırhlı mızrak duvarı
 *                kuzeyIzcisi hız 14 / kap 110 — savaşmaz, taşır ve gözler
 *                demirAtli   sal 40 / hız 11 / kap 100 — hızlı yağma
 *                skjoldreiter yaya 75 / atlı 55 — atlı savunmanın omurgası
 *                buzSuvarisi sal 60 — atlı vurucu güç
 *                jernridder  sal 65 / yaya 80 — her şeyde en iyi, en pahalı
 *                vindreiter  atlı 60 / hız 12 — süvariye karşı hızlı perde
 *                stormridder atlı 65 / sal 30 — en iyi süvari savunması
 */
const UNIT_LORE = {
  // ── Kışla ─────────────────────────────────────────────────────────
  fjordvakt: {
    // Portreler kadın da olabildiği için anlatım cinsiyet belirtmiyor
    // ("adamlar" → "eller"); oyuncu ekrandaki görselle çelişen metin görmesin.
    story: 'Fiyort ağzındaki balıkçı köylerinden toplanan ilk çağrı. Kışın ağ '
      + 'onaran, yazın kürek çeken eller; kılıçlarını babalarından devraldılar. '
      + 'Zırhları yok, ama sığ suyu ve dar kayalıkları avuçlarının içi gibi bilirler.',
    strength: 'Ucuz ve çevik: sayıyla ezmek ve ilk baskınları savuşturmak için iyidir, '
      + 'uzun bir savaş hattında dayanamaz.',
  },
  skjoldvakt: {
    story: 'Kalkan duvarının mirasçıları. Bir Skjoldvakt kendi canını değil, '
      + 'solundakinin açık yanını korumayı öğrenir. Eğitim yıllarının yarısı '
      + 'omuz omuza durmayı, diğer yarısı geri adım atmamayı belletmekle geçer.',
    strength: 'Piyade savunmasının bel kemiği: yaya saldırılarına karşı en dayanıklı '
      + 'ucuz birimdir, saldırıda öne sürmek israftır.',
  },
  nordkamper: {
    story: 'Kuzeyin ücretli kavgacıları. Zırhı kendi parasıyla alan, ganimetten '
      + 'pay isteyen ve barış zamanı köyde duramayanlar. Jarl onları sever, '
      + 'çünkü ilk saflarda tereddüt etmezler.',
    strength: 'Saldırıya dönük piyade: sur önünde ve akınlarda vuruş gücü yüksektir, '
      + 'kalkanı olmadığı için savunmada erir.',
  },
  ulvSavasci: {
    story: 'Kurt derisi giyip kurt adı taşıyan yeminli savaşçılar. Bir kurt sürüsünü '
      + 'tek başına izleyip dönebilen kabul edilir; göğsündeki kafatası öldürdüğü '
      + 'ilk kurdun değil, ondan öğrendiği sabrın işareti sayılır.',
    strength: 'Hem vurur hem dayanır: hattın kırılmaması gereken yerine konur, '
      + 'ama çok yavaş olduğu için baskına ve takibe uygun değildir.',
  },
  spydvakt: {
    story: 'Mızrak, kılıçtan çok daha eski bir alettir; Spydvakt bunu bilir. '
      + 'Çoğu avcıydı, geyik ve yaban domuzu yıkmayı biliyordu. Atın göğsünün '
      + 'nereye geldiğini tarif etmeye gerek duymazlar.',
    strength: 'Süvari kırıcı: atlı hücumları kırmakta ucuz ve etkilidir, '
      + 'piyadeye karşı neredeyse zararsızdır.',
  },
  isbjorn: {
    story: 'Kutup ayısı avından dönenlere verilen ad. Zırhın üstüne ayı kürkü '
      + 'giyerler; rüzgârda daha büyük görünmek için değil, mızrağı tutan elin '
      + 'donmaması için. Bir Isbjørn geri çekilirken de yüzü düşmana dönüktür.',
    strength: 'Zırhlı mızrak duvarı: ağır süvariyi durdurmak için en sağlam piyadedir, '
      + 'hücumda yavaş ve pahalıdır.',
  },

  // ── Ahır ──────────────────────────────────────────────────────────
  kuzeyIzcisi: {
    story: 'Haritası olmayan toprakları haritalayanlar. Kar körlüğünü, buz '
      + 'çatlağının sesini ve dumanın hangi yönden köy kokusu getirdiğini bilirler. '
      + 'Savaşmak için değil, dönüp anlatmak için gönderilirler.',
    strength: 'Gözcü ve kervancı: en hızlı ve en çok yük taşıyan birimdir, '
      + 'çarpışmaya sokulursa boşa harcanmış olur.',
  },
  demirAtli: {
    story: 'Atını kendi yetiştiren küçük toprak sahipleri. Ne jarl kadar zengin '
      + 'ne köylü kadar bağlı; çağrıldıklarında kendi eyerleriyle gelir, '
      + 'ganimetin bir kısmını kendi ahırına yatırırlar.',
    strength: 'Hızlı yağmacı: uzaktaki zayıf köyleri vurup yükle dönmek için '
      + 'en verimli birimdir, ağır hatta girmemelidir.',
  },
  skjoldreiter: {
    story: 'Atın üstünde kalkan tutmak ayrı bir sanattır — dizginle kalkanı aynı '
      + 'elde tutmayı öğrenmek yıllar alır. Skjoldreiter bölükleri geri çekilen '
      + 'orduyu kapatmakla ünlüdür; en son onlar döner.',
    strength: 'Atlı savunmanın omurgası: köyde bekletildiğinde her tür saldırıya '
      + 'karşı en yüksek toplam savunmayı verir.',
  },
  buzSuvarisi: {
    story: 'Donmuş göl üstünde eğitilirler; buzun çatlamadığı hızı bulan biner. '
      + 'Beyaz atları soy değil seçimdir — kar fırtınasında düşman onları '
      + 'ancak çok yakınken görür.',
    strength: 'Atlı vurucu güç: hızıyla birlikte en yüksek saldırıyı taşır, '
      + 'kalkanı olmadığı için savunmada tutulmamalıdır.',
  },
  jernridder: {
    story: 'Demir binici. Bir Jernridder’ın zırhı bir köyün yıllık demir üretimine '
      + 'bedeldir, bu yüzden sayıları hiçbir zaman çok olmaz. Jarl onları son '
      + 'kozu olarak saklar; göründükleri yerde savaşın kararı verilmiş sayılır.',
    strength: 'Her şeyde en iyi ve en pahalı: hem saldırıda hem savunmada zirvedir, '
      + 'ordunun çekirdeği olarak azar azar biriktirilir.',
  },
  vindreiter: {
    story: 'Rüzgâr binicisi. Hafif eyer, uzun mızrak, zırh yok — ağırlık hızdan '
      + 'çalar. Düşman süvarisinin yan kanadına dokunup çekilir, sonra yine '
      + 'dokunur; asla göğüs göğüse durmaz.',
    strength: 'Süvariye karşı hızlı perde: atlı hücumu ucuza kırar ve kanat '
      + 'tutmakta hızlıdır, piyade hattına karşı işe yaramaz.',
  },
  stormridder: {
    story: 'Fırtına binicisi. Zırhlı mızrağın atlı hâli: bir duvar gibi durur ama '
      + 'duvar gibi yavaş değildir. Kar fırtınasında yol alabilen tek ağır bölük '
      + 'oldukları için kışın gelen saldırıları hep onlar karşılar.',
    strength: 'Süvari savunmasında oyunun en iyisi: düşman atlısını durdurmak için '
      + 'tutulur, kendi saldırısı vasattır.',
  },
};

export const unitLore = (type) => UNIT_LORE[type] || null;
export default UNIT_LORE;
