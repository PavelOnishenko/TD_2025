import { updateHUD } from '../systems/ui.js';
import { createExplosion } from '../systems/effects.js';
import gameConfig from '../config/gameConfig.js';
import { getWaveEnergyMultiplier } from '../utils/energyScaling.js';
import { createFlyingEnergyParticle } from '../systems/effects/flyingEnergy.js';
import { trackEnemyKill } from '../systems/balanceTracking.js';
import { clamp } from '../../engine/utils/MathUtils.js';

function getEnergyGainForKill(game, enemy) {
    const baseEnergy = gameConfig.player.energyPerKill;
    const waveMultiplier = getWaveEnergyMultiplier(game);
    const typeMultiplier = enemy?.spriteKey === 'tank'
        ? (Number.isFinite(gameConfig.player.tankKillEnergyMultiplier)
            ? gameConfig.player.tankKillEnergyMultiplier
            : 2)
        : 1;
    const gain = baseEnergy * waveMultiplier * typeMultiplier;
    return Math.max(0, Math.round(gain));
}

function playHitSound(audio, projectile) {
    if (!audio) {
        return;
    }
    if (typeof audio.playTowerHit === 'function') {
        const level = Number.isFinite(projectile?.towerLevel) ? projectile.towerLevel : 1;
        audio.playTowerHit(level);
        return;
    }
    if (typeof audio.playExplosion === 'function') {
        audio.playExplosion();
    }
}

function triggerScreenShake(game, intensity = 14, duration = 0.28, frequency = 48) {
    if (!game.screenShake) {
        game.screenShake = {
            duration: 0,
            elapsed: 0,
            intensity: 0,
            frequency,
            seedX: Math.random() * Math.PI * 2,
            seedY: Math.random() * Math.PI * 2,
        };
    }
    const shake = game.screenShake;
    shake.duration = Math.max(shake.duration ?? 0, duration);
    shake.elapsed = 0;
    const current = shake.intensity ?? 0;
    shake.intensity = clamp(current * 0.45 + intensity, 0, 42);
    shake.frequency = frequency;
    shake.seedX = Math.random() * Math.PI * 2;
    shake.seedY = Math.random() * Math.PI * 2;
}

function getRocketImpactRadius(projectile) {
    const config = gameConfig.projectiles?.rockets?.explosionRadius ?? {};
    if (!Number.isFinite(config.min)) {
        throw new Error('Missing rocket explosion radius config (min)');
    }
    if (!Number.isFinite(projectile?.explosionRadius)) {
        throw new Error('Projectile missing explosion radius');
    }
    return Math.max(config.min, projectile.explosionRadius);
}

function getImpactPosition(projectile, enemy, options = {}) {
    if (Number.isFinite(options.impactX) && Number.isFinite(options.impactY)) {
        return { x: options.impactX, y: options.impactY };
    }
    const hasProjectileCoords = Number.isFinite(projectile.x) && Number.isFinite(projectile.y);
    if (hasProjectileCoords) {
        return { x: projectile.x, y: projectile.y };
    }
    const centerX = enemy.x + enemy.w / 2;
    const centerY = enemy.y + enemy.h / 2;
    return { x: centerX, y: centerY };
}

export function moveProjectiles(game, dt) {
    game.projectiles.forEach(p => {
        if (p.type === 'railgun-beam') {
            p.elapsed = (p.elapsed ?? 0) + dt;
            if (p.anim && typeof p.anim === 'object') {
                p.anim.time = (p.anim.time ?? 0) + dt;
            }
            return;
        }

        if (p.type === 'rocket') {
            if (!Array.isArray(p.trail)) {
                p.trail = [];
            }
            p.trail.unshift({ x: p.x, y: p.y, life: 0 });
            if (p.trail.length > 14) {
                p.trail.pop();
            }
            for (const segment of p.trail) {
                segment.life = (segment.life ?? 0) + dt;
            }
            p.rotation = Math.atan2(p.vy, p.vx);
            p.life = (p.life ?? 0) + dt;
        } else if (p.towerLevel === 3) {
            p.life = (p.life ?? 0) + dt;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.anim && typeof p.anim === 'object') {
            p.anim.time = (p.anim.time ?? 0) + dt;
        }
    });
}

