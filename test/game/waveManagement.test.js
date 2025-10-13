import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, placeTowerOnCell, withMockedRandom } from './helpers.js';

test('startWave initializes counters and spawns first enemies', () => {
    const game = createGame({ attachDom: true });
    game.enemies.push({});
    game.spawned = 5;
    game.spawnTimer = 1;

    const enemies = withMockedRandom([0.1, 0.8, 0.2, 0.9], () => {
        game.startWave();
        return game.enemies.slice();
    });

    assert.equal(game.waveInProgress, true);
    assert.equal(game.nextWaveBtn.disabled, true);
    assert.equal(game.spawned, 1);
    assert.equal(game.spawnTimer, 0);
    assert.equal(enemies.length, 3);
    assert.ok(Math.abs(game.colorProbStart - game.colorProbEnd) > 0.35);
});

test('startWave exits early when already in progress', () => {
    const game = createGame();
    game.waveInProgress = true;
    game.enemies.push({});

    game.startWave();

    assert.equal(game.enemies.length, 1);
});

test('manualMergeTowers merges adjacent towers of same color and level', () => {
    const game = createGame({ attachDom: true });
    const cellA = game.bottomCells[0];
    const cellB = game.bottomCells[1];
    const towerA = placeTowerOnCell(game, cellA);
    const towerB = placeTowerOnCell(game, cellB);

    game.manualMergeTowers();

    assert.equal(game.towers.length, 1);
    assert.equal(cellA.tower, towerA);
    assert.equal(cellB.tower, null);
    assert.equal(towerA.level, 2);
});

test('manualMergeTowers skips merging during wave', () => {
    const game = createGame({ attachDom: true });
    const cellA = game.bottomCells[0];
    const cellB = game.bottomCells[1];
    placeTowerOnCell(game, cellA);
    placeTowerOnCell(game, cellB);
    game.waveInProgress = true;

    game.manualMergeTowers();

    assert.equal(game.towers.length, 2);
});

test('checkWaveCompletion unlocks merge and next wave buttons', () => {
    const game = createGame({ attachDom: true });
    game.waveInProgress = true;
    game.spawned = game.enemiesPerWave;
    game.enemies = [];
    game.nextWaveBtn.disabled = true;
    game.mergeBtn.disabled = true;

    game.checkWaveCompletion();

    assert.equal(game.waveInProgress, false);
    assert.equal(game.wave, 2);
    assert.equal(game.energy, game.initialEnergy + 3);
    assert.equal(game.nextWaveBtn.disabled, false);
    assert.equal(game.mergeBtn.disabled, false);
});

test('checkWaveCompletion triggers win on final wave', () => {
    const game = createGame({ attachDom: true });
    game.wave = game.maxWaves;
    game.waveInProgress = true;
    game.spawned = game.enemiesPerWave;
    game.enemies = [];

    game.checkWaveCompletion();

    assert.equal(game.statusEl.textContent, 'All waves cleared!');
    assert.equal(game.gameOver, true);
    assert.equal(game.mergeBtn.disabled, true);
});

