import test from 'node:test';
import assert from 'node:assert/strict';

import {
    PLATFORM_SPRITE_PATH,
    createPlatformConfigs,
    createPlatformGridConfig,
} from '../dist/core/platformLayout.js';
import { createPlatforms } from '../dist/core/platforms.js';
import GameGrid from '../dist/core/gameGrid.js';

const NEW_PLATFORM_SPRITE_PATH = 'assets/images/platform.png';

const EXPECTED_PLATFORM_CONFIGS = [
    { id: 'upper', x: 700, y: 260, scale: 0.36 },
    { id: 'lower', x: 355, y: 607, scale: 0.36 },
];

const EXPECTED_GRID_CONFIG = {
    cellSize: { w: 74, h: 74 },
    topOrigin: { x: 402, y: 155 },
    bottomOrigin: { x: 58, y: 500 },
    topOffsets: [
        { x: 0, y: 0 },
        { x: 104, y: 28 },
        { x: 208, y: 56 },
        { x: 312, y: 84 },
        { x: 416, y: 112 },
        { x: 520, y: 140 },
    ],
    bottomOffsets: [
        { x: 0, y: 0 },
        { x: 104, y: 28 },
        { x: 208, y: 56 },
        { x: 312, y: 84 },
        { x: 416, y: 112 },
        { x: 520, y: 140 },
    ],
};

test('platform layout uses the supplied installation-platform sprite', () => {
    assert.equal(PLATFORM_SPRITE_PATH, NEW_PLATFORM_SPRITE_PATH);
});

test('platform layout places two floating platforms around the diagonal enemy path', () => {
    const platforms = createPlatformConfigs();

    assert.deepEqual(platforms, EXPECTED_PLATFORM_CONFIGS);
    assert.ok(platforms[0].x > platforms[1].x, 'upper platform should sit to the right of the lower platform');
    assert.ok(platforms[0].y < platforms[1].y, 'upper platform should sit above the lower platform');
});

test('platform layout provides six diagonal tower slots on each platform', () => {
    const gridConfig = createPlatformGridConfig();

    assert.deepEqual(gridConfig, EXPECTED_GRID_CONFIG);
    assert.equal(gridConfig.topOffsets.length, 6);
    assert.equal(gridConfig.bottomOffsets.length, 6);

    for (const offsets of [gridConfig.topOffsets, gridConfig.bottomOffsets]) {
        for (let index = 1; index < offsets.length; index++) {
            assert.equal(offsets[index].x - offsets[index - 1].x, 104);
            assert.equal(offsets[index].y - offsets[index - 1].y, 28);
        }
    }
});

test('default GameGrid uses the diagonal platform slot layout', () => {
    const grid = new GameGrid();

    assert.deepEqual(grid.topCells.map(({ x, y, w, h }) => ({ x, y, w, h })), [
        { x: 402, y: 155, w: 74, h: 74 },
        { x: 506, y: 183, w: 74, h: 74 },
        { x: 610, y: 211, w: 74, h: 74 },
        { x: 714, y: 239, w: 74, h: 74 },
        { x: 818, y: 267, w: 74, h: 74 },
        { x: 922, y: 295, w: 74, h: 74 },
    ]);
    assert.deepEqual(grid.bottomCells.map(({ x, y, w, h }) => ({ x, y, w, h })), [
        { x: 58, y: 500, w: 74, h: 74 },
        { x: 162, y: 528, w: 74, h: 74 },
        { x: 266, y: 556, w: 74, h: 74 },
        { x: 370, y: 584, w: 74, h: 74 },
        { x: 474, y: 612, w: 74, h: 74 },
        { x: 578, y: 640, w: 74, h: 74 },
    ]);
});

test('createPlatforms can consume explicit platform centers from the layout', () => {
    const platforms = createPlatforms({
        width: 540,
        height: 960,
        platformConfigs: createPlatformConfigs(),
    });

    assert.deepEqual(platforms.map(({ x, y, scale }) => ({ x, y, scale })), [
        { x: 700, y: 260, scale: 0.36 },
        { x: 355, y: 607, scale: 0.36 },
    ]);
});