export function applyProjectileDamage(game, projectile, enemyIndex, options = {}) {
    const enemy = game.enemies[enemyIndex];
    if (!enemy) {
        return { enemyRemoved: false, isColorMatch: false, damage: 0 };
    }

    const { spawnImpactEffect = true, spawnKillEffect = true, hitVariant = null, killVariant = null, impactX = null, impactY = null } = options;
    const damage = calculateDamage(projectile, enemy);
    enemy.hp -= damage;
    const isColorMatch = projectile.color === enemy.color;
    playHitSound(game.audio, projectile);

    const diagnosticsState = game?.diagnosticsState;
    if (diagnosticsState?.collectTowerDps && projectile?.sourceTowerId) {
        const eventsByTower = diagnosticsState.towerDamageEvents;
        if (eventsByTower) {
            const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
                ? performance.now()
                : Date.now();
            const windowMs = 10000;
            const cutoff = now - windowMs;
            const events = Array.isArray(eventsByTower.get(projectile.sourceTowerId))
                ? eventsByTower.get(projectile.sourceTowerId)
                : [];
            const prunedEvents = events.filter((event) => event.time >= cutoff);
            prunedEvents.push({ time: now, damage });
            eventsByTower.set(projectile.sourceTowerId, prunedEvents);
        }
    }

    if (spawnImpactEffect && game.explosions) {
        const impactPos = getImpactPosition(projectile, enemy, { impactX, impactY });
        const variant = hitVariant ?? (isColorMatch ? 'match' : 'mismatch');
        game.explosions.push(createExplosion(impactPos.x, impactPos.y, {
            color: projectile.color,
            variant,
        }));
    }

    let enemyRemoved = false;
    if (enemy.hp <= 0) {
        enemyRemoved = true;
        game.enemies.splice(enemyIndex, 1);
        const energyGain = getEnergyGainForKill(game, enemy);
        game.energy += energyGain;

        // Track kills by type and energy gained
        if (enemy?.spriteKey === 'tank') {
            game.tankKills = (game.tankKills || 0) + 1;
        } else {
            game.swarmKills = (game.swarmKills || 0) + 1;
        }
        game.energyGained = (game.energyGained || 0) + energyGain;
        trackEnemyKill(game, enemy, energyGain);

        const width = Number.isFinite(enemy.w) ? enemy.w : 0;
        const height = Number.isFinite(enemy.h) ? enemy.h : 0;
        const centerX = Number.isFinite(enemy.x) ? enemy.x + width / 2 : projectile.x;
        const centerY = Number.isFinite(enemy.y) ? enemy.y + height / 2 : projectile.y;

        if (Array.isArray(game.flyingEnergy)) {
            const particle = createFlyingEnergyParticle(centerX, centerY, energyGain, game);
            game.flyingEnergy.push(particle);
        }
        if (game.tutorial) {
            try {
                if (typeof game.tutorial.handleEnergyGained === 'function') {
                    game.tutorial.handleEnergyGained(energyGain);
                }
                if (typeof game.tutorial.handleEnemyKilled === 'function') {
                    game.tutorial.handleEnemyKilled({ match: isColorMatch });
                }
            } catch (error) {
                console.warn('Tutorial kill handler failed', error);
            }
        }
        if (typeof game.addScore === 'function') {
            const scoreValue = Number.isFinite(game.scorePerKill)
                ? game.scorePerKill
                : gameConfig.scoring.perKill;
            game.addScore(scoreValue);
        }
        if (spawnKillEffect && game.explosions) {
            const width = Number.isFinite(enemy.w) ? enemy.w : 0;
            const height = Number.isFinite(enemy.h) ? enemy.h : 0;
            const centerX = Number.isFinite(enemy.x) ? enemy.x + width / 2 : projectile.x;
            const centerY = Number.isFinite(enemy.y) ? enemy.y + height / 2 : projectile.y;
            let variant = killVariant ?? 'kill';
            if (!killVariant && enemy?.spriteKey === 'tank') {
                variant = 'tank-kill';
            }
            game.explosions.push(createExplosion(centerX, centerY, {
                color: enemy.color ?? projectile.color ?? 'default',
                variant,
            }));
        }
        updateHUD(game);
    }

    return { enemyRemoved, isColorMatch, damage };
}

