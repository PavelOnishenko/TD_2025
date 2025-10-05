import Platform from '../entities/Platform.js';

const PLATFORM_CONFIGS = [
    { xFactor: 0.5, yFactor: 0.35, scale: 0.85 },
    { xFactor: 0.5, yFactor: 0.58, scale: 1.05 }
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
