export const PLATFORM_SPRITE_PATH = 'assets/images/platform.png';

export const PLATFORM_SPRITE_SIZE = Object.freeze({ width: 1680, height: 1067 });
export const PAINTED_PAD_CENTERS = Object.freeze([
    { x: 366.2, y: 182.8 },
    { x: 545.6, y: 276.1 },
    { x: 737.2, y: 382.1 },
    { x: 921.4, y: 479.4 },
    { x: 1114.2, y: 582.6 },
    { x: 1304.2, y: 687.4 },
]);

const PLATFORM_SCALE_X = 0.6;
const PLATFORM_SCALE_Y = 0.6;
const SLOT_SIZE = 74;

const platformConfigs = [
    { id: 'upper', x: 820, y: 300, scaleX: PLATFORM_SCALE_X, scaleY: PLATFORM_SCALE_Y },
    { id: 'lower', x: 445, y: 680, scaleX: PLATFORM_SCALE_X, scaleY: PLATFORM_SCALE_Y },
];

export function normalizePlatformConfig(platform: any = {}) {
    const fallbackScale = Number.isFinite(platform.scale) ? platform.scale : 1;
    const scaleX = Number.isFinite(platform.scaleX) ? platform.scaleX : fallbackScale;
    const scaleY = Number.isFinite(platform.scaleY) ? platform.scaleY : fallbackScale;
    return {
        id: platform.id,
        x: Number.isFinite(platform.x) ? platform.x : 0,
        y: Number.isFinite(platform.y) ? platform.y : 0,
        scaleX,
        scaleY,
    };
}

function getPlatformTopLeft(platform: any) {
    const normalized = normalizePlatformConfig(platform);
    return {
        x: normalized.x - PLATFORM_SPRITE_SIZE.width * normalized.scaleX / 2,
        y: normalized.y - PLATFORM_SPRITE_SIZE.height * normalized.scaleY / 2,
    };
}

function createCellPositionsForPlatform(platform: any) {
    const normalized = normalizePlatformConfig(platform);
    const origin = getPlatformTopLeft(normalized);
    const halfSlot = SLOT_SIZE / 2;
    return PAINTED_PAD_CENTERS.map(pad => ({
        x: origin.x + pad.x * normalized.scaleX - halfSlot,
        y: origin.y + pad.y * normalized.scaleY - halfSlot,
    }));
}

function createSlotOffsetsFromCells(cells: any[]) {
    const [origin = { x: 0, y: 0 }] = cells;
    return cells.map(cell => ({
        x: roundLayoutValue(cell.x - origin.x),
        y: roundLayoutValue(cell.y - origin.y),
    }));
}

function roundLayoutValue(value: number) {
    return Number(value.toFixed(3));
}

export function createPlatformConfigs() {
    return platformConfigs.map(platform => ({ ...platform }));
}

export function createPlatformGridConfig(platforms: any[] = createPlatformConfigs()) {
    const [upperPlatform = platformConfigs[0], lowerPlatform = platformConfigs[1]] = platforms;
    const topCells = createCellPositionsForPlatform(upperPlatform);
    const bottomCells = createCellPositionsForPlatform(lowerPlatform);
    const topOrigin = topCells[0] ?? { x: 0, y: 0 };
    const bottomOrigin = bottomCells[0] ?? { x: 0, y: 0 };

    return {
        cellSize: { w: SLOT_SIZE, h: SLOT_SIZE },
        topOrigin: { x: roundLayoutValue(topOrigin.x), y: roundLayoutValue(topOrigin.y) },
        bottomOrigin: { x: roundLayoutValue(bottomOrigin.x), y: roundLayoutValue(bottomOrigin.y) },
        topOffsets: createSlotOffsetsFromCells(topCells),
        bottomOffsets: createSlotOffsetsFromCells(bottomCells),
    };
}
