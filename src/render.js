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
    ctx.fillRect(0, 380, game.canvas.width, 20);
}

function drawBase(game) {
    const ctx = game.ctx;
    ctx.fillStyle = 'green';
    ctx.fillRect(game.base.x, game.base.y, game.base.w, game.base.h);
}

function drawGrid(game) {
    const ctx = game.ctx;
    game.grid.forEach(cell => {
        if (cell.highlight) {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 3;
        } else {
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
        }
        ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
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
