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
    return Math.max(40, effective * 2);
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
};

export default world;
