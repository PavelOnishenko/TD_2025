import test from 'node:test';
import assert from 'node:assert/strict';
import Game from '../src/Game.js';
import Tower from '../src/Tower.js';
import { TankEnemy, SwarmEnemy } from '../src/Enemy.js';

function makeFakeCanvas() {
    return {
        width: 800,
        height: 450,
        getContext: () => ({
            fillRect: () => {},
            clearRect: () => {},
            beginPath: () => {},
            arc: () => {},
            fill: () => {},
            stroke: () => {},
            strokeRect: () => {},
        }),
    };
}

function attachDomStubs(game) {
    game.livesEl = { textContent: '' };
    game.goldEl = { textContent: '' };
    game.waveEl = { textContent: '' };
    game.statusEl = { textContent: '', style: {} };
    game.nextWaveBtn = { disabled: false };
}

test('spawnProjectile main', () => {
    const fakeCanvas = makeFakeCanvas();
    const game = new Game(fakeCanvas);
    const tower = new Tower(100, 200);

    game.spawnProjectile(1, tower);

    assert.equal(game.projectiles.length, 1);
    const projectile = game.projectiles[0];
    assert.equal(projectile.x, 120);
    assert.equal(projectile.y, 220);
    assert.ok(Math.abs(projectile.vx - 432.24) < 0.01);
    assert.ok(Math.abs(projectile.vy - 673.18) < 0.01);
    assert.equal(projectile.color, tower.color);
    assert.equal(projectile.damage, 1);
});

test('spawnProjectile uses tower damage', () => {
    const fakeCanvas = makeFakeCanvas();
    const game = new Game(fakeCanvas);
    const tower = new Tower(100, 200, 'red', 2);

    game.spawnProjectile(0, tower);

    assert.equal(game.projectiles[0].damage, tower.damage);
    assert.ok(Math.abs(game.projectiles[0].damage - 1.8) < 1e-6);
});

test('spawnEnemy main', () => {
    const fakeCanvas = makeFakeCanvas();
    const game = new Game(fakeCanvas);

    game.spawnEnemy();

    assert.equal(game.enemies.length, 3);
    assert.equal(game.spawned, 1);
    for (const e of game.enemies) {
        assert.ok(e instanceof SwarmEnemy);
        assert.equal(e.maxHp, 1);
    }
});

test('spawnEnemy can create tank enemies', () => {
    const fakeCanvas = makeFakeCanvas();
    const game = new Game(fakeCanvas);

    const baseHp = game.enemyHpPerWave[game.wave - 1];
    game.spawnEnemy('tank');

    assert.equal(game.enemies.length, 1);
    assert.ok(game.enemies[0] instanceof TankEnemy);
    assert.equal(game.spawned, 1);
    assert.equal(game.enemies[0].maxHp, baseHp * 5);
});

test('spawnEnemy defaults to last hp for high wave', () => {
    const fakeCanvas = makeFakeCanvas();
    const game = new Game(fakeCanvas);
    game.wave = game.enemyHpPerWave.length + 3;

    game.spawnEnemy();

    const enemy = game.enemies[0];
    const expectedHp = Math.max(1, Math.floor(game.enemyHpPerWave.at(-1) / 2));
    assert.equal(enemy.maxHp, expectedHp);
});

test('calcDelta returns delta time in seconds and updates lastTime', () => {
    const game = new Game(makeFakeCanvas());
    game.lastTime = 1000;
    const dt = game.calcDelta(2000);
    assert.equal(dt, 1);
    assert.equal(game.lastTime, 2000);
});

test('spawnEnemiesIfNeeded spawns when timer exceeds interval', () => {
    const game = new Game(makeFakeCanvas());
    game.waveInProgress = true;
    game.spawnTimer = game.spawnInterval;
    game.spawnEnemiesIfNeeded(0);
    assert.equal(game.enemies.length, 3);
    assert.equal(game.spawnTimer, 0);
});

test('spawnEnemiesIfNeeded accumulates timer when below interval', () => {
    const game = new Game(makeFakeCanvas());
    game.waveInProgress = true;
    game.spawnEnemiesIfNeeded(0.2);
    assert.equal(game.enemies.length, 0);
    assert.equal(game.spawnTimer, 0.2);
});

test('updateEnemies removes enemies reaching base and reduces lives', () => {
    const game = new Game(makeFakeCanvas());
    attachDomStubs(game);
    const enemy = {
        x: game.base.x - 10,
        w: 20,
        update: () => {},
        isOutOfBounds: () => false,
    };
    game.enemies.push(enemy);
    const livesBefore = game.lives;
    game.updateEnemies(0.016);
    assert.equal(game.enemies.length, 0);
    assert.equal(game.lives, livesBefore - 1);
});

test('checkWaveCompletion increments wave and gold', () => {
    const game = new Game(makeFakeCanvas());
    attachDomStubs(game);
    game.waveInProgress = true;
    game.spawned = game.enemiesPerWave;
    game.enemies = [];
    game.nextWaveBtn.disabled = true;
    game.checkWaveCompletion();
    assert.equal(game.waveInProgress, false);
    assert.equal(game.wave, 2);
    assert.equal(game.gold, game.initialGold + 3);
    assert.equal(game.nextWaveBtn.disabled, false);
});

