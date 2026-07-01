import { drawExplosions, drawColorSwitchBursts } from '../systems/effects.js';
import { drawStarfield } from './starfield.js';
import { drawPortal } from './portal.js';
import { drawFlyingEnergy } from '../systems/effects/flyingEnergy.js';
import { drawProjectile } from './renderProjectiles.js';
import { drawGrid } from './renderGrid.js';
import { drawEnergyPopups, drawMergeAnimations } from './renderOverlays.js';
import { drawBase } from './renderBase.js';
import { drawSpaceAsteroids } from './asteroids.js';

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
    drawSpaceAsteroids(game);
    drawPortal(ctx, game.portal);
    drawBase(game);
    drawPlatforms(game);
    drawGrid(game);
    drawEntities(game);
    drawLayoutEditorOverlay(game);

    ctx.restore();
}

function getLayoutSpawnPoint(game) {
    if (Number.isFinite(game?.layoutSpawnPoint?.x) && Number.isFinite(game?.layoutSpawnPoint?.y)) {
        return game.layoutSpawnPoint;
    }
    if (typeof game?.getDefaultEnemyCoords === 'function') {
        return game.getDefaultEnemyCoords();
    }
    return null;
}

function drawLayoutEditorOverlay(game) {
    if (!game?.layoutEditorState?.open) {
        return;
    }
    const spawn = getLayoutSpawnPoint(game);
    const ctx = game.ctx;
    if (!spawn || !ctx) {
        return;
    }
    const markerScale = Math.max(0.4, Math.max(game.layoutSpawnMarkerScaleX ?? 1, game.layoutSpawnMarkerScaleY ?? 1));
    const radius = 22 * markerScale;
    const arrowLength = 130;
    const arrowDx = arrowLength * 0.9;
    const arrowDy = arrowLength * 0.45;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(120, 255, 255, 0.95)';
    ctx.strokeStyle = 'rgba(235, 255, 255, 0.95)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(spawn.x, spawn.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(spawn.x, spawn.y);
    ctx.lineTo(spawn.x + arrowDx, spawn.y + arrowDy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(spawn.x + arrowDx, spawn.y + arrowDy);
    ctx.lineTo(spawn.x + arrowDx - 22, spawn.y + arrowDy - 4);
    ctx.moveTo(spawn.x + arrowDx, spawn.y + arrowDy);
    ctx.lineTo(spawn.x + arrowDx - 10, spawn.y + arrowDy - 20);
    ctx.stroke();
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
