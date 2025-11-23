import gameConfig from '../../config/gameConfig.js';

export const MIN_TIME_SCALE = 0.1;
export const MAX_TIME_SCALE = 10;
export const DEFAULT_TIME_SCALE = 1;

export function clampTimeScale(value) {
    const numeric = Number(value);
    const safeValue = Number.isFinite(numeric) ? numeric : DEFAULT_TIME_SCALE;
    return Math.min(MAX_TIME_SCALE, Math.max(MIN_TIME_SCALE, safeValue));
}

function createEmptyBounds() {
    return {
        minX: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
    };
}

function expandBounds(bounds, x, y, w = 0, h = 0) {
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x + w);
    bounds.maxY = Math.max(bounds.maxY, y + h);
}

function expandWithCells(bounds, cells) {
    if (!Array.isArray(cells)) {
        return;
    }
    cells.forEach(cell => {
        if (typeof cell?.x !== 'number' || typeof cell?.y !== 'number') {
            return;
        }
        expandBounds(bounds, cell.x, cell.y, cell.w ?? 0, cell.h ?? 0);
    });
}

function expandWithBase(bounds, base) {
    if (!base) {
        return;
    }
    expandBounds(bounds, base.x, base.y, base.w ?? 0, base.h ?? 0);
}

function expandWithSpawn(bounds, spawn) {
    if (!spawn || typeof spawn.x !== 'number' || typeof spawn.y !== 'number') {
        return;
    }
    expandBounds(bounds, spawn.x, spawn.y, 0, 0);
}

function expandWithPortal(bounds, portal) {
    if (!portal || !portal.position) {
        return;
    }

    const position = portal.position;
    const radiusX = Number.isFinite(portal.radiusX) ? Math.max(0, portal.radiusX) : 0;
    const radiusY = Number.isFinite(portal.radiusY) ? Math.max(0, portal.radiusY) : 0;
    const rotation = Number.isFinite(portal.rotation) ? portal.rotation : 0;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    if (radiusX > 0 || radiusY > 0) {
        const extentX = Math.sqrt((radiusX * cos) ** 2 + (radiusY * sin) ** 2);
        const extentY = Math.sqrt((radiusX * sin) ** 2 + (radiusY * cos) ** 2);
        expandBounds(bounds, position.x - extentX, position.y - extentY, extentX * 2, extentY * 2);
    } else {
        expandBounds(bounds, position.x, position.y, 0, 0);
    }

    const tailLength = Number.isFinite(portal.config?.tailLength) ? Math.max(0, portal.config.tailLength) : 0;
    const tailWidth = Number.isFinite(portal.config?.tailWidth) ? Math.max(0, portal.config.tailWidth) : 0;
    if (tailLength <= 0 || tailWidth < 0) {
        return;
    }

    const innerX = radiusX * 0.45;
    const outerX = radiusX + tailLength;
    const tailHalfHeight = tailWidth * 0.6;
    const corners = [
        { x: innerX, y: -tailHalfHeight },
        { x: innerX, y: tailHalfHeight },
        { x: outerX, y: -tailHalfHeight },
        { x: outerX, y: tailHalfHeight },
    ];

    corners.forEach(point => {
        const worldX = position.x + point.x * cos - point.y * sin;
        const worldY = position.y + point.x * sin + point.y * cos;
        expandBounds(bounds, worldX, worldY, 0, 0);
    });
}

function ensureFiniteBounds(bounds, game) {
    const values = [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY];
    const allFinite = values.every(Number.isFinite);
    if (allFinite) {
        return bounds;
    }
    return {
        minX: 0,
        maxX: game.canvas?.width ?? game.logicalW,
        minY: 0,
        maxY: game.canvas?.height ?? game.logicalH,
    };
}

function computeMargin(game) {
    const baseRadius = game.projectileRadius ?? 0;
    const maxRadius = game.maxProjectileRadius ?? 0;
    const effective = Math.max(baseRadius, maxRadius);
    const { minMargin, projectileRadiusFactor } = gameConfig.world.bounds;
    return Math.max(minMargin, effective * projectileRadiusFactor);
}

function applyMargin(bounds, margin) {
    return {
        minX: bounds.minX - margin,
        maxX: bounds.maxX + margin,
        minY: bounds.minY - margin,
        maxY: bounds.maxY + margin,
    };
}

function computeBoundsForGame(game) {
    const bounds = createEmptyBounds();
    const cells = game.grid?.getAllCells?.();
    expandWithCells(bounds, cells);
    expandWithBase(bounds, game.base);
    if (game.portal) {
        expandWithPortal(bounds, game.portal);
    }
    if (typeof game.getDefaultEnemyCoords === 'function') {
        expandWithSpawn(bounds, game.getDefaultEnemyCoords());
    }
    const finite = ensureFiniteBounds(bounds, game);
    const margin = computeMargin(game);
    return applyMargin(finite, margin);
}

const world = {
    computeWorldBounds() {
        return computeBoundsForGame(this);
    },

    getAllCells() {
        return this.grid.getAllCells();
    },

    calcDelta(timestamp) {
        const rawDelta = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        const safeDelta = Number.isFinite(rawDelta) ? rawDelta : 0;
        const clamped = Math.max(0, safeDelta);
        this.elapsedTime = (this.elapsedTime ?? 0) + clamped;
        return clamped;
    },

    getTimeScale() {
        return clampTimeScale(this.timeScale ?? DEFAULT_TIME_SCALE);
    },

    setTimeScale(scale) {
        const clamped = clampTimeScale(scale);
        this.timeScale = clamped;
        return clamped;
    },
};

export default world;
