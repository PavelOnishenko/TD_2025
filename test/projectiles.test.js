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
    };
}

test('moveProjectiles updates positions', () => {
    const game = makeGame();
    game.projectiles.push({ x: 0, y: 0, vx: 10, vy: 0 });
    game.projectiles.push({ x: 50, y: 50, vx: -20, vy: 10 });

    moveProjectiles(game, 0.5);

    assert.deepEqual(game.projectiles[0], { x: 5, y: 0, vx: 10, vy: 0 });
    assert.deepEqual(game.projectiles[1], { x: 40, y: 55, vx: -20, vy: 10 });
});

test('hitEnemy damages enemy and removes projectile when enemy survives', () => {
    const game = makeGame();
    const enemy = { x: 10, y: 10, w: 20, h: 20, hp: 2, color: 'red' };
    const projectile = { x: 15, y: 15, color: 'red', damage: 1 };
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
    const enemy = { x: 10, y: 10, w: 20, h: 20, hp: 1, color: 'red' };
    const projectile = { x: 15, y: 15, color: 'red', damage: 1 };
    game.enemies.push(enemy);
    game.projectiles.push(projectile);

    const result = hitEnemy(game, projectile, 0);

    assert.equal(result, true);
    assert.equal(game.projectiles.length, 0);
    assert.equal(game.enemies.length, 0);
    assert.equal(game.energy, 1);
    assert.equal(game.energyEl.textContent, 'Energy: 1');
    assert.equal(game.explosions.length, 1);
});

test('handleProjectileHits removes offscreen and hit projectiles', () => {
    const game = makeGame();
    const enemy = { x: 10, y: 10, w: 20, h: 20, hp: 1, color: 'red' };
    const pHit = { x: 15, y: 15, color: 'red', damage: 1 };
    const pMiss = { x: 100, y: 100, color: 'red', damage: 1 };
    const pOff = { x: -5, y: 0, color: 'red', damage: 1 };
    game.enemies.push(enemy);
    game.projectiles.push(pHit, pMiss, pOff);

    handleProjectileHits(game);

    assert.equal(game.projectiles.length, 1);
    assert.deepEqual(game.projectiles[0], pMiss);
    assert.equal(game.enemies.length, 0);
    assert.equal(game.energy, 1);
    assert.equal(game.explosions.length, 1);
});

test('hitEnemy deals reduced damage when colors differ', () => {
    const game = makeGame();
    const enemy = { x: 10, y: 10, w: 20, h: 20, hp: 1, color: 'blue' };
    const projectile = { x: 15, y: 15, color: 'red', damage: 1 };
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
