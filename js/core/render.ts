import { drawExplosions, drawColorSwitchBursts } from '../systems/effects.js';
import { drawStarfield } from './starfield.js';
import { drawPortal } from './portal.js';
import { drawFlyingEnergy } from '../systems/effects/flyingEnergy.js';
import { drawProjectile } from './renderProjectiles.js';
import { drawGrid } from './renderGrid.js';
import { drawEnergyPopups, drawMergeAnimations } from './renderOverlays.js';
import { drawBase } from './renderBase.js';

function getScreenShakeOffset(game) {
    const shake = game?.screenShake;
    if (!shake || shake.duration <= 0 || shake.intensity <= 0) {
        return { x: 0, y: 0 };
    }

    const time = shake.elapsed ?? 0;
    const progress = Math.min(1, shake.duration > 0 ? time / shake.duration : 1);
    const falloff = Math.pow(1 - progress, 2);
    const baseIntensity = shake.intensity * falloff;
    if (baseIntensity <= 0.01) {
        return { x: 0, y: 0 };
    }

    const frequency = shake.frequency ?? 42;
    const phaseX = (time * frequency) + (shake.seedX ?? 0);
    const phaseY = (time * (frequency * 0.82)) + (shake.seedY ?? 0);
    const offsetX = Math.sin(phaseX) * baseIntensity;
    const offsetY = Math.cos(phaseY) * baseIntensity;
    return { x: offsetX, y: offsetY };
}

export function draw(game) {
    const ctx = game.ctx;
    const { scale = 1, offsetX = 0, offsetY = 0 } = game.viewport ?? {};
    const shakeOffset = getScreenShakeOffset(game);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
    ctx.restore();

    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, offsetX + shakeOffset.x, offsetY + shakeOffset.y);

    drawStarfield(game);
    drawPortal(ctx, game.portal);
    drawBase(game);
    drawPlatforms(game);
    drawGrid(game);
    drawEntities(game);

    ctx.restore();
}

function drawPlatforms(game) {
    const { platforms = [], assets } = game;
    const platformImage = assets?.platform;

    if (!platformImage || platforms.length === 0) {
        return;
    }

    platforms.forEach(platform => {
        platform.draw(game.ctx, platformImage);
    });
}

export function drawEntities(game) {
    const ctx = game.ctx;
    const assets = game.assets;

    drawColorSwitchBursts(ctx, game.colorSwitchBursts ?? []);

    const layeredEntities = [];

    for (const tower of game.towers) {
        layeredEntities.push({
            sortKey: computeSortKey(tower),
            draw: () => tower.draw(ctx, assets, game),
        });
    }

    for (const enemy of game.enemies) {
        layeredEntities.push({
            sortKey: computeSortKey(enemy),
            draw: () => enemy.draw(ctx, assets),
        });
    }

    layeredEntities
        .sort((a, b) => a.sortKey - b.sortKey)
        .forEach(layer => layer.draw());

    drawMergeAnimations(ctx, game.mergeAnimations ?? [], assets);

    const defaultRadius = game.projectileRadius ?? 6;
    game.projectiles.forEach(p => {
        drawProjectile(ctx, p, defaultRadius);
    });

    drawExplosions(ctx, game.explosions ?? []);
    drawEnergyPopups(ctx, game.energyPopups ?? []);
    drawFlyingEnergy(ctx, game.flyingEnergy ?? [], game);
}

function computeSortKey(entity) {
    const y = typeof entity.y === 'number' ? entity.y : 0;
    const height = typeof entity.h === 'number' ? entity.h : 0;
    return y + height;
}
