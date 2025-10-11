import test from 'node:test';
import assert from 'node:assert/strict';
import { moveProjectiles, hitEnemy, handleProjectileHits } from '../js/core/projectiles.js';

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
    assert.equal(game.energy, 1);
    assert.equal(game.energyEl.textContent, '1');
    assert.equal(game.explosions.length, 1);
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
    assert.equal(game.energy, 1);
    assert.equal(game.explosions.length, 1);
});

test('hitEnemy deals reduced damage when colors differ', () => {
    const game = makeGame();
    const enemy = makeEnemy({ color: 'blue' });
    const projectile = makeProjectile({ x: 15, y: 15 });
    game.enemies.push(enemy);
    game.projectiles.push(projectile);

    const result = hitEnemy(game, projectile, 0);

    assert.equal(result, true);
    assert.ok(Math.abs(enemy.hp - 0.6) < 1e-6);
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
    assert.equal(game.explosions.length, 1);
    assert.ok(Array.isArray(game.explosions[0].particles));
    assert.ok(game.explosions[0].particles.length > 0);
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
