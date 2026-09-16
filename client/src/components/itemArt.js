/**
 * Kahraman eşyası görselleri.
 *
 * Bina haritalarından (buildingArt.js) AYRI tutuluyor: iki liste farklı
 * hızda büyüyor ve aynı dosyada olsalardı her eşya eklemesi bina
 * dosyasını da kilitlerdi.
 *
 * Anahtarlar `server/data/heroItemDefs.js` içindeki HERO_ITEMS
 * anahtarlarıyla BİREBİR aynı — görseli olmayan eşya haritada yok,
 * arayüz o zaman eski ikona düşüyor.
 */
import demirKalkanImg from '../assets/items/demirKalkan.jpg';
import pulZirhImg from '../assets/items/pulZirh.jpg';
import aynaZirhImg from '../assets/items/aynaZirh.jpg';
import zincirZirhImg from '../assets/items/zincirZirh.jpg';
import kuleKalkaniImg from '../assets/items/kuleKalkani.jpg';
import yuvarlakKalkanImg from '../assets/items/yuvarlakKalkan.jpg';
import avMizragiImg from '../assets/items/avMizragi.jpg';
import savasBaltasiImg from '../assets/items/savasBaltasi.jpg';
import fjordKiliciImg from '../assets/items/fjordKilici.jpg';
import diriltmeIksiriImg from '../assets/items/diriltmeIksiri.jpg';
import gumusBileklikImg from '../assets/items/gumusBileklik.jpg';
import sifaTasiImg from '../assets/items/sifaTasi.jpg';
import runBileklikImg from '../assets/items/runBileklik.jpg';
import kutupTilkisiPostuImg from '../assets/items/kutupTilkisiPostu.jpg';
import demirNalliCizmeImg from '../assets/items/demirNalliCizme.jpg';
import kurtPostuCizmeImg from '../assets/items/kurtPostuCizme.jpg';
import zirhliPantolonImg from '../assets/items/zirhliPantolon.jpg';
import zincirEtekImg from '../assets/items/zincirEtek.jpg';
import deriPantolonImg from '../assets/items/deriPantolon.jpg';
import demirMigferImg from '../assets/items/demirMigfer.jpg';
import gozlukluMigferImg from '../assets/items/gozlukluMigfer.jpg';
import boynuzluMigferImg from '../assets/items/boynuzluMigfer.jpg';
import kuzeyRuzgariImg from '../assets/items/kuzeyRuzgari.jpg';
import bozkirAtiImg from '../assets/items/bozkirAti.jpg';
import fiyortMidillisiImg from '../assets/items/fiyortMidillisi.jpg';
import savasAtiImg from '../assets/items/savasAti.jpg';
import zirhliAtImg from '../assets/items/zirhliAt.jpg';
import koyBeygiriImg from '../assets/items/koyBeygiri.jpg';
import amberKolyeImg from '../assets/items/amberKolye.jpg';
import kurtDisiKolyeImg from '../assets/items/kurtDisiKolye.jpg';

export const ITEM_IMAGE = {
  fjordKilici: fjordKiliciImg,
  savasBaltasi: savasBaltasiImg,
  avMizragi: avMizragiImg,
  yuvarlakKalkan: yuvarlakKalkanImg,
  demirKalkan: demirKalkanImg,
  kuleKalkani: kuleKalkaniImg,
  zincirZirh: zincirZirhImg,
  aynaZirh: aynaZirhImg,
  pulZirh: pulZirhImg,
  diriltmeIksiri: diriltmeIksiriImg,
  gumusBileklik: gumusBileklikImg,
  sifaTasi: sifaTasiImg,
  runBileklik: runBileklikImg,
  kutupTilkisiPostu: kutupTilkisiPostuImg,
  demirNalliCizme: demirNalliCizmeImg,
  kurtPostuCizme: kurtPostuCizmeImg,
  zirhliPantolon: zirhliPantolonImg,
  zincirEtek: zincirEtekImg,
  deriPantolon: deriPantolonImg,
  demirMigfer: demirMigferImg,
  gozlukluMigfer: gozlukluMigferImg,
  boynuzluMigfer: boynuzluMigferImg,
  kuzeyRuzgari: kuzeyRuzgariImg,
  bozkirAti: bozkirAtiImg,
  fiyortMidillisi: fiyortMidillisiImg,
  savasAti: savasAtiImg,
  zirhliAt: zirhliAtImg,
  koyBeygiri: koyBeygiriImg,
  amberKolye: amberKolyeImg,
  kurtDisiKolye: kurtDisiKolyeImg,
};

export default ITEM_IMAGE;
