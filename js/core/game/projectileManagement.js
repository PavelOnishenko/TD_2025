import { updateHUD } from '../../systems/ui.js';
import { createColorSwitchBurstFromTower } from '../../systems/effects.js';
import { createProjectileVisualState } from './projectileVisualState.js';
import { applyProjectileDamage } from '../projectiles.js';
import gameConfig from '../../config/gameConfig.js';

function normalizeLevel(level) {
    const parsed = Number(level);
    if (!Number.isFinite(parsed)) {
        return 1;
    }
    return Math.max(1, Math.min(parsed, 3));
}

function resolveWeaponType(level) {
    if (level >= 6) {
        return 'rocket';
    }
    if (level === 5) {
        return 'railgun';
    }
    if (level === 4) {
        return 'minigun';
    }
    return 'standard';
}

function playTowerFireSound(audio, towerLevel) {
    if (!audio) {
        return;
    }
    if (typeof audio.playTowerFire === 'function') {
        const level = Number.isFinite(towerLevel) ? towerLevel : 1;
        audio.playTowerFire(level);
        return;
    }
    if (typeof audio.playExplosion === 'function') {
        audio.playExplosion();
    }
}

function createProjectile(game, angle, tower, radius, overrides = {}) {
    const {
        speed = game.projectileSpeed,
        damage = tower.damage,
        animOptions = null,
        type = 'standard',
        weaponType = type,
        hitRadius = null,
        extras = {},
    } = overrides;
    const center = tower.center();
    const projectile = {
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: tower.color,
        damage,
        sourceTowerId: tower?.id ?? null,
        anim: createProjectileVisualState(animOptions ?? undefined),
        radius,
        type,
        weaponType,
        hitRadius,
        towerLevel: Number.isFinite(tower?.level) ? tower.level : 1,
        ...extras,
    };
    game.projectiles.push(projectile);
    return projectile;
}

function updateMaxProjectileRadius(game, radius) {
    if (radius <= game.maxProjectileRadius) {
        return;
    }
    game.maxProjectileRadius = radius;
    game.worldBounds = game.computeWorldBounds();
}

function spawnMinigunBurst(game, angle, tower) {
    const burstCount = 5;
    const radius = Math.max(10, Math.round(game.projectileRadius * 0.55));
    const speed = game.projectileSpeed * 1.55;
    const damagePerBullet = tower.damage / burstCount;
    const jitter = 0.32;

    for (let i = 0; i < burstCount; i++) {
        const spread = (Math.random() - 0.5) * jitter;
        createProjectile(game, angle + spread, tower, radius, {
            speed,
            damage: damagePerBullet,
            type: 'minigun',
            weaponType: 'minigun',
            hitRadius: radius * 0.75,
            animOptions: {
                pulseSpeed: 16 + Math.random() * 6,
                shimmerSpeed: 14 + Math.random() * 4,
                vibrationStrength: 0.65 + Math.random() * 0.1,
            },
            extras: {
                trailLength: 38 + Math.random() * 12,
            },
        });
        updateMaxProjectileRadius(game, radius);
    }
    playTowerFireSound(game.audio, tower?.level);
    tower.triggerFlash();
}

function ensureScreenShake(game) {
    if (!game.screenShake) {
        game.screenShake = {
            duration: 0,
            elapsed: 0,
            intensity: 0.1,
            frequency: (gameConfig.world?.screenShake?.frequency) ?? 42,
            seedX: Math.random() * Math.PI * 2,
            seedY: Math.random() * Math.PI * 2,
        };
    }
    return game.screenShake;
}

function resolveRocketExplosionRadius(tower) {
    const config = gameConfig.projectiles?.rockets?.explosionRadius ?? {};
    if (!Number.isFinite(config.min) || !Number.isFinite(config.rangeMultiplier)) {
        throw new Error('Missing rocket explosion radius config (min, rangeMultiplier)');
    }
    if (!Number.isFinite(tower?.range)) {
        throw new Error('Cannot resolve rocket explosion radius without tower range');
    }
    const rangeBasedRadius = tower.range * config.rangeMultiplier;
    const radius = Math.max(config.min, rangeBasedRadius);
    if (!Number.isFinite(radius)) {
        throw new Error('Resolved rocket explosion radius is not finite');
    }
    return radius;
}

function applyRailgunDamage(game, beam) {
    const direction = { x: Math.cos(beam.angle), y: Math.sin(beam.angle) };
    const maxDistance = beam.length;
    const thresholdBase = 0.75;
    const hits = [];

    for (const enemy of game.enemies) {
        const centerX = enemy.x + enemy.w / 2;
        const centerY = enemy.y + enemy.h / 2;
        const toEnemyX = centerX - beam.x;
        const toEnemyY = centerY - beam.y;
        const along = toEnemyX * direction.x + toEnemyY * direction.y;
        if (along < 0 || along > maxDistance) {
            continue;
        }
        const distanceSq = toEnemyX * toEnemyX + toEnemyY * toEnemyY;
        const perpendicularSq = Math.max(0, distanceSq - along * along);
        const halfDiagonal = Math.sqrt((enemy.w ** 2) + (enemy.h ** 2)) / 2;
        const threshold = halfDiagonal * thresholdBase;
        if (perpendicularSq > threshold * threshold) {
            continue;
        }
        hits.push({ enemy, distance: along, impactX: centerX, impactY: centerY });
    }

    hits.sort((a, b) => a.distance - b.distance);

    const recordedHits = [];
    for (const hit of hits) {
        const index = game.enemies.indexOf(hit.enemy);
        if (index === -1) {
            continue;
        }
        applyProjectileDamage(game, beam, index, {
            hitVariant: 'railgun-hit',
            killVariant: 'railgun-kill',
            impactX: hit.impactX,
            impactY: hit.impactY,
        });
        recordedHits.push({ x: hit.impactX, y: hit.impactY, distance: hit.distance });
    }

    if (recordedHits.length) {
        beam.hitPositions = recordedHits;
        const furthest = recordedHits[recordedHits.length - 1];
        beam.length = Math.max(beam.length * 0.55, furthest.distance + 40);
    }

    const shake = ensureScreenShake(game);
    const impactIntensity = 16;
    shake.duration = Math.max(shake.duration, 0.32);
    shake.elapsed = 0;
    shake.intensity = Math.min(impactIntensity * 1.4, (shake.intensity ?? 0) * 0.4 + impactIntensity);
    shake.frequency = 52;
    shake.seedX = Math.random() * Math.PI * 2;
    shake.seedY = Math.random() * Math.PI * 2;
}

