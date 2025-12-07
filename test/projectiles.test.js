import test from 'node:test';
import assert from 'node:assert/strict';
import { moveProjectiles, hitEnemy, handleProjectileHits } from '../js/core/projectiles.js';
import gameConfig from '../js/config/gameConfig.js';

function makeGame() {
    return {
        projectiles: [],
        enemies: [],
        explosions: [],
        canvas: { width: 450, height: 800 },
        energy: 0,
        wave: 1,
        maxWaves: 5,
        lives: 3,
        livesEl: { textContent: '' },
        energyEl: { textContent: '' },
        waveEl: { textContent: '' },
        wavePhaseEl: { textContent: '', classList: { toggle() {} } },
        wavePanelEl: { dataset: {} },
    };
}

function makeEnemy(overrides = {}) {
    return {
        x: 10,
        y: 10,
        w: 20,
        h: 20,
        hp: 1,
        color: 'red',
        ...overrides,
    };
}

function makeProjectile(overrides = {}) {
    return {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        color: 'red',
        damage: 1,
        ...overrides,
    };
}

function getExpectedWaveMultiplier(wave) {
    const scaling = gameConfig.player.killEnergyScaling;
    const maxBonus = Number.isFinite(scaling?.maxBonus) ? scaling.maxBonus : null;
    const checkpoints = Array.isArray(scaling?.breakpoints) ? scaling.breakpoints.slice() : [];
    const baseWave = Math.max(1, Math.floor(Number.isFinite(scaling?.baseWave) ? scaling.baseWave : 1));
    const baseBonus = Number.isFinite(scaling?.baseBonus) ? scaling.baseBonus : 0;
    checkpoints.push({ wave: baseWave, bonus: baseBonus });
    const sorted = checkpoints
        .filter(point => Number.isFinite(point?.wave) && Number.isFinite(point?.bonus))
        .map(point => ({ wave: Math.max(1, Math.floor(point.wave)), bonus: point.bonus }))
        .sort((a, b) => a.wave - b.wave);

    const safeWave = Math.max(1, Math.floor(wave));
    let previous = sorted[0] ?? { wave: 1, bonus: 0 };

    for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];
        if (safeWave <= current.wave) {
            const span = Math.max(1, current.wave - previous.wave);
            const progress = (safeWave - previous.wave) / span;
            const bonus = previous.bonus + (current.bonus - previous.bonus) * progress;
            const cappedBonus = maxBonus === null ? bonus : Math.min(bonus, maxBonus);
            return 1 + cappedBonus;
        }
        previous = current;
    }
    const finalBonus = maxBonus === null ? previous.bonus : Math.min(previous.bonus, maxBonus);
    return 1 + finalBonus;
}

test('moveProjectiles updates positions', () => {
    const game = makeGame();
    const first = makeProjectile({ vx: 10 });
    const second = makeProjectile({ x: 50, y: 50, vx: -20, vy: 10 });
    const expectedFirst = { ...first, x: first.x + first.vx * 0.5, y: first.y + first.vy * 0.5 };
    const expectedSecond = { ...second, x: second.x + second.vx * 0.5, y: second.y + second.vy * 0.5 };
    game.projectiles.push(first, second);

    moveProjectiles(game, 0.5);

    assert.deepEqual(game.projectiles[0], expectedFirst);
    assert.deepEqual(game.projectiles[1], expectedSecond);
});

test('moveProjectiles advances animation time', () => {
    const game = makeGame();
    const projectile = makeProjectile({ anim: { time: 1.2 } });
    game.projectiles.push(projectile);

    moveProjectiles(game, 0.3);

    assert.equal(projectile.anim.time, 1.5);
});

test('hitEnemy damages enemy and removes projectile when enemy survives', () => {
    const game = makeGame();
    const enemy = makeEnemy({ hp: 2 });
    const projectile = makeProjectile({ x: 15, y: 15 });
    game.enemies.push(enemy);
    game.projectiles.push(projectile);

    const result = hitEnemy(game, projectile, 0);

    assert.equal(result, true);
    assert.equal(enemy.hp, 1);
    assert.equal(game.projectiles.length, 0);
    assert.equal(game.enemies.length, 1);
    assert.equal(game.energy, 0);
    assert.equal(game.explosions.length, 1);
    assert.ok(game.explosions[0].particles.length > 0);
});

