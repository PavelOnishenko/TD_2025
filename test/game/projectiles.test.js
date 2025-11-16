import test from 'node:test';
import assert from 'node:assert/strict';
import Tower from '../../js/entities/Tower.js';
import { hitEnemy } from '../../js/core/projectiles.js';
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

    const projectile = game.projectiles[0];
    assert.equal(projectile.type, 'rocket');
    assert.equal(projectile.radius, 34);
    assert.equal(game.maxProjectileRadius, 34);
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
    const levels = [];
    withReplacedMethod(game.audio, 'playTowerFire', level => { levels.push(level); }, () => {
        game.spawnProjectile(0, new Tower(0, 0));
    });

    assert.deepEqual(levels, [1]);
});

test('level 4 tower fires a minigun burst', () => {
    const game = createGame();
    const tower = new Tower(0, 0, 'blue', 4);
    const levels = [];

    withReplacedMethod(game.audio, 'playTowerFire', level => { levels.push(level); }, () => {
        game.spawnProjectile(0, tower);
    });

    assert.ok(game.projectiles.length > 1);
    const totalDamage = game.projectiles.reduce((sum, projectile) => {
        assert.equal(projectile.type, 'minigun');
        return sum + projectile.damage;
    }, 0);
    assert.ok(Math.abs(totalDamage - tower.damage) < 1e-6);
    assert.deepEqual(levels, [4]);
});

test('level 5 tower railgun beam pierces enemies', () => {
    const game = createGame();
    const tower = createTower(game, 0, { level: 5, color: 'red' });
    const center = tower.center();
    const enemyA = { x: center.x + 120, y: center.y - 20, w: 40, h: 40, hp: 1, color: 'red' };
    const enemyB = { x: center.x + 220, y: center.y - 22, w: 40, h: 40, hp: 1, color: 'blue' };
    game.enemies.push(enemyA, enemyB);
    const levels = [];

    withReplacedMethod(game.audio, 'playTowerFire', level => { levels.push(level); }, () => {
        game.spawnProjectile(0, tower);
    });

    assert.deepEqual(levels, [5]);
    assert.equal(game.projectiles[0].type, 'railgun-beam');
    assert.ok(game.enemies.length <= 1);
});

test('level 6 rocket impact triggers explosive damage', () => {
    const game = createGame();
    const tower = new Tower(0, 0, 'red', 6);
    const enemyA = { x: 200, y: 200, w: 40, h: 40, hp: 1, color: 'red' };
    const enemyB = { x: 230, y: 215, w: 40, h: 40, hp: 1, color: 'red' };
    game.enemies.push(enemyA, enemyB);
    const fireLevels = [];
    const hitLevels = [];

    withReplacedMethod(game.audio, 'playTowerFire', level => { fireLevels.push(level); }, () => {
        game.spawnProjectile(Math.PI / 4, tower);
    });

    const projectileIndex = game.projectiles.findIndex(p => p.type === 'rocket');
    assert.ok(projectileIndex >= 0);
    const projectile = game.projectiles[projectileIndex];
    projectile.x = enemyA.x + enemyA.w / 2;
    projectile.y = enemyA.y + enemyA.h / 2;

    withReplacedMethod(game.audio, 'playTowerHit', level => { hitLevels.push(level); }, () => {
        hitEnemy(game, projectile, projectileIndex);
    });

    assert.deepEqual(fireLevels, [6]);
    assert.ok(hitLevels.length >= 1);
    assert.ok(hitLevels.every(level => level === 6));
    assert.equal(game.enemies.length, 0);
});