function spawnRailgunBeam(game, angle, tower) {
    const center = tower.center();
    const beam = {
        type: 'railgun-beam',
        weaponType: 'railgun',
        x: center.x,
        y: center.y,
        angle,
        color: tower.color,
        damage: tower.damage,
        length: tower.range * 1.4,
        duration: 0.28,
        elapsed: 0,
        width: Math.max(12, game.projectileRadius * 0.75),
        anim: { time: 0 },
        towerLevel: Number.isFinite(tower?.level) ? tower.level : 1,
        sourceTowerId: tower?.id ?? null,
    };

    game.projectiles.push(beam);
    applyRailgunDamage(game, beam);
    playTowerFireSound(game.audio, tower?.level);
    tower.triggerFlash();
}

function spawnRocket(game, angle, tower) {
    const baseRadius = game.getProjectileRadiusForLevel(tower?.level);
    const radius = baseRadius + 6;
    const explosionRadius = resolveRocketExplosionRadius(tower);
    const rocket = createProjectile(game, angle, tower, radius, {
        speed: game.projectileSpeed * 0.75,
        type: 'rocket',
        weaponType: 'rocket',
        hitRadius: radius * 0.8,
        animOptions: {
            pulseSpeed: 4,
            shimmerSpeed: 3,
            vibrationStrength: 0.06,
        },
        extras: {
            explosionRadius,
            trail: [],
            rotation: angle,
            life: 0,
        },
    });
    updateMaxProjectileRadius(game, radius);
    playTowerFireSound(game.audio, tower?.level);
    tower.triggerFlash();
    return rocket;
}

const projectileManagement = {
    getProjectileRadiusForLevel(level) {
        const base = Number.isFinite(this.projectileRadius)
            ? this.projectileRadius
            : gameConfig.projectiles.baseRadius;
        const normalizedLevel = normalizeLevel(level);
        const increase = (normalizedLevel - 1) * gameConfig.projectiles.radiusPerLevel;
        return base + increase;
    },

    spawnProjectile(angle, tower) {
        const weaponType = resolveWeaponType(tower?.level ?? 1);
        switch (weaponType) {
            case 'minigun':
                spawnMinigunBurst(this, angle, tower);
                break;
            case 'railgun':
                spawnRailgunBeam(this, angle, tower);
                break;
            case 'rocket':
                spawnRocket(this, angle, tower);
                break;
            default: {
                const radius = this.getProjectileRadiusForLevel(tower?.level);
                createProjectile(this, angle, tower, radius, { weaponType });
                updateMaxProjectileRadius(this, radius);
                playTowerFireSound(this.audio, tower?.level);
                tower.triggerFlash();
                break;
            }
        }
    },

    switchTowerColor(tower) {
        const rawCost = Number.isFinite(this.switchCost) ? this.switchCost : 0;
        const cost = Math.max(0, rawCost);
        if (this.waveInProgress) {
            if (tower && typeof tower.triggerErrorPulse === 'function') {
                tower.triggerErrorPulse();
            }
            if (this.audio && typeof this.audio.playError === 'function') {
                this.audio.playError();
            }
            return false;
        }
        if (cost > 0 && this.energy < cost) {
            if (tower && typeof tower.triggerErrorPulse === 'function') {
                tower.triggerErrorPulse();
            }
            if (this.audio && typeof this.audio.playError === 'function') {
                this.audio.playError();
            }
            return false;
        }
        const nextColor = tower.color === 'red' ? 'blue' : 'red';
        tower.color = nextColor;
        if (cost > 0) {
            this.energy -= cost;
        }
        if (cost > 0 && typeof this.addEnergyPopup === 'function' && tower) {
            const center = typeof tower.center === 'function'
                ? tower.center()
                : { x: (tower.x ?? 0) + (tower.w ?? 0) / 2, y: (tower.y ?? 0) + (tower.h ?? 0) / 2 };
            const cost = Math.max(0, Math.round(rawCost));
            const text = `-${cost}`;
            const popupY = center.y - (tower.h ?? 0) * 0.4;
            this.addEnergyPopup(text, center.x, popupY, {
                color: '#facc15',
                stroke: 'rgba(0,0,0,0.5)',
            });
        }
        const burst = createColorSwitchBurstFromTower(tower, nextColor);
        if (burst) {
            this.colorSwitchBursts.push(burst);
        }
        this.audio.playColorSwitch();
        updateHUD(this);
        return true;
    },
};

export default projectileManagement;
