import { updateHUD } from '../systems/ui.js';
import { createExplosion } from '../systems/effects.js';
import gameConfig from '../config/gameConfig.js';

export function moveProjectiles(game, dt) {
    game.projectiles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.anim && typeof p.anim === 'object') {
            p.anim.time = (p.anim.time ?? 0) + dt;
        }
    });
}

export function hitEnemy(game, projectile, index) {
    const enemyIndex = findCollidingEnemy(projectile, game.enemies);
    if (enemyIndex === -1) return false;
    const enemy = game.enemies[enemyIndex];
    const isColorMatch = projectile.color === enemy.color;
    enemy.hp -= calculateDamage(projectile, enemy);
    game.projectiles.splice(index, 1);
    const audio = game.audio;
    if (isColorMatch) {
        if (typeof audio?.playMatchingHit === 'function') {
            audio.playMatchingHit();
        } else {
            (audio?.playExplosion)?.();
        }
    } else if (typeof audio?.playMismatchingHit === 'function') {
        audio.playMismatchingHit();
    } else {
        (audio?.playExplosion)?.();
    }
    if (game.explosions) {
        game.explosions.push(
            createExplosion(projectile.x, projectile.y, {
                color: projectile.color,
                variant: isColorMatch ? 'match' : 'mismatch'
            })
        );
    }

    if (enemy.hp <= 0) {
        game.enemies.splice(enemyIndex, 1);
        game.energy += gameConfig.player.energyPerKill;
        if (typeof game.addScore === 'function') {
            const scoreValue = Number.isFinite(game.scorePerKill)
                ? game.scorePerKill
                : gameConfig.scoring.perKill;
            game.addScore(scoreValue);
        }
        if (game.explosions) {
            const width = Number.isFinite(enemy.w) ? enemy.w : 0;
            const height = Number.isFinite(enemy.h) ? enemy.h : 0;
            const centerX = Number.isFinite(enemy.x) ? enemy.x + width / 2 : projectile.x;
            const centerY = Number.isFinite(enemy.y) ? enemy.y + height / 2 : projectile.y;
            game.explosions.push(
                createExplosion(centerX, centerY, {
                    color: enemy.color ?? projectile.color ?? 'default',
                    variant: 'kill',
                })
            );
        }
        updateHUD(game);
    }

    return true;
}

export function handleProjectileHits(game) {
    for (let i = game.projectiles.length - 1; i >= 0; i--) {
        const p = game.projectiles[i];
        if (hitEnemy(game, p, i)) continue;
        if (isProjectileOffscreen(game, p)) game.projectiles.splice(i, 1);
    }
}

function findCollidingEnemy(projectile, enemies) {
    return enemies.findIndex(e => projectile.x >= e.x && projectile.x <= e.x + e.w && projectile.y >= e.y && projectile.y <= e.y + e.h );
}

function calculateDamage(projectile, enemy) {
    const base = projectile.damage ?? 1;
    const mismatchMultiplier = gameConfig.projectiles.colorMismatchMultiplier;
    const multiplier = projectile.color === enemy.color ? 1 : mismatchMultiplier;
    return base * multiplier;
}

function isProjectileOffscreen(game, p) {
    const bounds = game?.worldBounds;
    if (bounds) {
        return (
            p.x < bounds.minX ||
            p.x > bounds.maxX ||
            p.y < bounds.minY ||
            p.y > bounds.maxY
        );
    }
    return p.x < 0 || p.x > game.canvas.width || p.y < 0 || p.y > game.canvas.height;
}