test('hitEnemy removes enemy and updates energy when enemy dies', () => {
    const game = makeGame();
    const enemy = makeEnemy();
    const projectile = makeProjectile({ x: 15, y: 15 });
    game.enemies.push(enemy);
    game.projectiles.push(projectile);

    const result = hitEnemy(game, projectile, 0);

    assert.equal(result, true);
    assert.equal(game.projectiles.length, 0);
    assert.equal(game.enemies.length, 0);
    assert.equal(game.energy, gameConfig.player.energyPerKill);
    assert.equal(game.energyEl.textContent, String(gameConfig.player.energyPerKill));
    assert.equal(game.explosions.length, 2);
    const [impactExplosion, killExplosion] = game.explosions;
    assert.ok(impactExplosion.particles.length > 0);
    assert.ok(killExplosion.particles.length > impactExplosion.particles.length);
});

test('hitEnemy grants bonus energy for tank kills', () => {
    const game = makeGame();
    const enemy = makeEnemy({ spriteKey: 'tank' });
    const projectile = makeProjectile({ x: 15, y: 15 });
    game.enemies.push(enemy);
    game.projectiles.push(projectile);

    hitEnemy(game, projectile, 0);

    const expectedEnergy = gameConfig.player.energyPerKill * gameConfig.player.tankKillEnergyMultiplier;
    assert.equal(game.energy, expectedEnergy);
    assert.equal(game.energyEl.textContent, String(expectedEnergy));
});

test('kill energy scales with wave milestones', () => {
    const game = makeGame();
    game.wave = 20;
    const enemy = makeEnemy();
    const projectile = makeProjectile({ x: 15, y: 15 });
    game.enemies.push(enemy);
    game.projectiles.push(projectile);

    hitEnemy(game, projectile, 0);

    const expectedEnergy = Math.round(
        gameConfig.player.energyPerKill * getExpectedWaveMultiplier(game.wave),
    );
    assert.equal(game.energy, expectedEnergy);
    assert.equal(game.energyEl.textContent, String(expectedEnergy));
});

test('tank kill scaling applies rounding and progression', () => {
    const game = makeGame();
    game.wave = 10;
    const enemy = makeEnemy({ spriteKey: 'tank' });
    const projectile = makeProjectile({ x: 15, y: 15 });
    game.enemies.push(enemy);
    game.projectiles.push(projectile);

    hitEnemy(game, projectile, 0);

    const expectedEnergy = Math.round(
        gameConfig.player.energyPerKill
        * gameConfig.player.tankKillEnergyMultiplier
        * getExpectedWaveMultiplier(game.wave),
    );
    assert.equal(game.energy, expectedEnergy);
    assert.equal(game.energyEl.textContent, String(expectedEnergy));
});

test('handleProjectileHits removes offscreen and hit projectiles', () => {
    const game = makeGame();
    const enemy = makeEnemy();
    const pHit = makeProjectile({ x: 15, y: 15 });
    const pMiss = makeProjectile({ x: 100, y: 100 });
    const pOff = makeProjectile({ x: -5 });
    game.enemies.push(enemy);
    game.projectiles.push(pHit, pMiss, pOff);

    handleProjectileHits(game);

    assert.equal(game.projectiles.length, 1);
    assert.strictEqual(game.projectiles[0], pMiss);
    assert.equal(game.enemies.length, 0);
    assert.equal(game.energy, gameConfig.player.energyPerKill);
    assert.equal(game.explosions.length, 2);
});

