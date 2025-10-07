import { drawExplosions } from '../systems/effects.js';

export function draw(game) {
    const ctx = game.ctx;
    const { scale = 1, offsetX = 0, offsetY = 0 } = game.viewport ?? {};

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
    ctx.restore();

    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    drawBase(game);
    drawPlatforms(game);
    drawGrid(game);
    drawEntities(game);

    ctx.restore();
}

function drawBase(game) {
    const ctx = game.ctx;
    ctx.fillStyle = 'green';
    ctx.fillRect(game.base.x, game.base.y, game.base.w, game.base.h);
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

function drawGrid(game) {
    const ctx = game.ctx;
    const grid = game.getAllCells();
    grid.forEach(cell => {
        if (!cell.occupied) {
            ctx.drawImage(game.assets.cell, cell.x, cell.y, cell.w, cell.h);
        }

        if (cell.highlight > 0) {
            const alpha = Math.min(1, cell.highlight * 3);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'red';
            ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
            ctx.restore();
        }
    });
}

export function drawEntities(game) {
    const ctx = game.ctx;
    const assets = game.assets;

    const layeredEntities = [];

    for (const tower of game.towers) {
        layeredEntities.push({
            sortKey: computeSortKey(tower),
            draw: () => tower.draw(ctx, assets),
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

    ctx.fillStyle = 'black';
    game.projectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, game.projectileRadius, 0, Math.PI * 2);
        ctx.fill();
    });

    drawExplosions(ctx, game.explosions ?? []);
}

function computeSortKey(entity) {
    const y = typeof entity.y === 'number' ? entity.y : 0;
    const height = typeof entity.h === 'number' ? entity.h : 0;
    return y + height;
}
