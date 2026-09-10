// Bina gorselleri ve hex amblem haritalari - VillageCenter'dan ayri tutuldu
import bosTex from '../assets/bos.png';
import ormanTex from '../assets/orman_tile.png';
import kilTex from '../assets/kil_ocagi.png';
import tasTex from '../assets/tas_ocagi.png';
import demirTex from '../assets/demir_madeni.png';
import tahilTex from '../assets/tahil_tile.png';

// Koy cevresindeki dunya karolari icin arazi dokulari (MapView ile ayni kaynak)
export const TERRAIN_TEX = {
  bos: bosTex, odun: ormanTex, kil: kilTex,
  tas: tasTex, demir: demirTex, tahil: tahilTex,
};
import zirhImg from '../assets/buildings/zirh.jpg';
import anaBinaImg from '../assets/buildings/anaBina.jpg';
import tahilAmbarImg from '../assets/buildings/tahilAmbar.jpg';
import kislaImg from '../assets/buildings/kisla.jpg';
import ahirImg from '../assets/buildings/ahir.jpg';
import silahciImg from '../assets/buildings/silahci.jpg';
import demirciImg from '../assets/buildings/demirci.jpg';
import keresteciImg from '../assets/buildings/keresteci.jpg';
import tuglaciImg from '../assets/buildings/tuglaci.jpg';
import firinImg from '../assets/buildings/firin.jpg';
import degirmenImg from '../assets/buildings/degirmen.jpg';
import tasciImg from '../assets/buildings/tasci.jpg';
import atolyeImg from '../assets/buildings/atolye.jpg';
import cephaneImg from '../assets/buildings/cephane.jpg';
import saglikCadiriImg from '../assets/buildings/saglikCadiri.jpg';
import hammaddeDepoImg from '../assets/buildings/hammaddeDepo.jpg';
import islenmisMalDepoImg from '../assets/buildings/islenmisMalDepo.jpg';
import granaryImg from '../assets/buildings/granary.jpg';
import pazarImg from '../assets/buildings/pazar.jpg';
import evImg from '../assets/buildings/ev.jpg';
import surImg from '../assets/buildings/sur.jpg';
import hendekImg from '../assets/buildings/hendek.jpg';
import kuleImg from '../assets/buildings/kule.jpg';
import loncaTahilImg from '../assets/buildings/loncaTahil.jpg';
import loncaKilImg from '../assets/buildings/loncaKil.jpg';
import loncaTasImg from '../assets/buildings/loncaTas.jpg';
import loncaOdunImg from '../assets/buildings/loncaOdun.jpg';
import loncaDemirImg from '../assets/buildings/loncaDemir.jpg';
import koskImg from '../assets/buildings/kosk.jpg';
import sarayImg from '../assets/buildings/saray.jpg';
import tavernaImg from '../assets/buildings/taverna.jpg';

import anaBinaVideo from '../assets/buildings/videos/anaBina.mp4';
import loncaDemirVideo from '../assets/buildings/videos/loncaDemir.mp4';
import loncaTahilVideo from '../assets/buildings/videos/loncaTahil.mp4';
import loncaKilVideo from '../assets/buildings/videos/loncaKil.mp4';
import degirmenVideo from '../assets/buildings/videos/degirmen.mp4';
import firinVideo from '../assets/buildings/videos/firin.mp4';
import keresteciVideo from '../assets/buildings/videos/keresteci.mp4';
import tuglaciVideo from '../assets/buildings/videos/tuglaci.mp4';
import tasciVideo from '../assets/buildings/videos/tasci.mp4';
import demirciVideo from '../assets/buildings/videos/demirci.mp4';
import hammaddeDepoVideo from '../assets/buildings/videos/hammaddeDepo.mp4';
import tahilAmbarVideo from '../assets/buildings/videos/tahilAmbar.mp4';
import granaryVideo from '../assets/buildings/videos/granary.mp4';
import loncaOdunVideo from '../assets/buildings/videos/loncaOdun.mp4';
import loncaTasVideo from '../assets/buildings/videos/loncaTas.mp4';
import zirhVideo from '../assets/buildings/videos/zirh.mp4';
import silahciVideo from '../assets/buildings/videos/silahci.mp4';
import kislaVideo from '../assets/buildings/videos/kisla.mp4';
import atolyeVideo from '../assets/buildings/videos/atolye.mp4';
import ahirVideo from '../assets/buildings/videos/ahir.mp4';
import saglikCadiriVideo from '../assets/buildings/videos/saglikCadiri.mp4';
import cephaneVideo from '../assets/buildings/videos/cephane.mp4';
import hendekVideo from '../assets/buildings/videos/hendek.mp4';
import evVideo from '../assets/buildings/videos/ev.mp4';
import surVideo from '../assets/buildings/videos/sur.mp4';
import pazarVideo from '../assets/buildings/videos/pazar.mp4';
import kuleVideo from '../assets/buildings/videos/kule.mp4';
import islenmisMalDepoVideo from '../assets/buildings/videos/islenmisMalDepo.mp4';
import koskVideo from '../assets/buildings/videos/kosk.mp4';
import sarayVideo from '../assets/buildings/videos/saray.mp4';
import tavernaVideo from '../assets/buildings/videos/taverna.mp4';

