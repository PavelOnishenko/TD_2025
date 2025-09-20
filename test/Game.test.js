import test from 'node:test';
import assert from 'node:assert/strict';
import Game from '../src/Game.js';
import Tower from '../src/Tower.js';

function makeFakeCanvas() {
    return {
        width: 540,
        height: 960,
        getContext: () => ({
            fillRect: () => {},
            clearRect: () => {},
            beginPath: () => {},
            arc: () => {},
            fill: () => {},
            stroke: () => {},
            strokeRect: () => {},
            drawImage: () => {},
        }),
    };
}

function attachDomStubs(game) {
    game.livesEl = { textContent: '' };
    game.goldEl = { textContent: '' };
    game.waveEl = { textContent: '' };
    game.statusEl = { textContent: '', style: {} };
    game.tipEl = { textContent: '' };
    game.nextWaveBtn = { disabled: false };
    game.cooldownEl = { textContent: '' };
}

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

test('game constructor creates grid and attaches context without options', () => {
    const game = new Game(makeFakeCanvas());
    assert.equal(game.getAllCells().length, 12);
    assert.equal(game.grid.length, 12);
    const refCtx = game.canvas.getContext('2d');
    assert.deepEqual(
        Object.keys(game.ctx).sort(),
        Object.keys(refCtx).sort()
    );
});

test('getTowerAt returns tower bound to a cell', () => {
    const game = new Game(makeFakeCanvas());
    const cell = game.topCells[0];
    const tower = placeTowerOnCell(game, cell, {});

    assert.equal(game.getTowerAt(cell), tower);
    assert.equal(cell.tower, tower);
    assert.equal(tower.cell, cell);
});

test('mergeTowers upgrades tower and frees merged cell', () => {
    const game = new Game(makeFakeCanvas());
    const [cellA, cellB] = game.bottomCells;
    const towerA = placeTowerOnCell(game, cellA);
    const towerB = placeTowerOnCell(game, cellB);

    towerB.color = towerA.color;
    towerB.level = towerA.level;

    const towersBefore = game.towers.length;
    game.mergeTowers(game.bottomCells);

    assert.equal(game.towers.length, towersBefore - 1);
    assert.equal(cellA.tower, towerA);
    assert.equal(cellA.occupied, true);
    assert.equal(cellB.tower, null);
    assert.equal(cellB.occupied, false);
    assert.equal(towerA.level, 2);
    assert.ok(towerA.range > towerA.baseRange);
});

test('mergeTowers ignores towers with different color or level', () => {
    const game = new Game(makeFakeCanvas());
    const [cellA, cellB] = game.topCells;
    const towerA = placeTowerOnCell(game, cellA, { color: 'red', level: 1 });
    const towerB = placeTowerOnCell(game, cellB, { color: 'blue', level: 1 });

    game.mergeTowers(game.topCells);
    assert.equal(cellA.tower, towerA);
    assert.equal(cellB.tower, towerB);
    assert.equal(towerA.level, 1);
    assert.equal(towerB.level, 1);

    towerB.color = 'red';
    towerB.level = 2;
    game.mergeTowers(game.topCells);
    assert.equal(cellA.tower, towerA);
    assert.equal(cellB.tower, towerB);
});

test('checkWaveCompletion merges towers and advances wave', () => {
    const game = new Game(makeFakeCanvas());
    attachDomStubs(game);
    const [cellA, cellB] = game.bottomCells;
    placeTowerOnCell(game, cellA, { color: 'red' });
    const towerB = placeTowerOnCell(game, cellB, { color: 'red' });
    towerB.level = 1;

    game.waveInProgress = true;
    game.spawned = game.enemiesPerWave;
    game.enemies = [];

    const initialGold = game.gold;
    game.checkWaveCompletion();

    assert.equal(game.waveInProgress, false);
    assert.equal(game.wave, 2);
    assert.equal(game.gold, initialGold + 3);
    assert.equal(cellB.tower, null);
    assert.equal(cellB.occupied, false);
});

test('resetState clears towers and cell references', () => {
    const game = new Game(makeFakeCanvas());
    attachDomStubs(game);
    const cell = game.topCells[0];
    const tower = placeTowerOnCell(game, cell);

    game.resetState();

    assert.equal(game.towers.length, 0);
    assert.equal(cell.occupied, false);
    assert.equal(cell.tower, null);
    assert.equal(tower.cell, null);
});
