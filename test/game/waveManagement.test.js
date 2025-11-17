import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, placeTowerOnCell, withMockedRandom } from './helpers.js';
import gameConfig from '../../js/config/gameConfig.js';
import { getWaveEnergyMultiplier } from '../../js/utils/energyScaling.js';

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
    assert.ok(game.spawned >= 1);
    assert.equal(game.spawnTimer, 0);
    assert.equal(game.waveSpawnCursor, game.spawned);
    assert.ok(enemies.length >= 1);
    if (game.activeFormationPlan) {
        assert.equal(game.enemiesPerWave, game.activeFormationPlan.totalEnemies);
    }
    assert.ok(Math.abs(game.colorProbStart - game.colorProbEnd) > 0.35);
});

test('startWave restarts current wave state when already in progress', () => {
    const game = createGame();
    game.waveInProgress = true;
    game.enemies.push({}, {});
    game.spawnInterval = 123;
    game.enemiesPerWave = 456;
    game.spawned = 7;
    game.spawnTimer = 5;

    game.startWave();

    assert.equal(game.waveInProgress, true);
    assert.equal(game.spawnInterval, 123);
    assert.equal(game.enemiesPerWave, 456);
    assert.equal(game.spawned, 1);
    assert.equal(game.spawnTimer, 0);
    assert.ok(game.enemies.length >= 1);
});

test('manualMergeTowers enables merge mode and merges selected adjacent towers', () => {
    const game = createGame({ attachDom: true });
    const cellA = game.bottomCells[0];
    const cellB = game.bottomCells[1];
    const towerA = placeTowerOnCell(game, cellA);
    const towerB = placeTowerOnCell(game, cellB);

    const active = game.manualMergeTowers();
    assert.equal(active, true);
    assert.equal(game.mergeModeActive, true);

    game.selectTowerForMerge(towerA);
    game.selectTowerForMerge(towerB);

    assert.equal(game.towers.length, 1);
    assert.equal(cellA.tower, null);
    assert.equal(cellB.tower, towerB);
    assert.equal(towerB.level, 2);
});

test('manualMergeTowers skips merging during wave', () => {
    const game = createGame({ attachDom: true });
    const cellA = game.bottomCells[0];
    const cellB = game.bottomCells[1];
    placeTowerOnCell(game, cellA);
    placeTowerOnCell(game, cellB);
    game.waveInProgress = true;

    const active = game.manualMergeTowers();

    assert.equal(active, false);
    assert.equal(game.mergeModeActive, false);
    assert.equal(game.towers.length, 2);
});

test('updateMergeHints does not apply hints during active wave', () => {
    const game = createGame();
    const cellA = game.bottomCells[0];
    const cellB = game.bottomCells[1];
    const towerA = placeTowerOnCell(game, cellA);
    const towerB = placeTowerOnCell(game, cellB);

    game.waveInProgress = true;
    game.mergeModeActive = true;
    game.updateMergeHints();

    assert.equal(game.mergeHintPairs.length, 0);
    assert.equal(cellA.mergeHint, 0);
    assert.equal(cellB.mergeHint, 0);
    assert.equal(towerA.mergeHint, 0);
    assert.equal(towerB.mergeHint, 0);
});

test('updateMergeHints shows hints only while merge mode is active', () => {
    const game = createGame();
    const cellA = game.bottomCells[0];
    const cellB = game.bottomCells[1];
    const towerA = placeTowerOnCell(game, cellA);
    const towerB = placeTowerOnCell(game, cellB);

    game.updateMergeHints();
    assert.equal(game.mergeHintPairs.length, 0);
    assert.equal(cellA.mergeHint, 0);
    assert.equal(cellB.mergeHint, 0);

    game.mergeModeActive = true;
    game.updateMergeHints();

    assert.ok(game.mergeHintPairs.length > 0);
    assert.ok(cellA.mergeHint > 0);
    assert.ok(cellB.mergeHint > 0);
    assert.ok(towerA.mergeHint > 0);
    assert.ok(towerB.mergeHint > 0);
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
    assert.equal(game.energy, game.initialEnergy + gameConfig.player.energyPerWave);
    assert.equal(game.nextWaveBtn.disabled, false);
    assert.equal(game.mergeBtn.disabled, false);
});

test('checkWaveCompletion scales energy reward with wave multiplier', () => {
    const game = createGame({ attachDom: true });
    game.wave = 20;
    game.waveInProgress = true;
    game.spawned = game.enemiesPerWave;
    game.enemies = [];
    const startingEnergy = game.energy;

    game.checkWaveCompletion();

    const multiplier = getWaveEnergyMultiplier({ wave: 20 });
    const expectedGain = Math.round(gameConfig.player.energyPerWave * multiplier);
    assert.equal(game.energy, startingEnergy + expectedGain);
    assert.equal(game.energyEl.textContent, String(game.energy));
});

test('checkWaveCompletion transitions into endless mode after configured waves', () => {
    const game = createGame({ attachDom: true });
    game.wave = game.maxWaves;
    game.waveInProgress = true;
    game.spawned = game.enemiesPerWave;
    game.enemies = [];

    game.checkWaveCompletion();

    assert.equal(game.waveInProgress, false);
    assert.equal(game.wave, game.maxWaves + 1);
    assert.equal(game.endlessModeActive, true);
    assert.equal(game.gameOver, false);
    assert.equal(game.nextWaveBtn.disabled, false);
});

