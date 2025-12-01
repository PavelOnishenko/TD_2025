import gameConfig from '../config/gameConfig.js';

const { width: LOGICAL_W, height: LOGICAL_H } = gameConfig.world.logicalSize;

export function getViewportMetrics(windowRef = window) {
    const width = windowRef.innerWidth;
    const height = windowRef.innerHeight;
    const devicePixelRatio = windowRef.devicePixelRatio || 1;
    return { width, height, dpr: devicePixelRatio };
}

export function computeDisplaySize(metrics) {
    const displayWidth = Math.round(metrics.width * metrics.dpr);
    const displayHeight = Math.round(metrics.height * metrics.dpr);
    return { displayWidth, displayHeight, dpr: metrics.dpr };
}

export function createViewport(displaySize, options = {}) {
    const { displayWidth, displayHeight, dpr } = displaySize;
    const logicalWidth = resolveDimension(options.logicalWidth, LOGICAL_W);
    const logicalHeight = resolveDimension(options.logicalHeight, LOGICAL_H);
    const bounds = normalizeBounds(options.worldBounds, logicalWidth, logicalHeight);
    const gameplayWidth = Math.max(1, bounds.maxX - bounds.minX);
    const gameplayHeight = Math.max(1, bounds.maxY - bounds.minY);
    const scale = Math.min(displayWidth / gameplayWidth, displayHeight / gameplayHeight) || 1;
    const renderWidth = gameplayWidth * scale;
    const renderHeight = gameplayHeight * scale;
    const offsetX = (displayWidth - renderWidth) / 2 - bounds.minX * scale;
    const offsetY = (displayHeight - renderHeight) / 2 - bounds.minY * scale;

    return {
        scale,
        offsetX,
        offsetY,
        dpr,
        worldBounds: bounds,
        renderWidth,
        renderHeight,
    };
}

export function resizeCanvas({ canvasElement, gameContainerElement, gameInstance, metrics }) {
    if (!canvasElement) {
        return null;
    }

    const viewportMetrics = metrics ?? getViewportMetrics();
    updateContainerDimensions(gameContainerElement, viewportMetrics);
    applyCssSize(canvasElement, viewportMetrics);
    const displaySize = computeDisplaySize(viewportMetrics);
    ensureCanvasResolution(canvasElement, displaySize);

    const worldBounds = computeWorldBounds(gameInstance);
    const logicalWidth = resolveDimension(gameInstance?.logicalW, LOGICAL_W);
    const logicalHeight = resolveDimension(gameInstance?.logicalH, LOGICAL_H);
    const viewport = createViewport(displaySize, { worldBounds, logicalWidth, logicalHeight });

    applyViewport(canvasElement, gameInstance, viewport);
    if (gameInstance && viewport.worldBounds) {
        gameInstance.worldBounds = viewport.worldBounds;
    }
    return viewport;
}

function computeWorldBounds(gameInstance) {
    if (gameInstance && typeof gameInstance.computeWorldBounds === 'function') {
        return gameInstance.computeWorldBounds();
    }
    return null;
}

function updateContainerDimensions(container, metrics) {
    if (!container) {
        return;
    }
    container.style.width = `${metrics.width}px`;
    container.style.height = `${metrics.height}px`;
}

function applyCssSize(canvasElement, metrics) {
    canvasElement.style.width = `${metrics.width}px`;
    canvasElement.style.height = `${metrics.height}px`;
}

function ensureCanvasResolution(canvasElement, displaySize) {
    const sizeIsCurrent = canvasElement.width === displaySize.displayWidth
        && canvasElement.height === displaySize.displayHeight;
    if (sizeIsCurrent) {
        return;
    }
    canvasElement.width = displaySize.displayWidth;
    canvasElement.height = displaySize.displayHeight;
}

function applyViewport(canvasElement, gameInstance, viewport) {
    canvasElement.viewportTransform = viewport;
    if (!gameInstance) {
        return;
    }

    if (typeof gameInstance.updateViewport === 'function') {
        gameInstance.updateViewport(viewport);
        return;
    }

    gameInstance.viewport = viewport;
}

function resolveDimension(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
}

function normalizeBounds(bounds, fallbackWidth, fallbackHeight) {
    const defaultBounds = {
        minX: 0,
        maxX: fallbackWidth,
        minY: 0,
        maxY: fallbackHeight,
    };

    if (!bounds) {
        return defaultBounds;
    }

    const widthValid = Number.isFinite(bounds.minX)
        && Number.isFinite(bounds.maxX)
        && bounds.maxX > bounds.minX;
    const heightValid = Number.isFinite(bounds.minY)
        && Number.isFinite(bounds.maxY)
        && bounds.maxY > bounds.minY;

    if (widthValid && heightValid) {
        return {
            minX: bounds.minX,
            maxX: bounds.maxX,
            minY: bounds.minY,
            maxY: bounds.maxY,
        };
    }

    return {
        minX: widthValid ? bounds.minX : 0,
        maxX: widthValid ? bounds.maxX : fallbackWidth,
        minY: heightValid ? bounds.minY : 0,
        maxY: heightValid ? bounds.maxY : fallbackHeight,
    };
}

export function __testResolveDimension(value, fallback) {
    return resolveDimension(value, fallback);
}

export function __testNormalizeBounds(bounds, fallbackWidth, fallbackHeight) {
    return normalizeBounds(bounds, fallbackWidth, fallbackHeight);
}
