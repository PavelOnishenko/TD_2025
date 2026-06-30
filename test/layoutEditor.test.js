import test from 'node:test';
import assert from 'node:assert/strict';

import Tower from '../dist/entities/Tower.js';
import {
    applyPlatformLayoutToGame,
    formatPlatformLayoutConfig,
    getEditablePlatformLayouts,
    getPlatformHandleControlDescriptors,
} from '../dist/systems/layoutEditor.js';

test('getEditablePlatformLayouts exposes platform position and independent scale values', () => {
    const game = {
        platforms: [
            { x: 10, y: 20, scale: 0.5 },
            { x: 30, y: 40, scaleX: 0.7, scaleY: 0.8 },
        ],
        gameConfig: {
            world: {
                platforms: [
                    { id: 'upper' },
                    { id: 'lower' },
                ],
            },
        },
    };

    assert.deepEqual(getEditablePlatformLayouts(game), [
        { id: 'upper', x: 10, y: 20, scaleX: 0.5, scaleY: 0.5 },
        { id: 'lower', x: 30, y: 40, scaleX: 0.7, scaleY: 0.8 },
    ]);
});

test('applyPlatformLayoutToGame moves platforms, slots, and existing towers together', () => {
    const tower = new Tower(0, 0);
    const game = {
        platforms: [
            { x: 820, y: 300, scaleX: 0.6, scaleY: 0.6 },
            { x: 445, y: 680, scaleX: 0.6, scaleY: 0.6 },
        ],
        grid: {
            topCells: [
                { x: 498.72, y: 52.58, w: 74, h: 74, occupied: true, tower },
            ],
            bottomCells: [
                { x: 123.72, y: 432.58, w: 74, h: 74, occupied: false, tower: null },
            ],
            getAllCells() {
                return [...this.topCells, ...this.bottomCells];
            },
        },
        topCells: null,
        bottomCells: null,
        computeWorldBounds: () => ({ minX: 1, maxX: 2, minY: 3, maxY: 4 }),
    };
    tower.cell = game.grid.topCells[0];
    tower.alignToCell(game.grid.topCells[0]);

    const result = applyPlatformLayoutToGame(game, [
        { id: 'upper', x: 900, y: 320, scaleX: 0.64, scaleY: 0.58 },
        { id: 'lower', x: 420, y: 700, scaleX: 0.52, scaleY: 0.67 },
    ]);

    assert.equal(result, true);
    assert.deepEqual(game.platforms[0], { x: 900, y: 320, scaleX: 0.64, scaleY: 0.58, scale: 0.64 });
    assert.equal(game.grid.topCells[0].occupied, true);
    assert.equal(game.grid.topCells[0].tower, tower);
    assert.deepEqual(
        { x: tower.center().x, y: tower.center().y },
        { x: game.grid.topCells[0].x + 37, y: game.grid.topCells[0].y + 37 },
    );
    assert.equal(game.topCells, game.grid.topCells);
    assert.equal(game.bottomCells, game.grid.bottomCells);
    assert.deepEqual(game.worldBounds, { minX: 1, maxX: 2, minY: 3, maxY: 4 });
});

test('formatPlatformLayoutConfig produces copyable TypeScript config values', () => {
    const text = formatPlatformLayoutConfig([
        { id: 'upper', x: 900, y: 320, scaleX: 0.64, scaleY: 0.58 },
        { id: 'lower', x: 420, y: 700, scaleX: 0.52, scaleY: 0.67 },
    ]);

    assert.ok(text.includes("{ id: 'upper', x: 900, y: 320, scaleX: 0.64, scaleY: 0.58 }"));
    assert.ok(text.includes("{ id: 'lower', x: 420, y: 700, scaleX: 0.52, scaleY: 0.67 }"));
});

test('platform handle descriptors put position and scale controls on the canvas', () => {
    const controls = getPlatformHandleControlDescriptors({ id: 'upper' });

    assert.deepEqual(controls.map(control => control.id), [
        'move-left',
        'move-right',
        'move-up',
        'move-down',
        'scale-x-down',
        'scale-x-up',
        'scale-y-down',
        'scale-y-up',
    ]);
    assert.equal(controls.length, 8);
    assert.ok(controls.every(control => control.title.includes('upper')));
});
