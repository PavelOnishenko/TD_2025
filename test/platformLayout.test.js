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
    topOrigin: { x: 492.4, y: 96.7 },
    bottomOrigin: { x: 147.4, y: 443.7 },
    topOffsets: [
        { x: 0, y: 0 },
        { x: 64.6, y: 33.6 },
        { x: 133.6, y: 71.8 },
        { x: 199.9, y: 106.8 },
        { x: 269.3, y: 144.0 },
        { x: 337.7, y: 181.7 },
    ],
    bottomOffsets: [
        { x: 0, y: 0 },
        { x: 64.6, y: 33.6 },
        { x: 133.6, y: 71.8 },
        { x: 199.9, y: 106.8 },
        { x: 269.3, y: 144.0 },
        { x: 337.7, y: 181.7 },
    ],
};

const PLATFORM_SPRITE_SIZE = { width: 1680, height: 1067 };

const PAINTED_PAD_CENTERS = [
    { x: 366.2, y: 182.8 },
    { x: 545.6, y: 276.1 },
    { x: 737.2, y: 382.1 },
    { x: 921.4, y: 479.4 },
    { x: 1114.2, y: 582.6 },
    { x: 1304.2, y: 687.4 },
];

function platformTopLeft(platform) {
    return {
        x: platform.x - PLATFORM_SPRITE_SIZE.width * platform.scale / 2,
        y: platform.y - PLATFORM_SPRITE_SIZE.height * platform.scale / 2,
    };
}

function expectedCellPositionsForPlatform(platform) {
    const origin = platformTopLeft(platform);
    const halfSlot = EXPECTED_GRID_CONFIG.cellSize.w / 2;
    return PAINTED_PAD_CENTERS.map(pad => ({
        x: Number((origin.x + pad.x * platform.scale - halfSlot).toFixed(1)),
        y: Number((origin.y + pad.y * platform.scale - halfSlot).toFixed(1)),
        w: EXPECTED_GRID_CONFIG.cellSize.w,
        h: EXPECTED_GRID_CONFIG.cellSize.h,
    }));
}

function normalizeCellPosition({ x, y, w, h }) {
    return {
        x: Number(x.toFixed(1)),
        y: Number(y.toFixed(1)),
        w,
        h,
    };
}

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

    assert.deepEqual(
        gridConfig.topOffsets,
        gridConfig.bottomOffsets,
        'both platform rows should dock to identical painted pad positions',
    );
});

test('default GameGrid docks blue slot centers to the painted platform pads', () => {
    const grid = new GameGrid();
    const [upperPlatform, lowerPlatform] = createPlatformConfigs();

    assert.deepEqual(
        grid.topCells.map(normalizeCellPosition),
        expectedCellPositionsForPlatform(upperPlatform),
    );
    assert.deepEqual(
        grid.bottomCells.map(normalizeCellPosition),
        expectedCellPositionsForPlatform(lowerPlatform),
    );
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
