import gameConfig from '../config/gameConfig.js';
import * as ViewportManagerEngine from '../../engine/systems/ViewportManager.js';

const { width: LOGICAL_W, height: LOGICAL_H } = gameConfig.world.logicalSize;

export function getViewportMetrics(windowRef = window) {
    return ViewportManagerEngine.getViewportMetrics(windowRef);
}

export function computeDisplaySize(metrics) {
    return ViewportManagerEngine.computeDisplaySize(metrics);
}

export function createViewport(displaySize, options = {}) {
    const logicalWidth = options.logicalWidth ?? LOGICAL_W;
    const logicalHeight = options.logicalHeight ?? LOGICAL_H;
    return ViewportManagerEngine.createViewport(displaySize, {
        ...options,
        logicalWidth,
        logicalHeight,
    });
}

export function resizeCanvas(params) {
    return ViewportManagerEngine.resizeCanvas(params);
}

export function __testResolveDimension(value, fallback) {
    return ViewportManagerEngine.__testResolveDimension(value, fallback);
}

export function __testNormalizeBounds(bounds, fallbackWidth, fallbackHeight) {
    return ViewportManagerEngine.__testNormalizeBounds(bounds, fallbackWidth, fallbackHeight);
}
