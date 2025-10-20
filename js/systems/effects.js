export { createExplosion, updateExplosions, drawExplosions } from './effects/explosions.js';
export { drawTowerMuzzleFlashIfNeeded, drawTowerPlacementFlash, drawTowerTopGlowIfNeeded } from './effects/tower.js';
import { drawEnemyEngineGlow as drawEnemyEngineGlowImpl } from './effects/enemy.js';

export function drawEnemyEngineGlow(ctx, enemy) {
    return drawEnemyEngineGlowImpl(ctx, enemy);
}
