import test from 'node:test';
import assert from 'node:assert/strict';
import Game from '../src/js/core/Game.js';
import Tower from '../src/js/entities/Tower.js';
import { TankEnemy, SwarmEnemy } from '../src/js/entities/Enemy.js';

function placeTowerOnCell(game, cell, { color = 'red', level = 1 } = {}) {
    const tower = new Tower(cell.x, cell.y, color, level);
    tower.x -= tower.w / 4;
    tower.y -= tower.h * 0.8;
    tower.cell = cell;
    cell.tower = tower;
    cell.occupied = true;
    game.towers.push(tower);
    return tower;
}

function makeFakeCanvas() {
    return {
        width: 450,
        height: 800,
        getContext: () => ({
            fillRect: () => {},
            clearRect: () => {},
            beginPath: () => {},
            arc: () => {},
            fill: () => {},
            stroke: () => {},
            strokeRect: () => {},
            drawImage: () => {},
            fillText: () => {},
            save: () => {},
            restore: () => {},
            set globalCompositeOperation(_) {},
        }),
    };
}

function attachDomStubs(game) {
    game.livesEl = { textContent: '' };
    game.goldEl = { textContent: '' };
    game.waveEl = { textContent: '' };
    game.statusEl = { textContent: '', style: {} };
    game.nextWaveBtn = { disabled: false };
    game.cooldownEl = { textContent: '' };
    const assetProxy = new Proxy({ cell: {} }, {
        get(target, prop) {
            if (!(prop in target)) {
                target[prop] = {};
            }
            return target[prop];
        }
    });
    game.assets = assetProxy;
}

test('spawnProjectile main', () => {
    const fakeCanvas = makeFakeCanvas();
    const game = new Game(fakeCanvas);
    const tower = new Tower(100, 200);

    game.spawnProjectile(1, tower);

    assert.equal(game.projectiles.length, 1);
    const projectile = game.projectiles[0];
    assert.equal(projectile.x, 130);
    assert.equal(projectile.y, 245);
    assert.ok(Math.abs(projectile.vx - 432.24) < 0.01);
    assert.ok(Math.abs(projectile.vy - 673.18) < 0.01);
    assert.equal(projectile.color, tower.color);
    assert.equal(projectile.damage, 1);
    assert.equal(tower.flashTimer, tower.flashDuration);
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

    game.engineFlame = {
        anchor: { x: 0, y: 0 },
        offset: { x: 0, y: 0 },
        angle: 0
    };

    const baseHp = game.enemyHpPerWave[game.wave - 1];
    game.spawnEnemy('tank');

    assert.equal(game.enemies.length, 1);
    assert.ok(game.enemies[0] instanceof TankEnemy);
    assert.equal(game.spawned, 1);
    assert.equal(game.enemies[0].maxHp, baseHp * 4);
});

test('spawnEnemy defaults to last hp for high wave', () => {
    const fakeCanvas = makeFakeCanvas();
    const game = new Game(fakeCanvas);
    game.wave = game.enemyHpPerWave.length + 3;

    game.spawnEnemy('swarm');

    const enemy = game.enemies[0];
    const expectedHp = Math.max(1, Math.floor(game.enemyHpPerWave.at(-1) / 2));
    assert.equal(enemy.maxHp, expectedHp);
});

test('spawnEnemy assigns random color for each spawned enemy', () => {
    const fakeCanvas = makeFakeCanvas();
    const game = new Game(fakeCanvas);
    const seq = [0.2, 0.8, 0.1]; // red, blue, red
    const original = Math.random;
    let i = 0;
    Math.random = () => seq[i++];
    try {
        game.spawnEnemy('swarm');
    } finally {
        Math.random = original;
    }
    const colors = game.enemies.map(e => e.color);
    assert.deepEqual(colors, ['red', 'blue', 'red']);
});

test('getEnemyColor picks red or blue based on Math.random', () => {
    const game = new Game(makeFakeCanvas());
    const original = Math.random;
    Math.random = () => 0.3;
    assert.equal(game.getEnemyColor(), 'red');
    Math.random = () => 0.7;
    assert.equal(game.getEnemyColor(), 'blue');
    Math.random = original;
});

test('startWave picks distinct color probabilities A and B', () => {
    const game = new Game(makeFakeCanvas());
    attachDomStubs(game);
    const seq = [0.1, 0.4, 0.2, 0.8, 0.1, 0.9, 0.2];
    const original = Math.random;
    let i = 0;
    Math.random = () => seq[i++];
    try {
        game.startWave();
    } finally {
        Math.random = original;
    }
    assert.equal(game.colorProbStart, 0.2);
    assert.equal(game.colorProbEnd, 0.8);
    assert.ok(Math.abs(game.colorProbStart - game.colorProbEnd) > 0.35);
});

test('getEnemyColor probability shifts linearly across wave', () => {
    const game = new Game(makeFakeCanvas());
    game.enemiesPerWave = 4;
    game.spawned = 0;
    game.colorProbStart = 0.2;
    game.colorProbEnd = 0.8;
    const seq = [0.1, 0.5, 0.55, 0.9];
    const original = Math.random;
    let i = 0;
    Math.random = () => seq[i++];
    const colors = [];
    for (let j = 0; j < 4; j++) {
        colors.push(game.getEnemyColor());
        game.spawned += 1;
    }
    Math.random = original;
    assert.deepEqual(colors, ['red', 'blue', 'red', 'blue']);
});

