import Platform from '../entities/Platform.js';
import gameConfig from '../config/gameConfig.js';

export function createPlatforms({ width, height, platformConfigs = gameConfig.world.platforms } = {}) {
    if (!Array.isArray(platformConfigs)) {
        return [];
    }

    return platformConfigs.map(({ xFactor, yFactor, scale }) => (
        new Platform({
            x: width * xFactor,
            y: height * yFactor,
            scale,
        })
    ));
}
