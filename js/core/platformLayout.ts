export const PLATFORM_SPRITE_PATH = 'assets/images/platform.png';

const PLATFORM_SCALE = 0.36;
const SLOT_SIZE = 74;
const SLOT_STEP = { x: 104, y: 28 };

const platformConfigs = [
    { id: 'upper', x: 700, y: 260, scale: PLATFORM_SCALE },
    { id: 'lower', x: 355, y: 607, scale: PLATFORM_SCALE },
];

const createDiagonalOffsets = () => (
    Array.from({ length: 6 }, (_, index) => ({
        x: SLOT_STEP.x * index,
        y: SLOT_STEP.y * index,
    }))
);

export function createPlatformConfigs() {
    return platformConfigs.map(platform => ({ ...platform }));
}

export function createPlatformGridConfig() {
    return {
        cellSize: { w: SLOT_SIZE, h: SLOT_SIZE },
        topOrigin: { x: 402, y: 155 },
        bottomOrigin: { x: 58, y: 500 },
        topOffsets: createDiagonalOffsets(),
        bottomOffsets: createDiagonalOffsets(),
    };
}
