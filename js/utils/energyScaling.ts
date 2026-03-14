import gameConfig from '../config/gameConfig.js';

interface GameConfigShape {
    player?: {
        killEnergyScaling?: KillEnergyScalingConfig;
    };
}

const typedGameConfig = gameConfig as unknown as GameConfigShape;

const DEFAULT_MULTIPLIER = 1;

interface EnergyBreakpoint {
    wave: number;
    bonus: number;
}

interface RawEnergyBreakpoint {
    wave?: number;
    bonus?: number;
}

interface KillEnergyScalingConfig {
    baseWave?: number;
    baseBonus?: number;
    maxBonus?: number;
    breakpoints?: RawEnergyBreakpoint[];
}

interface ResolvedScalingConfig {
    baseWave: number;
    baseBonus: number;
    breakpoints: EnergyBreakpoint[];
    maxBonus: number | null;
}

interface WaveState {
    wave?: number;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function toFiniteNumber(value: unknown, fallback: number): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeWaveNumber(value: unknown, fallback = 1): number {
    const wave = Math.floor(toFiniteNumber(value, fallback));
    return Math.max(1, wave);
}

function normalizeBreakpoints(rawBreakpoints: RawEnergyBreakpoint[] | undefined): EnergyBreakpoint[] {
    if (!Array.isArray(rawBreakpoints)) {
        return [];
    }

    return rawBreakpoints
        .filter((breakpoint) => Number.isFinite(breakpoint?.wave) && Number.isFinite(breakpoint?.bonus))
        .map((breakpoint) => ({
            wave: normalizeWaveNumber(breakpoint.wave),
            bonus: Number(breakpoint.bonus),
        }))
        .sort((a, b) => a.wave - b.wave);
}

function resolveScalingConfig(source: KillEnergyScalingConfig | undefined = typedGameConfig?.player?.killEnergyScaling): ResolvedScalingConfig | null {
    if (!source) {
        return null;
    }

    const baseWave = normalizeWaveNumber(source.baseWave);
    const baseBonus = toFiniteNumber(source.baseBonus, 0);
    const maxBonus = Number.isFinite(source.maxBonus) ? Number(source.maxBonus) : null;
    const breakpoints = normalizeBreakpoints(source.breakpoints);

    return { baseWave, baseBonus, breakpoints, maxBonus };
}

function getBonusAtWave(waveNumber: number, { baseWave, baseBonus, breakpoints }: ResolvedScalingConfig): number {
    if (waveNumber <= baseWave) {
        return baseBonus;
    }

    let previousWave = baseWave;
    let previousBonus = baseBonus;

    for (const breakpoint of breakpoints) {
        const targetWave = Math.max(previousWave, breakpoint.wave);
        if (waveNumber <= targetWave) {
            const span = Math.max(1, targetWave - previousWave);
            const progress = clamp((waveNumber - previousWave) / span, 0, 1);
            const delta = breakpoint.bonus - previousBonus;
            return previousBonus + delta * progress;
        }

        previousWave = targetWave;
        previousBonus = breakpoint.bonus;
    }

    return previousBonus;
}

function applyBonusCap(bonus: number, maxBonus: number | null): number {
    return maxBonus === null ? bonus : Math.min(bonus, maxBonus);
}

export function getWaveEnergyMultiplier(game: WaveState | undefined, sourceScaling?: KillEnergyScalingConfig): number {
    const scaling = resolveScalingConfig(sourceScaling);

    if (!scaling) {
        return DEFAULT_MULTIPLIER;
    }

    const waveNumber = normalizeWaveNumber(game?.wave);
    const bonus = getBonusAtWave(waveNumber, scaling);
    const cappedBonus = applyBonusCap(bonus, scaling.maxBonus);

    return DEFAULT_MULTIPLIER + cappedBonus;
}
