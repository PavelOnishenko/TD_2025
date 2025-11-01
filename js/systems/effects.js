
export { createExplosion, updateExplosions, drawExplosions } from './effects/explosions.js';
export { drawTowerMuzzleFlashIfNeeded, drawTowerPlacementFlash, drawTowerTopGlowIfNeeded } from './effects/tower.js';
export { drawColorSwitchBursts, createColorSwitchBurstFromTower, updateColorSwitchBursts } from './effects/colorSwitch.js';
export {
    createSpawnPortalEffect,
    energizeSpawnPortal,
    updateSpawnPortals,
    drawSpawnPortals,
} from './effects/portal.js';

import { drawEnemyEngineGlow as baseDrawEnemyEngineGlow } from './effects/enemy.js';
export let drawEnemyEngineGlow = baseDrawEnemyEngineGlow;
export function resetDrawEnemyEngineGlow() {
    drawEnemyEngineGlow = baseDrawEnemyEngineGlow;
}