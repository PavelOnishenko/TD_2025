import gameConfig from '../config/gameConfig.js';

const DEFAULT_MULTIPLIER = 1;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function toFiniteNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeWaveNumber(value, fallback = 1) {
    const wave = Math.floor(toFiniteNumber(value, fallback));
    return Math.max(1, wave);
}

function normalizeBreakpoints(rawBreakpoints) {
    if (!Array.isArray(rawBreakpoints)) {
        return [];
    }

    return rawBreakpoints
        .filter((breakpoint) => Number.isFinite(breakpoint?.wave) && Number.isFinite(breakpoint?.bonus))
        .map((breakpoint) => ({
            wave: normalizeWaveNumber(breakpoint.wave),
            bonus: breakpoint.bonus,
        }))
        .sort((a, b) => a.wave - b.wave);
}

function resolveScalingConfig(source = gameConfig?.player?.killEnergyScaling) {
    if (!source) {
        return null;
    }

    const baseWave = normalizeWaveNumber(source.baseWave);
    const baseBonus = toFiniteNumber(source.baseBonus, 0);
    const maxBonus = Number.isFinite(source.maxBonus) ? source.maxBonus : null;
    const breakpoints = normalizeBreakpoints(source.breakpoints);

    return { baseWave, baseBonus, breakpoints, maxBonus };
}

function getBonusAtWave(waveNumber, { baseWave, baseBonus, breakpoints }) {
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

function applyBonusCap(bonus, maxBonus) {
    return maxBonus === null ? bonus : Math.min(bonus, maxBonus);
}

export function getWaveEnergyMultiplier(game, sourceScaling) {
    const scaling = resolveScalingConfig(sourceScaling);

    if (!scaling) {
        return DEFAULT_MULTIPLIER;
    }

    const waveNumber = normalizeWaveNumber(game?.wave);
    const bonus = getBonusAtWave(waveNumber, scaling);
    const cappedBonus = applyBonusCap(bonus, scaling.maxBonus);

    return DEFAULT_MULTIPLIER + cappedBonus;
}
