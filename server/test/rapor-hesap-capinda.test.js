/**
 * RAPORLAR HESABA AİT — köye değil.
 *
 * İlkan: *"raporlar her köye ayrı geliyor. bir mesajı bir köyde
 * okuyorum, diğerinde okunmamış gözüküyor."*
 *
 * Rapor köy başına saklanıyor ve pakete YALNIZ aktif köyünki gidiyordu.
 * Okunma kaydı ise hesap çapında (tarayıcıda rapor kimliğine göre).
 * İkisi ayrışınca okunmamış sayacı hiçbir zaman güvenilir olmuyor,
 * oyuncu ikinci köyünün savaşını kaçırabiliyordu.
 *
 * ÖLÇÜM PAKETTE yapılıyor, köy nesnesinde değil: oyuncunun gördüğü şey
 * paket. Köy nesnesine bakan bir test "sunucuda var ama ekrana gitmiyor"
 * hatasını kaçırırdı — bu projede tam olarak o hata defalarca oldu.
 */
const test = require('node:test');
const assert = require('node:assert');
const { sunucuBaslat, hesapAc, baglan, bekle } = require('./sunucu');

test('BİR KÖYDE oluşan rapor DİĞER köydeyken de pakette', async (t) => {
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  const ilkSlot = oturum.koy.activeSlot;
  oturum.soket.emit('dev_new_village');
  await bekle(2500);
  const koyler = (oturum.koy.villages || []).map(k => k.slotKey);
  const ikinciSlot = koyler.find(k => k !== ilkSlot);
  assert.ok(ikinciSlot, 'ikinci köy kurulamadı');

  /* İLK köyde bir rapor oluştur */
  oturum.soket.emit('dev_kesif_raporu', { kayipli: true });
  await bekle(1800);
  const ilkte = (oturum.koy.reports || []).filter(r => r.mode === 'scout');
  assert.ok(ilkte.length >= 1, 'rapor ilk köyde görünmeli');

  /* İKİNCİ köye geç — rapor KAYBOLMAMALI */
  oturum.soket.emit('switch_village', { slotKey: ikinciSlot });
  await bekle(1800);
  assert.equal(oturum.koy.activeSlot, ikinciSlot, 'köy değiştirilemedi');

  const ikincide = (oturum.koy.reports || []).filter(r => r.mode === 'scout');
  assert.ok(ikincide.length >= 1,
    'rapor köy değişince kaybolmamalı — rapor kutusu hesaba ait');
  assert.ok(String(ikincide[0].id).startsWith(ilkSlot + '#'),
    'kimlik köy anahtarıyla önelenmeli — köy içi sayaçlar çakışıyor');
  assert.equal(ikincide[0].koySlot, ilkSlot,
    'rapor HANGİ köye ait olduğunu söylemeli, yoksa tek liste okunaksız olur');
  assert.ok(ikincide[0].koyAd, 'köy adı da gelmeli — ekranda etiket olarak duruyor');
});

test('İKİNCİ köye gelen rapor AKTİF köydeyken YAYINLANIYOR', async (t) => {
  /*
    Parmak izi yalnız AKTİF köyün en üstteki raporuna bakıyordu: ikinci
    köye bir şey olduğunda paket "rapor değişmedi" deyip listeyi
    yollamıyor, rapor ancak o köye geçince görünüyordu. Yani ikinci
    köyüne yapılan saldırıyı kalp atışını bekleyene kadar göremiyordun.
  */
  const sunucu = await sunucuBaslat();
  t.after(() => sunucu.kapat());
  const { token } = await hesapAc(sunucu);
  const oturum = await baglan(sunucu, token);
  t.after(() => oturum.kapat());

  const ilkSlot = oturum.koy.activeSlot;
  oturum.soket.emit('dev_new_village');
  await bekle(2500);
  const ikinciSlot = (oturum.koy.villages || [])
    .map(k => k.slotKey).find(k => k !== ilkSlot);

  /* İkinci köye geç, orada rapor üret, ilk köye dön */
  oturum.soket.emit('switch_village', { slotKey: ikinciSlot });
  await bekle(1500);
  oturum.soket.emit('dev_kesif_raporu', { kayipli: false });
  await bekle(1500);
  oturum.soket.emit('switch_village', { slotKey: ilkSlot });
  await bekle(1800);

  const gorunen = (oturum.koy.reports || []).filter(r => r.koySlot === ikinciSlot);
  assert.ok(gorunen.length >= 1,
    'ikinci köyün raporu ilk köydeyken de görünmeli');
});
