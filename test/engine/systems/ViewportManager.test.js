import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getViewportMetrics,
    computeDisplaySize,
    createViewport,
    resizeCanvas,
    __testResolveDimension,
    __testNormalizeBounds,
} from '../../../engine/systems/ViewportManager.js';
import { makeFakeWindow, makeFakeCanvas } from '../helpers.js';

test('getViewportMetrics returns window dimensions and dpr', () => {
    const fakeWindow = makeFakeWindow(1024, 768, 2);

    const result = getViewportMetrics(fakeWindow);

    assert.equal(result.width, 1024);
    assert.equal(result.height, 768);
    assert.equal(result.dpr, 2);
});

test('getViewportMetrics defaults to dpr 1 when not available', () => {
    const fakeWindow = { innerWidth: 800, innerHeight: 600, devicePixelRatio: undefined };

    const result = getViewportMetrics(fakeWindow);

    assert.equal(result.dpr, 1);
});

test('computeDisplaySize multiplies dimensions by dpr', () => {
    const metrics = { width: 100, height: 200, dpr: 2 };

    const result = computeDisplaySize(metrics);

    assert.equal(result.displayWidth, 200);
    assert.equal(result.displayHeight, 400);
    assert.equal(result.dpr, 2);
});

test('computeDisplaySize rounds dimensions', () => {
    const metrics = { width: 100.7, height: 200.4, dpr: 1.5 };

    const result = computeDisplaySize(metrics);

    assert.equal(result.displayWidth, 151);
    assert.equal(result.displayHeight, 301);
});

test('createViewport uses default logical size when not provided', () => {
    const displaySize = { displayWidth: 1080, displayHeight: 1920, dpr: 2 };

    const result = createViewport(displaySize);

    assert.ok(result.scale > 0);
    assert.ok(Number.isFinite(result.offsetX));
    assert.ok(Number.isFinite(result.offsetY));
    assert.equal(result.worldBounds.minX, 0);
    assert.equal(result.worldBounds.maxX, 540);
    assert.equal(result.worldBounds.minY, 0);
    assert.equal(result.worldBounds.maxY, 960);
});

test('createViewport uses custom logical size when provided', () => {
    const displaySize = { displayWidth: 800, displayHeight: 600, dpr: 1 };
    const options = { logicalWidth: 400, logicalHeight: 300 };

    const result = createViewport(displaySize, options);

    assert.equal(result.worldBounds.maxX, 400);
    assert.equal(result.worldBounds.maxY, 300);
});

test('createViewport uses custom world bounds when provided', () => {
    const displaySize = { displayWidth: 800, displayHeight: 600, dpr: 1 };
    const worldBounds = { minX: -50, maxX: 450, minY: -100, maxY: 860 };

    const result = createViewport(displaySize, { worldBounds });

    assert.equal(result.worldBounds.minX, -50);
    assert.equal(result.worldBounds.maxX, 450);
    assert.equal(result.worldBounds.minY, -100);
    assert.equal(result.worldBounds.maxY, 860);
});

test('createViewport calculates scale to fit display', () => {
    const displaySize = { displayWidth: 1080, displayHeight: 1920, dpr: 2 };

    const result = createViewport(displaySize);

    assert.ok(result.scale > 0);
    assert.equal(result.scale, 2);
});

test('createViewport centers content with offset', () => {
    const displaySize = { displayWidth: 1000, displayHeight: 1000, dpr: 1 };
    const options = { logicalWidth: 500, logicalHeight: 500 };

    const result = createViewport(displaySize, options);

    assert.equal(result.offsetX, 0);
    assert.equal(result.offsetY, 0);
});

test('resizeCanvas returns null when canvas is not provided', () => {
    const result = resizeCanvas({ canvasElement: null });

    assert.equal(result, null);
});

test('resizeCanvas updates canvas dimensions', () => {
    const canvas = makeFakeCanvas();
    const metrics = { width: 800, height: 600, dpr: 1 };

    resizeCanvas({ canvasElement: canvas, metrics });

    assert.equal(canvas.width, 800);
    assert.equal(canvas.height, 600);
    assert.equal(canvas.style.width, '800px');
    assert.equal(canvas.style.height, '600px');
});