test('calcDelta returns delta time in seconds and updates lastTime', () => {
    const game = new Game(makeFakeCanvas());
    game.lastTime = 1000;
    const dt = game.calcDelta(2000);
    assert.equal(dt, 1);
    assert.equal(game.lastTime, 2000);
});

test('generateTankBurstSchedule produces sorted unique indices', () => {
    const game = new Game(makeFakeCanvas());
    const originalRandom = Math.random;
    const sequence = [0.91, 0.35, 0.72, 0.18, 0.54, 0.27];
    let i = 0;
    Math.random = () => sequence[i++ % sequence.length];
    try {
        const bursts = game.generateTankBurstSchedule(6, 3);
        assert.equal(bursts.length, 3);
        assert.equal([...new Set(bursts)].length, 3);
        assert.deepEqual([...bursts].sort((a, b) => a - b), bursts);
        assert.ok(bursts.every(index => index >= 1 && index <= 6));
    } finally {
        Math.random = originalRandom;
    }
});

test('startWave schedules tank bursts based on wave config', () => {
    const game = new Game(makeFakeCanvas());
    attachDomStubs(game);
    game.wave = 3;
    const cfg = game.waveConfigs[game.wave - 1];
    const originalSpawnEnemy = game.spawnEnemy;
    game.spawnEnemy = function(type) {
        this.lastSpawnType = this.determineEnemyType(type);
        this.spawned += 1;
    };
    try {
        game.startWave();
    } finally {
        game.spawnEnemy = originalSpawnEnemy;
    }

    assert.equal(game.tankBurstSchedule.length, cfg.tanksCount);
    assert.equal(new Set(game.tankBurstSchedule).size, cfg.tanksCount);
    assert.ok(game.tankBurstSchedule.every(index => index >= 1 && index <= cfg.cycles));
    assert.equal(game.tankScheduleWave, game.wave);
});

test('determineEnemyType follows scheduled tank bursts', () => {
    const game = new Game(makeFakeCanvas());
    const waveIndex = 3;
    const cfg = game.waveConfigs[waveIndex - 1];
    const stubSchedule = [1, cfg.cycles];
    const originalGenerator = game.generateTankBurstSchedule;
    game.generateTankBurstSchedule = () => stubSchedule.slice();
    game.wave = waveIndex;
    game.spawned = 0;
    game.enemiesPerWave = cfg.cycles;
    game.prepareTankScheduleForWave(cfg, waveIndex);

    const types = [];
    for (let i = 0; i < cfg.cycles; i++) {
        types.push(game.determineEnemyType());
        game.spawned += 1;
    }

    game.generateTankBurstSchedule = originalGenerator;

    const tankIndices = types
        .map((type, idx) => (type === 'tank' ? idx + 1 : null))
        .filter(Boolean);

    assert.deepEqual(tankIndices, stubSchedule);
    assert.equal(tankIndices.length, cfg.tanksCount);
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
        x: game.base.x - 5,
        w: 10,
        y: game.base.y - 10,
        h: 20,
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
    const cellA = game.bottomCells[0];
    const cellB = game.bottomCells[1];
    const t1 = placeTowerOnCell(game, cellA);
    const t2 = placeTowerOnCell(game, cellB);
    game.waveInProgress = true;
    game.spawned = game.enemiesPerWave;
    game.enemies = [];
    game.checkWaveCompletion();
    assert.equal(game.towers.length, 1);
    assert.equal(game.towers[0], t1);
    assert.equal(t1.level, 2);
    assert.equal(cellA.occupied, true);
    assert.equal(cellA.tower, t1);
    assert.equal(cellB.occupied, false);
    assert.equal(cellB.tower, null);
});

test('checkWaveCompletion triggers win on final wave', () => {
    const game = new Game(makeFakeCanvas());
    attachDomStubs(game);
    game.wave = game.maxWaves;
    game.waveInProgress = true;
    game.spawned = game.enemiesPerWave;
    game.enemies = [];
    game.checkWaveCompletion();
    assert.equal(game.statusEl.textContent, 'All waves cleared!');
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
    game.explosions.push({ particles: [{}] });
    game.waveInProgress = true;
    const firstCell = game.getAllCells()[0];
    firstCell.occupied = true;
    firstCell.tower = {};
    game.nextWaveBtn.disabled = true;
    game.statusEl.textContent = 'status';
    game.resetState();
    assert.equal(game.lives, game.initialLives);
    assert.equal(game.gold, game.initialGold);
    assert.equal(game.wave, 1);
    assert.equal(game.towers.length, 0);
    assert.equal(game.enemies.length, 0);
    assert.equal(game.projectiles.length, 0);
    assert.equal(game.explosions.length, 0);
    assert.equal(game.waveInProgress, false);
    assert.equal(game.nextWaveBtn.disabled, false);
    assert.equal(firstCell.occupied, false);
    assert.equal(firstCell.tower, null);
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

    game.update(game.spawnInterval * 1000);

    globalThis.requestAnimationFrame = originalRAF;
    assert.equal(game.enemies.length, 6);
    assert.equal(game.lastTime, game.spawnInterval * 1000);
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

