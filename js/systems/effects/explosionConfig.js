const COLOR_PRESETS = {
    red: { r: 255, g: 180, b: 120 },
    blue: { r: 160, g: 210, b: 255 },
    mismatch: { r: 210, g: 215, b: 225 },
    default: { r: 255, g: 220, b: 170 },
};
export const BASE_PARTICLE_COUNT = 16;
export const BASE_MIN_LIFE = 0.25;
export const BASE_MAX_LIFE = 0.45;
export const BASE_MIN_SPEED = 140;
export const BASE_MAX_SPEED = 260;
export const BASE_MIN_RADIUS = 2;
export const BASE_MAX_RADIUS = 4;
export const BASE_DEBRIS_COUNT = 7;
export const BASE_DEBRIS_MIN_LIFE = 0.42;
export const BASE_DEBRIS_MAX_LIFE = 0.78;
export const BASE_DEBRIS_MIN_SPEED = 220;
export const BASE_DEBRIS_MAX_SPEED = 420;
export const BASE_DEBRIS_MIN_LENGTH = 14;
export const BASE_DEBRIS_MAX_LENGTH = 32;
export const BASE_DEBRIS_MIN_WIDTH = 2.4;
export const BASE_DEBRIS_MAX_WIDTH = 4.5;
export const BASE_DEBRIS_ROT_SPEED = { min: -8, max: 8 };
const BURNING_DEBRIS_PALETTE = {
    core: 'rgba(255, 196, 124, 1)',
    ember: 'rgba(255, 146, 72, 0.85)',
    smoke: 'rgba(90, 74, 62, 0.4)',
};
const VARIANT_CONFIGS = {
    match: {
        particleCount: BASE_PARTICLE_COUNT,
        minLife: BASE_MIN_LIFE,
        maxLife: BASE_MAX_LIFE,
        minSpeed: BASE_MIN_SPEED,
        maxSpeed: BASE_MAX_SPEED,
        minRadius: BASE_MIN_RADIUS,
        maxRadius: BASE_MAX_RADIUS,
        alphaScale: 1,
        resolveColor: color => color ?? 'default',
    },
    mismatch: {
        particleCount: Math.max(8, Math.round(BASE_PARTICLE_COUNT * 0.65)),
        minLife: BASE_MIN_LIFE * 0.65,
        maxLife: BASE_MAX_LIFE * 0.8,
        minSpeed: BASE_MIN_SPEED * 0.6,
        maxSpeed: BASE_MAX_SPEED * 0.75,
        minRadius: BASE_MIN_RADIUS * 0.5,
        maxRadius: BASE_MAX_RADIUS * 0.65,
        alphaScale: 0.6,
        resolveColor: () => 'mismatch',
    },
    merge: {
        particleCount: Math.round(BASE_PARTICLE_COUNT * 1.1),
        minLife: BASE_MIN_LIFE * 0.9,
        maxLife: BASE_MAX_LIFE * 1.25,
        minSpeed: BASE_MIN_SPEED * 0.5,
        maxSpeed: BASE_MAX_SPEED * 0.85,
        minRadius: BASE_MIN_RADIUS * 0.8,
        maxRadius: BASE_MAX_RADIUS * 1.45,
        alphaScale: 1.2,
        resolveColor: color => color ?? 'default',
    },
    kill: {
        particleCount: Math.round(BASE_PARTICLE_COUNT * 2.8),
        minLife: BASE_MIN_LIFE * 1.05,
        maxLife: BASE_MAX_LIFE * 1.85,
        minSpeed: BASE_MIN_SPEED * 1.1,
        maxSpeed: BASE_MAX_SPEED * 1.75,
        minRadius: BASE_MIN_RADIUS * 1.3,
        maxRadius: BASE_MAX_RADIUS * 2.4,
        alphaScale: 1.8,
        resolveColor: color => color ?? 'default',
        debris: {
            count: Math.round(BASE_DEBRIS_COUNT * 1.4),
            minLife: BASE_DEBRIS_MIN_LIFE,
            maxLife: BASE_DEBRIS_MAX_LIFE * 1.1,
            minSpeed: BASE_DEBRIS_MIN_SPEED,
            maxSpeed: BASE_DEBRIS_MAX_SPEED,
            minLength: BASE_DEBRIS_MIN_LENGTH,
            maxLength: BASE_DEBRIS_MAX_LENGTH * 1.15,
            minWidth: BASE_DEBRIS_MIN_WIDTH,
            maxWidth: BASE_DEBRIS_MAX_WIDTH,
        },
    },
    'tank-kill': {
        particleCount: Math.round(BASE_PARTICLE_COUNT * 3.6),
        minLife: BASE_MIN_LIFE * 1.2,
        maxLife: BASE_MAX_LIFE * 2.35,
        minSpeed: BASE_MIN_SPEED * 1.25,
        maxSpeed: BASE_MAX_SPEED * 2.1,
        minRadius: BASE_MIN_RADIUS * 1.6,
        maxRadius: BASE_MAX_RADIUS * 2.9,
        alphaScale: 2.1,
        resolveColor: color => color ?? 'default',
        debris: {
            count: Math.round(BASE_DEBRIS_COUNT * 2.6),
            minLife: BASE_DEBRIS_MIN_LIFE * 1.05,
            maxLife: BASE_DEBRIS_MAX_LIFE * 1.45,
            minSpeed: BASE_DEBRIS_MIN_SPEED * 1.05,
            maxSpeed: BASE_DEBRIS_MAX_SPEED * 1.25,
            minLength: BASE_DEBRIS_MIN_LENGTH * 1.1,
            maxLength: BASE_DEBRIS_MAX_LENGTH * 1.35,
            minWidth: BASE_DEBRIS_MIN_WIDTH * 0.9,
            maxWidth: BASE_DEBRIS_MAX_WIDTH * 1.2,
        },
    },
    dismantle: {
        particleCount: Math.round(BASE_PARTICLE_COUNT * 1.45),
        minLife: BASE_MIN_LIFE * 1.05,
        maxLife: BASE_MAX_LIFE * 1.65,
        minSpeed: BASE_MIN_SPEED * 0.6,
        maxSpeed: BASE_MAX_SPEED * 1.05,
        minRadius: BASE_MIN_RADIUS * 1.15,
        maxRadius: BASE_MAX_RADIUS * 1.95,
        alphaScale: 1.5,
        resolveColor: color => color ?? 'default',
    },
    'railgun-hit': {
        particleCount: Math.round(BASE_PARTICLE_COUNT * 1.35),
        minLife: BASE_MIN_LIFE * 0.6,
        maxLife: BASE_MAX_LIFE * 0.95,
        minSpeed: BASE_MIN_SPEED * 1.1,
        maxSpeed: BASE_MAX_SPEED * 1.55,
        minRadius: BASE_MIN_RADIUS * 0.9,
        maxRadius: BASE_MAX_RADIUS * 1.35,
        alphaScale: 1.25,
        resolveColor: color => color ?? 'default',
    },
    'railgun-kill': {
        particleCount: Math.round(BASE_PARTICLE_COUNT * 1.8),
        minLife: BASE_MIN_LIFE * 0.95,
        maxLife: BASE_MAX_LIFE * 1.45,
        minSpeed: BASE_MIN_SPEED * 1.2,
        maxSpeed: BASE_MAX_SPEED * 1.8,
        minRadius: BASE_MIN_RADIUS * 1.1,
        maxRadius: BASE_MAX_RADIUS * 2.1,
        alphaScale: 1.6,
        resolveColor: color => color ?? 'default',
    },
    'rocket-hit': {
        particleCount: Math.round(BASE_PARTICLE_COUNT * 1.4),
        minLife: BASE_MIN_LIFE * 0.9,
        maxLife: BASE_MAX_LIFE * 1.35,
        minSpeed: BASE_MIN_SPEED * 0.9,
        maxSpeed: BASE_MAX_SPEED * 1.4,
        minRadius: BASE_MIN_RADIUS * 1.2,
        maxRadius: BASE_MAX_RADIUS * 1.9,
        alphaScale: 1.5,
        resolveColor: color => color ?? 'default',
    },
    'rocket-kill': {
        particleCount: Math.round(BASE_PARTICLE_COUNT * 2.4),
        minLife: BASE_MIN_LIFE * 1.1,
        maxLife: BASE_MAX_LIFE * 2,
        minSpeed: BASE_MIN_SPEED * 1.1,
        maxSpeed: BASE_MAX_SPEED * 1.9,
        minRadius: BASE_MIN_RADIUS * 1.4,
        maxRadius: BASE_MAX_RADIUS * 2.6,
        alphaScale: 1.85,
        resolveColor: color => color ?? 'default',
    },
    rocket: {
        particleCount: Math.round(BASE_PARTICLE_COUNT * 3.4),
        minLife: BASE_MIN_LIFE * 1.3,
        maxLife: BASE_MAX_LIFE * 2.4,
        minSpeed: BASE_MIN_SPEED * 1.1,
        maxSpeed: BASE_MAX_SPEED * 2.4,
        minRadius: BASE_MIN_RADIUS * 1.6,
        maxRadius: BASE_MAX_RADIUS * 3.2,
        alphaScale: 2.15,
        resolveColor: color => color ?? 'default',
    },
};
export function getVariantConfig(variant = 'match') {
    return VARIANT_CONFIGS[variant] ?? VARIANT_CONFIGS.match;
}
export function normalizeExplosionOptions(input) {
    if (typeof input === 'string' || !input) {
        return { color: input ?? 'default', variant: 'match' };
    }
    const { color = 'default', variant = 'match' } = input;
    return { color, variant };
}
export function getColorPreset(color) {
    return COLOR_PRESETS[color] ?? COLOR_PRESETS.default;
}
export function toColor({ r, g, b }, alpha) {
    const clamped = Math.max(0, Math.min(1, alpha));
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}
export function toDebrisPalette() {
    return BURNING_DEBRIS_PALETTE;
}
