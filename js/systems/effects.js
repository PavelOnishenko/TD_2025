import { createExplosion, updateExplosions, drawExplosions } from './effects/explosions.js';
import { drawTowerMuzzleFlashIfNeeded, drawTowerPlacementFlash, drawTowerTopGlowIfNeeded } from './effects/tower.js';
import { drawEnemyEngineGlow as baseDrawEnemyEngineGlow } from './effects/enemy.js';

export { createExplosion, updateExplosions, drawExplosions };
export { drawTowerMuzzleFlashIfNeeded, drawTowerPlacementFlash, drawTowerTopGlowIfNeeded };

export let drawEnemyEngineGlow = baseDrawEnemyEngineGlow;

export function resetDrawEnemyEngineGlow() {
    drawEnemyEngineGlow = baseDrawEnemyEngineGlow;
}
