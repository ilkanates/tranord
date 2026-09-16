/**
 * VERİTABANI İKİZLERİ — db.js (PostgreSQL) ve db.dev.js (JSON) aynı
 * sözleşmeyi taşımalı.
 *
 * NEDEN BU TEST VAR: ikisinin ayrışması bu projede defalarca patladı ve
 * her seferinde aynı biçimde — yerelde çalışan şey Pi'de çalışmıyor (ya
 * da tersi) ve fark ancak oyuncu bildirince görülüyor.
 *
 *   · Taze dev veritabanında birlik tabloları hiç yoktu; dosyasız
 *     açılışta `loadAlliances()` çöküyordu.
 *   · `loadAlliances` birlik AÇIKLAMASINI db.js'te taşıyor, db.dev.js'te
 *     düşürüyordu; profil yazılıyor ama ekranda hiç görünmüyordu.
 *
 * İkisi de "bir yere eklerken ötekini unutma" hatası. Bu dosya o
 * unutmayı kırmızıya çeviriyor.
 *
 * TEST POSTGRESQL'E BAĞLANMIYOR: yalnız MODÜLLERİ yüklüyor ve dışa
 * verdikleri yüzeyi karşılaştırıyor. Gerçek sorgu davranışı burada
 * ölçülemez ama "işlev bir sürümde var ötekinde yok" hatası ölçülebilir
 * ve asıl tekrarlayan hata bu.
 */
const test = require('node:test');
const assert = require('node:assert');

const PG = require('../db');
const DEV = require('../db.dev');

const islevler = (mod) => Object.keys(mod)
  .filter(k => typeof mod[k] === 'function')
  .sort();

test('iki surum de AYNI islev kumesini disa veriyor', () => {
  const a = islevler(PG);
  const b = islevler(DEV);
  const sadecePg = a.filter(k => !b.includes(k));
  const sadeceDev = b.filter(k => !a.includes(k));
  assert.deepEqual(sadecePg, [],
    `db.js'te olup db.dev.js'te olmayan: ${sadecePg.join(', ')}`);
  assert.deepEqual(sadeceDev, [],
    `db.dev.js'te olup db.js'te olmayan: ${sadeceDev.join(', ')}`);
});

test('birlik ve grup islevleri iki surumde de tam', () => {
  /*
    Bu iki aile sonradan eklendi ve ekleme sırasında ayrışma riski en
    yüksek olanlar. Açıkça sayılıyorlar ki bir tanesi iki sürümden de
    birden silinirse test yine kırmızıya dönsün (yüzey karşılaştırması
    tek başına bunu yakalamaz).
  */
  const beklenen = [
    'loadAlliances', 'birlikKur', 'birlikSil', 'birlikAdDegistir',
    'uyeEkle', 'uyeCikar', 'uyeRutbe', 'davetYaz', 'davetSil', 'davetleriTemizle',
    'birlikAciklama', 'gunlukYaz', 'gunlukOku',
    'diplomasiYaz', 'diplomasiDurum', 'diplomasiListesi', 'diplomasiSil',
    'grupKur', 'grupBul', 'gruplarim', 'grupUyeleri', 'grupMesajYaz',
    'grupAkisi', 'grupOkundu', 'grupAyril', 'grupSil',
  ];
  for (const ad of beklenen) {
    assert.equal(typeof PG[ad], 'function', `db.js: ${ad} yok`);
    assert.equal(typeof DEV[ad], 'function', `db.dev.js: ${ad} yok`);
  }
});

test('dev surumu birlik ACIKLAMASINI yukluyor', async () => {
  /*
    Gerçekte olan hata: db.js'in sorgusuna `aciklama` eklendi, db.dev.js
    ise alanları tek tek kopyaladığı için düşürdü. Profil kaydediliyor,
    günlüğe de yazılıyor ama ekranda hiç görünmüyordu.

    Alan adı kaynakta ARANIYOR, çalıştırılarak değil: dev veritabanını
    bu testin içinde kurup birlik açmak, testi asıl ölçmek istediği
    şeyden (alanın taşınıp taşınmadığı) uzaklaştırırdı.
  */
  const fs = require('node:fs');
  const path = require('node:path');
  const kaynak = fs.readFileSync(
    path.join(__dirname, '..', 'db.dev.js'), 'utf8');
  const i = kaynak.indexOf('async function loadAlliances');
  assert.ok(i > 0, 'loadAlliances bulunmalı');
  const govde = kaynak.slice(i, i + 700);
  assert.ok(govde.includes('aciklama'),
    'db.dev.js loadAlliances birlik açıklamasını da taşımalı');
});

test('bos sema butun tablolari iceriyor', () => {
  /*
    Taze dosyayla açılışta çöken hatanın kilidi. Varsayılan şema tek
    kaynak (BOS_DB); bir tablo eklenip buraya yazılmazsa dosyasız
    açılışta o tabloya ilk dokunuş `undefined` üzerinde patlar.
  */
  const fs = require('node:fs');
  const path = require('node:path');
  const kaynak = fs.readFileSync(
    path.join(__dirname, '..', 'db.dev.js'), 'utf8');
  const i = kaynak.indexOf('const BOS_DB');
  assert.ok(i > 0, 'BOS_DB tek kaynak olarak durmalı');
  const sema = kaynak.slice(i, kaynak.indexOf('});', i));
  for (const alan of ['users', 'villages', 'messages', 'blocks',
    'threads', 'threadMembers', 'threadMessages',
    'alliances', 'allianceMembers', 'allianceInvites',
    'allianceLog', 'allianceDiplomacy']) {
    assert.ok(sema.includes(alan), `BOS_DB içinde ${alan} yok`);
  }
});
