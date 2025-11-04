import test from 'node:test';
import assert from 'node:assert/strict';

import {
    computeDisplaySize,
    createViewport,
    getCrazyGamesUser,
    resizeCanvas,
} from '../js/main.js';

test('computeDisplaySize multiplies viewport metrics by dpr', () => {
    const metrics = { width: 123.4, height: 567.8, dpr: 1.75 };

    const display = computeDisplaySize(metrics);

    assert.deepEqual(display, {
        displayWidth: Math.round(metrics.width * metrics.dpr),
        displayHeight: Math.round(metrics.height * metrics.dpr),
        dpr: metrics.dpr,
    });
});

test('createViewport centers logical canvas inside display size', () => {
    const displaySize = { displayWidth: 800, displayHeight: 600, dpr: 2 };

    const viewport = createViewport(displaySize, { logicalWidth: 400, logicalHeight: 400 });

    assert.equal(viewport.scale, 1.5);
    assert.equal(viewport.offsetX, 100);
    assert.equal(viewport.offsetY, 0);
    assert.equal(viewport.dpr, displaySize.dpr);
    assert.deepEqual(viewport.worldBounds, { minX: 0, maxX: 400, minY: 0, maxY: 400 });
});

test('createViewport centers gameplay bounds and offsets world minimums', () => {
    const displaySize = { displayWidth: 800, displayHeight: 600, dpr: 1 };
    const worldBounds = { minX: -100, maxX: 500, minY: 200, maxY: 800 };

    const viewport = createViewport(displaySize, { worldBounds, logicalWidth: 400, logicalHeight: 400 });

    assert.equal(viewport.scale, 1);
    assert.equal(viewport.offsetX, 200);
    assert.equal(viewport.offsetY, -200);
    assert.deepEqual(viewport.worldBounds, worldBounds);
});

test('resizeCanvas updates DOM elements and returns viewport', () => {
    const canvasElement = { style: {}, width: 0, height: 0 };
    const containerElement = { style: {} };
    const gameInstance = {
        computeWorldBounds: () => ({ minX: -100, maxX: 500, minY: 200, maxY: 800 }),
        logicalW: 540,
        logicalH: 960,
    };
    const metrics = { width: 320, height: 640, dpr: 2 };

    const viewport = resizeCanvas({
        canvasElement,
        gameContainerElement: containerElement,
        gameInstance,
        metrics,
    });

    assert.equal(containerElement.style.width, '320px');
    assert.equal(containerElement.style.height, '640px');
    assert.equal(canvasElement.style.width, '320px');
    assert.equal(canvasElement.style.height, '640px');
    assert.equal(canvasElement.width, Math.round(metrics.width * metrics.dpr));
    assert.equal(canvasElement.height, Math.round(metrics.height * metrics.dpr));
    assert.deepEqual(canvasElement.viewportTransform, viewport);
    assert.deepEqual(gameInstance.viewport, viewport);
    assert.deepEqual(gameInstance.worldBounds, viewport.worldBounds);

    const expected = createViewport(
        computeDisplaySize(metrics),
        {
            worldBounds: gameInstance.worldBounds,
            logicalWidth: gameInstance.logicalW,
            logicalHeight: gameInstance.logicalH,
        },
    );
    assert.deepEqual(viewport, expected);
});

test('getCrazyGamesUser returns null when integration inactive', async () => {
    const result = await getCrazyGamesUser({ crazyGamesActive: false });

    assert.equal(result, null);
});

test('getCrazyGamesUser returns sanitized user info', async () => {
    const fakeWindow = {
        CrazyGames: {
            SDK: {
                user: {
                    isUserAccountAvailable: true,
                    async getUser() {
                        return { username: 'Alice', profilePictureUrl: 'url://avatar' };
                    },
                },
            },
        },
    };

    const result = await getCrazyGamesUser({ crazyGamesActive: true, crazyGamesWindow: fakeWindow });

    assert.deepEqual(result, { username: 'Alice', profilePictureUrl: 'url://avatar' });
});

test('getCrazyGamesUser handles SDK failures gracefully', async () => {
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (message) => {
        warnings.push(message);
    };

    try {
        const fakeWindow = {
            CrazyGames: {
                SDK: {
                    user: {
                        isUserAccountAvailable: true,
                        async getUser() {
                            throw new Error('network');
                        },
                    },
                },
            },
        };

        const result = await getCrazyGamesUser({ crazyGamesActive: true, crazyGamesWindow: fakeWindow });

        assert.equal(result, null);
        assert.ok(warnings.length >= 1);
    } finally {
        console.warn = originalWarn;
    }
});