test('checkWaveCompletion merges adjacent towers of same color and level', () => {
    const game = new Game(makeFakeCanvas());
    attachDomStubs(game);
    const cellA = game.grid[0];
    const cellB = game.grid[2];
    const t1 = new Tower(cellA.x, cellA.y, 'red');
    const t2 = new Tower(cellB.x, cellB.y, 'red');
    game.towers.push(t1, t2);
    cellA.occupied = true;
    cellB.occupied = true;
    game.waveInProgress = true;
    game.spawned = game.enemiesPerWave;
    game.enemies = [];
    game.checkWaveCompletion();
    assert.equal(game.towers.length, 1);
    assert.equal(game.towers[0], t1);
    assert.equal(t1.level, 2);
    assert.equal(cellA.occupied, true);
    assert.equal(cellB.occupied, false);
});

test('checkWaveCompletion triggers win on final wave', () => {
    const game = new Game(makeFakeCanvas());
    attachDomStubs(game);
    game.wave = game.maxWaves;
    game.waveInProgress = true;
    game.spawned = game.enemiesPerWave;
    game.enemies = [];
    game.checkWaveCompletion();
    assert.equal(game.statusEl.textContent, 'WIN');
    assert.equal(game.gameOver, true);
});

test('resetState restores initial game values', () => {
    const game = new Game(makeFakeCanvas());
    attachDomStubs(game);
    game.lives = 1;
    game.gold = 0;
    game.wave = 3;
    game.towers.push({});
    game.enemies.push({});
    game.projectiles.push({});
    game.waveInProgress = true;
    game.grid[0].occupied = true;
    game.nextWaveBtn.disabled = true;
    game.statusEl.textContent = 'status';
    game.resetState();
    assert.equal(game.lives, game.initialLives);
    assert.equal(game.gold, game.initialGold);
    assert.equal(game.wave, 1);
    assert.equal(game.towers.length, 0);
    assert.equal(game.enemies.length, 0);
    assert.equal(game.projectiles.length, 0);
    assert.equal(game.waveInProgress, false);
    assert.equal(game.nextWaveBtn.disabled, false);
    assert.equal(game.grid[0].occupied, false);
    assert.equal(game.statusEl.textContent, '');
});

test('startWave initiates wave and spawns first enemy', () => {
    const game = new Game(makeFakeCanvas());
    attachDomStubs(game);
    game.enemies.push({});
    game.spawned = 2;
    game.spawnTimer = 1;

    game.startWave();

    assert.equal(game.waveInProgress, true);
    assert.equal(game.nextWaveBtn.disabled, true);
    assert.equal(game.enemies.length, 3);
    assert.equal(game.spawned, 1);
    assert.equal(game.spawnTimer, 0);
});

test('startWave does nothing if wave already in progress', () => {
    const game = new Game(makeFakeCanvas());
    game.waveInProgress = true;
    game.enemies.push({});
    game.spawned = 1;

    game.startWave();

    assert.equal(game.enemies.length, 1);
    assert.equal(game.spawned, 1);
});

test('towerAttacks fires projectile when enemy in range and off cooldown', () => {
    const game = new Game(makeFakeCanvas());
    const tower = new Tower(100, 200);
    const enemy = { x: 110, y: 210, w: 30, h: 30 };
    game.towers.push(tower);
    game.enemies.push(enemy);

    game.towerAttacks(600);

    assert.equal(game.projectiles.length, 1);
    assert.equal(tower.lastShot, 600);
});

test('towerAttacks respects firing cooldown', () => {
    const game = new Game(makeFakeCanvas());
    const tower = new Tower(100, 200);
    tower.lastShot = 200;
    const enemy = { x: 110, y: 210, w: 30, h: 30 };
    game.towers.push(tower);
    game.enemies.push(enemy);

    game.towerAttacks(600);

    assert.equal(game.projectiles.length, 0);
});

test('update spawns enemy and schedules next frame', () => {
    const game = new Game(makeFakeCanvas());
    attachDomStubs(game);
    game.startWave();
    game.lastTime = 0;
    const originalRAF = globalThis.requestAnimationFrame;
    let scheduled = null;
    globalThis.requestAnimationFrame = cb => { scheduled = cb; };

    game.update(500);

    globalThis.requestAnimationFrame = originalRAF;
    assert.equal(game.enemies.length, 6);
    assert.equal(game.lastTime, 500);
    assert.equal(scheduled, game.update);
});

test('update returns early when game over', () => {
    const game = new Game(makeFakeCanvas());
    attachDomStubs(game);
    game.gameOver = true;
    const originalRAF = globalThis.requestAnimationFrame;
    let called = false;
    globalThis.requestAnimationFrame = () => { called = true; };

    game.update(500);

    globalThis.requestAnimationFrame = originalRAF;
    assert.equal(called, false);
    assert.equal(game.lastTime, 0);
});

