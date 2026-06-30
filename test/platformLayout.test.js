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
    { id: 'upper', x: 820, y: 300, scaleX: 0.6, scaleY: 0.6 },
    { id: 'lower', x: 445, y: 680, scaleX: 0.6, scaleY: 0.6 },
];

const EXPECTED_GRID_CONFIG = {
    cellSize: { w: 74, h: 74 },
    topOrigin: { x: 498.72, y: 52.58 },
    bottomOrigin: { x: 123.72, y: 432.58 },
    topOffsets: [
        { x: 0, y: 0 },
        { x: 107.64, y: 55.98 },
        { x: 222.6, y: 119.58 },
        { x: 333.12, y: 177.96 },
        { x: 448.8, y: 239.88 },
        { x: 562.8, y: 302.76 },
    ],
    bottomOffsets: [
        { x: 0, y: 0 },
        { x: 107.64, y: 55.98 },
        { x: 222.6, y: 119.58 },
        { x: 333.12, y: 177.96 },
        { x: 448.8, y: 239.88 },
        { x: 562.8, y: 302.76 },
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
        x: platform.x - PLATFORM_SPRITE_SIZE.width * platform.scaleX / 2,
        y: platform.y - PLATFORM_SPRITE_SIZE.height * platform.scaleY / 2,
    };
}

function expectedCellPositionsForPlatform(platform) {
    const origin = platformTopLeft(platform);
    const halfSlot = EXPECTED_GRID_CONFIG.cellSize.w / 2;
    return PAINTED_PAD_CENTERS.map(pad => ({
        x: Number((origin.x + pad.x * platform.scaleX - halfSlot).toFixed(1)),
        y: Number((origin.y + pad.y * platform.scaleY - halfSlot).toFixed(1)),
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

function platformBounds(platform) {
    const width = PLATFORM_SPRITE_SIZE.width * platform.scaleX;
    const height = PLATFORM_SPRITE_SIZE.height * platform.scaleY;
    return {
        left: platform.x - width / 2,
        right: platform.x + width / 2,
        top: platform.y - height / 2,
        bottom: platform.y + height / 2,
        width,
        height,
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

test('platforms are fake-shot sized and overlap across the playfield width', () => {
    const [upperPlatform, lowerPlatform] = createPlatformConfigs();
    const upper = platformBounds(upperPlatform);
    const lower = platformBounds(lowerPlatform);
    const combinedLeft = Math.min(upper.left, lower.left);
    const combinedRight = Math.max(upper.right, lower.right);

    assert.ok(upper.width >= 1000, 'each platform should be close to half-screen width');
    assert.equal(upper.width, lower.width);
    assert.ok(upper.left < lower.right, 'platform x-spans should overlap');
    assert.ok(lower.left < upper.right, 'platform x-spans should overlap');
    assert.ok(combinedRight - combinedLeft >= 1350, 'two platforms should cover most of the screen width together');
    assert.ok(lower.left < 0, 'lower platform should be partly clipped by the left edge like the fake shot');
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

test('platform grid derives slot positions from independent platform scale axes', () => {
    const upperPlatform = { id: 'upper', x: 900, y: 320, scaleX: 0.64, scaleY: 0.58 };
    const lowerPlatform = { id: 'lower', x: 420, y: 700, scaleX: 0.52, scaleY: 0.67 };
    const gridConfig = createPlatformGridConfig([
        upperPlatform,
        lowerPlatform,
    ]);
    const expectedTop = expectedCellPositionsForPlatform(upperPlatform);
    const expectedBottom = expectedCellPositionsForPlatform(lowerPlatform);

    assert.deepEqual(
        expectedTop.map(normalizeCellPosition),
        gridConfig.topOffsets.map(offset => normalizeCellPosition({
            x: gridConfig.topOrigin.x + offset.x,
            y: gridConfig.topOrigin.y + offset.y,
            w: gridConfig.cellSize.w,
            h: gridConfig.cellSize.h,
        })),
    );
    assert.deepEqual(
        expectedBottom.map(normalizeCellPosition),
        gridConfig.bottomOffsets.map(offset => normalizeCellPosition({
            x: gridConfig.bottomOrigin.x + offset.x,
            y: gridConfig.bottomOrigin.y + offset.y,
            w: gridConfig.cellSize.w,
            h: gridConfig.cellSize.h,
        })),
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

    assert.deepEqual(platforms.map(({ x, y, scaleX, scaleY }) => ({ x, y, scaleX, scaleY })), [
        { x: 820, y: 300, scaleX: 0.6, scaleY: 0.6 },
        { x: 445, y: 680, scaleX: 0.6, scaleY: 0.6 },
    ]);
});
