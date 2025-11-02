import test from 'node:test';
import assert from 'node:assert/strict';
import Tower from '../../js/entities/Tower.js';
import { createGame, placeTowerOnCell, withReplacedMethod } from './helpers.js';

function createTower(game, cellIndex = 0, options = {}) {
    const cell = game.bottomCells[cellIndex];
    return placeTowerOnCell(game, cell, options);
}

test('spawnProjectile creates projectile with tower stats', () => {
    const game = createGame();
    const tower = new Tower(100, 200, 'blue', 2);

    game.spawnProjectile(Math.PI / 4, tower);

    const projectile = game.projectiles[0];
    assert.equal(game.projectiles.length, 1);
    assert.equal(projectile.color, tower.color);
    assert.equal(projectile.damage, tower.damage);
    assert.ok(projectile.vx > 0);
    assert.ok(projectile.vy > 0);
    assert.equal(tower.flashTimer, tower.flashDuration);
});

test('spawnProjectile clamps projectile radius at level 3', () => {
    const game = createGame();
    const tower = new Tower(0, 0, 'red', 6);

    game.spawnProjectile(0, tower);

    assert.equal(game.projectiles[0].radius, 28);
    assert.equal(game.maxProjectileRadius, 28);
});

test('getProjectileRadiusForLevel respects bounds', () => {
    const game = createGame();
    const cases = [
        { level: 1, radius: 18 },
        { level: 2, radius: 23 },
        { level: 3, radius: 28 },
        { level: 4, radius: 28 },
        { level: -1, radius: 18 },
    ];

    for (const entry of cases) {
        assert.equal(game.getProjectileRadiusForLevel(entry.level), entry.radius);
    }
});

test('towerAttacks fires projectile when enemy is in range', () => {
    const game = createGame();
    const tower = createTower(game);
    const enemy = { x: tower.x + 5, y: tower.y + 5, w: 20, h: 20 };
    game.enemies.push(enemy);

    const fireInterval = tower.getFireInterval();
    game.towerAttacks(fireInterval + 1);

    assert.equal(game.projectiles.length, 1);
    assert.equal(tower.lastShot, fireInterval + 1);
});

test('towerAttacks respects firing cooldown', () => {
    const game = createGame();
    const tower = createTower(game);
    const enemy = { x: tower.x + 5, y: tower.y + 5, w: 20, h: 20 };
    const fireInterval = tower.getFireInterval();
    tower.lastShot = Math.max(0, fireInterval - 10);
    game.enemies.push(enemy);

    const timestamp = fireInterval + 1;
    game.towerAttacks(timestamp);

    assert.equal(game.projectiles.length, 0);
    assert.equal(tower.lastShot, Math.max(0, fireInterval - 10));
});

test('spawnProjectile triggers audio fire sound', () => {
    const game = createGame();
    let called = false;
    withReplacedMethod(game.audio, 'playFire', () => { called = true; }, () => {
        game.spawnProjectile(0, new Tower(0, 0));
    });

    assert.equal(called, true);
});

