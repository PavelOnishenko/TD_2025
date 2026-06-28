import Platform from '../entities/Platform.js';
import gameConfig from '../config/gameConfig.js';

export function createPlatforms({ width, height, platformConfigs = gameConfig.world.platforms }: any = {}) {
    if (!Array.isArray(platformConfigs)) {
        return [];
    }

    return platformConfigs.map(({ x, y, xFactor, yFactor, scale }) => (
        new Platform({
            x: Number.isFinite(x) ? x : width * xFactor,
            y: Number.isFinite(y) ? y : height * yFactor,
            scale,
        })
    ));
}
