import Platform from '../entities/Platform.js';

const PLATFORM_CONFIGS = [
    { xFactor: 0.4, yFactor: 0.55, scale: 1.2 },
    { xFactor: 0.6, yFactor: 0.85, scale: 1.2 }
];

export function createPlatforms({ width, height }) {
    return PLATFORM_CONFIGS.map(({ xFactor, yFactor, scale }) => (
        new Platform({
            x: width * xFactor,
            y: height * yFactor,
            scale
        })
    ));
}
