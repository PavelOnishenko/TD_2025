export const PLATFORM_SPRITE_PATH = 'assets/images/platform.png';

const PLATFORM_SCALE = 0.36;
const SLOT_SIZE = 74;
const SLOT_OFFSETS = [
    { x: 0, y: 0 },
    { x: 64.6, y: 33.6 },
    { x: 133.6, y: 71.8 },
    { x: 199.9, y: 106.8 },
    { x: 269.3, y: 144.0 },
    { x: 337.7, y: 181.7 },
];

const platformConfigs = [
    { id: 'upper', x: 700, y: 260, scale: PLATFORM_SCALE },
    { id: 'lower', x: 355, y: 607, scale: PLATFORM_SCALE },
];

const createSlotOffsets = () => SLOT_OFFSETS.map(offset => ({ ...offset }));

export function createPlatformConfigs() {
    return platformConfigs.map(platform => ({ ...platform }));
}

export function createPlatformGridConfig() {
    return {
        cellSize: { w: SLOT_SIZE, h: SLOT_SIZE },
        topOrigin: { x: 492.4, y: 96.7 },
        bottomOrigin: { x: 147.4, y: 443.7 },
        topOffsets: createSlotOffsets(),
        bottomOffsets: createSlotOffsets(),
    };
}