function handleRocketImpact(game, projectile, index) {
    const radius = getRocketImpactRadius(projectile);
    const centerX = projectile.x;
    const centerY = projectile.y;
    const impacted = [];

    for (let i = game.enemies.length - 1; i >= 0; i--) {
        const enemy = game.enemies[i];
        const enemyCenterX = enemy.x + enemy.w / 2;
        const enemyCenterY = enemy.y + enemy.h / 2;
        const distance = Math.hypot(enemyCenterX - centerX, enemyCenterY - centerY);
        if (distance <= radius + Math.max(enemy.w, enemy.h) * 0.35) {
            impacted.push(i);
        }
    }

    impacted.sort((a, b) => a - b);

    for (let idx = impacted.length - 1; idx >= 0; idx--) {
        const enemyIndex = impacted[idx];
        if (enemyIndex < 0 || enemyIndex >= game.enemies.length) {
            continue;
        }
        applyProjectileDamage(game, projectile, enemyIndex, {
            spawnImpactEffect: true,
            hitVariant: 'rocket-hit',
            killVariant: 'rocket-kill',
        });
    }

    if (impacted.length >= 2 && typeof game.addEnergyPopup === 'function') {
        const text = `×${impacted.length}`;
        game.addEnergyPopup(text, centerX, centerY, {
            color: projectile.color === 'blue' ? '#60a5fa' : '#f87171',
            stroke: 'rgba(0,0,0,0.7)',
            font: '700 32px "Baloo 2", sans-serif',
            duration: 1.2,
            driftY: -80,
        });
    }

    const enableShockwave = gameConfig?.projectiles?.rocket?.shockwaveEnabled !== false;
    if (game.explosions) {
        const explosionOptions = {
            color: projectile.color,
            variant: 'rocket',
            ringRadius: enableShockwave ? radius : undefined,
        };

        game.explosions.push(createExplosion(centerX, centerY, explosionOptions));
    }

    const shakeConfig = gameConfig.world?.screenShake?.rocket ?? { intensity: 3.5, duration: 0.5, frequency: 46 };
    triggerScreenShake(game, shakeConfig.intensity, shakeConfig.duration, shakeConfig.frequency);

    if (projectile.trail) {
        projectile.trail.length = 0;
    }

    game.projectiles.splice(index, 1);
}

export function hitEnemy(game, projectile, index) {
    if (projectile.type === 'railgun-beam') {
        return false;
    }

    const minLifetimeForLevel3 = gameConfig.projectiles?.minLifetimeLevel3 ?? 0.03;
    const isLevel3 = projectile.towerLevel === 3;
    const projectileLife = projectile.life ?? 0;

    if (isLevel3 && projectileLife < minLifetimeForLevel3) {
        return false;
    }

    const enemyIndex = findCollidingEnemy(projectile, game.enemies);
    if (enemyIndex === -1) {
        return false;
    }

    if (projectile.type === 'rocket') {
        handleRocketImpact(game, projectile, index);
        return true;
    }

    applyProjectileDamage(game, projectile, enemyIndex);
    game.projectiles.splice(index, 1);
    return true;
}

export function handleProjectileHits(game) {
    for (let i = game.projectiles.length - 1; i >= 0; i--) {
        const p = game.projectiles[i];
        if (p.type === 'railgun-beam') {
            const duration = p.duration ?? 0.25;
            if ((p.elapsed ?? 0) >= duration) {
                game.projectiles.splice(i, 1);
            }
            continue;
        }

        if (hitEnemy(game, p, i)) {
            continue;
        }

        if (isProjectileOffscreen(game, p)) {
            game.projectiles.splice(i, 1);
        }
    }
}

function findCollidingEnemy(projectile, enemies) {
    const radius = Number.isFinite(projectile.hitRadius)
        ? projectile.hitRadius
        : Number.isFinite(projectile.radius)
            ? projectile.radius
            : 0;

    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (intersectsProjectile(enemy, projectile, radius)) {
            return i;
        }
    }
    return -1;
}

function intersectsProjectile(enemy, projectile, radius) {
    const px = projectile.x;
    const py = projectile.y;
    if (!Number.isFinite(px) || !Number.isFinite(py)) {
        return false;
    }
    if (radius <= 0) {
        return (
            px >= enemy.x &&
            px <= enemy.x + enemy.w &&
            py >= enemy.y &&
            py <= enemy.y + enemy.h
        );
    }

    const closestX = clamp(px, enemy.x, enemy.x + enemy.w);
    const closestY = clamp(py, enemy.y, enemy.y + enemy.h);
    const dx = px - closestX;
    const dy = py - closestY;
    return dx * dx + dy * dy <= radius * radius;
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
