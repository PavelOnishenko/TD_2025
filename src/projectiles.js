import { updateHUD } from './ui.js';

export function moveProjectiles(game, dt) {
    for (const p of game.projectiles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
    }
}

export function hitEnemy(game, p, index) {
    for (let j = game.enemies.length - 1; j >= 0; j--) {
        const e = game.enemies[j];
        if (p.x >= e.x && p.x <= e.x + e.w && p.y >= e.y && p.y <= e.y + e.h) {
            const multiplier = p.color === e.color ? 1 : 0.4;
            const damage = (p.damage ?? 1) * multiplier;
            e.hp -= damage;
            game.projectiles.splice(index, 1);
            if (e.hp <= 0) {
                game.enemies.splice(j, 1);
                game.gold += 1;
                updateHUD(game);
            }
            return true;
        }
    }
    return false;
}

export function handleProjectileHits(game) {
    for (let i = game.projectiles.length - 1; i >= 0; i--) {
        const p = game.projectiles[i];
        if (hitEnemy(game, p, i)) continue;
        if (isProjectileOffscreen(game, p)) game.projectiles.splice(i, 1);
    }
}

function isProjectileOffscreen(game, p) {
    return p.x < 0 || p.x > game.canvas.width || p.y < 0 || p.y > game.canvas.height;
}
