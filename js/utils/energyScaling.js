import gameConfig from '../config/gameConfig.js';

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function getWaveEnergyMultiplier(game, scaling = gameConfig?.player?.killEnergyScaling) {
    if (!scaling) {
        return 1;
    }
    const waveNumber = Math.max(1, Math.floor(Number.isFinite(game?.wave) ? game.wave : 1));
    const maxBonus = Number.isFinite(scaling.maxBonus) ? scaling.maxBonus : null;
    const applyBonusCap = (bonus) => maxBonus === null ? bonus : Math.min(bonus, maxBonus);
    const baseWave = Math.max(1, Math.floor(Number.isFinite(scaling.baseWave) ? scaling.baseWave : 1));
    const baseBonus = Number.isFinite(scaling.baseBonus) ? scaling.baseBonus : 0;
    const rawBreakpoints = Array.isArray(scaling.breakpoints)
        ? scaling.breakpoints
        : [];
    const breakpoints = rawBreakpoints
        .filter(bp => Number.isFinite(bp?.wave) && Number.isFinite(bp?.bonus))
        .map(bp => ({ wave: Math.max(1, Math.floor(bp.wave)), bonus: bp.bonus }))
        .sort((a, b) => a.wave - b.wave);

    if (waveNumber <= baseWave) {
        return 1 + applyBonusCap(baseBonus);
    }

    let previousWave = baseWave;
    let previousBonus = baseBonus;

    for (const point of breakpoints) {
        const targetWave = Math.max(previousWave, point.wave);
        const targetBonus = point.bonus;
        if (waveNumber <= targetWave) {
            const span = Math.max(1, targetWave - previousWave);
            const progress = clamp((waveNumber - previousWave) / span, 0, 1);
            const bonus = previousBonus + (targetBonus - previousBonus) * progress;
            return 1 + applyBonusCap(bonus);
        }
        previousWave = targetWave;
        previousBonus = targetBonus;
    }

    return 1 + applyBonusCap(previousBonus);
}

