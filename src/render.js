import { drawExplosions } from './effects.js';

export function draw(game) {
    const ctx = game.ctx;
    ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);

    if (game.assets?.bg) {
        ctx.drawImage(game.assets.bg, 0, 0, game.logicalW, game.logicalH);
    }

    drawBase(game);
    drawGrid(game);
    drawEntities(game);
}

function drawBase(game) {
    const ctx = game.ctx;
    ctx.fillStyle = 'green';
    ctx.fillRect(game.base.x, game.base.y, game.base.w, game.base.h);
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
    game.towers.forEach(t => t.draw(game.ctx, game.assets));
    game.enemies.forEach(e => e.draw(game.ctx, game.assets));
    game.ctx.fillStyle = 'black';
    game.projectiles.forEach(p => {
        game.ctx.beginPath();
        game.ctx.arc(p.x, p.y, game.projectileRadius, 0, Math.PI * 2);
        game.ctx.fill();
    });
    drawExplosions(game.ctx, game.explosions ?? []);
}