import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, placeTowerOnCell, withFakeDataClient } from './helpers.js';

function primeGameForReset(game) {
    game.lives = 1;
    game.energy = 0;
    game.wave = 4;
    game.towers.push({});
    game.enemies.push({});
    game.projectiles.push({});
    game.explosions.push({ particles: [{}] });
    game.mergeAnimations.push({});
    const cell = game.getAllCells()[0];
    cell.occupied = true;
    cell.tower = {};
    game.nextWaveBtn.disabled = true;
    game.statusEl.textContent = 'status';
    game.endOverlay.classList.add = () => {};
    game.endMenu.classList.remove = () => {};
    return cell;
}

test('switchTowerColor toggles color when enough energy', () => {
    const game = createGame({ attachDom: true });
    const tower = placeTowerOnCell(game, game.bottomCells[0]);

    const switched = game.switchTowerColor(tower);

    assert.equal(switched, true);
    assert.equal(tower.color, 'blue');
    assert.equal(game.energy, game.initialEnergy - game.switchCost);
});

test('switchTowerColor rejects change when energy insufficient', () => {
    const game = createGame({ attachDom: true });
    const tower = placeTowerOnCell(game, game.bottomCells[0]);
    game.energy = 0;

    const switched = game.switchTowerColor(tower);

    assert.equal(switched, false);
    assert.equal(tower.color, 'red');
});

test('switchTowerColor rejects change during active wave', () => {
    const game = createGame({ attachDom: true });
    const tower = placeTowerOnCell(game, game.bottomCells[0]);
    game.waveInProgress = true;

    const switched = game.switchTowerColor(tower);

    assert.equal(switched, false);
    assert.equal(tower.color, 'red');
    assert.equal(game.energy, game.initialEnergy);
});

test('getPersistentState captures towers with identifiers', () => {
    const game = createGame();
    const cell = game.bottomCells[0];
    const tower = placeTowerOnCell(game, cell, { color: 'blue', level: 3 });

    const snapshot = game.getPersistentState();

    assert.equal(snapshot.towers.length, 1);
    assert.equal(snapshot.towers[0].cellId, 'bottom:0');
    assert.equal(snapshot.towers[0].color, 'blue');
    assert.equal(snapshot.towers[0].level, 3);
});

test('persistState skips saving when disabled', () => {
    const calls = [];
    withFakeDataClient({
        getItem: () => null,
        setItem: (...args) => { calls.push(args); },
        removeItem: () => {},
    }, () => {
        const game = createGame();
        game.persistenceEnabled = false;
        game.persistState();
    });

    assert.equal(calls.length, 0);
});

test('persistState saves snapshot when enabled', () => {
    const calls = [];
    withFakeDataClient({
        getItem: () => null,
        setItem: (...args) => { calls.push(args); },
        removeItem: () => {},
    }, () => {
        const game = createGame();
        game.persistState();
    });

    assert.equal(calls.length, 1);
});

test('clearSavedState delegates to data store', () => {
    const calls = [];
    withFakeDataClient({
        getItem: () => null,
        setItem: () => {},
        removeItem: (...args) => { calls.push(args); },
    }, () => {
        const game = createGame();
        game.clearSavedState();
    });

    assert.equal(calls.length, 1);
});

test('createCellIdentifier distinguishes rows', () => {
    const game = createGame();
    const bottom = game.bottomCells[0];
    const top = game.topCells[0];

    assert.equal(game.createCellIdentifier(bottom), 'bottom:0');
    assert.equal(game.createCellIdentifier(top), 'top:0');
    assert.equal(game.createCellIdentifier({}), null);
});

test('resolveCellFromState returns matching cell or null', () => {
    const game = createGame();
    const bottom = game.bottomCells[0];

    assert.equal(game.resolveCellFromState('bottom:0'), bottom);
    assert.equal(game.resolveCellFromState('top:999'), null);
    assert.equal(game.resolveCellFromState('invalid'), null);
});

test('resetState restores defaults and clears overlays', () => {
    const game = createGame({ attachDom: true });
    const cell = primeGameForReset(game);

    game.resetState();

    assert.equal(game.lives, game.initialLives);
    assert.equal(game.energy, game.initialEnergy);
    assert.equal(game.wave, 1);
    assert.equal(game.towers.length, 0);
    assert.equal(game.enemies.length, 0);
    assert.equal(game.projectiles.length, 0);
    assert.equal(game.explosions.length, 0);
    assert.equal(game.mergeAnimations.length, 0);
    assert.equal(cell.occupied, false);
    assert.equal(cell.tower, null);
    assert.equal(game.statusEl.textContent, '');
});

