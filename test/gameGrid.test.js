import test from 'node:test';
import assert from 'node:assert/strict';

import GameGrid from '../js/core/gameGrid.js';

test('constructor builds grid with expected cell positions', () => {
    const grid = new GameGrid();

    assert.strictEqual(grid.topCells.length, 6);
    assert.strictEqual(grid.bottomCells.length, 6);

    const firstTop = grid.topCells[0];
    assert.deepEqual(firstTop, {
        x: -300,
        y: 400,
        w: 120,
        h: 160,
        occupied: false,
        highlight: 0,
        mergeHint: 0,
        tower: null,
    });

    const firstBottom = grid.bottomCells[0];
    assert.deepEqual(firstBottom, {
        x: -210,
        y: 680,
        w: 120,
        h: 160,
        occupied: false,
        highlight: 0,
        mergeHint: 0,
        tower: null,
    });
});

test('createCell builds cell with provided coordinates and defaults', () => {
    const grid = new GameGrid({
        cellSize: { w: 42, h: 24 },
    });

    const cell = grid.createCell(10, 20);

    assert.deepEqual(cell, {
        x: 10,
        y: 20,
        w: 42,
        h: 24,
        occupied: false,
        highlight: 0,
        mergeHint: 0,
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
        { x: 110, y: 205, w: 30, h: 20, occupied: false, highlight: 0, mergeHint: 0, tower: null },
        { x: 95, y: 215, w: 30, h: 20, occupied: false, highlight: 0, mergeHint: 0, tower: null },
    ]);
});

test('getAllCells returns top and bottom rows in order', () => {
    const grid = new GameGrid();

    const all = grid.getAllCells();

    assert.strictEqual(all.length, grid.topCells.length + grid.bottomCells.length);
    assert.strictEqual(all[0], grid.topCells[0]);
    assert.strictEqual(all[grid.topCells.length], grid.bottomCells[0]);
});

test('getAllCells returns a copy of internal storage', () => {
    const grid = new GameGrid();

    const snapshot = grid.getAllCells();
    snapshot.pop();

    assert.strictEqual(grid.topCells.length, 6);
    assert.strictEqual(grid.bottomCells.length, 6);

    const refreshed = grid.getAllCells();
    assert.strictEqual(refreshed.length, 12);
});

test('forEachCell iterates over every cell', () => {
    const grid = new GameGrid();
    const visited = new Set();

    grid.forEachCell(cell => {
        visited.add(cell);
    });

    assert.strictEqual(visited.size, grid.topCells.length + grid.bottomCells.length);
    for (const cell of grid.topCells) {
        assert.ok(visited.has(cell));
    }
    for (const cell of grid.bottomCells) {
        assert.ok(visited.has(cell));
    }
});

test('resetCells clears occupancy, highlight and tower references', () => {
    const grid = new GameGrid();
    const topCell = grid.topCells[0];
    const bottomCell = grid.bottomCells[0];
    topCell.occupied = true;
    topCell.highlight = 0.5;
    topCell.tower = {};
    topCell.mergeHint = 1;
    bottomCell.occupied = true;
    bottomCell.highlight = 0.7;
    bottomCell.tower = {};
    bottomCell.mergeHint = 0.4;

    grid.resetCells();

    assert.strictEqual(topCell.occupied, false);
    assert.strictEqual(topCell.highlight, 0);
    assert.strictEqual(topCell.mergeHint, 0);
    assert.strictEqual(topCell.tower, null);
    assert.strictEqual(bottomCell.occupied, false);
    assert.strictEqual(bottomCell.highlight, 0);
    assert.strictEqual(bottomCell.mergeHint, 0);
    assert.strictEqual(bottomCell.tower, null);
});

test('fadeHighlights decreases highlight values but never below zero', () => {
    const grid = new GameGrid();
    grid.topCells[0].highlight = 0.3;
    grid.topCells[1].highlight = 0.05;
    grid.topCells[2].highlight = 0;

    grid.fadeHighlights(0.1);

    assert.ok(Math.abs(grid.topCells[0].highlight - 0.2) < 1e-6);
    assert.strictEqual(grid.topCells[1].highlight, 0);
    assert.strictEqual(grid.topCells[2].highlight, 0);
});

test('fadeMergeHints decreases merge hints smoothly', () => {
    const grid = new GameGrid();
    grid.bottomCells[0].mergeHint = 0.9;
    grid.bottomCells[1].mergeHint = 0.1;
    grid.bottomCells[2].mergeHint = 0;

    grid.fadeMergeHints(0.2);

    assert.ok(Math.abs(grid.bottomCells[0].mergeHint - 0.4) < 1e-6);
    assert.strictEqual(grid.bottomCells[1].mergeHint, 0);
    assert.strictEqual(grid.bottomCells[2].mergeHint, 0);
});
