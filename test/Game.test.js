import test from 'node:test';
import assert from 'node:assert/strict';
import Game from '../src/Game.js';

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
    game.placeTowerBtn = { classList: { remove: () => {} }, disabled: false };
}

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
    let called = 0;
    game.spawnEnemy = () => { called++; };
    game.spawnEnemiesIfNeeded(0);
    assert.equal(called, 1);
    assert.equal(game.spawnTimer, 0);
});

test('spawnEnemiesIfNeeded accumulates timer when below interval', () => {
    const game = new Game(makeFakeCanvas());
    game.waveInProgress = true;
    let called = 0;
    game.spawnEnemy = () => { called++; };
    game.spawnEnemiesIfNeeded(0.2);
    assert.equal(called, 0);
    assert.ok(game.spawnTimer > 0);
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
    game.buildMode = true;
    game.hoverCell = {};
    game.grid[0].occupied = true;
    game.nextWaveBtn.disabled = true;
    game.placeTowerBtn.disabled = true;
    game.statusEl.textContent = 'status';
    game.resetState();
    assert.equal(game.lives, game.initialLives);
    assert.equal(game.gold, game.initialGold);
    assert.equal(game.wave, 1);
    assert.equal(game.towers.length, 0);
    assert.equal(game.enemies.length, 0);
    assert.equal(game.projectiles.length, 0);
    assert.equal(game.waveInProgress, false);
    assert.equal(game.buildMode, false);
    assert.equal(game.hoverCell, null);
    assert.equal(game.nextWaveBtn.disabled, false);
    assert.equal(game.placeTowerBtn.disabled, false);
    assert.equal(game.grid[0].occupied, false);
    assert.equal(game.statusEl.textContent, '');
});

