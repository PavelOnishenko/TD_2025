export function draw(game) {
    const ctx = game.ctx;
    ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
    drawGround(game);
    drawBase(game);
    drawGrid(game);
    drawEntities(game);
}

function drawGround(game) {
    const ctx = game.ctx;
    ctx.fillStyle = '#888';
    const pathHeight = 20;
    const y = game.pathY + (30 - pathHeight) / 2;
    ctx.fillRect(0, y, game.canvas.width, pathHeight);
}

function drawBase(game) {
    const ctx = game.ctx;
    ctx.fillStyle = 'green';
    ctx.fillRect(game.base.x, game.base.y, game.base.w, game.base.h);
}

function drawGrid(game) {
    const ctx = game.ctx;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    game.grid.forEach(cell => {
        if (!cell.occupied) {
            const cx = cell.x + cell.w / 2;
            const cy = cell.y + cell.h / 2;
            ctx.beginPath();
            ctx.arc(cx, cy, cell.w / 2, 0, Math.PI * 2);
            ctx.stroke();
        }
    });
}

export function drawEntities(game) {
    game.towers.forEach(t => t.draw(game.ctx));
    game.enemies.forEach(e => e.draw(game.ctx));
    game.ctx.fillStyle = 'black';
    game.projectiles.forEach(p => {
        game.ctx.beginPath();
        game.ctx.arc(p.x, p.y, game.projectileRadius, 0, Math.PI * 2);
        game.ctx.fill();
    });
}
