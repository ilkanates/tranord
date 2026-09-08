// Bina gorselleri ve hex amblem haritalari - VillageCenter'dan ayri tutuldu
import zirhImg from '../assets/buildings/zirh.jpg';
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

import evVideo from '../assets/buildings/videos/ev.mp4';
import surVideo from '../assets/buildings/videos/sur.mp4';
import kuleVideo from '../assets/buildings/videos/kule.mp4';
import islenmisMalDepoVideo from '../assets/buildings/videos/islenmisMalDepo.mp4';

// Panel arka planinda oynayan bina videolari (varsa jpg yerine bu kullanilir)
export const BUILDING_VIDEO = {
  ev: evVideo,
  sur: surVideo,
  kule: kuleVideo,
  islenmisMalDepo: islenmisMalDepoVideo,
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
};
