/**
 * Merkezi data export noktası
 * Tüm dosyalar buradan içe aktarılır:
 *   const { PRODUCTION_DEFS, VILLAGE_DEFS, MILITARY_DEFS } = require('./data');
 */

const PRODUCTION_DEFS                              = require('./productionDefs');
const { VILLAGE_DEFS, SUR_BONUS, HENDEK_BONUS, KULE_BONUS, DEF_BONUS_CAP,
        BASE_POPULATION, maxPopulationOf, DEFAULT_MAX_LEVEL, maxLevelOf } = require('./villageDefs');
const { EQUIPMENT_DEFS, EQUIPMENT_BY_BUILDING, UNIT_DEFS, BASE_STATS, EQUIPMENT_RULES } = require('./militaryDefs');

module.exports = {
  PRODUCTION_DEFS,
  VILLAGE_DEFS,
  SUR_BONUS,
  HENDEK_BONUS,
  KULE_BONUS,
  DEF_BONUS_CAP,
  BASE_POPULATION,
  maxPopulationOf,
  DEFAULT_MAX_LEVEL,
  maxLevelOf,
  EQUIPMENT_DEFS,
  EQUIPMENT_BY_BUILDING,
  UNIT_DEFS,
  BASE_STATS,
  EQUIPMENT_RULES
};