test('resizeCanvas sets viewport transform on canvas', () => {
    const canvas = makeFakeCanvas();
    const metrics = { width: 800, height: 600, dpr: 1 };

    resizeCanvas({ canvasElement: canvas, metrics });

    assert.ok(canvas.viewportTransform !== null);
    assert.ok(Number.isFinite(canvas.viewportTransform.scale));
});

test('resizeCanvas calls computeWorldBounds on game instance', () => {
    const canvas = makeFakeCanvas();
    const metrics = { width: 800, height: 600, dpr: 1 };
    let called = false;
    const gameInstance = {
        computeWorldBounds: () => {
            called = true;
            return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
        },
    };

    resizeCanvas({ canvasElement: canvas, gameInstance, metrics });

    assert.ok(called);
});

test('resizeCanvas updates game instance viewport', () => {
    const canvas = makeFakeCanvas();
    const metrics = { width: 800, height: 600, dpr: 1 };
    const gameInstance = {};

    resizeCanvas({ canvasElement: canvas, gameInstance, metrics });

    assert.ok(gameInstance.viewport !== undefined);
    assert.ok(Number.isFinite(gameInstance.viewport.scale));
});

test('resizeCanvas calls updateViewport if method exists', () => {
    const canvas = makeFakeCanvas();
    const metrics = { width: 800, height: 600, dpr: 1 };
    let called = false;
    const gameInstance = {
        updateViewport: (viewport) => {
            called = true;
            assert.ok(viewport !== undefined);
        },
    };

    resizeCanvas({ canvasElement: canvas, gameInstance, metrics });

    assert.ok(called);
});

test('resizeCanvas updates container dimensions', () => {
    const canvas = makeFakeCanvas();
    const container = { style: {} };
    const metrics = { width: 1024, height: 768, dpr: 1 };

    resizeCanvas({ canvasElement: canvas, gameContainerElement: container, metrics });

    assert.equal(container.style.width, '1024px');
    assert.equal(container.style.height, '768px');
});

test('__testResolveDimension returns value when finite', () => {
    const result = __testResolveDimension(100, 200);

    assert.equal(result, 100);
});

test('__testResolveDimension returns fallback when value is not finite', () => {
    const result = __testResolveDimension(NaN, 200);

    assert.equal(result, 200);
});

test('__testResolveDimension returns fallback when value is undefined', () => {
    const result = __testResolveDimension(undefined, 200);

    assert.equal(result, 200);
});

test('__testNormalizeBounds returns defaults when bounds is null', () => {
    const result = __testNormalizeBounds(null, 100, 200);

    assert.equal(result.minX, 0);
    assert.equal(result.maxX, 100);
    assert.equal(result.minY, 0);
    assert.equal(result.maxY, 200);
});

test('__testNormalizeBounds returns provided bounds when valid', () => {
    const bounds = { minX: 10, maxX: 90, minY: 20, maxY: 180 };

    const result = __testNormalizeBounds(bounds, 100, 200);

    assert.equal(result.minX, 10);
    assert.equal(result.maxX, 90);
    assert.equal(result.minY, 20);
    assert.equal(result.maxY, 180);
});

test('__testNormalizeBounds uses fallback for invalid width', () => {
    const bounds = { minX: 90, maxX: 10, minY: 20, maxY: 180 };

    const result = __testNormalizeBounds(bounds, 100, 200);

    assert.equal(result.minX, 0);
    assert.equal(result.maxX, 100);
    assert.equal(result.minY, 20);
    assert.equal(result.maxY, 180);
});

test('__testNormalizeBounds uses fallback for invalid height', () => {
    const bounds = { minX: 10, maxX: 90, minY: 180, maxY: 20 };

    const result = __testNormalizeBounds(bounds, 100, 200);

    assert.equal(result.minX, 10);
    assert.equal(result.maxX, 90);
    assert.equal(result.minY, 0);
    assert.equal(result.maxY, 200);
});