// Panel arka planinda oynayan bina videolari (varsa jpg yerine bu kullanilir)
export const BUILDING_VIDEO = {
  ev: evVideo,
  sur: surVideo,
  kule: kuleVideo,
  islenmisMalDepo: islenmisMalDepoVideo,
  anaBina: anaBinaVideo,
  loncaDemir: loncaDemirVideo,
  loncaTahil: loncaTahilVideo,
  loncaKil: loncaKilVideo,
  degirmen: degirmenVideo,
  firin: firinVideo,
  keresteci: keresteciVideo,
  tuglaci: tuglaciVideo,
  tasci: tasciVideo,
  demirci: demirciVideo,
  hammaddeDepo: hammaddeDepoVideo,
  tahilAmbar: tahilAmbarVideo,
  granary: granaryVideo,
  loncaOdun: loncaOdunVideo,
  loncaTas: loncaTasVideo,
  zirh: zirhVideo,
  silahci: silahciVideo,
  kisla: kislaVideo,
  atolye: atolyeVideo,
  ahir: ahirVideo,
  saglikCadiri: saglikCadiriVideo,
  cephane: cephaneVideo,
  hendek: hendekVideo,
  pazar: pazarVideo,
  kosk: koskVideo,
  saray: sarayVideo,
  taverna: tavernaVideo,
};

export const EMBLEM_DY = 26;
export const EMBLEM_SIZE = 16;

export const TEXTURE_EMBLEM = {
  kisla:      { icon: 'kislaAmblem',  rot: 0, size: 19 },
  ahir:       { icon: 'atAmblem',     rot: 0 },
  tahilAmbar: { icon: 'tahilAmblem',  rot: 0 },
  silahci:    { icon: 'kilicAmblem',  rot: 0 },
  demirci:    { icon: 'demirciAmblem', rot: 0, size: 19 },
  keresteci:  { icon: 'keresteciAmblem', rot: 0, size: 18 },
  tuglaci:    { icon: 'tuglaciAmblem', rot: 0, size: 17 },
  tasci:      { icon: 'tasciAmblem', rot: 0, size: 17 },
  degirmen:   { icon: 'degirmenAmblem', rot: 0, size: 18 },
  firin:      { icon: 'firinAmblem', rot: 0, size: 18 },
  atolye: { icon: 'atolyeAmblem', rot: 0, size: 18 },
  cephane: { icon: 'silahciAmblem', rot: 0, size: 18 },
  saglikCadiri: { icon: 'saglikAmblem', rot: 0, size: 17 },
  hammaddeDepo: { icon: 'hammaddeAmblem', rot: 0, size: 17 },
  islenmisMalDepo: { icon: 'islenmisAmblem', rot: 0, size: 17 },
  granary: { icon: 'granaryAmblem', rot: 0, size: 18 },
  pazar: { icon: 'pazarAmblem', rot: 0, size: 17 },
  ev:         { icon: 'evAmblem', rot: 0, size: 17 },
  sur:        { icon: 'surAmblem', rot: 0, size: 17 },
  hendek:     { icon: 'hendekAmblem', rot: 0, size: 17 },
  kule:       { icon: 'kuleAmblem', rot: 0, size: 17 },
  loncaTahil: { icon: 'loncaTahilAmblem', rot: 0, size: 17 },
  loncaKil: { icon: 'loncaKilAmblem', rot: 0, size: 17 },
  loncaTas: { icon: 'loncaTasAmblem', rot: 0, size: 17 },
  loncaOdun: { icon: 'loncaOdunAmblem', rot: 0, size: 17 },
  loncaDemir: { icon: 'loncaDemirAmblem', rot: 0, size: 17 },
  zirh:       { icon: 'zirhAmblem', rot: 0, size: 18 },
  anaBina:    { icon: 'anaBinaAmblem', rot: 0, size: 19 },
  /*
    Köşk, saray ve taverna amblemsiz kalmıştı. Bu üçünün dolgu (silüet)
    amblemi yok; kendi çizgi ikonları kullanılıyor — rozette de hex'te de
    boş durmasınlar. Silüet çizilirse yalnız buradaki adlar değişir.
  */
  kosk:       { icon: 'kosk', rot: 0, size: 17 },
  saray:      { icon: 'saray', rot: 0, size: 17 },
  taverna:    { icon: 'taverna', rot: 0, size: 16 },
};

export const BUILDING_TEXTURE = {
  zirh: zirhImg,
  tahilAmbar: tahilAmbarImg,
  kisla: kislaImg,
  ahir: ahirImg,
  silahci: silahciImg,
  demirci: demirciImg,
  keresteci: keresteciImg,
  tuglaci: tuglaciImg,
  tasci: tasciImg,
  degirmen: degirmenImg,
  firin: firinImg,
  atolye: atolyeImg,
  cephane: cephaneImg,
  saglikCadiri: saglikCadiriImg,
  hammaddeDepo: hammaddeDepoImg,
  islenmisMalDepo: islenmisMalDepoImg,
  granary: granaryImg,
  pazar: pazarImg,
  ev: evImg,
  sur: surImg,
  hendek: hendekImg,
  kule: kuleImg,
  loncaTahil: loncaTahilImg,
  loncaKil: loncaKilImg,
  loncaTas: loncaTasImg,
  loncaOdun: loncaOdunImg,
  loncaDemir: loncaDemirImg,
  anaBina: anaBinaImg,
  kosk: koskImg,
  saray: sarayImg,
  taverna: tavernaImg,
};

// Merkez hex'i (0,0) icin gorsel - eski merkez2.png yerine
export const MERKEZ_IMG = anaBinaImg;