test('hitEnemy deals reduced damage when colors differ', () => {
    const game = makeGame();
    const enemy = makeEnemy({ color: 'blue' });
    const projectile = makeProjectile({ x: 15, y: 15 });
    game.enemies.push(enemy);
    game.projectiles.push(projectile);

    const result = hitEnemy(game, projectile, 0);

    assert.equal(result, true);
    const expectedHp = 1 - (projectile.damage ?? 1) * gameConfig.projectiles.colorMismatchMultiplier;
    assert.ok(Math.abs(enemy.hp - expectedHp) < 1e-6);
    assert.equal(game.projectiles.length, 0);
    assert.equal(game.enemies.length, 1);
    assert.equal(game.energy, 0);
    assert.equal(game.explosions.length, 1);
});

test('hitEnemy returns false and keeps projectile when nothing collides', () => {
    const game = makeGame();
    const enemy = makeEnemy({ x: 200, y: 200 });
    const projectile = makeProjectile({ x: 15, y: 15 });
    game.enemies.push(enemy);
    game.projectiles.push(projectile);

    const result = hitEnemy(game, projectile, 0);

    assert.equal(result, false);
    assert.strictEqual(game.projectiles[0], projectile);
    assert.strictEqual(game.enemies[0], enemy);
    assert.equal(game.explosions.length, 0);
    assert.equal(game.energy, 0);
});

test('hitEnemy triggers explosion audio when available', () => {
    const game = makeGame();
    const enemy = makeEnemy();
    const projectile = makeProjectile({ x: 15, y: 15 });
    let wasCalled = false;
    game.audio = { playExplosion() { wasCalled = true; } };
    game.enemies.push(enemy);
    game.projectiles.push(projectile);

    hitEnemy(game, projectile, 0);

    assert.equal(wasCalled, true);
    assert.equal(game.explosions.length, 2);
    assert.ok(Array.isArray(game.explosions[0].particles));
    assert.ok(game.explosions[0].particles.length > 0);
    assert.ok(Array.isArray(game.explosions[1].particles));
    assert.ok(game.explosions[1].particles.length > game.explosions[0].particles.length);
});

test('handleProjectileHits respects configured world bounds', () => {
    const game = makeGame();
    const inside = makeProjectile({ x: 100, y: 100 });
    const outsideX = makeProjectile({ x: 460, y: 100 });
    const outsideY = makeProjectile({ x: 100, y: -10 });
    game.worldBounds = { minX: 0, minY: 0, maxX: 300, maxY: 300 };
    game.projectiles.push(inside, outsideX, outsideY);

    handleProjectileHits(game);

    assert.equal(game.projectiles.length, 1);
    assert.strictEqual(game.projectiles[0], inside);
    assert.equal(game.explosions.length, 0);
    assert.equal(game.energy, 0);
});

test('hitEnemy enforces minimal lifetime for level 3 projectiles', () => {
    const game = makeGame();
    const enemy = makeEnemy({ x: 10, y: 10 });
    const level3Projectile = makeProjectile({ x: 15, y: 15, towerLevel: 3, life: 0 });
    game.enemies.push(enemy);
    game.projectiles.push(level3Projectile);

    const resultBeforeMinLife = hitEnemy(game, level3Projectile, 0);

    assert.equal(resultBeforeMinLife, false);
    assert.equal(game.projectiles.length, 1);
    assert.equal(game.enemies.length, 1);
    assert.equal(enemy.hp, 1);

    level3Projectile.life = 0.04;

    const resultAfterMinLife = hitEnemy(game, level3Projectile, 0);

    assert.equal(resultAfterMinLife, true);
    assert.equal(game.projectiles.length, 0);
    assert.equal(game.enemies.length, 0);
});

test('moveProjectiles tracks lifetime for level 3 projectiles', () => {
    const game = makeGame();
    const level3Projectile = makeProjectile({ towerLevel: 3 });
    game.projectiles.push(level3Projectile);

    assert.equal(level3Projectile.life, undefined);

    moveProjectiles(game, 0.02);

    assert.equal(level3Projectile.life, 0.02);

    moveProjectiles(game, 0.015);

    assert.equal(level3Projectile.life, 0.035);
});
