import test from 'node:test';
import assert from 'node:assert/strict';

import GameGrid from '../js/core/gameGrid.js';

test('constructor builds grid with expected cell positions', () => {
    const grid = new GameGrid();

    assert.equal(grid.topCells.length, 6);
    assert.equal(grid.bottomCells.length, 6);

    const firstTop = grid.topCells[0];
    assert.deepEqual(firstTop, {
        x: 70,
        y: 140,
        w: 40,
        h: 24,
        occupied: false,
        highlight: 0,
        tower: null,
    });

    const firstBottom = grid.bottomCells[0];
    assert.deepEqual(firstBottom, {
        x: 80,
        y: 480,
        w: 40,
        h: 24,
        occupied: false,
        highlight: 0,
        tower: null,
    });
});

test('createRow positions cells relative to origin', () => {
    const grid = new GameGrid({
        cellSize: { w: 30, h: 20 },
        topOrigin: { x: 0, y: 0 },
        bottomOrigin: { x: 0, y: 0 },
    });

    const origin = { x: 100, y: 200 };
    const offsets = [
        { x: 10, y: 5 },
        { x: -5, y: 15 },
    ];

    const row = grid.createRow(origin, offsets);

    assert.deepEqual(row, [
        { x: 110, y: 205, w: 30, h: 20, occupied: false, highlight: 0, tower: null },
        { x: 95, y: 215, w: 30, h: 20, occupied: false, highlight: 0, tower: null },
    ]);
});

test('getAllCells returns top and bottom rows in order', () => {
    const grid = new GameGrid();

    const all = grid.getAllCells();

    assert.equal(all.length, grid.topCells.length + grid.bottomCells.length);
    assert.equal(all[0], grid.topCells[0]);
    assert.equal(all[grid.topCells.length], grid.bottomCells[0]);
});

test('forEachCell iterates over every cell', () => {
    const grid = new GameGrid();
    const visited = new Set();

    grid.forEachCell(cell => {
        visited.add(cell);
    });

    assert.equal(visited.size, grid.topCells.length + grid.bottomCells.length);
    for (const cell of grid.topCells) {
        assert.ok(visited.has(cell));
    }
    for (const cell of grid.bottomCells) {
        assert.ok(visited.has(cell));
    }
});

test('resetCells clears occupancy, highlight and tower references', () => {
    const grid = new GameGrid();
    const target = grid.topCells[0];
    target.occupied = true;
    target.highlight = 0.5;
    target.tower = {};

    grid.resetCells();

    assert.equal(target.occupied, false);
    assert.equal(target.highlight, 0);
    assert.equal(target.tower, null);
});

test('fadeHighlights decreases highlight values but never below zero', () => {
    const grid = new GameGrid();
    grid.topCells[0].highlight = 0.3;
    grid.topCells[1].highlight = 0.05;
    grid.topCells[2].highlight = 0;

    grid.fadeHighlights(0.1);

    assert.ok(Math.abs(grid.topCells[0].highlight - 0.2) < 1e-6);
    assert.equal(grid.topCells[1].highlight, 0);
    assert.equal(grid.topCells[2].highlight, 0);
});
