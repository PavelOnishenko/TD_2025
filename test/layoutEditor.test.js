import test from 'node:test';
import assert from 'node:assert/strict';

import Tower from '../dist/entities/Tower.js';
import {
    applyPlatformLayoutToGame,
    formatLayoutEditorConfig,
    formatPlatformLayoutConfig,
    getEditablePlatformLayouts,
    getLayoutEditorTargets,
    getLayoutEditorTargetControlDescriptors,
    getPlatformHandleControlDescriptors,
    getPlatformHandleScreenPoint,
    selectLayoutEditorTargetAt,
    applyLayoutEditorTargetPatch,
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

test('formatLayoutEditorConfig includes platform portal spawn and base values', () => {
    const game = {
        platforms: [
            { x: 820, y: 300, scaleX: 0.6, scaleY: 0.6 },
            { x: 425, y: 680, scaleX: 0.62, scaleY: 0.58 },
        ],
        portal: {
            position: { x: -420, y: -40 },
            radiusX: 130,
            radiusY: 270,
        },
        layoutSpawnPoint: { x: -380, y: 20 },
        base: { x: 1320, y: 820, w: 160, h: 160 },
        gameConfig: {
            world: {
                platforms: [
                    { id: 'upper' },
                    { id: 'lower' },
                ],
            },
        },
    };

    const text = formatLayoutEditorConfig(game);

    assert.ok(text.includes("platforms: ["));
    assert.ok(text.includes("{ id: 'upper', x: 820, y: 300, scaleX: 0.6, scaleY: 0.6 }"));
    assert.ok(text.includes("portal: { x: -420, y: -40, scaleX: 1, scaleY: 1 }"));
    assert.ok(text.includes("spawn: { x: -380, y: 20 }"));
    assert.ok(text.includes("base: { x: 1320, y: 820, scaleX: 1, scaleY: 1 }"));
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

test('platform handle screen points stay fixed while platform layouts move', () => {
    const game = {
        viewport: {
            offsetX: 0,
            offsetY: 0,
            scale: 1,
        },
    };
    const upper = { id: 'upper', x: 820, y: 300, scaleX: 0.6, scaleY: 0.6 };
    const movedUpper = { ...upper, x: 620, y: 520, scaleX: 0.75, scaleY: 0.5 };
    const lower = { id: 'lower', x: 425, y: 680, scaleX: 0.6, scaleY: 0.6 };

    assert.deepEqual(
        getPlatformHandleScreenPoint(game, upper, 0, 2),
        getPlatformHandleScreenPoint(game, movedUpper, 0, 2),
    );
    assert.notDeepEqual(
        getPlatformHandleScreenPoint(game, upper, 0, 2),
        getPlatformHandleScreenPoint(game, lower, 1, 2),
    );
});

test('layout editor exposes selectable platforms portal spawn and base targets', () => {
    const game = {
        platforms: [
            { x: 100, y: 120, scaleX: 0.5, scaleY: 0.6 },
            { x: 300, y: 360, scaleX: 0.7, scaleY: 0.8 },
        ],
        portal: {
            position: { x: -40, y: -20 },
            radiusX: 80,
            radiusY: 120,
        },
        base: { x: 900, y: 700, w: 140, h: 150 },
        getDefaultEnemyCoords: () => ({ x: -120, y: 40 }),
        gameConfig: {
            world: {
                platforms: [
                    { id: 'upper' },
                    { id: 'lower' },
                ],
            },
        },
    };

    const targets = getLayoutEditorTargets(game);

    assert.deepEqual(targets.map(target => target.id), ['platform:upper', 'platform:lower', 'portal', 'spawn', 'base']);
    assert.deepEqual(targets.map(target => target.label), ['Platform 1', 'Platform 2', 'Portal', 'Spawn point', 'Base']);
});

test('layout editor target hit testing selects objects and clears on empty space', () => {
    const game = {
        platforms: [
            { x: 100, y: 120, scaleX: 0.5, scaleY: 0.6 },
            { x: 300, y: 360, scaleX: 0.7, scaleY: 0.8 },
        ],
        portal: {
            position: { x: -40, y: -20 },
            radiusX: 80,
            radiusY: 120,
        },
        base: { x: 900, y: 700, w: 140, h: 150 },
        getDefaultEnemyCoords: () => ({ x: -120, y: 40 }),
    };

    assert.equal(selectLayoutEditorTargetAt(game, { x: -40, y: -20 })?.id, 'portal');
    assert.equal(selectLayoutEditorTargetAt(game, { x: -120, y: 40 })?.id, 'spawn');
    assert.equal(selectLayoutEditorTargetAt(game, { x: 940, y: 760 })?.id, 'base');
    assert.equal(selectLayoutEditorTargetAt(game, { x: 5000, y: 5000 }), null);
});

test('layout editor target patches move and scale selected portal spawn and base', () => {
    const game = {
        layoutSpawnPoint: { x: -120, y: 40 },
        portal: {
            spawn: { x: -120, y: 40 },
            anchor: { x: -120, y: 40 },
            offset: { x: 80, y: 60 },
            position: { x: -40, y: 100 },
            radiusX: 80,
            radiusY: 120,
        },
        base: { x: 900, y: 700, w: 140, h: 150 },
        computeWorldBounds: () => ({ minX: -200, maxX: 1100, minY: -100, maxY: 900 }),
    };

    assert.equal(applyLayoutEditorTargetPatch(game, 'portal', { x: -10, y: 120, scaleX: 1.5, scaleY: 0.5 }), true);
    assert.deepEqual(game.portal.position, { x: -10, y: 120 });
    assert.deepEqual(game.portal.offset, { x: 110, y: 80 });
    assert.equal(game.portal.radiusX, 120);
    assert.equal(game.portal.radiusY, 60);

    assert.equal(applyLayoutEditorTargetPatch(game, 'spawn', { x: -90, y: 55 }), true);
    assert.deepEqual(game.layoutSpawnPoint, { x: -90, y: 55 });

    assert.equal(applyLayoutEditorTargetPatch(game, 'base', { x: 920, y: 710, scaleX: 0.5, scaleY: 2 }), true);
    assert.deepEqual(game.base, { x: 920, y: 710, w: 70, h: 300 });
    assert.deepEqual(game.worldBounds, { minX: -200, maxX: 1100, minY: -100, maxY: 900 });
});

test('layout editor target controls patch the selected target position and scale', () => {
    const target = { id: 'portal', label: 'Portal', x: 10, y: 20, scaleX: 1, scaleY: 1 };
    const controls = getLayoutEditorTargetControlDescriptors(target);

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
    assert.deepEqual(controls.find(control => control.id === 'move-right').patch(target), { x: 20 });
    assert.deepEqual(controls.find(control => control.id === 'scale-y-up').patch(target), { scaleY: 1.02 });
    assert.ok(controls.every(control => control.title.includes('Portal')));
});
